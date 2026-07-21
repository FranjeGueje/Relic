# Plan — Integración UMU en Relic

## Objetivo

Implementar en Relic el mismo patrón que usa `dist/umu-hero/umu-hero.sh` para la ejecución de umu-launcher:

- Si hay GE-Proton válido configurado, ejecutar `umu-run` con `WINEPREFIX`, `GAMEID`, `PROTONPATH`, `STORE` y el ejecutable del juego.
- Buscar el `GAMEID` en la BBDD de UMU online (`umu_api.php`). Si no se encuentra, usar `GAMEID=0`.
- Añadir un ajuste en **Settings > General** para seleccionar la carpeta de GE-Proton.
- En el primer arranque, auto-detectar GE-Proton en `~/.local/share/Steam/compatibilitytools.d/`. Si no hay ninguno, dejar el setting vacío.

---

## Código reutilizable del backend de Heroic

Algunas piezas del backend original de Heroic ya existen y son útiles. **No reescribir, reutilizar**:

| Código | Dónde | Uso en UMU |
|--------|-------|------------|
| `getUmuPath()` | `src/backend/utils/compatibility_layers.ts:8` | Busca `umu-run` en PATH, fallback a `defaultUmuPath`. Nuestro `launcher.ts` lo importa directamente. |
| `isUmuSupported()` | `src/backend/utils/compatibility_layers.ts:11` | Check previo: ¿Linux? ¿Existe umu-run? Útil como guarda rápida. |
| `defaultUmuPath` | `src/backend/constants/paths.ts:27` | Fallback a `<appFolder>/tools/runtimes/umu/umu_run.py` si `umu-run` no está en PATH. |
| `preparePrefix()` | `src/backend/relic/prefix.ts:10` | Ya construye la ruta `compatdata/<steamAppId>/pfx/drive_c`. `prepareUmuPrefix()` reusa el mismo patrón para la ruta del `WINEPREFIX`. |

## Código muerto de Heroic a limpiar durante la implementación

| Dónde | Qué hacer |
|-------|-----------|
| `src/common/types.ts:74` — `umuSupport` en `ExperimentalFeatures` | Eliminar campo, nunca se usó. |
| `src/backend/storeManagers/*/games.ts` — imports de `isUmuSupported` (4 archivos: legendary, gog, nile, zoom) | Eliminar imports, la función jamás se llama. |
| `src/backend/utils/compatibility_layers.ts` | **Mantener** — `getUmuPath()` y `isUmuSupported()` son útiles para el módulo UMU. |

> NOTA: `storeMap` de `common/utils.ts` (`legendary → 'epic'`) **NO** es reutilizable. UMU usa `egs` para Epic. Mapa separado en `umu/store.ts`.

## Análisis de `umu-hero.sh`

El script ejecuta umu-launcher con 4 variables de entorno y un argumento:

```bash
WINEPREFIX="$prefix" GAMEID="$umu_id" PROTONPATH="$proton" STORE="$store" umu-run <exe>
```

- Para crear prefijo sin lanzar nada: `umu-run "exit"`
- Para lanzar un juego: `umu-run "$game_exe"`

La BBDD de UMU se consulta así:

```bash
curl -s "https://umu.openwinecomponents.org/umu_api.php?store=$store&codename=$app_name"
```

Los store labels de UMU son: `egs` (Epic), `gog`, `amazon`. Si la API falla, `GAMEID=0`.

---

## Archivos a crear/modificar (en orden)

### 1. `src/common/types.ts` — Añadir `protonPath` a `AppSettings`

```typescript
export interface AppSettings extends GameSettings {
  // ...existing fields + protonPath:
  protonPath: string
}

// Además: eliminar `umuSupport?: boolean` de ExperimentalFeatures (line 74)
```

### 2. `src/backend/constants/paths.ts` — Añadir `steamCompatDir`

```typescript
export const steamCompatDir = join(userHome, '.local', 'share', 'Steam', 'compatibilitytools.d')
```

