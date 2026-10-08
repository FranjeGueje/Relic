# AGENTS.md

# Relic

> Relic 1.0 sustituye al Relic anterior (app de escritorio basada en Heroic, rama `legacy`). El motor es **rakun**.
> El Relic viejo guardaba su config en `~/.config/relic`: este cliente no usa carpetas propias, así que no hay colisión.

## Objetivo

Cliente de **modo consola** para rakun: la biblioteca de Epic, GOG, Amazon y Zoom a pantalla completa, para
manejar con mando, como acceso directo de Steam en modo juego o ventana en el escritorio. Electron + React.
Solo habla con la API HTTP de rakun (`../rakun/API.md` es el contrato). No es un launcher: rakun instala
y añade a Steam; aquí solo se elige y se ve el progreso.

## Regla principal

**La configuración vive en rakun** (`rakunctl config`), no en el cliente: este solo la **lee** o, desde el menú de Select,
la **cambia en rakun**: cuentas, carpeta de descarga, carpeta de Proton, key de SteamGridDB e idioma (el de rakun
para las tiendas, no el de la interfaz). `setSetting` solo lo llama el main (`runSetSetting`, cuatro claves
fijas), no está en la lista del interfaz; rakun valida el valor. Un fichero de configuración propio o una opción por juego se rechazan. Lo no pedido no se añade: menos código, menos dependencias.

## Arquitectura

```
renderer (React) ──IPC──> preload ──IPC──> main (Node) ──HTTP 127.0.0.1──> rakun
```

- `src/main/rakun.ts`: cliente de rakun (llamadas, SSE con reconexión). Habla el proceso principal y no el
  interfaz porque rakun rechaza (403) las peticiones con `Origin`, que es lo que enviaría una página web.
- `src/shared/channels.ts`: **la lista cerrada** de canales y eventos que el interfaz puede usar. El preload y
  el main rechazan cualquier otro. Añadir un canal = añadirlo ahí y en `CallMap`.
- `src/shared/types.ts`: subconjunto copiado de los tipos de rakun (no se importa nada de su repositorio).
- `src/main/rakunProcess.ts`: arranca y para rakun **a través de `rakunctl`** (ruta fija de `install.sh`, luego el
  `PATH`; nunca una ruta que mande el interfaz). El cliente solo cierra al salir el rakun que **él** arrancó
  estando parado; si `rakunctl stop` se niega (descargas en curso), se deja en marcha. Lo cierra el manejador de
  `before-quit` de `main/index.ts`.
- `src/main/embeddedRakun.ts`: el rakun **dentro del paquete** (`resources/rakun/rakun.cjs`, o `RELIC_RAKUN_CJS`):
  se ejecuta con el propio binario de Electron como Node (`ELECTRON_RUN_AS_NODE=1`, `--web=off`), como hijo no
  desacoplado y con el entorno original (`userEnv`). Arranca solo si el enlace queda `offline` (`shouldAutostart`) y
  `stopIfOurs` (SIGTERM, y SIGKILL a los 10 s) **se espera antes de salir**: un hijo vivo dejaría el AppImage
  montado (`AppRun` además lo mata si el main muere). Sin script embebido se usa `rakunProcess.ts`. Ambos cumplen
  `RakunController`; `ownership` (`none`/`cli`/`embedded`) llega al interfaz por `owns`.
- `src/main/loginWindow.ts` + `runLogin` (`ipc.ts`): el login de cada tienda lo hace el **main**: ventana hija sin
  preload ni sesión guardada, `loginPageResult` decide si la página es el final (URL con el código, mirada también en
  `will-redirect`; Epic usa el login del launcher de Relic con su agente de usuario y acaba en `localhost?code=`,
  no la página `legendary.gl` de rakun) y lo entrega a `submitLogin`. `getLoginInfo` y `submitLogin` están en
  `CallMap` (tipos de rakun) pero **no** en la lista cerrada del interfaz.
- **La interfaz no es de este repo**: es la web de rakun (`vendor/rakun/web/src`, submodule de git fijado a un commit de
  rakun; alias `@rakun-ui`). Aquí solo está su anfitrión: `src/renderer/main.tsx` (monta `App`), `index.html` y el
  puente de `src/preload` (`window.rakun`). La web enseña lo que el anfitrión tiene: `appName`, `quit`/`owns`
  (botón y tecla Quit con su diálogo), `start` (botón «Start rakun») y `login` (ventana propia, sin pegar). **Un cambio
  de pantalla se hace en el repo de rakun** (`web/src`, con sus tests de jest) y aquí solo se sube el puntero del
  submodule (`git -C vendor/rakun fetch && git -C vendor/rakun checkout <tag>`, y commit). Nada se parchea en `vendor/`.
  Para obtenerla: `scripts/init-ui.sh` (shallow + sparse: el repo de rakun pesa cientos de MB).
  Dentro: `console/` (rejilla, ficha, descargas, menú, `Helpers*`), `input/` (teclado y mando → **acciones**; el
  interfaz no lee teclas), `state/` (`reducer`, `selectors`, `useRakun`), `i18n/strings.ts` (solo **inglés**; no sigue el
  ajuste `language` de rakun), `perf.ts` (`RELIC_PERF=1` imprime los tiempos de arranque: el main añade `?perf`).
