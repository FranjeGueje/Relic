import {
  CallRunnerOptions,
  GameInfo,
  Runner,
  WrapperEnv,
  ExecResult,
  LaunchPreperationResult,
  WineInstallation,
  WineCommandArgs,
  GameSettings,
  KnowFixesInfo,
  LaunchParams,
  StatusPromise
} from 'common/types'
// This handles launching games, prefix creation etc..

import i18next from 'i18next'
import { existsSync, mkdirSync } from 'graceful-fs'
import { join, dirname, isAbsolute } from 'path'

import {
  isEpicServiceOffline,
  quoteIfNecessary,
  errorHandler,
  removeQuoteIfNecessary,
  memoryLog,
  sendGameStatusUpdate,
  checkWineBeforeLaunch,
  isMacSonomaOrHigher,
  askForceUninstall,
  getGame
} from './utils'
import {
  createGameLogWriter,
  getRunnerLogWriter,
  logDebug,
  logError,
  logInfo,
  LogPrefix,
  logWarning
} from './logger'
import { GlobalConfig } from './config'
import { runWineCommandOnGame } from './tools'
import gogSetup from './storeManagers/gog/setup'
import nileSetup from './storeManagers/nile/setup'
import { spawn, spawnSync } from 'child_process'
import shlex from 'shlex'
import { isOnline } from './online_monitor'
import { showDialogBoxModalAuto } from './dialog/dialog'
import { legendarySetup } from './storeManagers/legendary/setup'
import { libraryManagerMap } from 'backend/storeManagers'
import { readFileSync, writeFileSync } from 'fs'
import { LegendaryCommand } from './storeManagers/legendary/commands'
import {
  createAbortController,
  deleteAbortController
} from './utils/aborthandler/aborthandler'
import { download, isInstalled } from './wine/runtimes/runtimes'
import { storeMap } from 'common/utils'
import { getMainWindow } from './main_window'
import { sendFrontendMessage } from './ipc'
import { getUmuPath, isUmuSupported } from './utils/compatibility_layers'
import { copyFile } from 'fs/promises'
import { app, powerSaveBlocker } from 'electron'
import gogPresence from './storeManagers/gog/presence'
import { addRecentGame } from './recent_games/recent_games'
import { tsStore } from './constants/key_value_stores'
import {
  defaultUmuPath,
  sharedWinePrefix,
  fixesPath,
  galaxyCommunicationExePath,
  gamesConfigPath,
  runtimePath,
  userHome
} from './constants/paths'
import {
  isCLINoGui,
  isLinux,
  isMac,
  isSteamDeckGameMode,
  isWindows,
  isIntelMac,
  isSteamDeck
} from './constants/environment'
import { formatSystemInfo, getSystemInfo } from './utils/systeminfo'

import type { PartialDeep } from 'type-fest'
import type LogWriter from './logger/log_writer'
import { isEnabled } from './storeManagers/legendary/eos_overlay/eos_overlay'
import { Game } from 'common/types/game_manager'

let powerDisplayId: number | null

