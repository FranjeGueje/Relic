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

## Flatpak / Flathub
- Directorios `flatpak/` y `flathub/` eliminados
- Scripts `dist:flatpak`, `flatpak:build`, `flatpak:prepare`, `flatpak:prepare-release`, `release:updateFlathub:ci` eliminados de package.json
- `isFlatpak` y `flatpakRuntimeVersion` eliminados de `environment.ts` y preload
- `flatpakHome` eliminado de `paths.ts`; reemplazado por `userHome` en `launcher.ts`
- Bloque de detección Steam Flatpak (~10 líneas) eliminado de `config.ts`
- `isAccessibleWithinFlatpakSandbox` y `validFlatpakPath` eliminados de filesystem, main.ts, DownloadDialog, types
- `isFlatpak` eliminado de systeminfo, plausible, nonesteamgame, Config (checkForUpdatesOnStartup, useGameMode)
- Componente OSInfo.tsx simplificado (quitado prop `isFlatpak` y texto Flatpak)
- `if (window.isFlatpak)` reemplazado por `if (false)` en EacRuntime.tsx y GameMode.tsx
- `FlatpakAppID` eliminado de `steam-shortcut-editor.d.ts`
- Mención Flatpak eliminada del Snap warning en main.ts
- `Steam Flatpak` eliminado de WineVersionSelector.tsx
- Clave `flatpak-path-not-writtable` eliminada de traducciones (47 archivos)
- Clave `osNameFlatpak` eliminada de traducciones (13 archivos)
- Badge Flathub, sección Flatpak, y referencia eliminados de README.md
- Entradas Flatpak eliminadas de CHANGELOG.md, .prettierignore, .gitignore, tsconfig.eslint.json, ROADMAP_REMOVE.md

## Start Tour
- Componentes `Tour.tsx`, `TourButton.tsx`, `Tour.scss`, `TourButton.scss` eliminados
- `TourContext.tsx` (estado + localStorage) eliminado
- `LibraryTour.tsx` y `SidebarTour.tsx` eliminados
- `TourProvider` eliminado de `App.tsx`
- Botones `TourButton` eliminados de `ActionIcons` y `RelicVersion`
- Imports `faTags`/`faStore`/`faUniversalAccess` eliminados
- Claves `tour.*` eliminadas de 47 archivos de traducción

## Accesibilidad
- Directorio `screens/Accessibility/` eliminado (index.tsx + index.css)
- Ruta `/accessibility` y sidebar link eliminados
- Estado `zoomPercent`, `setZoomPercent`, `primaryFontFamily`, `secondaryFontFamily`, `setPrimaryFontFamily`, `setSecondaryFontFamily` eliminados de `GlobalState.tsx`, `ContextProvider.tsx`, `types.ts`
- Reglas CSS `.Accessibility` eliminadas de `Settings/index.css`
- Claves `accessibility.*` y `help.analytics` eliminadas de 47 traducciones

## Deals (Discounts) y Stores
- Directorios `screens/Discounts/` y `backend/discounts/` eliminados
- Archivo `common/types/discounts.ts` eliminado
- IPC `getGogDiscounts`, `getGmgDiscounts`, `CatalogLocaleSettings`, `CatalogProduct` eliminados
- Preload helpers `getGogDiscounts`, `getGmgDiscounts` eliminados
- Sidebar: sección Stores completa (submenú Epic/GOG/Amazon/Zoom) y link Deals eliminados
- Iconos `faStore`, `faTags` eliminados
- Rutas `store/:store`, `store-page`, `discounts` eliminadas de `App.tsx`
- WebView: URLs de store, `validStoredUrl`, navegación guardada, adtraction eliminados
- Botón "View in Store" eliminado de `GameSubMenu`
- Claves `discounts.*`, `stores`, `store`, `gog-store`, `amazon-luna`, `zoom-store`, `adtraction-locked` eliminadas de 47 traducciones

## Analytics (Plausible)
- `AnalyticsDialog.tsx` (modal de inicio) eliminado
- `AnalyticsOptIn.tsx` (toggle en settings) eliminado
- `backend/utils/plausible.ts` (servicio Plausible) eliminado
- `AnalyticsDialog` eliminado de `App.tsx`
- `startPlausible` eliminado de `backend/main.ts`
- Estado `analyticsOptIn` eliminado de `common/types.ts`, `backend/config.ts`
- Claves `analyticsModal.*`, `help.analytics` eliminadas de 47 traducciones

