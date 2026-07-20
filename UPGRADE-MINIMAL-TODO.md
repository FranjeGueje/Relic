# UPGRADE-MINIMAL-TODO.md — Plan de ejecución

> **Para el modelo que ejecute esto:** este documento es autocontenido.
> Ejecuta las fases EN ORDEN. Cada fase tiene verificación. Si una
> verificación falla, revierte esa fase y detente.
>
> **Alcance acordado:** arreglar build roto + CVEs críticas + paquetes
> deprecated + config obsoleta. NO actualizar majors (React 19, MUI 9,
> Electron 43, react-router 7) — eso queda en `UPGRADE-FULL.md`.

---

## Contexto

- Proyecto: Relic (fork de Heroic Game Launcher), Electron + React + TS.
- Package manager: **pnpm 10** (`packageManager: pnpm@10.28.0`).
  USA SIEMPRE `pnpm`, nunca `npm install`.
- Node del sistema: v24.16.0.
- Build actual: **ROTO** por peer deps de MUI sin declarar.
- `pnpm audit`: 145 vulns (3 critical, 74 high, 56 moderate, 12 low).
- Existe `package-lock.json` residual además de `pnpm-lock.yaml`.
  El lockfile canónico es el de pnpm; el de npm está obsoleto y hace
  que `npm audit` reporte datos falsos (ej. react-devtools con
  electron viejo que ya no aplica).

### Trazado de dependencias vulnerables (ya verificado en el lockfile)

| Paquete vulnerable | Lo trae | Conclusión |
|---|---|---|
| `simple-git@3.27.0` (CRITICAL) | **`unimported`** | Eliminar `unimported` elimina este CVE |
| `shell-quote@1.8.2` (CRITICAL) | `react-devtools-core@5.3.2` ← `react-devtools` | react-devtools ya está en latest; fix vía override |
| `request` / `nugget` (DEPRECATED) | cadena de `react-devtools` | Se evalúa tras overrides |
| `i18next-fs-backend@2.6.0` (CRITICAL) | dependencia directa | `pnpm update` a >=2.6.6 |
| `cross-spawn` (HIGH) | transitivo (ecosistema eslint antiguo) | Re-auditar tras fase 2 |
| `undici@7.24.0` (HIGH) | dependencia directa (dev) | `pnpm update` a >=7.28.0 |
| `electron@41` (HIGH, 32 CVEs) | dependencia directa | **FUERA DE ALCANCE** (major bump → UPGRADE-FULL.md) |
| `@remix-run/router` (HIGH) | react-router-dom v6 | **FUERA DE ALCANCE** (requiere v7 → UPGRADE-FULL.md) |

---

## FASE 0 — Preparación

- [ ] 0.1 Verificar rama limpia o crear rama de trabajo:
  ```bash
  git status
  git checkout -b chore/upgrade-minimal
  ```
- [ ] 0.2 Eliminar lockfile residual de npm (genera audits falsos):
  ```bash
  rm package-lock.json
  ```
- [ ] 0.3 Commit: `chore: remove stale npm lockfile (project uses pnpm)`

---

## FASE 1 — Fix del build roto (CRÍTICO, hacer primero)

**Problema:** `@mui/material` requiere `@emotion/react` y
`@emotion/styled` como peer deps. Están en node_modules por hoisting
pero NO en `package.json` → rollup falla con:
`"CacheProvider" is not exported by "__vite-optional-peer-dep:@emotion/react:@mui/styled-engine"`

- [ ] 1.1 Instalar como dependencias explícitas:
  ```bash
  pnpm add @emotion/react@^11.14.0 @emotion/styled@^11.14.1
  ```
- [ ] 1.2 Verificar build:
  ```bash
  pnpm run dist:linux
  ```
  Debe completar el `electron-vite build` sin el error de emotion.
  (electron-builder puede tardar; basta con que pase la fase vite)
- [ ] 1.3 Commit: `fix: add missing @emotion peer dependencies required by MUI`

---

## FASE 2 — Eliminar paquetes deprecated

Elimina también la CRITICAL de `simple-git` (viene de `unimported`).

