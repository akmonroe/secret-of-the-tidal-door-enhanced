import * as THREE from "three";
import { Input } from "./input";
import { GameUI } from "../ui-dom/ui";
import { LevelRuntime } from "../levels/LevelRuntime";
import { getLevel, getNextLevel, totalLevelsBuilt } from "../levels/levelDefs";
import { resetProgress, setScuba, type CharacterId } from "../progress/state";

type Mode = "menu" | "character" | "story" | "play" | "clue" | "fail";

export class GameApp {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private input = new Input();
  private ui: GameUI;
  private mode: Mode = "menu";
  private level: LevelRuntime | null = null;
  private pendingLevelId = 1;
  private lastClueId = "";
  private lastClueText = "";
  private lastT = performance.now();
  private running = true;
  /** Prevent double fire of fall game-over */
  private fallReported = false;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      250,
    );
    this.camera.position.set(0, 14, 12);

    this.ui = new GameUI({
      onStartAdventure: () => this.showCharacter(),
      onCharacterPicked: (id) => this.afterCharacter(id),
      onStoryContinue: () => {
        if (this.pendingLevelId < 0) this.showMenu();
        else this.startLevel(this.pendingLevelId);
      },
      onClueContinue: () => this.afterClue(),
      onFailRestart: () => this.fullRestart(),
    });

    window.addEventListener("resize", this.onResize);
    this.input.setGameplayVisible(false);
    this.showMenu();
    requestAnimationFrame(this.frame);
  }

  private onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private showMenu(): void {
    this.teardownLevel();
    this.mode = "menu";
    this.input.setGameplayVisible(false);
    this.ui.showMenu(totalLevelsBuilt());
    this.level = null;
  }

  private showCharacter(): void {
    this.mode = "character";
    this.ui.showCharacterSelect();
  }

  private afterCharacter(_id: CharacterId): void {
    setScuba(false);
    this.pendingLevelId = 1;
    const def = getLevel(1);
    if (!def) return;
    this.mode = "story";
    this.ui.showStory(def.storyBefore.title, def.storyBefore.body);
  }

  private startLevel(id: number): void {
    const def = getLevel(id);
    if (!def) {
      this.showMenu();
      return;
    }
    this.pendingLevelId = id;
    this.fallReported = false;
    if (def.scuba) setScuba(true);

    this.teardownLevel();
    this.mode = "play";
    this.ui.clearOverlay();
    this.ui.showHud();
    this.input.setGameplayVisible(true);

    this.level = new LevelRuntime(def, {
      onHud: (hp, max, obj, clues) => this.ui.updateHud(hp, max, obj, clues),
      onHint: (t) => this.ui.showHint(t),
      onComplete: (clueId, clueText) => this.onLevelComplete(clueId, clueText),
      onDeath: () => this.onHpDeath(),
      onFallDeath: () => this.onFallGameOver(),
    });
    this.level.start();
  }

  private onLevelComplete(clueId: string, clueText: string): void {
    this.mode = "clue";
    this.input.setGameplayVisible(false);
    this.ui.hideHud();
    this.lastClueId = clueId;
    this.lastClueText = clueText;
    const next = getNextLevel(this.pendingLevelId);
    this.ui.showClueFound(clueId, clueText, next?.title ?? null);
  }

  private afterClue(): void {
    const next = getNextLevel(this.pendingLevelId);
    if (next) {
      this.pendingLevelId = next.id;
      this.mode = "story";
      this.ui.showStory(next.storyBefore.title, next.storyBefore.body);
    } else {
      this.ui.showStory(
        "Rainbow Coral Found!",
        `You gathered every clue — including ${this.lastClueId}: “${this.lastClueText}”\n\n` +
          "All twelve seas are charted. The Rainbow Coral shines for you!\n\n" +
          "Return to the menu to explore the oceans again.",
      );
      this.pendingLevelId = -1;
      this.mode = "story";
    }
  }

  /** Lost hearts — retry the same level only */
  private onHpDeath(): void {
    const id = this.pendingLevelId;
    this.ui.showHint("Ouch! Try again…");
    window.setTimeout(() => {
      if (this.mode === "play") this.startLevel(id);
    }, 600);
  }

  /** Fell off the map — blackout fail, full restart required */
  private onFallGameOver(): void {
    if (this.fallReported || this.mode === "fail") return;
    this.fallReported = true;
    this.mode = "fail";
    this.input.setGameplayVisible(false);
    this.ui.hideHud();
    this.ui.showFailScreen();
  }

  /** Wipe progress and return to title — full game restart */
  private fullRestart(): void {
    resetProgress();
    setScuba(false);
    this.pendingLevelId = 1;
    this.fallReported = false;
    this.teardownLevel();
    this.showMenu();
  }

  private teardownLevel(): void {
    this.level?.dispose();
    this.level = null;
  }

  private frame = (t: number) => {
    if (!this.running) return;
    const dt = Math.min(0.05, (t - this.lastT) / 1000);
    this.lastT = t;

    if ((this.mode === "play" || this.mode === "fail") && this.level) {
      // Keep rendering during fall until fail UI takes over; fail mode freezes last view
      if (this.mode === "play") {
        this.level.update(dt, this.input, this.camera);
      }
      this.renderer.render(this.level.scene, this.camera);
      // Blackout overlay is DOM; darken canvas when failed
      if (this.mode === "fail") {
        this.renderer.setClearColor(0x000000);
      }
    } else {
      this.renderer.setClearColor(0x0a1628);
      this.renderer.clear();
    }

    requestAnimationFrame(this.frame);
  };
}
