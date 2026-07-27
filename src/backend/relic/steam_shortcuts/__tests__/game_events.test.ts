import {
  onGameInstalled,
  onGameUninstalled,
  onGameImported,
  onGameMoved
} from '../../game_events'
import { existsSync, unlinkSync, mkdirSync, symlinkSync } from 'fs'
import {
  addGameToSteam,
  createRunnerFile,
  createGameSymlink
} from '../add_game'
import { deleteGrids } from '../../steamgrid'
import { preparePrefix, removePrefixSymlink } from '../../prefix'
import { libraryManagerMap } from 'backend/storeManagers'
import * as store from '../store'

const mockGetGameInfo = jest.fn()
const mockGame = { getGameInfo: mockGetGameInfo }

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
  mkdirSync: jest.fn(),
  symlinkSync: jest.fn(),
  writeFileSync: jest.fn()
}))
jest.mock('fs-extra', () => ({
  readFileSync: jest.fn()
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
    zoom: {}
  }
}))

jest.mock('backend/constants/paths', () => ({
  relicGamesPath: '/home/user/.local/share/relic/games'
}))

jest.mock('../add_game', () => ({
  addGameToSteam: jest.fn(),
  createRunnerFile: jest.fn(),
  createGameSymlink: jest.fn()
}))

jest.mock('../store', () => ({
  findShortcut: jest.fn(),
  addShortcut: jest.fn(),
  removeShortcut: jest.fn()
}))

jest.mock('../../steamgrid', () => ({
  downloadGrids: jest.fn(),
  deleteGrids: jest.fn()
}))

jest.mock('../../prefix', () => ({
  preparePrefix: jest.fn(),
  removePrefixSymlink: jest.fn()
}))

jest.mock('electron', () => ({
  shell: { openExternal: jest.fn() }
}))

const mockedAddGameToSteam = jest.mocked(addGameToSteam)
const mockedCreateRunnerFile = jest.mocked(createRunnerFile)
const mockedCreateGameSymlink = jest.mocked(createGameSymlink)
const mockedExistsSync = jest.mocked(existsSync)
const mockedUnlinkSync = jest.mocked(unlinkSync)
const mockedMkdirSync = jest.mocked(mkdirSync)
const mockedSymlinkSync = jest.mocked(symlinkSync)
const mockedDeleteGrids = jest.mocked(deleteGrids)
const mockedPreparePrefix = jest.mocked(preparePrefix)
const mockedRemovePrefixSymlink = jest.mocked(removePrefixSymlink)
const mockedFindShortcut = jest.mocked(store.findShortcut)
const mockedAddShortcut = jest.mocked(store.addShortcut)
const mockedRemoveShortcut = jest.mocked(store.removeShortcut)

beforeEach(() => {
  jest.clearAllMocks()
  mockedCreateRunnerFile.mockReturnValue({ path: '/path/to/TestGame.bat' })
})