## Settings > General (varios toggles)
- `WinePrefixesBasePath.tsx` eliminado (setting `defaultWinePrefixDir` conservada)
- `EgsSettings.tsx` + `egsSync` IPC + `toggleGamesSync` + `egsLinkedPath` eliminados por completo
- `CheckUpdatesOnStartup.tsx` eliminado (setting `checkForUpdatesOnStartup` conservada)
- `MinimizeOnGameLaunch.tsx` eliminado (setting `minimizeOnLaunch` conservada)
- `UseDarkTrayIcon.tsx` eliminado (setting `darkTrayIcon` conservada)
- `UseFramelessWindow.tsx` eliminado (setting `framelessWindow` conservada)
- `PlaytimeSync.tsx` eliminado (setting `disablePlaytimeSync` conservada)
- `Shortcuts.tsx`: toggles `addDesktopShortcuts` y `addStartMenuShortcuts` eliminados (settings conservadas)
- Claves de traducción asociadas eliminadas de 47 archivos

## Custom Themes Path y Custom CSS
- `CustomCSS.tsx` (textarea CSS) eliminado
- `ThemeSelector`: path picker, wiki link, warning, `hasHelp`, `getCustomThemes`, estado `themesPath` eliminados
- `index.tsx`: `window.setCustomCSS`, `getCustomCSS`, carga de CSS de temas personalizados en `setTheme` eliminados
- Handlers `getCustomThemes`, `getThemeCSS`, `getCustomCSS`, `openCustomThemesWiki` eliminados de backend + IPC + preload
- Tipo `customCSS`, `customThemesPath`, `setCustomCSS` eliminados
- `<style id="customCSS">` eliminado de `index.html`
- Estilos `.customCSSArea`, `.customCSSWarning` eliminados
- `customThemesWikiLink` eliminado de `urls.ts`
- Claves de traducción eliminadas de 47 archivos

## Hide Changelogs on Startup
- `HideChangelogOnStartup.tsx` eliminado
- Estado `hideChangelogsOnStartup`, `setHideChangelogsOnStartup` eliminados de types/state/context/config
- `RelicVersion` simplificado (siempre muestra changelog si cambió versión)
- Clave `setting.hideChangelogsOnStartup` eliminada de 47 traducciones

## Start in Console Mode (siempre activo)
- `StartInConsoleMode.tsx` eliminado
- Campo `startInConsoleMode` eliminado de types/config
- `backend/main.ts`: redirección siempre a `/console`
- Clave `setting.start_in_console_mode` eliminada de 47 traducciones

## Tray Icon (noTrayIcon y exitToTray)
- `TraySettings.tsx` eliminado (contenía toggles noTrayIcon, exitToTray, startInTray)
- `tray_icon/tray_icon.ts`: check `noTrayIcon`, lógica `exitToTray`, listener `changeTrayColor` eliminados
- `backend/main.ts`: bloque `exitToTray && !noTrayIcon` eliminado; `startInTray` simplificado
- `backend/launcher.ts`: `noTrayIcon` eliminado de condición `minimizeOnLaunch`
- Tipos `exitToTray`, `noTrayIcon`, `changeTrayColor` eliminados
- Claves `setting.no-tray-icon`, `setting.exit-to-tray` eliminadas de 47 traducciones

## Disable Controller (siempre activo)
- `DisableController.tsx` eliminado
- `gamepad.ts`: variable `controllerIsDisabled`, check, y `toggleControllerIsDisabled` eliminados
- Campo `disableController` eliminado de types
- Clave `setting.disable_controller` eliminada de 47 traducciones

## Library Top Section y Max Recent Games
- `LibraryTopSection.tsx` y `MaxRecentGames.tsx` eliminados
- Campos `libraryTopSection`, `maxRecentGames`, tipo `LibraryTopSectionOptions` eliminados de `common/types.ts`
- `libraryTopSection`, `handleLibraryTopSection` eliminados de `frontend/types.ts`, `GlobalState.tsx`, `ContextProvider.tsx`
- `libraryTopSection` eliminado de `backend/config.ts`
- `backend/recent_games/recent_games.ts`: límite hardcodeado a 5 (ya no lee de settings)
- `Library/index.tsx`: sección RecentlyPlayed y sección automática Favourites eliminadas
- `RecentlyPlayed/index.tsx`: límite hardcodeado a 5
- Claves `setting.libraryTopSection`, `setting.maxRecentGames` eliminadas de 47 traducciones

## Movimientos en Settings
- `VerboseLogs` movido de GamesSettings a GeneralSettings
- `SteamGridDbApiKey`, `ClearCache`, `ResetRelic` movidos de AdvancedSettings a GeneralSettings

## Reordenamiento Sidebar
- "Gestionar cuentas" movido debajo de "Biblioteca"
- "Descargas" movido debajo de "Ajustes"

