import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'graceful-fs'
import { join } from 'path'
import { DirResult, dirSync } from 'tmp'
import { addGameToSteam, createRelicBat } from '../add_game'
import * as steamHelpers from '../steam_helpers'
import { spawnAsync } from 'backend/utils'
import { relicRunnerPath } from 'backend/constants/paths'

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

const mockedFindGameInAllUsers = jest.mocked(steamHelpers.findGameInAllUsers)
const mockedGetShortcutId = jest.mocked(steamHelpers.getShortcutId)

const HEADER_LINES = [
  '@echo off',
  'echo runner version 2',
  '@SET LEGENDARY_CONFIG_PATH=c:\\heroic\\Legendary',
  '@SET NILE_CONFIG_PATH=c:\\heroic\\',
  '@SET GOGDL_CONFIG_PATH=c:\\heroic\\',
  '@SET PATH=%PATH%;c:\\heroic\\bin'
]

describe('addGameToSteam', () => {
  let tmpDir: DirResult

  beforeEach(() => {
    tmpDir = dirSync({ unsafeCleanup: true })
    jest.clearAllMocks()
  })

  afterEach(() => {
    tmpDir.removeCallback()
  })

  test('returns error when steam:// URL fails to open', async () => {
    jest.mocked(spawnAsync).mockRejectedValue(
      new Error('xdg-open not found')
    )

    const result = await addGameToSteam({
      gameName: 'MyGame'
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
      gameName: 'MyGame'
    })

    expect(result.success).toBe(true)
    expect(result.steamAppId).toBe(456)
  })
})

describe('createRelicBat', () => {
  let tmpDir: DirResult

  beforeEach(() => {
    tmpDir = dirSync({ unsafeCleanup: true })
    jest.clearAllMocks()
  })

  afterEach(() => {
    tmpDir.removeCallback()
  })

  test('creates legendary bat with correct runner command', () => {
    const batPath = createRelicBat(tmpDir.name, 'TestGame', 'legendary', 'abc123')

    expect(batPath).toBe(join(relicRunnerPath, 'TestGame.bat'))
    expect(existsSync(batPath)).toBe(true)

    const content = readFileSync(batPath, 'utf-8')
    for (const line of HEADER_LINES) {
      expect(content).toContain(line)
    }
    expect(content).toContain('@legendary launch abc123 %*')
  })

  test('creates gog bat with correct runner command', () => {
    const batPath = createRelicBat(tmpDir.name, 'GogGame', 'gog', 'gog123')

    expect(batPath).toBe(join(relicRunnerPath, 'GogGame.bat'))
    expect(existsSync(batPath)).toBe(true)

    const content = readFileSync(batPath, 'utf-8')
    for (const line of HEADER_LINES) {
      expect(content).toContain(line)
    }
    expect(content).toContain(
      `@gogdl --auth-config-path c:\\heroic\\gog_store\\auth.json ` +
      `launch --platform windows "${tmpDir.name}" gog123 -- %*`
    )
  })

  test('creates nile bat with correct runner command', () => {
    const batPath = createRelicBat(tmpDir.name, 'AmazonGame', 'nile', 'nile789')

    expect(batPath).toBe(join(relicRunnerPath, 'AmazonGame.bat'))
    expect(existsSync(batPath)).toBe(true)

    const content = readFileSync(batPath, 'utf-8')
    for (const line of HEADER_LINES) {
      expect(content).toContain(line)
    }
    expect(content).toContain('@nile launch nile789 -- %*')
  })

  test('creates default bat for sideload with placeholder', () => {
    const batPath = createRelicBat(tmpDir.name, 'SideloadGame', 'sideload', '')

    expect(batPath).toBe(join(relicRunnerPath, 'SideloadGame.bat'))
    expect(existsSync(batPath)).toBe(true)

    const content = readFileSync(batPath, 'utf-8')
    for (const line of HEADER_LINES) {
      expect(content).toContain(line)
    }
    expect(content).toContain('@echo En desarrollo...')
  })

  test('creates default bat for zoom with placeholder', () => {
    const batPath = createRelicBat(tmpDir.name, 'ZoomGame', 'zoom', '')

    expect(batPath).toBe(join(relicRunnerPath, 'ZoomGame.bat'))
    expect(existsSync(batPath)).toBe(true)

    const content = readFileSync(batPath, 'utf-8')
    for (const line of HEADER_LINES) {
      expect(content).toContain(line)
    }
    expect(content).toContain('@echo En desarrollo...')
  })

  test('returns existing path without rewriting when file exists', () => {
    mkdirSync(relicRunnerPath, { recursive: true })
    const batPath = join(relicRunnerPath, 'ExistingGame.bat')
    writeFileSync(batPath, 'old content', 'utf-8')

    const result = createRelicBat(tmpDir.name, 'ExistingGame', 'legendary', 'abc')

    expect(result).toBe(batPath)
    const content = readFileSync(batPath, 'utf-8')
    expect(content).toBe('old content')
  })
})
