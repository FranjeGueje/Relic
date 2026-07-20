# HISTORY.md

Relic es un fork de Heroic Game Launcher. Este archivo documenta todos los cambios
aplicados sobre Heroic para adaptarlo a la filosofía y objetivos de Relic.

Los cambios se dividen en dos categorías:
- **Eliminaciones**: código de Heroic que no pertenece a Relic.
- **Adiciones/modificaciones**: código nuevo o adaptado para Relic.

Para ver el detalle completo de cada categoría, consultar:
- `HISTORY_REMOVE.md` — eliminaciones exhaustivas.
- `HISTORY_ADD.md` — adiciones y modificaciones exhaustivas.

---

## Eliminaciones (resumen)

### Fase 5 — Refactorización profunda

#### Flujo de lanzamiento de juegos
- Eliminado todo el flujo de lanzamiento: `prepareLaunch`, `launch()`, `getLaunchOptions()` de todos los store managers.
- Eliminados IPC handlers y preload de lanzamiento.
- Eliminados scripts pre/post lanzamiento, UMU disable.

#### Wine/Proton (eliminación completa)
- `src/backend/wine/` completo (manager, runtimes, manager/UI).
- Componentes frontend de Wine/Proton: WineVersionSelector, WinePrefix, CustomWineProton, etc.
- DXVK, VKD3D, DXMT, Winetricks, EAC/BattlEye runtime.
- Lutris, CrossOver, GE-Proton, Proton-CachyOS.
- Settings de Wine/Proton (Esync, Fsync, FSR, WoW64, Wayland, etc.).

#### Settings sin UI ni utilidad
- MinimizeOnLaunch, DisableController, DisableAnimations, DisableLogs, DownloadNoHTTPS.
- DarkTrayIcon (siempre light), FramelessWindow (siempre con marco), StartInTray.
- DisablePlaytimeSync (vivo backend sin UI), disableSmoothScrolling.

#### Plataformas no Linux
- macOS: Rosetta, isMac, isIntelMac, AppleGamingWiki, CrossoverBottle, AdvertiseAvxForRosetta.
- Windows: build config, scripts, PowerShell, VCRedist, moveOnWindows, todo el código `isWindows`.

#### Comunidad y analytics
- Discord RPC, Ko-fi, Plausible Analytics, GitHub releases/updater.
- Start Tour, Accessibility screen.

#### Características UI eliminadas
- Stores (Epic/GOG/Amazon/Zoom como webview), Deals/Discounts.
- Add Game (SideloadDialog), System Information, Sync Saves.
- Log upload, Changelog modal, Settings modal, Log modal.
- GamePage: Scores (HLTB/PCGamingWiki), Anticheat, CompatibilityInfo, Playtime.
- GameCard: PLAY button, Launch option, Settings/Logs context menu items.
- GameSubMenu: Edit Game, Add Shortcut, Change Install, Add to Steam, Browse Prefix, Categories.
- ExtraGameInfo (WikiGameInfo): PCGamingWiki, HLTB, ProtonDB, SteamDeck, GamesDB, UMU.
- EOS Overlay completo.

#### Otras eliminaciones
- Flatpak/Flathub, E2E tests, GitHub workflows.
- Ko-fi, Discord references, Plausible analytics.
- Windows/macOS systeminfo modules.
- Heroic→Relic rebranding (identificadores, URLs, assets, config paths).
- Limpieza de traducciones (94 archivos).

---

## Adiciones y modificaciones (resumen)

### v0.2.0

#### Convenciones y estructura
- `AGENTS.md`: sección "Estructura del código" — código nuevo en subdirectorios `relic/`.
- Código específico de Relic en `src/backend/relic/`, `src/frontend/relic/`, `src/common/relic/`.
- Modificaciones a archivos Heroic se documentan en `HISTORY_ADD.md`.

#### Integración con Steam
- Nuevo módulo `src/backend/relic/steam_shortcuts/`: `addGameToSteam()` mediante `steam://addnonsteamgame`.
- `steam_shortcuts.json` guarda gameName, appId, store, steamAppId, installPath, execPath.
- Eliminado toggle "Add games to Steam automatically" — siempre se añade tras instalar.
- Eliminados IPC handlers `addToSteam`, `removeFromSteam`, `isAddedToSteam`.
- `onGameInstalled()` / `onGameUninstalled()` en todos los store managers.
- `findExistingGameByName()` busca en shortcuts.vdf por `${gameName}.bat` o `${gameName}`. Check temprano en `addGameToSteam` evita diálogos duplicados.
- Rename `batPath` → `runnerPath` en todo el módulo.

