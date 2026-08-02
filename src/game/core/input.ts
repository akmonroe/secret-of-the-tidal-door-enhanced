/** Keyboard + on-screen virtual stick / dodge button. */

export class Input {
  private keys = new Set<string>();
  /** Stick direction in screen space, -1..1 */
  stick = { x: 0, y: 0 };
  private dodgeQueued = false;
  private stickPointerId: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private readonly maxRadius = 56;

  private stickBase!: HTMLDivElement;
  private stickThumb!: HTMLDivElement;
  private dodgeBtn!: HTMLButtonElement;
  private root!: HTMLDivElement;

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.buildTouchUI();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    if (e.code === "Space" || e.code === "ShiftLeft" || e.code === "ShiftRight") {
      e.preventDefault();
      this.dodgeQueued = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private buildTouchUI(): void {
    this.root = document.createElement("div");
    this.root.id = "touch-ui";
    this.root.innerHTML = `
      <div class="stick-base" id="stick-base">
        <div class="stick-thumb" id="stick-thumb"></div>
        <span class="stick-label">MOVE</span>
      </div>
      <button type="button" class="dodge-btn" id="dodge-btn">JUMP<br/>DODGE</button>
    `;
    document.body.appendChild(this.root);
    this.stickBase = this.root.querySelector("#stick-base")!;
    this.stickThumb = this.root.querySelector("#stick-thumb")!;
    this.dodgeBtn = this.root.querySelector("#dodge-btn")!;

    const onDown = (e: PointerEvent) => {
      if (e.clientX > window.innerWidth * 0.45) return;
      this.stickPointerId = e.pointerId;
      this.stickOrigin.x = e.clientX;
      this.stickOrigin.y = e.clientY;
      this.stickBase.style.left = `${e.clientX}px`;
      this.stickBase.style.top = `${e.clientY}px`;
      this.stickBase.classList.add("active");
      this.updateStick(e.clientX, e.clientY);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== this.stickPointerId) return;
      this.updateStick(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== this.stickPointerId) return;
      this.stickPointerId = null;
      this.stick.x = 0;
      this.stick.y = 0;
      this.stickThumb.style.transform = "translate(-50%, -50%)";
      this.stickBase.classList.remove("active");
      this.stickBase.style.left = "100px";
      this.stickBase.style.top = "calc(100% - 100px)";
    };

    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    this.dodgeBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dodgeQueued = true;
      this.dodgeBtn.classList.add("pressed");
    });
    this.dodgeBtn.addEventListener("pointerup", () => {
      this.dodgeBtn.classList.remove("pressed");
    });
  }

  private updateStick(cx: number, cy: number): void {
    let dx = cx - this.stickOrigin.x;
    let dy = cy - this.stickOrigin.y;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(len, this.maxRadius);
    dx = (dx / len) * clamped;
    dy = (dy / len) * clamped;
    this.stickThumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.stick.x = dx / this.maxRadius;
    this.stick.y = dy / this.maxRadius;
    if (Math.hypot(this.stick.x, this.stick.y) < 0.15) {
      this.stick.x = 0;
      this.stick.y = 0;
    }
  }

  /** Movement in world XZ: x right, z down-on-screen (toward camera bottom). */
  moveVector(): { x: number; z: number } {
    let x = 0;
    let z = 0;
    if (this.keys.has("ArrowLeft") || this.keys.has("KeyA")) x -= 1;
    if (this.keys.has("ArrowRight") || this.keys.has("KeyD")) x += 1;
    if (this.keys.has("ArrowUp") || this.keys.has("KeyW")) z -= 1;
    if (this.keys.has("ArrowDown") || this.keys.has("KeyS")) z += 1;
    if (this.stick.x !== 0 || this.stick.y !== 0) {
      x = this.stick.x;
      z = this.stick.y;
    }
    const len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    return { x, z };
  }

  consumeDodge(): boolean {
    if (!this.dodgeQueued) return false;
    this.dodgeQueued = false;
    return true;
  }

  setGameplayVisible(on: boolean): void {
    this.root.style.display = on ? "block" : "none";
  }

  setDodgeReady(ready: boolean): void {
    this.dodgeBtn.classList.toggle("cooldown", !ready);
  }
}