const launchEventCallback: (args: LaunchParams) => StatusPromise = async ({
  appName,
  launchArguments,
  runner,
  skipVersionCheck,
  args
}) => {
  const game = libraryManagerMap[runner].getGame(appName)
  const gameInfo = game.getGameInfo()

  if (
    gameInfo.install.install_path &&
    !existsSync(gameInfo.install.install_path)
  ) {
    await askForceUninstall(game)

    sendGameStatusUpdate({
      appName,
      runner,
      status: 'done'
    })

    return { status: 'abort' }
  }

  const gameSettings = await game.getSettings()

  if (!launchArguments && gameSettings.lastUsedLaunchOption) {
    launchArguments = gameSettings.lastUsedLaunchOption
  }

  const { title } = gameInfo

  const { minimizeOnLaunch } = GlobalConfig.get().getSettings()

  const startPlayingDate = new Date()

  if (!tsStore.has(appName)) {
    tsStore.set(`${appName}.firstPlayed`, startPlayingDate.toISOString())
  }

  logInfo(`Launching ${title} (${appName})`, LogPrefix.Backend)

  sendGameStatusUpdate({
    appName,
    runner,
    status: 'launching'
  })

  const mainWindow = getMainWindow()
  if (minimizeOnLaunch) {
    mainWindow?.hide()
  }

  // Prevent display from sleep
  if (!powerDisplayId) {
    logInfo('Preventing display from sleep', LogPrefix.Backend)
    powerDisplayId = powerSaveBlocker.start('prevent-display-sleep')
  }

  const logWriter = await createGameLogWriter(appName, runner)

  if (!gameSettings.verboseLogs) {
    await logWriter.logWarning('IMPORTANT: Logs are disabled', {
      forceLog: true
    })
    await logWriter.logWarning(
      "Enable verbose logs in Game's settings > Advanced tab > 'Enable verbose logs' before reporting an issue.",
      { forceLog: true }
    )
  }

  const isNative = game.isNative()

  // check if isNative, if not, check if wine is valid
  if (!isNative) {
    const isWineOkToLaunch = await checkWineBeforeLaunch(
      gameInfo,
      gameSettings,
      logWriter
    )

    if (!isWineOkToLaunch) {
      logError(
        `Was not possible to launch using ${gameSettings.wineVersion.name}`,
        LogPrefix.Backend
      )

      sendGameStatusUpdate({
        appName,
        runner,
        status: 'done'
      })

      await logWriter.close()

      return { status: 'error' }
    }
  }

  await runBeforeLaunchScript(gameInfo, gameSettings, logWriter)

  sendGameStatusUpdate({
    appName,
    runner,
    status: 'launching'
  })

  const command = game.launch(
    logWriter,
    launchArguments,
    args,
    skipVersionCheck
  )

  if (runner === 'gog') {
    gogPresence.setCurrentGame(appName)
    await gogPresence.setPresence()
  }

  const launchResult = await command
    .catch(async (exception) => {
      logError(exception, LogPrefix.Backend)
      await logWriter.logError([
        `An exception occurred when launching the game:`
      ])
      await logWriter.logError(exception)

      return false
    })
    .finally(async () => {
      await runAfterLaunchScript(gameInfo, gameSettings, logWriter)
      await logWriter.close()
    })

  if (runner === 'gog') {
    gogPresence.setCurrentGame('')
    await gogPresence.setPresence()
  }
  // Stop display sleep blocker
  if (powerDisplayId !== null) {
    logInfo('Stopping Display Power Saver Blocker', LogPrefix.Backend)
    powerSaveBlocker.stop(powerDisplayId)
  }

  // Update playtime and last played date
  const finishedPlayingDate = new Date()
  tsStore.set(`${appName}.lastPlayed`, finishedPlayingDate.toISOString())
  // Playtime of this session in minutes
  const sessionPlaytime =
    (finishedPlayingDate.getTime() - startPlayingDate.getTime()) / 1000 / 60
  const totalPlaytime =
    sessionPlaytime + tsStore.get(`${appName}.totalPlayed`, 0)
  tsStore.set(`${appName}.totalPlayed`, Math.floor(totalPlaytime))

  const { disablePlaytimeSync } = GlobalConfig.get().getSettings()
  if (runner === 'gog') {
    if (!disablePlaytimeSync) {
      await libraryManagerMap['gog']
        .getGame(appName)
        .updateGOGPlaytime(startPlayingDate, finishedPlayingDate)
    } else {
      logWarning(
        'Posting playtime session to server skipped - playtime sync disabled',
        { prefix: LogPrefix.Backend }
      )
    }
  }
  await addRecentGame(gameInfo)

  sendGameStatusUpdate({
    appName,
    runner,
    status: 'done'
  })

  // Exit if we've been launched without UI
  if (isCLINoGui) {
    app.exit()
  }

  return { status: launchResult ? 'done' : 'error' }
}

function filterGameSettingsForLog(
  originalSettings: GameSettings,
  notNative: boolean
): PartialDeep<GameSettings> {
  const gameSettings: PartialDeep<GameSettings> =
    structuredClone(originalSettings)

  // this is irrelevant for support
  delete gameSettings.enableQuickSavesMenu
  // if this is visible, it means verboseLogs is true, no need to print it
  delete gameSettings.verboseLogs

  // remove settings that are not used on Linux
  if (isLinux) {
    delete gameSettings.wineCrossoverBottle

    if (!notNative) {
      delete gameSettings.wineVersion
      delete gameSettings.winePrefix
    }
  }

  // remove settings that are not used on Mac
  if (isMac) {
    delete gameSettings.disableUMU
    delete gameSettings.wineCrossoverBottle

    if (!notNative) {
      delete gameSettings.wineVersion
      delete gameSettings.winePrefix
    }
  }

  return gameSettings
}

async function prepareLaunch(
  gameSettings: GameSettings,
  logWriter: LogWriter,
  gameInfo: GameInfo,
  isNative: boolean
): Promise<LaunchPreperationResult> {
  const globalSettings = GlobalConfig.get().getSettings()

  let offlineMode = gameSettings.offlineMode || !isOnline()

  if (!offlineMode && gameInfo.runner === 'legendary') {
    offlineMode = await isEpicServiceOffline()
  }

  // Check if the game needs an internet connection
  if (!gameInfo.canRunOffline && offlineMode) {
    logWriter.logWarning(
      'Offline Mode is on but the game does not allow offline mode explicitly.'
    )
  }

  await logWriter.logInfo([
    'Launching',
    `"${gameInfo.title}" (${gameInfo.runner})`
  ])
  const native = libraryManagerMap[gameInfo.runner]
    .getGame(gameInfo.app_name)
    .isNative()
  await logWriter.logInfo(['Native?', native])

  const isThirdPartyManagedApp = gameInfo && !!gameInfo.thirdPartyManagedApp

  if (isThirdPartyManagedApp) {
    let prefixOrBottleFolder: string | null = gameSettings.winePrefix
    if (isMac && gameSettings.wineVersion.type === 'crossover') {
      prefixOrBottleFolder = await getCrossoverBottleFolder(gameSettings)
    }
    if (prefixOrBottleFolder)
      await logWriter.logInfo(['Installed in:', prefixOrBottleFolder])

    await logWriter.logInfo([
      'Managed by a third-party app:',
      gameInfo.thirdPartyManagedApp,
      '\n\n'
    ])
  } else {
    const installPath =
      gameInfo.runner === 'sideload'
        ? gameInfo.folder_name
        : gameInfo.install.install_path

    await logWriter.logInfo(['Installed in:', installPath, '\n\n'])
  }

  await logWriter.logInfo([
    'System Info:',
    getSystemInfo()
      .then(formatSystemInfo)
      .then((s) => `\n${s}\n\n`)
  ])

  await logWriter.logInfo([
    'Game Settings:',
    filterGameSettingsForLog(gameSettings, !native),
    '\n',
    `Stored at: ${join(gamesConfigPath, gameInfo.app_name + '.json')}`,
    '\n\n'
  ])

  if (
    (await isUmuSupported(gameSettings, false)) &&
    isOnline() &&
    !(await isInstalled('umu')) &&
    (await getUmuPath()) === defaultUmuPath
  ) {
    await download('umu')
  }

  return {
    success: true,
    offlineMode
  }
}