#### Eventos de instalación
- `src/backend/relic/game_events.ts`: orquestador que crea .bat, añade a Steam y guarda en store.
- Todos los runners (legendary, gog, nile, zoom, sideload) llaman `onGameInstalled()`/`onGameUninstalled()`.
- Añadidos `onGameImported()` y `onGameMoved()` como stubs (solo log).
- `importGame()` en legendary/gog/nile usa `onGameImported()` en vez de `onGameInstalled()`.
- `moveInstall()` en legendary/gog/nile llama `onGameMoved()` tras mover el juego.
- Fix: Legendary installPath vacío — se llama `refreshInstalled?.()` antes de leer datos instalados.
- Refactor `onGameInstalled()` en 6 helpers privados: `validateGameInput()`, `createRunnerFile()`, `addToSteam()`, `windowify()`, `prepareUmuPrefix()`, `downloadGrids()`.
- Eliminado `forceRefreshInstallPath()` — lógica inline en `validateGameInput()`.
- `onGameInstalled` abre `steam://gameproperties/{id}` al final. `onGameUninstalled` abre `steam://gameproperties/{id}` al principio.

#### Robustez
- Protegidos todos los `JSON.parse()` contra stdout vacío en legendary, nile y gog library/user.
- Corregido log prefix en IPC handler `getInstallInfo` (Nile se logueaba como GOG).
- Tests unitarios para stdout vacío en los 3 store managers (8 tests).

#### Windowify
- Nuevo módulo `src/backend/relic/windowify.ts`: transforma paths de instalación de Linux a Windows (`c:\games\<title>`).
- `symlinkStoreFiles()` symlinkea todos los ficheros del directorio de config de cada tienda al mount (reemplaza antigua copia solo de installed.json).
- `syncGogdlConfig()` symlinkea `gogdlConfigPath` → `mount/gogdl/` y `mount/heroic_gogdl/`.
- `createGameSymlink()` crea symlink en `~/.local/share/relic/games/<title>` → `<installPath>`.
- `createRelicSymlinks()` migrado desde `symlinks.ts` (eliminado).
- `copyAndTransformInstalled()` lee installed.json de la tienda, transforma paths a Windows y escribe en mount.
- Fix legendary transform: ahora maneja formato object (keyed por app_name), no solo array.
- Eliminadas `copyGogAuth()` y `copyGogConfig()` — reemplazadas por `symlinkStoreFiles()`.
- Añadido `relicGamesPath` a constants/paths.ts.
- Fix TS2304 en `store.ts`: añadido `GameRunner` al import.

#### Mount bin sync
- `syncMountBin()` en `windowify.ts`: al arrancar compara md5 de `public/bin/x64/win32/` contra `mount/bin/` y copia si falta o difiere.
- Llamada desde `main.ts` una sola vez al arrancar (`app.whenReady()`).
- `electron-builder.yml`: `linux.files` usa glob `build/bin/x64/win32/*` para incluir los 6 exe en el AppImage (antes solo incluía 2).

#### Runner GOG
- Fix ruta en .bat: `installPath` se transforma a `c:\games\<basename>` en vez de usar ruta Linux directamente.
- Eliminado guard `if (existsSync(runnerPath)) return` — el .bat se regenera siempre con el contenido correcto.

#### Prefijos
- Nuevo módulo `src/backend/relic/prefix.ts` con `preparePrefix(steamAppId)` y `prepareUmuPrefix()`.
- `preparePrefix()` crea `compatdata/{id}/pfx/drive_c` en Steam y copia `mount/` y `games/` al prefijo.
- `prepareUmuPrefix` movida desde `game_events.ts` (stub).
- `onGameInstalled` llama a `preparePrefix()` solo si `addToSteam` tuvo éxito.
- `onGameUninstalled` borra symlink usando `installPath` del JSON store. Usa `unlinkSync` directo (no `existsSync` que sigue symlinks y falla con enlaces rotos).

#### SteamGridDB
- Nuevo módulo `src/backend/relic/steamgrid/` — API client propio de SteamGridDB (no modifica código Heroic).
- `api.ts`: searchGame, getGrids, getHeroes, getLogos, getIcons.
- `download.ts`: `downloadGrids(gameInfo, steamAppId)` descarga 5 imágenes (header, portrait, hero, logo, icon) a `~/.steam/steam/userdata/*/config/grid/`.
- `game_events.ts` llama a `downloadGrids` tras `addToSteam` exitoso. Toda la lógica de grids delegada al módulo `steamgrid`.
- `downloadGrids` retorna `boolean`. Notificación de escritorio tras descarga exitosa.
- `deleteGrids(steamAppId)` elimina los 5 ficheros grid de todos los usuarios Steam. Se llama en `onGameUninstalled`.

#### Tests
- 35 tests en módulos relic (steam_helpers, add_game, game_events, symlinks, windowify).
- 8 tests en store managers (empty stdout handling).
- Total: 90 tests (85 pasan, 5 preexistentes fallan por plataforma Linux).
