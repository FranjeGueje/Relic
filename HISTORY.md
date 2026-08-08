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

---

### v0.2.0 — UMU (Jul 2026)

#### Módulo relic/umu

- Nuevo módulo `src/backend/relic/umu/` con 3 archivos: `store.ts` (mapeo store → label UMU + lookup API), `launcher.ts` (ejecuta `umu-run` con 4 env vars), `index.ts` (barrel).
- `prepareUmuPrefix()` en `prefix.ts` ahora async: busca GAMEID en API de UMU, luego ejecuta `umu-run exit` para crear prefijo.
- `game_events.ts`: llamada actualizada con `await` y `installPath`.

#### Detección y configuración de GE-Proton

- `config.ts`: nueva función `detectGeProton()` y `protonPath` en defaults (auto-detecta desde `~/.local/share/Steam/compatibilitytools.d/` en primer arranque).
- `AppSettings`: añadido `protonPath: string`.
- `constants/paths.ts`: añadido `steamCompatDir`.
- `compatibility_layers.ts`: `getUmuPath()` retorna `string | null` — busca PATH primero, luego bundleado en `publicDir/bin/umu/umu-run`.
- `electron-builder.yml`: añadido `build/bin/umu/*` a `linux.files`.

#### Frontend

- `ProtonPath.tsx`: PathSelectionBox para seleccionar GE-Proton en Settings > General.

#### Cleanup

- Eliminados imports de `isUmuSupported` en 4 store managers (dead code).
- Eliminados `defaultUmuPath` y `runtimePath` de `paths.ts`.
- Eliminado `umuSupport` de `ExperimentalFeatures`.
- Eliminado duplicado de `logError` en close handler de `launcher.ts`.
- `prefix.ts` usa `logInfo` en vez de `logError` para fallos de UMU.

#### Tests

- 95 tests (95 pasan, 0 preexistentes fallan).
- Eliminados tests `getShell for windows/mac` (función simplificada a Linux-only), test `shows no icon if noTrayIcon setting` (no existe `setConfigValue`), simplificado test `limits number games` (usa 3 juegos en vez de `maxRecentGames`).
- `launcher.test.ts`: quitada aserción de `logError` en close handler (assertions 3→2).
- `symlinks.test.ts`: eliminado `defaultUmuPath` del mock.

---

### v0.2.0 — UPGRADE-MINIMAL (Jul 2026)

#### Build fix

- Añadidas `@emotion/react` y `@emotion/styled` como dependencias explícitas (peer deps de MUI que causaban el error de build en Vite).

#### Paquetes deprecated eliminados

- `ts-prune` (deprecated), `unimported` (deprecated), `@types/react-router-dom` (obsoleto, v6 trae tipos propios).
- Eliminados configs `.ts-prunerc`, `.unimportedrc.json`, script `find-deadcode`.

#### CVEs

- `i18next-fs-backend` 2.6.0 → 2.6.6 (critical, prototype pollution).
- `undici` 7.24.0 → 7.28.0 (high, multiple vulns).
- `shell-quote` y `cross-spawn` transitivos protegidos vía overrides de pnpm.
- `simple-git` critical eliminado al remover `unimported`.
- 3 criticals → 1 residual (`node-tar` del ecosistema `node-gyp`, build-time, aceptado).

#### Toolchain modernizada

- `engines.node`: `>=22` → `>=24`.
- `shell.nix`: `nodejs_22` → `nodejs_24`.
- Esbuild: `--target=node21` → `--target=node24`.
- `.npmrc` eliminado, `nodeLinker: hoisted` movido a `pnpm-workspace.yaml`.
- `husky` 8 → 9, `prepare` script actualizado.
- `jest.config.js`: `globals` deprecated → `transform` config.
- Build compila sin errores de emotion.

---

### v0.2.0 — FIX_VULNERA (Jul 2026)

#### Resumen

- Reducción de 130 vulnerabilidades a 0.
- Se eliminaron: 2 críticas, 63 high, 58 moderate, 7 low → 0 total.

#### Electron 43

- Bump de electron 41.9.0 → 43.1.1 (elimina 32 CVEs high del runtime de Electron).

#### CVEs críticas eliminadas

