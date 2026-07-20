# SLIM-MODULES.md — Plan TODO: adelgazar la estructura de módulos

> **Para el modelo que ejecute esto:** documento autocontenido.
> Ejecuta las fases EN ORDEN. Cada fase termina con verificación y commit
> propio. Si una verificación falla, revierte esa fase (`git revert`) y
> continúa con la siguiente.
>
> **Objetivo:** eliminar módulos heredados de Heroic que no aportan al
> flujo de Relic: auth → biblioteca → descargar/instalar/actualizar →
> integración Steam. Steam lanza; Relic nunca lanza juegos.
>
> **Aclaración del usuario (IMPORTANTE):** cuando AGENTS.md habla de
> "script externo", se refiere a los **módulos `src/backend/relic/`**
> (y `src/frontend/relic/`, `src/common/relic/`). Esos módulos SON la
> capa de integración Steam. **NO se tocan.**
>
> **UMU se queda:** `utils/compatibility_layers.ts`, `isUmuSupported`
> y todos sus callers (zoom/gog/nile/legendary games.ts, `relic/prefix.ts`)
> quedan **FUERA de este plan**. El usuario lo usará en Relic.
>
> **Reglas:**
> - USA SIEMPRE `pnpm`, nunca `npm install`.
> - Tras cada borrado: `pnpm run codecheck` debe pasar. Si aparecen
>   imports rotos, eliminar esos imports (no restaurar el módulo).
> - Actualizar `HISTORY.md` y `HISTORY_REMOVE.md` al final (AGENTS.md
>   lo exige).

---

## Baseline esperado (para no asustarse)

- `pnpm run codecheck` → limpio.
- `pnpm run test` → 13/17 suites OK. **4 fallan PREEXISTENTE**:
  `constants.test.ts` (getShell platform), `game_events.test.ts`
  (espera `removeNonSteamGame` que está comentado — se arregla en Fase 2),
  `tray_icon.test.ts`, `nonesteamgame.test.ts` (se elimina en Fase 2).
- `pnpm run lint` → ~875 problems preexistentes de Heroic. Meta: no subir.
- `pnpm run dist:linux` → genera AppImage.
- `pnpm audit` → 0 vulns.

---

## Mapa de módulos (ya verificado)

### ELIMINAR en este plan

| Módulo | LOC aprox | Quién lo usa hoy |
|---|---|---|
| `src/backend/shortcuts/nonesteamgame/` | ~500 + tests | Solo: import COMENTADO en `relic/game_events.ts:214`, mock en `game_events.test.ts`, sus propios tests. Sin callers productivos |
| `src/backend/shortcuts/shortcuts/` | ~124 | `.desktop` que abren Relic (no Steam). Llamado desde `addShortcuts()` de legendary/gog/nile/zoom/sideload `games.ts` y `sideload/library.ts` |
| `src/backend/shortcuts/ipc_handler.ts` | ~29 | Registra `addShortcut`, `removeShortcut`, `shortcutsExists` |
| `src/backend/shortcuts/utils.ts` + `types.ts` | ~100 | Solo usado dentro de `shortcuts/` (verificado: 0 imports fuera) |
| `electron-updater` (dep) | — | 0 imports en `src/` |
| `plist` (dep) | — | 0 imports en `src/` (leftover macOS) |
| `@shockpkg/icon-encoder` (dep) | — | 0 imports en `src/` |

### NO eliminar (usan los deps que parecen sobrar)

| Dep | Uso real | Decisión |
|---|---|---|
| `steam-shortcut-editor` | **`relic/steam_shortcuts/steam_helpers.ts`** (parseBuffer para `findExistingGameByName`) | **MANTENER** |
| `@node-steam/vdf` | `backend/utils.ts:464` en `getSteamLibraries()` (lee `libraryfolders.vdf`) | **MANTENER** |
| `simple-keyboard` | ConsoleMode (`frontend/helpers/virtualKeyboard.ts`) | MANTENER |
| `recharts` | 1 gráfico en `DownloadManager/ProgressHeader` | MANTENER de momento (opcional Fase futura) |
| `@hello-pangea/dnd` | Drag&drop DLC en `Game/ModifyInstallModal/GOG` | MANTENER |
| `backend/steamgrid/` (Heroic) | IPC de la UI: `SteamGridDBPicker`, `EditGameDialog`, Settings API key | **MANTENER** (la unificación con `relic/steamgrid` es trabajo aparte, más fino) |
| `recent_games/` + `tray_icon/` | Tray muestra juegos recientes | **MANTENER de momento** (adelgazar tray es decisión de UX aparte) |
| `game_config.ts` | Settings por juego; lo usan sideload/nile/gog games.ts y `main.ts` IPC `getGameSettings`/`requestGameSettings` | **MANTENER de momento** (reducir settings Wine-like es refactor aparte) |