## URLs rotas de github.com/anomalyco/relic
- `urls.ts`: eliminados `sidInfoUrl`, `relicGithubURL`, `GITHUB_API`, `supportURL`, `wikiLink`
- `updater.ts` (auto-updater de electron) eliminado
- `utils/releases.ts` (fetch de releases info) eliminado
- `backend/main.ts`: listeners `openSupportPage`, `openReleases`, `openWikiLink`, `openSidInfoPage` eliminados
- `main.ts`: import y llamada `fetchLastestReleases` eliminados; handler `getLatestReleases` y `getCurrentChangelog` eliminados; import `autoUpdater` eliminado
- `common/types/ipc.ts`: tipos `openSupportPage`, `openReleases`, `openWikiLink`, `openSidInfoPage`, `getLatestReleases`, `getCurrentChangelog` eliminados
- `preload/api/helpers.ts`: `openSidInfoPage`, `openSupportPage` eliminados
- `preload/api/misc.ts`: `getLatestReleases`, `getCurrentChangelog` eliminados
- `frontend/helpers/index.ts`: `sidInfoPage` eliminado
- `SIDLogin/index.tsx`: spans con `sidInfoPage` eliminados
- `RelicVersion`: simplificado (sin changelog modal, sin check de nuevas releases)
- `ChangelogModal/` directorio eliminado
- `backend_events.ts`: evento `releasesInfoReady` y tipo `ReleasesInfo` eliminados
- `anticheat/ipc_handler.ts`: listener `releasesInfoReady` eliminado
- `tools/dxmt.ts`: listener `releasesInfoReady` eliminado
- `wine/manager/ipc_handler.ts`: listener `releasesInfoReady` e import eliminados
- `wine/manager/utils.ts`: función `updateWineListsIfOutdated` e import `ReleasesInfo` eliminados
- `downloadmanager/utils.ts`: `downloadFixesFor` (known-fixes URL) eliminado
- `anticheat/utils.ts`: URL MacAnticheatData eliminada (usaba `isMac`)
- `utils.ts`: `getLatestReleases`, `getCurrentChangelog`, `GITHUB_API`, website about eliminados
- `tools/index.ts`: URLs en comentarios y mensajes eliminadas
- `launcher.ts`: comentario issue #4708 eliminado
- `package.json`: repository URL actualizada a FranjeGueje/Relic
- Test data de tests de `getLatestReleases` eliminados

## Wine Manager (gestión de Wine/Proton)
- Directorio `backend/wine/manager/` eliminado (wine downloader, utils, ipc_handler)
- Directorio `frontend/screens/WineManager/` eliminado
- Directorio `frontend/components/UI/Winetricks/` eliminado
- Ruta `/wine-manager` y sidebar link eliminados
- `backend/main.ts`: imports `DXVK`, `Winetricks`, `downloadDefaultWine`, `checkRosettaInstall` eliminados; handlers `toggleDXVK`, `toggleDXVKNVAPI`, `toggleVKD3D` eliminados
- `backend/config.ts`: import `updateWineVersionInfos`/`wineDownloaderInfoStore` y llamada eliminados
- `backend/utils.ts`: import `installWineVersion`/`updateWineVersionInfos`/`wineDownloaderInfoStore` eliminados; función `downloadDefaultWine` eliminada
- `backend/tools/dxmt.ts`: import `wineDownloaderInfoStore` eliminado
- `frontend/screens/Settings/components/Tools/index.tsx`: Winetricks eliminado
- `frontend/components/UI/index.tsx`: export `Winetricks` eliminado
- `backend/tools/ipc_handler.ts`: handlers `winetricksInstall`, `winetricksAvailable`, `winetricksInstalled` eliminados

## GE-Proton y Proton-CachyOS (referencias eliminadas)
- `common/types.ts`: `'GE-Proton'` y `'Proton-CachyOS'` eliminados del type `Type`; `Repositorys` enum, `WineManagerStatus`, `WineManagerUISettings` eliminados; `'ge-proton'` y `'proton-cachyos'` eliminados de `ReleasesInfo`
- `DownloadProtonToSteam.tsx` y `ShowValveProton.tsx` eliminados
- `AutoDXVK.tsx`, `AutoDXVKNVAPI.tsx`, `AutoVKD3D.tsx` eliminados
- `backend/launcher.ts`: `DXVK`, `Winetricks` imports y usos eliminados; comentarios actualizados
- `backend/tools/index.ts`: módulo `Winetricks` completo eliminado
- `backend/tools/ipc_handler.ts`: `Winetricks` import y handlers eliminados
- `backend/utils.ts`: comentario GE-Proton actualizado
- `preload/api/wine.ts`: exports de Winetricks, WineManager, DXVK/VKD3D eliminados
- `frontend/state/GlobalStateV2.ts`: `refreshingWineVersions` y `refreshWineVersions` eliminados
- `WineVersionSelector.tsx`: logos GE y CachyOS eliminados, `handleWineVersionsUpdated` eliminado
- `common/types/ipc.ts`: tipos Winetricks, WineManager, DXVK/VKD3D eliminados
- `common/types.ts`: `downloadProtonToSteam` eliminado

