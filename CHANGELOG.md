# Changelog

## 0.6.2 — Helper Binaries Refresh

### Español

#### Añadido

- **EOS Overlay en los prefijos de los juegos de Epic.** Tras crear el prefijo
  con `umu-run`, Relic lanza por el mismo camino `c:\relic\eos-overlay.bat`, que
  instala y activa el overlay de Epic Online Services dentro de ese prefijo. El
  bat se genera al arrancar Relic (junto a `syncMountBin()`) en
  `~/.local/share/relic/mount/eos-overlay.bat`, así que existe siempre, y el
  overlay se descarga una sola vez a `c:\relic\eos`, compartido por todos los
  prefijos.
- El bat ejecuta **tres** acciones, no dos: `install`, `update` y `enable`.
  Leyendo `manage_eos_overlay()` en el `cli.py` de legendary, `install` y
  `update` cortan con "up to date, nothing to do" en cuanto el overlay consta
  instalado — y ese estado vive en `LEGENDARY_CONFIG_PATH`, que Relic comparte
  entre todos los prefijos vía el mount. Es decir: funcionan en el primer juego
  de Epic y, del segundo en adelante, salen antes de escribir el registro del
  prefijo nuevo y dejan el overlay inactivo. `enable` es la acción que lo
  escribe explícitamente, y es idempotente. Hay un test de regresión sobre esa
  línea concreta (verificado borrándola y confirmando que el test falla).
- Un fallo del overlay **no** aborta la instalación: se registra como aviso y el
  juego llega a Steam igual.
- Ojo al tocar `prepareUmuPrefix()`: el prefijo se crea lanzando `umu-run exit`,
  y `exit` **no es un ejecutable** — es un truco para que proton inicialice el
  prefijo y termine, y se usa para todas las tiendas. umu avisa
  ("Executable not found: exit") y devuelve código 1 **siempre**, aunque el
  prefijo se haya creado bien. Ese código no dice nada sobre si funcionó, así que
  no se puede condicionar nada a él. El log de ese paso ya no lo llama "failed";
  adjunta la salida de umu solo como información de diagnóstico. Hay un test de
  regresión que comprueba que el overlay se ejecuta pese al código de salida.

#### Cambiado

- **legendary sube de `0.20.43` a `0.21.0`, y pasa a descargarse del repo
  upstream `legendary-gl/legendary` en vez del fork
  `Heroic-Games-Launcher/legendary`.** El fork de Heroic sigue congelado en
  `0.20.43`, mientras que upstream (que se movió de `derrod/legendary` a
  `legendary-gl/legendary`) ya publica la 0.21.0. Los nombres de los assets
  cambian en x64 — `legendary_linux_x86_64` → `legendary_linux_x64` y
  `legendary_windows_x86_64.exe` → `legendary_windows_x64.exe` —; los de arm64
  se mantienen.
- **Eliminado `--accept-path` del tipo `SyncSavesCommand`.** Comparando todos los
  flags que declara Relic contra el `--help` real de legendary 0.21.0, era el
  único exclusivo del fork de Heroic; además era código muerto (declarado en el
  tipo, nunca pasado). El resto de flags y todos los subcomandos que usa Relic
  (`auth`, `cleanup`, `egl-sync`, `import`, `info`, `install`, `launch`, `list`,
  `move`, `status`, `sync-saves`, `uninstall`) existen en 0.21.0.
- **gogdl sube de `v1.2.2` a `v1.3.0`.** La release trae fallbacks de CDN,
  arreglo de conexiones IPv6 y timeouts, y estabilidad general de descarga —
  justo el área donde Relic arrastraba fallos (los errores de descarga y
  credenciales GOG parcheados en 0.5.3 y 0.5.4). Mismo repo
  (`Heroic-Games-Launcher/heroic-gogdl`) y mismos nombres de assets, así que es
  solo el cambio de tag. Sus flags también se diffearon contra el binario nuevo,
  sin diferencias.
- **`umu-run` pasa a descargarlo `meta/downloadHelperBinaries.ts`, como el resto
  de binarios auxiliares.** Era la única excepción: un blob de 419 KB commiteado
  a mano en `public/bin/umu/`, sin versión declarada en ningún sitio y sin forma
  de saber si estaba desfasado — algo que salió a la luz justo al revisar el
  resto de versiones. Ahora tiene su entrada en `RELEASE_TAGS` (`umu: '1.4.4'`,
  de `Open-Wine-Components/umu-launcher`; ojo, sus tags **no** llevan prefijo
  `v`) y se actualiza igual que los demás. El fichero se descarga del zipapp
  oficial `umu-launcher-<ver>-zipapp.tar`, que ya trae dentro el prefijo `umu/`
  con el binario y el symlink `umu_run.py`, así que se extrae sobre
  `public/bin/` y reproduce la estructura existente tal cual. El binario
  resultante es **idéntico** al que había, mismo sha256 (`d0005a58…`): el que
  estaba commiteado ya era exactamente la 1.4.4. Es un cambio de **gestión**, no
  de comportamiento — `getUmuPath()` sigue mirando la misma ruta y
  `electron-builder.yml` sigue empaquetando `build/bin/umu/*` sin tocar nada.
- **`umu-run` y `umu_run.py` salen del control de versiones** (añadidos a
  `public/bin/.gitignore` y desvinculados con `git rm --cached`), igual que
  legendary, gogdl, nile y comet. Deja de meterse un blob de 419 KB en el
  historial en cada actualización de umu.
- **El runner `.bat` de Epic ejecuta `legendary status` en vez de
  `legendary --version`** antes de lanzar el juego. Deja en la consola el estado
  de la cuenta y de la instalación, no solo el número de versión.
- **Revisado el resto de binarios auxiliares; ninguno tenía versión nueva.**
  `nile` (v1.2.0), `comet` (v0.3.2) y `epic-integration` (v0.4) ya estaban en su
  última release. `zoom-platform` no está versionado — se descarga siempre desde
  `zoom-platform.sh`, y su "tag" solo sirve de cache-buster local.

Todos los bumps se propagan solos: `meta/downloadHelperBinaries.ts` compara
`RELEASE_TAGS` contra `public/bin/.release_tags` y re-descarga lo que haga falta
en el siguiente build.

#### Corregido

- **El fallback de caché corrupta en `compareDownloadedTags()` se olvidaba de
  binarios.** Si `public/bin/.release_tags` no era JSON válido, devolvía una
  lista escrita a mano que omitía `zoom-platform` — y habría omitido también
  `umu`. Ahora deriva la lista de `RELEASE_TAGS`, así que no puede volver a
  desincronizarse al añadir un binario.

### English

#### Added

- **EOS Overlay in Epic game prefixes.** Once the prefix is created with
  `umu-run`, Relic runs `c:\relic\eos-overlay.bat` through the same path, which
  installs and enables the Epic Online Services overlay inside that prefix. The
  script is generated at startup (next to `syncMountBin()`) at
  `~/.local/share/relic/mount/eos-overlay.bat`, so it always exists, and the
  overlay itself is downloaded once into `c:\relic\eos`, shared by every prefix.
