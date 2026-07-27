# TODO_UPGRADE.md — Plan de actualización de dependencias

Auditoría completa de dependencias de Relic v0.4.0. Cada fase es independiente y se verifica con `pnpm codecheck`, `pnpm lint`, `pnpm test` e `pnpm prettier`.

---

## Fase 1 — Limpieza (bajo riesgo, alta ganancia) ✅ COMPLETADO

### 1.1 Eliminar `source-map-support` + `@types/source-map-support`

**Por qué**: Electron 43 soporta source maps nativamente. `import 'source-map-support/register'` en `main.ts` es redundante.

**Resultado**: Eliminados. `import 'source-map-support/register'` removido de `main.ts`.

### 1.2 Reemplazar `graceful-fs` por `fs` nativo ✅

**Por qué**: Node 24+ tiene retry y backoff nativo para EMFILE. `graceful-fs` es un drop-in wrapper que ya no aporta valor.

**Resultado**: Reemplazado en ~35 archivos del backend. Eliminado de dependencias. Mocks de Jest actualizados: `jest.mock('graceful-fs')` → `jest.mock('fs', () => ({...jest.requireActual('fs'), ...}))`.

### 1.3 Eliminar `cross-env` (dev) ✅

**Por qué**: Relic es Linux-only. `cross-env CI=e2e` equivale a `CI=e2e` en Linux.

**Resultado**: Eliminado. Script `test:e2e` usa `CI=e2e xvfb-maybe --` directamente.

### 1.4 Verificar y eliminar `resolutions.ts-morph` ✅

**Resultado**: `resolutions.ts-morph` eliminado de `package.json`. No era necesario.

---

## Fase 2 — Paquete deprecado (bajo riesgo) ✅ COMPLETADO

### 2.1 `i18next-parser` → `i18next-cli` ✅

**Por qué**: `i18next-parser` está oficialmente deprecado.

**Resultado**: Migrado. Config migrada a `i18next.config.ts`. Script `"i18n"` → `"i18next-cli extract --quiet"`. Pre-push hook actualizado a `--ci`.

---

## Fase 3 — Actualizaciones menores (patch/minor) ✅ COMPLETADO

| Paquete                        | De      | A           |
| ------------------------------ | ------- | ----------- |
| `simple-keyboard`              | 3.8.165 | 3.8.170     |
| `fs-extra`                     | 11.3.6  | 11.4.0      |
| `ts-jest` (dev)                | 29.4.11 | 29.4.12     |
| `sass` (dev)                   | 1.101.3 | 1.102.0     |
| `@playwright/test` (dev)       | 1.61.1  | 1.62.0      |
| `prettier` (dev)               | 3.9.5   | 3.9.6       |
| `electron-builder`             | 26.15.3 | 26.15.7     |

---

## Fase 4 — Actualización de fuentes (bajo riesgo) ✅ COMPLETADO

### 4.1 `@fontsource/*` 4.x → 5.x ✅

| Paquete             | De      | A      |
| ------------------- | ------- | ------ |
| `@fontsource/cabin` | 4.5.10  | 5.3.0  |
| `@fontsource/rubik` | 4.5.14  | 5.3.0  |

**Resultado**: Sin cambios de código. Paths idénticos.

---

## Fase 5 — `@fortawesome/*` 6.x → 7.x ✅ COMPLETADO

| Paquete                                | De    | A     |
| -------------------------------------- | ----- | ----- |
| `@fortawesome/free-solid-svg-icons`     | 6.7.2 | 7.3.1 |
| `@fortawesome/free-regular-svg-icons`   | 6.7.2 | 7.3.1 |
| `@fortawesome/free-brands-svg-icons`    | 6.7.2 | 7.3.1 |

**Resultado**: Sin cambios de código. Los 37 iconos usados existen en v7.

---

## Fase 6 — Actualizaciones de librerías individuales (riesgo medio) ✅ COMPLETADO

### 6.1 `electron-store` 8.x → 11.x ❌ BLOQUEADO

v9+ es ESM-only. Rompe `jest.mock()` en CJS. Mantenido en 8.2.0.

### 6.2 `zustand` 4.x → 5.x ✅

**Resultado**: Sin cambios de código. Patrones usados ya eran v5-compatibles.

### 6.3 `zod` 3.x → 4.x ✅

**Resultado**: 3 imports cambiados a `zod/v3` (compat layer). `.brand()` no soportado en v4 nativo.

### 6.4 `fuse.js` 6.x → 7.x ✅

**Resultado**: Sin cambios de código. API idéntica.

### 6.5 `shlex` 2.x → 3.x ✅

**Resultado**: 1 import cambiado de `import shlex from 'shlex'` a `import { split } from 'shlex'`. Mock añadido en `src/backend/__mocks__/shlex.ts` (shlex v3 es ESM, Jest no lo parsea).

