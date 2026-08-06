import {
  existsSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from 'fs'
import { basename, join } from 'path'
import { logError, logInfo } from 'backend/logger'
import { spawnAsync } from 'backend/utils'
import {
  relicRunnerPath,
  relicGamesPath,
  userDataPath
} from 'backend/constants/paths'
import {
  findGameInAllUsers,
  findExistingGame,
  getShortcutId,
  checkSteamProtocolHandler
} from './steam_helpers'
import type {
  AddGameToSteamOptions,
  AddGameToSteamResult,
  GameRunner
} from './types'
import { GameInfo } from 'common/types'

const LOG_PREFIX = 'Relic'

export function createRunnerFile(
  gameInfo: GameInfo,
  installPath: string
): { path: string } | { error: string } {
  if (gameInfo.runner === 'zoom') {
    const executable = gameInfo.install.executable
    if (!executable) {
      return { error: 'No executable found for Zoom game' }
    }

    const symlink = createGameSymlink(installPath)
    if ('error' in symlink) {
      return { error: symlink.error }
    }

    return { path: join(symlink.linkPath, executable) }
  }

  try {
    const runnerPath = createRelicBat(
      installPath,
      gameInfo.title,
      gameInfo.runner,
      gameInfo.app_name
    )
    return { path: runnerPath }
  } catch (e) {
    logError(`Failed to create runner file: ${e}`, LOG_PREFIX)
    return { error: `Failed to create runner file: ${e}` }
  }
}

function getGogUsername(): string {
  try {
    const configPath = join(userDataPath, 'gog_store', 'config.json')
    const raw = readFileSync(configPath, 'utf-8')
    const config = JSON.parse(raw)
    return config.userData?.username ?? ''
  } catch {
    return ''
  }
}

export function createRelicBat(
  installPath: string,
  gameName: string,
  runner: GameRunner,
  appName: string
): string {
  const runnerPath = join(relicRunnerPath, `${gameName}.bat`)

  mkdirSync(relicRunnerPath, { recursive: true })

  const header = [
    '@echo off',
    'title Relic Runner',
    '',
    'echo Relic Runner version 3',
    'echo.',
    '',
    'rem ============================================================',
    'rem Configuration',
    'rem ============================================================',
    '',
    'set "RELIC=C:\\relic"',
    '',
    'set "LEGENDARY_CONFIG_PATH=%RELIC%\\Legendary"',
    'set "NILE_CONFIG_PATH=%RELIC%"',
    'set "GOGDL_CONFIG_PATH=%RELIC%"',
    'set "PATH=%PATH%;%RELIC%\\bin"'
  ]

  const finish = [
    '',
    'echo.',
    'echo ---------------------------------------------------------',
    "echo If you've closed the game, you can close this window now.",
    'echo ---------------------------------------------------------'
  ]

  let sectionLines: string[]
  let endLines = finish

  switch (runner) {
    case 'legendary':
      sectionLines = [
        '',
        'rem ============================================================',
        'rem PRECHECKS',
        'rem ============================================================',
        '',
        'if not exist "%RELIC%\\bin\\legendary.exe" (',
        '    echo [ERROR]: legendary.exe not found.',
        '    timeout /t 2 /nobreak >nul',
        '    exit /b 1',
        ')',
        '',
        'rem ============================================================',
        'rem START THE GAME',
        'rem ============================================================',
        '',
        'legendary --version',
        '',
        `legendary launch ${appName} %*`
      ]
      break

    case 'gog': {
      const winPath = `c:\\games\\${basename(installPath)}`
      const username = getGogUsername()
      sectionLines = [
        '',
        'rem ============================================================',
        'rem PRECHECKS',
        'rem ============================================================',
        '',
        'if not exist "%RELIC%\\bin\\gogdl.exe" (',
        '    echo [ERROR]: gogdl.exe not found.',
        '    timeout /t 2 /nobreak >nul',
        '    exit /b 1',
        ')',
        '',
        'if not exist "%RELIC%\\bin\\comet.exe" (',
        '    echo [ERROR]: comet.exe not found.',
        '    timeout /t 2 /nobreak >nul',
        '    exit /b 1',
        ')',
        '',
        'if not exist "%RELIC%\\gog_store\\auth.json" (',
        '    echo [ERROR]: NOT AUTHENTICATED ON GOG. Please, login on Relic.',
        '    timeout /t 2 /nobreak >nul',
        '    exit /b 1',
        ')',
        '',
        'rem ============================================================',
        'rem Start Comet',
        'rem ============================================================',
        '',
        'mkdir "%APPDATA%\\heroic\\gog_store" >nul 2>&1',
        'copy "%RELIC%\\gog_store\\*" "%APPDATA%\\heroic\\gog_store\\" >nul 2>&1',
        'cd /d "%RELIC%\\bin\\"',
        'comet.exe --version',
        '',
        `start "" /b "install-dummy-service.bat" >nul 2>&1`,
        `start "" /b "comet.exe" --from-heroic --username "${username}" >nul 2>&1`,
        '',
        'timeout /t 2 /nobreak >nul',
        '',
        'rem ============================================================',
        'rem START THE GAME',
        'rem ============================================================',
        '',
        'gogdl --version',
        '',
        `@gogdl --auth-config-path c:\\relic\\gog_store\\auth.json launch --platform windows "${winPath}" ${appName} -- %*`
      ]
      endLines = [
        '',
        'echo.',
        'echo ---------------------------------------------------------',
        'echo COMET IS RUNNING.',
        "echo If you've closed the game, you can close this window now.",
        'echo ---------------------------------------------------------'
      ]
      break
    }

    case 'nile':
      sectionLines = [
        '',
        'rem ============================================================',
        'rem PRECHECKS',
        'rem ============================================================',
        '',
        'if not exist "%RELIC%\\bin\\nile.exe" (',
        '    echo [ERROR]: nile.exe not found.',
        '    timeout /t 2 /nobreak >nul',
        '    exit /b 1',
        ')',
        '',
        'rem ============================================================',
        'rem START THE GAME',
        'rem ============================================================',
        '',
        'nile --version',
        '',
        `nile launch ${appName} -- %*`
      ]
      break

    default:
      sectionLines = ['', '@echo En desarrollo...']
  }

  const content = [...header, ...sectionLines, ...endLines].join('\n')
  writeFileSync(runnerPath, content, 'utf-8')

  logInfo(`Created ${runnerPath}`, LOG_PREFIX)
  return runnerPath
}

export function createGameSymlink(
  installPath: string
): { linkPath: string } | { error: string } {
  if (!installPath) {
    return { error: 'No install path provided' }
  }
  const linkPath = join(relicGamesPath, basename(installPath))
  try {
    if (existsSync(linkPath)) {
      unlinkSync(linkPath)
    }
    mkdirSync(relicGamesPath, { recursive: true })
    symlinkSync(installPath, linkPath)
    logInfo(`Created symlink: ${linkPath} -> ${installPath}`, LOG_PREFIX)
    return { linkPath }
  } catch (error) {
    logError(`Failed to create symlink ${linkPath}: ${error}`, LOG_PREFIX)
    return { error: `Failed to create symlink: ${error}` }
  }
}

const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 15000
const ADD_GAME_MARKER = '/tmp/addnonsteamgamefile'

export async function addGameToSteam(
  options: AddGameToSteamOptions
): Promise<AddGameToSteamResult> {
  const { gameName, runnerPath } = options
  const steamName = basename(runnerPath)

  checkSteamProtocolHandler()

  const existing = findExistingGame(steamName)
  if (existing.found) {
    logInfo(
      `"${gameName}" already exists in Steam (ID ${existing.steamAppId}). Skipping.`,
      LOG_PREFIX
    )
    return { success: true, steamAppId: existing.steamAppId }
  }

  const encodedPath = encodeURIComponent(runnerPath)
  const steamUrl = `steam://addnonsteamgame/${encodedPath}`

  try {
    unlinkSync(ADD_GAME_MARKER)
  } catch {
    // File doesn't exist, that's fine
  }
  writeFileSync(ADD_GAME_MARKER, '', 'utf-8')

  try {
    await spawnAsync('xdg-open', [steamUrl])
    logInfo(`Opened ${steamUrl}`, LOG_PREFIX)
  } catch (error) {
    logError(`Failed to open steam:// URL: ${error}`, LOG_PREFIX)
    return { success: false, error: `Failed to open steam:// URL: ${error}` }
  }

  logInfo(`Waiting for "${steamName}" to be added to Steam...`, LOG_PREFIX)

  const { found, steamAppId } = await waitForGameInSteam(steamName, Date.now())

  if (!found) {
    return {
      success: false,
      error:
        `"${steamName}" was not added to Steam in time. ` +
        `Make sure Steam is running and you confirmed the dialog.`
    }
  }

  logInfo(
    `"${steamName}" added to Steam with app ID ${steamAppId}.`,
    LOG_PREFIX
  )

  return {
    success: true,
    steamAppId
  }
}

async function waitForGameInSteam(
  gameName: string,
  startTime: number
): Promise<{ found: boolean; steamAppId?: number }> {
  const elapsed = Date.now() - startTime

  if (elapsed >= POLL_TIMEOUT_MS) {
    logError(
      `Timeout waiting for "${gameName}" to appear in Steam shortcuts (${POLL_TIMEOUT_MS}ms).`,
      LOG_PREFIX
    )
    return { found: false }
  }

  const result = findGameInAllUsers(gameName)

  if (result.found && result.entry) {
    return { found: true, steamAppId: getShortcutId(result.entry) }
  }

  await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  return waitForGameInSteam(gameName, startTime)
}