// Use Crossover's verbose output to extract the path of the game's configured bottle
async function getCrossoverBottleFolder(gameSettings: GameSettings) {
  const command = runWineCommand({
    commandParts: [
      '--bottle',
      gameSettings.wineCrossoverBottle,
      '--verbose', // so it prints the WINEPREFIX env value
      'whoami' // using whoami because we have to call a command
    ],
    gameSettings,
    skipPrefixCheckIKnowWhatImDoing: true
  })

  return command
    .then((result) => {
      // match the `WINEPREFIX = .....` line to extract the bottle folder
      const match = result.stderr.match(/WINEPREFIX = "(.*)"\n/)
      if (match) return match[1]

      return null
    })
    .catch(() => {
      return null
    })
}

async function prepareWineLaunch(
  game: Game,
  logWriter: LogWriter
): Promise<{
  success: boolean
  failureReason?: string
  envVars?: Record<string, string>
}> {
  const gameInfo = game.getGameInfo()

  const gameSettings = await game.getSettings()

  if (!(await validWine(gameSettings.wineVersion))) {
    const defaultWine = GlobalConfig.get().getSettings().wineVersion
    // now check if the default wine is valid as well
    if (!(await validWine(defaultWine))) {
      return { success: false }
    }
  }

  // Verify that the CrossOver bottle exists
  if (isMac && gameSettings.wineVersion.type === 'crossover') {
    const bottleExists = existsSync(
      join(
        userHome,
        'Library/Application Support/CrossOver/Bottles',
        gameSettings.wineCrossoverBottle,
        'cxbottle.conf'
      )
    )
    if (!bottleExists) {
      showDialogBoxModalAuto({
        title: i18next.t(
          'box.error.cx-bottle-not-found.title',
          'CrossOver bottle not found'
        ),
        message: i18next.t(
          'box.error.cx-bottle-not-found.message',
          `The CrossOver bottle "{{bottle_name}}" does not exist, can't launch!`,
          { bottle_name: gameSettings.wineCrossoverBottle }
        ),
        type: 'ERROR'
      })
      return {
        success: false,
        failureReason: `CrossOver bottle "${gameSettings.wineCrossoverBottle}" does not exist`
      }
    }
  }

  // We only want to log this for legendary on Linux
  // On windows, the overlay is installed globally
  // On mac, the overlay doesn't work
  if (gameInfo.runner === 'legendary' && isLinux) {
    const checkEOSOverlayStatusPromise = isEnabled(gameInfo.app_name)

    // The first time a game runs, the overlay is not enabled yet at this point
    void logWriter.logInfo(
      checkEOSOverlayStatusPromise.then(
        (enabled) => `EOS Overlay: ${enabled ? 'Enabled' : 'Not enabled'}`
      )
    )
  }

  if (gameSettings.offlineMode && !gameInfo.canRunOffline) {
    void logWriter.logWarning(
      "Warning: 'offlineMode' is turned on but the game does not support offline mode. Disable 'offlineMode' in the game's settings."
    )
  }

  await verifyWinePrefix(gameSettings)
  const experimentalFeatures =
    GlobalConfig.get().getSettings().experimentalFeatures

  let hasUpdated = false

  let prefixOrBottleFolder: string | null = gameSettings.winePrefix
  if (isMac && gameSettings.wineVersion.type === 'crossover') {
    prefixOrBottleFolder = await getCrossoverBottleFolder(gameSettings)
  }

  // we check this because if the Crossover's bottle is not configured
  // properly, this path will be null
  if (prefixOrBottleFolder) {
    const appsNamesPath = join(prefixOrBottleFolder, 'installed_games')
    if (!existsSync(appsNamesPath)) {
      mkdirSync(prefixOrBottleFolder, { recursive: true })
      writeFileSync(appsNamesPath, JSON.stringify([gameInfo.app_name]), 'utf-8')
      hasUpdated = true
    } else {
      const installedGames: string[] = JSON.parse(
        readFileSync(appsNamesPath, 'utf-8')
      )
      if (!installedGames.includes(gameInfo.app_name)) {
        installedGames.push(gameInfo.app_name)
        writeFileSync(appsNamesPath, JSON.stringify(installedGames), 'utf-8')
        hasUpdated = true
      }
    }
  }

  if (hasUpdated) {
    logInfo(
      ['Created/Updated Wineprefix at', gameSettings.winePrefix],
      LogPrefix.Backend
    )
    if (gameInfo.runner === 'gog') {
      await gogSetup(gameInfo.app_name)
      sendFrontendMessage('gameStatusUpdate', {
        appName: gameInfo.app_name,
        runner: 'gog',
        status: 'launching'
      })
    }
    if (gameInfo.runner === 'nile') {
      await nileSetup(gameInfo.app_name)
    }
    if (gameInfo.runner === 'legendary') {
      await legendarySetup(gameInfo.app_name, logWriter)
    }

    await installFixes(gameInfo.app_name, gameInfo.runner)
  }

  try {
    if (
      gameInfo.runner === 'gog' &&
      experimentalFeatures?.cometSupport !== false
    ) {
      const galaxyCommWinePath =
        'C:\\ProgramData\\GOG.com\\Galaxy\\redists\\GalaxyCommunication.exe'
      const communicationDest = await getWinePath({
        path: galaxyCommWinePath,
        gameSettings,
        variant: 'unix'
      })

      if (!existsSync(communicationDest)) {
        mkdirSync(dirname(communicationDest), { recursive: true })
        await copyFile(galaxyCommunicationExePath, communicationDest)
        await runWineCommand({
          commandParts: [
            'sc',
            'create',
            'GalaxyCommunication',
            `binpath=${galaxyCommWinePath}`
          ],
          gameSettings,
          protonVerb: 'runinprefix'
        })
      }
    }
  } catch (err) {
    logError([
      'Failed to install GalaxyCommunication dummy into the prefix:',
      err
    ])
  }

  const envVars = setupWineEnvVars(gameSettings, gameInfo.folder_name)

  return { success: true, envVars: envVars }
}