## Dependencias no usadas eliminadas
- `react-markdown`, `rehype-raw`, `intro.js`, `intro.js-react` eliminados de `package.json` (ningún import en `src/`)

## Componentes frontend macOS-only
- `AdvertiseAvxForRosetta.tsx`, `CrossoverBottle.tsx`, `EnableMsync.tsx` eliminados
- `AppleWikiInfo.tsx` y `MacOSCompatibility/index.scss` eliminados
- Referencia `wineCrossoverBottle` eliminada de `InstalledInfo.tsx`
- Limpiados imports/exports en `components/index.ts`, `GamesSettings/index.tsx`, `GamePage/index.tsx`

## AppleGamingWiki (backend)
- Directorio `backend/wiki_game_info/applegamingwiki/` eliminado (utils, constants, tests)
- Interfaz `AppleGamingWikiInfo` y campo `applegamingwiki` eliminados de `common/types.ts`
- Referencias a `applegamingwiki` eliminadas de `GamePage/index.tsx` y `ClearCache.tsx`

## Referencias a "Heroic" en URLs
- `common/types/legendary.ts`: comentario URL actualizado
- `backend/tools/index.ts`: URLs de Heroic-Games-Launcher/vkd3d-proton cambiadas a HansKristian-Work/vkd3d-proton

## Settings Windows-only sin UI
- `addStartMenuShortcuts` eliminado de `common/types.ts`, `backend/config.ts`, `shortcuts/shortcuts.ts`

## Game Defaults (GamesSettings)
- Directorio `sections/GamesSettings/` eliminado
- Sidebar link a `/settings/games_settings` eliminado
- Import y renderizado eliminados de `Settings/index.tsx`, `SettingsModal/index.tsx`, `sections/index.tsx`

## Advanced Settings
- Directorio `sections/AdvancedSettings/` eliminado
- Sidebar link a `/settings/advanced` eliminado
- Botones "Settings → Advanced" en `EditGameDialog` y `SideloadDialog` eliminados (cambiados a "Settings → General")
- Imports y renders eliminados de `Settings/index.tsx`, `sections/index.tsx`

## Add Game (botón + diálogo)
- `AddGameButton.tsx` y `SideloadDialog/` eliminados
- `EmptyLibraryMessage.tsx` eliminado
- `handleAddGameButtonClick` eliminado de `LibraryContext`, `types.ts`, `Library/index.tsx`
- `AddGameButton` eliminado de `LibraryHeader`
- `InstallModal`: lógica `isSideload`, `sideloadTitle`, Browser platform, y renderizado de SideloadDialog eliminados

## System Information (Settings)
- Directorio `sections/SystemInfo/` eliminado
- Sidebar link, imports, y renderizados eliminados de `Settings/index.tsx`, `sections/index.tsx`, `SidebarLinks`

## Sync Saves
- Directorio `sections/SyncSaves/` eliminado (gog.tsx, legendary.tsx, index.tsx)
- `CloudSavesSync.tsx` eliminado (GamePage)
- `backend/save_sync.ts` eliminado
- Handlers `syncSaves`, `syncGOGSaves`, `getDefaultSavePath` eliminados de `backend/main.ts`
- `syncSaves`, `getDefaultSavePath` eliminados de preload e IPC types
- `autoSyncSaves` eliminado de `common/types.ts`, `game_config.ts`, `launcher.ts`
- `syncSaves` eliminado de `frontend/helpers/index.ts` (función y export)
- `isSyncSettings` y sidebar link eliminados

## Log Settings (botones de log)
- Botones "Show log file in folder", "Upload log file", "Show uploaded log files" eliminados de `LogSettings/index.tsx`
- `LogFileUploadDialog/` y `UploadedLogFilesList/` directorios eliminados
- `backend/logger/uploader.ts` eliminado
- Handlers IPC `showLogFileInFolder`, `uploadLogFile`, `deleteUploadedLogFile`, `getUploadedLogFiles` eliminados
- Tipos IPC `logFileUploaded`, `logFileUploadDeleted`, `UploadedLogData` eliminados de `ipc.ts`
- `frontend/state/UploadedLogFiles.ts` eliminado
- `uploadLogFileProps`, `setUploadLogFileProps`, `showUploadedLogFileList` eliminados de `GlobalStateV2.ts`
- Imports y renders eliminados de `App.tsx`

## Log Settings (logs por juego)
- Eliminada la lista de logs por juego (installedGames y su useEffect)
- `LogSettings` simplificado: solo muestra logs de Relic, Epic/Legendary, GOG, Amazon/Nile
- Eliminados imports de `SettingsContext`, `ContextProvider`, `GameInfo`

