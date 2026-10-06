import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { basename, dirname, join } from 'path'
import { DirResult, dirSync } from 'tmp'
import { addGameToSteam, createRelicBat, createRunnerFile } from '../add_game'
import { GameInfo } from 'common/types'
import * as steamHelpers from '../steam_helpers'
import { spawnAsync } from 'backend/utils'

jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn()
}))
jest.mock('backend/config')
jest.mock('backend/utils', () => ({
  spawnAsync: jest.fn()
}))
jest.mock('../steam_helpers', () => ({
  findGameInAllUsers: jest.fn(),
  getShortcutId: jest.fn(),
  checkSteamProtocolHandler: jest.fn()
}))

let mockRelicRunnerPath = '/tmp/default-relic-runner'
let mockRelicGamesPath = '/tmp/default-relic-games'
jest.mock('backend/constants/paths', () => ({
  get relicRunnerPath() {
    return mockRelicRunnerPath
  },
  get relicGamesPath() {
    return mockRelicGamesPath
  },
  relicMountPath: '/tmp/mount',
  relicInstallPath: '/tmp/games'
}))

const mockedFindGameInAllUsers = jest.mocked(steamHelpers.findGameInAllUsers)
const mockedGetShortcutId = jest.mocked(steamHelpers.getShortcutId)

const HEADER_LINES = [
  '@echo off',
  'title Relic Runner',
  'echo Relic Runner version 4',
  'echo.',
  'set "RELIC=C:\\relic"',
  'set "LEGENDARY_CONFIG_PATH=%RELIC%\\Legendary"',
  'set "NILE_CONFIG_PATH=%RELIC%"',
  'set "GOGDL_CONFIG_PATH=%RELIC%"',
  'set "PATH=%PATH%;%RELIC%\\bin"'
]

