# Relic

Relic is a fork of [Heroic Games Launcher](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher)
oriented exclusively to Linux.

Its purpose is to log in to game stores (Epic Games, GOG, Amazon Games, Zoom Platform),
download and install games, and automatically add them to Steam.

Relic is **not** a launcher. Steam is the launcher.

The entire gaming experience takes place inside Steam.

---

## Features

- Login: Epic Games, GOG, Amazon Games, Zoom Platform
- Library viewer
- Download, install, update, repair and uninstall games
- Automatic executable detection
- External script integration for Steam
- Console mode (controller navigation)
- Sideload (add games manually)

---

## Installation

### Linux (AppImage)

Download the latest `.AppImage` from the [releases page](https://github.com/FranjeGueje/Relic/releases),
make it executable and run it.

```bash
chmod +x Relic-*.AppImage
./Relic-*.AppImage
```

---

## Building from source

```bash
git clone https://github.com/FranjeGueje/Relic.git
cd Relic
pnpm install
pnpm download-helper-binaries
pnpm dist:linux
```

---

## Credits

- [Heroic Games Launcher](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher) — the project Relic is forked from
- [Legendary](https://github.com/derrod/legendary)
- [GOGdl](https://github.com/Heroic-Games-Launcher/heroic-gogdl)
- [Nile](https://github.com/imLinguin/nile)
- [Comet](https://github.com/imLinguin/comet)
- [umu-launcher](https://github.com/Open-Wine-Components/umu-launcher)

---

## License

GPL-3.0-only
