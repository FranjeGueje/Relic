# Relic

[Español](README.es.md)

**Your game library, made for a gamepad.** Relic is a full-screen client for your Epic, GOG, Amazon and Zoom games: pick one, press install, and it lands in Steam. It is made for the Steam Deck's Game Mode, and it works as a normal window on any Linux desktop.

> **A new beginning.** Relic 1.0 is not an update of the Relic you may know (versions up to 0.6.x, the desktop launcher based on Heroic). It keeps the name but starts from zero: a console-style client that talks to [rakun](https://github.com/FranjeGueje/rakun/), the engine that does the store work. The old Relic is still here, untouched, in the [`legacy`](https://github.com/FranjeGueje/Relic/tree/legacy) branch, but it will not get new features.

## What you get

- **Your library** with covers, filtered by store or by installed, sorted either way
- **Install, update, repair and uninstall**, choosing the Windows or the Linux build when a game has both, or adopt a game that is already on your disk
- **A download queue** you can pause, resume and cancel
- **Login inside the app**: no browser, no copying codes
- **One file**: the AppImage carries rakun, so there is nothing else to install, and it stops when you quit
- **Coming from the old Relic**: on the first start it moves your settings, store sessions and installed games to rakun, and deletes `~/.config/relic` when done
- **No mess**: it leaves nothing in `~/.config`. The only files that stay are rakun's (your sessions, library and games) and the covers Relic has seen, in `~/.cache/relic/images` (at most 300 MB), so the library shows them offline
- **Mouse too**: every panel has a Close button, and the bar folds into a ☰ on narrow windows

Not here yet: categories, favourites, search.

## Automatic installation

One command installs it and adds it to Steam, with its artwork:

```bash
curl -sL https://raw.githubusercontent.com/FranjeGueje/Relic/master/scripts/install.sh | bash
```

It downloads the latest release to `~/.local/bin/Relic` (removing the old `relic.AppImage`, if any), checks its sha256 and offers to add it to Steam with its grids. Steam must be closed or restarted to show the artwork; the script offers to close it.

## Installation

Download the `.AppImage` from the [releases](https://github.com/FranjeGueje/Relic/releases), make it executable and run it:

```bash
chmod +x relic-*.AppImage
./relic-*.AppImage            # add --fullscreen for Game Mode
```

On a Steam Deck, add it to Steam as a non-Steam game. Log in to your stores from the menu (Select → Accounts); the first time, Relic offers to download the helper programs rakun needs.

No FUSE? Run it with `--appimage-extract-and-run`. If your system has user namespaces off, add `--no-sandbox`.

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

## Build it

You need Node 24 and pnpm.

```bash
git clone https://github.com/FranjeGueje/Relic.git && cd Relic
scripts/init-ui.sh     # the screens come from rakun's web, a git submodule
pnpm install
pnpm dev               # development; needs a rakun running (rakunctl start)
pnpm package           # dist/relic-<version>-x64.AppImage (about 100 MB)
```

`pnpm package` downloads the rakun release that matches the screens (checked against its `.sha256`); to use your own build, set `RAKUN_TARBALL=path/to/rakun-<version>-linux-x64.tar.gz`. `pnpm codecheck`, `pnpm lint`, `pnpm prettier` and `pnpm test` check the project.

## How it fits together

The screens are **rakun's web**, included as the `vendor/rakun` submodule; Relic adds the Electron window, quitting, starting rakun and the login window. A change to a screen is made in rakun, and Relic only moves the submodule pointer. Inside, the app talks to rakun over `127.0.0.1` from the main process, and the interface only gets a short, fixed list of channels. The details are in [AGENTS.md](AGENTS.md).

## Releases

GitHub Actions check every push and pull request. A release is a `vX.Y.Z` tag on `master`: bump `package.json`, add `## X.Y.Z — Title` to `CHANGELOG.md` (`scripts/release-notes.sh vX.Y.Z` checks it), merge into `master`, then `git tag -a vX.Y.Z && git push origin vX.Y.Z`. The workflow builds the AppImage with the published rakun and creates the release.

## License

GPL-3.0-only. Relic descends from [Heroic Games Launcher](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher) and from the previous Relic (branch `legacy`).
