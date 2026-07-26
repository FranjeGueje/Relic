# Changelog

## 0.4.0 — Pulido

### Añadido

- Sidebar: Downloads entre Library y Manage Accounts
- Sidebar: General y Log como items independientes (ya no submenú de Settings)
- Sidebar: icono SVG personalizado para Log y Registro
- Traducciones: `proton-path` → `GE-Proton path` en 47 locales
- ESLint: 134 errores eliminados (`no-unused-vars`, `no-require-imports`, `no-empty`, `no-constant-condition`)

### Eliminado

- Filtro "Browser" de la biblioteca (no hacía nada)
- ConsoleCard: fallback a `relic_card.jpg`
- Submenú de Settings (General + Log promovidos al nivel superior)
- Variable muerta `isBrowserGame` en GameCard y GamePage
- ~45 archivos: imports y variables muertas del código heredado de Heroic

### Cambiado

- Logo de Registro: de `settings-sharp.svg` a `logs.svg`
- Pre-commit hook: `pnpm lint-fix` pasa sin errores

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