describe('onGameInstalled', () => {
  test('skips if game is already tracked in store', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'TestGame',
      app_name: 'test_app',
      runner: 'gog',
      install: { install_path: '/games/test' }
    })

    mockedFindShortcut.mockReturnValue({
      gameName: 'TestGame',
      appId: 'test_app',
      store: 'gog',
      steamAppId: 123,
      execPath: '/games/test/TestGame.bat',
      installPath: '/games/test'
    })

    const result = await onGameInstalled(mockGame as never, '/custom/path')

    expect(mockedAddGameToSteam).not.toHaveBeenCalled()
    expect(mockedCreateRunnerFile).not.toHaveBeenCalled()
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

    expect(mockedCreateRunnerFile).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'TestGame',
        app_name: 'test_app',
        runner: 'gog'
      }),
      '/custom/path'
    )
    expect(mockedAddGameToSteam).toHaveBeenCalledWith({
      gameName: 'TestGame',
      runnerPath: '/path/to/TestGame.bat'
    })
    expect(mockedAddShortcut).toHaveBeenCalledWith(
      'TestGame',
      'test_app',
      'gog',
      123,
      '/custom/path',
      '/path/to/TestGame.bat'
    )
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
    expect(mockedCreateRunnerFile).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'TestGame',
        app_name: 'test_app',
        runner: 'legendary'
      }),
      '/games/test'
    )
    expect(mockedAddGameToSteam).toHaveBeenCalledWith({
      gameName: 'TestGame',
      runnerPath: '/path/to/TestGame.bat'
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
    expect(mockedCreateRunnerFile).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'TestGame',
        app_name: 'test_app',
        runner: 'legendary'
      }),
      '/stale/path'
    )
    expect(mockedAddGameToSteam).toHaveBeenCalledWith({
      gameName: 'TestGame',
      runnerPath: '/path/to/TestGame.bat'
    })
    expect(result.success).toBe(true)
  })

  test('installs linux native game with symlink and start.sh', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'NativeGame',
      app_name: 'native_app',
      runner: 'legendary',
      is_linux_native: true,
      install: { install_path: '/games/native' }
    })

    mockedFindShortcut.mockReturnValue(undefined)
    mockedCreateGameSymlink.mockReturnValue({ linkPath: '/link/native' })
    mockedExistsSync.mockReturnValue(true)
    mockedAddGameToSteam.mockResolvedValueOnce({
      success: true,
      steamAppId: 111
    })

    const result = await onGameInstalled(mockGame as never, '/games/native')

    expect(mockedCreateGameSymlink).toHaveBeenCalledWith('/games/native')
    expect(mockedAddGameToSteam).toHaveBeenCalledWith({
      gameName: 'NativeGame',
      runnerPath: '/link/native/start.sh'
    })
    expect(mockedAddShortcut).toHaveBeenCalledWith(
      'NativeGame',
      'native_app',
      'legendary',
      111,
      '/games/native',
      '/link/native/start.sh'
    )
    expect(result.success).toBe(true)
  })

  test('linux native fails when createGameSymlink returns error', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'NativeGame',
      app_name: 'native_app',
      runner: 'legendary',
      is_linux_native: true,
      install: { install_path: '/games/native' }
    })

    mockedFindShortcut.mockReturnValue(undefined)
    mockedCreateGameSymlink.mockReturnValue({ error: 'symlink failed' })

    const result = await onGameInstalled(mockGame as never, '/games/native')

    expect(result.success).toBe(false)
    expect(result.error).toBe('symlink failed')
    expect(mockedAddGameToSteam).not.toHaveBeenCalled()
  })

  test('returns error when no install path available', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'NoPathGame',
      app_name: 'nopath',
      runner: 'legendary',
      install: { install_path: '' }
    })

    mockedFindShortcut.mockReturnValue(undefined)

    const result = await onGameInstalled(mockGame as never)

    expect(result.success).toBe(false)
    expect(result.error).toContain('No install path')
    expect(mockedAddGameToSteam).not.toHaveBeenCalled()
  })

  test('returns error when createRunnerFile fails', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'BadRunnerGame',
      app_name: 'bad_runner',
      runner: 'zoom',
      install: { install_path: '/games/zoom' }
    })

    mockedFindShortcut.mockReturnValue(undefined)
    mockedCreateRunnerFile.mockReturnValue({ error: 'unsupported runner' })

    const result = await onGameInstalled(mockGame as never, '/games/zoom')

    expect(result.success).toBe(false)
    expect(result.error).toBe('unsupported runner')
    expect(mockedAddGameToSteam).not.toHaveBeenCalled()
  })

  test('calls preparePrefix for non-linux-native games', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'WindowsGame',
      app_name: 'windows_app',
      runner: 'legendary',
      install: { install_path: '/games/windows' }
    })

    mockedFindShortcut.mockReturnValue(undefined)
    mockedAddGameToSteam.mockResolvedValueOnce({
      success: true,
      steamAppId: 555
    })

    await onGameInstalled(mockGame as never, '/games/windows')

    expect(mockedPreparePrefix).toHaveBeenCalledWith(
      expect.objectContaining({ app_name: 'windows_app' }),
      555,
      '/games/windows'
    )
  })
})

