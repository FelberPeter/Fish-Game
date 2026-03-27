# Fish Game

A lightweight browser fishing game built with plain HTML, CSS, and JavaScript.

## Play Locally

1. Open `index.html` in your browser.
2. Click in the water area to cast your line.
3. Catch fish to earn score and buy upgrades.

## Controls

- Mouse move: aim player line
- Left click in game area: cast
- `+` / `-` buttons: zoom in/out
- Fullscreen button: toggle fullscreen

## Debug Mode

A test shortcut is available only in debug mode.

1. Open the game with `?debug=1` in the URL.
2. Press `M` to set a high test score.

Example: `index.html?debug=1`

## Publish on GitHub Pages

This repository includes a GitHub Actions workflow that deploys the static game to GitHub Pages.

1. Push this repository to GitHub.
2. In GitHub, go to **Settings -> Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main` (or run the workflow manually).

After deployment, your game will be available at your Pages URL.

## Project Structure

- `index.html`: GitHub Pages entry point (redirects to game file)
- `Fishing-Game.html`: main game markup
- `style.css`: styles
- `script.js`: game logic
- `.github/workflows/deploy-pages.yml`: deployment workflow

## License

This project is released under The Unlicense. You can use it for any purpose, including commercial use, without restrictions.
