import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { DirResult, dirSync } from 'tmp'
import { join } from 'path'
import type { SteamShortcut } from '../types'

let mockAppFolder: string
let currentTmpDir: DirResult

jest.mock('backend/constants/paths', () => ({
  get appFolder() {
    return mockAppFolder
  }
}))

jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn()
}))

let store: typeof import('../store')
let listShortcuts: typeof store.listShortcuts
let findShortcut: typeof store.findShortcut
let addShortcut: typeof store.addShortcut
let removeShortcut: typeof store.removeShortcut

const TEST_SHORTCUT: SteamShortcut = {
  gameName: 'Test Game',
  appId: 'test_app',
  store: 'gog',
  steamAppId: 123,
  installPath: '/games/test',
  execPath: '/games/test/TestGame.bat'
}

const ANOTHER_SHORTCUT: SteamShortcut = {
  gameName: 'Another Game',
  appId: 'another_app',
  store: 'legendary',
  steamAppId: 456,
  installPath: '/games/another',
  execPath: '/games/another/AnotherGame.bat'
}

function storePath(): string {
  return join(mockAppFolder, 'steam_shortcuts.json')
}

function readStoreFile(): SteamShortcut[] {
  return JSON.parse(readFileSync(storePath(), 'utf-8'))
}

beforeEach(() => {
  currentTmpDir = dirSync({ unsafeCleanup: true })
  mockAppFolder = currentTmpDir.name
  jest.resetModules()
  store = require('../store')
  listShortcuts = store.listShortcuts
  findShortcut = store.findShortcut
  addShortcut = store.addShortcut
  removeShortcut = store.removeShortcut
})

afterEach(() => {
  currentTmpDir.removeCallback()
})

describe('listShortcuts', () => {
  test('returns empty array when store file does not exist', () => {
    const result = listShortcuts()

    expect(result).toEqual([])
  })

  test('returns parsed shortcuts from disk', () => {
    mkdirSync(mockAppFolder, { recursive: true })
    writeFileSync(storePath(), JSON.stringify([TEST_SHORTCUT]), 'utf-8')

    const result = listShortcuts()

    expect(result).toEqual([TEST_SHORTCUT])
  })

  test('returns empty array when JSON is corrupt', () => {
    mkdirSync(mockAppFolder, { recursive: true })
    writeFileSync(storePath(), '{ corrupt json', 'utf-8')

    const result = listShortcuts()

    expect(result).toEqual([])
  })
})

describe('findShortcut', () => {
  test('returns matching shortcut by appId', () => {
    mkdirSync(mockAppFolder, { recursive: true })
    writeFileSync(
      storePath(),
      JSON.stringify([TEST_SHORTCUT, ANOTHER_SHORTCUT]),
      'utf-8'
    )

    const result = findShortcut('another_app')

    expect(result).toEqual(ANOTHER_SHORTCUT)
  })

  test('returns undefined when shortcut not found', () => {
    mkdirSync(mockAppFolder, { recursive: true })
    writeFileSync(storePath(), JSON.stringify([TEST_SHORTCUT]), 'utf-8')

    const result = findShortcut('nonexistent')

    expect(result).toBeUndefined()
  })
})

describe('addShortcut', () => {
  test('creates new shortcut entry', () => {
    addShortcut(
      'New Game',
      'new_app',
      'nile',
      789,
      '/games/new',
      '/games/new/NewGame.bat'
    )

    const saved = readStoreFile()
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({
      gameName: 'New Game',
      appId: 'new_app',
      store: 'nile',
      steamAppId: 789,
      installPath: '/games/new',
      execPath: '/games/new/NewGame.bat'
    })
  })

  test('updates existing shortcut when same appId exists', () => {
    mkdirSync(mockAppFolder, { recursive: true })
    writeFileSync(storePath(), JSON.stringify([TEST_SHORTCUT]), 'utf-8')

    addShortcut(
      'Updated Game',
      TEST_SHORTCUT.appId,
      'gog',
      999,
      '/games/updated',
      '/games/updated/Updated.bat'
    )

    const saved = readStoreFile()
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({
      gameName: 'Updated Game',
      appId: TEST_SHORTCUT.appId,
      steamAppId: 999,
      installPath: '/games/updated'
    })
  })
})

describe('removeShortcut', () => {
  test('removes shortcut by appId', () => {
    mkdirSync(mockAppFolder, { recursive: true })
    writeFileSync(
      storePath(),
      JSON.stringify([TEST_SHORTCUT, ANOTHER_SHORTCUT]),
      'utf-8'
    )

    removeShortcut(TEST_SHORTCUT.appId)

    const saved = readStoreFile()
    expect(saved).toHaveLength(1)
    expect(saved[0].appId).toBe(ANOTHER_SHORTCUT.appId)
  })

  test('noop when shortcut does not exist', () => {
    mkdirSync(mockAppFolder, { recursive: true })
    writeFileSync(storePath(), JSON.stringify([TEST_SHORTCUT]), 'utf-8')

    removeShortcut('nonexistent')

    const saved = readStoreFile()
    expect(saved).toHaveLength(1)
    expect(saved[0].appId).toBe(TEST_SHORTCUT.appId)
  })
})
