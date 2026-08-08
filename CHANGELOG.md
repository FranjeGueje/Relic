# Changelog

## 0.6.0 — Electron Decoupling (fase 1)

### Español

Primer paso de una refactorización mayor: **sacar el backend de Electron** para que
pueda ejecutarse como servicio independiente bajo Node, y que la interfaz sea solo
un cliente que habla con él por API.

#### Cambiado

- **Shim de `app.getPath()`**: `appDataPath` y `userDataPath` se calculan ahora en
  `constants/paths.ts` a partir del entorno (`XDG_CONFIG_HOME`, o `~/.config` como
  fallback según la spec XDG) en lugar de pedírselas a Electron. Replican la
  semántica de Electron en Linux exactamente: `appData` → `~/.config`,
  `userData` → `~/.config/relic`.
- **Shim de `app.isPackaged`**: nuevo `isPackaged` en `constants/environment.ts`,
  derivado de si la ejecución ocurre dentro del asar (`__dirname` contiene
  `app.asar`). Con esto **`constants/paths.ts` deja de importar `electron` por
  completo**. `main.ts` usa el mismo `isPackaged` compartido, para que no haya dos
  definiciones de "empaquetado" que puedan divergir.
- **4 ficheros dejan de importar `electron` por completo**:
  `constants/paths.ts`, `storeManagers/zoom/constants.ts`,
  `storeManagers/nile/library.ts` y `migration/migrations/legendary.ts`.
  Acoplamiento a Electron en el backend: 24 → 20 ficheros.
- **Código muerto eliminado**: el ternario `isLinux ? ... : ...` de la migración de
  legendary tenía una rama inalcanzable (`isLinux` es `true` fijo en un proyecto
  Linux-only). Colapsado, junto con los imports de `isLinux` y `userHome` que
  quedaban sin uso.

#### Eliminado

- **`electron-store`, sustituido por `JsonStore` propio** (`backend/json_store.ts`).
  Estaba fijado en 8.x porque v9+ es ESM-only y rompía `jest.mock()` en CJS: el
  bloqueo queda resuelto eliminando la dependencia, no actualizándola.
  - Replica lo que Relic usaba: claves con notación por puntos, `cwd`/`name`/
    `clearInvalidConfig`, iterabilidad y `store` como getter y setter.
  - Relee el fichero en cada acceso, igual que `conf` (el motor de electron-store):
    backend y preload abren instancias distintas del mismo fichero y una escritura
    en uno tiene que verse en el otro.
  - Escritura atómica (write-then-rename) y formato byte-compatible (tabs, sin
    newline final), así que los ficheros existentes se leen y reescriben igual.
  - 21 tests nuevos, incluida la protección contra prototype pollution.
- **Soporte Snap, por completo.** Relic se distribuye exclusivamente como AppImage,
  así que todo el código condicional para Snap era muerto en la práctica:
  - `isSnap` y el uso de `SNAP_REAL_HOME` (`userHome` pasa a ser `homedir()`, sin
    aserción non-null).
  - `legendaryConfigPath` ya no tiene rama especial que ignorase `appFolder`.
  - El guard `if (!process.env.SNAP)` alrededor de `LEGENDARY_CONFIG_PATH`.
  - El aviso "Relic is running as a Snap" completo (dialog con checkbox y el ajuste
    `showSnapWarning` del configStore).
  - La ruta `/var/lib/snapd/hostfs/etc/os-release` en la detección de SO.
  - El bloque i18n `box.warning.snap` en los **47 locales**.

#### Ventajas

- **Habilita el backend como servicio**: sin dependencia de Electron para resolver
  rutas, el backend se acerca a poder correr bajo Node plano. Eso abre la puerta a
  clientes alternativos por API — por ejemplo un plugin de Decky Loader — sin
  reescribir la lógica de tiendas, descargas ni integración con Steam.
- **Desbloquea dependencias**: `electron-store` está fijado en 8.x por ser ESM-only
  desde v9 (ver `TODO_UPGRADE.md`). Quitar Electron de la capa de rutas es el
  requisito previo para sustituirlo.
- **Testeable sin Electron**: las rutas ya no necesitan que se mockee `electron`
  para resolverse.

#### Compatibilidad