## GameCard
- Botón de Settings (icono a la izquierda del menú de tres puntos) eliminado
- Botón verde de PLAY eliminado para juegos instalados
- "Edit Game", "Categories", "Launch Game" eliminados del menú contextual
- Imports no usados limpiados (`SettingsIcon`, `EditGameDialog`, `openInstallGameModal`, `isSideloaded`, `PlayIcon`, `PlayArrow`)

## GamePage
- Botón de Settings (`SettingsButton.tsx`) eliminado de la página de detalle

## GameSubMenu (menú de tres puntos en GamePage)
- Eliminadas opciones: "Edit Game", "Add Shortcut", "Change Install Location", "Add to Steam", "Categories", "Browse Wine Prefix"
- Funciones removidas: `handleEdit`, `handleShortcuts`, `handleChangeInstall`/`onChangeInstallYesClick`, `handleAddToSteam`, `onBrowsePrefix`
- Estados removidos: `steamRefresh`/`setSteamRefresh`, `addedToSteam`/`setAddedToSteam`, `hasShortcuts`/`setHasShortcuts`
- Imports limpiados: `useGlobalState`, `openInstallGameModal`, `EditGameDialog`, `EditIcon`, `ShortcutIcon`, `FindInPageIcon`, `FormatListBulletedIcon`, `faSteam`, `faWineGlass`, `NavLink`

## Wine/Proton del frontend

### Archivos eliminados
- `Settings/components/`: `WinePrefix.tsx`, `WineVersionSelector.tsx`, `CustomWineProton.tsx`, `DefaultSteamPath.tsx`, `EnableEsync.tsx`, `EnableFsync.tsx`, `EnableWineWayland.tsx`, `EnableWoW64.tsx`, `PreferSystemLibs.tsx`, `SteamRuntime.tsx`, `DisableUMU.tsx`, `EnableDXVKFpsLimit.tsx`, `EnableFSR.tsx`, `EacRuntime.tsx`, `GameMode.tsx`, `Tools/` (winecfg)
- `Game/GamePage/components/`: `CompatibilityInfo.tsx` (ProtonDB)

### Settings
- Eliminados todos los exports de los componentes borrados en `components/index.ts`
- Eliminado `defaultWineVersion` y su import `WineInstallation` de `Settings/index.tsx`
- Eliminado `<DefaultSteamPath />` de `GeneralSettings`

### GamePage
- Eliminado `isInstallingWinetricksPackages` de `GamePage/index.tsx`
- Eliminado `installingWinetricksPackages` del contexto en `GamePage/index.tsx`
- Eliminado `is.installingWinetricksPackages` de `MainButton.tsx` (disabled + label)
- Eliminado `CompatibilityInfo` import, barrel export y JSX de GamePage

### GameContext & types
- Eliminado `installingWinetricksPackages: boolean` de `types.ts`
- Eliminado `installingWinetricksPackages: false` de `GameContext.tsx`

### GameCard
- Eliminado `isInstallingWinetricksPackages` de `constants.ts`

### UninstallModal
- Eliminado checkbox "Remove prefix" y toda la lógica asociada (`winePrefix`, `deletePrefixChecked`, `disableDeleteWine`)

### ConsoleMode
- Eliminado `'winetricks'` de `ACTIVE_STATUSES` en `ConsoleCard`
- Eliminado `case 'winetricks'` de `LaunchOverlay`
- Eliminado comentario "via Wine/Proton" de `InstallOverlay`

### Estado global & hooks
- Eliminado `wineVersions` state e import de `WineVersionInfo` de `GlobalState.tsx`
- Eliminado `wineDownloaderInfoStore` de imports en `GlobalState.tsx`
- Eliminado `'winetricks'` de arrays `allowed` y `allowedPendingOps` en `GlobalState.tsx`
- Eliminado `winetricks` de `hooks/constants.ts`
- Renombrado `winetricksOutputBottomRef` → `logRef` en `ProgressDialog`

## Tiempo de juego (Playtime)
- Eliminado directorio `Game/TimeContainer/` (componente + CSS)
- Eliminado import y `<TimeContainer />` de `GamePage/index.tsx`
- Eliminado `timestampStore` de `frontend/helpers/electronStores.ts` (declaración + export)
- Eliminado `fetchPlaytimeFromServer` de `preload/api/misc.ts`