- [ ] 2.1 Eliminar `ts-prune` (deprecated):
  ```bash
  pnpm remove ts-prune
  ```
  - Borrar script `"find-deadcode": "ts-prune --error"` de `package.json`
  - Borrar archivo `.ts-prunerc`
- [ ] 2.2 Eliminar `unimported` (deprecated, arrastra `simple-git` vulnerable):
  ```bash
  pnpm remove unimported
  ```
  - Borrar archivo `.unimportedrc.json`
  - (No hay script en package.json que lo use)
- [ ] 2.3 Eliminar `@types/react-router-dom` (tipos de v5, obsoletos;
  react-router-dom v6 ya incluye tipos propios):
  ```bash
  pnpm remove @types/react-router-dom
  ```
- [ ] 2.4 Reinstalar y verificar que nada los importa:
  ```bash
  pnpm install
  pnpm run codecheck
  ```
  Si `codecheck` falla por imports de esos paquetes, localizar y
  eliminar esos imports antes de seguir (no debería haber).
- [ ] 2.5 Verificar que `simple-git` desapareció:
  ```bash
  pnpm audit
  ```
  La crítica de `simple-git` ya NO debe aparecer.
- [ ] 2.6 Commit: `chore: remove deprecated dev tools (ts-prune, unimported, obsolete @types)`

---

## FASE 3 — CVEs críticas y altas en dependencias directas

- [ ] 3.1 `i18next-fs-backend` 2.6.0 → >=2.6.6 (CRITICAL, prototype pollution):
  ```bash
  pnpm update i18next-fs-backend
  ```
- [ ] 3.2 `undici` 7.24.0 → >=7.28.0 (HIGH):
  ```bash
  pnpm update undici
  ```
- [ ] 3.3 `electron-updater` 6.8.3 → 6.8.9 (patch):
  ```bash
  pnpm update electron-updater
  ```
- [ ] 3.4 Bump de patches seguros restantes (opcional, bajo riesgo):
  ```bash
  pnpm update fs-extra i18next-http-backend sanitize-filename simple-keyboard @types/semver @types/sanitize-html eslint-import-resolver-typescript
  ```
- [ ] 3.5 Verificar:
  ```bash
  pnpm run codecheck && pnpm run test
  ```
- [ ] 3.6 Commit: `chore: bump deps with critical/high CVE fixes`

---

## FASE 4 — CVEs en transitivos (overrides de pnpm)

Tras las fases 2–3, volver a auditar:

- [ ] 4.1 Estado actual:
  ```bash
  pnpm audit
  ```
- [ ] 4.2 `shell-quote` (CRITICAL, vía `react-devtools-core`): react-devtools
  ya está en latest y sigue trayendo 1.8.2. Añadir override en
  `package.json`:
  ```json
  "pnpm": {
    "overrides": {
      "shell-quote": ">=1.8.4"
    }
  }
  ```
  Luego:
  ```bash
  pnpm install
  pnpm why shell-quote    # debe mostrar >=1.8.4
  ```
- [ ] 4.3 Si `cross-spawn` (HIGH, ReDoS, <6.0.6) sigue apareciendo,
  identificar origen:
  ```bash
  grep -B30 "cross-spawn@" pnpm-lock.yaml | less
  ```
  Añadir override SOLO si el padre lo tolera (versiones viejas de
  eslint/execa lo usan; forzar 6.0.6 en un padre que pide ^4 puede
  romper — en ese caso usar override con scope):
  ```json
  "pnpm": {
    "overrides": {
      "cross-spawn@<6.0.6": ">=6.0.6"
    }
  }
  ```
- [ ] 4.4 Verificar tests tras overrides:
  ```bash
  pnpm run test
  ```
- [ ] 4.5 Commit: `chore: add pnpm overrides for vulnerable transitive deps`

---

## FASE 5 — Config obsoleta

- [ ] 5.1 `package.json` → `engines.node`: `">=22"` → `">=24"`
- [ ] 5.2 `package.json` scripts: `--target=node21` → `--target=node24`
  (aparece en `download-helper-binaries` y `lint-translations`)
