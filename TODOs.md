# TODOs - Limpieza de código muerto en Relic

## Contexto
Relic es un fork de Heroic Game Launcher, Linux-only. Según AGENTS.md:
- Relic NO lanza juegos (Steam es el launcher)
- Relic NO gestiona Wine/Proton/prefixes/compatibilidad
- Relic NO instala componentes de Wine automáticamente
- Solo: autenticación, descarga, instalación, detección de ejecutable, script externo → Steam

## Estado actual
- `pnpm codecheck` → 0 errores
- `pnpm dist:linux` → AppImage genera correctamente
- ~7500+ líneas de código muerto identificadas en ~100+ archivos

---

## FASE 1: Limpieza segura (sin riesgo de romper nada)

### 1.1 - Eliminar dependencias no usadas en package.json
Eliminar de `dependencies` y `devDependencies`:
- `react-markdown`
- `rehype-raw`
- `intro.js`
- `intro.js-react`

Verificar: `pnpm install && pnpm codecheck && pnpm dist:linux`

### 1.2 - Eliminar componentes frontend macOS-only
Archivos a borrar:
- `src/frontend/screens/Settings/components/AdvertiseAvxForRosetta.tsx`
- `src/frontend/screens/Settings/components/CrossoverBottle.tsx`
- `src/frontend/screens/Settings/components/EnableMsync.tsx`
- `src/frontend/screens/Game/GamePage/components/AppleWikiInfo.tsx`
- `src/frontend/components/UI/WikiGameInfo/components/MacOSCompatibility/` (directorio)

Limpiar imports/exports en:
- `src/frontend/screens/Settings/components/index.ts`
- `src/frontend/screens/Settings/sections/GamesSettings/index.tsx`
- `src/frontend/screens/Game/GamePage/index.tsx`

Verificar: `pnpm codecheck`

### 1.3 - Eliminar directorio AppleGamingWiki (backend)
Borrar:
- `src/backend/wiki_game_info/applegamingwiki/` (directorio completo con tests)

Limpiar:
- `src/backend/wiki_game_info/wiki_game_info.ts` → eliminar `getInfoFromAppleGamingWiki` y la rama `isMac`
- `src/common/types.ts` → eliminar `crossoverRating`, `crossoverLink` de `AppleGamingWikiInfo`

Verificar: `pnpm codecheck`

### 1.4 - Eliminar referencias a "Heroic" en URLs
Archivos a editar:
- `src/common/types/legendary.ts:197` → actualizar comentario URL
- `src/backend/tools/index.ts:577,584,592` → URLs de Heroic-Games-Launcher/vkd3d-proton (o eliminar si se elimina tools/)

### 1.5 - Eliminar settings Windows-only sin UI
- `src/common/types.ts` → eliminar `addStartMenuShortcuts: boolean`
- `src/backend/config.ts` → eliminar default `addStartMenuShortcuts`
- `src/backend/shortcuts/shortcuts/shortcuts.ts` → eliminar todas las ramas `addStartMenuShortcuts`

---

## FASE 2: Limpieza de settings Wine prohibidas por AGENTS.md

### 2.1 - Eliminar toggles Esync/Fsync/FSR/WineWayland/WoW64/DXVKFpsLimit
Archivos a borrar:
- `src/frontend/screens/Settings/components/EnableEsync.tsx`
- `src/frontend/screens/Settings/components/EnableFsync.tsx`
- `src/frontend/screens/Settings/components/EnableFSR.tsx`
- `src/frontend/screens/Settings/components/EnableWineWayland.tsx`
- `src/frontend/screens/Settings/components/EnableWoW64.tsx`
- `src/frontend/screens/Settings/components/EnableDXVKFpsLimit.tsx`

Limpiar:
- `src/frontend/screens/Settings/components/index.ts` → eliminar exports
- `src/frontend/screens/Settings/sections/GamesSettings/index.tsx` → eliminar imports y renderizado
- `src/common/types.ts` → eliminar settings: `enableEsync`, `enableFsync`, `enableFSR`, `enableWineWayland`, `enableWoW64`, `enableDXVKFpsLimit`, `DXVKFpsCap`
- `src/backend/config.ts` → eliminar defaults
- `src/backend/game_config.ts` → eliminar lectura/escritura
- `src/backend/launcher.ts` → eliminar env vars `WINEESYNC`, `PROTON_NO_ESYNC`, `WINEFSYNC`, `PROTON_NO_FSYNC`, `DXVK_FRAME_RATE`, etc.

### 2.2 - Eliminar EnvVariablesTable, WrappersTable, LauncherArgs, LaunchOptionSelector
Archivos a borrar:
- `src/frontend/screens/Settings/components/EnvVariablesTable.tsx`
- `src/frontend/screens/Settings/components/WrappersTable.tsx`
- `src/frontend/screens/Settings/components/LauncherArgs.tsx`
- `src/frontend/screens/Settings/components/LaunchOptionSelector.tsx`
- `src/frontend/hooks/useLaunchOptions.ts`