export function readKnownFixes(appName: string, runner: Runner) {
  const fixPath = join(fixesPath, `${appName}-${storeMap[runner]}.json`)

  if (!existsSync(fixPath)) return null

  try {
    const fixesContent = JSON.parse(
      readFileSync(fixPath).toString()
    ) as KnowFixesInfo

    return fixesContent
  } catch (error) {
    // if we fail to download the json file, it can be malformed causing
    // JSON.parse to throw an exception
    logWarning(`Known fixes could not be applied, ignoring.\n${error}`)
    return null
  }
}

async function installFixes(appName: string, runner: Runner) {
  const knownFixes = readKnownFixes(appName, runner)

  if (!knownFixes) return

  if (knownFixes.runInPrefix) {
    const gameInfo = getGame(appName, runner).getGameInfo()

    sendGameStatusUpdate({
      appName,
      runner: runner,
      status: 'redist',
      context: 'FIXES'
    })

    for (const filePath of knownFixes.runInPrefix) {
      const fullPath = join(gameInfo.install.install_path!, filePath)
      await runWineCommandOnGame(runner, appName, {
        commandParts: [fullPath],
        wait: true,
        protonVerb: 'run'
      })
    }
  }
}

function getKnownFixesEnvVariables(appName: string, runner: Runner) {
  const knownFixes = readKnownFixes(appName, runner)

  return knownFixes?.envVariables || {}
}

/**
 * Maps general settings to environment variables
 * @param gameSettings The GameSettings to get the environment variables for
 * @returns A big string of environment variables, structured key=value
 */
function setupEnvVars(gameSettings: GameSettings, installPath?: string) {
  const ret: Record<string, string> = {}

  if (isLinux && installPath) {
    ret.STEAM_COMPAT_INSTALL_PATH = installPath
  }

  // setup LD_PRELOAD if not defined
  // fixes the std::log_error for Fall Guys
  // thanks to https://github.com/Diyou
  if (!process.env.LD_PRELOAD && !ret.LD_PRELOAD) {
    ret.LD_PRELOAD = ''
  }

  return ret
}

/**
 * Maps launcher info to environment variables for consumption by wrappers
 * @param wrapperEnv The info to be added into the environment variables
 * @returns Environment variables
 */
function setupWrapperEnvVars(wrapperEnv: WrapperEnv) {
  const ret: Record<string, string> = {}

  ret.RELIC_APP_NAME = wrapperEnv.appName
  ret.RELIC_APP_RUNNER = wrapperEnv.appRunner
  ret.GAMEID = 'umu-0'

  switch (wrapperEnv.appRunner) {
    case 'gog':
      ret.RELIC_APP_SOURCE = 'gog'
      ret.STORE = 'gog'
      break
    case 'legendary':
      ret.RELIC_APP_SOURCE = 'epic'
      ret.STORE = 'egs'
      break
    case 'nile':
      ret.RELIC_APP_SOURCE = 'amazon'
      ret.STORE = 'amazon'
      break
    case 'sideload':
      ret.RELIC_APP_SOURCE = 'sideload'
      break
    case 'zoom':
      ret.RELIC_APP_SOURCE = 'zoom'
      ret.STORE = 'zoomplatform'
      break
  }

  return ret
}

