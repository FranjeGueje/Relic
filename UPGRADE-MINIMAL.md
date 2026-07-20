# UPGRADE-MINIMAL.md — Fix actual: rotos, CVEs, deprecated, obsoletos

## BUILD ROTO AHORA

- [ ] **`@emotion/react` + `@emotion/styled` faltan en `package.json`** — MUI las necesita como peer dependency. Causa del build error actual:
  ```
  "CacheProvider" is not exported by "__vite-optional-peer-dep:@emotion/react:@mui/styled-engine"
  ```
- [ ] Fix: `pnpm add @emotion/react @emotion/styled`

---

## CVEs CRÍTICAS (3 critical)

| Paquete | Severidad | Problema | Fix |
|---------|-----------|----------|-----|
| [ ] **`i18next-fs-backend@2.6.0`** | CRITICAL | Prototype pollution via crafted missing-key string | Actualizar a >=2.6.6 |
| [ ] **`shell-quote` (transitivo)** | CRITICAL | RCE via newline injection en `quote()` | Actualizar a >=1.8.4 |
| [ ] **`simple-git` (transitivo)** | CRITICAL | RCE via case-insensitive `protocol.allow` config | Actualizar a >=3.32.3 |

---

## CVEs HIGH (74 high)

| Paquete | Severidad | Problema | Fix |
|---------|-----------|----------|-----|
| [ ] **`electron@41.x`** | HIGH | 32 CVEs: context isolation bypass, arbitrary file read, IPC issues, etc. | Actualizar a >=43 |
| [ ] **`undici@7.x`** | HIGH | Multiple vulnerabilities | Actualizar a >=7.28.0 |
| [ ] **`cross-spawn` (transitivo)** | HIGH | ReDoS | Actualizar a >=6.0.6 |
| [ ] **`@remix-run/router` (transitivo v6)** | HIGH | XSS via open redirects | Actualizar react-router-dom a v7 |

---

## CVEs MODERATE (56 moderate) y LOW (12 low)

- Total: 145 vulnerabilidades
- Muchas son transitive y se resolverán al actualizar las dependencias principales

---

## DEPRECATED (paquetes oficialmente deprecated)

| Paquete | Estado | Fix |
|---------|--------|-----|
| [ ] **`unimported`** | DEPRECATED | Eliminar o reemplazar por `knip` |
| [ ] **`ts-prune`** | DEPRECATED | Eliminar o reemplazar por `knip` |
| [ ] **`request`** (transitivo vía `nugget`) | DEPRECATED | Se resolverá al actualizar dependencias transitivas |
| [ ] **`@types/react-router-dom`** | OBsoleto | Eliminar — types bundled en react-router-dom v7 |

---

## SIN SOPORTE / PEER DEPENDENCY ROTA

| Paquete | Problema | Fix |
|---------|----------|-----|
| [ ] **`@emotion/react`** | No en `package.json` pero MUI lo necesita | Agregar como dependency |
| [ ] **`@emotion/styled`** | No en `package.json` pero MUI lo necesita | Agregar como dependency |
| [ ] **`react-devtools@5.x`** | Depende de `electron@<=39.8.4` vulnerable | Actualizar a latest o eliminar |
| [ ] **`@types/react-router-dom@5.3.3`** | Tipos para v5 pero se usa v6 | Eliminar (v7 trae types) |

---

## CONFIG DEPRECATED / OBSOLETA

| Archivo | Problema | Fix |
|---------|----------|-----|
| [ ] **`.npmrc`** | `node-linker=hoisted` deprecated en pnpm moderno | Eliminar línea o actualizar a formato actual |
| [ ] **`jest.config.js`** | Usa `globals` config de ts-jest deprecated | Migrar a `transform` config |
| [ ] **`package.json` scripts** | `--target=node21` en esbuild scripts | Cambiar a `--target=node24` |
| [ ] **`package.json` engines** | `"node": ">=22"` | Cambiar a `">=24"` |
| [ ] **`package.json` prepare** | `"prepare": "husky install"` | husky@9 cambia a `"prepare": "husky"` (si se actualiza husky) |

---

## HUSKY (obsoleto, no deprecated)

| Paquete | Estado | Fix |
|---------|--------|-----|
| [ ] **`husky@8.x`** | Funciona pero husky@9 ya existe. Config `husky install` cambió en v9 | Opcional: actualizar a v9 y cambiar prepare script |

---

## ARCHIVOS PATCH QUE HAY QUE REVISAR

| Archivo | Problema | Fix |
|---------|----------|-----|
| [ ] **`patches/@types__node@22.19.3.patch`** | Patch para @types/node@22 — se rompe si se actualiza a @types/node@26 | Eliminar patch y rehacer si es necesario |

---

## CHECKLIST MÍNIMO (fix solo lo roto)

Si solo quieres arreglar el build sin hacer la actualización completa:

- [ ] `pnpm add @emotion/react @emotion/styled`
- [ ] Verificar que `pnpm run dist:linux` compila
- [ ] Verificar que `pnpm run test` pasa

---

## CHECKLIST COMPLETO (fix roto + CVEs críticas)

Si quieres arreglar build + las 3 CVEs críticas:

- [ ] `pnpm add @emotion/react @emotion/styled`
- [ ] `pnpm update i18next-fs-backend` (>=2.6.6)
- [ ] `pnpm update shell-quote` (>=1.8.4, transitive)
- [ ] `pnpm update simple-git` (>=3.32.3, transitive)
- [ ] Verificar build + tests

---

## CHECKLIST COMPLETO (fix roto + CVEs + deprecated)

Si quieres limpiar todo lo deprecated:

- [ ] Todo lo anterior
- [ ] Eliminar `unimported` de devDependencies y scripts
- [ ] Eliminar `ts-prune` de devDependencies y scripts
- [ ] Eliminar `@types/react-router-dom` de devDependencies
- [ ] Eliminar `.npmrc` line `node-linker=hoisted` o actualizar
- [ ] Fix `jest.config.js` globals → transform
- [ ] Verificar build + tests + lint
