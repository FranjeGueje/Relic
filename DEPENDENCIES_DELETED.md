# Dependencias — Auditoría y Adelgazamiento

Fecha: 2026-07-27

## Resultado Final

Se eliminaron **15 dependencias** (10 prod + 5 dev) y se agregaron **2 helpers
inline** (formato de bytes y classnames). Todos los checks pasan:

- `pnpm codecheck` — 0 errores
- `pnpm lint` — 0 errores
- `pnpm prettier` — ok
- `pnpm test` — 92/92
- `pnpm i18n --fail-on-update` — 0 keys añadidas/eliminadas

---

## Fase 1 — Bajas Confirmadas

| Paquete             | Tipo | Razón                              |
| ------------------- | ---- | ---------------------------------- |
| `ini`               | prod | 0 imports, código muerto de Heroic |
| `sanitize-filename` | prod | 0 imports                          |
| `semver`            | prod | 0 imports                          |
| `short-uuid`        | prod | 0 imports                          |
| `yocto-queue`       | prod | 0 imports                          |
| `@types/ini`        | dev  | innecesario sin `ini`              |
| `@types/plist`      | dev  | 0 imports de `plist`               |
| `@types/semver`     | dev  | innecesario sin `semver`           |
| `fast-xml-parser`   | dev  | 0 imports                          |
| `undici`            | dev  | 0 imports                          |

**Nota:** `@types/tmp` se restauró — `tmp` v0.2.7 no incluye tipos propios.

---

## Fase 2 — Debatibles

| Paquete    | Tipo | Acción                                                                                                                                                               |
| ---------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tslib`    | prod | Eliminado. `importHelpers` cambiado a `false` en `tsconfig.json`. `tsc` solo hace type-checking (`noEmit: true`), el build usa esbuild/SWC que no necesitan `tslib`. |
| `node-gyp` | dev  | Eliminado. No hay módulos nativos que lo requieran.                                                                                                                  |

---

## Fase 3 — Sidegrades

| Paquete         | Reemplazo                           | Archivos tocados | Ahorro  |
| --------------- | ----------------------------------- | ---------------- | ------- |
| `filesize`      | `src/common/formatBytes.ts`         | 3 + 1 nuevo      | ~3 KB   |
| `sanitize-html` | DOMParser nativo en `GameChangeLog` | 1                | ~17 KB  |
| `recharts`      | SVG puro en `ProgressHeader`        | 1                | ~40 KB+ |
| `classnames`    | `src/frontend/helpers/cx.ts`        | 24 + 1 nuevo     | ~1 KB   |

### Nuevos helpers

- **`src/common/formatBytes.ts`** — `formatBytes(bytes: unknown): string`
  Reemplaza a `filesize.partial({base: 2})`. Usado en frontend helpers, backend
  utils y systeminfo.

- **`src/frontend/helpers/cx.ts`** — `cx(...args: unknown[]): string`
  Reemplaza a `classnames`. Misma API: `cx('base', { cond: bool })`.

---

## Mantenidos

| Paquete                              | Razón                                                          |
| ------------------------------------ | -------------------------------------------------------------- |
| `fuse.js`                            | Búsqueda difusa en biblioteca. UX valiosa, reemplazo complejo. |
| `@emotion/react` + `@emotion/styled` | Peer deps requeridas por `@mui/material`                       |

---

## Resumen numérico

```
Antes: (ignorando deps de herramientas)
  dependencies:   35
  devDependencies: 30

Después:
  dependencies:   25
  devDependencies: 25

Eliminados:       15 (10 prod + 5 dev)
Agregados:         2 helpers inline
```