/**
 * Maps Wine-related settings to environment variables
 * @param gameSettings The GameSettings to get the environment variables for
 * @param gameId If Proton and the Steam Runtime are used, the SteamGameId variable will be set to `relic-gameId` if it's unset
 * @returns A Record that can be passed to execAsync/spawn
 */
function setupWineEnvVars(gameSettings: GameSettings, gameId = '0') {
  const { wineVersion, winePrefix, wineCrossoverBottle } = gameSettings

  const ret: Record<string, string> = {}

  const steamInstallPath = join(userHome, '.steam', 'steam')
  switch (wineVersion.type) {
    case 'wine':
      ret.WINEPREFIX = winePrefix
      break
    case 'proton':
      ret.STEAM_COMPAT_CLIENT_INSTALL_PATH = steamInstallPath
      ret.WINEPREFIX = winePrefix
      ret.STEAM_COMPAT_DATA_PATH = winePrefix
      ret.PROTONPATH = dirname(gameSettings.wineVersion.bin)
      break
    case 'crossover':
      ret.CX_BOTTLE = wineCrossoverBottle
      break
    case 'toolkit':
      ret.WINEPREFIX = winePrefix
      break
  }

  if (wineVersion.type === 'proton') {
    ret.STEAM_COMPAT_APP_ID = process.env.STEAM_COMPAT_APP_ID || '0'
    ret.SteamAppId = process.env.SteamAppId || ret.STEAM_COMPAT_APP_ID
    ret.SteamGameId = process.env.SteamGameId || `relic-${gameId}`
    ret.PROTON_LOG_DIR = userHome
  }
  return ret
}

function setupWrappers(): Array<string> {
  return []
}

/**
 * Checks if the game's selected Wine version exists
 * @param wineVersion an object of type WineInstallation with binary path and name to check
 * @returns true if the wine version exists, false if it doesn't
 */
export async function validWine(
  wineVersion: WineInstallation
): Promise<boolean> {
  if (!wineVersion) {
    return false
  }

  logInfo(
    `Checking if wine version exists: ${wineVersion.name}`,
    LogPrefix.Backend
  )

  // verify if necessary binaries exist
  const { bin, wineserver, type } = wineVersion
  const necessary = type === 'wine' ? [bin, wineserver] : [bin]
  const haveAll = necessary.every((binary) => existsSync(binary as string))

  if (isMac && type === 'toolkit') {
    const isMacOSUpToDate = await isMacSonomaOrHigher()
    const isGPTKCompatible: boolean = isMacOSUpToDate && !isIntelMac
    if (!isGPTKCompatible) {
      return false
    }
  }

  // if wine version does not exist, use the default one
  if (!haveAll) {
    return false
  }

  return true
}

/**
 * Verifies that a Wineprefix exists by running 'wineboot --init'
 * @param gameSettings The settings of the game to verify the Wineprefix of
 * @returns stderr & stdout of 'wineboot --init'
 */
export async function verifyWinePrefix(
  settings: GameSettings
): Promise<{ res: ExecResult }> {
  const { winePrefix = sharedWinePrefix, wineVersion } = settings

  const isValidWine = await validWine(wineVersion)

  if (!isValidWine) {
    return { res: { stdout: '', stderr: '' } }
  }

  if (wineVersion.type === 'crossover') {
    return { res: { stdout: '', stderr: '' } }
  }

  if (!existsSync(winePrefix) && !(await isUmuSupported(settings))) {
    mkdirSync(winePrefix, { recursive: true })
  }

  // If the registry isn't available yet, things like DXVK installers might fail. So we have to wait on wineboot then
  const systemRegPath =
    wineVersion.type === 'proton'
      ? join(winePrefix, 'pfx', 'system.reg')
      : join(winePrefix, 'system.reg')
  const haveToWait = !existsSync(systemRegPath)

  const command = runWineCommand({
    commandParts: (await isUmuSupported(settings))
      ? ['createprefix']
      : ['wineboot', '--init'],
    wait: haveToWait,
    gameSettings: settings,
    protonVerb: 'run',
    skipPrefixCheckIKnowWhatImDoing: true
  })

  return command
    .then((result) => {
      return { res: result }
    })
    .catch((error) => {
      logError(['Unable to create Wineprefix: ', error], LogPrefix.Backend)
      throw error
    })
}