- The script runs **three** actions, not two: `install`, `update` and `enable`.
  Reading `manage_eos_overlay()` in legendary's `cli.py`, `install` and `update`
  bail out with "up to date, nothing to do" as soon as the overlay is recorded as
  installed — and that state lives in `LEGENDARY_CONFIG_PATH`, which Relic shares
  across every prefix through the mount. So they work for the first Epic game
  and, from the second onwards, return before writing the new prefix's registry,
  leaving the overlay inactive. `enable` is the action that writes it explicitly,
  and it's idempotent. There's a regression test on that specific line (verified
  by deleting it and confirming the test fails).
- An overlay failure does **not** abort the install: it's logged as a warning and
  the game still reaches Steam.
- Careful when touching `prepareUmuPrefix()`: the prefix is created by running
  `umu-run exit`, and `exit` is **not an executable** — it's a trick to make
  proton initialise the prefix and quit, used for every store. umu warns
  ("Executable not found: exit") and returns code 1 **always**, even when the
  prefix was created just fine. That code says nothing about whether it worked,
  so nothing may be gated on it. The log for that step no longer calls it
  "failed"; it attaches umu's output purely as diagnostics. A regression test
  asserts the overlay still runs regardless of that exit code.

#### Changed

- **legendary bumped from `0.20.43` to `0.21.0`, now downloaded from the
  upstream `legendary-gl/legendary` repo instead of the
  `Heroic-Games-Launcher/legendary` fork.** Heroic's fork is stuck at `0.20.43`,
  while upstream (moved from `derrod/legendary` to `legendary-gl/legendary`)
  ships 0.21.0. The x64 asset names changed —
  `legendary_linux_x86_64` → `legendary_linux_x64` and
  `legendary_windows_x86_64.exe` → `legendary_windows_x64.exe`; arm64 names are
  unchanged.
- **Dropped `--accept-path` from the `SyncSavesCommand` type.** Diffing every
  flag Relic declares against legendary 0.21.0's actual `--help`, it was the only
  Heroic-fork-exclusive one, and it was dead code anyway (declared in the type,
  never passed). Every other flag and every subcommand Relic uses (`auth`,
  `cleanup`, `egl-sync`, `import`, `info`, `install`, `launch`, `list`, `move`,
  `status`, `sync-saves`, `uninstall`) exists in 0.21.0.
- **gogdl bumped from `v1.2.2` to `v1.3.0`.** The release brings CDN fallbacks,
  an IPv6-connection and timeout fix, and general download stability — exactly
  the area Relic had been hitting bugs in (the GOG download and credential
  failures patched in 0.5.3 and 0.5.4). Same repo
  (`Heroic-Games-Launcher/heroic-gogdl`) and same asset names, so it's just the
  tag change. Its flags were diffed against the new binary too, with no
  differences.
- **`umu-run` is now downloaded by `meta/downloadHelperBinaries.ts`, like every
  other helper binary.** It was the one exception: a hand-committed 419 KB blob
  under `public/bin/umu/`, with its version recorded nowhere and no way to tell
  whether it had fallen behind — which surfaced while checking all the other
  versions. It now has a `RELEASE_TAGS` entry (`umu: '1.4.4'`, from
  `Open-Wine-Components/umu-launcher`; note its tags carry **no** `v` prefix) and
  updates like the rest. It's fetched from the official
  `umu-launcher-<ver>-zipapp.tar`, which already contains the `umu/` prefix with
  the binary and the `umu_run.py` symlink, so extracting it over `public/bin/`
  reproduces the existing layout exactly. The resulting binary is **identical**
  to the previous one, same sha256 (`d0005a58…`): the committed copy was already
  exactly 1.4.4. This is a **management** change, not a behavioural one —
  `getUmuPath()` still looks at the same path and `electron-builder.yml` still
  packages `build/bin/umu/*` untouched.
- **`umu-run` and `umu_run.py` are out of version control** (added to
  `public/bin/.gitignore` and untracked via `git rm --cached`), matching
  legendary, gogdl, nile and comet. No more 419 KB blob entering history on every
  umu update.
- **The Epic `.bat` runner now runs `legendary status` instead of
  `legendary --version`** before launching the game, leaving account and install
  state in the console rather than just a version number.
- **Checked every other helper binary; none had a newer version.** `nile`
  (v1.2.0), `comet` (v0.3.2) and `epic-integration` (v0.4) were already on their
  latest release. `zoom-platform` isn't versioned at all — it's always fetched
  from `zoom-platform.sh`, and its "tag" is only a local cache-buster.

Every bump propagates on its own: `meta/downloadHelperBinaries.ts` compares
`RELEASE_TAGS` against `public/bin/.release_tags` and re-downloads whatever
changed on the next build.

#### Fixed

- **The corrupted-cache fallback in `compareDownloadedTags()` was missing
  binaries.** If `public/bin/.release_tags` wasn't valid JSON, it returned a
  hand-written list that left out `zoom-platform` — and would have left out `umu`
  too. It now derives the list from `RELEASE_TAGS`, so it can't drift again when
  a binary is added.

### Verificación / Verification

```
codecheck: 0 errors
lint:      0 errors (371 warnings)
tests:     247/247 (31 suites)
flags:     --help de legendary 0.21.0 y gogdl 1.3.0 diffeado contra los flags
           que declara Relic / legendary 0.21.0 and gogdl 1.3.0 --help diffed
           against every flag Relic declares
descarga:  public/bin/umu y .release_tags borrados y re-descargados desde cero;
           sha256 de umu-run idéntico al binario que estaba commiteado, symlink
           y permisos 755 intactos / public/bin/umu and .release_tags wiped and
           re-downloaded from scratch; umu-run sha256 identical to the
           previously committed binary, symlink and 755 mode intact
versiones: legendary 0.21.0, gogdl 1.3.0, umu-run 1.4.4
```

---

## 0.6.1 — SteamGridDB Plaintext Storage & History Freeze

### Español

#### Seguridad

- **La API key de SteamGridDB se guarda ahora en texto plano, a propósito.**
  Se intentaba cifrar con `safeStorage` de Electron, pero en la práctica
  resultó poco fiable: `isEncryptionAvailable()` daba `false` incluso forzando
  `--password-store` (`basic`, `gnome-libsecret`, `kwallet6`, `detect`)
  cuando el keyring del sistema (KWallet) no arrancaba — algo frecuente en
  Linux fuera de un GNOME/KDE completamente estándar. Cada arranque dejaba un
  aviso de "guardando en texto plano" que en la práctica era el 100% de las
  veces. En vez de mantener una ruta de cifrado que casi nunca se usaba, se
  simplificó: la key se guarda igual que el resto de settings de Relic, y el
  texto de ayuda en Settings lo dice explícitamente. Un valor cifrado de esa
  ventana (`sgdb:v1:...`) no es recuperable y se limpia solo, en vez de
  enviarse por error como API key.

#### Documentación

`HISTORY.md`, `HISTORY_ADD.md` y `HISTORY_REMOVE.md` quedan congelados a partir
de esta versión — el solapamiento con este mismo `CHANGELOG.md` era casi total.
Se conservan como referencia de la limpieza inicial del fork; el historial de
aquí en adelante vive solo aquí.

#### Calidad de código

683 → 330 avisos de ESLint (0 errores durante todo el proceso). No fue una
pasada automática: cada categoría de aviso (`no-floating-promises`,
`require-await`, `unbound-method`, `react-hooks/rules-of-hooks`,
`react-hooks/exhaustive-deps`, un falso positivo de `import-x`) se revisó caso
por caso, distinguiendo entre "hace falta `void`/`await`" y "esto es un bug
real". Salieron varios bugs reales de paso:

