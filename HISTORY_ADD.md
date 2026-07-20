# HISTORY_ADD.md

Este archivo registra cada funcionalidad nueva o modificación respecto a Heroic
que se añada a Relic.

El objetivo es mantener trazabilidad de los cambios respecto al padre.

---

## v0.2.0

| Fecha | Archivo | Cambio |
|---|---|---|
| 2026-07-17 | `AGENTS.md` | Añadida sección "Estructura del código": convención de subdirectorios `relic/` para código nuevo |
| 2026-07-17 | `AGENTS.md` | Añadido Zoom Platform y Sideload al Alcance |
| 2026-07-17 | `AGENTS.md` | Aclarado que Relic es Linux-only (sin macOS ni Windows) |
| 2026-07-17 | `AGENTS.md` | Añadida mención de ConsoleMode en Interfaz |
| 2026-07-17 | `AGENTS.md` | Actualizada sección Historial con referencias a HISTORY_REMOVE.md y HISTORY_ADD.md |
| 2026-07-17 | `package.json` | Version bump 0.1.0 → 0.2.0 |
| 2026-07-17 | `package.json` | Eliminados scripts `release:mac` y `release:linux` (Linux-only) |
| 2026-07-17 | `src/backend/logger/constants.ts` | Añadido LogPrefix.Relic para logs de módulos nuevos |
| 2026-07-17 | `src/backend/relic/steam_shortcuts/` | Nuevo módulo `addGameToSteam()` que usa protocolo `steam://addnonsteamgame` |
| 2026-07-17 | `src/frontend/screens/Settings/components/Shortcuts.tsx` | Eliminado toggle "Add games to Steam automatically". Siempre se añade a Steam tras instalar. |
| 2026-07-17 | `src/frontend/screens/Settings/sections/GeneralSettings/index.tsx` | Eliminado `<Shortcuts />` del render |
| 2026-07-17 | `src/backend/shortcuts/shortcuts/shortcuts.ts` | Eliminada llamada a `addGameToSteam()` de `addShortcuts()`. Ya no añade a Steam (Responsabilidad de Relic). |
| 2026-07-17 | `src/backend/shortcuts/ipc_handler.ts` | Eliminados handlers `addToSteam`, `removeFromSteam`, `isAddedToSteam` (no es objetivo de Relic) |
| 2026-07-17 | `src/preload/api/menu.ts` | Eliminados `removeFromSteam`, `addToSteam`, `isAddedToSteam` IPC invokers |
| 2026-07-17 | `src/common/types/ipc.ts` | Eliminadas definiciones de tipo `addToSteam`, `removeFromSteam`, `isAddedToSteam` |
| 2026-07-17 | `src/common/types.ts` | `addSteamShortcuts` queda como dead code (no se elimina) |
| 2026-07-17 | `src/backend/relic/steam_shortcuts/types.ts` | Eliminados `runner` y `appName` de `AddGameToSteamOptions` |
| 2026-07-17 | `src/backend/relic/steam_shortcuts/add_game.ts` | Simplificado polling: usa solo búsqueda por AppName, eliminado diff de `appid` |
| 2026-07-17 | `src/backend/relic/steam_shortcuts/steam_helpers.ts` | `LogPrefix.Relic` → `'Relic'` como string para evitar dependencia circular |
| 2026-07-17 | `src/backend/relic/steam_shortcuts/steam_helpers.ts` | `getShortcutId()` maneja `appid: false` (autoConvertBooleans) retornando 0 |
| 2026-07-17 | `src/backend/__mocks__/electron.ts` | Añadido `shell.openExternal` mock |
| 2026-07-17 | `src/backend/relic/steam_shortcuts/__tests__/` | Tests para `steam_helpers` (7 tests), `addGameToSteam` (5 tests), `game_events` (4 tests) |
| 2026-07-17 | `src/backend/relic/game_events.ts` | Nuevo módulo `onGameInstalled()` y `onGameUninstalled()`. Entry points de Relic para eventos de instalación. |
| 2026-07-17 | `src/backend/storeManagers/legendary/games.ts` | Añadido `onGameInstalled()` tras install/import; `removeNonSteamGame()` → `onGameUninstalled()` |
| 2026-07-17 | `src/backend/storeManagers/gog/games.ts` | Añadido `onGameInstalled()` tras install/import (con `install_path` fresco); `removeNonSteamGame()` → `onGameUninstalled()` |
| 2026-07-17 | `src/backend/storeManagers/nile/games.ts` | Añadido `onGameInstalled()` tras install/import; `removeNonSteamGame()` → `onGameUninstalled()` |
| 2026-07-17 | `src/backend/storeManagers/zoom/games.ts` | `removeNonSteamGame()` → `onGameUninstalled()` |
| 2026-07-17 | `src/backend/storeManagers/sideload/games.ts` | `removeNonSteamGame()` → `onGameUninstalled()` |
| 2026-07-17 | `src/backend/storeManagers/sideload/library.ts` | Añadido `onGameInstalled()` al añadir juego manual |
| 2026-07-17 | `src/backend/storeManagers/legendary/library.ts` | Protegido `JSON.parse(res.stdout)` contra stdout vacío con retry (3 reintentos) |
| 2026-07-17 | `src/backend/storeManagers/nile/library.ts` | Protegido `JSON.parse(output)` contra stdout vacío con error descriptivo |
| 2026-07-17 | `src/backend/storeManagers/nile/user.ts` | Protegido `JSON.parse(stdout)` contra stdout vacío con error descriptivo |
| 2026-07-17 | `src/backend/storeManagers/gog/library.ts` | Mejorado check de stdout vacío (usa `res.stdout?.trim()` y mensaje más claro) |
| 2026-07-17 | `src/backend/main.ts` | Corregido log prefix en IPC handler `getInstallInfo`: ahora distingue legendary, nile y gog (antes Nile se logueaba como GOG) |
| 2026-07-17 | `src/backend/storeManagers/legendary/__tests__/getInstallInfo.test.ts` | Tests para stdout vacío (retry + valid response) |
| 2026-07-17 | `src/backend/storeManagers/nile/__tests__/getInstallInfo.test.ts` | Tests para stdout vacío en getInstallInfo |
| 2026-07-17 | `src/backend/storeManagers/nile/__tests__/user.test.ts` | Tests para stdout vacío en getLoginData |
| 2026-07-17 | `src/backend/storeManagers/gog/__tests__/getInstallInfo.test.ts` | Tests para stdout vacío en getInstallInfo |
| 2026-07-17 | `src/backend/relic/steam_shortcuts/types.ts` | `SteamShortcut`: +`gameName`, +`store`, `batPath`→`execPath` |
| 2026-07-17 | `src/backend/relic/steam_shortcuts/store.ts` | `addShortcut(gameName, appId, store, steamAppId, installPath, execPath)` — nuevo orden de campos |
| 2026-07-17 | `src/backend/relic/game_events.ts` | `onGameInstalled()` pasa `gameInfo.title` y `gameInfo.runner` a `addShortcut`; `onGameUninstalled()` lee `known.execPath` |
| 2026-07-17 | `src/backend/relic/game_events.ts` | Fix Legendary installPath vacío: llama `refreshInstalled?.()` antes de `getGameInfo(appName, true)` para refrescar datos instalados desde disco |
| 2026-07-19 | `src/backend/relic/game_events.ts` | Añadidos `onGameImported()` y `onGameMoved()` como stubs (solo log) |
| 2026-07-19 | `src/backend/storeManagers/legendary/games.ts` | `importGame()` usa `onGameImported()` en vez de `onGameInstalled()`; `moveInstall()` llama `onGameMoved()` |
| 2026-07-19 | `src/backend/storeManagers/gog/games.ts` | `importGame()` usa `onGameImported()` en vez de `onGameInstalled()`; `moveInstall()` llama `onGameMoved()` |
| 2026-07-19 | `src/backend/storeManagers/nile/games.ts` | `importGame()` usa `onGameImported()` en vez de `onGameInstalled()`; `moveInstall()` llama `onGameMoved()` |
| 2026-07-19 | `src/backend/storeManagers/sideload/library.ts` | `addGame()` usa `onGameImported()` en vez de `onGameInstalled()` |
| 2026-07-19 | `src/backend/relic/steam_shortcuts/__tests__/game_events.test.ts` | Tests para `onGameImported` y `onGameMoved` |
| 2026-07-19 | `src/backend/relic/game_events.ts` | Refactor `onGameInstalled()` en helpers privados: `validateGameInput()`, `createRunnerFile()`, `addToSteam()`, `windowify()`, `prepareUmuPrefix()`, `downloadGrids()`. Eliminado `forceRefreshInstallPath()` (inline en `validateGameInput`). |
| 2026-07-19 | `src/backend/relic/steam_shortcuts/store.ts` | Fix TS2304: añadido `GameRunner` al import de `./types` |
| 2026-07-19 | `src/backend/constants/paths.ts` | Añadido `relicGamesPath = ~/.local/share/relic/games/` |
| 2026-07-19 | `src/backend/relic/windowify.ts` | Nuevo módulo: `windowify()` copia config de la tienda al mount y transforma paths Linux→Windows; `createGameSymlink()` crea symlink en `games/<title>` → `installPath`; `copyAndTransformInstalled()` lee/transforma/escribe installed.json |
| 2026-07-19 | `AGENTS.md` | Añadida sección "Módulo `relic`": entry points, helpers, reglas de tipado estricto |
| 2026-07-19 | `src/backend/relic/windowify.ts` | Copia/transforma installed.json para cada tienda + symlinks de todos los ficheros de config |
| 2026-07-19 | `src/backend/relic/windowify.ts` | Movido `createRelicSymlinks()` desde `symlinks.ts` |
| 2026-07-19 | `src/backend/relic/symlinks.ts` | Eliminado — contenido fusionado en `windowify.ts` |
| 2026-07-19 | `src/backend/relic/__tests__/symlinks.test.ts` | Actualizado import de `../symlinks` → `../windowify`; añadidos mocks de store constants y environment |
| 2026-07-19 | `src/backend/relic/windowify.ts` | `symlinkStoreFiles()` — symlinkea todos los ficheros/dirs de un directorio fuente al mount (reemplaza copyGogAuth, copyGogConfig) |
| 2026-07-19 | `src/backend/relic/windowify.ts` | `syncGogdlConfig()` — symlinkea `gogdlConfigPath` → `mount/gogdl/` y `mount/heroic_gogdl/` |
| 2026-07-19 | `src/backend/relic/windowify.ts` | Fix legendary transform: ahora itera `Object.entries()` en vez de `Array.isArray()` (installed.json de legendary es object, no array) |
| 2026-07-19 | `src/backend/relic/windowify.ts` | Eliminadas `copyGogAuth()` y `copyGogConfig()` — reemplazadas por `symlinkStoreFiles()` |
| 2026-07-19 | `src/backend/relic/windowify.ts` | `STORE_CONFIGS` añadido campo `configDir` para symlinkear todos los ficheros de config antes de transformar installed.json |
| 2026-07-20 | `src/backend/relic/windowify.ts` | `syncMountBin()` — al arrancar compara md5 de `public/bin/x64/win32/` contra `mount/bin/` y copia si falta o difiere |
| 2026-07-20 | `src/backend/main.ts` | Llamada a `syncMountBin()` al arrancar tras `initLogger()` |
| 2026-07-20 | `electron-builder.yml` | `linux.files` usa glob `build/bin/x64/win32/*` en vez de listar solo 2 exe (incluye los 6 exe en el AppImage) |
| 2026-07-20 | `src/backend/relic/steam_shortcuts/add_game.ts` | Fix ruta GOG en .bat: `installPath` se transforma a `c:\games\<basename>` en vez de usar ruta Linux directamente |
| 2026-07-20 | `src/backend/relic/steam_shortcuts/add_game.ts` | Eliminado guard `if (existsSync(batPath)) return` — el .bat se regenera siempre con el contenido correcto |
| 2026-07-20 | `src/backend/relic/prefix.ts` | `preparePrefix(steamAppId)` — crea directorio `compatdata/{id}/pfx/drive_c` en Steam y symlink `mount/` y `games/` al prefijo |
| 2026-07-20 | `src/backend/relic/game_events.ts` | Llamada a `preparePrefix(result.steamAppId)` con guard (solo si `addToSteam` tuvo éxito) |
| 2026-07-20 | `src/backend/relic/game_events.ts` | `onGameUninstalled` borra symlink usando `installPath` del JSON store (no `gameInfo.install.install_path` que Legendary/GOG ya vaciaron). Usa `unlinkSync` directo en try/catch (no `existsSync` que sigue symlinks). |
| 2026-07-20 | `src/backend/relic/windowify.ts` | `createGameSymlink` usa `basename(installPath)` en vez de `gameInfo.title` para el nombre del symlink |
