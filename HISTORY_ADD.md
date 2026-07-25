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
| 2026-07-20 | `src/backend/relic/steamgrid/api.ts` | API client propio de SteamGridDB (searchGame, getGrids, getHeroes, getLogos, getIcons) — no modifica código Heroic |
| 2026-07-20 | `src/backend/relic/steamgrid/download.ts` | `downloadGrids(gameInfo, steamAppId)` — descarga 5 imágenes (header, portrait, hero, logo, icon) a `~/.steam/steam/userdata/*/config/grid/` |
| 2026-07-20 | `src/backend/relic/game_events.ts` | `downloadGrids` se ejecuta tras `addToSteam` exitoso. Lógica de grids delegada a `./steamgrid` |
| 2026-07-20 | `src/backend/relic/steamgrid/download.ts` | `downloadGrids` retorna `boolean` (true si descargó grids) |
| 2026-07-20 | `src/backend/relic/game_events.ts` | Notificación de escritorio cuando grids se descargan: "Restart Steam to see the grid images" |
| 2026-07-20 | `src/backend/relic/game_events.ts` | `onGameInstalled` abre `steam://gameproperties/{id}` al final (después de grids) |
| 2026-07-20 | `src/backend/relic/game_events.ts` | `onGameUninstalled` abre `steam://gameproperties/{id}` al principio (antes de borrar registro) |
| 2026-07-20 | `src/backend/relic/steamgrid/delete.ts` | Nuevo módulo `deleteGrids(steamAppId)` — elimina ficheros grid (5 tipos) de todos los usuarios Steam |
| 2026-07-20 | `src/backend/relic/game_events.ts` | `onGameUninstalled` llama `deleteGrids` para limpiar grid images tras desinstalar |
| 2026-07-20 | `src/backend/relic/steam_shortcuts/steam_helpers.ts` | `findExistingGameByName(gameName)` — busca en shortcuts.vdf por `${gameName}.bat` o `${gameName}` |
| 2026-07-20 | `src/backend/relic/steam_shortcuts/add_game.ts` | Check temprano en `addGameToSteam`: si el juego ya existe en Steam, devuelve el steamAppId existente sin abrir diálogo |
| 2026-07-20 | `src/backend/relic/steam_shortcuts/add_game.ts` | Rename `batPath` → `runnerPath` (variable, parámetros, return) |
| 2026-07-20 | `src/backend/relic/game_events.ts` | Rename `batPath` → `runnerPath` (variable, parámetro, argumento) |
| 2026-07-21 | `src/common/types.ts` | Añadido `protonPath: string` a `AppSettings` |
| 2026-07-21 | `src/backend/constants/paths.ts` | Añadido `steamCompatDir = ~/.local/share/Steam/compatibilitytools.d/` |
| 2026-07-21 | `src/backend/config.ts` | Añadida función `detectGeProton()` (auto-detecta GE-Proton en `steamCompatDir`) y default `protonPath: ''` |
| 2026-07-21 | `src/backend/relic/umu/store.ts` | Nuevo módulo: `getUmuStoreLabel()` mapea runner→label UMU (`epic`→`egs`, `gog`→`gog`, `nile`→`amazon`); `searchUmuGameId()` consulta API UMU |
| 2026-07-21 | `src/backend/relic/umu/launcher.ts` | Nuevo módulo: `launchUmu()` ejecuta `umu-run` con 4 env vars (GAMEID, STORE, WINEPREFIX, PROTONPATH) |
| 2026-07-21 | `src/backend/relic/umu/index.ts` | Barrel export de `launchUmu` y `searchUmuGameId` |
| 2026-07-21 | `src/backend/relic/prefix.ts` | `prepareUmuPrefix()` ahora async: busca GAMEID en API UMU, llama `launchUmu({ executable: 'exit' })` para crear prefijo |
| 2026-07-21 | `src/backend/relic/game_events.ts` | Llamada a `prepareUmuPrefix` actualizada: `await prepareUmuPrefix(input.gameInfo, input.installPath)` |
| 2026-07-21 | `src/backend/utils/compatibility_layers.ts` | `getUmuPath()` retorna `string | null`, busca PATH primero, luego bundleado en `publicDir/bin/umu/umu-run` |
| 2026-07-21 | `electron-builder.yml` | `linux.files` añadido glob `build/bin/umu/*` para incluir umu-launcher en AppImage |
| 2026-07-21 | `src/frontend/screens/Settings/components/ProtonPath.tsx` | Nuevo componente PathSelectionBox para seleccionar GE-Proton en Settings > General |
| 2026-07-21 | `pnpm-workspace.yaml` | `nodeLinker: hoisted` → `isolated` para evitar `Cannot find module` en ASAR; `overrides` y `patchedDependencies` movidos desde `package.json` |
| 2026-07-21 | `package.json` | `packageManager` actualizado a `pnpm@11.15.1`; dependencia directa `yocto-queue` añadida |
| 2026-07-21 | `pnpm-workspace.yaml` | Añadidos `onlyBuiltDependencies` y `allowBuilds` para builds de `@parcel/watcher`, `@swc/core`, `esbuild` |
| 2026-07-21 | `patches/@types__node@22.19.3.patch` | Renombrado a `@types__node@22.20.1.patch` y actualizado contenido |
| 2026-07-21 | `src/common/types.ts` | Eliminado `experimentalFeatures.zoomPlatform` — Zoom siempre activo |
| 2026-07-21 | `src/backend/config.ts` | Eliminada referencia a `experimentalFeatures.zoomPlatform` en defaults |
| 2026-07-21 | `src/backend/relic/umu/launcher.ts` | `UmuLaunchOptions.args?: string[]` para pasar flags al instalador (ej. `/VERYSILENT`) |
| 2026-07-21 | `src/backend/relic/umu/store.ts` | `umuStoreMap` añadido `zoom: 'zoom'` |
| 2026-07-21 | `src/backend/relic/steam_shortcuts/add_game.ts` | Caso `zoom` en `createRelicBat()`: genera .bat que lanza el ejecutable desde `c:\games\<basename>` |
| 2026-07-21 | `src/backend/storeManagers/zoom/games.ts` | `install()` reescrito para Windows: ejecuta `public/bin/zoom/zoom-platform.sh` con `PROTONPATH` como env var, elimina `.zoom-download/` tras instalación, llama `onGameInstalled()`, retorna error si no encuentra ejecutable. Reemplazo completo del módulo `zoom_installer/` por el script autónomo. |
| 2026-07-21 | `src/backend/relic/zoom_installer/` | **Eliminado** — reemplazado por `public/bin/zoom/zoom-platform.sh`. El script embebe su propio innoextract, maneja inf/regkeys/umu y monitoreo. |
| 2026-07-21 | `public/bin/x64/linux/innoextract` | **Eliminado** — el script llevaba su propio innoextract embebido como base64. |
| 2026-07-21 | `src/backend/constants/paths.ts` | **Eliminado** `innoextractPath` — ya no se necesita el binario externo. |
| 2026-07-21 | `electron-builder.yml` | Añadido `build/bin/zoom/*` a `linux.files` para incluir `zoom-platform.sh` en el AppImage. |
| 2026-07-22 | `package.json` | Script `start`: añadido `node node_modules/electron/install.js` antes de `electron-vite dev` — soluciona `Error: Electron uninstall` cuando el binario no se descarga en `pnpm install` (p.ej. reinstalaciones sin caché). |
| 2026-07-22 | `src/common/types.ts` | Runner `'sideload'` eliminado del type union (line 22) y `GameInfo.runner` (line 128) |
| 2026-07-22 | `src/common/types/electron_store.ts` | Key `sideloadedStore` eliminada del schema |
| 2026-07-22 | `src/common/types/ipc.ts` | `addNewApp` eliminado de `FrontendMessages` |
| 2026-07-22 | `src/common/utils.ts` | `sideload: undefined` eliminado de `storeMap` |
| 2026-07-22 | `src/frontend/types.ts` | `'sideload'` eliminado de `Category`, `sideloadedLibrary` de `ContextType`, `sideload` de `StoresFilters`, `sideloaded` del status interface |
| 2026-07-22 | `src/backend/relic/steam_shortcuts/types.ts` | `'sideload'` eliminado de `GameRunner` |
| 2026-07-22 | `src/backend/storeManagers/index.ts` | Import de `SideloadLibraryManager` y entrada `sideload` de `libraryManagerMap` eliminados |
| 2026-07-22 | `src/backend/main.ts` | Handler IPC `addNewApp` eliminado |
| 2026-07-22 | `src/backend/logger/constants.ts` | `LogPrefix.Sideload` y entrada en `RunnerToLogPrefixMap` eliminados |
| 2026-07-22 | `src/backend/relic/windowify.ts` | Entrada `sideload` de `STORE_CONFIGS` eliminada |
| 2026-07-22 | `src/backend/relic/umu/store.ts` | `sideload: undefined` de `umuStoreMap` eliminado |
| 2026-07-22 | `src/preload/api/library.ts` | Export `addNewApp` eliminado |
| 2026-07-22 | `src/frontend/helpers/electronStores.ts` | Instancia `sideloadLibrary` y su export eliminados |
| 2026-07-22 | `src/frontend/helpers/library.ts` | `sideloadedCategories` eliminado |
| 2026-07-22 | `src/frontend/state/ContextProvider.tsx` | `sideloadedLibrary: []` del default context eliminado |
| 2026-07-22 | `src/frontend/state/GlobalState.tsx` | Import `sideloadLibrary`, campo `sideloadedLibrary`, lecturas/guardas sideload eliminados |
| 2026-07-22 | `src/frontend/screens/Library/Library/index.tsx` | `sideloadedCategories` import, `sideloadedLibrary` destructure, filtro/merge sideload eliminados |
| 2026-07-22 | `src/frontend/screens/Library/Library/LibraryContext.tsx` | `sideload: true` de `initialContext` eliminado |
| 2026-07-22 | `src/frontend/screens/Library/LibraryHeader/index.tsx` | Check `runner !== 'sideload'` en filtro DLC eliminado |
| 2026-07-22 | `src/frontend/screens/Library/components/GameCard/index.tsx` | `isSideloaded` variable y guards eliminados |
| 2026-07-22 | `src/frontend/screens/Library/components/GamesList/index.tsx` | Guards `runner !== 'sideload'` eliminados |
| 2026-07-22 | `src/frontend/screens/Library/components/RecentlyPlayed/index.tsx` | `sideloadedLibrary` merge eliminado |
| 2026-07-22 | `src/frontend/screens/Game/GameContext.tsx` | `sideloaded: false` del default status eliminado |
| 2026-07-22 | `src/frontend/screens/Game/GamePage/index.tsx` | `isSideloaded` variable y guards `runner !== 'sideload'` eliminados |
| 2026-07-22 | `src/frontend/screens/Game/GamePage/InstalledInfo.tsx` | `isSideloaded` variable y 3 condicionales eliminados |
| 2026-07-22 | `src/frontend/screens/Game/GamePage/DownloadSizeInfo.tsx` | Early return `runner === 'sideload'` eliminado |
| 2026-07-22 | `src/frontend/screens/Game/GamePage/Description.tsx` | Guard `runner !== 'sideload'` y variable `runner` eliminados |
| 2026-07-22 | `src/frontend/screens/Game/GamePage/Developer.tsx` | Early return `runner === 'sideload'` eliminado |
| 2026-07-22 | `src/frontend/screens/Game/GameSubMenu/index.tsx` | `isSideloaded` variable y 4 condicionales eliminados |
| 2026-07-22 | `src/frontend/screens/ConsoleMode/index.tsx` | Sideload references en context, merge, filters, guards eliminados |
| 2026-07-22 | `src/frontend/screens/Game/InstallOverlay/index.tsx` | `isSideload` variable y condición simplificada |
| 2026-07-22 | `src/frontend/screens/DownloadManager/DownloadManagerItem/index.tsx` | Guard `newInfo.runner !== 'sideload'` eliminado |
| 2026-07-22 | `src/frontend/screens/Settings/components/AlternativeExe.tsx` | `runner === 'sideload'` del early return simplificado |
| 2026-07-22 | `src/frontend/components/UI/LibraryFilters/index.tsx` | Sideload entries en RunnerToStore, setStoreOnly, resetFilters, render eliminados |
| 2026-07-22 | `src/frontend/components/UI/LibrarySearchBar/index.tsx` | `sideloadedLibrary` merge eliminado |
| 2026-07-22 | `src/frontend/components/UI/UninstallModal/index.tsx` | Guard navegación sideload eliminado |
| 2026-07-22 | `src/frontend/hooks/hasStatus.ts` | Default `runner` cambiado de `'sideload'` a `'legendary'` |
| 2026-07-22 | `src/frontend/hooks/constants.ts` | Ternario `runner === 'sideload'` simplificado |
| 2026-07-22 | `src/frontend/screens/Library/LibraryHeader/index.css` | Clase `.sideloadGameButton` y hover/focus styles eliminados |
| 2026-07-22 | `src/frontend/screens/Game/InstallModal/index.scss` | Clases `.sideloadForm` y `.sideloadImportHint` eliminadas |
| 2026-07-22 | `public/locales/*/gamepage.json` | Bloque `sideload` completo eliminado de 51 archivos |
| 2026-07-22 | `public/locales/{ga,gl,lt,tr}/translation.json` | `console.filter.sideload` eliminado (4 archivos) |
| 2026-07-22 | `src/backend/storeManagers/sideload/` | Directorio eliminado (3 archivos: `electronStores.ts`, `library.ts`, `games.ts`) |
| 2026-07-22 | `src/frontend/components/UI/EditGameDialog/` | Directorio eliminado (2 archivos: `index.tsx`, `index.css`) |
| 2026-07-22 | `src/frontend/screens/Library/components/EmptyLibrary/` | `index.css` eliminado (componente ya eliminado en Fase 3) |
| 2026-07-22 | `src/backend/relic/game_events.ts` | `createRunnerFile` movido a `add_game.ts`; `preparePrefix` movido a `prefix.ts`; `validateGameInput` + `GameInput` eliminados; `refreshInstallPath` añadido |
| 2026-07-22 | `src/backend/relic/steam_shortcuts/add_game.ts` | `createRunnerFile` añadido (move desde `game_events.ts`) |
| 2026-07-22 | `src/backend/relic/prefix.ts` | `preparePrefix` añadido (move desde `game_events.ts`); `preparePrefix` fundido dentro de `prepareUmuPrefix` |
| 2026-07-22 | `src/backend/relic/steam_shortcuts/steam_helpers.ts` | Funciones reordenadas y agrupadas por responsabilidad |
| 2026-07-22 | `src/backend/relic/steamgrid/download.ts` | `downloadGrids` movido al inicio del archivo |
| 2026-07-22 | `src/backend/relic/windowify.ts` | Funciones reordenadas: `// Public API` → `// Private helpers` |
| 2026-07-22 | `package.json` | Añadido `desktopName: "Relic"` para que electron-builder use `WM_CLASS` correcto |
| 2026-07-22 | `electron-builder.yml` | Añadido `syncDesktopName: true` a sección `linux` |
| 2026-07-22 | `src/backend/relic/windowify.ts` | `createGameSymlink(gameInfo, installPath)` y `windowify(gameInfo, installPath)` — reciben `installPath` como parámetro en vez de leer `gameInfo.install.install_path` (vacío para Legendary/Nile) |
| 2026-07-22 | `src/backend/relic/prefix.ts` | `preparePrefix` pasa `installPath` a `windowify(gameInfo, installPath)` |
| 2026-07-23 | `src/common/types/ipc.ts` | Añadido `installCompleted` a `FrontendMessages` |
| 2026-07-23 | `src/preload/api/misc.ts` | Añadido `handleInstallCompleted` listener |
| 2026-07-23 | `src/backend/relic/game_events.ts` | Reemplazado `notify()` por `sendFrontendMessage('installCompleted', ...)` (notificación contextual en vez de system notification) |
| 2026-07-23 | `src/frontend/relic/dialogs/useInstallSuccess.ts` | **Nuevo** Hook que escucha IPC `installCompleted`, gestiona estado y auto-dismiss 4s |
| 2026-07-23 | `src/frontend/relic/dialogs/InstallSuccessOverlay/index.tsx` | **Nuevo** Overlay de éxito estilo consola (gamepad, auto-dismiss, clases `consoleLaunchOverlay/consoleModal`) |
| 2026-07-23 | `src/frontend/relic/dialogs/InstallSuccessOverlay/index.scss` | **Nuevo** Estilos overlay (animación fade, body, botones) |
| 2026-07-23 | `src/frontend/App.tsx` | Integración del hook `useInstallSuccess`: en modo consola renderiza `<InstallSuccessOverlay>`, en modo GUI llama `showDialogModal()` |
| 2026-07-23 | `src/backend/storeManagers/gog/constants.ts` | Fix `gogdlConfigPath`: `relic_gogdl` → `heroic_gogdl`. El binario gogdl tiene `heroic_gogdl` hardcodeado; Relic apuntaba a `relic_gogdl` que está vacío → limpieza de manifiestos no funcionaba, instalaciones fallaban con "Nothing to do" |
| 2026-07-23 | `src/common/types/gog.ts` | Añadido `folder_name: string` a `GogInstallInfo` (antes solo en `GOGDLInstallInfo`) |
| 2026-07-23 | `src/backend/storeManagers/gog/library.ts` | Incluido `folder_name` en los dos objetos `GogInstallInfo` retornados (principal y fallback) |
| 2026-07-23 | `src/backend/storeManagers/gog/games.ts` | Fix `post-install: usa `installInfo.folder_name` en vez de `gameInfo.folder_name`. El cache de `getInstallInfo()` no actualiza el library Map en hits → `folder_name` quedaba vacío tras descarga exitosa |
| 2026-07-25 | `src/common/types/ipc.ts` | Eliminado `installCompleted` de `FrontendMessages` |
| 2026-07-25 | `src/preload/api/misc.ts` | Eliminado `handleInstallCompleted` listener |
| 2026-07-25 | `src/frontend/App.tsx` | Eliminados `useInstallSuccess`, `InstallSuccessOverlay`, hook, useEffect, y dependencia `showDialogModal` |
| 2026-07-25 | `src/frontend/relic/dialogs/useInstallSuccess.ts` | **Eliminado** — hook IPC `installCompleted` |
| 2026-07-25 | `src/frontend/relic/dialogs/InstallSuccessOverlay/` | **Eliminado** — overlay de éxito con auto-dismiss |
| 2026-07-25 | `src/frontend/relic/dialogs/` | **Eliminado** — directorio vacío |
| 2026-07-25 | `src/backend/relic/game_events.ts` | Eliminado `import { sendFrontendMessage }` |
| 2026-07-25 | `src/backend/relic/game_events.ts` | `onGameImported()` ahora delega en `onGameInstalled()` (flujo completo: runner file, Steam, prefix, grids) |
| 2026-07-25 | `src/backend/relic/game_events.ts` | `onGameMoved()` ahora mueve el symlink en `relicGamesPath` y actualiza `installPath` en `steam_shortcuts.json` |
| 2026-07-25 | `src/backend/relic/steam_shortcuts/__tests__/game_events.test.ts` | Tests actualizados: `onGameImported` verifica delegación a `onGameInstalled`; `onGameMoved` verifica symlink move + shortcut update |
| 2026-07-25 | `src/backend/relic/steam_shortcuts/add_game.ts` | `createGameSymlink(installPath)` — nuevo export público: crea symlink en `relicGamesPath/<basename>` → `installPath`. Borra symlink existente antes de recrear. |
| 2026-07-25 | `src/backend/relic/steam_shortcuts/index.ts` | Exporta `createGameSymlink` |
| 2026-07-25 | `src/backend/relic/windowify.ts` | Importa `createGameSymlink` desde `add_game.ts`. Eliminada función privada duplicada. |
| 2026-07-25 | `src/backend/relic/game_events.ts` | `onGameInstalled()` bifurca en `gameInfo.is_linux_native`: flujo Linux nativo omite `.bat`, `windowify` y `prepareUmuPrefix`, crea symlink y usa `start.sh` directamente. |
| 2026-07-25 | `src/backend/relic/steam_shortcuts/__tests__/game_events.test.ts` | Añadido `createGameSymlink: jest.fn()` al mock de `add_game` |
| 2026-07-25 | `src/backend/relic/__tests__/symlinks.test.ts` | Añadido mock de `createGameSymlink` para evitar cargar `add_game.ts` (importa `backend/utils`) |
| 2026-07-25 | `src/frontend/screens/ConsoleMode/index.tsx` | Botón "Opciones" cambia a `t('console.more', 'More')`. Botón A-Z movido dentro de `consoleLogoRow` (junto al icono y "Más"). `consoleTopRight` solo contiene "Salir". |
| 2026-07-25 | `src/frontend/screens/ConsoleMode/index.scss` | Sin cambios de estilo (`.consoleLogoRow` con `gap: 10px` admite el botón A-Z). |
| 2026-07-25 | `public/locales/*/translation.json` | Añadida clave `console.more` con traducción en 47 idiomas. |
| 2026-07-25 | `src/backend/relic/game_events.ts` | `onGameMoved()` eliminado `existsSync` antes de `unlinkSync` (fallaba con symlinks rotos tras mover juego). |
| 2026-07-25 | `AGENTS.md` | Eliminada línea "Añadir juegos manualmente (Sideload)" de la sección Alcance (Sideload eliminado en v0.2.1). |