- `node-tar` (CRITICAL) via `tar@6.2.1`/`tar@7.5.9` → override pnpm a `>=7.5.19`.
- `simple-git` (CRITICAL) vía `unimported` → eliminado en UPGRADE-MINIMAL.
- `shell-quote` (CRITICAL, UPGRADE-MINIMAL): override a `>=1.8.4`.
- `i18next-fs-backend` (CRITICAL): 2.6.0 → 2.6.6 (UPGRADE-MINIMAL).

#### CVEs altas eliminadas

- `axios`: update a última 1.x.
- `fast-xml-parser`: update a última 5.x.
- `vite`: añadido como devDep a 6.4.3 (elimina 2 highs).
- `uuid`: override pnpm a `^11.0.0`.
- `cross-spawn` (UPGRADE-MINIMAL): override a `>=6.0.6`.

#### Dependencias deprecated

- `@fortawesome/react-fontawesome` 0.2.x → ^3.
- `react-devtools` eliminado (dev-only, arrastraba electron 23 → 4 CVEs high).
- `i18next-http-backend` 2.x → ^3.0.5 (elimina moderate path traversal).

#### Resultado audit

- Antes: 130 vulnerabilidades (7 low, 58 moderate, 63 high, 2 critical).
- Después: **0 vulnerabilidades.**
- `pnpm audit` reporta "No known vulnerabilities found".

---

### v0.2.0 — SLIM-MODULES (Jul 2026)

#### Módulos eliminados

- `src/backend/shortcuts/nonesteamgame/` (~500 LOC): editor directo de `shortcuts.vdf`.
  Relic integra Steam vía `steam://addnonsteamgame` + store propio en
  `relic/steam_shortcuts/`. Sin callers productivos.
- `src/backend/shortcuts/shortcuts/` + `ipc_handler.ts` + `utils.ts` + `types.ts`
  (~250 LOC): creaban atajos `.desktop` que abrían Relic, no Steam. Contradecía
  la filosofía "Steam es el launcher". Eliminados métodos `addShortcuts`/
  `removeShortcuts` de la interfaz `GameManager` y de los 5 runners (legendary,
  gog, nile, zoom, sideload). Eliminados IPC `addShortcut`, `removeShortcut`,
  `shortcutsExists` y preload correspondiente.

#### Settings muertos

- `addDesktopShortcuts` y `addSteamShortcuts` eliminados de `AppSettings` y
  defaults de `config.ts`. No tenían código lector ni UI.

#### Deps npm eliminadas

- `electron-updater`, `plist`, `@shockpkg/icon-encoder`.

#### Archivos de test movidos

- `shortcuts/nonesteamgame/__tests__/test_data/` → `relic/steam_shortcuts/__tests__/test_data/`
  (7 archivos VDF de prueba, necesarios para `steam_helpers.test.ts`).

#### Test arreglado

- `game_events.test.ts`: eliminado mock y expectativa de `removeNonSteamGame`.
  El test `deletes bat file and removes from store` ahora pasa (antes era uno
  de los 4 fallos preexistentes). Fallos preexistentes bajan de 4 a 2
  (`constants.test.ts` y `tray_icon.test.ts`).

#### LOC

- ~1000 LOC eliminadas, ~150 movidas. 0 funcionalidad Relic afectada.

---

### v0.2.0 — ZOOM-INTEGRATION (Jul 2026)

#### Zoom Platform siempre activo

- `experimentalFeatures.zoomPlatform` eliminado. Zoom está disponible sin toggle experimental.
- Zoom login, biblioteca y descargas funcionan sin configuración adicional.

#### Instalación Windows mediante zoom-platform.sh

- La instalación Windows-on-Linux se delega a `public/bin/zoom/zoom-platform.sh` (v1.0.1, script autónomo).
- El script embebe su propio innoextract como base64, escribe `zoom_installer.inf` y `zoom_regkeys.bat`, lanza el instalador mediante umu, monitorea el log, y crea desktop entries.
- Relic llama al script con: `PROTONPATH={path} zoom-platform.sh -i installer.exe -d installPath`.
- `PROTONPATH` se pasa como variable de entorno (no como argumento al script).
- Eliminado el módulo `src/backend/relic/zoom_installer/` (6 archivos, ~350 LOC).
- Eliminado el binario `public/bin/x64/linux/innoextract` (560KB).
- Eliminado `innoextractPath` de `constants/paths.ts`.
- Añadido `build/bin/zoom/*` a `electron-builder.yml` para incluir el script en el AppImage.