- **Errores de actualización silenciados**: `handleUpdate()` en `GameCard` y
  `GamePage` llamaba a `updateGame()` sin `await` ni `.catch()`, así que un
  fallo de actualización no llegaba a ningún sitio, ni consola ni UI. Ahora se
  espera la promesa.
- **Dos hooks de React llamados condicionalmente**: `DownloadManagerItem` y
  `DLCDownloadListing` llamaban hooks después de un `return` anticipado, lo
  que puede desincronizar el orden de hooks entre renders. Corregido
  reordenando el guard tras las llamadas a hooks.
- **Arranque sin red de seguridad**: la cadena `app.whenReady().then(async () =>
{...})` en `main.ts` no tenía `.catch()` — un fallo durante migraciones, init
  de i18n o creación de ventana desaparecía sin dejar rastro en el log, sin
  ningún `unhandledRejection` que lo recogiera tampoco.
- **Descarga de imágenes de caché sin registrar fallos**: `images_cache.ts`
  encadenaba `.then().finally()` sin `.catch()`; un fallo de red al descargar
  una portada de SteamGridDB quedaba como rejection no gestionada, invisible.
- Las funciones `onGameInstalled`/`onGameImported`/`onGameMoved` del módulo
  `relic` — el código que de verdad añade el juego a Steam — se llamaban sin
  `await` ni `.catch()` desde GOG/Legendary/Nile. Los fallos esperados ya se
  logueaban dentro, pero una excepción inesperada ahí se perdía sin más.

Código muerto eliminado de paso: 3 ficheros `storeManagers/*/setup.ts` sin
ningún importador en todo el repo, y un prop `appName` de `ThirdPartyDialog`
que solo aparecía en un array de dependencias mal puesto, nunca usado de
verdad.

#### Cobertura de tests

232 → 237 tests. Añade el guard de regresión por mutación de la key heredada
cifrada (verificado rompiendo el código a propósito y confirmando que el test
correspondiente falla).

### English

#### Security

- **The SteamGridDB API key is now stored as plain text, on purpose.** It used
  to be encrypted with Electron's `safeStorage`, but that turned out
  unreliable in practice: `isEncryptionAvailable()` returned `false` even
  when forcing `--password-store` (`basic`, `gnome-libsecret`, `kwallet6`,
  `detect`) whenever the system keyring (KWallet) failed to start — common on
  Linux outside a fully standard GNOME/KDE setup. Every startup logged a
  "storing in plaintext" warning that was, in practice, the outcome 100% of
  the time. Rather than keep an encryption path that almost never actually
  encrypted anything, it was simplified: the key is now stored like every
  other Relic setting, and the Settings help text says so explicitly. A
  leftover encrypted value from that window (`sgdb:v1:...`) can't be
  recovered and is cleared automatically instead of being sent as an API key
  by mistake.

#### Documentation

`HISTORY.md`, `HISTORY_ADD.md` and `HISTORY_REMOVE.md` are frozen as of this
version — the overlap with this very `CHANGELOG.md` had become nearly total.
They're kept as a record of the fork's initial cleanup; history from here on
lives here only.

#### Code quality

