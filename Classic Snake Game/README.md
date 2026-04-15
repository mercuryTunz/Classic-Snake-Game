# Snake

Classic Snake implemented as a dependency-free browser app.

## Run

1. Open `run-game.html` in a browser.
2. If your browser blocks module loading from a local file, serve the folder with any static server and open the served `run-game.html`.

## Files

- `run-game.html`: page shell and controls
- `styles.css`: minimal game styling
- `snake-logic.js`: deterministic game rules
- `snake-game.js`: DOM rendering and input handling

## Manual verification

- Start moving with arrow keys or `WASD`
- Confirm the snake grows by one after eating food
- Confirm the score increments by one per food
- Confirm wall collision ends the game
- Confirm self-collision ends the game
- Confirm `Restart` resets the score and snake
- Confirm `Pause` and `Resume` both work from the button and the `P` key
- Confirm on-screen buttons work on small screens

Made by Tajus,
2026.
