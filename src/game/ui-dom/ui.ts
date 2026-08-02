import { clueCount, setCharacter, type CharacterId } from "../progress/state";

export type UIHandlers = {
  onStartAdventure: () => void;
  onCharacterPicked: (id: CharacterId) => void;
  onStoryContinue: () => void;
  onClueContinue: () => void;
  onFailRestart: () => void;
};

export class GameUI {
  private root: HTMLDivElement;
  private handlers: UIHandlers;
  private hudEl!: HTMLDivElement;
  private hintEl!: HTMLDivElement;

  constructor(handlers: UIHandlers) {
    this.handlers = handlers;
    this.root = document.createElement("div");
    this.root.id = "game-ui";
    document.body.appendChild(this.root);
    this.ensureHud();
  }

  private ensureHud(): void {
    this.hudEl = document.createElement("div");
    this.hudEl.id = "hud";
    this.hudEl.style.display = "none";
    this.hudEl.innerHTML = `
      <div class="hud-panel">
        <div id="hud-hearts"></div>
        <div id="hud-objective"></div>
        <div id="hud-clues"></div>
      </div>
    `;
    document.body.appendChild(this.hudEl);
    this.hintEl = document.createElement("div");
    this.hintEl.id = "hud-hint";
    this.hintEl.style.display = "none";
    document.body.appendChild(this.hintEl);
  }

  showMenu(levelsBuilt = 1): void {
    this.hideHud();
    this.root.innerHTML = `
      <div class="panel menu-panel">
        <h1>Secret of the Tidal Door</h1>
        <p class="sub">A Switch-style ocean adventure for explorers.<br/>
        Collect twelve clues. Find the <strong>Rainbow Coral</strong>.</p>
        <p class="sub">Playable now: <strong>${levelsBuilt}</strong> of 12 seas</p>
        <button class="btn primary" id="btn-start">Start Adventure</button>
        <p class="controls-help">WASD / Arrows · Space dodge · Touch stick + JUMP DODGE</p>
      </div>
    `;
    this.root.querySelector("#btn-start")!.addEventListener("click", () => {
      this.handlers.onStartAdventure();
    });
  }

  showCharacterSelect(): void {
    this.hideHud();
    this.root.innerHTML = `
      <div class="panel">
        <h2>Who is exploring today?</h2>
        <p class="sub">Pick a girl or a boy adventurer</p>
        <div class="char-row">
          <button class="char-card" data-id="girl">
            <div class="char-preview girl"></div>
            <span>Girl</span>
            <small>Coral dress · braid</small>
          </button>
          <button class="char-card" data-id="boy">
            <div class="char-preview boy"></div>
            <span>Boy</span>
            <small>Ocean tee · short hair</small>
          </button>
        </div>
        <button class="btn primary" id="btn-char-go" disabled>Continue</button>
      </div>
    `;
    let selected: CharacterId | null = null;
    const go = this.root.querySelector("#btn-char-go") as HTMLButtonElement;
    this.root.querySelectorAll(".char-card").forEach((el) => {
      el.addEventListener("click", () => {
        this.root.querySelectorAll(".char-card").forEach((c) => c.classList.remove("selected"));
        el.classList.add("selected");
        selected = (el as HTMLElement).dataset.id as CharacterId;
        go.disabled = false;
      });
    });
    go.addEventListener("click", () => {
      if (!selected) return;
      setCharacter(selected);
      this.handlers.onCharacterPicked(selected);
    });
  }

  showStory(title: string, body: string): void {
    this.hideHud();
    this.root.innerHTML = `
      <div class="panel story-panel">
        <h2>${escapeHtml(title)}</h2>
        <p class="story-body">${escapeHtml(body).replace(/\n/g, "<br/>")}</p>
        <button class="btn primary" id="btn-story">Continue</button>
      </div>
    `;
    this.root.querySelector("#btn-story")!.addEventListener("click", () => {
      this.handlers.onStoryContinue();
    });
  }

  /** Full blackout — failed run, must restart from the beginning. */
  showFailScreen(): void {
    this.hideHud();
    this.root.innerHTML = `
      <div class="panel fail-panel">
        <h2 class="fail-title">You have failed to find the treasure</h2>
        <p class="story-body">The edge of the world claimed another explorer.<br/>
        Your journey must begin again.</p>
        <button class="btn primary" id="btn-fail">Restart Game</button>
      </div>
    `;
    this.root.querySelector("#btn-fail")!.addEventListener("click", () => {
      this.handlers.onFailRestart();
    });
  }

  showClueFound(clueId: string, clueText: string, nextLevelTitle: string | null): void {
    this.hideHud();
    const nextLine = nextLevelTitle
      ? `Next: <strong>${escapeHtml(nextLevelTitle)}</strong>`
      : "You've cleared every sea charted so far.";
    const btnLabel = nextLevelTitle ? "Next Sea →" : "Continue";
    this.root.innerHTML = `
      <div class="panel story-panel">
        <h2>Clue found: ${escapeHtml(clueId)}</h2>
        <p class="story-body clue-quote">“${escapeHtml(clueText)}”</p>
        <p class="sub">Ocean Journal: ${clueCount()} / 12 fragments</p>
        <p class="story-body">${nextLine}</p>
        <button class="btn primary" id="btn-clue">${btnLabel}</button>
      </div>
    `;
    this.root.querySelector("#btn-clue")!.addEventListener("click", () => {
      this.handlers.onClueContinue();
    });
  }

  clearOverlay(): void {
    this.root.innerHTML = "";
  }

  showHud(): void {
    this.hudEl.style.display = "block";
  }

  hideHud(): void {
    this.hudEl.style.display = "none";
    this.hintEl.style.display = "none";
  }

  updateHud(hp: number, maxHp: number, objective: string, clues: number): void {
    const hearts = "♥".repeat(hp) + "♡".repeat(Math.max(0, maxHp - hp));
    const h = this.hudEl.querySelector("#hud-hearts");
    const o = this.hudEl.querySelector("#hud-objective");
    const c = this.hudEl.querySelector("#hud-clues");
    if (h) h.textContent = hearts;
    if (o) o.textContent = objective;
    if (c) c.textContent = `Clues ${clues} / 12`;
  }

  showHint(text: string): void {
    this.hintEl.textContent = text;
    this.hintEl.style.display = "block";
    this.hintEl.style.opacity = "1";
    window.setTimeout(() => {
      this.hintEl.style.opacity = "0";
    }, 4000);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
