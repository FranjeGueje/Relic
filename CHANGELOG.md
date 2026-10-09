# Changelog

The history of the previous Relic (the desktop launcher, versions up to 0.6.x) is in the `legacy` branch.

## Unreleased

### Added

- `scripts/install.sh`: `curl … | bash` installer. Downloads the latest AppImage to `~/.local/bin/Relic` (removing the old `relic.AppImage`), checks its sha256, and adds it to Steam with the grids in `grids/`.

## Unreleased

### Added

- On start, before rakun exists, Relic moves the previous Relic's files to rakun's places when `~/.config/relic` is there and `~/.config/rakun` is not: `~/.local/share/relic` becomes `~/.local/share/rakun` (a link keeps the old name working for the Steam shortcuts), and the stores' sessions, installed games and settings are copied to `~/.config/rakun`. The old `~/.config/relic` is deleted once the copy is checked.

## 1.0.0 — Console-mode client for rakun

Relic is now a console-mode client for [rakun](https://github.com/FranjeGueje/rakun/), made for a gamepad. It replaces the old desktop app.

### Added

- The interface is rakun's web, shared through the `vendor/rakun` submodule (`scripts/init-ui.sh` fetches it).
- Library of Epic, GOG, Amazon and Zoom, navigable with a gamepad or the keyboard; install, update, repair, uninstall, import a game from a folder, choose between the Windows and the Linux build, downloads panel.
- Login to the stores in a window of the app.
- Menu: accounts, download and Proton folders, SteamGridDB key, download language, and the helper binaries rakun needs.
- rakun inside the AppImage, run on Electron's own Node: nothing to install, and it stops with the app.
- AppImage that leaves nothing behind in `~/.config` or `~/.cache`: the only files that stay are rakun's, the tool that manages the libraries.
