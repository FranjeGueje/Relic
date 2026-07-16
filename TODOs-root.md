# TODOs-root — Limpieza raíz y directorios no-src

## Contexto
Una vez completada la limpieza del código en `src/`, toca el resto:
raíz del proyecto, config, documentación, assets, traducciones.

Todos los binarios de `public/bin/` se mantienen (incluyendo Windows `.exe`)
para uso del script externo de integración con Steam.

---

## FASE A — Eliminar ficheros muertos

| Acción | Fichero | Motivo |
|---|---|---|
| Eliminar | `appveyor.yml` | CI/CD Windows, innecesario en Linux-only |
| Eliminar | `.idea/` (directorio completo) | IDE config JetBrains, no debe estar en repo |
| Eliminar | `downloadCount.js` | Fetcha stats de Heroic, no de Relic |
| Eliminar | `doc/cla.md` | CLA de Heroic Labs, no aplicable a Relic |
| Eliminar | `.eslintcache` | Cache de ESLint |
| Eliminar | `public/entitlements.mac.plist` | macOS code signing |
| Eliminar | `public/dmg.png` | Fondo DMG macOS |
| Eliminar | `public/mac-icon.icns` | Icono macOS |
| Eliminar | `public/win_icon.ico` | Icono Windows |

**NO eliminar**: `public/bin/` (todos los binarios, incluidos `.exe` de Windows, se conservan).

---

## FASE B — Eliminar assets públicos no usados

Iconos **usados** en `src/`: `icon.png`, `icon-light.png`, `relic-icon.svg`.

| Acción | Fichero | Motivo |
|---|---|---|
| Eliminar | `public/icon-dark.png` | `darkTrayIcon` eliminado en Fase 6; `tray_icon.ts` solo usa `icon-light.png` |
| Eliminar | `public/icon-dark@2x.png` | 0 referencias |
| Eliminar | `public/icon-dark@3x.png` | 0 referencias |
| Eliminar | `public/icon-light@2x.png` | 0 referencias |
| Eliminar | `public/icon-light@3x.png` | 0 referencias |
| Eliminar | `public/icon.icns` | Formato macOS; referenciado incorrectamente en `linux.icon` de electron-builder |
| Editar | `electron-builder.yml` | Quitar `icon.icns` de `asarUnpack` y corregir `linux.icon` |
| Editar | `tray_icon.test.ts` | Eliminar/las referencias a `icon-dark.png` en tests |

---

## FASE C — Actualizar Heroic → Relic en config

| Fichero | Cambio |
|---|---|
| `electron-builder.yml` | Desktop Comment: `"Fork of Heroic"` → `"Relic"` |
| `shell.nix` | `heroic-fhs-dev` → `relic-fhs-dev` |
| `.vscode/launch.json` | `"Launch Heroic (HMR & HR)"` → `"Launch Relic"` |
| `package.json` | `"description": "Fork of Heroic..."` → `"Relic — Linux games installer for Steam"` |
| `CODE_OF_CONDUCT.md` | Email `flavioislima@gmail.com` → eliminar o cambiar |

---

## FASE D — Documentación

| Fichero | Acción |
|---|---|
| `README.md` | **Reescritura completa**: título, descripción Linux-only, eliminar referencias Windows/macOS, Wine/Proton/DXVK, badges Heroic. README mínimo acorde a AGENTS.md. |
| `CONTRIBUTING.md` | Eliminar (enlaza a wiki de Heroic y CLA de Heroic Labs) o reescribir |
| `Support.md` | Eliminar (direcciones de donación de Heroic: ETH `heroicgl.eth`) |
| `CHANGELOG.md` | **Mantener** sin cambios como registro histórico |

---

## FASE E — Traducciones (`public/locales/`)

47+ directorios de idioma, cada uno con `translation.json` y `gamepage.json`.

### Paso 1 — Identificar claves muertas
Claves que ya no se usan desde `src/`:
- `setting.before-launch-script-path`, `setting.after-launch-script-path`, `setting.disableUMU`
- `setting.defaultWinePrefix`, `setting.no-tray-icon`, `setting.exit-to-tray`
- `setting.disable_controller`, `setting.start_in_console_mode`
- `setting.libraryTopSection`, `setting.maxRecentGames`
- `setting.hideChangelogsOnStartup`
- `tour.*` (todas), `accessibility.*`, `help.analytics`, `analyticsModal.*`
- `discounts.*`, `stores.*`, `gog-store`, `amazon-luna`, `zoom-store`
- `eosOverlay.*`, `protondb` (en gamepage)
- `box.shortcuts.message-mac`, `box.warning.rosetta.*`, `box.vcruntime.*`
- `login.old-mac`

### Paso 2 — Rebranding Heroic → Relic en valores
En las claves que se mantienen, reemplazar:
- `"Heroic Games Launcher"` → `"Relic"`
- `"Heroic"` → `"Relic"` (en valores de usuario, NO en claves técnicas)
- `"heroic"` → `"relic"` (cuando sea marca, no cuando sea runner/identificador técnico)

### Paso 3 — Verificar cobertura
Comprobar que no falten traducciones para nuevas claves añadidas.

---

## FASE F — E2E tests

| Fichero | Cambio |
|---|---|
| `e2e/api.spec.ts` | `toHaveTitle('Heroic Games Launcher')` → `'Relic'`; asserts `getHeroicVersion` → `getRelicVersion` |
| `e2e/helpers.ts` | Comentario `"requiring Heroic"` → `"Relic"` |
| `e2e/languages_selector.spec.ts` | Comentario `"ensure heroic always render"` → `"ensure relic"` |

---

## FASE G — `meta/downloadHelperBinaries.ts`

| Cambio | Detalle |
|---|---|
| User-Agent | `HeroicBinaryUpdater/1.0` → `RelicBinaryUpdater/1.0` |
| Repos GitHub | Mantener `Heroic-Games-Launcher/` para `legendary`, `gogdl`, etc. — Relic depende de los binarios de Heroic. Si se crean forks propios, actualizar. |

---

## Orden de ejecución

```
FASE A → FASE B → FASE C → FASE D → G → F → E
```

Las traducciones (E) al final por ser el trabajo más voluminoso (~47 archivos × múltiples claves).

Verificar al final:
- `pnpm codecheck` (0 errores)
- `pnpm dist:linux` (AppImage genera)