## Lanzamiento de juegos (PLAY / JUGAR AHORA)
- Eliminados archivos: `MainButton.tsx`, `LaunchOverlay/`, `useLaunchOptions.ts`, `LaunchOptionSelector.tsx`
- Eliminados exports de `MainButton` y `LaunchOptionSelector` de barrel files
- `GamePage/index.tsx`: eliminado `handlePlay`, `playClicked`, `MainButton`, `LaunchOptionSelector`, imports de `launch`/`sendKill`
- `GameCard/index.tsx`: eliminado `handlePlay`, `isLaunching`/`setIsLaunching`, imports de `launch`/`install`; stop/cancel buttons ahora usan `sendKill` directo
- `ConsoleMode/index.tsx`: eliminado `launchingGame`/`setLaunchingGame`, `handleLaunchWithoutUpdate`, `<LaunchOverlay>`, CSS class `launching`
- `helpers/gamepad.ts`: eliminado `playGame()` y `playable()`
- `helpers/index.ts`: eliminado `launch` de import y export
- `helpers/library.ts`: eliminado `launch` de export (función interna ahora inaccesible)

## Protocolo relic://
- Eliminado `src/backend/protocol.ts` (handleProtocol completo)
- Eliminado `src/backend/__tests__/protocol.test.ts`
- `src/backend/main.ts`: eliminado registro de protocolo, import y llamadas a `handleProtocol`, handler `open-url` de macOS, variable `openUrlArgument`
- `src/backend/tray_icon/tray_icon.ts`: click de juegos recientes ahora solo muestra la ventana
- `src/backend/shortcuts/`: eliminados `relic://launch` de shortcuts; apuntan al binario de Relic
- `src/backend/config.ts` + `src/common/types.ts`: eliminado `hideWindowOnProtocolLaunch`
- `src/frontend/`: eliminado `HideWindowOnProtocolLaunch.tsx` y su export

## ExtraGameInfo (PCGamingWiki, HLTB, ProtonDB, SteamDeck, GamesDB, UMU)
- Eliminado `src/backend/wiki_game_info/` (directorio completo con orquestador, IPC handler, stores, mocks + 6 scrapers + tests)
- Eliminado `src/frontend/components/UI/WikiGameInfo/` (HLTB + GameScore con SCSS)
- Eliminado `src/frontend/screens/Game/GamePage/components/Scores.tsx` y `HLTB.tsx`
- `GamePage/index.tsx`: eliminado `wikiInfo` state/useEffect/context, `<Scores>`, `<HLTB>`, tab "Extra info", `WikiInfo` de imports
- `GamePage/components/index.tsx`: eliminados exports de `Scores` y `HLTB`
- `GameContext.tsx`: eliminado `wikiInfo: null`
- `frontend/types.ts`: eliminado `wikiInfo: WikiInfo | null` de GameContextType
- `GameSubMenu/index.tsx`: eliminado `getWikiGameInfo` call
- `preload/api/misc.ts`: eliminado `getWikiGameInfo` invoker
- `common/types.ts`: eliminados `WikiInfo`, `PCGamingWikiInfo`, `GamesDBInfo`, `ProtonDBCompatibilityInfo`, `SteamDeckComp`, `SteamInfo`, `GameScoreInfo`
- `common/types/ipc.ts`: eliminado `getWikiGameInfo` de AsyncIPCFunctions
- `common/types/electron_store.ts`: eliminado `wikigameinfo` del schema
- `backend/`: eliminado `getUmuId` de store managers (gog, legendary, nile, zoom), eliminado import de `ipc_handler` en main.ts
- `backend/shortcuts/__tests__/`: eliminado `jest.mock` de `wiki_game_info`

## AntiCheat (AreWeAntiCheatYet)
- Eliminado `src/backend/anticheat/` (utils + ipc_handler)
- Eliminado `src/frontend/components/UI/Anticheat/` (componente + SCSS)
- Eliminado `src/frontend/hooks/hasAnticheatInfo.ts`
- Eliminado `src/frontend/screens/Settings/components/AllowInstallationBrokenAnticheat.tsx`
- `backend/main.ts`: eliminado import de `anticheat/ipc_handler`
- `backend/launcher.ts`: eliminado `gameAnticheatInfo` import y logging
- `GamePage/index.tsx`: eliminado `Anticheat` import, `hasAnticheatInfo`, `<Anticheat>`
- `DownloadDialog/index.tsx`: eliminado `Anticheat`, `hasAnticheatInfo`, `confirmInstallBrokenAnticheat`, anticheat check en `handleInstall`
- `ThirdPartyDialog/index.tsx`: eliminado `Anticheat`, `hasAnticheatInfo`, `<Anticheat>`
- `Settings/components/index.ts`: eliminado export de `AllowInstallationBrokenAnticheat`
- `preload/api/misc.ts`: eliminado `getAnticheatInfo`
- `common/types.ts`: eliminados `AntiCheat`, `AntiCheatInfo`, `AntiCheatReference`, `allowInstallationBrokenAnticheat`, `anticheatFiles`
- `common/types/ipc.ts`: eliminado `AntiCheatInfo` import y `getAnticheatInfo`