683 → 330 ESLint warnings (0 errors throughout). Not an automated pass: every
warning category (`no-floating-promises`, `require-await`, `unbound-method`,
`react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, an `import-x`
false positive) was reviewed case by case, distinguishing "just needs
`void`/`await`" from "this is an actual bug." A few real bugs turned up along
the way:

- **Silently swallowed update errors**: `handleUpdate()` in `GameCard` and
  `GamePage` called `updateGame()` without `await` or `.catch()`, so an update
  failure went nowhere -- not the console, not the UI. It's awaited now.
- **Two React hooks called conditionally**: `DownloadManagerItem` and
  `DLCDownloadListing` called hooks after an early `return`, which can
  desync hook order across renders. Fixed by moving the guard after the hook
  calls.
- **Startup with no safety net**: the `app.whenReady().then(async () => {...})`
  chain in `main.ts` had no `.catch()` -- a failure during migrations, i18n
  init, or window creation vanished with nothing in the logs, and there was no
  `unhandledRejection` handler to catch it either.
- **Cached image downloads failing silently**: `images_cache.ts` chained
  `.then().finally()` with no `.catch()`; a network failure fetching a
  SteamGridDB cover became an unhandled rejection, invisible.
- The relic module's `onGameInstalled`/`onGameImported`/`onGameMoved` -- the
  code that actually adds the game to Steam -- were called without `await` or
  `.catch()` from GOG/Legendary/Nile. Expected failures were already logged
  inside them, but an unexpected exception there just disappeared.

Dead code removed along the way: 3 `storeManagers/*/setup.ts` files with no
importer anywhere in the repo, and a `ThirdPartyDialog` `appName` prop that
only ever showed up in a misplaced dependency array, never actually used.

#### Test coverage

232 → 237 tests. Adds the leftover-encrypted-key mutation-checked regression
guard (verified by breaking the code on purpose and confirming the matching
test fails).

### Verificación / Verification

```
codecheck: 0 errors
lint:      0 errors (330 warnings)
tests:     237/237 (31 suites)
i18n --ci: sin cambios / no changes
```

---

## 0.6.0 — Electron Decoupling (fase 1)

### Español

Primer paso de una refactorización mayor: **sacar el backend de Electron** para que
pueda ejecutarse como servicio independiente bajo Node, y que la interfaz sea solo
un cliente que habla con él por API.

#### Cambiado

- **Shim de `app.getPath()`**: `appDataPath` y `userDataPath` se calculan ahora en
  `constants/paths.ts` a partir del entorno (`XDG_CONFIG_HOME`, o `~/.config` como
  fallback según la spec XDG) en lugar de pedírselas a Electron. Replican la
  semántica de Electron en Linux exactamente: `appData` → `~/.config`,
  `userData` → `~/.config/relic`.
- **Shim de `app.isPackaged`**: nuevo `isPackaged` en `constants/environment.ts`,
  derivado de si la ejecución ocurre dentro del asar (`__dirname` contiene
  `app.asar`). Con esto **`constants/paths.ts` deja de importar `electron` por
  completo**. `main.ts` usa el mismo `isPackaged` compartido, para que no haya dos
  definiciones de "empaquetado" que puedan divergir.
- **Shim de `app.getVersion()`**: nuevos `relicVersion` y `relicUserAgent` en
  `constants/others.ts`, derivados de `package.json`. El bundler resuelve el import
  en build time (queda inlineado como constante), así que no hay acceso a filesystem
  en runtime ni dependencia de Electron. De paso unifica el User-Agent, que estaba
  duplicado literalmente en `steamgrid/utils.ts` y `relic/steamgrid/api.ts`.
- **10 ficheros dejan de importar `electron` por completo**: `constants/paths.ts`,
  `storeManagers/zoom/constants.ts`, `storeManagers/nile/library.ts`,
  `migration/migrations/legendary.ts`, `utils/systeminfo/relicVersion.ts`,
  `storeManagers/gog/presence.ts`, `storeManagers/gog/user.ts`,
  `utils/inet/downloader/index.ts`, `steamgrid/utils.ts` y `relic/steamgrid/api.ts`.
  Acoplamiento a Electron en el backend: **24 → 14 ficheros**.
- **Código muerto eliminado**: el ternario `isLinux ? ... : ...` de la migración de
  legendary tenía una rama inalcanzable (`isLinux` es `true` fijo en un proyecto
  Linux-only). Colapsado, junto con los imports de `isLinux` y `userHome` que
  quedaban sin uso.

#### Eliminado

- **`electron-store`, sustituido por `JsonStore` propio** (`backend/json_store.ts`).
  Estaba fijado en 8.x porque v9+ es ESM-only y rompía `jest.mock()` en CJS: el
  bloqueo queda resuelto eliminando la dependencia, no actualizándola.
  - Replica lo que Relic usaba: claves con notación por puntos, `cwd`/`name`/
    `clearInvalidConfig`, iterabilidad y `store` como getter y setter.
  - Relee el fichero en cada acceso, igual que `conf` (el motor de electron-store):
    backend y preload abren instancias distintas del mismo fichero y una escritura
    en uno tiene que verse en el otro.
  - Escritura atómica (write-then-rename) y formato byte-compatible (tabs, sin
    newline final), así que los ficheros existentes se leen y reescriben igual.
  - 21 tests nuevos, incluida la protección contra prototype pollution.
- **Soporte Snap, por completo.** Relic se distribuye exclusivamente como AppImage,
  así que todo el código condicional para Snap era muerto en la práctica:
  - `isSnap` y el uso de `SNAP_REAL_HOME` (`userHome` pasa a ser `homedir()`, sin
    aserción non-null).
  - `legendaryConfigPath` ya no tiene rama especial que ignorase `appFolder`.
  - El guard `if (!process.env.SNAP)` alrededor de `LEGENDARY_CONFIG_PATH`.
  - El aviso "Relic is running as a Snap" completo (dialog con checkbox y el ajuste
    `showSnapWarning` del configStore).
  - La ruta `/var/lib/snapd/hostfs/etc/os-release` en la detección de SO.
  - El bloque i18n `box.warning.snap` en los **47 locales**.

#### Ventajas

- **Habilita el backend como servicio**: sin dependencia de Electron para resolver
  rutas, el backend se acerca a poder correr bajo Node plano. Eso abre la puerta a
  clientes alternativos por API — por ejemplo un plugin de Decky Loader — sin
  reescribir la lógica de tiendas, descargas ni integración con Steam.
- **Desbloquea dependencias**: `electron-store` está fijado en 8.x por ser ESM-only
  desde v9 (ver `TODO_UPGRADE.md`). Quitar Electron de la capa de rutas es el
  requisito previo para sustituirlo.
- **Testeable sin Electron**: las rutas ya no necesitan que se mockee `electron`
  para resolverse.

#### Rendimiento

Todo lo siguiente se diagnosticó con logs de arranque reales, no solo con tests, y
se re-verificó arranque a arranque hasta confirmar el efecto:

- **`gogdl auth`: ~17 llamadas por arranque → 1.** `GOGUser.getCredentials()` se
  llama desde ~18 sitios (refresh de biblioteca, install, update, metadata…) y cada
  una lanzaba el proceso. Ahora las llamadas concurrentes comparten una sola
  ejecución y el resultado se reutiliza 60 s, acotado por el `expires_in` que
  reporta gogdl. Ataca la causa raíz de los bugs de salida vacía parcheados en
  0.5.3/0.5.4: cada spawn era otra oportunidad de fallo.
- **`getInstallInfo` deduplicado en los tres runners** (nile/legendary/gog): la
  caché de cada uno solo se escribía al terminar el fetch, así que dos llamantes
  concurrentes (varios componentes del frontend piden lo mismo por su cuenta)
  fallaban el cache los dos y ambos lanzaban proceso. Nuevo helper
  `shareInFlight()` compartido. En legendary, los reintentos recursivos re-entran
  en una función privada y no en el wrapper público — si no, se auto-bloquearían
  esperando su propia promesa para siempre.
- **Zoom: 3 verificaciones de login por arranque → 1.** `isLoggedIn()` no es una
  comprobación local, pega a `/li/loggedin` en cada llamada; `getUserDetails()`
  llamaba a `isLoggedIn()` y acto seguido pedía el mismo endpoint otra vez. Ahora
  una sola petición sirve de verificación para ambos caminos.
- **Nile sincronizaba la biblioteca dos veces al arrancar**: `init()` llamaba a
  `refresh()` (red) y el frontend disparaba otro refresh encima. Ahora `init()`
  solo carga de disco, igual que Legendary.

#### Corregido

- **Zoom borraba el token del usuario ante cualquier fallo de red.** Un corte de
  wifi, un timeout o un 500 de Zoom ejecutaban `logout()` y forzaban un
  re-login. Ahora solo un rechazo real de Zoom (401/403) cierra la sesión.
- **Nile reconstruía la biblioteca con datos del sync anterior**: `refreshNile()`
  no se esperaba antes de leer los ficheros que ese mismo sync estaba escribiendo.
  Ahora se espera (`await`), igual que ya hacía Legendary.
- **Notificación de "Epic offline" que saltaba con Epic funcionando bien**: si el
  componente buscado no aparecía en la respuesta de estado de Epic, se notificaba
  "offline" y a la vez se devolvía `false` ("no offline"). Heredado de Heroic.
- **Icono de grid `.ico` → `.png`** corregido, con test de regresión (el nombre
  está duplicado entre `download.ts` y `delete.ts`; si divergen, queda un fichero
  huérfano al desinstalar).

#### Empaquetado

- **AppImage: 209 MB → 203 MB, sin pagar el coste de arranque.**
  `node_modules/**/*` empaquetaba también las dependencias exclusivas del
  renderer (React, MUI, FontAwesome, react-router…) pese a que el renderer ya
  es un bundle autocontenido de Vite que nunca las toca en runtime — solo
  main/preload necesitan `node_modules` real. Se excluyeron 34 paquetes (53 con
  transitivos) calculados con el cierre real de `pnpm list --prod
--depth=Infinity` cruzado contra los `require()` literales del bundle
  compilado, no por nombre a ojo: `@babel/runtime` y `lodash` parecían
  candidatos pero los necesita el backend de verdad (transitivos de
  `easydl`/`steam-shortcut-editor`) y se quedaron. Verificado con un
  `pnpm dist:linux` completo y arrancando el binario empaquetado hasta
  "Frontend Ready" sin errores de módulo.
- **`compression: maximum` probado y revertido.** Bajaba el AppImage a 170 MB,
  pero un usuario reportó arranques muy lentos. Medido: extraer el squashfs
  tarda 11.7 s con `maximum` frente a 1.3 s con el valor por defecto — casi 9×
  más lento. Un AppImage se monta vía FUSE y descomprime bajo demanda **en
  cada arranque**, no se instala a disco una sola vez como un `.deb`, así que
  el coste de una compresión agresiva se paga siempre, no una vez. Mala
  relación esfuerzo/beneficio frente al ahorro de descarga.

#### Simplificación (~2.500 líneas fuera)

Nada de esto ayuda a descargar, instalar o añadir juegos a Steam:

- Sistema de notificaciones de escritorio completo (~18 sitios) y la ventana
  "About". Las notificaciones estaban guardadas por `!isSteamDeckGameMode`, así
  que en el modo consola de la Deck no se mostraban nunca.
- GOG Rich Presence: anunciaba un juego en marcha (Relic no lanza juegos), cada
  5 minutos, con un interruptor que ya no existía en la UI desde 0.4.0.
- Selector manual de portadas de SteamGridDB (`SteamGridDBPicker`): cadena
  muerta de punta a punta, sin renderizarse en ningún sitio.
- `showItemInFolder`: función + listener + tipo sin ningún binding en preload,
  el frontend no podía llamarla.
- `getSteamLibraries()`: cero llamantes en todo el repo; con ella se fue la
  dependencia `@node-steam/vdf`.
- `shell.openExternal`/`shell.openPath` de Electron sustituidos por un helper
  propio sobre `xdg-open`, que ya se usaba en otro punto del código.
- 3 dependencias de testing de frontend sin uso (`jest-environment-jsdom`,
  `@testing-library/jest-dom`, `@testing-library/react`): nunca hubo un
  proyecto de Jest para frontend.
- `pnpm lint-translations` arreglado (llevaba tiempo petando en el primer
  locale) y soporte Snap eliminado por completo (ver más abajo).

#### Otros ajustes de dependencias

- `zod` y `tmp` movidas de `devDependencies` a `dependencies`: se usan en código
  de producción del backend, no solo en tests.
- `@types/node` `^22.20.1` → `^24.13.3`, para que coincida con
  `engines.node: ">=24"` (Node real: 24.16.0).
- Actualizaciones patch/minor sin cambios de código: `@playwright/test`,
  `@vitejs/plugin-react-swc`, `esbuild`, `i18next-cli`, `i18next-fs-backend`,
  `simple-keyboard`, `typescript-eslint`, `electron` 43.2.0→43.3.0, `axios`
  1.18.1→1.19.0.

#### Cobertura de tests

133 → 232 tests. Incluye el módulo `relic/steamgrid/`, que no tenía ninguno pese
a ser el que corre en cada instalación real, y guards de regresión por mutación
(verificados rompiendo el código a propósito y confirmando que el test
correspondiente falla) en los puntos más frágiles: extensión del icono de grid,
dedup de credenciales/install-info, y el logout de Zoom.

#### Compatibilidad

Sin migración de datos. Las rutas resueltas son **idénticas** a las anteriores
(verificado contra el `~/.config/relic/` real), así que ninguna configuración,
login ni juego instalado cambia de sitio. El override de `CI=e2e` mantiene el
comportamiento previo: afecta solo a `appFolder`, no a `userDataPath`.

### English

First step of a larger refactor: **taking the backend out of Electron** so it can
run as a standalone Node service, with the UI becoming just a client that talks to
it over an API.

#### Changed

- **`app.getPath()` shim**: `appDataPath` and `userDataPath` are now computed in
  `constants/paths.ts` from the environment (`XDG_CONFIG_HOME`, falling back to
  `~/.config` per the XDG spec) instead of asking Electron. They mirror Electron's
  Linux semantics exactly: `appData` → `~/.config`, `userData` → `~/.config/relic`.
- **`app.isPackaged` shim**: new `isPackaged` in `constants/environment.ts`,
  derived from whether execution happens inside the asar (`__dirname` contains
  `app.asar`). With it, **`constants/paths.ts` no longer imports `electron` at
  all**. `main.ts` uses the same shared `isPackaged`, so there aren't two
  definitions of "packaged" that can drift apart.
- **`app.getVersion()` shim**: new `relicVersion` and `relicUserAgent` in
  `constants/others.ts`, derived from `package.json`. The bundler resolves the
  import at build time (it ends up inlined as a constant), so there's no runtime
  filesystem access and no Electron dependency. It also unifies the User-Agent,
  which was duplicated verbatim in `steamgrid/utils.ts` and
  `relic/steamgrid/api.ts`.
- **10 files no longer import `electron` at all**: `constants/paths.ts`,
  `storeManagers/zoom/constants.ts`, `storeManagers/nile/library.ts`,
  `migration/migrations/legendary.ts`, `utils/systeminfo/relicVersion.ts`,
  `storeManagers/gog/presence.ts`, `storeManagers/gog/user.ts`,
  `utils/inet/downloader/index.ts`, `steamgrid/utils.ts` and
  `relic/steamgrid/api.ts`. Backend Electron coupling: **24 → 14 files**.
- **Dead code removed**: the `isLinux ? ... : ...` ternary in the legendary
  migration had an unreachable branch (`isLinux` is hardcoded `true` in a
  Linux-only project). Collapsed, along with the now-unused `isLinux` and
  `userHome` imports.

#### Removed

- **`electron-store`, replaced by an in-house `JsonStore`** (`backend/json_store.ts`).
  It was pinned at 8.x because v9+ is ESM-only and broke `jest.mock()` under CJS;
  the blocker is resolved by dropping the dependency, not upgrading it.
  - Mirrors what Relic actually used: dot-notation keys, `cwd`/`name`/
    `clearInvalidConfig`, iterability, and `store` as both getter and setter.
  - Re-reads the file on every access, like `conf` (electron-store's engine) does:
    the backend and the preload open separate instances of the same file, and a
    write through one must be visible to the other.
  - Atomic writes (write-then-rename) and byte-compatible formatting (tabs, no
    trailing newline), so existing files are read and rewritten identically.
  - 21 new tests, including prototype-pollution guarding.
- **Snap support, entirely.** Relic ships exclusively as an AppImage, so every
  Snap-conditional code path was dead in practice:
  - `isSnap` and the `SNAP_REAL_HOME` usage (`userHome` is now just `homedir()`,
    dropping a non-null assertion).
  - `legendaryConfigPath` no longer has a special branch bypassing `appFolder`.
  - The `if (!process.env.SNAP)` guard around `LEGENDARY_CONFIG_PATH`.
  - The whole "Relic is running as a Snap" warning (dialog with checkbox plus the
    `showSnapWarning` configStore setting).
  - The `/var/lib/snapd/hostfs/etc/os-release` path in OS detection.
  - The `box.warning.snap` i18n block across all **47 locales**.

#### Why it matters

- **Unlocks the backend-as-a-service path**: with no Electron dependency for path
  resolution, the backend moves closer to running under plain Node. That opens the
  door to alternative API clients — a Decky Loader plugin, for instance — without
  rewriting the store, download or Steam-integration logic.
- **Unblocks dependencies**: `electron-store` is pinned at 8.x because v9+ is
  ESM-only (see `TODO_UPGRADE.md`). Removing Electron from the path layer is the
  prerequisite for replacing it.
- **Testable without Electron**: path resolution no longer needs `electron` mocked.

#### Performance

Every item below was diagnosed from real startup logs, not just tests, and
re-verified boot after boot until the effect was confirmed:

- **`gogdl auth`: ~17 calls per startup → 1.** `GOGUser.getCredentials()` is
  called from ~18 places (library refresh, install, update, metadata…) and each
  one spawned the process. Concurrent callers now share one in-flight run, and
  the result is reused for 60s, capped by the `expires_in` gogdl reports.
  Addresses the root cause behind the empty-output bugs patched in 0.5.3/0.5.4:
  each spawn was another chance to hit that failure.
- **`getInstallInfo` deduped across all three runners** (nile/legendary/gog):
  each cache was only written once its fetch finished, so two concurrent callers
  (several frontend components ask independently) both missed the cache and both
  spawned a process. New shared `shareInFlight()` helper. In legendary, the
  recursive retries re-enter a private function rather than the public wrapper —
  otherwise they'd deadlock waiting on their own in-flight promise.
- **Zoom: 3 login verifications per startup → 1.** `isLoggedIn()` is not a local
  check, it hits `/li/loggedin` on every call; `getUserDetails()` called
  `isLoggedIn()` and then requested the very same endpoint again. One request now
  serves both paths.
- **Nile synced the library twice on startup**: `init()` called `refresh()`
  (network) and the frontend fired another refresh on top. `init()` now only
  loads from disk, matching Legendary.

#### Fixed

- **Zoom deleted the user's token on any network failure.** A dropped
  connection, a timeout or a 500 from Zoom ran `logout()` and forced a
  re-login. Only an actual rejection from Zoom (401/403) signs the user out now.
- **Nile rebuilt the library from the previous sync's data**: `refreshNile()`
  wasn't awaited before reading the very files that sync was writing. It's
  awaited now, matching what Legendary already did.
- **"Epic offline" notification firing while Epic was fine**: if the queried
  component was missing from Epic's status response, it notified "offline"
  while simultaneously returning `false` ("not offline"). Inherited from Heroic.
- **Grid icon `.ico` → `.png`** fixed, with a regression test (the filename is
  duplicated between `download.ts` and `delete.ts`; if they drift, a file is
  left orphaned on uninstall).

#### Packaging

- **AppImage: 209 MB → 203 MB, without paying for it at startup.**
  `node_modules/**/*` also packaged renderer-only dependencies (React, MUI,
  FontAwesome, react-router…) even though the renderer is already a
  self-contained Vite bundle that never touches them at runtime — only
  main/preload need real `node_modules`. 34 packages excluded (53 with
  transitives), computed from the real closure of `pnpm list --prod
--depth=Infinity` cross-checked against the literal `require()` calls in
  the built bundle, not guessed by name: `@babel/runtime` and `lodash` looked
  like candidates but are genuine backend transitives (pulled in by
  `easydl`/`steam-shortcut-editor`) and stayed. Verified with a full
  `pnpm dist:linux` and by launching the packaged binary through to
  "Frontend Ready" with no module errors.
- **`compression: maximum` tried and reverted.** It brought the AppImage down
  to 170 MB, but a user reported very slow startups. Measured: extracting the
  squashfs takes 11.7s with `maximum` versus 1.3s with the default — nearly
  9x slower. An AppImage mounts via FUSE and decompresses on demand **on
  every launch**, unlike a `.deb` that installs to disk once, so an
  aggressive compression level is paid every time, not once. A bad trade for
  the download-size saving.

#### Simplification (~2,500 lines removed)

None of this helps download, install or add games to Steam:

- The entire desktop notification system (~18 call sites) and the About
  window. Notifications were guarded by `!isSteamDeckGameMode`, so they never
  showed in the Deck's console mode anyway.
- GOG Rich Presence: announced a game in progress (Relic never launches games)
  every 5 minutes, behind a toggle that had already been dropped from the UI
  in 0.4.0.
- The manual SteamGridDB cover picker (`SteamGridDBPicker`): dead end to end,
  never rendered anywhere.
- `showItemInFolder`: function + listener + type with no preload binding at
  all — the frontend could never call it.
- `getSteamLibraries()`: zero callers anywhere in the repo; the
  `@node-steam/vdf` dependency went with it.
- Electron's `shell.openExternal`/`shell.openPath` replaced by an in-house
  helper over `xdg-open`, already used elsewhere in the code.
- 3 unused frontend testing dependencies (`jest-environment-jsdom`,
  `@testing-library/jest-dom`, `@testing-library/react`): there was never a
  frontend Jest project.
- `pnpm lint-translations` fixed (had been crashing on the first locale), and
  Snap support removed entirely (see below).

#### Other dependency work

- `zod` and `tmp` moved from `devDependencies` to `dependencies`: used in
  production backend code, not just tests.
- `@types/node` `^22.20.1` → `^24.13.3`, to match `engines.node: ">=24"` (the
  actual Node here is 24.16.0).
- Low-effort patch/minor bumps, no code changes needed: `@playwright/test`,
  `@vitejs/plugin-react-swc`, `esbuild`, `i18next-cli`, `i18next-fs-backend`,
  `simple-keyboard`, `typescript-eslint`, `electron` 43.2.0→43.3.0, `axios`
  1.18.1→1.19.0.

#### Test coverage

133 → 232 tests. Includes the `relic/steamgrid/` module, which had none despite
being the one that runs on every real install, and mutation-checked regression
guards (verified by breaking the code on purpose and confirming the matching
test fails) at the most fragile points: the grid icon extension, credentials/
install-info dedup, and Zoom's logout path.

#### Compatibility

No data migration. Resolved paths are **identical** to before (verified against the
real `~/.config/relic/`), so no config, login or installed game moves. The `CI=e2e`
override keeps its previous behaviour: it affects `appFolder` only, not
`userDataPath`.

### Verificación / Verification

```
codecheck: 0 errors
lint:      0 errors (683 warnings)
tests:     232/232 (30 suites)
i18n --ci: sin cambios / no changes
build:     OK (pnpm dist:linux, AppImage 203 MB, arranque real verificado)
```

---

## 0.5.4 — Update Error Diagnostics & Move Fixes

### Español

#### Corregido

- **Credenciales GOG**: se loguea `gogdl auth returned empty output - re-login may be required` cuando `gogdl auth` devuelve salida vacía. La causa raíz de los fallos de actualización con mensaje vacío queda visible en los logs.
- **Error message en actualizaciones**: `update()` de GOG y Legendary ahora devuelve el error real en lugar de `{ status: 'error' }` sin mensaje.
  - GOG: `error: 'No credentials'` si faltan credenciales, `error: res.error` si la descarga falla.
  - Legendary: `error: res.error`.
- **Propagación del error**: `updateQueueElement()` deja de enviar un string vacío y propaga el error real de `update()` en el evento de fallo. Ahora el frontend muestra la causa concreta del fallo de actualización.
- **Diseño de Zoom sin indirección estable (causa raíz)**: Zoom era el único runner que apuntaba Steam y `compatdata` **directamente** a la ruta real de instalación, en vez de a través del symlink estable `relicGamesPath/<nombre>` que ya usan GOG/Legendary/Nile. Esto rompía el juego al moverlo: el `execPath` guardado en el shortcut y el symlink de `compatdata/<steamAppId>` quedaban apuntando a una ruta que ya no existía. Ahora `createRunnerFile()` crea ese symlink para Zoom también, y tanto el ejecutable usado por Steam como `compatdata` se construyen a través de él. Mover el juego pasa a ser solo actualizar el destino de un symlink — Steam y `compatdata` no necesitan tocarse nunca.
- **Persistencia inconsistente al mover juegos**: si la creación del nuevo symlink (`relic/games/<nombre>`) fallaba, `onGameMoved()` seguía guardando la nueva ruta en `steam_shortcuts.json` como si hubiese funcionado. Ahora aborta sin persistir si el symlink no se pudo crear, evitando que el estado guardado quede desincronizado del filesystem real.
- **`moveInstall()` de Zoom no implementado**: era un stub que devolvía siempre `'Move install not implemented'` sin mover nada, por lo que nunca llegaba a ejecutarse `onGameMoved()`. Ahora mueve los ficheros vía `moveOnUnix()`, actualiza `install_path` en el store de Zoom y llama a `onGameMoved()`, igual que GOG, Legendary y Nile.
- **Limpieza al desinstalar juegos Zoom**: `onGameUninstalled()` no borraba el symlink de `relicGamesPath` para Zoom (solo el de prefijo). Ahora se borra para todos los runners, sin tocar nunca el ejecutable real del juego.

#### Añadido

- **Evento `onGameRepaired`**: nuevo evento del módulo relic. Tras una reparación exitosa, regenera el runner `.bat` del juego en `~/.local/share/relic/runner/` vía `createRelicBat()`, tomando los datos de `steam_shortcuts.json`. No añade a Steam ni toca prefijos. Se invoca desde el handler `repair` de `main.ts` únicamente cuando no hay error.
- **Grid icon `.ico` → `.png`**: el icono de grid de SteamGridDB se guarda como `<appid>_icon.png` en lugar de `<appid>_icon.ico` (extensión hardcodeada en `download.ts` y `delete.ts`).

### English

#### Fixed

- **GOG credentials**: logs `gogdl auth returned empty output - re-login may be required` when `gogdl auth` returns empty output. The root cause of update failures with empty error messages is now visible in the logs.
- **Update error messages**: `update()` in GOG and Legendary now returns the real error instead of `{ status: 'error' }` with no message.
  - GOG: `error: 'No credentials'` if credentials are missing, `error: res.error` if the download fails.
  - Legendary: `error: res.error`.
- **Error propagation**: `updateQueueElement()` no longer sends an empty string and propagates the real error from `update()` in the failure event. The frontend now shows the concrete cause of an update failure.
- **Zoom's design lacked a stable indirection layer (root cause)**: Zoom was the only runner pointing Steam and `compatdata` **directly** at the real install path, instead of through the stable `relicGamesPath/<name>` symlink already used by GOG/Legendary/Nile. This broke the game after moving it: the `execPath` stored in the shortcut and the `compatdata/<steamAppId>` symlink kept pointing at a path that no longer existed. `createRunnerFile()` now creates that symlink for Zoom too, and both the executable Steam launches and `compatdata` are built through it. Moving the game is now just repointing one symlink — Steam and `compatdata` never need to change.
- **Inconsistent persistence when moving games**: if creating the new symlink (`relic/games/<name>`) failed, `onGameMoved()` still saved the new path to `steam_shortcuts.json` as if it had succeeded. It now aborts without persisting if the symlink couldn't be created, preventing the saved state from drifting out of sync with the actual filesystem.
- **Zoom's `moveInstall()` was unimplemented**: it was a stub that always returned `'Move install not implemented'` without moving anything, so `onGameMoved()` never actually ran. It now moves the files via `moveOnUnix()`, updates `install_path` in the Zoom store, and calls `onGameMoved()`, just like GOG, Legendary and Nile.
- **Cleanup on uninstalling Zoom games**: `onGameUninstalled()` didn't remove the `relicGamesPath` symlink for Zoom (only the prefix symlink). It's now removed for every runner, without ever touching the game's real executable.

#### Added

- **`onGameRepaired` event**: new relic module event. After a successful repair, it regenerates the game's runner `.bat` in `~/.local/share/relic/runner/` via `createRelicBat()`, using data from `steam_shortcuts.json`. It does not add to Steam or touch prefixes. It is invoked from the `repair` handler in `main.ts` only when there is no error.
- **Grid icon `.ico` → `.png`**: the SteamGridDB grid icon is saved as `<appid>_icon.png` instead of `<appid>_icon.ico` (extension hardcoded in `download.ts` and `delete.ts`).

### Verificación / Verification

```
codecheck: 0 errors
lint:      0 errors (704 warnings)
tests:     139/139 (22 suites)
```

---

## 0.5.3 — Bugfixes & Path Persistence

### Corregido

- GOG credentials: `getCredentials()` ya no lanza `SyntaxError: Unexpected end of JSON input` cuando gogdl devuelve salida vacía o parcial. Ahora comprueba `stdout.trim()` antes de `JSON.parse`.
- Version parsing: `getLegendaryVersion()` usa un regex simplificado `([\d.]+)` → muestra `v0.20.43` en vez de `invalid`. `getGogdlVersion()` y `getNileVersion()` añaden `.trim()` + check de vacío → muestran `1.2.2` en vez de un campo vacío.
- Log frontend: `Refreshing all Library` en vez de `Refreshing undefined Library` cuando no se especifica un runner concreto.

### Persistencia de rutas al mover juegos

- GOG: `changeGameInstallPath()` usa `installedGamesStore` como fuente primaria en lugar de abortar si el juego no está en el Map de biblioteca. Corrige que `install_path` quedara desactualizado en `gog_store/installed.json` tras mover juegos (Worms Revolution, Blade of Darkness).
- Legendary: tras `legendary move --skip-move`, se escribe `install_path` directamente en `installed.json` como fallback. Garantiza que el nuevo path persista al reiniciar.

### Verificación

```
codecheck: 0 errores
lint:      0 errores (692 warnings)
tests:     127/127 (21 suites)
```

---

## 0.4.0 — Pulido

### Añadido

- Sidebar: Downloads entre Library y Manage Accounts
- Sidebar: General y Log como items independientes (ya no submenú de Settings)
- Sidebar: icono SVG personalizado para Log y Registro
- Traducciones: `proton-path` → `GE-Proton path` en 47 locales
- ESLint: 134 errores eliminados (`no-unused-vars`, `no-require-imports`, `no-empty`, `no-constant-condition`)
- `src/common/formatBytes.ts`: helper `formatBytes()` reemplaza a `filesize`
- `src/frontend/helpers/cx.ts`: helper `cx()` reemplaza a `classnames`
- Tests: 35 nuevos tests unitarios para módulos `relic/` (store, game_events, prefix, windowify)
- `scripts/install.sh`: instalador de una línea vía `curl \| bash` (AppImage + Steam + grids)
- Enlace "Help translate Relic" eliminado (LanguageSelector, Login, IPC, tipos, URLs)
- Clave i18n `other.weblate` eliminada de 47 locales

### Tests

- `steam_shortcuts/__tests__/store.test.ts` (10 tests): persistencia de shortcuts — list, find, add, remove, upsert
- `steam_shortcuts/__tests__/game_events.test.ts` (+9 tests): Linux native, zoom uninstall, edge cases, runnerFile errors
- `relic/__tests__/prefix.test.ts` (8 tests): symlinkPrefix, removePrefixSymlink, preparePrefix, error handling
- `relic/__tests__/windowify.test.ts` (8 tests): transformaciones legendary/gog, syncMountBin, file copy/hash

### Eliminado

- Filtro "Browser" de la biblioteca (no hacía nada)
- ConsoleCard: fallback a `relic_card.jpg`
- Submenú de Settings (General + Log promovidos al nivel superior)
- Variable muerta `isBrowserGame` en GameCard y GamePage
- ~45 archivos: imports y variables muertas del código heredado de Heroic
- 10 dependencias muertas: `ini`, `sanitize-filename`, `semver`, `short-uuid`, `yocto-queue`, `@types/ini`, `@types/plist`, `@types/semver`, `fast-xml-parser`, `undici`
- `tslib` + `importHelpers: true` (innecesario con `noEmit`, build usa esbuild/SWC)
- `node-gyp` (ningún módulo nativo lo requiere)
- 4 dependencias sidegradeadas: `filesize`, `classnames`, `sanitize-html`, `recharts` (reemplazadas por helpers inline o SVG)
- `@types/sanitize-html` (innecesario sin `sanitize-html`)
- Login: dead code `oldMac`/`oldMacMessage`/`disabled` (siempre false)
- Settings: 9 componentes legacy nunca renderizados (`AlternativeExe`, `AltGOGdlBin`, `AltLegendaryBin`, `AltNileBin`, `DisableGOGPresence`, `ExperimentalFeatures`, `IgnoreGameUpdates`, `OfflineMode`, `PreferedLanguage`)
- `backend/utils.ts`: `moveOnWindows()` (Robocopy, Windows-only, 0 calls)
- `Library/index.tsx`: migration fallback de `category`/`filterPlatform` (TODOs)
- `GlobalState.tsx`: `storage.setItem('category')` dead write
- `CODE_OF_CONDUCT.md`, `DEPENDENCIES_DELETED.md` (boilerplate heredado de Heroic)

### Cambiado

- Logo de Registro: de `settings-sharp.svg` a `logs.svg`
- Pre-commit hook: `pnpm lint-fix` pasa sin errores
- `tsconfig.json`: `importHelpers: true` → `false` (build usa esbuild/SWC)

### Dependencias

- 15 paquetes eliminados: `source-map-support`, `@types/source-map-support`, `graceful-fs`, `@types/graceful-fs`, `cross-env`, `i18next-parser`, `filesize`, `classnames`, `sanitize-html`, `recharts`, `fs-extra`, `@types/fs-extra`, `@testing-library/user-event`, `@testing-library/dom`, `resolutions.ts-morph`
- 2 helpers inline: `formatBytes()` y `cx()` reemplazando `filesize` y `classnames`
- `i18next-parser` → `i18next-cli` (deprecado). Config en `i18next.config.ts`
- `@fontsource/*` 4→5, `@fortawesome/*` 6→7, `zustand` 4→5, `zod` 3→4, `fuse.js` 6→7, `shlex` 2→3, `eslint-plugin-react-hooks` 5→7
- Tooling modernizado: `electron-vite` 3→5, `@vitejs/plugin-react-swc` 3→4, `jest` 29→30, `typescript` 5→6
- `tsconfig.json`: `moduleResolution: "bundler"`, `paths` sin `baseUrl`, `importHelpers: false`
- 2 dependencias bloqueadas: `electron-store` (ESM-only), `eslint` v10 (eslint-plugin-react incompatible)
- Verificación: codecheck 0 errores, test 126/126, lint 0 errores, build exitoso

---

## 0.2.3 — Events & Native Support

### Añadido

- `onGameImported()` delega en `onGameInstalled()` (flujo completo)
- `onGameMoved()`: mueve symlink + actualiza `steam_shortcuts.json`
- Soporte para juegos Linux nativos (GOG): omite .bat, windowify y prefix
- `createGameSymlink()` como función pública compartida
- Console mode: botón "Más" (clave `console.more`, 47 locales)
- Console mode: botón A-Z movido a `consoleLogoRow`

### Eliminado

- Sistema `installCompleted` (IPC, hook, overlay, dialog)
- `existsSync` en `onGameMoved` (fallaba con symlinks rotos)
- Código duplicado de `createGameSymlink` en `windowify.ts`

### Cambiado

- README bilingüe EN/ES con nota de ahorro de RAM
- Versión `0.3.0` → `0.4.0`, nombre `Primera Piedra` → `Pulido`
- AGENTS.md: eliminada línea de Sideload en Alcance

---

## 0.2.2 — Code Reorganization

### Cambiado

- `createRunnerFile()` movido de `game_events.ts` a `add_game.ts`
- `preparePrefix()` (orquestador) movido a `prefix.ts`
- `preparePrefix` fundido dentro de `prepareUmuPrefix`
- `validateGameInput` + `GameInput` type eliminados (lógica inlined)

---

## 0.2.1 — Sideload Removed

### Eliminado

- Runner `sideload` completo (store manager, IPC, frontend state, UI)
- `src/backend/storeManagers/sideload/`
- `src/frontend/components/UI/EditGameDialog/`
- i18n bloque `sideload` en 51 archivos
- Store persistente `~/.config/relic/sideload_apps/`
- ~40 archivos modificados, 3 directorios eliminados

---

## 0.2.0 — Steam Integration & Foundation

### Añadido

- Módulo `src/backend/relic/steam_shortcuts/`: `addGameToSteam()` vía `steam://addnonsteamgame`
- Store `steam_shortcuts.json` con gameName, appId, store, steamAppId, installPath, execPath
- `onGameInstalled()` / `onGameUninstalled()` en todos los store managers
- Módulo `relic/umu/`: store mapping, UMU API lookup, `umu-run` launcher
- Detección automática de GE-Proton (`detectGeProton()`)
- Módulo `relic/steamgrid/`: API client propio, descarga de 5 imágenes por juego
- `relic/windowify.ts`: transformación de paths Linux → Windows, symlinks de tiendas
- `syncMountBin()`: sincronización de binarios win32 al mount
- Zoom Platform siempre activo (sin toggle experimental)
- Instalación Windows mediante `zoom-platform.sh`
- Tests: 92 tests, TypeScript 0 errores

### Eliminado

- Módulo `src/backend/shortcuts/nonesteamgame/` (~500 LOC)
- Módulo `src/backend/shortcuts/shortcuts/` + IPC handlers
- Settings muertos: `addDesktopShortcuts`, `addSteamShortcuts`
- Dependencias: `electron-updater`, `plist`, `@shockpkg/icon-encoder`
- `ts-prune`, `unimported`, `@types/react-router-dom`
- 130 vulnerabilidades → 0 (Electron 43, pnpm overrides, actualizaciones)

### Cambiado

- Zoom: de experimental a siempre activo
- pnpm: `hoisted` → `isolated`, corepack, v11.15.1
- Electron 41.9.0 → 43.1.1
- Node engines: `>=22` → `>=24`

---

## 0.1.0 — Initial Fork

### Añadido

- Fork de Heroic Game Launcher orientado exclusivamente a Linux
- Filosofía: autenticación, descarga, instalación e integración con Steam
- Módulos `relic/` en backend, frontend y common
- AGENTS.md, HISTORY.md, HISTORY_ADD.md, HISTORY_REMOVE.md

### Eliminado

- Todo el flujo de lanzamiento de juegos (`prepareLaunch`, `launch()`)
- Wine/Proton manager completo (WineVersionSelector, WinePrefix, CustomWineProton, DXVK, VKD3D, Winetricks, etc.)
- Gestión de prefijos, variables de entorno, compatibilidad
- macOS y Windows: código específico, Rosetta, Crossover, etc.
- Discord RPC, Ko-fi, Plausible Analytics, GitHub releases
- EOS Overlay, Saves Sync, Game Scores, Anticheat
- Flatpak/Flathub, E2E tests, GitHub workflows
- Community links, Start Tour, Accessibility screen
- 94 archivos de traducción limpiados