#### pnpm estable

- `nodeLinker: hoisted` → `isolated` (elimina conflictos de versiones duplicadas).
- `pnpm@11.15.1` gestionado vía `corepack` (no `npm add -g`).
- `onlyBuiltDependencies` y `allowBuilds` configurados para builds nativos.
- Patch `@types/node` actualizado a 22.20.1.
- Store limpiado y reinstalación completa desde cero.

#### Tests

- TypeScript 0 errores, 95 tests pasan (ningún fallo preexistente nuevo).

---

### v0.2.1 — SLIM-SIDELOAD (Jul 2026)

#### Sideload eliminado completamente

- Directorios eliminados: `src/backend/storeManagers/sideload/`, `src/frontend/components/UI/EditGameDialog/`, `src/frontend/screens/Library/components/EmptyLibrary/` (CSS).
- Runner `'sideload'` eliminado del type union en types compartidos (6 archivos).
- Backend: store manager, handler IPC `addNewApp`, `LogPrefix.Sideload`, y entradas en `libraryManagerMap`, `STORE_CONFIGS`, `umuStoreMap` eliminados.
- Frontend state: `sideloadedLibrary` eliminado del context y GlobalState.
- Library (~6 archivos), GamePage (~7 archivos): variables `isSideloaded` y guards eliminados.
- ConsoleMode, DownloadManager, Settings: sideload references eliminadas.
- UI components: LibraryFilters, LibrarySearchBar, UninstallModal limpiados.
- Hooks: defaults de `sideload` reemplazados por `legendary`.
- CSS huérfano: `LibraryHeader/index.css`, `InstallModal/index.scss` limpiados.
- i18n: bloque `sideload` eliminado de 51 `gamepage.json` y 3 `translation.json`.
- Tests: 3 test cases y 1 mock eliminados.
- Store persistente `~/.config/relic/sideload_apps/` eliminado.
- ~40 archivos modificados, 3 directorios eliminados.

#### Electron fix

- Script `start`: añadido `node node_modules/electron/install.js` antes de `electron-vite dev` para solucionar `Error: Electron uninstall` cuando el binario no se descarga en `pnpm install`.

#### Tests

- TypeScript 0 errores, 92 tests pasan.

---

### v0.2.2 — REFACTOR-ORGANIZE (Jul 2026)

#### Reorganización de código

- `createRunnerFile()` movido de `game_events.ts` a `add_game.ts`.
- `preparePrefix()` (orquestador) movido de `game_events.ts` a `prefix.ts`.
- `preparePrefix` fundido dentro de `prepareUmuPrefix` (ahora incluye creación de drive_c).
- `validateGameInput` + `GameInput` type eliminados; lógica inlined en `onGameInstalled`.
- Funciones reordenadas por responsabilidad en `prefix.ts`, `add_game.ts`, `steam_helpers.ts`, `download.ts`, `windowify.ts`.

#### Tests

- 45 tests, TypeScript 0 errores.

---

### v0.2.3 — FIXES-JUL23 (Jul 2026)

#### Desktop name

- Añadido `desktopName: "Relic"` a `package.json` y `syncDesktopName: true` a `electron-builder.yml`.
- Electron usa `desktopName` como `WM_CLASS` — sin esto las ventanas no se asocian correctamente con el `.desktop` en entornos de escritorio.

#### Symlink Legendary/Nile

- `createGameSymlink()` y `windowify()` ahora reciben `installPath` como parámetro en vez de leer `gameInfo.install.install_path` (vacío para Legendary y Nile porque `installed.json` se escribe en disco, el objeto `gameInfo.install` no se refresca hasta `getGameInfo()`).
- `preparePrefix()` pasa `installPath` a `windowify()`.

#### Notificación de éxito post-instalación

- Reemplazada system notification (`notify()`) por mensaje contextual en la propia app.
- Nuevo hook `useInstallSuccess()` que escucha IPC `installCompleted` con auto-dismiss 4s.
- Nuevo componente `InstallSuccessOverlay` para modo consola (gamepad, clases existentes `consoleLaunchOverlay`/`consoleModal`).
- En modo GUI se usa `MessageBoxModal` estándar de la app.
- 3 archivos nuevos en `src/frontend/relic/dialogs/`, 3 archivos Heroic modificados.