## Game Override API (relic.legendary.gl)
- `backend/storeManagers/legendary/library.ts`: eliminadas funciones `getGameOverride()` y `getGameSdl()` (fetch a `relic.legendary.gl`)
- `backend/storeManagers/legendary/electronStores.ts`: eliminado `gamesOverrideStore`
- `backend/main.ts`: eliminados handlers `getGameOverride` y `getGameSdl`
- `common/types/legendary.ts`: eliminados `GameOverride`, `ResponseDataLegendaryAPI`
- `common/types/ipc.ts`: eliminados `getGameOverride` y `getGameSdl` de AsyncIPCFunctions
- `preload/api/library.ts`: eliminados `getGameOverride` y `getGameSdl` invokers
- `frontend/DownloadDialog`: eliminado `useEffect` que llamaba `getGameOverride` + `getGameSdl`

## Fase 3: Limpieza gestión Wine/Proton

### tools/ (DXVK, VKD3D, DXMT, Winetricks)
- Directorio `backend/tools/` eliminado (index.ts, ipc_handler.ts, dxmt.ts)
- `runWineCommandOnGame` movido a `launcher.ts`
- `main.ts`: import `tools/ipc_handler` eliminado
- `ipc.ts`: tipos `callTool`, `runWineCommandForGame`, `toggleDXVK`, `toggleVKD3D`, `toggleDXVKNVAPI`, imports `Tools`, `ToolArgs`, `RunWineCommandArgs` eliminados
- `types.ts`: interfaces `Tools`, `Tool`, `ToolArgs`, `RunWineCommandArgs` eliminados
- `preload/helpers.ts`: `runWineCommandForGame` eliminado
- `preload/misc.ts`: `callTool` eliminado

### CrossOver
- `launcher.ts`: `getCrossoverBottleFolder` completa, CrossOver bottle verify, `case 'crossover'` en setupWineEnvVars, `wineCrossoverBottle` de filterGameSettingsForLog, `prefixOrBottleFolder` simplificado eliminados
- `compatibility_layers.ts`: `getCrossover()` completa y `case 'crossover'` eliminados
- `config.ts`: import y llamada `getCrossover()` eliminados
- `game_config.ts`: `wineCrossoverBottle` eliminado
- `commands/launch.ts`: flags `--crossover`, `--crossover-app`, `--crossover-bottle` eliminados
- `main.ts`: `wineCrossoverBottle` de handler importGame eliminado
- `types.ts`: `wineCrossoverBottle` de GameSettings e ImportGameArgs eliminados

### Lutris
- `types.ts`: `'Wine-Lutris'` del type `Type` eliminado
- `compatibility_layers.ts`: detección de Wine de Lutris (`.local/share/lutris`) eliminada
- `wine/runtimes/runtimes.ts`: fetch a `lutris.net/api/runtimes` eliminado; `_get()` eliminado; `download()`/`isInstalled()` simplificados a local check

### wine/runtimes/
- `runtimes.ts`: simplificado (sin lutris API, solo check local)
- `ipc_handler.ts` eliminado
- `ipc.ts`: `downloadRuntime`, `isRuntimeInstalled` eliminados de AsyncIPCFunctions
- `preload/wine.ts`: `downloadRuntime`, `isRuntimeInstalled` invokers eliminados
- `types.ts`: `RuntimeName` simplificado a solo `'umu'`

## Fase 2: Settings Wine prohibidas
- Archivos `.tsx` eliminados: `EnvVariablesTable.tsx`, `WrappersTable.tsx`, `LauncherArgs.tsx`, `NvidiaPrime.tsx`, `ShowFPS.tsx`, `BattlEyeRuntime.tsx`
- `components/index.ts`: exports limpiados
- `common/types.ts`: eliminados de `GameSettings`: `autoInstallDxvk`, `autoInstallVkd3d`, `autoInstallDxvkNvapi`, `battlEyeRuntime`, `DXVKFpsCap`, `eacRuntime`, `enableDXVKFpsLimit`, `enableEsync`, `enableFSR`, `enableMsync`, `enableFsync`, `enableWineWayland`, `enableHDR`, `enableWoW64`, `enviromentOptions`, `launcherArgs`, `nvidiaPrime`, `preferSystemLibs`, `showFps`, `useGameMode`, `useSteamRuntime`, `wrapperOptions`, `advertiseAvxForRosetta`. Eliminado `customWinePaths` de `AppSettings`. Eliminados `LaunchPreperationResult.gameModeBin` y `steamRuntime`. Eliminados tipos `EnviromentVariable` y `WrapperVariable`.
- `backend/config.ts`: defaults de todos los settings eliminados
- `backend/game_config.ts`: lectura/escritura eliminada
- `backend/launcher.ts`: `filterGameSettingsForLog` simplificado; GameMode check eliminado; SteamRuntime completo eliminado; EAC/BattlEye downloads eliminados; `setupEnvVars` simplificado (nvidiaPrime, showFps, enviromentOptions); `setupWineEnvVars` simplificado (env vars Esync/Fsync/FSR/WineWayland/WoW64/DXVKFps/HDR/EAC/BattlEye/preferSystemLibs eliminados); `setupWrappers` simplificado (sin args, retorna [])
- `backend/storeManagers/`: `launcherArgs` eliminado de legendary/gog/nile/zoom; `gameModeBin`/`steamRuntime` destructuring de `prepareLaunch` eliminado; `setupWrappers()` simplificado
- `backend/utils/compatibility_layers.ts`: `getCustomWinePaths` simplificado; `showValveProton` eliminado
- `common/types.ts`: `showValveProton` eliminado de comentarios de JSDoc en shortcuts

