# HISTORY_REMOVE.md

## Rebranding Heroic → Relic
- Renombrado: package.json, electron-builder.yml, index.html, manifest.json
- Identificadores, textos, URLs, scheme de protocolo (`heroic://` → `relic://`)
- Config paths (`~/.config/heroic` → `~/.config/relic`)
- Assets: `relic-icon.svg`, `relic_card.jpg`
- Reemplazados: `HeroicVersion` → `RelicVersion`, `ResetHeroic` → `ResetRelic`

## GitHub
- `.github/workflows/` eliminado (23 archivos, 978 líneas)

## MangoHud
- Componente `Mangohud.tsx` eliminado
- `showMangohud` eliminado de `GameSettings` y `game_config.ts`
- `mangoHudCommand` eliminado de `LaunchPreperationResult`, `launcher.ts`, y todos los storeManagers
- Mención eliminada de Snap warning en `main.ts`
- Claves de traducción eliminadas (47 archivos)

## Gamescope
- Componente `Gamescope.tsx` eliminado
- Interfaz `GameScopeSettings` y campo `gamescope` eliminados de `common/types.ts`
- Campo `gamescope` eliminado de `game_config.ts`
- Bloque de detección (~90 líneas) eliminado de `launcher.ts`
- `gameScopeCommand` eliminado de `setupWrappers` y todos los storeManagers
- Pestana Gamescope eliminada de `GamesSettings/index.tsx`
- Estilos `.gamescopeSettings` eliminados
- Mención eliminada de Snap warning
- Claves de traducción eliminadas (47 archivos)

## Windows
- Build config: secciones `win`, `portable`, `nsis` eliminadas de `electron-builder.yml`
- Scripts `release:win`, `sign:win`, `dist:win` eliminados de `package.json`
- `isWindows` fijado a `false` en `environment.ts`
- Bloque `delete gameSettings.*` para Windows (~23 líneas) eliminado de `launcher.ts`
- Lógica PowerShell/`Start-Process` eliminada de `callRunner` en `launcher.ts`
- `shouldUsePowerShell` eliminado
- Archivos systeminfo Windows eliminados: `osInfo/windows.ts`, `memory/windows.ts`, `gpu/windows.ts`, `filesystem/windows.ts`, `filesystem/__tests__/windows.test.ts`
- Índices simplificados: `osInfo/index.ts`, `memory/index.ts`, `gpu/index.ts`, `filesystem/index.ts`
- `if (isWindows)` en `main.ts` eliminado

## Kofi
- URL `kofiPage` eliminada de `urls.ts`
- `openKofiPage` eliminado de IPC, preload, backend, y sidebar
- Botón Ko-fi eliminado de la sidebar (`faCoffee` import removido)
- Badge Ko-fi eliminado de `README.md`
- Enlaces Ko-fi eliminados de `Support.md`, flatpak template, y `snap/snapcraft.yaml`

## Discord
- Dependencia `@xhayper/discord-rpc` eliminada de `package.json`
- Función `constructAndUpdateRPC` eliminada de `backend/utils.ts`
- Componente `DiscordRPC.tsx` eliminado
- `rpcClient`/`launchCleanup` eliminados de `launcher.ts` y todos los storeManagers
- Interfaz `RpcClient` eliminada de `common/types.ts`
- `discordRPC` eliminado de settings
- URL `discordLink` y función `openDiscordLink` eliminados de IPC/preload/backend/sidebar/LogSettings
- Badges Discord eliminados de `README.md`, flatpak template, `snap/snapcraft.yaml`
- `Discord` mock renombrado en `nonesteamgame.test.ts`
- Menciones a Discord eliminadas de traducciones (40 archivos), SidebarTour, Nile setup, LogFileUploadDialog, LogSettings, electron_store.ts