---

## FASE 0 — Preparación

- [ ] 0.1 Rama:
  ```bash
  git status
  git checkout -b chore/slim-modules
  ```
- [ ] 0.2 Baseline:
  ```bash
  pnpm install
  pnpm run codecheck   # limpio
  pnpm run test 2>&1 | tail -5   # anotar fallos preexistentes
  ```

---

## FASE 1 — Deps npm muertas (quick win, 2 min)

- [ ] 1.1 Eliminar:
  ```bash
  pnpm remove -w electron-updater plist @shockpkg/icon-encoder
  ```
- [ ] 1.2 Verificar que no hay imports ocultos:
  ```bash
  grep -rn "electron-updater\|from 'plist'\|from \"plist\"\|@shockpkg" src/ || echo "OK: sin usos"
  pnpm run codecheck
  ```
- [ ] 1.3 Commit: `chore: remove unused deps (electron-updater, plist, @shockpkg/icon-encoder)`

---

## FASE 2 — Eliminar `shortcuts/nonesteamgame/` (VDF directo, legacy)

Relic integra Steam vía `steam://addnonsteamgame` + su propio store
(`relic/steam_shortcuts/`). Este módulo editaba `shortcuts.vdf`
directamente y ya no tiene callers productivos.

- [ ] 2.1 Limpiar referencias en código Relic:
  - `src/backend/relic/game_events.ts`:
    - Borrar el import: `import { removeNonSteamGame } from 'backend/shortcuts/nonesteamgame/nonesteamgame'`
    - Borrar la línea comentada `//await removeNonSteamGame(game)` (~línea 214)
  - `src/backend/relic/steam_shortcuts/__tests__/game_events.test.ts`:
    - Borrar import, el mock `removeNonSteamGame: jest.fn()`, el
      `jest.mock(...)` del módulo, la constante `mockedRemoveNonSteamGame`
      y el `expect(mockedRemoveNonSteamGame).toHaveBeenCalledWith(mockGame)`
      del test `deletes bat file, removes from store and calls
      removeNonSteamGame`. Renombrar ese test a
      `deletes bat file and removes from store`.
    - Este test es uno de los 4 fallos preexistentes: tras el cambio
      **debe pasar** (verificación: los fallos preexistentes bajan de 4 a 3).
- [ ] 2.2 Borrar el módulo:
  ```bash
  rm -rf src/backend/shortcuts/nonesteamgame
  ```
- [ ] 2.3 Verificar:
  ```bash
  grep -rn "nonesteamgame" src/ || echo "OK: sin referencias"
  pnpm run codecheck
  pnpm run test
  ```
  - `nonesteamgame.test.ts` desaparece del total de suites.
  - `game_events.test.ts` debe pasar ahora.
- [ ] 2.4 Commit: `chore: remove legacy shortcuts.vdf editor (nonesteamgame) — superseded by relic steam integration`

---

## FASE 3 — Eliminar desktop shortcuts (`shortcuts/shortcuts/` + IPC)

Crea `.desktop`/menú que abren **Relic**, no Steam. Contradice la
filosofía (Steam es el launcher). Los juegos se abren desde Steam.

- [ ] 3.1 Quitar llamadas en store managers. En cada uno de estos
  archivos, eliminar los métodos `addShortcuts`/`removeShortcuts` y
  TODAS las llamadas `this.addShortcuts()` / `removeShortcutsUtil(this)`:
  - `src/backend/storeManagers/legendary/games.ts` (métodos ~L544-554; llamadas ~L642, ~L720, ~L786)
  - `src/backend/storeManagers/gog/games.ts` (métodos ~L467+; llamadas ~L210, ~L454)
  - `src/backend/storeManagers/nile/games.ts` (métodos ~L271+; llamadas ~L131, ~L253)
  - `src/backend/storeManagers/zoom/games.ts` (métodos ~L508-513; llamada ~L557)
  - `src/backend/storeManagers/sideload/games.ts` (métodos ~L49-54; llamada ~L113)
  - `src/backend/storeManagers/sideload/library.ts` (import + llamada ~L5, ~L60)
  - Ojo: si `addShortcuts`/`removeShortcuts` están declarados en la
    interfaz `GameManager` (`src/common/types/game_manager.ts` ~L36-37),
    eliminarlos también de la interfaz. Si el compilador se queja de
    alguna clase que no los implementa, borrar ahí también.