## EOS Overlay
- Directorio `backend/storeManagers/legendary/eos_overlay/` eliminado (eos_overlay.ts + ipc_handler.ts)
- `backend/storeManagers/legendary/commands/eos_overlay.ts` eliminado
- `commands/index.ts`: import y type union de `EosOverlayCommand` eliminados
- `setup.ts`: import de `enable`/`getStatus`/`isEnabled` y bloque auto-enable EOS Overlay eliminados
- `library.ts`: case `'eos-overlay'` eliminado
- `launcher.ts`: import `isEnabled` y EOS status logging eliminados
- `main.ts`: import de `eos_overlay/ipc_handler` eliminado
- `common/types/ipc.ts`: 8 tipos IPC EOS Overlay eliminados
- `preload/api/menu.ts`: 4 invokers EOS Overlay eliminados
- `preload/api/settings.ts`: 4 invokers EOS Overlay eliminados
- `frontend/GameSubMenu/index.tsx`: state, useEffect, handleEosOverlay, JSX toggle button, import PictureInPictureIcon eliminados
- `CurrentDownload/index.tsx`: hack de título EOS Overlay eliminado

## Wine Full Removal (types + dependencias)
- `common/types.ts`: eliminados todos los tipos Wine (`WineInstallation`, `SteamRuntime`, `Runtime`, `RuntimeName`, `WineCommandArgs`, `ProtonVerb`, union `Type`, `VersionInfo`, `WineVersionInfo`, `ReleasesInfo`); eliminados `winePrefix`/`wineVersion` de `GameSettings` e `ImportGameArgs`; eliminados `sharedWinePrefix`/`defaultWinePrefix`/`defaultWinePrefixDir` de `AppSettings`
- `backend/config.ts`: import `WineInstallation` eliminado; funciones `getMacOsWineSet`, `getAlternativeWine` eliminadas; defaults Wine eliminados
- `backend/launcher.ts`: `setupWineEnvVars`, `verifyWinePrefix`, `validWine`, `getWinePath`, `runWineCommand`, `runWineCommandOnGame`, `prepareWineLaunch` eliminados; `setupWrappers` reducido a stub que retorna `[]`; referencias a `gameSettings.winePrefix` eliminadas
- `backend/game_config.ts`: `winePrefix`/`wineVersion` eliminados
- `backend/utils/compatibility_layers.ts`: reducido solo a `getUmuPath`/`isUmuSupported` (todo Wine detection eliminado)
- `backend/utils.ts`: `getWineFromProton`, `shutdownWine`, `killWineGame`, `getSteamRuntime` eliminados
- `backend/utils/__tests__/compatibility_layers.test.ts`: eliminado (testeaba funciones Wine eliminadas)
- `backend/main.ts`: handlers `runWineCommand`, `wine.isValidVersion`, `installWineVersion`, `refreshWineVersionInfo`, `removeWineVersion`, `getAlternativeWine` eliminados
- `backend/backend_events.ts`: eventos `wineVersionInfoReady` y tipo `WineVersionInfo` eliminados
- `backend/electron_store.ts` (common/types): `wine-releases` del schema eliminado
- `backend/wine/runtimes/runtimes.ts`: dependencia `RuntimeName` eliminada
- `backend/storeManagers/`: todos los imports/usos de `setupWrappers()` ahora importan stub de launcher; `shutdownWine` eliminado de sideload; `runWineCommand` eliminado de storeManagerCommon
- `common/types/ipc.ts`: todos los tipos IPC Wine eliminados de `AsyncIPCFunctions`
- `preload/api/wine.ts`: archivo eliminado
- `preload/api/index.ts`: import y spread de `Wine` eliminados
- `preload/api/helpers.ts`: `runWineCommand` eliminado
- `preload/api/misc.ts`: `getAlternativeWine` eliminado
- `frontend/helpers/electronStores.ts`: `wineDownloaderInfoStore` eliminado (instancia + export)
- `backend/downloadmanager/downloadqueue.ts`: `stop(false)` → `stop()` (parámetro Wine eliminado)
