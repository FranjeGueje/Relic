# TODOs-root — Limpieza raíz y directorios no-src (COMPLETADO ✅)

## Contexto
Una vez completada la limpieza del código en `src/`, se limpió el resto:
raíz del proyecto, config, documentación, assets, traducciones.

Todos los binarios de `public/bin/` se mantienen (incluyendo Windows `.exe`)
para uso del script externo de integración con Steam.

## Verificación final
- `pnpm codecheck` → 0 errores
- `pnpm dist:linux` → AppImage genera

---

## FASE A — Eliminar ficheros muertos ✅

Eliminados: `appveyor.yml`, `.idea/`, `downloadCount.js`, `doc/cla.md`, `.eslintcache`,
`public/entitlements.mac.plist`, `public/dmg.png`, `public/mac-icon.icns`, `public/win_icon.ico`.

## FASE B — Eliminar assets públicos no usados ✅

Eliminados: `icon-dark.png`, `icon-dark@2x.png`, `icon-dark@3x.png`,
`icon-light@2x.png`, `icon-light@3x.png`, `icon.icns`.

`electron-builder.yml`: icono corregido, `icon-dark.png` eliminado de `asarUnpack`.

## FASE C — Actualizar Heroic → Relic en config ✅

`electron-builder.yml` (Comment), `shell.nix`, `.vscode/launch.json`,
`package.json` (description), `CODE_OF_CONDUCT.md` (email).

## FASE D — Documentación ✅

`README.md` reescrito (sin Windows/macOS, sin Wine/Proton, sin badges Heroic).
`CONTRIBUTING.md` y `Support.md` eliminados.

## FASE E — Traducciones (94 archivos) ✅

Claves muertas eliminadas + `"Heroic"` → `"Relic"` en valores vivos.
Procesados: 49 locales × 2 archivos = 98 archivos (4 errores por directorios vacíos).

## FASE F — E2E tests ✅

`e2e/api.spec.ts`, `e2e/helpers.ts`, `e2e/languages_selector.spec.ts`.

## FASE G — `meta/downloadHelperBinaries.ts` ✅

User-Agent: `HeroicBinaryUpdater/1.0` → `RelicBinaryUpdater/1.0`.
Repos GitHub mantenidos (dependencia de binarios Heroic).