#### GOG: Path del manifiesto corregido

- `gogdlConfigPath` en `constants.ts` apuntaba a `relic_gogdl` pero el binario gogdl tiene `heroic_gogdl` hardcodeado.
- La limpieza de manifiestos pre-instalación (`downloadmanager/utils.ts:59`) borraba en `relic_gogdl/manifests/` (vacío) en vez de `heroic_gogdl/manifests/` (manifiestos reales).
- gogdl encontraba el manifiesto stale → "Nothing to do" → instalación fallaba con ENOENT.
- Fix: revertir el segmento a `heroic_gogdl` (commit `482589a2` lo había cambiado durante el rebrand).

#### GOG: `folder_name` undefined post-instalación

- `getInstallInfo()` tiene un cache hit que retorna temprano sin actualizar el library Map.
- Tras descarga exitosa, el código usaba `gameInfo.folder_name` para construir `install_path` pero el Map no se había actualizado → `folder_name` vacío → error.
- Fix: añadido `folder_name` al tipo `GogInstallInfo`, incluido en el objeto cacheado, y usado `installInfo.folder_name` (directo del cache) en vez de `gameInfo.folder_name` (del library Map).

#### Tests

- TypeScript 0 errores, 92 tests pasan.

---

### v0.2.3 — EVENTS-IMPL (Jul 2026)

#### Eventos de instalación implementados

- `onGameImported()` ahora delega en `onGameInstalled()` en vez de ser un stub. Un import hace el mismo flujo que una instalación: runner file, addGameToSteam, shortcut, prefix, grids, Steam properties.
- `onGameMoved()` ahora mueve el symlink en `~/.local/share/relic/games/` de la ubicación antigua a la nueva y actualiza `installPath` en `steam_shortcuts.json`.
- Tests actualizados para ambos eventos.

#### IPC `installCompleted` eliminado

- Eliminado el sistema completo de notificación de instalación exitosa (IPC, hook, overlay, dialog en App.tsx).
- `game_events.ts` ya no envía `sendFrontendMessage('installCompleted')` al finalizar.

#### Symlink fix on game move

- `onGameMoved()` eliminado `existsSync` antes de `unlinkSync`. `existsSync` sigue symlinks y falla cuando el juego ya no está en la ruta original (porque se movió). Ahora `unlinkSync` se ejecuta siempre dentro de try/catch.

#### Console mode UI

- Botón "Opciones" renombrado a "Más" / "More" con nueva clave `console.more` en los 47 locales.
- Botón A-Z movido de `.consoleTopRight` a `.consoleLogoRow`, junto al icono Relic y el botón "Más".

#### Soporte para juegos Linux nativos

- `createGameSymlink()` extraído de `windowify.ts` a `add_game.ts` como función pública y reutilizable. Borra el symlink si existe antes de crearlo.
- `windowify.ts` ahora importa `createGameSymlink` desde `add_game.ts` en vez de tener su propia copia privada.
- `onGameInstalled()` bifurca según `gameInfo.is_linux_native`: si es Linux nativo, omite `createRunnerFile` (`.bat`), `windowify` y `prepareUmuPrefix`. En su lugar: crea symlink en `relicGamesPath`, busca `start.sh` en la raíz del juego, y lo usa directamente como target para `addGameToSteam`.
- El symlink en `~/.local/share/relic/games/<nombre>` se crea también para Linux nativos, garantizando que `onGameMoved` funcione correctamente (busca/existe el symlink por `basename`).

---

### v0.4.0 — Lint cleanup (Jul 2026)

#### ESLint: 134 errores eliminados

- `no-unused-vars`: eliminados imports y variables muertas en ~45 archivos de backend, frontend y tipos comunes.
- `no-require-imports`: convertidos 4 `require()` a ES imports en tests.
- `no-constant-condition`: eliminado bloque `if (false)` muerto.
- `no-empty`: añadido comentario a catch block vacío.
- Resultado: 783 problemas → 0 errores, 636 warnings (todos en `warn`, preexistentes).

---

### v0.4.0 — Dependency Modernization (Jul 2026)

#### Limpieza de dependencias

