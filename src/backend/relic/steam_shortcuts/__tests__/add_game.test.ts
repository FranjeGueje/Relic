import { existsSync, readFileSync, writeFileSync } from 'graceful-fs'
import { join } from 'path'
import { DirResult, dirSync } from 'tmp'
import { addGameToSteam, createMockBat } from '../add_game'
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

const mockedFindGameInAllUsers = jest.mocked(steamHelpers.findGameInAllUsers)
const mockedGetShortcutId = jest.mocked(steamHelpers.getShortcutId)

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
      gameName: 'MyGame',
      installPath: tmpDir.name
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
      installPath: tmpDir.name
    })

    expect(result.success).toBe(true)
    expect(result.steamAppId).toBe(456)
  })
})

describe('createMockBat', () => {
  let tmpDir: DirResult

  beforeEach(() => {
    tmpDir = dirSync({ unsafeCleanup: true })
    jest.clearAllMocks()
  })

  afterEach(() => {
    tmpDir.removeCallback()
  })

  test('creates a .bat file with correct content', () => {
    const batPath = createMockBat(tmpDir.name, 'TestGame')

    expect(batPath).toBe(join(tmpDir.name, 'TestGame.bat'))
    expect(existsSync(batPath)).toBe(true)

    const content = readFileSync(batPath, 'utf-8')
    expect(content).toContain('@echo off')
    expect(content).toContain('echo TestGame')
    expect(content).toContain('pause')
  })

  test('returns existing path without rewriting when file exists', () => {
    const batPath = join(tmpDir.name, 'ExistingGame.bat')
    writeFileSync(batPath, 'old content', 'utf-8')

    const result = createMockBat(tmpDir.name, 'ExistingGame')

    expect(result).toBe(batPath)
    const content = readFileSync(batPath, 'utf-8')
    expect(content).toBe('old content')
  })
})
