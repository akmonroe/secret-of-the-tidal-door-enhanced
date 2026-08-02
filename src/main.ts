import "./style.css";
import { GameApp } from "./game/core/GameApp";

const container = document.getElementById("game-container");
if (!container) {
  throw new Error("#game-container missing");
}

new GameApp(container);
