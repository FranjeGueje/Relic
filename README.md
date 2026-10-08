# Relic

A console-mode client for [rakun](https://github.com/FranjeGueje/rakun/): a full-screen library of your Epic, GOG, Amazon and Zoom
games that you drive with a gamepad (or the keyboard), made to run as a shortcut in Steam's Game Mode or
as a plain window on the desktop.

Settings live in rakun (`rakunctl config`) and the client has no file of its own. Its **menu** (Select) shows and
changes some of them in rakun: the accounts, the download folder, the Proton folder, the SteamGridDB key and the
language rakun downloads in. It also shows the helper binaries rakun needs and can ask it to download them. The interface itself is always in English.

## Relic 1.0 is a new app

If you know Relic before 1.0 (the desktop launcher based on Heroic), this is **not an update of that**: from 1.0.0
Relic is a console-mode client, made for a gamepad. The old code lives on in the
[`legacy`](https://github.com/FranjeGueje/Relic/tree/legacy) branch (versions up to 0.6.x), which does not get new
features.

What did the store work now is **[rakun](https://github.com/FranjeGueje/rakun/)**, a backend-only service that comes from the same lineage
(Heroic → Relic → rakun): it logs in to Epic, GOG, Amazon and Zoom and installs the games, with a local HTTP API.
Relic is a client of it. Your sessions from the old Relic can be imported by rakun (`importSessionsFromRelic`).

## What it does

- **Library:** covers of all your games, filtered by store, installed or not, sorted A→Z / Z→A. `●` marks
  what is installed and `↑` what has an update.
- **Game sheet:** install (when a game has a Windows and a Linux build you choose which), import a game that is
  already on the disk from a folder (not on Zoom), update, repair or uninstall (asking first), cancel a download
  (asking first: what was downloaded so far is deleted) or take a game out of the queue.
- **Downloads:** the queue with progress, speed and time left; pause, resume, cancel the current one, clear
  the finished ones (a failed one says why).
- **Fast start:** the screen, the store tabs and each store's games show as they are read (a store that
  is slower does not hold the others); the update marks come last, in the background. Note that asking
  rakun for updates (`checkGameUpdates`) also **queues them when rakun's `autoUpdateGames` is on**, so
  opening the client (and refreshing) can start downloads of updates. To see how long each step of the
  start takes: `RELIC_PERF=1 pnpm dev` and look at the console (`[perf] …`).
- **rakun inside:** the AppImage carries rakun (only its script, which runs on Electron's own Node: no
  separate Node, no `rakunctl`). When none answers, Relic starts its own by itself and stops it when you leave,
  waiting for it, so nothing is left running. The «Quit?» dialog says that the downloads in progress stop with it.
  If a rakun is already running (the one you installed, a service) Relic uses that one and leaves it alone.
- **rakun not running** (no embedded one, as with `pnpm dev`): the screen says so, has a **Start rakun** button
  (A / Enter) and retries by itself; when it is back everything is read again. The button runs `rakunctl start`
  (found in `~/.local/opt/rakun/rakunctl`, where `install.sh` leaves it, or in the `PATH`). A rakun that was already
  running when the client opened **stays running**; one the client started is closed on exit with `rakunctl stop`,
  which refuses while rakun is downloading or refreshing: then it stays running.

- **Accounts:** Select opens the menu → Accounts lists each store and whether it is signed in. A on a store
  without session opens its login page in a window (type your user and password there: nothing is copied or
  pasted; the client takes the code from the page the store ends on and gives it to rakun). Esc closes the
  window. A on a signed-in store asks, then signs out.

- **Settings:** folders are chosen by walking through the disk with the gamepad (A enters, B cancels; rakun
  checks the folder and its reason is shown). The SteamGridDB key is typed in a text field (Steam's on-screen
  keyboard works). The language (left/right) is the one rakun asks the stores for, not the interface's.

- **Helper binaries:** when rakun lacks one of the programs it runs for the stores (legendary, gogdl, nile…) a
  notice at the bottom says which and has a **Download** button. Select → Helper binaries lists them with their
  state and can also download the newest versions (unchecked).
- **With the mouse:** every panel has a **✕ Close** button, the text fields and the language picker have **OK**,
  and the header has a **Settings** button. On a narrow window the bar shows the stores and a **☰** for the rest.

Not in this version: categories, favourites, search.

## Controls

| Action                | Gamepad       | Keyboard                |
| --------------------- | ------------- | ----------------------- |
| Move                  | D-pad / stick | arrows                  |
| Select / confirm      | A (✕)         | Enter                   |
| Back / close          | B (◯)         | Esc                     |
| Previous / next store | L1 / R1       | `[` / `]`               |
| Installed only        | X (□)         | `i`                     |
| Downloads             | Y (△)         | `d`                     |
| Sort                  | R2            | `s`                     |
| Refresh library       | Start         | `r`                     |
| Menu                  | Select        | `m`                     |
| Quit (asks first)     | B on the grid | `q`, or Esc on the grid |

The hints at the bottom show the buttons of the pad that is connected.

## Requirements

- The AppImage needs nothing else: it carries rakun. Log in to the stores from the menu (Select → Accounts); the
  helper programs rakun runs for each store are downloaded the first time (a notice offers it).
- To build it, or to run without the embedded rakun (`pnpm dev`): [rakun](https://github.com/FranjeGueje/rakun/) installed and running
  (`rakunctl start`). The client reads its port and token from `~/.config/rakun/api.json`
  (`RAKUN_API_FILE` points it at another one). Node 24 and pnpm to build.

## Running it

```bash
git clone https://github.com/FranjeGueje/Relic.git && cd Relic
scripts/init-ui.sh       # the interface is rakun's web, a git submodule (vendor/rakun)
pnpm install
node node_modules/electron/install.js   # only if Electron's binary is missing (pnpm skips it when node_modules already existed)
pnpm dev                 # development, with hot reload
pnpm build && pnpm start # the built app
```

For Game Mode, use the AppImage below; it also goes full screen by itself when `XDG_CURRENT_DESKTOP=gamescope`.
`pnpm dev` and `pnpm start` still leave a few GPU driver cache files in `~/.cache`: only the AppImage moves them.

### Packaging

```bash
pnpm package        # dist/relic-<version>-<arch>.AppImage (+ .sha256), about 100 MB
```

It builds the app and puts it inside the Electron this checkout has, with rakun's script taken from a rakun tarball
(`RAKUN_TARBALL`, else the newest in `../rakun/dist`; build it there with `pnpm package`), for the architecture of this machine, as a
single **AppImage**: it needs neither Node nor `node_modules`, and it is mounted, not extracted, so it leaves
nothing on disk. `chmod +x` it and run it from anywhere (add `--fullscreen` for Game Mode). For Steam, add a
non-Steam game whose target is the `.AppImage`. Without FUSE, run it with `--appimage-extract-and-run`. It has no
setuid sandbox helper: Chromium uses user namespaces, and if your system has them off add `--no-sandbox`.
The build downloads `appimagetool` and the AppImage runtime once, pinned and checked against their checksum,
into `dist/.tools/`.

### Leaves nothing behind

Relic writes nothing in `~/.config` or `~/.cache`. What Electron and the GPU driver store while it runs (user
data, caches, logs, shader cache, certificate database) goes to `$XDG_RUNTIME_DIR/relic` (a tmpfs; `/tmp/relic`
if there is none) and is removed when it exits. After a crash it stays there until you log out. The only thing
that lasts is rakun's own data (`~/.config/rakun`, `~/.local/share/rakun`, `~/.cache/rakun`: your sessions, library
and games), which belongs to you and stays where a standalone rakun keeps it. `rakunctl` is run with your original
environment, so rakun keeps using its usual folders.

`pnpm codecheck`, `pnpm lint`, `pnpm prettier` and `pnpm test` check the project.

## Releases

GitHub Actions (`.github/workflows`) check every push to any branch and every pull request (`codecheck`, `lint`,
`prettier`, the tests and the build). A release is made by a tag, and only a `vX.Y.Z` one (`v1.0.0-rc1` does nothing):

1. Bump `version` in `package.json` and add `## X.Y.Z — Title` to `CHANGELOG.md` (`scripts/release-notes.sh vX.Y.Z` checks
   both and prints the notes). The `vendor/rakun` submodule has to be on a published rakun tag.
2. Merge the pull request into `master` and wait for the checks.
3. `git tag -a vX.Y.Z` on `master` and `git push origin vX.Y.Z`.

The release workflow refuses a tag whose commit is not in `master`, runs the checks, takes the published rakun tarball
of the submodule's version, builds the x64 AppImage and creates the GitHub release with it, its `.sha256` and the notes.

## How it works

The screens are **rakun's web**, the same interface its page serves, included here as the `vendor/rakun` git submodule.
Relic is its desktop host: it gives it the Electron window, quitting, starting rakun and the login in a window. A
change to a screen is made in the rakun repository, and Relic only moves the pointer of the submodule.

```
interface (React) ──IPC──> preload ──IPC──> main process ──HTTP 127.0.0.1──> rakun
```

rakun refuses requests that carry an `Origin` header, which is what a web page sends, so the **main process**
is the one that talks to rakun (the same way `rakunctl` does) and the interface asks it through a bridge.
The bridge only lets through a fixed list of rakun channels (`src/shared/channels.ts`); the interface cannot
ask for anything else, such as changing settings. The login is done by the main process (`rakun:login`):
the interface only says which store, and never sees the login code.

The interface never reads keys or buttons: the keyboard and the gamepad both become a small set of actions
(`src/renderer/input`), and only the layer on top (the grid, a sheet, a dialog) receives them.

## Español

Cliente de modo consola para rakun: la biblioteca de Epic, GOG, Amazon y Zoom a pantalla completa, para
manejar con mando (o teclado), pensado como acceso directo de Steam en modo juego o como ventana en el
escritorio. Los ajustes viven en rakun (`rakunctl config`); la interfaz va siempre en inglés. Select abre
el menú: Cuentas (inicia sesión en cada tienda en una ventana, sin copiar ni pegar, o la cierra), carpeta de
descarga, carpeta de Proton, key de SteamGridDB e idioma de descarga de rakun. Hace falta tener rakun arrancado.

## License

GPL-3.0-only. Relic descends from [Heroic Games Launcher](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher)
and from the previous Relic (branch `legacy`).
