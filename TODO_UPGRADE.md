# TODO_UPGRADE.md — Plan de actualización de dependencias

Auditoría completa de dependencias de Relic v0.4.0. Cada fase es independiente y se verifica con `pnpm codecheck`, `pnpm lint`, `pnpm test` e `pnpm prettier`.

---

## Fase 1 — Limpieza (bajo riesgo, alta ganancia)

### 1.1 Eliminar `source-map-support` + `@types/source-map-support`

**Por qué**: Electron 43 soporta source maps nativamente. `import 'source-map-support/register'` en `main.ts` es redundante.

**Archivos a modificar**:

- `src/backend/main.ts` — eliminar la línea `import 'source-map-support/register'`
- `package.json` — eliminar `"source-map-support"` de `dependencies` + `"@types/source-map-support"` de `devDependencies`

**Comando**: `pnpm remove source-map-support && pnpm remove -D @types/source-map-support`

### 1.2 Reemplazar `graceful-fs` por `fs` nativo

**Por qué**: Node 24+ tiene retry y backoff nativo para EMFILE. `graceful-fs` es un drop-in wrapper que ya no aporta valor.

**Archivos a modificar**: Reemplazar `from 'graceful-fs'` → `from 'fs'` en los ~30 archivos del backend que lo usan:

- `src/backend/main.ts`
- `src/backend/utils.ts`
- `src/backend/launcher.ts`
- `src/backend/config.ts`
- `src/backend/game_config.ts`
- `src/backend/images_cache.ts`
- `src/backend/constants/paths.ts`
- `src/backend/logger/ipc_handler.ts`
- `src/backend/downloadmanager/utils.ts`
- `src/backend/utils/uninstaller.ts`
- `src/backend/utils/compatibility_layers.ts`
- `src/backend/game_overrides/index.ts`
- `src/backend/storeManagers/legendary/library.ts`
- `src/backend/storeManagers/legendary/games.ts`
- `src/backend/storeManagers/legendary/user.ts`
- `src/backend/storeManagers/gog/library.ts`
- `src/backend/storeManagers/gog/games.ts`
- `src/backend/storeManagers/gog/user.ts`
- `src/backend/storeManagers/nile/library.ts`
- `src/backend/storeManagers/nile/games.ts`
- `src/backend/storeManagers/nile/user.ts`
- `src/backend/storeManagers/zoom/games.ts`
- `src/backend/storeManagers/zoom/user.ts`
- `src/backend/relic/game_events.ts`
- `src/backend/relic/prefix.ts`
- `src/backend/relic/windowify.ts`
- `src/backend/relic/steamgrid/download.ts`
- `src/backend/relic/steamgrid/delete.ts`
- `src/backend/relic/steam_shortcuts/store.ts`
- `src/backend/relic/steam_shortcuts/add_game.ts`
- `src/backend/relic/steam_shortcuts/steam_helpers.ts`
- Archivos de test bajo `__tests__/` que importen `graceful-fs`

**Comando**: `pnpm remove graceful-fs && pnpm remove -D @types/graceful-fs`

### 1.3 Eliminar `cross-env` (dev)

**Por qué**: Relic es Linux-only. `cross-env CI=e2e` equivale a `CI=e2e` en Linux.

**Archivos a modificar**:

- `package.json` — línea `"test:e2e"`: cambiar `cross-env CI=e2e xvfb-maybe --` → `CI=e2e xvfb-maybe --`

**Comando**: `pnpm remove -D cross-env`

### 1.4 Verificar y eliminar `resolutions.ts-morph`

**Por qué**: `package.json` tiene `"resolutions": { "ts-morph": "17.0.1" }`. Esto fija una versión de una dependencia transitiva. Verificar si sigue siendo necesario con las versiones actuales.

**Acción**: Ejecutar `pnpm why ts-morph` para entender quién depende de `ts-morph` y si la resolución forzada 17.0.1 sigue siendo necesaria. Si no, eliminar el bloque `"resolutions"` entero de `package.json`.

---

## Fase 2 — Paquete deprecado (bajo riesgo)

### 2.1 `i18next-parser` → `i18next-cli`

**Por qué**: `i18next-parser` está oficialmente deprecado. `i18next-cli` es el reemplazo oficial con API compatible.

