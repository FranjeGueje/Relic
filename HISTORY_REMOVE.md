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
