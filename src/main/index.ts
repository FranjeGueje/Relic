import { app, BrowserWindow } from 'electron'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { registerIpc } from './ipc'
import { migrateFromOldRelic, migrationDirs, removeLegacyData } from './migrate'
import { ephemeralDir, ephemeralPaths, removeEphemeral, userEnv } from './paths'
import { RakunLink } from './rakun'
import {
  EmbeddedRakun,
  embeddedScriptPath,
  shouldAutostart,
  type RakunController
} from './embeddedRakun'
import { RakunProcess } from './rakunProcess'

/** Game Mode (gamescope) and `--fullscreen` get the whole screen; the desktop a window */
const fullscreen =
  process.argv.includes('--fullscreen') ||
  process.env.XDG_CURRENT_DESKTOP === 'gamescope'

// Nothing the app writes may stay on disk: user data, caches, logs, the GPU driver's shader
// cache and the certificate database (child processes inherit the environment) go to a
// folder that is removed on exit. This runs before the single-instance lock, which lives in the user data folder.
const scratch = ephemeralDir(process.env, tmpdir())
const scratchPaths = ephemeralPaths(scratch)
for (const name of [
  'userData',
  'sessionData',
  'cache',
  'logs',
  'crashDumps'
] as const)
  app.setPath(name, scratchPaths[name])
process.env.MESA_SHADER_CACHE_DIR = scratchPaths.mesa
process.env.MESA_GLSL_CACHE_DIR = scratchPaths.mesa
process.env.XDG_CACHE_HOME = scratchPaths.xdgCache
process.env.XDG_DATA_HOME = scratchPaths.xdgData
app.commandLine.appendSwitch('disk-cache-size', '1')
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')

const link = new RakunLink()
// The rakun inside the package if there is one (it runs on Electron's Node); else rakunctl's
const script = embeddedScriptPath(process.resourcesPath)
const rakun: RakunController = script
  ? new EmbeddedRakun(script)
  : new RakunProcess()
let window: BrowserWindow | undefined

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#101014',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  win.once('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event) => event.preventDefault())

  // `RELIC_PERF=1` makes the interface print how long its start-up steps take
  const perf = process.env.RELIC_PERF === '1'
  const devServer = process.env.ELECTRON_RENDERER_URL
  if (devServer) void win.loadURL(perf ? `${devServer}?perf` : devServer)
  else
    void win.loadFile(join(__dirname, '../renderer/index.html'), {
      query: perf ? { perf: '1' } : {}
    })
  return win
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (window?.isMinimized()) window.restore()
    window?.focus()
  })
  void app.whenReady().then(() => {
    // Before rakun exists: the old Relic's files go where rakun looks (does nothing once done)
    const dirs = migrationDirs(userEnv)
    migrateFromOldRelic(dirs)
    // Then, on every start: the old name goes once no Steam shortcut needs it
    removeLegacyData(dirs)
    registerIpc(link, rakun)
    window = createWindow()
    let tried = false
    link.onConnection((state) => {
      if (!shouldAutostart(state, !!script, tried)) return
      tried = true
      void rakun.start(true).then((reply) => reply.ok && link.retryNow())
    })
    link.start()
  })
  app.on('window-all-closed', () => app.quit())
  // Steam and the system close a program with these: leave through the normal way, which cleans up
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP'] as const)
    process.on(signal, () => app.quit())
  // On the way out, close the rakun this client started (rakunctl refuses while it downloads)
  let leaving = false
  app.on('before-quit', (event) => {
    if (leaving || rakun.ownership === 'none') return
    leaving = true
    event.preventDefault()
    void rakun.stopIfOurs().finally(() => app.exit())
  })
  // Only here: a second instance must not remove the folder the first one is using
  app.on('will-quit', () => link.stop())
  // As late as there is: Chromium still writes to its folders while it shuts down
  process.on('exit', () => removeEphemeral(scratch))
}
