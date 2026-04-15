(function () {
  const GRID_SIZE = 16;
  const INITIAL_SNAKE = [
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 }
  ];
  const INITIAL_DIRECTION = "right";
  const DIRECTION_VECTORS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  const OPPOSITE_DIRECTIONS = {
    up: "down",
    down: "up",
    left: "right",
    right: "left"
  };

  function cloneSegments(segments) {
    return segments.map((segment) => ({ ...segment }));
  }

  function positionsMatch(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function createInitialState(random = Math.random) {
    const snake = cloneSegments(INITIAL_SNAKE);
    return {
      gridSize: GRID_SIZE,
      snake,
      direction: INITIAL_DIRECTION,
      queuedDirection: INITIAL_DIRECTION,
      food: spawnFood(snake, GRID_SIZE, random),
      score: 0,
      status: "idle"
    };
  }

  function queueDirection(state, nextDirection) {
    if (!DIRECTION_VECTORS[nextDirection]) {
      return state.direction;
    }

    if (
      state.snake.length > 1 &&
      OPPOSITE_DIRECTIONS[state.direction] === nextDirection
    ) {
      return state.queuedDirection || state.direction;
    }

    return nextDirection;
  }

  function stepGame(state, random = Math.random) {
    if (state.status === "game-over") {
      return state;
    }

    const direction = state.queuedDirection || state.direction;
    const vector = DIRECTION_VECTORS[direction];
    const head = state.snake[0];
    const nextHead = { x: head.x + vector.x, y: head.y + vector.y };

    const hitsWall =
      nextHead.x < 0 ||
      nextHead.y < 0 ||
      nextHead.x >= state.gridSize ||
      nextHead.y >= state.gridSize;

    const grows = positionsMatch(nextHead, state.food);
    const bodyToCheck = grows ? state.snake : state.snake.slice(0, -1);
    const hitsSelf = bodyToCheck.some((segment) => positionsMatch(segment, nextHead));

    if (hitsWall || hitsSelf) {
      return {
        ...state,
        direction,
        queuedDirection: direction,
        status: "game-over"
      };
    }

    const nextSnake = [nextHead, ...cloneSegments(state.snake)];
    if (!grows) {
      nextSnake.pop();
    }

    return {
      ...state,
      snake: nextSnake,
      direction,
      queuedDirection: direction,
      food: grows ? spawnFood(nextSnake, state.gridSize, random) : state.food,
      score: grows ? state.score + 1 : state.score,
      status: "running"
    };
  }

  function spawnFood(snake, gridSize, random = Math.random) {
    const occupied = new Set(snake.map(({ x, y }) => `${x},${y}`));
    const openCells = [];

    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        const key = `${x},${y}`;
        if (!occupied.has(key)) {
          openCells.push({ x, y });
        }
      }
    }

    if (openCells.length === 0) {
      return null;
    }

    const index = Math.floor(random() * openCells.length);
    return openCells[index];
  }

  function getDirectionFromKey(key) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === "arrowup" || normalizedKey === "w") {
      return "up";
    }
    if (normalizedKey === "arrowdown" || normalizedKey === "s") {
      return "down";
    }
    if (normalizedKey === "arrowleft" || normalizedKey === "a") {
      return "left";
    }
    if (normalizedKey === "arrowright" || normalizedKey === "d") {
      return "right";
    }
    return null;
  }

  window.SnakeLogic = {
    GRID_SIZE,
    createInitialState,
    queueDirection,
    stepGame,
    spawnFood,
    getDirectionFromKey
  };
})();