Limpiar:
- `src/frontend/screens/Settings/components/index.ts`
- `src/frontend/screens/Settings/sections/GamesSettings/index.tsx`
- `src/common/types.ts` → eliminar `enviromentOptions`, `launcherArgs`, `wrapperOptions`
- `src/backend/storeManagers/*/games.ts` → eliminar uso de `launcherArgs` (legendary, gog, nile, zoom, storeManagerCommon)

### 2.3 - Eliminar settings Wine adicionales
Componentes a borrar:
- `src/frontend/screens/Settings/components/NvidiaPrime.tsx`
- `src/frontend/screens/Settings/components/PreferSystemLibs.tsx`
- `src/frontend/screens/Settings/components/ShowFPS.tsx`
- `src/frontend/screens/Settings/components/GameMode.tsx`
- `src/frontend/screens/Settings/components/SteamRuntime.tsx`
- `src/frontend/screens/Settings/components/EacRuntime.tsx`
- `src/frontend/screens/Settings/components/BattlEyeRuntime.tsx`
- `src/frontend/screens/Settings/components/CustomWineProton.tsx`

Limpiar:
- `src/frontend/screens/Settings/components/index.ts`
- `src/frontend/screens/Settings/sections/GamesSettings/index.tsx`
- `src/common/types.ts` → eliminar: `nvidiaPrime`, `preferSystemLibs`, `showFps`, `useGameMode`, `useSteamRuntime`, `battlEyeRuntime`, `customWinePaths`
- `src/backend/config.ts` → eliminar defaults
- `src/backend/launcher.ts` → eliminar lógica asociada

---

## FASE 3: Limpieza de gestión Wine/Proton

### 3.1 - Eliminar WineVersionSelector y WinePrefix
Archivos a borrar:
- `src/frontend/screens/Settings/components/WineVersionSelector.tsx`
- `src/frontend/screens/Settings/components/WinePrefix.tsx`

Limpiar:
- `src/frontend/screens/Settings/components/index.ts`
- `src/frontend/screens/Settings/sections/GamesSettings/index.tsx`
- `src/frontend/screens/Library/components/InstallModal/WineSelector/` → simplificar o eliminar (requiere análisis: ¿cómo se selecciona el Wine/Proton para instalar un juego si Relic no gestiona Wine?)
- `src/common/types.ts` → eliminar `winePrefix`, `wineVersion`, `wineCrossoverBottle`, `sharedWinePrefix`, `defaultWinePrefix`, `defaultWinePrefixDir`, `showValveProton`

### 3.2 - Eliminar src/backend/tools/ completo
Borrar directorio:
- `src/backend/tools/` (DXVK, VKD3D, DXMT installers, Winetricks)

Limpiar:
- `src/backend/main.ts` → eliminar imports de tools
- `src/backend/launcher.ts` → eliminar llamadas a tools
- `src/common/types/ipc.ts` → eliminar handlers de tools
- `src/preload/api/wine.ts` → eliminar exports de tools

### 3.3 - Simplificar src/backend/wine/runtimes/
Analizar:
- Eliminar todo el directorio

### 3.4 - Eliminar CrossOver completo
Limpiar en `src/backend/launcher.ts`:
- Todas las ramas `wineVersion.type === 'crossover'`
- Env vars `CX_BOTTLE`
- Lógica de botellas CrossOver

Limpiar en `src/backend/utils/compatibility_layers.ts`:
- Función `getCrossover()`
- Case `'crossover'` en switch

Limpiar en `src/backend/config.ts`:
- Llamada a `getCrossover()` y merge

Limpiar en `src/common/types.ts`:
- `'crossover'` del type `WineInstallation.type`
- `'wine-crossover'` de `ReleasesInfo`

Limpiar en frontend:
- `src/frontend/screens/Library/components/InstallModal/` → eliminar props `crossoverBottle` en todos los sub-dialogos
- `src/frontend/screens/Game/GamePage/components/InstalledInfo.tsx` → eliminar mostrar botella CrossOver
- `src/frontend/screens/Game/GameSubMenu/index.tsx` → eliminar condición `wineVersion.type !== 'crossover'`

### 3.5 - Eliminar Lutris
Limpiar:
- `src/common/types.ts` → eliminar `'Wine-Lutris'` del type `Type`
- `src/backend/wine/runtimes/runtimes.ts` → eliminar fetch a `lutris.net/api/runtimes`
- `src/backend/utils/compatibility_layers.ts` → eliminar detección de Wine de Lutris
- `src/frontend/screens/Settings/components/WineVersionSelector.tsx` → eliminar texto `~/.local/share/lutris/runners/wine`

---

## FASE 4: Limpieza de ramas isMac/isWindows muertas

