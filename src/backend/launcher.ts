import {
  CallRunnerOptions,
  GameInfo,
  Runner,
  WrapperEnv,
  ExecResult,
  LaunchPreperationResult,
  GameSettings,
  KnowFixesInfo,
  LaunchParams,
  StatusPromise
} from 'common/types'
// This handles launching games, prefix creation etc..

import i18next from 'i18next'
import { existsSync } from 'graceful-fs'
import { join, isAbsolute } from 'path'

import {
  isEpicServiceOffline,
  quoteIfNecessary,
  errorHandler,
  removeQuoteIfNecessary,
  memoryLog,
  sendGameStatusUpdate,
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
import { spawn } from 'child_process'
import shlex from 'shlex'
import { isOnline } from './online_monitor'
import { showDialogBoxModalAuto } from './dialog/dialog'
import { libraryManagerMap } from 'backend/storeManagers'
import { readFileSync } from 'fs'
import { LegendaryCommand } from './storeManagers/legendary/commands'
import {
  createAbortController,
  deleteAbortController
} from './utils/aborthandler/aborthandler'
import { download, isInstalled } from './wine/runtimes/runtimes'
import { storeMap } from 'common/utils'
import { getMainWindow } from './main_window'
import { getUmuPath, isUmuSupported } from './utils/compatibility_layers'
import { app, powerSaveBlocker } from 'electron'
import gogPresence from './storeManagers/gog/presence'
import { addRecentGame } from './recent_games/recent_games'
import { tsStore } from './constants/key_value_stores'
import {
  defaultUmuPath,
  fixesPath,
  gamesConfigPath,
  runtimePath,
  userHome
} from './constants/paths'
import {
  isCLINoGui,
  isLinux,
  isSteamDeckGameMode,
  isSteamDeck
} from './constants/environment'
import { formatSystemInfo, getSystemInfo } from './utils/systeminfo'

import type { PartialDeep } from 'type-fest'
import type LogWriter from './logger/log_writer'
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

  delete gameSettings.enableQuickSavesMenu
  delete gameSettings.verboseLogs



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

export function setupWrappers() {
  return []
}

export {
  prepareLaunch,
  setupEnvVars,
  setupWrapperEnvVars,
  callRunner,
  launchEventCallback,
  getKnownFixesEnvVariables
}
