const TICK_MS = 150;
const {
  GRID_SIZE,
  createInitialState,
  getDirectionFromKey,
  queueDirection,
  stepGame
} = window.SnakeLogic;
const board = document.querySelector("#board");
const score = document.querySelector("#score");
const highScore = document.querySelector("#highScore");
const highScoreNote = document.querySelector("#highScoreNote");
const status = document.querySelector("#status");
const pauseButton = document.querySelector("#pauseButton");
const pauseOverlay = document.querySelector("#pauseOverlay");
const resumeButton = document.querySelector("#resumeButton");
const overlayRestartButton = document.querySelector("#overlayRestartButton");
const restartButton = document.querySelector("#restartButton");
const controlButtons = document.querySelectorAll("[data-direction]");
const HIGH_SCORE_KEY = "snake-high-score";

let gameState = createInitialState();
let timerId = null;
let bestScore = loadHighScore();
let hasCelebratedRecord = false;

function loadHighScore() {
  const storedValue = window.localStorage.getItem(HIGH_SCORE_KEY);
  const parsedValue = Number.parseInt(storedValue ?? "0", 10);

  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

function syncHighScore(nextScore) {
  if (nextScore <= bestScore) {
    return false;
  }

  bestScore = nextScore;
  window.localStorage.setItem(HIGH_SCORE_KEY, String(bestScore));
  return true;
}

function renderBoard(state) {
  const snakeCells = new Set(
    state.snake.map(({ x, y }, index) => `${x},${y}:${index === 0 ? "head" : "body"}`)
  );

  board.replaceChildren();
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const cell = document.createElement("div");
      const key = `${x},${y}`;
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");

      if (snakeCells.has(`${key}:head`)) {
        cell.classList.add("snake", "head");
        cell.classList.add(`facing-${state.direction}`);
      } else if (snakeCells.has(`${key}:body`)) {
        cell.classList.add("snake");
      } else if (state.food && state.food.x === x && state.food.y === y) {
        cell.classList.add("food");
      }

      board.appendChild(cell);
    }
  }

  score.textContent = String(state.score);
  const isNewRecord = syncHighScore(state.score);
  highScore.textContent = String(bestScore);
  if (isNewRecord) {
    hasCelebratedRecord = true;
  }

  const shouldCelebrateRecord = hasCelebratedRecord && state.score === bestScore && bestScore > 0;
  highScore.parentElement.classList.toggle("record-celebration", shouldCelebrateRecord);
  highScoreNote.textContent = shouldCelebrateRecord ? "New record!" : "";
  pauseOverlay.classList.toggle("hidden", state.status !== "paused");
  pauseButton.textContent = state.status === "paused" ? "Resume" : "Pause";
  pauseButton.disabled = state.status === "idle" || state.status === "game-over";

  if (state.status === "game-over") {
    status.textContent = "Game over. Press restart to play again.";
  } else if (state.status === "paused") {
    status.textContent = "Game paused. Press resume or P to continue.";
  } else if (state.status === "running") {
    status.textContent = "Use arrow keys or WASD to steer.";
  } else {
    status.textContent = "Use arrow keys or WASD to start.";
  }
}

function stopTimer() {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function startTimer() {
  if (timerId !== null || gameState.status !== "running") {
    return;
  }

  timerId = window.setInterval(() => {
    gameState = stepGame(gameState);
    renderBoard(gameState);

    if (gameState.status === "game-over") {
      stopTimer();
    }
  }, TICK_MS);
}

function pauseGame() {
  if (gameState.status !== "running") {
    return;
  }

  stopTimer();
  gameState = {
    ...gameState,
    status: "paused"
  };
  renderBoard(gameState);
  pauseButton.focus();
}

function resumeGame() {
  if (gameState.status !== "paused") {
    return;
  }

  gameState = {
    ...gameState,
    status: "running"
  };
  renderBoard(gameState);
  startTimer();
  board.focus();
}

function togglePause() {
  if (gameState.status === "running") {
    pauseGame();
  } else if (gameState.status === "paused") {
    resumeGame();
  }
}

function restartGame() {
  stopTimer();
  gameState = createInitialState();
  hasCelebratedRecord = false;
  renderBoard(gameState);
  board.focus();
}

function handleDirection(direction) {
  if (gameState.status === "paused" || gameState.status === "game-over") {
    return;
  }

  gameState = {
    ...gameState,
    queuedDirection: queueDirection(gameState, direction),
    status: gameState.status === "idle" ? "running" : gameState.status
  };
  renderBoard(gameState);
  if (gameState.status !== "game-over") {
    startTimer();
  }
}

function focusBoard() {
  board.focus();
}

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "p") {
    event.preventDefault();
    togglePause();
    return;
  }

  const direction = getDirectionFromKey(event.key);
  if (!direction) {
    if (event.key === "Enter" && gameState.status === "game-over") {
      restartGame();
    }
    return;
  }

  event.preventDefault();
  handleDirection(direction);
});

pauseButton.addEventListener("click", togglePause);
resumeButton.addEventListener("click", resumeGame);
overlayRestartButton.addEventListener("click", restartGame);
restartButton.addEventListener("click", restartGame);
controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    focusBoard();
    handleDirection(button.dataset.direction);
  });
});

window.addEventListener("pointerdown", focusBoard);
window.addEventListener("load", focusBoard);

renderBoard(gameState);
