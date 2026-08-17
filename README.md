# Relic

Relic is a fork of [Heroic Games Launcher](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher)
oriented exclusively to Linux.

Its purpose is to log in to game stores (Epic Games, GOG, Amazon Games, Zoom Platform),
download and install games, and automatically add them to Steam.

Relic is **not** a launcher. Steam is the launcher.

The entire gaming experience takes place inside Steam.

---

![Library](doc/Relic%20-%20library.jpg)
![Settings](doc/Relic%20-%20settings.jpg)
![Accounts](doc/Relic%20-%20accounts.jpg)
![Console Mode](doc/Relic%20-%20console%20mode.jpg)

---

## English

### What is Relic?

You know Heroic Games Launcher: you install it, you log into Epic, GOG, or Amazon, you
download a game, and you click Play. Heroic handles everything: Wine, Proton, prefixes,
launch options, all of it.

Relic is different.

Relic does the **same download and install** part, but then it stops. It never launches
your game. Instead, it hands the game over to Steam. It creates a shortcut, prepares
everything so Steam can run it, and your game appears in your Steam library — just like
any other Steam game. You launch it from Steam, not from Relic.

This means:

- No Wine/Proton configuration screens. Relic has none.
- No prefix management. Relic lets Steam and umu-launcher handle it.
- No per-game launch options. Steam has its own.
- No "Add to Steam" button. It happens automatically.

Relic is an installer that feeds games into Steam. Nothing more.

### Why would I use this?

If you already live in Steam — if you use Steam Input, Steam Overlay, Steam Cloud saves,
Game Recording, Remote Play, or just like having everything in one place — Relic gives
you all of that for your non-Steam games too. No extra launcher to open, no switching
between apps. Just install and play from Steam.

And when you launch a game from Steam, Relic is not involved at all. Steam runs the
corresponding Windows store backend (legendary.exe, gogdl.exe, nile.exe) directly
inside the Proton prefix — no Electron app sitting in memory, no background process.
You save as much RAM as possible for the game itself.

---

## Español

### ¿Qué es Relic?

Conoces Heroic Games Launcher: lo instalas, inicias sesión en Epic, GOG o Amazon,
descargas un juego y le das a Jugar. Heroic se encarga de todo: Wine, Proton, prefijos,
opciones de lanzamiento, todo.

Relic es diferente.

Relic hace la **misma parte de descargar e instalar**, pero ahí se detiene. Nunca
ejecuta tu juego. En su lugar, se lo entrega a Steam. Crea un acceso directo, prepara
todo para que Steam pueda ejecutarlo, y tu juego aparece en tu biblioteca de Steam
— igual que cualquier otro juego de Steam. Lo lanzas desde Steam, no desde Relic.

Esto significa:

- Sin pantallas de configuración de Wine/Proton. Relic no tiene ninguna.
- Sin gestión de prefijos. Relic deja que Steam y umu-launcher lo manejen.
- Sin opciones de lanzamiento por juego. Steam tiene las suyas.
- Sin botón "Añadir a Steam". Ocurre automáticamente.

Relic es un instalador que alimenta juegos a Steam. Nada más.

### ¿Por qué usaría esto?

Si ya vives en Steam — si usas Steam Input, Steam Overlay, Steam Cloud, Game Recording,
Remote Play, o simplemente te gusta tener todo en un mismo sitio — Relic te da todo eso
para tus juegos que no son de Steam también. Sin lanzadores adicionales, sin cambiar de
aplicación. Solo instalas y juegas desde Steam.

Y cuando lanzas un juego desde Steam, Relic no está involucrado en absoluto. Steam
ejecuta el lanzador de la tienda correspondiente (legendary.exe, gogdl.exe, nile.exe)
directamente dentro del prefijo de Proton — sin una aplicación Electron ocupando
memoria, sin procesos en segundo plano. Ahorras la máxima cantidad de RAM posible
para el juego.

---

## Features