describe('addGameToSteam', () => {
  let tmpDir: DirResult

  beforeEach(() => {
    tmpDir = dirSync({ unsafeCleanup: true })
    jest.clearAllMocks()
    mockedFindGameInAllUsers.mockReturnValue({ entry: null, found: false })
  })

  afterEach(() => {
    tmpDir.removeCallback()
  })

  test('returns error when steam:// URL fails to open', async () => {
    jest.mocked(spawnAsync).mockRejectedValue(new Error('xdg-open not found'))

    const result = await addGameToSteam({
      gameName: 'MyGame',
      runnerPath: '/tmp/MyGame.bat'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Failed to open steam:// URL')
  })

  test('returns success when game is added correctly', async () => {
    mockedFindGameInAllUsers.mockReturnValueOnce({
      found: true,
      entry: { appid: 456, AppName: 'MyGame' },
      error: undefined
    })
    mockedGetShortcutId.mockReturnValue(456)
    const result = await addGameToSteam({
      gameName: 'MyGame',
      runnerPath: '/tmp/MyGame.bat'
    })

    expect(result.success).toBe(true)
    expect(result.steamAppId).toBe(456)
  })

  describe('temporary .desktop launcher', () => {
    const desktopPathFromUrl = (url: string) =>
      decodeURIComponent(url.replace('steam://addnonsteamgame/', ''))

    // Steam is mocked to "add" the game as soon as xdg-open is called; the
    // .desktop is captured then because it is deleted when the call returns.
    function captureDesktop(): { path: string; content: string }[] {
      const captured: { path: string; content: string }[] = []
      jest.mocked(spawnAsync).mockImplementation(async (_cmd, args) => {
        const path = desktopPathFromUrl(args[0])
        captured.push({ path, content: readFileSync(path, 'utf-8') })
        return { code: 0, stdout: '', stderr: '' }
      })
      mockedFindGameInAllUsers
        .mockReturnValueOnce({ entry: null, found: false })
        .mockReturnValue({ entry: { appid: 1 }, found: true })
      mockedGetShortcutId.mockReturnValue(1)
      return captured
    }

    test('passes Steam a .desktop with the game name and runner', async () => {
      const captured = captureDesktop()

      await addGameToSteam({
        gameName: 'My Game',
        runnerPath: '/home/deck/runner/My Game.bat'
      })

      expect(captured).toHaveLength(1)
      expect(captured[0].path.startsWith(tmpdir())).toBe(true)
      expect(captured[0].content).toBe(
        [
          '[Desktop Entry]',
          'Type=Application',
          'Name=My Game',
          'Exec="/home/deck/runner/My Game.bat"',
          'Path=/home/deck/runner',
          'Terminal=false',
          ''
        ].join('\n')
      )
    })

    test('escapes special characters in Name and Exec', async () => {
      const captured = captureDesktop()

      await addGameToSteam({
        gameName: 'Line1\nLine2',
        runnerPath: '/tmp/a"b$c.bat'
      })

      expect(captured[0].content).toContain('Name=Line1\\nLine2\n')
      expect(captured[0].content).toContain('Exec="/tmp/a\\"b\\$c.bat"\n')
    })

    test('removes the temporary .desktop when Steam adds the game', async () => {
      const captured = captureDesktop()

      await addGameToSteam({ gameName: 'MyGame', runnerPath: '/tmp/a.bat' })

      expect(existsSync(captured[0].path)).toBe(false)
      expect(existsSync(dirname(captured[0].path))).toBe(false)
    })

    test('removes the temporary .desktop when xdg-open fails', async () => {
      let desktopPath = ''
      jest.mocked(spawnAsync).mockImplementation(async (_cmd, args) => {
        desktopPath = desktopPathFromUrl(args[0])
        throw new Error('xdg-open not found')
      })

      const result = await addGameToSteam({
        gameName: 'MyGame',
        runnerPath: '/tmp/a.bat'
      })

      expect(result.success).toBe(false)
      expect(existsSync(dirname(desktopPath))).toBe(false)
    })

    test('skips Steam when the game title already exists', async () => {
      mockedFindGameInAllUsers.mockReturnValue({
        entry: { appid: 7 },
        found: true
      })
      mockedGetShortcutId.mockReturnValue(7)

      const result = await addGameToSteam({
        gameName: 'MyGame',
        runnerPath: '/tmp/a.bat'
      })

      expect(result).toEqual({ success: true, steamAppId: 7 })
      expect(spawnAsync).not.toHaveBeenCalled()
    })
  })
})

describe('createRelicBat', () => {
  let tmpDir: DirResult

  beforeEach(() => {
    tmpDir = dirSync({ unsafeCleanup: true })
    mockRelicRunnerPath = tmpDir.name
    jest.clearAllMocks()
  })

  afterEach(() => {
    tmpDir.removeCallback()
  })

  test('creates legendary bat with correct runner command', () => {
    const runnerPath = createRelicBat(
      tmpDir.name,
      'TestGame',
      'legendary',
      'abc123'
    )

    expect(runnerPath).toBe(join(tmpDir.name, 'TestGame.bat'))
    expect(existsSync(runnerPath)).toBe(true)

    const content = readFileSync(runnerPath, 'utf-8')
    for (const line of HEADER_LINES) {
      expect(content).toContain(line)
    }
    expect(content).toContain('if not exist "%RELIC%\\bin\\legendary.exe" (')
    expect(content).toContain('legendary status')
    expect(content).toContain('legendary launch abc123 %*')
    expect(content).toContain(
      "echo If you've closed the game, you can close this window now."
    )
  })

  test('creates gog bat with correct runner command', () => {
    const runnerPath = createRelicBat(tmpDir.name, 'GogGame', 'gog', 'gog123')

    expect(runnerPath).toBe(join(tmpDir.name, 'GogGame.bat'))
    expect(existsSync(runnerPath)).toBe(true)

    const content = readFileSync(runnerPath, 'utf-8')
    for (const line of HEADER_LINES) {
      expect(content).toContain(line)
    }
    expect(content).toContain('if not exist "%RELIC%\\bin\\gogdl.exe" (')
    expect(content).toContain('if not exist "%RELIC%\\bin\\comet.exe" (')
    expect(content).toContain('if not exist "%RELIC%\\gog_store\\auth.json" (')
    expect(content).toContain('mkdir "%APPDATA%\\heroic\\gog_store" >nul 2>&1')
    expect(content).toContain(
      'copy "%RELIC%\\gog_store\\*" "%APPDATA%\\heroic\\gog_store\\" >nul 2>&1'
    )
    expect(content).toContain('cd /d "%RELIC%\\bin\\"')
    expect(content).toContain('comet.exe --version')
    expect(content).toContain(
      'start "" /b "install-dummy-service.bat" >nul 2>&1'
    )
    expect(content).toContain(
      'start "" /b "comet.exe" --from-heroic --username '
    )
    expect(content).toContain('timeout /t 2 /nobreak >nul')
    expect(content).toContain(
      `for /f "delims=" %%v in ('gogdl --version') do echo gogdl version: %%v`
    )
    expect(content).toContain(
      `@gogdl --auth-config-path c:\\relic\\gog_store\\auth.json ` +
        `launch --platform windows "c:\\games\\${basename(tmpDir.name)}" gog123 -- %*`
    )
    expect(content).toContain('echo COMET IS RUNNING.')
    expect(content).toContain(
      "echo If you've closed the game, you can close this window now."
    )
  })

  test('creates nile bat with correct runner command', () => {
    const runnerPath = createRelicBat(
      tmpDir.name,
      'AmazonGame',
      'nile',
      'nile789'
    )

    expect(runnerPath).toBe(join(tmpDir.name, 'AmazonGame.bat'))
    expect(existsSync(runnerPath)).toBe(true)

    const content = readFileSync(runnerPath, 'utf-8')
    for (const line of HEADER_LINES) {
      expect(content).toContain(line)
    }
    expect(content).toContain('if not exist "%RELIC%\\bin\\nile.exe" (')
    expect(content).toContain(
      `for /f "delims=" %%v in ('nile --version') do echo nile version: %%v`
    )
    expect(content).toContain('nile launch nile789 -- %*')
    expect(content).toContain(
      "echo If you've closed the game, you can close this window now."
    )
  })

  test('creates default bat for unknown runner', () => {
    const runnerPath = createRelicBat(
      '/some/path/ZoomGame',
      'ZoomGame',
      'zoom',
      ''
    )

    expect(runnerPath).toBe(join(mockRelicRunnerPath, 'ZoomGame.bat'))
    expect(existsSync(runnerPath)).toBe(true)

    const content = readFileSync(runnerPath, 'utf-8')
    for (const line of HEADER_LINES) {
      expect(content).toContain(line)
    }
    expect(content).toContain('@echo En desarrollo...')
    expect(content).toContain(
      "echo If you've closed the game, you can close this window now."
    )
  })

  test('overwrites existing file with new content', () => {
    mkdirSync(tmpDir.name, { recursive: true })
    const runnerPath = join(tmpDir.name, 'ExistingGame.bat')
    writeFileSync(runnerPath, 'old content', 'utf-8')

    const result = createRelicBat(
      tmpDir.name,
      'ExistingGame',
      'legendary',
      'abc'
    )

    expect(result).toBe(runnerPath)
    const content = readFileSync(runnerPath, 'utf-8')
    expect(content).toContain('legendary launch abc %*')
    expect(content).not.toBe('old content')
  })
})

describe('createRunnerFile', () => {
  let installDir: DirResult
  let gamesDir: DirResult
  let runnerDir: DirResult

  beforeEach(() => {
    installDir = dirSync({ unsafeCleanup: true })
    gamesDir = dirSync({ unsafeCleanup: true })
    runnerDir = dirSync({ unsafeCleanup: true })
    mockRelicGamesPath = gamesDir.name
    mockRelicRunnerPath = runnerDir.name
  })

  afterEach(() => {
    installDir.removeCallback()
    gamesDir.removeCallback()
    runnerDir.removeCallback()
  })

  test('zoom: symlinks the install path into relicGamesPath and points at the executable through it', () => {
    const gameInfo = {
      runner: 'zoom',
      install: { executable: 'drive_c/Game/game.exe' }
    } as unknown as GameInfo

    const result = createRunnerFile(gameInfo, installDir.name)

    expect('path' in result).toBe(true)
    const linkPath = join(gamesDir.name, basename(installDir.name))
    expect(existsSync(linkPath)).toBe(true)
    expect((result as { path: string }).path).toBe(
      join(linkPath, 'drive_c/Game/game.exe')
    )
  })

  test('zoom: returns an error when there is no executable', () => {
    const gameInfo = {
      runner: 'zoom',
      install: { executable: '' }
    } as unknown as GameInfo

    const result = createRunnerFile(gameInfo, installDir.name)

    expect(result).toEqual({ error: 'No executable found for Zoom game' })
  })

  test('non-zoom: creates a .bat runner file', () => {
    const gameInfo = {
      runner: 'legendary',
      title: 'LegGame',
      app_name: 'leg_app',
      install: {}
    } as unknown as GameInfo

    const result = createRunnerFile(gameInfo, installDir.name)

    expect((result as { path: string }).path).toBe(
      join(mockRelicRunnerPath, 'LegGame.bat')
    )
  })
})