- `source-map-support` + `@types/source-map-support` eliminados (Electron 43 tiene source maps nativo).
- `graceful-fs` → `fs` nativo en ~35 archivos (Node 24+ tiene retry EMFILE nativo).
- `cross-env` eliminado (Relic es Linux-only).
- `resolutions.ts-morph` eliminado (no necesario).

#### Dependencias actualizadas

- `i18next-parser` → `i18next-cli` (deprecado). Config migrada a `i18next.config.ts`.
- 6 actualizaciones menores (fs-extra, simple-keyboard, sass, ts-jest, playwright, electron-builder).
- Fuentes: `@fontsource/cabin` 4→5, `@fontsource/rubik` 4→5.
- Iconos: `@fortawesome/*` 6→7 (37 iconos, API idéntica).
- `zustand` 4→5 (sin cambios de API), `zod` 3→4 (imports `zod/v3`), `fuse.js` 6→7, `shlex` 2→3.
- `eslint-plugin-react-hooks` 5→7 (reglas explícitas para mantener compatibilidad v5).

#### Dependencias bloqueadas

- `electron-store` mantiene 8.2.0 (v9+ ESM-only rompe Jest).
- `eslint` mantiene 9.x (v10 rompe con `eslint-plugin-react@7.37.5`).
- `typescript` mantiene 6.0 (v7 bloqueado por `typescript-eslint@8.65.0` `<6.1.0`).

#### Tooling modernizado

- `electron-vite` 3→5 + `@vitejs/plugin-react-swc` 3→4: `externalizeDepsPlugin()` → `build.externalizeDeps.exclude`.
- `typescript` 5.9→6.0: añadido `"types": ["node", "jest"]` (default vacío en TS 6).
- `jest` 29→30: 7 alias matchers migrados, `ts-jest/dist/types` → `ts-jest`.
- `tsconfig.json`: `moduleResolution: "bundler"`, `paths` sin `baseUrl`, `importHelpers: false`.

#### Dependencias redundantes eliminadas

- `fs-extra` + `@types/fs-extra`: reemplazado por `fs.cpSync` y `fs.readFileSync`.
- `@testing-library/user-event`: 0 imports.
- `@testing-library/dom`: ya instalado transitivamente por `@testing-library/react`.

#### Tests de alta prioridad

- `src/backend/relic/steam_shortcuts/__tests__/store.test.ts` (nuevo, 10 tests): `listShortcuts`, `findShortcut`, `addShortcut` (crear + upsert), `removeShortcut`, JSON corrupto. Usa `tmp` + `jest.resetModules()`.
- `src/backend/relic/steam_shortcuts/__tests__/game_events.test.ts` (+9 tests, 17 total): Linux native (`createGameSymlink` + `start.sh`), `symlink` error, `no install path`, `createRunnerFile` error, `preparePrefix`, zoom `removePrefixSymlink`, untracked game, symlink deletion on uninstall.
- `src/backend/relic/__tests__/prefix.test.ts` (nuevo, 8 tests): `symlinkPrefix` (create/cleanup/error), `removePrefixSymlink`, `preparePrefix` (zoom vs non-zoom dispatch). Usa patrón `jest.isolateModules()` para evitar interferencia de mocks globales.
- `src/backend/relic/__tests__/windowify.test.ts` (nuevo, 8 tests): `windowify` (legendary/gog transforms, zoom warning, missing installed.json), `syncMountBin` (source missing, file copy, hash skip).
- `eslint.config.mjs`: añadido `'@typescript-eslint/no-require-imports': 'off'` para `__tests__` (necesario para `jest.isolateModules()`).
- Resultado: 91 tests → 126 tests (+35), 19 suites → 21 suites, 0 errores lint/codecheck.

### v0.4.0 — Bugfixes

- **GOG install platform**: `onGameInstalled` usaba `gameInfo.is_linux_native` (propiedad de la API de GOG) en lugar de `gameInfo.install?.platform` (plataforma realmente instalada). Un juego con build Linux instalado como Windows tomaba la ruta Linux nativa incorrecta. Corregido + nuevo test para el caso dual.
- **GOG .bat runner**: comandos `mkdir`/`copy` ahora silenciados con `@` y `>nul 2>&1`. Añadido `timeout /t 2` tras `comet.exe` para dar margen a su inicialización antes de ejecutar gogdl.
- **Tests**: 127 total (21 suites).