async function runWineCommand({
  gameSettings,
  commandParts,
  wait,
  protonVerb = 'run',
  installFolderName,
  gameInstallPath,
  options,
  startFolder,
  skipPrefixCheckIKnowWhatImDoing = false,
  ignoreLogging = false
}: WineCommandArgs): Promise<{
  stderr: string
  stdout: string
  code?: number
}> {
  const settings = gameSettings
    ? gameSettings
    : GlobalConfig.get().getSettings()
  const { wineVersion, winePrefix } = settings

  if (!skipPrefixCheckIKnowWhatImDoing && wineVersion.type !== 'crossover') {
    let requiredPrefixFiles = [
      'dosdevices',
      'drive_c',
      'system.reg',
      'user.reg',
      'userdef.reg'
    ]
    if (wineVersion.type === 'proton') {
      requiredPrefixFiles = [
        'pfx.lock',
        'tracked_files',
        'version',
        'config_info',
        ...requiredPrefixFiles.map((path) => join('pfx', path))
      ]
    }
    requiredPrefixFiles = requiredPrefixFiles.map((path) =>
      join(winePrefix, path)
    )
    requiredPrefixFiles.push(winePrefix)

    if (!requiredPrefixFiles.every((path) => existsSync(path))) {
      logWarning(
        'Required prefix files are missing, running `verifyWinePrefix` to create prefix',
        LogPrefix.Backend
      )
      mkdirSync(winePrefix, { recursive: true })
      await verifyWinePrefix(settings)
    }
  }

  if (!(await validWine(wineVersion))) {
    return { stdout: '', stderr: 'Invalid wine' }
  }

  const env_vars: Record<string, string> = {
    ...process.env,
    ...options?.env,
    ...setupEnvVars(settings, gameInstallPath),
    ...setupWineEnvVars(settings, installFolderName),
    PROTON_VERB: protonVerb
  }

  if (ignoreLogging) {
    delete env_vars['PROTON_LOG']
  }

  const wineBin = wineVersion.bin.replaceAll("'", '')
  const umuSupported = await isUmuSupported(settings)
  const runnerBin = umuSupported ? await getUmuPath() : wineBin

  if (wineVersion.type === 'proton' && !umuSupported) {
    commandParts.unshift(protonVerb)
  }

  logDebug(['Running Wine command:', commandParts.join(' ')], LogPrefix.Backend)

  return new Promise<{ stderr: string; stdout: string }>((res) => {
    const wrappers = options?.wrappers || []
    let bin = runnerBin

    if (wrappers.length) {
      bin = wrappers.shift()!
      commandParts.unshift(...wrappers, runnerBin)
    }

    const child = spawn(bin, commandParts, {
      env: env_vars,
      cwd: startFolder
    })
    child.stdout.setEncoding('utf-8')
    child.stderr.setEncoding('utf-8')

    if (options?.logWriters) {
      options.logWriters.forEach((writer) =>
        writer.writeString(
          `Wine Command: ${bin} ${commandParts.join(' ')}\n\nGame Log:\n`
        )
      )
    }

    const stdout = memoryLog()
    const stderr = memoryLog()

    child.stdout.on('data', (data: string) => {
      options?.logWriters?.forEach((writer) => writer.writeString(data))

      if (options?.onOutput) {
        options.onOutput(data, child)
      }

      stdout.push(data)
    })

    child.stderr.on('data', (data: string) => {
      options?.logWriters?.forEach((writer) => writer.writeString(data))

      if (options?.onOutput) {
        options.onOutput(data, child)
      }

      stderr.push(data)
    })

    child.on('close', async (code) => {
      const response = {
        stderr: stderr.join(''),
        stdout: stdout.join(''),
        code
      }

      if (wait && wineVersion.wineserver) {
        await new Promise<void>((res_wait) => {
          const wait_child = spawn(wineVersion.wineserver!, ['--wait'], {
            env: env_vars,
            cwd: startFolder
          })

          wait_child.on('close', () => {
            res_wait()
          })
        })
      }

      res(response)
    })

    child.on('error', (error) => {
      console.log(error)
    })
  })
}

interface RunnerProps {
  name: Runner
  logPrefix: LogPrefix
  bin: string
  dir?: string
}

const commandsRunning: Record<string, Promise<ExecResult>> = {}

function appNameFromCommandParts(commandParts: string[], runner: Runner) {
  let appNameIndex = -1
  let idx = -1

  switch (runner) {
    case 'gog':
      idx = commandParts.findIndex((value) => value === 'launch')
      if (idx > -1) {
        // for GOGdl, between `launch` and the app name there's another element
        appNameIndex = idx + 2
      } else {
        // for the `download`, `repair` and `update` command it's right after
        idx = commandParts.findIndex((value) =>
          ['download', 'repair', 'update'].includes(value)
        )
        if (idx > -1) {
          appNameIndex = idx + 1
        }
      }
      break
    case 'legendary':
      // for legendary, the appName comes right after the commands
      idx = commandParts.findIndex((value) =>
        ['launch', 'install', 'repair', 'update'].includes(value)
      )
      if (idx > -1) {
        appNameIndex = idx + 1
      }
      break
    case 'nile':
      // for nile, we pass the appName as the last command part
      idx = commandParts.findIndex((value) =>
        ['launch', 'install', 'update', 'verify'].includes(value)
      )
      if (idx > -1) {
        appNameIndex = commandParts.length - 1
      }
      break
  }

  return appNameIndex > -1 ? commandParts[appNameIndex] : ''
}

