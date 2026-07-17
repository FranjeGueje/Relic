import { onGameInstalled, onGameUninstalled } from '../../game_events'
import { addGameToSteam } from '../add_game'
import { removeNonSteamGame } from 'backend/shortcuts/nonesteamgame/nonesteamgame'
import { libraryManagerMap } from 'backend/storeManagers'
import * as store from '../store'

const mockGetGameInfo = jest.fn()
const mockGame = { getGameInfo: mockGetGameInfo }

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
  addGameToSteam: jest.fn()
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
const mockedRemoveNonSteamGame = jest.mocked(removeNonSteamGame)
const mockedFindShortcut = jest.mocked(store.findShortcut)
const mockedAddShortcut = jest.mocked(store.addShortcut)
const mockedRemoveShortcut = jest.mocked(store.removeShortcut)

beforeEach(() => {
  jest.clearAllMocks()
})

describe('onGameInstalled', () => {
  test('skips if game is already tracked in store', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'TestGame',
      app_name: 'test_app',
      runner: 'gog',
      install: { install_path: '/games/test' }
    })

    mockedFindShortcut.mockReturnValue({ appId: 'test_app', steamAppId: 123 })

    const result = await onGameInstalled(mockGame as never, '/custom/path')

    expect(mockedAddGameToSteam).not.toHaveBeenCalled()
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

    expect(mockedAddGameToSteam).toHaveBeenCalledWith({
      gameName: 'TestGame',
      installPath: '/custom/path'
    })
    expect(mockedAddShortcut).toHaveBeenCalledWith('test_app', 123)
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
    expect(mockedAddGameToSteam).toHaveBeenCalledWith({
      gameName: 'TestGame',
      installPath: '/games/test'
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

    expect(mockedAddGameToSteam).toHaveBeenCalledWith({
      gameName: 'TestGame',
      installPath: '/sideload/game'
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
    expect(mockedAddGameToSteam).toHaveBeenCalledWith({
      gameName: 'TestGame',
      installPath: '/stale/path'
    })
    expect(result.success).toBe(true)
  })
})

describe('onGameUninstalled', () => {
  test('removes from store and calls removeNonSteamGame', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'TestGame',
      app_name: 'test_app',
      runner: 'legendary'
    })

    mockedRemoveNonSteamGame.mockResolvedValueOnce(undefined)

    await onGameUninstalled(mockGame as never)

    expect(mockedRemoveShortcut).toHaveBeenCalledWith('test_app')
    expect(mockedRemoveNonSteamGame).toHaveBeenCalledWith(mockGame)
  })
})