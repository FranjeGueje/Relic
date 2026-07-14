# ROADMAP_REMOVE

Módulos a eliminar según la filosofía de Relic (AGENTS.md).

Relic NO debe gestionar Wine, Proton, Winetricks, MangoHud, Gamescope, DXVK, VKD3D, lanzamiento de juegos ni prefijos. Toda esa lógica pertenece al script externo o a Steam.

---

## 1. Wine

### Backend: `src/backend/wine/`
Directorio completo dedicado a la gestión de versiones de Wine/Proton.

| Archivo | Líneas | Propósito |
|---|---|---|
| `src/backend/wine/manager/downloader/main.ts` | — | Descargador de versiones de Wine/Proton |
| `src/backend/wine/manager/downloader/constants.ts` | — | Constantes (URLs de releases) |
| `src/backend/wine/manager/downloader/utilities.ts` | — | Utilidades de descarga |
| `src/backend/wine/manager/downloader/__tests__/main/getter.test.ts` | — | Tests del descargador |
| `src/backend/wine/manager/downloader/__tests__/utilities/rest.test.ts` | — | Tests REST |
| `src/backend/wine/manager/downloader/__tests__/utilities/unzip.test.ts` | — | Tests de descompresión |
| `src/backend/wine/manager/downloader/__tests__/test_data/test.tar.gz` | 6.4 MB | Test fixture enorme |
| `src/backend/wine/manager/downloader/__tests__/test_data/test.tar.xz` | 3.2 MB | Test fixture enorme |
| `src/backend/wine/manager/downloader/__tests__/test_data/github-api-test-data.json` | — | Mock de API |
| `src/backend/wine/manager/ipc_handler.ts` | — | IPC del Wine Manager |
| `src/backend/wine/manager/utils.ts` | — | Utilidades del Wine Manager |
| `src/backend/wine/runtimes/runtimes.ts` | — | Gestión de runtimes (DXVK, VKD3D) |
| `src/backend/wine/runtimes/ipc_handler.ts` | — | IPC de runtimes |
| `src/backend/wine/runtimes/util.ts` | — | Utilidades de runtimes |
| `src/backend/wine/runtimes/__tests__/runtimes/utils.test.ts` | — | Tests de runtimes |
| `src/backend/wine/runtimes/__tests__/runtimes/test_data/*.tar.xz` | — | Test fixtures |

### Backend: `src/backend/utils/compatibility_layers.ts`
581 líneas dedicadas a detectar y gestionar capas de compatibilidad (Wine, Proton, Crossover, Game Porting Toolkit, Whisky, Wineskin).

### Backend: `src/backend/tools/index.ts`
893 líneas. Herramientas como DXVK, VKD3D, Winetricks, descarga de Wine/Proton.

### Backend: `src/backend/tools/dxmt.ts`
DXMT (DirectX Metal Translation) para macOS.

### Backend: `src/backend/tools/ipc_handler.ts`
IPC para las herramientas (wine, dxvk, vkd3d, winetricks).

### Backend: `src/backend/launcher.ts` — secciones wine
- Llamadas a `checkWineBeforeLaunch`
- Variables de entorno `HEROIC_*` para el script
- Gestión de prefijos (`winePrefix`)
- Configuración de `wineVersion`
- Llamadas a `WineCommandArgs`

### Backend: `src/backend/config.ts` — config de wine
- `wineCrossoverBottle: 'Relic'` (línea 355)
- `defaultWinePrefix`
- Configuración global de Wine/Proton

### Backend: `src/backend/game_config.ts`
393 líneas. Configuración por juego que incluye `wineVersion`, `winePrefix`, `wineCrossoverBottle`.

### Backend: `src/backend/save_sync.ts`
216 líneas. Sincronización de partidas que depende de `winePrefix` para localizar los archivos de guardado.

### Backend: `src/backend/storeManagers/*/games.ts` — wine en cada tienda
- `gog/games.ts`
- `legendary/games.ts`
- `nile/games.ts`
- `sideload/games.ts`
- `zoom/games.ts`
- `storeManagerCommon/games.ts`
Todos tienen lógica de lanzamiento que usa Wine/Proton.

