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

#### Eventos de instalación
- `src/backend/relic/game_events.ts`: orquestador que crea .bat, añade a Steam y guarda en store.
- Todos los runners (legendary, gog, nile, zoom, sideload) llaman `onGameInstalled()`/`onGameUninstalled()`.
- Fix: Legendary installPath vacío — se llama `refreshInstalled?.()` antes de leer datos instalados.

#### Robustez
- Protegidos todos los `JSON.parse()` contra stdout vacío en legendary, nile y gog library/user.
- Corregido log prefix en IPC handler `getInstallInfo` (Nile se logueaba como GOG).
- Tests unitarios para stdout vacío en los 3 store managers (8 tests).

#### Tests
- 33 tests en módulos relic (steam_helpers, add_game, game_events, symlinks).
- 8 tests en store managers (empty stdout handling).
- Total: 88 tests (83 pasan, 5 preexistentes fallan por plataforma Linux).