async function callRunner(
  commandParts: string[],
  runner: RunnerProps,
  options: CallRunnerOptions
): Promise<ExecResult> {
  const appName = appNameFromCommandParts(commandParts, runner.name)

  // Automatically add the relevant LogWriter for the runner
  options.logWriters ??= []
  options.logWriters.push(getRunnerLogWriter(runner.name))

  // Necessary to get rid of possible undefined or null entries, else
  // TypeError is triggered
  commandParts = commandParts.filter(Boolean)

  let bin = runner.bin
  let fullRunnerPath = runner.dir ? join(runner.dir, bin) : bin

  // `spawn`ing an executable in the current working directory requires a "./"
  if (!isAbsolute(bin) && runner.dir) bin = './' + bin

  const safeCommand = getRunnerCallWithoutCredentials(
    [...commandParts],
    options?.env,
    fullRunnerPath
  )

  const prefix = `${options.logMessagePrefix ?? 'Running command'}:`
  logInfo([prefix, safeCommand], runner.logPrefix)

  if (options?.logWriters) {
    for (const writer of options.logWriters) {
      await writer.logInfo(
        [prefix, safeCommand, '\n\n'].filter(Boolean).join(' ')
      )
      if (appName) await writer.logInfo('Game Output:')
    }
  }

  // check if the same command is currently running
  // if so, return the same promise instead of running it again
  const key = [runner.name, commandParts].join(' ')
  const currentPromise = commandsRunning[key]

  if (key in commandsRunning) {
    return currentPromise
  }

  const abortId = options?.abortId || appName || Math.random().toString()
  const abortController = createAbortController(abortId)

  let promise = new Promise<ExecResult>((res, rej) => {
    const child = spawn(bin, commandParts, {
      cwd: options?.cwd || runner.dir,
      env: { ...process.env, ...options?.env },
      signal: abortController.signal
    })

    const stdout = memoryLog()
    const stderr = memoryLog()

    child.stdout.setEncoding('utf-8')
    child.stdout.on('data', (data: string) => {
      const stringToLog = options?.logSanitizer
        ? options.logSanitizer(data)
        : data

      options?.logWriters?.forEach((writer) => writer.writeString(stringToLog))

      if (options?.onOutput) {
        options.onOutput(data, child)
      }

      stdout.push(data.trim())
    })

    child.stderr.setEncoding('utf-8')
    child.stderr.on('data', (data: string) => {
      const stringToLog = options?.logSanitizer
        ? options.logSanitizer(data)
        : data

      options?.logWriters?.forEach((writer) => writer.writeString(stringToLog))

      if (options?.onOutput) {
        options.onOutput(data, child)
      }

      stderr.push(data.trim())
    })

    child.on('close', (code, signal) => {
      errorHandler(
        `${stdout.join().concat(stderr.join())}`,
        appName,
        runner.name
      )

      if (signal && !child.killed) {
        rej(new Error(`Process terminated with signal ${signal}`))
      }

      res({
        stdout: stdout.join(),
        stderr: stderr.join('\n')
      })
    })

    child.on('error', (error) => {
      rej(error)
    })
  })

  promise = promise
    .then(({ stdout, stderr }) => {
      return { stdout, stderr, fullCommand: safeCommand }
    })
    .catch((error) => {
      if (abortController.signal.aborted) {
        logInfo(['Abort command', `"${safeCommand}"`], runner.logPrefix)

        return {
          stdout: '',
          stderr: '',
          fullCommand: safeCommand,
          abort: true
        }
      }

      errorHandler(error, appName, runner.name)

      logError(
        ['Error running', 'command', `"${safeCommand}":`, error],
        runner.logPrefix
      )

      return { stdout: '', stderr: `${error}`, fullCommand: safeCommand, error }
    })
    .finally(() => {
      // remove from list when done
      delete commandsRunning[key]
      deleteAbortController(abortId)
    })

  // keep track of which commands are running
  commandsRunning[key] = promise

  return promise
}

/**
 * Generates a formatted, safe command that can be logged
 * @param command The runner command that's executed, e.g. install, list, etc.
 * Note that this will be modified, so pass a copy of your actual command parts
 * @param env Enviroment variables to use
 * @param wrappers Wrappers to use (gamemode, steam runtime, etc.)
 * @param runnerPath The full path to the runner executable
 * @returns
 */
function getRunnerCallWithoutCredentials(
  command: string[] | LegendaryCommand,
  env: Record<string, string> | NodeJS.ProcessEnv = {},
  runnerPath: string
): string {
  if (!Array.isArray(command))
    command = libraryManagerMap['legendary'].commandToArgsArray(command)

  const modifiedCommand = [...command]
  // Redact sensitive arguments (Authorization Code for Legendary, token for GOGDL)
  for (const sensitiveArg of ['--code', '--token']) {
    // PowerShell's argument formatting is quite different, instead of having
    // arguments as members of `command`, they're all in one specific member
    // (the one after "-ArgumentList")
    if (runnerPath === 'powershell') {
      const argumentListIndex = modifiedCommand.indexOf('-ArgumentList') + 1
      if (!argumentListIndex) continue
      modifiedCommand[argumentListIndex] = modifiedCommand[
        argumentListIndex
      ].replace(
        new RegExp(`"${sensitiveArg}","(.*?)"`),
        `"${sensitiveArg}","<redacted>"`
      )
    } else {
      const sensitiveArgIndex = modifiedCommand.indexOf(sensitiveArg)
      if (sensitiveArgIndex === -1) {
        continue
      }
      modifiedCommand[sensitiveArgIndex + 1] = '<redacted>'
    }
  }

  const formattedEnvVars: string[] = []
  for (const [key, value] of Object.entries(env)) {
    // Only add variables if they aren't already defined in our own env
    if (key in process.env) {
      if (value === process.env[key]) {
        continue
      }
    }
    formattedEnvVars.push(`${key}=${quoteIfNecessary(value ?? '')}`)
  }

  return [
    ...formattedEnvVars,
    quoteIfNecessary(runnerPath),
    ...modifiedCommand.map(quoteIfNecessary)
  ].join(' ')
}

