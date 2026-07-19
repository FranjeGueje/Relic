import { onGameInstalled, onGameUninstalled, onGameImported, onGameMoved } from '../../game_events'
import { existsSync, unlinkSync } from 'graceful-fs'
import { addGameToSteam, createRelicBat } from '../add_game'
import { removeNonSteamGame } from 'backend/shortcuts/nonesteamgame/nonesteamgame'
import { libraryManagerMap } from 'backend/storeManagers'
import * as store from '../store'

const mockGetGameInfo = jest.fn()
const mockGame = { getGameInfo: mockGetGameInfo }

jest.mock('graceful-fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  symlinkSync: jest.fn()
}))
jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn()
}))

jest.mock('backend/storeManagers', () => ({
  libraryManagerMap: {
    legendary: { getGameInfo: jest.fn() },
    gog: { getGameInfo: jest.fn() },
    nile: { getGameInfo: jest.fn() },
    sideload: {},
    zoom: {}
  }
}))

jest.mock('../add_game', () => ({
  addGameToSteam: jest.fn(),
  createRelicBat: jest.fn()
}))

jest.mock('../store', () => ({
  findShortcut: jest.fn(),
  addShortcut: jest.fn(),
  removeShortcut: jest.fn()
}))

jest.mock('backend/shortcuts/nonesteamgame/nonesteamgame', () => ({
  removeNonSteamGame: jest.fn()
}))

const mockedAddGameToSteam = jest.mocked(addGameToSteam)
const mockedCreateRelicBat = jest.mocked(createRelicBat)
const mockedExistsSync = jest.mocked(existsSync)
const mockedUnlinkSync = jest.mocked(unlinkSync)
const mockedRemoveNonSteamGame = jest.mocked(removeNonSteamGame)
const mockedFindShortcut = jest.mocked(store.findShortcut)
const mockedAddShortcut = jest.mocked(store.addShortcut)
const mockedRemoveShortcut = jest.mocked(store.removeShortcut)

beforeEach(() => {
  jest.clearAllMocks()
  mockedCreateRelicBat.mockReturnValue('/path/to/TestGame.bat')
})

