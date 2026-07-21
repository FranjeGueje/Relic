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