### v0.5.2 — macOS Cleanup & Runner Improvements (Jul 2026)

- **Darwin/macOS assets eliminados**: todos los binarios macOS de legendary, gogdl, nile y comet eliminados de `downloadHelperBinaries.ts`. Tipo `SupportedPlatform` reducido a `'win32' | 'linux'`. Directorios `darwin/` residuales limpiados del disco.
- **zoom-platform.sh externalizado**: el script de 781 KB se descarga desde `https://zoom-platform.sh/zoom-platform.sh` vía `download-helper-binaries` en lugar de trackearse en git. `git rm --cached` + `.gitignore`.
- **GOG .bat cd fix**: añadido `cd /d "%RELIC%\bin\"` antes del arranque de Comet. Corrige `install-dummy-service.bat` que usa `%~dp0` para rutas relativas.
- **Runner version checks**: añadido `--version` antes de cada ejecución (`legendary --version`, `gogdl --version`, `comet.exe --version`, `nile --version`) en los .bat. La versión se imprime en la consola antes del lanzamiento.

### v0.5.3 — Bugfixes & Path Persistence (Aug 2026)

- **GOG credentials**: `getCredentials()` ya no lanza `SyntaxError` cuando gogdl devuelve salida vacía. Comprueba `stdout.trim()` antes de `JSON.parse`.
- **Version parsing**: `getLegendaryVersion()` usa regex simplificado `([\d.]+)` → muestra `v0.20.43` en vez de `invalid`. `getGogdlVersion()` y `getNileVersion()` añaden `.trim()` + check de vacío → muestran `1.2.2` en vez de campo vacío.
- **Log frontend**: `Refreshing all Library` en vez de `Refreshing undefined Library` cuando no se especifica runner.
- **GOG path persistence**: `changeGameInstallPath()` usa `installedGamesStore` como fuente primaria en lugar de abortar si el juego no está en el Map de biblioteca. Corrige que `install_path` quedara desactualizado tras mover juegos (Worms Revolution, Blade of Darkness).
- **Legendary path persistence**: tras `legendary move --skip-move`, escribe `install_path` directamente en `installed.json` como fallback. Garantiza que el nuevo path persista al reiniciar.

### v0.5.4 — Update Error Diagnostics (Aug 2026)

- **Credenciales GOG**: se loguea `gogdl auth returned empty output - re-login may be required` cuando `gogdl auth` devuelve salida vacía. La causa raíz de fallos de actualización con mensaje vacío queda visible.
- **Error message en actualizaciones**: `update()` de GOG y Legendary devuelve el `error` real (`error: 'No credentials'` en GOG, `res.error` en ambos) en lugar de `{ status: 'error' }` sin mensaje.
- **Propagación del error**: `updateQueueElement()` deja de enviar un string vacío y propaga el error real de `update()` en el evento de fallo. Ahora el frontend muestra la causa concreta del fallo.
- **Evento `onGameRepaired`**: nuevo evento del módulo relic. Tras una reparación exitosa, regenera el runner `.bat` del juego en `~/.local/share/relic/runner/` vía `createRelicBat()`, tomando los datos de `steam_shortcuts.json`. No añade a Steam ni toca prefijos. Se invoca desde el handler `repair` de `main.ts` únicamente cuando no hay error.
- **Grid icon `.ico` → `.png`**: el icono de grid de SteamGridDB se guarda como `<appid>_icon.png` en vez de `<appid>_icon.ico` (extensión hardcodeada en `download.ts` y `delete.ts`).

### v0.6.0 — Desacople de Electron, fase 1 (Ago 2026)