/**
 * Converts Unix paths to Windows ones or vice versa
 * @param path The Windows/Unix path you have
 * @param game Required for runWineCommand
 * @param variant The path variant (Windows/Unix) that you'd like to get (passed to `winepath` as -u/-w)
 * @returns The path returned by `winepath`
 */
async function getWinePath({
  path,
  gameSettings,
  variant = 'unix'
}: {
  path: string
  gameSettings: GameSettings
  variant?: 'win' | 'unix'
}): Promise<string> {
  logDebug(`Getting wine path for ${path}.`, LogPrefix.Backend)
  // TODO: Proton has a special verb for getting Unix paths, and another one for Windows ones. Use those instead
  //       Note that this would involve running `proton runinprefix cmd /c echo path` first to expand env vars
  //       https://github.com/ValveSoftware/Proton/blob/4221d9ef07cc38209ff93dbbbca9473581a38255/proton#L1526-L1533
  const { stdout, stderr } = await runWineCommand({
    gameSettings,
    commandParts: [
      'cmd',
      '/c',
      'winepath',
      variant === 'unix' ? '-u' : '-w',
      path
    ],
    wait: false,
    protonVerb: 'runinprefix',
    ignoreLogging: true
  })

  const result = stdout.trim()
  if (!result) {
    logError(
      `Couldn't get wine path for ${path}.\n${stderr}`,
      LogPrefix.Backend
    )
  }

  return result
}

async function runBeforeLaunchScript(
  gameInfo: GameInfo,
  gameSettings: GameSettings,
  logWriter: LogWriter
) {
  if (!gameSettings.beforeLaunchScriptPath) {
    return true
  }

  await logWriter.writeString(
    `Running script before ${gameInfo.title} (${gameSettings.beforeLaunchScriptPath})\n`
  )

  return runScriptForGame(gameInfo, gameSettings, 'before', logWriter)
}

async function runAfterLaunchScript(
  gameInfo: GameInfo,
  gameSettings: GameSettings,
  logWriter: LogWriter
) {
  if (!gameSettings.afterLaunchScriptPath) {
    return true
  }

  await logWriter.writeString(
    `Running script after ${gameInfo.title} (${gameSettings.afterLaunchScriptPath})\n`
  )
  return runScriptForGame(gameInfo, gameSettings, 'after', logWriter)
}

/* Execute script before launch/after exit, wait until the script
 * exits to continue
 *
 * The script can start sub-processes with `bash another-command &`
 * if `another-command` should run asynchronously
 *
 * For example:
 *
 * ```
 * #!/bin/bash
 *
 * echo "this runs before/after the game"
 * bash ./another.bash & # this is launched before/after the game but is not waited
 * echo "this also runs before/after the game too" > someoutput.txt
 * ```
 *
 * Notes:
 * - Output and logs are printed in the game's log
 * - Make sure the script is executable
 * - Make sure any async process is not stuck running in the background forever,
 *   use the after script to kill any running process if that's the case
 */
async function runScriptForGame(
  gameInfo: GameInfo,
  gameSettings: GameSettings,
  scriptStage: 'before' | 'after',
  logWriter: LogWriter
): Promise<boolean | string> {
  return new Promise((resolve, reject) => {
    const scriptPath = gameSettings[`${scriptStage}LaunchScriptPath`]
    const scriptEnv = {
      RELIC_GAME_APP_NAME: gameInfo.app_name,
      RELIC_GAME_EXEC: gameInfo.install.executable,
      RELIC_GAME_PREFIX: gameSettings.winePrefix,
      RELIC_GAME_RUNNER: gameInfo.runner,
      RELIC_GAME_SCRIPT_STAGE: scriptStage,
      RELIC_GAME_TITLE: gameInfo.title,
      RELIC_GAME_SETTINGS: JSON.stringify(gameSettings),
      RELIC_GAME_INFO: JSON.stringify(gameInfo),
      ...process.env
    }
    const child = spawn(scriptPath, {
      cwd: gameInfo.install.install_path,
      env: scriptEnv
    })
    child.stdout.setEncoding('utf-8')
    child.stderr.setEncoding('utf-8')

    if (gameSettings.verboseLogs) {
      child.stdout.on('data', (data: string) => {
        logWriter.writeString(data)
      })

      child.stderr.on('data', (data: string) => {
        logWriter.writeString(data)
      })
    }

    child.on('error', (err) => {
      if (gameSettings.verboseLogs) {
        logWriter.logError(err)
      }
      reject(err)
    })

    child.on('exit', () => {
      resolve(true)
    })
  })
}

export {
  prepareLaunch,

  prepareWineLaunch,
  setupEnvVars,
  setupWrapperEnvVars,
  setupWineEnvVars,
  setupWrappers,
  runWineCommand,
  callRunner,
  getWinePath,
  launchEventCallback,
  getKnownFixesEnvVariables
}