describe('onGameUninstalled', () => {
  test('deletes bat file and removes from store', async () => {
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

    await onGameUninstalled(mockGame as never)

    expect(mockedExistsSync).toHaveBeenCalledWith('/path/to/TestGame.bat')
    expect(mockedUnlinkSync).toHaveBeenCalledWith('/path/to/TestGame.bat')
    expect(mockedDeleteGrids).toHaveBeenCalledWith(12345)
    expect(mockedRemoveShortcut).toHaveBeenCalledWith('test_app')
  })

  test('does nothing when game is not tracked', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'UntrackedGame',
      app_name: 'untracked',
      runner: 'legendary'
    })

    mockedFindShortcut.mockReturnValue(undefined)

    await onGameUninstalled(mockGame as never)

    expect(mockedDeleteGrids).not.toHaveBeenCalled()
    expect(mockedRemoveShortcut).toHaveBeenCalledWith('untracked')
  })

  test('zoom games remove prefix symlink instead of bat file', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'ZoomGame',
      app_name: 'zoom_app',
      runner: 'zoom'
    })

    mockedFindShortcut.mockReturnValue({
      gameName: 'ZoomGame',
      appId: 'zoom_app',
      store: 'zoom',
      steamAppId: 999,
      execPath: '/games/zoom/start.sh',
      installPath: '/games/zoom'
    })

    await onGameUninstalled(mockGame as never)

    expect(mockedRemovePrefixSymlink).toHaveBeenCalledWith(999)
    expect(mockedDeleteGrids).toHaveBeenCalledWith(999)
    expect(mockedRemoveShortcut).toHaveBeenCalledWith('zoom_app')
  })

  test('deletes game symlink from games dir on uninstall', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'LegendaryGame',
      app_name: 'leg_app',
      runner: 'legendary'
    })

    mockedFindShortcut.mockReturnValue({
      gameName: 'LegendaryGame',
      appId: 'leg_app',
      store: 'legendary',
      steamAppId: 777,
      execPath: '/path/to/LegendaryGame.bat',
      installPath: '/games/legendary'
    })
    mockedExistsSync.mockReturnValue(true)

    await onGameUninstalled(mockGame as never)

    expect(mockedUnlinkSync).toHaveBeenCalledWith('/path/to/LegendaryGame.bat')
    expect(mockedUnlinkSync).toHaveBeenCalledWith(
      '/home/user/.local/share/relic/games/legendary'
    )
  })
})

describe('onGameImported', () => {
  test('delegates to onGameInstalled', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'ImportedGame',
      app_name: 'imported_app',
      runner: 'legendary',
      install: { install_path: '/games/imported' }
    })

    mockedFindShortcut.mockReturnValue(undefined)
    mockedAddGameToSteam.mockResolvedValueOnce({
      success: true,
      steamAppId: 789
    })

    await onGameImported(mockGame as never)

    expect(mockedCreateRunnerFile).toHaveBeenCalled()
    expect(mockedAddGameToSteam).toHaveBeenCalledWith({
      gameName: 'ImportedGame',
      runnerPath: '/path/to/TestGame.bat'
    })
    expect(mockedAddShortcut).toHaveBeenCalledWith(
      'ImportedGame',
      'imported_app',
      'legendary',
      789,
      '/games/imported',
      '/path/to/TestGame.bat'
    )
  })
})

describe('onGameMoved', () => {
  test('moves symlink and updates shortcut', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'MovedGame',
      app_name: 'moved_app',
      runner: 'gog',
      install: { install_path: '/games/old' }
    })

    mockedFindShortcut.mockReturnValue({
      gameName: 'MovedGame',
      appId: 'moved_app',
      store: 'gog',
      steamAppId: 123,
      execPath: '/games/old/MovedGame.bat',
      installPath: '/games/old'
    })

    await onGameMoved(mockGame as never, '/games/new')

    expect(mockedUnlinkSync).toHaveBeenCalledWith(
      expect.stringContaining('relic/games/old')
    )
    expect(mockedMkdirSync).toHaveBeenCalled()
    expect(mockedSymlinkSync).toHaveBeenCalledWith(
      '/games/new',
      expect.stringContaining('relic/games/new')
    )
    expect(mockedAddShortcut).toHaveBeenCalledWith(
      'MovedGame',
      'moved_app',
      'gog',
      123,
      '/games/new',
      '/games/old/MovedGame.bat'
    )
  })

  test('skips when game is not tracked', async () => {
    mockGetGameInfo.mockReturnValue({
      title: 'UntrackedGame',
      app_name: 'untracked',
      runner: 'gog',
      install: { install_path: '/games/old' }
    })

    mockedFindShortcut.mockReturnValue(undefined)

    await onGameMoved(mockGame as never, '/games/new')

    expect(mockedUnlinkSync).not.toHaveBeenCalled()
    expect(mockedSymlinkSync).not.toHaveBeenCalled()
    expect(mockedAddShortcut).not.toHaveBeenCalled()
  })
})