Sin migración de datos. Las rutas resueltas son **idénticas** a las anteriores
(verificado contra el `~/.config/relic/` real), así que ninguna configuración,
login ni juego instalado cambia de sitio. El override de `CI=e2e` mantiene el
comportamiento previo: afecta solo a `appFolder`, no a `userDataPath`.

### English

First step of a larger refactor: **taking the backend out of Electron** so it can
run as a standalone Node service, with the UI becoming just a client that talks to
it over an API.

#### Changed

- **`app.getPath()` shim**: `appDataPath` and `userDataPath` are now computed in
  `constants/paths.ts` from the environment (`XDG_CONFIG_HOME`, falling back to
  `~/.config` per the XDG spec) instead of asking Electron. They mirror Electron's
  Linux semantics exactly: `appData` → `~/.config`, `userData` → `~/.config/relic`.
- **`app.isPackaged` shim**: new `isPackaged` in `constants/environment.ts`,
  derived from whether execution happens inside the asar (`__dirname` contains
  `app.asar`). With it, **`constants/paths.ts` no longer imports `electron` at
  all**. `main.ts` uses the same shared `isPackaged`, so there aren't two
  definitions of "packaged" that can drift apart.
- **4 files no longer import `electron` at all**: `constants/paths.ts`,
  `storeManagers/zoom/constants.ts`, `storeManagers/nile/library.ts` and
  `migration/migrations/legendary.ts`. Backend Electron coupling: 24 → 20 files.
- **Dead code removed**: the `isLinux ? ... : ...` ternary in the legendary
  migration had an unreachable branch (`isLinux` is hardcoded `true` in a
  Linux-only project). Collapsed, along with the now-unused `isLinux` and
  `userHome` imports.

#### Removed

