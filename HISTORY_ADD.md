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