**Archivos a modificar**:

- `package.json` — script `"i18n"`: verificar si `i18next --silent` necesita cambiar a `i18next-cli --silent`. Probar con `pnpm i18n --fail-on-update` tras instalar.

**Comandos**:

```
pnpm remove -D i18next-parser
pnpm add -D i18next-cli
pnpm i18n --fail-on-update   # verificar que las keys no cambian
```

---

## Fase 3 — Actualizaciones menores (parche/minor dentro del mismo major)

Actualizaciones seguras sin breaking changes. Ejecutar `pnpm update` y verificar.

| Paquete                        | De      | A           | Tipo  |
| ------------------------------ | ------- | ----------- | ----- |
| `simple-keyboard`              | 3.8.165 | latest 3.x  | patch |
| `fs-extra`                     | 11.3.6  | 11.4.0      | minor |
| `ts-jest` (dev)                | 29.4.11 | latest 29.x | patch |
| `sass` (dev)                   | 1.101.3 | latest 1.x  | minor |
| `@playwright/test` (dev)       | 1.61.1  | latest 1.x  | minor |
| `eslint` (dev)                 | 9.39.5  | latest 9.x  | minor |
| `typescript-eslint` (dev)      | 8.65.0  | latest 8.x  | minor |
| `eslint-plugin-import-x` (dev) | 4.17.1  | latest 4.x  | minor |
| `@types/node` (dev)            | 22.20.1 | latest 22.x | patch |
| `prettier` (dev)               | 3.9.5   | latest 3.x  | minor |
| `tmp` (dev)                    | 0.2.7   | latest 0.x  | minor |
| `@types/react` (dev)           | 18.3.31 | latest 18.x | patch |
| `@types/react-dom` (dev)       | 18.3.7  | latest 18.x | patch |

**Comando**: `pnpm update` (actualiza todos los patch/minor compatibles)

---

## Fase 4 — Actualización de fuentes (bajo riesgo)

### 4.1 `@fontsource/*` 4.x → 5.x

**Por qué**: 1 major atrás. Cambio de v4 a v5 en paths de import CSS.

**Archivos a modificar**:

- `src/frontend/App.css`:
  - `@import '@fontsource/rubik/index.css'` → verificar si path cambia en v5
  - `@import '@fontsource/cabin/index.css'` → verificar si path cambia en v5

**Comandos**:

```
pnpm add @fontsource/cabin@latest @fontsource/rubik@latest
```

---

## Fase 5 — `@fortawesome/*` 6.x → 7.x (riesgo bajo-medio)

**Por qué**: 1 major atrás. Verificar que los icon paths y API de FontAwesome v7 no rompen los imports existentes.

**Paquetes**:

- `@fortawesome/free-brands-svg-icons`
- `@fortawesome/free-regular-svg-icons`
- `@fortawesome/free-solid-svg-icons`
- `@fortawesome/react-fontawesome`

**Comandos**:

```
pnpm add @fortawesome/free-brands-svg-icons@latest @fortawesome/free-regular-svg-icons@latest @fortawesome/free-solid-svg-icons@latest @fortawesome/react-fontawesome@latest
```

---

## Fase 6 — Actualizaciones de librerías individuales (riesgo medio)

### 6.1 `electron-store` 8.x → 11.x

**Riesgo**: Medio. API changes menores entre v8 y v11. 5 imports afectados.

**Archivos**:

- `src/backend/electron_store.ts`
- `src/backend/cache.ts`
- `src/preload/api/misc.ts`
- `src/common/types/electron_store.ts`
- `src/backend/__tests__/cache.test.ts`

### 6.2 `zustand` 4.x → 5.x

**Riesgo**: Medio. Breaking changes menores en creación de stores. Verificar todos los `create()` calls.

**Archivos**:

- `src/frontend/state/GlobalState.tsx`
- `src/frontend/state/ContextProvider.tsx`
- `src/frontend/state/InstallProgress.ts`
- `src/frontend/state/InstallGameModal.ts`
- `src/frontend/state/GlobalStateV2.ts`

### 6.3 `zod` 3.x → 4.x

**Riesgo**: Medio. API breaking changes. Verificar schemas existentes.

### 6.4 `fuse.js` 6.x → 7.x