### Backend: `src/backend/storeManagers/gog/setup.ts`
Instalación offline de GOG que ejecuta Wine para el setup.

### Backend: `src/backend/storeManagers/legendary/setup.ts`
Setup de Legendary que usa Wine.

### Backend: `src/backend/storeManagers/legendary/commands/launch.ts`
Comando de lanzamiento para Legendary.

### Backend: `src/backend/storeManagers/legendary/eos_overlay/eos_overlay.ts`
Overlay de EOS que se instala con Wine.

### Backend: `src/backend/main.ts` — secciones wine
- Importación de `DXVK`, `Winetricks`
- Llamadas a herramientas wine
- Configuración de wine tools
- Gestión de `winePrefix` en el inicio

### Backend: `src/backend/utils.ts` — secciones wine
- `compatibility_layers`
- `heroicInstallPath` relacionado con prefijos
- Funciones de wine

### Backend: `src/backend/storeManagers/storeManagerCommon/games.ts` — launchGame
272 líneas. Función `launchGame` compartida por todas las tiendas que ejecuta juegos con Wine/Proton.

### Backend: `src/backend/shortcuts/nonesteamgame/nonesteamgame.ts`
Añadir juegos a Steam con `relic://launch` y referencias a Wine/Proton.

### Backend: `src/backend/shortcuts/shortcuts/shortcuts.ts`
Atajos con `relic://launch` y argumentos de Wine/Proton.

### Backend: public/bin/
- `public/bin/x64/linux/vulkan-helper` (715 KB)
- `public/bin/arm64/linux/vulkan-helper` (707 KB)
Binarios ELF para helpers de Vulkan, usados en el lanzamiento de juegos.

### IPC (`src/common/types/ipc.ts`)
- `winetricksInstall`
- `winetricksInstalled`  
- `winetricksAvailable`
- `wine.isValidVersion`
- `wineVersionsUpdated`
- `'installing-winetricks-component'`

### Types (`src/common/types.ts`)
- `WineInstallation` (interface)
- `WineCommandArgs` (interface)
- `ProtonVerb` (type)
- `winePrefix`, `wineVersion`, `wineCrossoverBottle` en `GameSettings`/`InstallArgs`
- Winetricks en `path` enum

### Preload (`src/preload/api/wine.ts`)
API de preload dedicada a wine/winetricks/dxvk/vkd3d.

### Preload (`src/preload/api/helpers.ts`)
`runWineCommand`, `runWineCommandForGame`.

### Preload (`src/preload/api/misc.ts`)
Referencias a wine.

---

## Frontend Wine Manager

### `src/frontend/screens/WineManager/`
| Archivo | Propósito |
|---|---|
| `index.tsx` | Pantalla completa de gestión de Wine/Proton |
| `state.ts` | Estado del Wine Manager |
| `components/WineItem/index.tsx` | Item individual de Wine |
| `components/WineManagerSettingsModal.tsx` | Modal de configuración |

### `src/frontend/components/UI/Winetricks/`
| Archivo | Propósito |
|---|---|
| `index.tsx` | Componente Winetricks |
| `WinetricksSearch/index.tsx` | Búsqueda de componentes Winetricks |
| `index.scss` | Estilos |

### Frontend Settings Components
| Archivo | Propósito |
|---|---|
| `WineVersionSelector.tsx` | Selector de versión de Wine/Proton |
| `WinePrefix.tsx` | Configuración de prefijo de Wine |
| `WinePrefixesBasePath.tsx` | Ruta base de prefijos |
| `CrossoverBottle.tsx` | Botella de Crossover |
| `CustomWineProton.tsx` | Rutas personalizadas de Wine/Proton |
| `ShowValveProton.tsx` | Mostrar Proton de Valve |
| `DownloadProtonToSteam.tsx` | Descargar Proton a Steam |
| `DisableUMU.tsx` | Deshabilitar UMU |
| `PreferSystemLibs.tsx` | Preferir librerías del sistema (relacionado con Wine) |
| `SteamRuntime.tsx` | Steam Runtime para lanzamiento |
| `Tools/index.tsx` | Herramientas (DXVK, VKD3D, Winetricks) |
| `WineVersionSelector.tsx` | Versiones de Wine |