### 3. `src/backend/relic/umu/store.ts` — Mapa de stores UMU + lookup API

Funciones:
- `getUmuStoreLabel(runner): string | undefined` — `legendary→egs`, `gog→gog`, `nile→amazon`, `sideload→undefined`, `zoom→undefined`
- `searchUmuGameId(store, appName): Promise<string | null>` — consulta `umu_api.php?store=...&codename=...`, devuelve `umu_id` o `null`

### 4. `src/backend/relic/umu/launcher.ts` — Ejecutar umu-launcher

Función:
- `launchUmu(options: UmuLaunchOptions): Promise<{success, error?}>`
- Usa `getUmuPath()` para localizar umu-run
- Llama a `spawn()` con 4 env vars: `WINEPREFIX`, `GAMEID`, `PROTONPATH`, `STORE`

### 5. `src/backend/relic/umu/index.ts` — Barrel export

### 6. `src/backend/config.ts` — Default de `protonPath` en `getFactoryDefaults()`

```typescript
function detectGeProton(): string {
  if (!existsSync(steamCompatDir)) return ''
  const dirs = readdirSync(steamCompatDir)
  const geProton = dirs.find(d => /proton/i.test(d))
  return geProton ? join(steamCompatDir, geProton) : ''
}
```

Solo se ejecuta en el primer arranque (cuando no existe `config.json`).

### 7. `src/backend/relic/prefix.ts` — Implementar `prepareUmuPrefix()`

De stub a función async completa:

```typescript
export async function prepareUmuPrefix(
  gameInfo: GameInfo,
  installPath: string
): Promise<void> {
  const protonPath = GlobalConfig.get().getSettings().protonPath
  if (!protonPath) return

  const storeLabel = getUmuStoreLabel(gameInfo.runner)
  if (!storeLabel) return

  const umuId = await searchUmuGameId(storeLabel, gameInfo.app_name)
  const gameId = umuId ?? '0'

  const known = findShortcut(gameInfo.app_name)
  if (!known?.steamAppId) return

  const winePrefix = join(getSteamPath(), 'steamapps', 'compatdata', String(known.steamAppId), 'pfx')
  await launchUmu({ winePrefix, gameId, protonPath, store: storeLabel, executable: 'exit' })
}
```

### 8. `src/backend/relic/game_events.ts` — Actualizar llamada

Línea 154: `prepareUmuPrefix(input.gameInfo, input.installPath)` (ahora async, añadir `await`)

### 9. `src/frontend/screens/Settings/components/ProtonPath.tsx` — Nuevo componente

Igual que `DefaultInstallPath` pero con `useSetting('protonPath', '')`.

### 10. `src/frontend/screens/Settings/components/index.ts` — Exportar

### 11. `src/frontend/screens/Settings/sections/GeneralSettings/index.tsx` — Renderizar `<ProtonPath />`

### 12. Tests

- `umu/__tests__/store.test.ts` — store label mapping + API lookup
- `umu/__tests__/launcher.test.ts` — spawn con env vars correctas
- `__tests__/prefix.test.ts` — casos: sin protonPath, sin storeLabel, sin steamAppId, éxito

---

## Notas importantes

- **Store labels UMU ≠ storeMap de Relic**: UMU usa `egs` (Epic), no `epic`. Mapas separados.
- **GAMEID=0**: Cuando el juego no está en BBDD UMU, se pasa `GAMEID=0` (prefix por defecto). El comando se ejecuta igual.
- **`"exit"` como argumento**: Para crear/configurar el prefijo sin lanzar nada.
- **`prepareUmuPrefix` es async**: Usar `await` en `game_events.ts`.
- **Gate principal**: `protonPath !== ''` en config. No `isUmuSupported()`.
- **`fetch` en Node 24**: Global, no necesita polyfill.
- **Dead code cleanup**: Eliminar `umuSupport` de `ExperimentalFeatures` y los 4 imports muertos de `isUmuSupported` en store managers.