**Riesgo**: Bajo. 1 solo uso. API estable.

### 6.5 `shlex` 2.x → 3.x

**Riesgo**: Bajo. 1 solo uso en `legendary/library.ts`. API estable.

---

## Fase 7 — React 18 → 19 (riesgo muy alto, plan dedicado)

:warning: **NO hacer en automático. Requiere plan separado.**

React 19 tiene breaking changes significativos y cascada a múltiples paquetes:

| Paquete                     | De     | A       | Bloqueo                                                 |
| --------------------------- | ------ | ------- | ------------------------------------------------------- |
| `react`                     | 18.3.1 | 19.2.8  | Breaking changes en hooks, refs, context                |
| `react-dom`                 | 18.3.1 | 19.2.8  | Debe coincidir con react                                |
| `@types/react`              | 18.3.x | 19.x    | Debe coincidir                                          |
| `@types/react-dom`          | 18.3.x | 19.x    | Debe coincidir                                          |
| `react-router-dom`          | 6.30.4 | 7.18.1  | v7 requiere React 18.2+ → compatible, pero breaking API |
| `react-i18next`             | 12.3.1 | 17.0.11 | v13+ requiere React 18 → OK                             |
| `i18next`                   | 22.5.1 | 26.3.6  | Independiente de React                                  |
| `@testing-library/react`    | 14.x   | 16.x    | Requiere React 18+ → OK (14.x soporta React 18)         |
| `@testing-library/dom`      | 9.x    | 10.x    | —                                                       |
| `@testing-library/jest-dom` | 5.x    | 7.x     | —                                                       |

**Pre-requisitos Fase 7**:

- Fases 1-3 completadas
- `@vitejs/plugin-react-swc` 3.x → 4.x (requiere React 19)
- Todos los tests pasando antes de la migración

---

## Fase 8 — MUI 5 → 9 (riesgo extremo, plan dedicado)

:warning: **NO hacer en automático. Migración más compleja del proyecto.**

MUI v5 → v9 implica 4 versiones mayores de breaking changes. 90+ imports en 30+ archivos. Requisitos:

- React 19 (Fase 7 completada)
- Rewrite de `ThemeProvider`, `createTheme` (`@mui/material/styles`)
- Rewrite de ~40 iconos individuales
- Cambios en componente `Tabs`, `Dialog`, `Menu`, `Select`, `Tab`, `Box`, `LinearProgress`, `CircularProgress`, `Paper`, `Typography`, `Button`, etc.

---

## Fase 9 — Tooling (riesgo variable)

### 9.1 `vite` 6.x → 8.x + `electron-vite` 3.x → 5.x

**Riesgo**: Medio. Electron-vite v5 es probablemente dependiente de Vite 7+. Hacer juntos.

### 9.2 `jest` 29 → 30

**Riesgo**: Medio. Verificar snapshot format y config compat.

### 9.3 `typescript` 5.9 → 7.x

**Riesgo**: Bajo. Solo type-checking. `noEmit: true`.

### 9.4 `eslint` 9 → 10 + `typescript-eslint` 8 → 9+ + `@eslint/js` 9 → 10

**Riesgo**: Medio. Flat config cambiado en ESLint 10. Verificar `eslint.config.js`.

---

## Orden de ejecución recomendado

```
Fase 1 (limpieza)    → 1.1 source-map-support, 1.2 graceful-fs, 1.3 cross-env, 1.4 ts-morph
Fase 2 (deprecado)   → 2.1 i18next-parser → i18next-cli
Fase 3 (patches)     → pnpm update
Fase 4 (fuentes)     → @fontsource 4→5
Fase 5 (iconos)      → @fortawesome 6→7
Fase 6 (librerías)   → electron-store, zustand, zod, fuse.js, shlex
Fase 7 (React 19)    → :warning: Plan dedicado
Fase 8 (MUI 5→9)     → :warning: Plan dedicado (requiere Fase 7)
Fase 9 (tooling)     → vite, jest, typescript, eslint
```

## Verificación por cada fase

```bash
pnpm codecheck   # tsc --noEmit
pnpm lint        # ESLint 0 errores
pnpm test        # 92/92 tests
pnpm prettier    # Prettier check
pnpm i18n --fail-on-update
```