### Otros frontend con referencias a Wine/Proton
- `src/frontend/App.tsx` — imports de WineManager
- `src/frontend/components/UI/index.tsx` — imports de Winetricks, WineManager
- `src/frontend/components/UI/Sidebar/components/SidebarLinks/index.tsx` — enlace a Wine Manager
- `src/frontend/components/UI/Sidebar/components/SidebarTour.tsx` — tour referenciando Wine
- `src/frontend/components/UI/ProgressDialog/index.tsx` — progreso de winetricks
- `src/frontend/components/UI/UninstallModal/index.tsx` — desinstalación con prefijo
- `src/frontend/components/UI/EditGameDialog/index.tsx` — edición con winePrefix
- `src/frontend/screens/Game/GamePage/components/CompatibilityInfo.tsx` — info de compatibilidad
- `src/frontend/screens/Game/GamePage/components/InstalledInfo.tsx` — info de instalación (wine)
- `src/frontend/screens/Game/GamePage/components/AppleWikiInfo.tsx` — info para macOS
- `src/frontend/screens/Game/GamePage/components/MainButton.tsx` — botón principal con lanzamiento
- `src/frontend/screens/Game/GamePage/index.tsx` — página del juego con wine
- `src/frontend/screens/Game/GameSubMenu/index.tsx` — submenú con opciones de wine
- `src/frontend/screens/Game/GameContext.tsx` — contexto con winetricks
- `src/frontend/screens/Library/components/InstallModal/WineSelector/index.tsx` — selector de wine en instalación
- `src/frontend/screens/Library/components/InstallModal/index.tsx` — modal de instalación
- `src/frontend/screens/Library/components/InstallModal/DownloadDialog/index.tsx` — diálogo de descarga
- `src/frontend/screens/Library/components/InstallModal/SideloadDialog/index.tsx` — sideload con wine
- `src/frontend/screens/Library/components/InstallModal/ImportDialog/index.tsx` — importación con prefijo
- `src/frontend/screens/Library/components/InstallModal/ThirdPartyDialog/index.tsx` — third party con wine
- `src/frontend/screens/Library/components/GameCard/index.tsx` — tarjeta de juego con lanzamiento
- `src/frontend/screens/Library/components/GamesList/index.tsx` — lista con wine
- `src/frontend/screens/ConsoleMode/components/ConsoleCard/index.tsx` — modo consola con wine
- `src/frontend/screens/ConsoleMode/components/LaunchOverlay/index.tsx` — overlay de lanzamiento con winetricks
- `src/frontend/screens/ConsoleMode/InstallOverlay/index.tsx` — overlay de instalación con proton
- `src/frontend/screens/Settings/sections/GamesSettings/index.tsx` — settings de juegos (wine, dxvk, etc.)
- `src/frontend/screens/Settings/sections/GeneralSettings/index.tsx` — settings generales (wine)
- `src/frontend/screens/Settings/sections/AdvancedSettings/index.tsx` — settings avanzados (proton)
- `src/frontend/screens/Settings/sections/SyncSaves/index.tsx` — sincronización con prefijo
- `src/frontend/screens/Settings/sections/SyncSaves/legendary.tsx` — sync saves legendary con prefijo
- `src/frontend/screens/DownloadManager/DownloadManagerHeader/index.tsx` — wine en descargas
- `src/frontend/screens/WineManager/index.tsx` + `state.ts` + `components/` → pantalla completa
- `src/frontend/hooks/constants.ts` — constantes con winetricks, wine
- `src/frontend/state/GlobalState.tsx` — estado global con winetricks, wine
- `src/frontend/state/GlobalStateV2.ts` — estado v2 con wine
- `src/frontend/types.ts` — tipo `launching`

---

## 2. Proton

Comparte la mayoría de archivos con Wine (ver sección anterior). Adicionalmente:

- `src/backend/wiki_game_info/protondb/` — base de datos ProtonDB
  - `utils.ts`
  - `__tests__/utils.test.ts`