- **Shim de `app.getPath()`**: `appDataPath` y `userDataPath` se calculan en `constants/paths.ts` desde el entorno (`XDG_CONFIG_HOME`, o `~/.config` si no es absoluta per spec XDG) en lugar de pedírselas a Electron. Replican la semántica de Electron en Linux exactamente; rutas resueltas idénticas, sin migración de datos.
- **3 ficheros dejan de importar `electron`**: `storeManagers/zoom/constants.ts`, `storeManagers/nile/library.ts` y `migration/migrations/legendary.ts`. Acoplamiento a Electron en el backend: 24 → 21 ficheros.
- **Código muerto**: ternario `isLinux ? ... : ...` de la migración de legendary colapsado (rama inalcanzable, `isLinux` es `true` fijo en un proyecto Linux-only).
- **Soporte Snap eliminado por completo**: `isSnap`, `SNAP_REAL_HOME`, el aviso "running as a Snap" (dialog + `showSnapWarning`), la ruta de `snapd` en `osInfo`, y el bloque `box.warning.snap` de 47 locales. Relic se distribuye solo como AppImage. Detalle en `HISTORY_REMOVE.md`.
- **`electron-store` eliminado**: sustituido por `backend/json_store.ts` (`JsonStore`). Estaba fijado en 8.x por ser v9+ ESM-only; el bloqueo se resuelve eliminando la dependencia. Replica notación por puntos, `cwd`/`name`/`clearInvalidConfig`, iterabilidad y `store` como getter/setter; relee el fichero en cada acceso (paridad con `conf`) porque backend y preload comparten ficheros; escritura atómica y formato byte-compatible. 21 tests nuevos.
- **Shim de `app.isPackaged`**: `isPackaged` en `constants/environment.ts`, derivado de si se ejecuta dentro del asar. Con esto `constants/paths.ts` deja de importar `electron` por completo (acoplamiento del backend: 24 → 20 ficheros). `main.ts` comparte la misma definición.
- **`lint-translations` arreglado**: petaba en el primer locale con `enValue.match is not a function` (comparaba tipos asimétricamente). Ahora reporta los desajustes string/objeto en vez de abortar. Import fantasma de `graceful-fs` → `fs`.
- **Shim de `app.getVersion()`**: `relicVersion` y `relicUserAgent` en `constants/others.ts`, desde `package.json` (inlineado por el bundler en build time). Unifica el User-Agent que estaba duplicado en los dos clientes de SteamGridDB. 6 ficheros más dejan de importar `electron`; acoplamiento del backend: 24 → 14 ficheros.
- **Selector manual de portadas SteamGridDB eliminado**: `SteamGridDBPicker` (solo re-exportado, nunca renderizado), `steamgrid/utils.ts` y sus 3 handlers IPC + tipos + preload + claves i18n `steamgriddb.picker`/`.error` en 47 locales. Se conservan `secureKey.ts`, `hasApiKey`/`setApiKey` y la migración de key en texto plano, extraída a `migrateLegacyPlaintextKey()`. Detalle en `HISTORY_REMOVE.md`.
- **Notificaciones de escritorio y ventana "About" eliminadas**: `notify()` y sus ~18 call sites, la cadena IPC/preload/frontend, `showAboutWindow()` y el item "About" del tray, más los bloques i18n `notify`, `epic.offline-notification-*` y `tray.about` en 47 locales. Ninguna ayudaba a descargar/instalar/añadir a Steam, y las notificaciones no se mostraban en modo consola de la Deck. `processNotification()` pasa a `logQueueOutcome()` conservando el logging. Resuelve de paso el desajuste `notify.uninstalled` que reportaba `lint-translations`. ~2.500 líneas menos. Detalle en `HISTORY_REMOVE.md`.
- **Cache de credenciales GOG**: `getCredentials()` (18 call sites) lanzaba `gogdl auth` en cada llamada — ~17 spawns en 75 s en un arranque real. Ahora hay dedup de llamadas concurrentes y reutilización 60 s acotada por `expires_in`, con invalidación en login/logout. 10 tests nuevos. Ataca la causa de los fallos de salida vacía que se parchearon en 0.5.3/0.5.4.
- **GOG Rich Presence eliminada**: anunciaba presencia de un juego que Relic nunca lanza, cada 5 minutos, y su toggle ya no existía en la UI desde 0.4.0. Detalle en `HISTORY_REMOVE.md`.
- **Dedup de `getInstallInfo` en los tres runners**: la caché de install info solo se escribía al terminar el fetch, así que dos llamantes concurrentes fallaban el cache los dos y ambos lanzaban el proceso (visto en logs como `nile install --info` y `gogdl info` idénticos en el mismo segundo). Nuevo helper `shareInFlight()` aplicado en nile, legendary y gog, con la clave de caché de cada uno. 8 tests nuevos.