- [ ] 5.3 `shell.nix`: `nodejs_22` → `nodejs_24`
- [ ] 5.4 `.npmrc`: la línea `node-linker=hoisted` es setting de pnpm;
  npm la ignora y lanza warning. **NO borrarla** (electron-builder y
  el hoisting actual dependen de ella). Mover a `pnpm-workspace.yaml`
  (pnpm 10 la lee ahí) añadiendo al final:
  ```yaml
  nodeLinker: hoisted
  ```
  y dejar `.npmrc` vacío o eliminarlo. Verificar después:
  ```bash
  pnpm install   # node_modules debe seguir en modo hoisted
  pnpm run test
  ```
  Si algo falla, revertir: restaurar `.npmrc` con `node-linker=hoisted`
  y quitar `nodeLinker` del workspace yaml.
- [ ] 5.5 `jest.config.js`: migrar config deprecated de ts-jest.
  Cambiar:
  ```js
  globals: { 'ts-jest': {} },
  ```
  por:
  ```js
  transform: { '^.+\\.tsx?$': ['ts-jest', {}] },
  ```
  Verificar: `pnpm run test`
- [ ] 5.6 Commit: `chore: modernize toolchain config for Node 24 / pnpm 10`

---

## FASE 6 — (OPCIONAL) husky 8 → 9

Solo si las fases anteriores pasaron limpias.

- [ ] 6.1 Actualizar:
  ```bash
  pnpm add -D husky@^9
  ```
- [ ] 6.2 `package.json`: `"prepare": "husky install"` → `"prepare": "husky"`
- [ ] 6.3 `.husky/pre-commit`: eliminar líneas obsoletas de bootstrap
  (`#!/bin/sh` + `. "$(dirname "$0")/_/husky.sh"` si existieran) — en
  v9 el hook es directamente el comando. Contenido actual del repo:
  ```bash
  #!/bin/bash
  #pnpm lint-fix
  ```
  (ya es compatible, dejar como está)
- [ ] 6.4 Verificar: `pnpm install` debe ejecutar prepare sin error.
- [ ] 6.5 Commit: `chore: upgrade husky to v9`

---

## FASE 7 — Verificación final

- [ ] 7.1
  ```bash
  pnpm install
  pnpm run codecheck
  pnpm run test
  pnpm run lint
  pnpm run dist:linux
  ```
  Todo debe pasar.
- [ ] 7.2 `pnpm audit` — las 3 críticas deben haber desaparecido.
  Quedarán highs conocidas y documentadas como fuera de alcance:
  `electron@41` (32 CVEs) y `@remix-run/router` (XSS) → UPGRADE-FULL.md.
- [ ] 7.3 Actualizar `HISTORY.md` (obligatorio por AGENTS.md) con un
  resumen: "chore: fix build (@emotion peers), remove deprecated dev
  tools, patch critical CVEs, modernize config (Node 24, pnpm 10,
  ts-jest transform)".
- [ ] 7.4 Marcar checkboxes completados en `UPGRADE-MINIMAL.md`.

---

## FUERA DE ALCANCE (no tocar en esta rama)

- `electron` 41 → 43 (major, 32 CVEs high) → `UPGRADE-FULL.md` Fase 2
- `react` 18 → 19, `react-router-dom` 6 → 7 → `UPGRADE-FULL.md` Fase 3
  (también resuelve el HIGH de `@remix-run/router`)
- `@mui/*` 5 → 9 → `UPGRADE-FULL.md` Fase 4
- `react-devtools`: ya en latest (5.3.2). Su cadena vieja
  (`request`/`nugget`/electron<=39) es dev-only; se reevaluará con el
  bump de Electron en UPGRADE-FULL.
- `zod` 3 → 4, `recharts` 2 → 3 → `UPGRADE-FULL.md` Fase 6
- Patch `patches/@types__node@22.19.3.patch`: **NO TOCAR** — sigue
  aplicando porque `@types/node` se mantiene en 22.x en este plan.

---

## Rollback

Cada fase es un commit independiente. Para revertir:
```bash
git revert <commit-de-la-fase>   # o git reset --hard <commit-previo> si no se ha pusheado
pnpm install
```
