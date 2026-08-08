jest.mock('backend/logger', () => ({
  LogPrefix: { Nile: 'Nile' },
  logDebug: jest.fn(),
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn()
}))
jest.mock('../electronStores', () => ({
  installStore: { get: jest.fn(), set: jest.fn() },
  libraryStore: { get: jest.fn(), set: jest.fn() }
}))
jest.mock('backend/utils', () => ({
  getFileSize: jest.fn(),
  getNileBin: jest.fn(() => ({ dir: '/tmp', bin: 'nile' })),
  removeSpecialcharacters: jest.fn((value: string) => value)
}))
jest.mock('backend/launcher', () => ({ callRunner: jest.fn() }))
jest.mock('backend/constants/paths', () => ({
  appDataPath: '/tmp/appdata',
  userDataPath: '/tmp/userdata',
  appFolder: '/tmp/userdata'
}))
jest.mock('../user', () => ({
  NileUser: { isLoggedIn: jest.fn(() => true), getUserData: jest.fn() }
}))
jest.mock('../e2eMock', () => ({ runNileCommandStub: jest.fn() }))
jest.mock('../constants', () => ({
  nileConfigPath: '/tmp/nile_config',
  nileInstalled: '/tmp/nile_config/installed.json',
  nileLibrary: '/tmp/nile_config/library.json'
}))
jest.mock('../games', () => ({ default: class {} }))
jest.mock('../../index', () => ({ libraryManagerMap: {} }))
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => '[]'),
  writeFileSync: jest.fn(),
  cpSync: jest.fn()
}))

import NileLibraryManager from '../library'
import { NileUser } from '../user'

// The backend jest config sets resetMocks, so implementations have to be
// (re)installed inside beforeEach rather than at jest.mock() time
const mockedIsLoggedIn = jest.mocked(NileUser.isLoggedIn)

describe('NileLibraryManager.init', () => {
  let manager: NileLibraryManager

  beforeEach(() => {
    manager = new NileLibraryManager()
    // isLoggedIn returns the user data, not a boolean; only truthiness matters here
    mockedIsLoggedIn.mockReturnValue({} as never)
  })

  test('does not sync with Amazon, only loads what is on disk', async () => {
    // The backend used to call refresh() here while the frontend also fired
    // "Refreshing all Library", so every startup ran `nile library sync` twice
    const refresh = jest.spyOn(manager, 'refresh')
    const refreshInstalled = jest.spyOn(manager, 'refreshInstalled')
    const loadGamesInAccount = jest.spyOn(manager, 'loadGamesInAccount')

    await manager.init()

    expect(refresh).not.toHaveBeenCalled()
    expect(refreshInstalled).toHaveBeenCalled()
    expect(loadGamesInAccount).toHaveBeenCalled()
  })
})

describe('NileLibraryManager.refresh', () => {
  let manager: NileLibraryManager

  beforeEach(() => {
    manager = new NileLibraryManager()
    // isLoggedIn returns the user data, not a boolean; only truthiness matters here
    mockedIsLoggedIn.mockReturnValue({} as never)
  })

  test('waits for the Amazon sync before rebuilding from disk', async () => {
    // refreshInstalled/loadGamesInAccount read the files the sync writes, so
    // reading them first would rebuild from the previous sync's data
    const order: string[] = []

    manager.runRunnerCommand = jest.fn().mockImplementation(async () => {
      order.push('sync-start')
      await new Promise((resolve) => setTimeout(resolve, 10))
      order.push('sync-done')
      return { stdout: '', stderr: '' }
    })
    jest
      .spyOn(manager, 'refreshInstalled')
      .mockImplementation(() => order.push('read-installed') as never)
    jest
      .spyOn(manager, 'loadGamesInAccount')
      .mockImplementation(() => order.push('read-library') as never)

    await manager.refresh()

    expect(order).toEqual([
      'sync-start',
      'sync-done',
      'read-installed',
      'read-library'
    ])
  })
})