- `src/frontend/screens/Settings/components/DownloadProtonToSteam.tsx`
- `src/frontend/screens/Settings/components/ShowValveProton.tsx`
- `src/frontend/screens/Settings/components/DefaultSteamPath.tsx`
- `src/common/types.ts`: `ProtonVerb`, `protonVerb` en `WineCommandArgs`

---

## 3. Winetricks

Archivos dedicados:

- `src/backend/tools/index.ts` — funciones de winetricks
- `src/backend/tools/ipc_handler.ts` — IPC de winetricks
- `src/frontend/components/UI/Winetricks/` (directorio completo)
- `src/frontend/screens/Settings/components/Tools/index.tsx`
- `src/common/types/ipc.ts` — `winetricksInstall`, `winetricksInstalled`, `winetricksAvailable`
- `src/common/types.ts` — `'winetricks'` en path enum
- `src/preload/api/wine.ts` — funciones winetricks

Referencias en:
- `src/backend/launcher.ts`
- `src/backend/logger/constants.ts`
- `src/backend/main.ts`
- `src/frontend/screens/Game/GameContext.tsx`
- `src/frontend/hooks/constants.ts`
- `src/frontend/state/GlobalState.tsx`
- `src/frontend/types.ts`

---

## 4. DXVK

- `src/backend/tools/index.ts` — descarga/instalación de DXVK
- `src/backend/main.ts` — inicialización de DXVK
- `src/backend/config.ts` — `autoInstallDxvk`
- `src/backend/game_config.ts` — configuración por juego
- `src/frontend/screens/Settings/components/AutoDXVK.tsx`
- `src/frontend/screens/Settings/components/AutoDXVKNVAPI.tsx`
- `src/frontend/screens/Settings/components/EnableDXVKFpsLimit.tsx`
- `src/frontend/screens/Settings/sections/GamesSettings/index.tsx`
- `src/preload/api/wine.ts`
- `src/common/types/ipc.ts`
- `src/common/types.ts` — `'dxvk'`, `'dxvk-mac'` en path enum

---

## 5. VKD3D

- `src/backend/tools/index.ts` — descarga/instalación de VKD3D
- `src/backend/main.ts` — inicialización de VKD3D
- `src/backend/config.ts` — `autoInstallVkd3d`
- `src/backend/game_config.ts` — configuración por juego
- `src/backend/launcher.ts` — `autoInstallVkd3d` en lanzamiento
- `src/frontend/screens/Settings/components/AutoVKD3D.tsx`
- `src/frontend/screens/Settings/sections/GamesSettings/index.tsx`
- `src/preload/api/wine.ts`
- `src/common/types/ipc.ts`
- `src/common/types.ts` — `'vkd3d'` en path enum

---

## 6. MangoHud

- `src/backend/launcher.ts` — configuración MangoHud en lanzamiento
- `src/backend/game_config.ts` — `enableMangohud`
- `src/backend/main.ts` — verificación de MangoHud
- `src/backend/constants/environment.ts` — detección de flatpak/snap para MangoHud
- `src/backend/storeManagers/*/games.ts` — propagación de `enableMangohud`
- `src/frontend/screens/Settings/components/Mangohud.tsx`
- `src/frontend/screens/Settings/sections/GamesSettings/index.tsx`
- `src/frontend/screens/Settings/components/index.ts`
- `src/common/types.ts` — `enableMangohud` en GameSettings

---

## 7. Gamescope

- `src/backend/launcher.ts` — configuración Gamescope en lanzamiento
- `src/backend/game_config.ts` — `gamescope` settings
- `src/backend/main.ts` — verificación de Gamescope
- `src/backend/constants/environment.ts` — detección de Steam Deck
- `src/frontend/screens/Settings/components/Gamescope.tsx`
- `src/frontend/screens/Settings/sections/GamesSettings/index.tsx`
- `src/frontend/screens/Settings/components/index.ts`
- `src/common/types.ts` — `GameScopeSettings` (interface completa), `gamescope` en GameSettings

---