- [ ] 3.2 Quitar IPC:
  - Borrar `src/backend/shortcuts/ipc_handler.ts` entero.
  - En `src/backend/main.ts`: borrar el import/registro de ese handler
    (buscar `shortcuts/ipc_handler` o similar).
  - En `src/common/types/ipc.ts`: borrar la firma
    `shortcutsExists: (appName: string, runner: Runner) => boolean` (~L204).
  - En `src/preload/api/menu.ts`: borrar
    `export const shortcutsExists = ...` (~L7) y cualquier import que
    quede huérfano. Verificar con grep que nadie lo usa en frontend.
- [ ] 3.3 Borrar módulo:
  ```bash
  rm -rf src/backend/shortcuts
  ```
  (incluye `shortcuts/shortcuts/`, `utils.ts`, `types.ts`, `ipc_handler.ts`)
- [ ] 3.4 Quitar settings muertos si quedan huérfanos:
  - Buscar `addDesktopShortcuts` y `addStartMenuShortcuts` en `src/`.
    Si tras el borrado solo quedan en `config.ts` (default) y
    `common/types.ts`, eliminarlos de ambos (y de cualquier UI de
    Settings que los use — verificar con grep antes).
- [ ] 3.5 Verificar:
  ```bash
  grep -rn "addShortcuts\|removeShortcuts\|shortcutsExists\|backend/shortcuts" src/ || echo "OK"
  pnpm run codecheck
  pnpm run test          # mismos fallos preexistentes que tras Fase 2
  pnpm run dist:linux    # debe compilar
  ```
- [ ] 3.6 Commit: `chore: remove desktop/start-menu shortcuts — games open from Steam, not Relic`

---

## FASE 4 — Verificación final y documentación

- [ ] 4.1 Suite completa:
  ```bash
  pnpm install
  pnpm run codecheck     # limpio
  pnpm run test          # 3 fallos preexistentes (constants, tray_icon)
                         # game_events y nonesteamgame ya resueltos/eliminados
  pnpm run lint          # <= ~875 problems (no debe subir)
  pnpm run dist:linux    # AppImage OK
  pnpm audit             # sigue en 0
  ```
- [ ] 4.2 Actualizar `HISTORY_REMOVE.md` con el detalle:
  - `backend/shortcuts/` completo (nonesteamgame VDF editor, desktop
    shortcuts, IPC addShortcut/removeShortcut/shortcutsExists)
  - Interfaz `GameManager.addShortcuts/removeShortcuts`
  - Settings `addDesktopShortcuts`/`addStartMenuShortcuts` (si se quitaron)
  - Deps: `electron-updater`, `plist`, `@shockpkg/icon-encoder`
  - Nota: `steam-shortcut-editor` se MANTIENE (lo usa
    `relic/steam_shortcuts/steam_helpers.ts`)
- [ ] 4.3 Actualizar `HISTORY.md` (resumen ejecutivo).
- [ ] 4.4 Marcar checkboxes de este archivo.

---

## FUERA DE ALCANCE (no tocar en esta rama)

- **Todo `src/backend/relic/`** — es la capa de integración Steam
  ("script externo" según aclaración del usuario).
- **UMU:** `utils/compatibility_layers.ts`, `isUmuSupported` y callers.
- **Unificación steamgrid** (`backend/steamgrid` Heroic vs
  `relic/steamgrid`): trabajo aparte — la UI (`SteamGridDBPicker`,
  `EditGameDialog`, Settings key) depende del IPC Heroic. Hacerlo en
  otra rama con cuidado.
- **`recent_games/` y menú de recientes del tray**: decisión de UX
  aparte (el tray sin recientes quedaría en Show/Quit/About).
- **`game_config.ts` / settings por juego Wine-like**: refactor aparte;
  hoy lo usan sideload/nile/gog y el IPC `getGameSettings`.
- **Rename `launcher.ts` → `runner_exec.ts`**: cosmético, otra rama.
- **Deps dudosas que se mantienen:** `recharts`, `@hello-pangea/dnd`,
  `simple-keyboard`, `steam-shortcut-editor`, `@node-steam/vdf`.

---

## Rollback

Cada fase es un commit independiente:
```bash
git revert <commit-de-la-fase>
pnpm install
```
Rollback total:
```bash
git reset --hard <commit-previo-a-la-rama>
pnpm install
```

---

## Resumen de impacto estimado

| Fase | Qué se va | Riesgo |
|------|-----------|--------|
| 1 | 3 deps npm sin uso | Nulo |
| 2 | ~500 LOC + 1 suite de tests legacy + 1 test roto arreglado | Bajo |
| 3 | ~250 LOC + métodos en 6 archivos + IPC + settings muertos | Medio (toca games.ts de 5 runners) |
| 4 | Docs | Nulo |

**Total estimado:** ~750-800 LOC eliminadas, 3 deps, 2 suites legacy
fuera, 1 test preexistente arreglado, 0 funcionalidad Relic afectada.
