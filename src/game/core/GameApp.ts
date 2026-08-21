import * as THREE from "three";
import { Input } from "./input";
import { GameUI } from "../ui-dom/ui";
import { LevelRuntime } from "../levels/LevelRuntime";
import { getLevel, getNextLevel, totalLevelsBuilt } from "../levels/levelDefs";
import { resetProgress, setScuba, type CharacterId } from "../progress/state";
import { preloadImagineCharacters, preloadImagineSprites, preloadImagineTiles } from "../world/imagineTextures";
import { preloadModels3d } from "../world/model3d";

type Mode = "menu" | "character" | "story" | "play" | "clue" | "fail";

export class GameApp {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.OrthographicCamera;
  /** World units visible vertically — pure top-down map. */
  private viewHeight = 22;
  private input = new Input();
  private ui: GameUI;
  private mode: Mode = "menu";
  private level: LevelRuntime | null = null;
  private pendingLevelId = 1;
  private lastClueId = "";
  private lastClueText = "";
  private lastT = performance.now();
  private running = true;
  private fallReported = false;
  private envMap: THREE.Texture | null = null;
  private raf = 0;
  /** Tiles + player portraits — enough to start level 1. */
  private assetsReady: Promise<void>;

  constructor(container: HTMLElement) {
    const mobile =
      window.innerWidth < 820 ||
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    this.renderer = new THREE.WebGLRenderer({
      antialias: !mobile,
      powerPreference: "high-performance",
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    const aspect =
      typeof window !== "undefined" && window.innerHeight > 0
        ? window.innerWidth / window.innerHeight
        : 16 / 9;
    const vh = this.viewHeight;
    const vw = vh * aspect;
    this.camera = new THREE.OrthographicCamera(-vw / 2, vw / 2, vh / 2, -vh / 2, 0.1, 80);
    this.camera.up.set(0, 0, -1);
    this.camera.position.set(0, 36, 0);
    this.camera.rotation.set(-Math.PI / 2, 0, 0);

    this.envMap = null;

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
    this.installZoomGuards(container);
    this.input.setGameplayVisible(false);
    this.assetsReady = Promise.all([
      preloadImagineTiles(),
      preloadImagineCharacters(),
    ]).then(() => undefined);
    // Background: rest of GLBs + sprites while the menu is up
    void this.assetsReady.then(() => {
      void preloadModels3d();
      void preloadImagineSprites();
    });
    this.showMenu();
    this.raf = requestAnimationFrame(this.frame);
  }

  dispose(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    this.teardownLevel();
    this.input.dispose();
    this.ui.dispose();
    this.envMap?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  /**
   * Block pinch-zoom, Safari gesture zoom, and double-tap zoom on iPad/iOS
   * so kids don't accidentally scale the whole page while playing.
   */
  private installZoomGuards(container: HTMLElement): void {
    const canvas = this.renderer.domElement;
    canvas.style.touchAction = "none";
    canvas.setAttribute("touch-action", "none");

    // Safari non-standard multi-finger gesture events
    const blockGesture = (e: Event) => {
      e.preventDefault();
    };
    document.addEventListener("gesturestart", blockGesture, { passive: false });
    document.addEventListener("gesturechange", blockGesture, { passive: false });
    document.addEventListener("gestureend", blockGesture, { passive: false });

    // Multi-touch pinch on the game surface
    const blockMultiTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("touchmove", blockMultiTouchMove, {
      passive: false,
    });

    // Double-tap zoom: swallow rapid second tap on canvas / container
    let lastTap = 0;
    const blockDoubleTap = (e: TouchEvent) => {
      const now = performance.now();
      if (now - lastTap < 320) {
        e.preventDefault();
      }
      lastTap = now;
    };
    container.addEventListener("touchend", blockDoubleTap, { passive: false });
    canvas.addEventListener("touchend", blockDoubleTap, { passive: false });

    // Ctrl/⌘ + wheel zoom (desktop trackpads / accidental modifiers)
    window.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey || e.metaKey) e.preventDefault();
      },
      { passive: false },
    );
  }

  private onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = h > 0 ? w / h : 16 / 9;
    const vh = this.viewHeight;
    const vw = vh * aspect;
    this.camera.left = -vw / 2;
    this.camera.right = vw / 2;
    this.camera.top = vh / 2;
    this.camera.bottom = -vh / 2;
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
    void this.startLevelAsync(id);
  }

  private async startLevelAsync(id: number): Promise<void> {
    const def = getLevel(id);
    if (!def) {
      this.showMenu();
      return;
    }
    // Tiles + portraits are in cache so the first maze and player paint immediately
    await this.assetsReady;

    this.pendingLevelId = id;
    this.fallReported = false;
    if (def.scuba) setScuba(true);

    this.teardownLevel();
    this.mode = "play";
    this.ui.clearOverlay();
    this.ui.showHud();
    this.input.setGameplayVisible(true);

    try {
      this.level = new LevelRuntime(def, {
        onHud: (hp, max, obj, clues) => this.ui.updateHud(hp, max, obj, clues),
        onHint: (t) => this.ui.showHint(t),
        onComplete: (clueId, clueText) => this.onLevelComplete(clueId, clueText),
        onDeath: () => this.onHpDeath(),
        onFallDeath: () => this.onFallGameOver(),
      });
      this.level.envMap = this.envMap;
      this.level.start();
      (
        window as unknown as { __snapAnimal?: (k?: string) => boolean }
      ).__snapAnimal = (k) => this.level?.snapPlayerNear(k) ?? false;
    } catch (err) {
      console.error("[startLevel]", err);
      this.ui.showHint("Level failed to start");
      this.showMenu();
    }
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
        const bearing = this.level.getCompassBearingDeg();
        this.ui.updateCompass(bearing, this.level.isClueCollected());
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