- **`electron-store`, replaced by an in-house `JsonStore`** (`backend/json_store.ts`).
  It was pinned at 8.x because v9+ is ESM-only and broke `jest.mock()` under CJS;
  the blocker is resolved by dropping the dependency, not upgrading it.
  - Mirrors what Relic actually used: dot-notation keys, `cwd`/`name`/
    `clearInvalidConfig`, iterability, and `store` as both getter and setter.
  - Re-reads the file on every access, like `conf` (electron-store's engine) does:
    the backend and the preload open separate instances of the same file, and a
    write through one must be visible to the other.
  - Atomic writes (write-then-rename) and byte-compatible formatting (tabs, no
    trailing newline), so existing files are read and rewritten identically.
  - 21 new tests, including prototype-pollution guarding.
- **Snap support, entirely.** Relic ships exclusively as an AppImage, so every
  Snap-conditional code path was dead in practice:
  - `isSnap` and the `SNAP_REAL_HOME` usage (`userHome` is now just `homedir()`,
    dropping a non-null assertion).
  - `legendaryConfigPath` no longer has a special branch bypassing `appFolder`.
  - The `if (!process.env.SNAP)` guard around `LEGENDARY_CONFIG_PATH`.
  - The whole "Relic is running as a Snap" warning (dialog with checkbox plus the
    `showSnapWarning` configStore setting).
  - The `/var/lib/snapd/hostfs/etc/os-release` path in OS detection.
  - The `box.warning.snap` i18n block across all **47 locales**.

#### Why it matters

- **Unlocks the backend-as-a-service path**: with no Electron dependency for path
  resolution, the backend moves closer to running under plain Node. That opens the
  door to alternative API clients — a Decky Loader plugin, for instance — without
  rewriting the store, download or Steam-integration logic.
- **Unblocks dependencies**: `electron-store` is pinned at 8.x because v9+ is
  ESM-only (see `TODO_UPGRADE.md`). Removing Electron from the path layer is the
  prerequisite for replacing it.
- **Testable without Electron**: path resolution no longer needs `electron` mocked.

#### Compatibility

No data migration. Resolved paths are **identical** to before (verified against the
real `~/.config/relic/`), so no config, login or installed game moves. The `CI=e2e`
override keeps its previous behaviour: it affects `appFolder` only, not
`userDataPath`.

### Verificación / Verification

```
codecheck: 0 errors
lint:      0 errors (697 warnings)
tests:     160/160 (23 suites)
i18n --ci: sin cambios / no changes
build:     OK (electron-vite)
```

---

## 0.5.4 — Update Error Diagnostics & Move Fixes

### Español

#### Corregido

- **Credenciales GOG**: se loguea `gogdl auth returned empty output - re-login may be required` cuando `gogdl auth` devuelve salida vacía. La causa raíz de los fallos de actualización con mensaje vacío queda visible en los logs.
- **Error message en actualizaciones**: `update()` de GOG y Legendary ahora devuelve el error real en lugar de `{ status: 'error' }` sin mensaje.
  - GOG: `error: 'No credentials'` si faltan credenciales, `error: res.error` si la descarga falla.
  - Legendary: `error: res.error`.
- **Propagación del error**: `updateQueueElement()` deja de enviar un string vacío y propaga el error real de `update()` en el evento de fallo. Ahora el frontend muestra la causa concreta del fallo de actualización.
- **Diseño de Zoom sin indirección estable (causa raíz)**: Zoom era el único runner que apuntaba Steam y `compatdata` **directamente** a la ruta real de instalación, en vez de a través del symlink estable `relicGamesPath/<nombre>` que ya usan GOG/Legendary/Nile. Esto rompía el juego al moverlo: el `execPath` guardado en el shortcut y el symlink de `compatdata/<steamAppId>` quedaban apuntando a una ruta que ya no existía. Ahora `createRunnerFile()` crea ese symlink para Zoom también, y tanto el ejecutable usado por Steam como `compatdata` se construyen a través de él. Mover el juego pasa a ser solo actualizar el destino de un symlink — Steam y `compatdata` no necesitan tocarse nunca.
- **Persistencia inconsistente al mover juegos**: si la creación del nuevo symlink (`relic/games/<nombre>`) fallaba, `onGameMoved()` seguía guardando la nueva ruta en `steam_shortcuts.json` como si hubiese funcionado. Ahora aborta sin persistir si el symlink no se pudo crear, evitando que el estado guardado quede desincronizado del filesystem real.
- **`moveInstall()` de Zoom no implementado**: era un stub que devolvía siempre `'Move install not implemented'` sin mover nada, por lo que nunca llegaba a ejecutarse `onGameMoved()`. Ahora mueve los ficheros vía `moveOnUnix()`, actualiza `install_path` en el store de Zoom y llama a `onGameMoved()`, igual que GOG, Legendary y Nile.
- **Limpieza al desinstalar juegos Zoom**: `onGameUninstalled()` no borraba el symlink de `relicGamesPath` para Zoom (solo el de prefijo). Ahora se borra para todos los runners, sin tocar nunca el ejecutable real del juego.

#### Añadido

- **Evento `onGameRepaired`**: nuevo evento del módulo relic. Tras una reparación exitosa, regenera el runner `.bat` del juego en `~/.local/share/relic/runner/` vía `createRelicBat()`, tomando los datos de `steam_shortcuts.json`. No añade a Steam ni toca prefijos. Se invoca desde el handler `repair` de `main.ts` únicamente cuando no hay error.
- **Grid icon `.ico` → `.png`**: el icono de grid de SteamGridDB se guarda como `<appid>_icon.png` en lugar de `<appid>_icon.ico` (extensión hardcodeada en `download.ts` y `delete.ts`).

### English

#### Fixed

- **GOG credentials**: logs `gogdl auth returned empty output - re-login may be required` when `gogdl auth` returns empty output. The root cause of update failures with empty error messages is now visible in the logs.
- **Update error messages**: `update()` in GOG and Legendary now returns the real error instead of `{ status: 'error' }` with no message.
  - GOG: `error: 'No credentials'` if credentials are missing, `error: res.error` if the download fails.
  - Legendary: `error: res.error`.
- **Error propagation**: `updateQueueElement()` no longer sends an empty string and propagates the real error from `update()` in the failure event. The frontend now shows the concrete cause of an update failure.
- **Zoom's design lacked a stable indirection layer (root cause)**: Zoom was the only runner pointing Steam and `compatdata` **directly** at the real install path, instead of through the stable `relicGamesPath/<name>` symlink already used by GOG/Legendary/Nile. This broke the game after moving it: the `execPath` stored in the shortcut and the `compatdata/<steamAppId>` symlink kept pointing at a path that no longer existed. `createRunnerFile()` now creates that symlink for Zoom too, and both the executable Steam launches and `compatdata` are built through it. Moving the game is now just repointing one symlink — Steam and `compatdata` never need to change.
- **Inconsistent persistence when moving games**: if creating the new symlink (`relic/games/<name>`) failed, `onGameMoved()` still saved the new path to `steam_shortcuts.json` as if it had succeeded. It now aborts without persisting if the symlink couldn't be created, preventing the saved state from drifting out of sync with the actual filesystem.
- **Zoom's `moveInstall()` was unimplemented**: it was a stub that always returned `'Move install not implemented'` without moving anything, so `onGameMoved()` never actually ran. It now moves the files via `moveOnUnix()`, updates `install_path` in the Zoom store, and calls `onGameMoved()`, just like GOG, Legendary and Nile.
- **Cleanup on uninstalling Zoom games**: `onGameUninstalled()` didn't remove the `relicGamesPath` symlink for Zoom (only the prefix symlink). It's now removed for every runner, without ever touching the game's real executable.

#### Added

- **`onGameRepaired` event**: new relic module event. After a successful repair, it regenerates the game's runner `.bat` in `~/.local/share/relic/runner/` via `createRelicBat()`, using data from `steam_shortcuts.json`. It does not add to Steam or touch prefixes. It is invoked from the `repair` handler in `main.ts` only when there is no error.
- **Grid icon `.ico` → `.png`**: the SteamGridDB grid icon is saved as `<appid>_icon.png` instead of `<appid>_icon.ico` (extension hardcoded in `download.ts` and `delete.ts`).

### Verificación / Verification

```
codecheck: 0 errors
lint:      0 errors (704 warnings)
tests:     139/139 (22 suites)
```

---

## 0.5.3 — Bugfixes & Path Persistence

### Corregido

- GOG credentials: `getCredentials()` ya no lanza `SyntaxError: Unexpected end of JSON input` cuando gogdl devuelve salida vacía o parcial. Ahora comprueba `stdout.trim()` antes de `JSON.parse`.
- Version parsing: `getLegendaryVersion()` usa un regex simplificado `([\d.]+)` → muestra `v0.20.43` en vez de `invalid`. `getGogdlVersion()` y `getNileVersion()` añaden `.trim()` + check de vacío → muestran `1.2.2` en vez de un campo vacío.
- Log frontend: `Refreshing all Library` en vez de `Refreshing undefined Library` cuando no se especifica un runner concreto.

### Persistencia de rutas al mover juegos

- GOG: `changeGameInstallPath()` usa `installedGamesStore` como fuente primaria en lugar de abortar si el juego no está en el Map de biblioteca. Corrige que `install_path` quedara desactualizado en `gog_store/installed.json` tras mover juegos (Worms Revolution, Blade of Darkness).
- Legendary: tras `legendary move --skip-move`, se escribe `install_path` directamente en `installed.json` como fallback. Garantiza que el nuevo path persista al reiniciar.

### Verificación

```
codecheck: 0 errores
lint:      0 errores (692 warnings)
tests:     127/127 (21 suites)
```

---

## 0.4.0 — Pulido

### Añadido

- Sidebar: Downloads entre Library y Manage Accounts
- Sidebar: General y Log como items independientes (ya no submenú de Settings)
- Sidebar: icono SVG personalizado para Log y Registro
- Traducciones: `proton-path` → `GE-Proton path` en 47 locales
- ESLint: 134 errores eliminados (`no-unused-vars`, `no-require-imports`, `no-empty`, `no-constant-condition`)
- `src/common/formatBytes.ts`: helper `formatBytes()` reemplaza a `filesize`
- `src/frontend/helpers/cx.ts`: helper `cx()` reemplaza a `classnames`
- Tests: 35 nuevos tests unitarios para módulos `relic/` (store, game_events, prefix, windowify)
- `scripts/install.sh`: instalador de una línea vía `curl \| bash` (AppImage + Steam + grids)
- Enlace "Help translate Relic" eliminado (LanguageSelector, Login, IPC, tipos, URLs)
- Clave i18n `other.weblate` eliminada de 47 locales

### Tests

- `steam_shortcuts/__tests__/store.test.ts` (10 tests): persistencia de shortcuts — list, find, add, remove, upsert
- `steam_shortcuts/__tests__/game_events.test.ts` (+9 tests): Linux native, zoom uninstall, edge cases, runnerFile errors
- `relic/__tests__/prefix.test.ts` (8 tests): symlinkPrefix, removePrefixSymlink, preparePrefix, error handling
- `relic/__tests__/windowify.test.ts` (8 tests): transformaciones legendary/gog, syncMountBin, file copy/hash

### Eliminado

- Filtro "Browser" de la biblioteca (no hacía nada)
- ConsoleCard: fallback a `relic_card.jpg`
- Submenú de Settings (General + Log promovidos al nivel superior)
- Variable muerta `isBrowserGame` en GameCard y GamePage
- ~45 archivos: imports y variables muertas del código heredado de Heroic
- 10 dependencias muertas: `ini`, `sanitize-filename`, `semver`, `short-uuid`, `yocto-queue`, `@types/ini`, `@types/plist`, `@types/semver`, `fast-xml-parser`, `undici`
- `tslib` + `importHelpers: true` (innecesario con `noEmit`, build usa esbuild/SWC)
- `node-gyp` (ningún módulo nativo lo requiere)
- 4 dependencias sidegradeadas: `filesize`, `classnames`, `sanitize-html`, `recharts` (reemplazadas por helpers inline o SVG)
- `@types/sanitize-html` (innecesario sin `sanitize-html`)
- Login: dead code `oldMac`/`oldMacMessage`/`disabled` (siempre false)
- Settings: 9 componentes legacy nunca renderizados (`AlternativeExe`, `AltGOGdlBin`, `AltLegendaryBin`, `AltNileBin`, `DisableGOGPresence`, `ExperimentalFeatures`, `IgnoreGameUpdates`, `OfflineMode`, `PreferedLanguage`)
- `backend/utils.ts`: `moveOnWindows()` (Robocopy, Windows-only, 0 calls)
- `Library/index.tsx`: migration fallback de `category`/`filterPlatform` (TODOs)
- `GlobalState.tsx`: `storage.setItem('category')` dead write
- `CODE_OF_CONDUCT.md`, `DEPENDENCIES_DELETED.md` (boilerplate heredado de Heroic)

### Cambiado

- Logo de Registro: de `settings-sharp.svg` a `logs.svg`
- Pre-commit hook: `pnpm lint-fix` pasa sin errores
- `tsconfig.json`: `importHelpers: true` → `false` (build usa esbuild/SWC)

### Dependencias

- 15 paquetes eliminados: `source-map-support`, `@types/source-map-support`, `graceful-fs`, `@types/graceful-fs`, `cross-env`, `i18next-parser`, `filesize`, `classnames`, `sanitize-html`, `recharts`, `fs-extra`, `@types/fs-extra`, `@testing-library/user-event`, `@testing-library/dom`, `resolutions.ts-morph`
- 2 helpers inline: `formatBytes()` y `cx()` reemplazando `filesize` y `classnames`
- `i18next-parser` → `i18next-cli` (deprecado). Config en `i18next.config.ts`
- `@fontsource/*` 4→5, `@fortawesome/*` 6→7, `zustand` 4→5, `zod` 3→4, `fuse.js` 6→7, `shlex` 2→3, `eslint-plugin-react-hooks` 5→7
- Tooling modernizado: `electron-vite` 3→5, `@vitejs/plugin-react-swc` 3→4, `jest` 29→30, `typescript` 5→6
- `tsconfig.json`: `moduleResolution: "bundler"`, `paths` sin `baseUrl`, `importHelpers: false`
- 2 dependencias bloqueadas: `electron-store` (ESM-only), `eslint` v10 (eslint-plugin-react incompatible)
- Verificación: codecheck 0 errores, test 126/126, lint 0 errores, build exitoso

---

## 0.2.3 — Events & Native Support

### Añadido

- `onGameImported()` delega en `onGameInstalled()` (flujo completo)
- `onGameMoved()`: mueve symlink + actualiza `steam_shortcuts.json`
- Soporte para juegos Linux nativos (GOG): omite .bat, windowify y prefix
- `createGameSymlink()` como función pública compartida
- Console mode: botón "Más" (clave `console.more`, 47 locales)
- Console mode: botón A-Z movido a `consoleLogoRow`

### Eliminado

- Sistema `installCompleted` (IPC, hook, overlay, dialog)
- `existsSync` en `onGameMoved` (fallaba con symlinks rotos)
- Código duplicado de `createGameSymlink` en `windowify.ts`

### Cambiado

- README bilingüe EN/ES con nota de ahorro de RAM
- Versión `0.3.0` → `0.4.0`, nombre `Primera Piedra` → `Pulido`
- AGENTS.md: eliminada línea de Sideload en Alcance

---

## 0.2.2 — Code Reorganization

### Cambiado

- `createRunnerFile()` movido de `game_events.ts` a `add_game.ts`
- `preparePrefix()` (orquestador) movido a `prefix.ts`
- `preparePrefix` fundido dentro de `prepareUmuPrefix`
- `validateGameInput` + `GameInput` type eliminados (lógica inlined)

---

## 0.2.1 — Sideload Removed

### Eliminado

- Runner `sideload` completo (store manager, IPC, frontend state, UI)
- `src/backend/storeManagers/sideload/`
- `src/frontend/components/UI/EditGameDialog/`
- i18n bloque `sideload` en 51 archivos
- Store persistente `~/.config/relic/sideload_apps/`
- ~40 archivos modificados, 3 directorios eliminados

---

## 0.2.0 — Steam Integration & Foundation

### Añadido

- Módulo `src/backend/relic/steam_shortcuts/`: `addGameToSteam()` vía `steam://addnonsteamgame`
- Store `steam_shortcuts.json` con gameName, appId, store, steamAppId, installPath, execPath
- `onGameInstalled()` / `onGameUninstalled()` en todos los store managers
- Módulo `relic/umu/`: store mapping, UMU API lookup, `umu-run` launcher
- Detección automática de GE-Proton (`detectGeProton()`)
- Módulo `relic/steamgrid/`: API client propio, descarga de 5 imágenes por juego
- `relic/windowify.ts`: transformación de paths Linux → Windows, symlinks de tiendas
- `syncMountBin()`: sincronización de binarios win32 al mount
- Zoom Platform siempre activo (sin toggle experimental)
- Instalación Windows mediante `zoom-platform.sh`
- Tests: 92 tests, TypeScript 0 errores

### Eliminado

- Módulo `src/backend/shortcuts/nonesteamgame/` (~500 LOC)
- Módulo `src/backend/shortcuts/shortcuts/` + IPC handlers
- Settings muertos: `addDesktopShortcuts`, `addSteamShortcuts`
- Dependencias: `electron-updater`, `plist`, `@shockpkg/icon-encoder`
- `ts-prune`, `unimported`, `@types/react-router-dom`
- 130 vulnerabilidades → 0 (Electron 43, pnpm overrides, actualizaciones)

### Cambiado

- Zoom: de experimental a siempre activo
- pnpm: `hoisted` → `isolated`, corepack, v11.15.1
- Electron 41.9.0 → 43.1.1
- Node engines: `>=22` → `>=24`

---

## 0.1.0 — Initial Fork

### Añadido

- Fork de Heroic Game Launcher orientado exclusivamente a Linux
- Filosofía: autenticación, descarga, instalación e integración con Steam
- Módulos `relic/` en backend, frontend y common
- AGENTS.md, HISTORY.md, HISTORY_ADD.md, HISTORY_REMOVE.md

### Eliminado

- Todo el flujo de lanzamiento de juegos (`prepareLaunch`, `launch()`)
- Wine/Proton manager completo (WineVersionSelector, WinePrefix, CustomWineProton, DXVK, VKD3D, Winetricks, etc.)
- Gestión de prefijos, variables de entorno, compatibilidad
- macOS y Windows: código específico, Rosetta, Crossover, etc.
- Discord RPC, Ko-fi, Plausible Analytics, GitHub releases
- EOS Overlay, Saves Sync, Game Scores, Anticheat
- Flatpak/Flathub, E2E tests, GitHub workflows
- Community links, Start Tour, Accessibility screen
- 94 archivos de traducción limpiados