- Carga por etapas (`useRakun.ts`): primero tiendas, ajustes y cola; luego `getLibrary` **por tienda** y en paralelo;
  `checkGameUpdates` va el último y en segundo plano (consulta la red y, con `autoUpdateGames`, encola
  actualizaciones): nunca debe retrasar la pantalla. `Card` está memoizada y no se usa `content-visibility` en las celdas.
- El explorador de carpetas (`FolderPicker.tsx`) usa el canal `listFolders` de rakun (una sola implementación, la
  suya). Los campos de texto
  (`TextField.tsx`) no pasan las teclas a las acciones (`isTyping` en `useInput.ts`).

## Cero restos

Relic no deja nada en disco fuera de su paquete. `src/main/paths.ts` + `main/index.ts` mandan `userData`,
`sessionData`, `cache`, `logs`, `crashDumps`, la caché de Mesa y `XDG_DATA_HOME` (la base NSS de Chromium) a
`$XDG_RUNTIME_DIR/relic` (`ephemeralDir`), que se borra al salir (`process.on('exit')`; `SIGTERM/SIGINT/SIGHUP`
hacen `app.quit()`). Solo la instancia principal lo borra: una segunda no debe tocar el de la primera. `rakunctl`
se lanza con `userEnv` (el entorno original), para que rakun siga usando sus carpetas. **No añadir almacenamiento
propio** (ficheros, localStorage, IndexedDB) sin discutirlo. Comprobarlo: `HOME=$(mktemp -d)`, abrir, cerrar y
`find $HOME -mindepth 1` debe salir vacío (salvo lo que cree rakun si se arranca desde la app).

## Reglas de código

- TypeScript estricto; sin `any`.
- La lógica va en funciones puras con tests; los componentes solo la pintan. La del interfaz (reducer, selectores,
  `readPad`, rejilla) y sus textos (`strings.ts`, en inglés) están en el repo de rakun.
- Dependencias: solo `react` y `react-dom` en producción; no añadir más sin una razón clara.
- `contextIsolation` y `sandbox` siempre activos; el preload no expone nada fuera de `RakunBridge`.

## Construcción y pruebas

- `pnpm dev`, `pnpm build`, `pnpm start`.
- `pnpm package` (`scripts/package.sh`): **AppImage** (`dist/relic-<version>-<arch>.AppImage`) con el Electron de
  este checkout (o `ELECTRON_DIST`) + `out/`, sin `node_modules` ni dependencias nuevas. `appimagetool` y el runtime
  se descargan una vez a `dist/.tools/` con versión y sha256 fijados. Compresión zstd (el runtime no lee xz). Se
  quitan `chrome-sandbox` (no puede ser setuid), `libqt6_shim.so` y los `locales` salvo `en-US`. `AppRun` limpia
  `LD_PRELOAD`/`LD_LIBRARY_PATH`, mueve `XDG_CACHE_HOME` y `MESA_SHADER_CACHE_DIR` al directorio efímero antes de
  arrancar (el driver de la GPU escribe antes de que corra nuestro código), mete `resources/rakun/` (solo `rakun.cjs`,
  `COPYING`, `AUTHORS`, `THIRD_PARTY` del tarball de rakun, `RAKUN_TARBALL`; sin Node, `rakunctl`, web ni binarios
  auxiliares), no usa `exec` y borra ese directorio
  al terminar si no hay otra instancia (existe `userData/SingletonLock`). No se puede probar que la ventana abra sin
  pantalla: solo se comprueba el contenido y que el binario corre.
- `pnpm codecheck`, `pnpm lint`, `pnpm prettier`, `pnpm test`.
- Los tests de la interfaz (jest + jsdom, con un rakun falso) están en el repo de rakun (`web/src/__tests__`, incluido
  el lado escritorio: `desktop.test.tsx`). Aquí solo hay los del anfitrión (`src/renderer/__tests__/host.test.tsx`)
  y los de `src/main`. La ventana de Electron no se puede probar sin pantalla (el modo `headless` de Electron falla): probarla a mano con
  `pnpm dev`.
- Para probar contra un rakun real sin tocar el `$HOME` real: `HOME=$(mktemp -d) RAKUN_PORT=17986` y
  `RAKUN_API_FILE=<ese HOME>/.config/rakun/api.json`.

## Commits

Solo cuando se piden. Mensajes en español.
