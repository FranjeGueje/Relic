import { app } from 'electron'
import { mkdirSync } from 'fs'
import { homedir } from 'os'
import { isAbsolute, join, resolve } from 'path'
import { env } from 'process'
import { dirSync } from 'tmp'

const appName = 'relic'

// Mirrors Electron's `app.getPath('appData')` on Linux: XDG_CONFIG_HOME when it
// holds an absolute path (relative values are ignored per the XDG spec),
// otherwise ~/.config.
const xdgConfigHome = env.XDG_CONFIG_HOME
export const appDataPath =
  xdgConfigHome && isAbsolute(xdgConfigHome)
    ? xdgConfigHome
    : join(homedir(), '.config')

let configFolder = appDataPath
// If we're running tests, we want a config folder independent of the normal
// user configuration
if (process.env.CI === 'e2e') {
  const temp_dir = dirSync({ unsafeCleanup: true })
  console.log(
    `CI is set to "e2e", storing Relic config files in ${temp_dir.name}`
  )
  configFolder = temp_dir.name
  mkdirSync(join(configFolder, 'relic'))
}

export const userHome = homedir()

export const appFolder = join(configFolder, appName)
// Mirrors Electron's `app.getPath('userData')`: appData + app.getName().
// Deliberately derived from appDataPath and not from configFolder, so the
// `CI=e2e` override above keeps affecting appFolder only, as it did before.
export const userDataPath = join(appDataPath, appName)
export const toolsPath = join(appFolder, 'tools')
export const configPath = join(appFolder, 'config.json')
export const gamesConfigPath = join(appFolder, 'GamesConfig')
export const relicIconFolder = join(appFolder, 'icons')
export const relicInstallPath = join(userHome, 'Games', 'Relic')
export const fixesPath = join(appFolder, 'fixes')
export const relicRunnerPath = join(
  userHome,
  '.local',
  'share',
  'relic',
  'runner'
)
export const relicMountPath = join(
  userHome,
  '.local',
  'share',
  'relic',
  'mount'
)
export const relicGamesPath = join(
  userHome,
  '.local',
  'share',
  'relic',
  'games'
)
export const steamCompatDir = join(
  userHome,
  '.local',
  'share',
  'Steam',
  'compatibilitytools.d'
)

export const publicDir = resolve(
  __dirname,
  '..',
  app.isPackaged || process.env.CI === 'e2e' ? '' : '../public'
)

export const fakeEpicExePath = fixAsarPath(
  join(publicDir, 'bin', 'x64', 'win32', 'EpicGamesLauncher.exe')
)

export const galaxyCommunicationExePath = fixAsarPath(
  join(publicDir, 'bin', 'x64', 'win32', 'GalaxyCommunication.exe')
)

export const webviewPreloadPath = fixAsarPath(
  join('file://', publicDir, 'webviewPreload.js')
)

/**
 * Fix path for packed files with asar, else will do nothing.
 * @param origin  original path
 * @returns fixed path
 */
export function fixAsarPath(origin: string): string {
  if (!origin.includes('app.asar.unpacked')) {
    return origin.replace('app.asar', 'app.asar.unpacked')
  }
  return origin
}
export const windowIcon = fixAsarPath(join(publicDir, 'icon.png'))

export const zoomPlatformScriptPath = fixAsarPath(
  join(publicDir, 'bin', 'zoom', 'zoom-platform.sh')
)
