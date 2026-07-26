import { copyFileSync, mkdirSync } from 'graceful-fs'
import { join } from 'path'
import { DirResult, dirSync } from 'tmp'
import { GlobalConfig } from 'backend/config'
import {
  getAppName,
  getShortcutId,
  readShortcutsVdf,
  findGameInAllUsers
} from '../steam_helpers'

jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn()
}))
jest.mock('backend/config')

const TEST_VDF_DIR = join(__dirname, 'test_data')

let tmpDir: DirResult
let tmpUserdataDir: string
let tmpConfigDir: string

function copyValidTestVdf(): string {
  const dest = join(tmpConfigDir, 'shortcuts.vdf')
  copyFileSync(join(TEST_VDF_DIR, 'shortcuts_valid.vdf'), dest)
  return dest
}

describe('steam_helpers', () => {
  beforeEach(() => {
    tmpDir = dirSync({ unsafeCleanup: true })
    GlobalConfig.setConfigValue('defaultSteamPath', tmpDir.name)
    tmpUserdataDir = join(tmpDir.name, 'userdata', 'steam_user')
    tmpConfigDir = join(tmpUserdataDir, 'config')
    mkdirSync(tmpConfigDir, { recursive: true })
  })

  afterEach(() => {
    tmpDir.removeCallback()
  })

  describe('getAppName', () => {
    test('finds AppName key (PascalCase)', () => {
      const entry = { AppName: 'MyGame', appid: 123 }
      expect(getAppName(entry)).toBe('MyGame')
    })

    test('finds appname key (lowercase)', () => {
      const entry = { appname: 'MyGame', appid: 123 }
      expect(getAppName(entry)).toBe('MyGame')
    })

    test('finds APPNAME key (uppercase)', () => {
      const entry = { APPNAME: 'MyGame', appid: 123 }
      expect(getAppName(entry)).toBe('MyGame')
    })

    test('returns empty string when no AppName key exists', () => {
      const entry = { appid: 123 }
      expect(getAppName(entry)).toBe('')
    })

    test('returns empty string for empty object', () => {
      expect(getAppName({})).toBe('')
    })
  })

  describe('getShortcutId', () => {
    test('returns appid when it is a number', () => {
      const entry = { appid: 42, AppName: 'Game' }
      expect(getShortcutId(entry)).toBe(42)
    })

    test('returns 0 when appid is false (autoConvertBooleans bug)', () => {
      const entry = { appid: false, AppName: 'Game' }
      expect(getShortcutId(entry)).toBe(0)
    })

    test('returns 0 when appid is null', () => {
      const entry = { appid: null, AppName: 'Game' }
      expect(getShortcutId(entry)).toBe(0)
    })

    test('returns 0 when appid is missing', () => {
      const entry = { AppName: 'Game' }
      expect(getShortcutId(entry)).toBe(0)
    })

    test('returns unsigned appid for negative value', () => {
      const entry = { appid: -164687467, AppName: 'Game' }
      expect(getShortcutId(entry)).toBe(-164687467 >>> 0)
    })
  })

  describe('readShortcutsVdf', () => {
    test('returns null when file does not exist', () => {
      const result = readShortcutsVdf('/nonexistent/shortcuts.vdf')
      expect(result).toBeNull()
    })

    test('returns parsed object when file exists', () => {
      copyValidTestVdf()
      const shortcutsFile = join(tmpConfigDir, 'shortcuts.vdf')
      const result = readShortcutsVdf(shortcutsFile)
      expect(result).not.toBeNull()
      expect(result).toHaveProperty('shortcuts')
    })
  })

  describe('findGameInAllUsers', () => {
    test('finds a game that exists in shortcuts.vdf', () => {
      copyValidTestVdf()
      const result = findGameInAllUsers('Discord')
      expect(result.found).toBe(true)
      expect(result.entry).not.toBeNull()
      expect(result.error).toBeUndefined()
    })

    test('does not find a game that is not in shortcuts.vdf', () => {
      copyValidTestVdf()
      const result = findGameInAllUsers('NotInVdf')
      expect(result.found).toBe(false)
      expect(result.entry).toBeNull()
    })

    test('returns error when no Steam userdata directories exist', () => {
      const emptyDir = dirSync({ unsafeCleanup: true })
      GlobalConfig.setConfigValue('defaultSteamPath', emptyDir.name)

      const result = findGameInAllUsers('MyGame')
      expect(result.found).toBe(false)
      expect(result.entry).toBeNull()
      expect(result.error).toContain(emptyDir.name)

      emptyDir.removeCallback()
    })
  })
})