- Login: Epic Games, GOG, Amazon Games, Zoom Platform
- Library viewer
- Download, install, update, repair and uninstall games
- Automatic Steam integration (shortcuts, grids, prefixes)
- GOG achievements (experimental, via [Comet](https://github.com/imLinguin/comet))
- Console mode (controller navigation)
- Linux native game support (GOG)

---

## How Steam Integration Works

Relic never launches games. Every game is added to Steam as a non-Steam shortcut,
and the user launches everything from Steam.

### Installation flow

```
Game install completed
       │
       ▼
  ┌─ is the game already tracked in Steam? ──Yes──► Skip (already done)
  │
  No
  │
  ▼
  ┌─ is it a Linux native game? (GOG)
  │
  ├── Yes (Linux native) ──────────────────────── No (Windows/Proton)
  │                                                  │
  │  • Create symlink                                ▼
  │    ~/.local/share/relic/games/<name>          • Create .bat runner file
  │    → actual install path                        ~/.local/share/relic/runner/<Game>.bat
  │                                                  │
  │  • Use existing start.sh                        ▼
  │    as the Steam shortcut target               • Add to Steam via
  │                                                  steam://addnonsteamgame
  │  • Skip: .bat, windowify, prefix                │
  │                                                  ▼
  │                                              • Windowify path transform
  │                                                Linux paths → c:\games\<name>
  │                                                Creates mount structure at:
  │                                                  ~/.local/share/relic/mount/
  │                                                  │
  │                                                  ▼
  │                                              • Create symlink
  │                                                ~/.local/share/relic/games/<name>
  │                                                → actual install path
  │                                                  │
  │                                                  ▼
  │                                              • Create Proton prefix
  │                                                Steam compatdata/<id>/drive_c/
  │                                                Runs umu-run to init prefix
  │                                                  │
  │                                                  ▼
  │                                              • Epic games only:
  │                                                run c:\relic\eos-overlay.bat
  │                                                through umu-run to install
  │                                                and enable the EOS Overlay
  │                                                in that prefix
  │                                                  │
  │                                                ▼ (both flows converge)
  │
  └──────────────────────┬──────────────────────┘
                         │
                         ▼
                  Save shortcut to
                  ~/.config/relic/steam_shortcuts.json
                         │
                         ▼
                  Download Steam grids
                  (header, portrait, hero, logo, icon)
                  from SteamGridDB
                         │
                         ▼
                  Open Steam properties dialog
                  steam://gameproperties/<id>
                         │
                         ▼
                  Done — the game appears in Steam
```

### Runner files

For Windows games, Relic creates a `.bat` file. This is the file that Steam launches.
It sets environment variables and launches the game through the store's CLI:

```
@echo off
@SET LEGENDARY_CONFIG_PATH=c:\relic\Legendary
@SET GOGDL_CONFIG_PATH=c:\relic\
@SET PATH=%PATH%;c:\relic\bin
@legendary launch <appName> %*
```

For Linux native GOG games, there is no `.bat`. Relic uses the `start.sh` script
that GOG ships with the game. Steam runs the shell script natively.

### Symlink structure

Relic maintains a directory of symbolic links at `~/.local/share/relic/games/`
that map game folder names to their actual install locations:

```
~/.local/share/relic/games/
├── Cyberpunk2077 → /home/user/Games/Relic/Cyberpunk2077
├── Beat Cop     → /home/user/Games/Relic/gog/Beat Cop
└── Fortnite     → /media/games/Fortnite
```

### Windowify (path transformation)

Windows store backends need to see paths as `c:\games\<name>` when running inside
a Proton prefix. Relic creates a mount structure at `~/.local/share/relic/mount/`
that mirrors a Windows filesystem. Each store's config is symlinked into the mount,
and `installed.json` is rewritten with `c:\` paths.

### Prefix preparation

For Windows games, Relic creates a Wine prefix inside `compatdata/<steamAppId>/drive_c/`.
Two symlinks inside `drive_c` connect the mount and game structures:

```
drive_c/relic/  → ~/.local/share/relic/mount/
drive_c/games/  → ~/.local/share/relic/games/
```

If GE-Proton is configured, Relic runs `umu-run exit` to initialize the prefix.

### Steam shortcut registration

Relic uses the `steam://addnonsteamgame/` protocol to add games to Steam. It never
writes directly to `shortcuts.vdf`. The process:

1. Opens `steam://addnonsteamgame/<runner-path>` via xdg-open
2. Steam opens an "Add Non-Steam Game" dialog
3. Relic polls `shortcuts.vdf` every 1.5s for up to 15s
4. Once the game appears, it reads the assigned `steamAppId`
5. If Steam is not running or the dialog is not confirmed, the operation times out

### Grid artwork

After adding the game, Relic downloads artwork from SteamGridDB for all Steam users:

- Header/banner (460x215)
- Portrait (600x900)
- Hero banner
- Logo/wordmark
- Icon

A SteamGridDB API key is required in settings.

### Repair flow

Repairing a game never touches Steam or the prefix. If the repair completes without
error, Relic only regenerates the `.bat` runner file in `~/.local/share/relic/runner/`
(via `createRelicBat()`), using the data already stored in `steam_shortcuts.json`.
Zoom Platform games and games that aren't tracked in Steam are skipped.

### Uninstall cleanup

When a game is uninstalled, Relic:

1. Deletes the `.bat` runner file (Windows games only)
2. Removes the symlink from `~/.local/share/relic/games/`
3. Removes the Zoom prefix symlink (Zoom games only)
4. Deletes all 5 grid artwork files
5. Removes the shortcut from `steam_shortcuts.json`

The Steam shortcut itself in `shortcuts.vdf` is **not** removed by Relic.

---

## How Relic Differs from Heroic

| Aspect                        | Heroic                                                 | Relic                               |
| ----------------------------- | ------------------------------------------------------ | ----------------------------------- |
| Game launching                | Launches games directly, full process management       | Never launches games. Steam does it |
| Add to Steam                  | Manual button per game or "Add all"                    | Automatic at install time           |
| Runner files                  | Runs store CLIs natively                               | Creates .bat files for Steam/Proton |
| Wine/Proton config            | Full UI: managers, per-game settings, Esync/Fsync/DXVK | None. Just `protonPath` in settings |
| Prefix management             | Per-game creation, location, deletion                  | Minimal: umu-run creates prefix     |
| shortcuts.vdf                 | Writes directly                                        | Uses steam://addnonsteamgame only   |
| SteamGridDB                   | Manual per game                                        | Automatic after install             |
| Lutris/Bottles/Crossover      | Supported                                              | Removed                             |
| Wine Manager / Proton Manager | Full download and install UI                           | Removed                             |
| MangoHud / Gamescope          | Integrated options                                     | Removed                             |
| macOS / Windows support       | Cross-platform                                         | Linux only                          |

### Other launchers

Most game launchers for Linux either launch games directly or treat Steam integration
as an afterthought. Relic is unique in that **Steam is the only intended way to play**.
The entire pipeline is designed to produce a game that appears and works in Steam.

---

## Installation

### One line (recommended)

```bash
curl -sL https://raw.githubusercontent.com/FranjeGueje/Relic/master/scripts/install.sh | bash
```

Downloads the AppImage, creates a Steam wrapper, adds it as a non-Steam game
and downloads grid artwork automatically.

### Manual

```bash
chmod +x Relic-*.AppImage
./Relic-*.AppImage
```

Download from the [releases page](https://github.com/FranjeGueje/Relic/releases).

### Requirements

- Linux
- Steam
- `curl`, `xxd`, `xdg-open` (for the one-line installer)

---

## File locations

```
~/.config/relic/
├── config.json              — App settings
├── store/                   — Window state, timestamps, downloads
├── legendaryConfig/         — Epic login + installed.json
├── gogdlConfig/             — GOG login + installed.json
├── nile_config/             — Amazon login + installed.json
├── zoom_store/              — Zoom Platform login
├── GamesConfig/             — Per-game settings
├── images-cache/            — Cached SteamGridDB images
├── icons/                   — Custom game icons
└── store_cache/             — Library caches per store

~/.local/share/relic/
├── games/                   — Symlinks to installed game dirs
├── runner/                  — .bat files for Steam (Windows games)
└── mount/                   — Mount structure for Proton prefixes
    ├── legendary/           — Epic config with c:\ paths
    ├── gog_store/           — GOG config with c:\ paths
    ├── nile/                — Amazon config with c:\ paths
    └── bin/                 — Synced win32 binaries

~/Games/Relic/               — Default game install path
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

- [Heroic Games Launcher](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher)
- [Legendary](https://github.com/derrod/legendary)
- [GOGdl](https://github.com/Heroic-Games-Launcher/heroic-gogdl)
- [Nile](https://github.com/imLinguin/nile)
- [Comet](https://github.com/imLinguin/comet)
- [umu-launcher](https://github.com/Open-Wine-Components/umu-launcher)

---

## License

GPL-3.0-only