describe('onGameInstalled', () => {
  test('skips if game is already tracked in store', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'TestGame',
      app_name: 'test_app',
      runner: 'gog',
      install: { install_path: '/games/test' }
    })

    mockedFindShortcut.mockReturnValue({ gameName: 'TestGame', appId: 'test_app', store: 'gog', steamAppId: 123, execPath: '/games/test/TestGame.bat', installPath: '/games/test' })

    const result = await onGameInstalled(mockGame as never, '/custom/path')

    expect(mockedAddGameToSteam).not.toHaveBeenCalled()
    expect(mockedCreateRelicBat).not.toHaveBeenCalled()
    expect(result.success).toBe(true)
    expect(result.steamAppId).toBe(123)
  })

  test('calls addGameToSteam and saves to store', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'TestGame',
      app_name: 'test_app',
      runner: 'gog',
      install: { install_path: '/games/test' }
    })

    mockedFindShortcut.mockReturnValue(undefined)
    mockedAddGameToSteam.mockResolvedValueOnce({
      success: true,
      steamAppId: 123
    })

    const result = await onGameInstalled(mockGame as never, '/custom/path')

    expect(mockedCreateRelicBat).toHaveBeenCalledWith(
      '/custom/path',
      'TestGame',
      'gog',
      'test_app'
    )
    expect(mockedAddGameToSteam).toHaveBeenCalledWith({
      gameName: 'TestGame'
    })
    expect(mockedAddShortcut).toHaveBeenCalledWith('TestGame', 'test_app', 'gog', 123, '/custom/path', '/path/to/TestGame.bat')
    expect(result.success).toBe(true)
  })

  test('does not save to store when addGameToSteam fails', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'TestGame',
      app_name: 'test_app',
      runner: 'gog',
      install: { install_path: '/games/test' }
    })

    mockedFindShortcut.mockReturnValue(undefined)
    mockedAddGameToSteam.mockResolvedValueOnce({
      success: false,
      error: 'something went wrong'
    })

    const result = await onGameInstalled(mockGame as never, '/custom/path')

    expect(mockedAddShortcut).not.toHaveBeenCalled()
    expect(result.success).toBe(false)
  })

  test('uses forceReload to get fresh install_path', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'TestGame',
      app_name: 'test_app',
      runner: 'legendary',
      install: { install_path: '' }
    })

    mockedFindShortcut.mockReturnValue(undefined)

    const getGameInfoMock = (libraryManagerMap['legendary'] as any).getGameInfo
    getGameInfoMock.mockReturnValue({
      title: 'TestGame',
      app_name: 'test_app',
      runner: 'legendary',
      install: { install_path: '/games/test' }
    })

    mockedAddGameToSteam.mockResolvedValueOnce({
      success: true,
      steamAppId: 456
    })

    const result = await onGameInstalled(mockGame as never)

    expect(getGameInfoMock).toHaveBeenCalledWith('test_app', true)
    expect(mockedCreateRelicBat).toHaveBeenCalledWith(
      '/games/test',
      'TestGame',
      'legendary',
      'test_app'
    )
    expect(mockedAddGameToSteam).toHaveBeenCalledWith({
      gameName: 'TestGame'
    })
    expect(result.success).toBe(true)
  })

  test('handles runner without getGameInfo gracefully', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'TestGame',
      app_name: 'test_app',
      runner: 'sideload',
      install: { install_path: '/sideload/game' }
    })

    mockedFindShortcut.mockReturnValue(undefined)
    mockedAddGameToSteam.mockResolvedValueOnce({
      success: true,
      steamAppId: 789
    })

    const result = await onGameInstalled(mockGame as never)

    expect(mockedCreateRelicBat).toHaveBeenCalledWith(
      '/sideload/game',
      'TestGame',
      'sideload',
      'test_app'
    )
    expect(mockedAddGameToSteam).toHaveBeenCalledWith({
      gameName: 'TestGame'
    })
    expect(result.success).toBe(true)
  })

  test('uses stale data when forceReload returns nothing', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'TestGame',
      app_name: 'test_app',
      runner: 'legendary',
      install: { install_path: '/stale/path' }
    })

    mockedFindShortcut.mockReturnValue(undefined)

    const getGameInfoMock = (libraryManagerMap['legendary'] as any).getGameInfo
    getGameInfoMock.mockReturnValue(undefined)

    mockedAddGameToSteam.mockResolvedValueOnce({
      success: true,
      steamAppId: 999
    })

    const result = await onGameInstalled(mockGame as never)

    expect(getGameInfoMock).toHaveBeenCalledWith('test_app', true)
    expect(mockedCreateRelicBat).toHaveBeenCalledWith(
      '/stale/path',
      'TestGame',
      'legendary',
      'test_app'
    )
    expect(mockedAddGameToSteam).toHaveBeenCalledWith({
      gameName: 'TestGame'
    })
    expect(result.success).toBe(true)
  })
})

describe('onGameUninstalled', () => {
  test('deletes bat file, removes from store and calls removeNonSteamGame', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'TestGame',
      app_name: 'test_app',
      runner: 'legendary'
    })

    mockedFindShortcut.mockReturnValue({
      gameName: 'TestGame',
      appId: 'test_app',
      store: 'legendary',
      steamAppId: 12345,
      execPath: '/path/to/TestGame.bat',
      installPath: '/some/game/path'
    })
    mockedExistsSync.mockReturnValue(true)
    mockedRemoveNonSteamGame.mockResolvedValueOnce(undefined)

    await onGameUninstalled(mockGame as never)

    expect(mockedExistsSync).toHaveBeenCalledWith('/path/to/TestGame.bat')
    expect(mockedUnlinkSync).toHaveBeenCalledWith('/path/to/TestGame.bat')
    expect(mockedRemoveShortcut).toHaveBeenCalledWith('test_app')
    expect(mockedRemoveNonSteamGame).toHaveBeenCalledWith(mockGame)
  })
})

describe('onGameImported', () => {
  test('logs that game was imported', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'ImportedGame',
      app_name: 'imported_app',
      runner: 'legendary',
      install: { install_path: '/games/imported' }
    })

    await onGameImported(mockGame as never)

    expect(require('backend/logger').logInfo).toHaveBeenCalledWith(
      'Game imported: "ImportedGame" (imported_app)',
      'Relic'
    )
  })
})

describe('onGameMoved', () => {
  test('logs that game was moved', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'MovedGame',
      app_name: 'moved_app',
      runner: 'gog',
      install: { install_path: '/games/old' }
    })

    await onGameMoved(mockGame as never, '/games/new')

    expect(require('backend/logger').logInfo).toHaveBeenCalledWith(
      'Game moved: "MovedGame" (moved_app) to /games/new',
      'Relic'
    )
  })
})