---

## Fase 7 — React 18 → 19 (riesgo muy alto)

:warning: **PENDIENTE. Requiere plan separado.**

## Fase 8 — MUI 5 → 9 (riesgo extremo)

:warning: **PENDIENTE. Requiere plan separado. Requiere Fase 7.**

---

## Fase 9 — Tooling ✅ COMPLETADO

### 9.1 `electron-vite` 3.x → 5.x + `@vitejs/plugin-react-swc` 3.x → 4.x ✅

| Paquete                      | De      | A      |
| ---------------------------- | ------- | ------ |
| `electron-vite`              | 3.1.0   | 5.0.0  |
| `@vitejs/plugin-react-swc`   | 3.11.0  | 4.3.2  |

**Cambios en código**:
- `electron.vite.config.ts`: `externalizeDepsPlugin()` → `build.externalizeDeps.exclude` en main y preload
- Vite 7 empaquetado con electron-vite 5 (no se instala por separado)

### 9.2 `jest` 29 → 30 ✅

| Paquete    | De      | A      |
| ---------- | ------- | ------ |
| `jest`     | 29.7.0  | 30.4.2 |

**Cambios en código**:
- 7 alias de matchers migrados: `toBeCalled` → `toHaveBeenCalled`, `toBeCalledWith` → `toHaveBeenCalledWith`
- `jest.config.js`: import type `ts-jest/dist/types` → `ts-jest`
- Mock `node:fs` en gog/getInstallInfo: añadido `...jest.requireActual('fs')` (Jest 30 comparte mock entre `node:fs` y `fs`)
- `@types/jest@29.5.14` mantenido (Jest 30 no incluye tipos propios)

### 9.3 `typescript` 5.9 → 6.0 ✅ (7.x bloqueado por typescript-eslint)

| Paquete     | De      | A      |
| ----------- | ------- | ------ |
| `typescript` | 5.9.3  | 6.0.3  |

**Cambios en código**:
- `tsconfig.json`: añadido `"types": ["node", "jest"]` (TS 6 default es `[]`)

**Bloqueo TS 7**: `typescript-eslint@8.65.0` soporta TS `<6.1.0`. No existe `typescript-eslint@9` aún.

### 9.4 `eslint-plugin-react-hooks` 5 → 7 ✅ (ESLint 10 bloqueado por eslint-plugin-react)

| Paquete                     | De    | A     |
| --------------------------- | ----- | ----- |
| `eslint-plugin-react-hooks` | 5.2.0 | 7.1.1 |

**Cambios en código**:
- `eslint.config.mjs`: `configs['recommended-latest']` → `configs.flat['recommended-latest']` + reglas explícitas (`rules-of-hooks: warn`, `exhaustive-deps: warn`)
- Reglas v7 nuevas (16 adicionales) no aplicadas; solo las 2 originales de v5

**Bloqueo ESLint 10**: `eslint-plugin-react@7.37.5` usa API deprecated (`context.getFilename()` no existe en ESLint 10).

---

## Fase 10 — Auditoría de limpieza de dependencias ✅ COMPLETADO

Paquetes eliminados por falta de uso:

| Paquete                        | Razón |
| ------------------------------ | ----- |
| `fs-extra`                     | Reemplazado por `fs` nativo (`readFileSync`, `cpSync`) en 2 archivos |
| `@types/fs-extra`              | Se elimina con `fs-extra` |
| `@testing-library/user-event`  | 0 imports en el codebase |
| `@testing-library/dom`         | Transitivo de `@testing-library/react`, duplicado |

---

## Verificación por cada fase

```bash
pnpm codecheck   # tsc --noEmit
pnpm lint        # ESLint 0 errores, 664 warnings
pnpm test        # 92/92 tests pasan
pnpm prettier    # Prettier check
pnpm i18n --ci   # i18n sin cambios
npx electron-vite build  # build exitoso
```

## Estado global

| Fase | Descripción                     | Estado          |
| ---- | ------------------------------- | --------------- |
| 1    | Limpieza                        | ✅ Completado    |
| 2    | Paquete deprecado               | ✅ Completado    |
| 3    | Actualizaciones menores         | ✅ Completado    |
| 4    | Fuentes                         | ✅ Completado    |
| 5    | FontAwesome                     | ✅ Completado    |
| 6    | Librerías individuales          | ✅ Completado    |
| 7    | React 18 → 19                   | 🔴 Pendiente     |
| 8    | MUI 5 → 9                       | 🔴 Pendiente     |
| 9    | Tooling                         | ✅ Completado    |
| 10   | Auditoría de limpieza           | ✅ Completado    |