## 8. Launching (ejecución de juegos)

Relic NO debe lanzar juegos. El archivo central es `src/backend/launcher.ts` (2092 líneas).

### Archivos de lanzamiento:
- `src/backend/launcher.ts` — **núcleo del lanzador**
- `src/backend/protocol.ts` — manejador del protocolo `relic://launch`
- `src/backend/tray_icon/tray_icon.ts` — lanzamiento desde bandeja
- `src/backend/storeManagers/storeManagerCommon/games.ts` — `launchGame()`
- `src/backend/storeManagers/legendary/commands/launch.ts`
- `src/backend/shortcuts/nonesteamgame/nonesteamgame.ts` — atajos con `relic://launch`
- `src/backend/shortcuts/shortcuts/shortcuts.ts` — atajos Steam

### IPC de lanzamiento:
- `src/common/types/ipc.ts` — `launch`, `launchGame`

### Frontend de lanzamiento:
- `src/frontend/hooks/useLaunchOptions.ts`
- `src/frontend/screens/Settings/components/LaunchOptionSelector.tsx`
- `src/frontend/screens/Settings/components/AfterLaunchScriptPath.tsx`
- `src/frontend/screens/Settings/components/BeforeLaunchScriptPath.tsx`
- `src/frontend/screens/Settings/components/HideWindowOnProtocolLaunch.tsx`
- `src/frontend/screens/Settings/components/MinimizeOnGameLaunch.tsx`
- `src/frontend/screens/Game/GamePage/components/MainButton.tsx` — botón de jugar
- `src/frontend/screens/Game/GamePage/components/GameStatus.tsx` — estado de juego
- `src/frontend/screens/ConsoleMode/components/LaunchOverlay/index.tsx`
- `src/frontend/screens/ConsoleMode/components/BackHint/index.tsx`
- `src/frontend/screens/ConsoleMode/components/ConfirmDialog/index.tsx`
- `src/frontend/screens/ConsoleMode/components/ControllerHints/index.tsx`

---

## 9. Prefijos (winePrefix)

- `src/backend/constants/paths.ts` — `defaultWinePrefix`, `sharedWinePrefix`, `defaultWinePrefixDir`
- `src/backend/launcher.ts` — creación y gestión de prefijos
- `src/backend/config.ts` — `defaultWinePrefix`
- `src/backend/game_config.ts` — `winePrefix` por juego
- `src/backend/save_sync.ts` — localización de saves en prefijo
- `src/frontend/screens/Settings/components/WinePrefix.tsx`
- `src/frontend/screens/Settings/components/WinePrefixesBasePath.tsx`
- `src/frontend/screens/Settings/sections/SyncSaves/` — sincronización con prefijo
- `src/common/types.ts` — `winePrefix` en `GameSettings` e `InstallArgs`

---

## Resumen de archivos dedicados 100% a funcionalidades a eliminar

| Ruta | Líneas / Tamaño |
|---|---|
| `src/backend/launcher.ts` | ~2092 |
| `src/backend/wine/` (directorio completo) | ~20+ archivos |
| `src/backend/tools/` | ~3 archivos, ~900+ líneas |
| `src/backend/utils/compatibility_layers.ts` | ~581 |
| `src/backend/protocol.ts` | ~198 |
| `src/backend/storeManagers/storeManagerCommon/games.ts` | ~272 |
| `src/backend/storeManagers/legendary/commands/launch.ts` | ~28 |
| `src/backend/save_sync.ts` | ~216 |
| `src/backend/shortcuts/nonesteamgame/nonesteamgame.ts` | — |
| `src/backend/shortcuts/shortcuts/shortcuts.ts` | — |
| `src/frontend/screens/WineManager/` | ~7 archivos |
| `src/frontend/components/UI/Winetricks/` | ~3 archivos |
| `public/bin/` | ~1.4 MB en binarios ELF |
| `public/bin/legendary.LICENSE` | — |

**Total estimado: ~5000+ líneas de código y ~1.4 MB en binarios a eliminar**, sin contar las modificaciones necesarias en archivos compartidos (types, config, stores) que referencian estas funcionalidades.
