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
const musicToggleButton = document.querySelector("#musicToggleButton");
const pauseButton = document.querySelector("#pauseButton");
const pauseOverlay = document.querySelector("#pauseOverlay");
const resumeButton = document.querySelector("#resumeButton");
const overlayRestartButton = document.querySelector("#overlayRestartButton");
const restartButton = document.querySelector("#restartButton");
const controlButtons = document.querySelectorAll("[data-direction]");
const HIGH_SCORE_KEY = "snake-high-score";
const MUSIC_MUTED_KEY = "snake-music-muted";
const MUSIC_NOTES = [261.63, 329.63, 392.0, 329.63, 293.66, 349.23, 392.0, 349.23];

let gameState = createInitialState();
let timerId = null;
let bestScore = loadHighScore();
let hasCelebratedRecord = false;
let mouthOpenUntil = 0;
let audioContext = null;
let musicGainNode = null;
let musicTimerId = null;
let musicStep = 0;
let isMusicMuted = loadMusicMuted();

function loadHighScore() {
  const storedValue = window.localStorage.getItem(HIGH_SCORE_KEY);
  const parsedValue = Number.parseInt(storedValue ?? "0", 10);

  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

function loadMusicMuted() {
  return window.localStorage.getItem(MUSIC_MUTED_KEY) === "true";
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
  const isMouthOpen = Date.now() < mouthOpenUntil;
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
        if (isMouthOpen) {
          cell.classList.add("mouth-open");
        }
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
  musicToggleButton.textContent = isMusicMuted ? "Unmute Music" : "Mute Music";
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

function getAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }

  if (audioContext === null) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function getMusicGainNode() {
  const context = getAudioContext();
  if (!context) {
    return null;
  }

  if (musicGainNode === null) {
    musicGainNode = context.createGain();
    musicGainNode.gain.setValueAtTime(0.04, context.currentTime);
    musicGainNode.connect(context.destination);
  }

  return musicGainNode;
}

function playEatSound() {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const startTime = context.currentTime;

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(620, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(280, startTime + 0.09);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.12, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.11);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + 0.12);
}

function playMusicNote(frequency, duration = 0.7) {
  const context = getAudioContext();
  const gainNode = getMusicGainNode();
  if (!context || !gainNode || isMusicMuted) {
    return;
  }

  const oscillator = context.createOscillator();
  const noteGain = context.createGain();
  const startTime = context.currentTime;
  const endTime = startTime + duration;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);

  noteGain.gain.setValueAtTime(0.0001, startTime);
  noteGain.gain.linearRampToValueAtTime(0.16, startTime + 0.18);
  noteGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

  oscillator.connect(noteGain);
  noteGain.connect(gainNode);
  oscillator.start(startTime);
  oscillator.stop(endTime);
}

function startBackgroundMusic() {
  if (musicTimerId !== null || isMusicMuted) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  playMusicNote(MUSIC_NOTES[musicStep], 1.1);
  musicStep = (musicStep + 1) % MUSIC_NOTES.length;
  musicTimerId = window.setInterval(() => {
    playMusicNote(MUSIC_NOTES[musicStep], 1.1);
    musicStep = (musicStep + 1) % MUSIC_NOTES.length;
  }, 900);
}

function stopBackgroundMusic() {
  if (musicTimerId !== null) {
    window.clearInterval(musicTimerId);
    musicTimerId = null;
  }
}

function toggleMusicMute() {
  isMusicMuted = !isMusicMuted;
  window.localStorage.setItem(MUSIC_MUTED_KEY, String(isMusicMuted));

  if (isMusicMuted) {
    stopBackgroundMusic();
  } else {
    startBackgroundMusic();
  }

  renderBoard(gameState);
}

function startTimer() {
  if (timerId !== null || gameState.status !== "running") {
    return;
  }

  timerId = window.setInterval(() => {
    const previousScore = gameState.score;
    gameState = stepGame(gameState);
    if (gameState.score > previousScore) {
      mouthOpenUntil = Date.now() + 220;
      playEatSound();
    }
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
  mouthOpenUntil = 0;
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

function handleFirstInteraction() {
  startBackgroundMusic();
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
musicToggleButton.addEventListener("click", toggleMusicMute);
resumeButton.addEventListener("click", resumeGame);
overlayRestartButton.addEventListener("click", restartGame);
restartButton.addEventListener("click", restartGame);
controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleFirstInteraction();
    focusBoard();
    handleDirection(button.dataset.direction);
  });
});

window.addEventListener("pointerdown", () => {
  handleFirstInteraction();
  focusBoard();
});
window.addEventListener("keydown", handleFirstInteraction, { once: true });
window.addEventListener("load", focusBoard);

renderBoard(gameState);