### 4.1 - Eliminar ramas `if (isMac)` en backend
Archivos principales:
- `src/backend/launcher.ts` → ~9 ramas condicionales
- `src/backend/config.ts` → ~6 ramas (paths Mac, CrossOver, enableMsync, advertiseAvxForRosetta)
- `src/backend/utils/compatibility_layers.ts` → ~6 funciones que retornan vacío en Linux
- `src/backend/main.ts` → Rosetta check, macOS window close
- `src/backend/tray_icon/tray_icon.ts` → `app.dock?.setMenu()`
- `src/backend/shortcuts/shortcuts/shortcuts.ts` → generación de shortcuts macOS (.app bundle)
- `src/backend/logger/paths.ts` → path de logs macOS
- `src/backend/utils.ts` → `isIntelMac`, `isMacSonomaOrHigher()`
- `src/backend/storeManagers/*/games.ts` → checks de plataforma Mac
- `src/backend/storeManagers/sideload/library.ts` → Mac .app bundle handling

### 4.2 - Eliminar ramas `if (isWindows)` en backend
Archivos principales:
- `src/backend/config.ts` → paths Windows, winePrefix vacío
- `src/backend/storeManagers/legendary/games.ts` → `moveOnWindows`, paths Windows
- `src/backend/storeManagers/gog/games.ts` → paths Windows, moveOnWindows
- `src/backend/storeManagers/gog/setup.ts` → setup Windows
- `src/backend/storeManagers/nile/games.ts` → paths, moveOnWindows
- `src/backend/storeManagers/nile/setup.ts` → setup Windows
- `src/backend/storeManagers/zoom/games.ts` → paths Windows
- `src/backend/storeManagers/sideload/games.ts` → check Windows
- `src/backend/shortcuts/nonesteamgame/nonesteamgame.ts` → paths y lógica Windows
- `src/backend/logger/paths.ts` → path de logs Windows
- `src/backend/utils.ts` → `.exe` suffix, paths Windows
- `src/backend/anticheat/utils.ts` → early returns en Windows
- `src/backend/constants/paths.ts` → paths a `.exe` files
- `src/backend/constants/others.ts` → case `win32`
- `src/backend/main_window.ts` → condición `['darwin', 'win32']`

### 4.3 - Eliminar ramas `platform === 'darwin'` y `platform === 'win32'` en frontend
Archivos principales:
- `src/frontend/screens/Settings/sections/GamesSettings/index.tsx`
- `src/frontend/screens/Settings/sections/AdvancedSettings/index.tsx` → EOS Overlay (Windows-only)
- `src/frontend/screens/Library/components/InstallModal/index.tsx`
- `src/frontend/screens/Game/GamePage/index.tsx`
- `src/frontend/screens/ConsoleMode/InstallOverlay/index.tsx`
- `src/frontend/screens/Library/index.tsx` → filtros de plataforma
- `src/frontend/screens/Login/index.tsx` → validación macOS
- `src/frontend/hooks/useSettingsContext.ts`
- `src/frontend/state/GlobalState.tsx` → `isIntelMac` fetch
- `src/frontend/components/UI/LibraryFilters/index.tsx` → filtro plataforma Mac
- `src/frontend/components/UI/Sidebar/components/SidebarLinks/index.tsx` → `isWin` check

---

## FASE 5: Refactorización profunda ✅ COMPLETADA

- **5.1**: `launcher.ts` refactorizado (~1810 líneas eliminadas). Mantenidos: `callRunner`, `readKnownFixes`, `appNameFromCommandParts`, `getRunnerCallWithoutCredentials`.
- **5.2**: `compatibility_layers.ts` ya estaba limpio (solo umu). `disableUMU` eliminado de `isUmuSupported`.
- **5.3**: EOS Overlay ya estaba eliminado en fases anteriores. Traducciones huérfanas limpiadas en 5.8.
- **5.4**: `beforeLaunchScriptPath`/`afterLaunchScriptPath` eliminados completamente (backend, types, UI, traducciones). No son el mecanismo del script externo.
- **5.5**: Flujo de lanzamiento eliminado: `launch`, `launchGame`, `getLaunchOptions`, `getPlaytimeFromRunner` eliminados de IPC, preload, store managers, y frontend.
- **5.6**: `disableUMU` eliminado.
- **5.7**: Código muerto Wine/Proton eliminado: `wineprefixFAQ`, `defaultWinePrefix*`, `ValidWinePrefix`, `WineDownloader`/`WineTricks` log prefixes, wine flags de legendary commands, `src/backend/wine/` directory.
- **5.8**: 94 archivos de traducción limpiados (eosOverlay, before/after-launch-script-path, disableUMU, protondb).
- **5.9**: HISTORY_REMOVE.md actualizado.

### Pendiente para fase futura
- Ninguno. Todos los settings sin UI han sido analizados y eliminados (Fase 6).

---

## Notas para el modelo que ejecute

1. **Orden de ejecución**: FASE 1 → 2 → 3 → 4 → 5. Cada fase es incremental.
2. **Verificación después de cada tarea**: `pnpm codecheck` (0 errores) y `pnpm dist:linux` (AppImage genera).
3. **Commit después de cada fase**: para poder revertir si algo falla.
4. **HISTORY_REMOVE.md**: actualizar después de cada tarea completada.
5. **No romper el flujo principal**: login → descargar → instalar → detectar ejecutable → script externo → Steam.
6. **umu-launcher**: puede ser necesario para el script externo. No eliminar sin analizar.
7. Conservar: isUmuSupported, getUmuPath (necesario para script externo)
