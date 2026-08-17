jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  symlinkSync: jest.fn(),
  unlinkSync: jest.fn()
}))

jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn()
}))

jest.mock('backend/constants/paths', () => ({
  relicMountPath: '/mount',
  relicGamesPath: '/games'
}))

jest.mock('../steam_shortcuts/steam_helpers', () => ({
  getSteamPath: jest.fn()
}))

jest.mock('../umu', () => ({
  getUmuStoreLabel: jest.fn(),
  searchUmuGameId: jest.fn(),
  launchUmu: jest.fn()
}))

jest.mock('../windowify', () => ({
  windowify: jest.fn(),
  EOS_OVERLAY_BAT: 'eos-overlay.bat'
}))

jest.mock('../steam_shortcuts/add_game', () => ({
  createGameSymlink: jest.fn()
}))

jest.mock('backend/config', () => ({
  GlobalConfig: {
    get: jest.fn(() => ({
      getSettings: jest.fn(() => ({ protonPath: '/usr/bin/proton' }))
    }))
  }
}))

import { existsSync, mkdirSync, rmSync, symlinkSync, unlinkSync } from 'fs'

const mockedExistsSync = jest.mocked(existsSync)
const mockedMkdirSync = jest.mocked(mkdirSync)
const mockedRmSync = jest.mocked(rmSync)
const mockedSymlinkSync = jest.mocked(symlinkSync)
const mockedUnlinkSync = jest.mocked(unlinkSync)

let getSteamPathMock: jest.Mock
let logError: jest.Mock
let windowify: jest.Mock
let createGameSymlink: jest.Mock

beforeEach(() => {
  jest.clearAllMocks()

  getSteamPathMock = jest.mocked(
    require('../steam_shortcuts/steam_helpers').getSteamPath
  )
  getSteamPathMock.mockReturnValue('/steam')

  logError = jest.mocked(require('backend/logger').logError)
  windowify = jest.mocked(require('../windowify').windowify)
  createGameSymlink = jest.mocked(
    require('../steam_shortcuts/add_game').createGameSymlink
  )
  createGameSymlink.mockReturnValue({ linkPath: '/games/zoom-link' })

  mockedExistsSync.mockReturnValue(false)
})

function freshPrefix() {
  let mod: typeof import('../prefix')
  jest.isolateModules(() => {
    mod = require('../prefix')
  })
  return mod!
}

describe('symlinkPrefix', () => {
  test('creates compatdata symlink when directory does not exist', () => {
    const { symlinkPrefix } = freshPrefix()

    const result = symlinkPrefix(123, '/games/test')

    expect(result).toBe(true)
    expect(mockedMkdirSync).toHaveBeenCalled()
    expect(mockedRmSync).not.toHaveBeenCalled()
    expect(mockedSymlinkSync).toHaveBeenCalledWith(
      '/games/test',
      '/steam/steamapps/compatdata/123'
    )
  })

  test('removes existing directory before creating symlink', () => {
    const { symlinkPrefix } = freshPrefix()
    mockedExistsSync.mockReturnValue(true)

    symlinkPrefix(789, '/games/existing')

    expect(mockedRmSync).toHaveBeenCalledWith(
      '/steam/steamapps/compatdata/789',
      { recursive: true, force: true }
    )
    expect(mockedSymlinkSync).toHaveBeenCalledWith(
      '/games/existing',
      '/steam/steamapps/compatdata/789'
    )
  })

  test('logs error but does not throw when symlink fails', () => {
    const { symlinkPrefix } = freshPrefix()

    mockedSymlinkSync.mockImplementation(() => {
      throw new Error('permission denied')
    })

    let result: boolean | undefined
    expect(() => {
      result = symlinkPrefix(123, '/games/broken')
    }).not.toThrow()
    expect(result).toBe(false)
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to symlink prefix'),
      'Relic'
    )
  })
})

describe('removePrefixSymlink', () => {
  test('removes compatdata symlink when it exists', () => {
    const { removePrefixSymlink } = freshPrefix()
    mockedExistsSync.mockReturnValue(true)

    removePrefixSymlink(456)

    expect(mockedUnlinkSync).toHaveBeenCalledWith(
      '/steam/steamapps/compatdata/456'
    )
  })

  test('does nothing when symlink does not exist', () => {
    const { removePrefixSymlink } = freshPrefix()

    removePrefixSymlink(999)

    expect(mockedUnlinkSync).not.toHaveBeenCalled()
  })

  test('logs error but does not throw on failure', () => {
    const { removePrefixSymlink } = freshPrefix()

    mockedExistsSync.mockReturnValue(true)
    mockedUnlinkSync.mockImplementation(() => {
      throw new Error('permission denied')
    })

    expect(() => removePrefixSymlink(123)).not.toThrow()
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to remove prefix symlink'),
      'Relic'
    )
  })
})

describe('preparePrefix', () => {
  test('zoom: symlinks the prefix to the relic game symlink, not the raw install path', async () => {
    const { preparePrefix } = freshPrefix()
    createGameSymlink = jest.mocked(
      require('../steam_shortcuts/add_game').createGameSymlink
    )
    createGameSymlink.mockReturnValue({ linkPath: '/games/zoom' })

    await preparePrefix(
      { title: 'ZoomGame', app_name: 'zoom_app', runner: 'zoom' } as never,
      123,
      '/mnt/disk2/ZoomGame'
    )

    expect(createGameSymlink).toHaveBeenCalledWith('/mnt/disk2/ZoomGame')
    expect(mockedMkdirSync).toHaveBeenCalled()
    expect(mockedSymlinkSync).toHaveBeenCalledWith(
      '/games/zoom',
      '/steam/steamapps/compatdata/123'
    )
  })

  test('zoom: does not symlink the prefix when the game symlink fails', async () => {
    const { preparePrefix } = freshPrefix()
    createGameSymlink = jest.mocked(
      require('../steam_shortcuts/add_game').createGameSymlink
    )
    createGameSymlink.mockReturnValue({ error: 'permission denied' })

    await preparePrefix(
      { title: 'ZoomGame', app_name: 'zoom_app', runner: 'zoom' } as never,
      123,
      '/mnt/disk2/ZoomGame'
    )

    expect(mockedSymlinkSync).not.toHaveBeenCalled()
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to prepare Zoom prefix'),
      'Relic'
    )
  })

  test('calls windowify for non-zoom games', async () => {
    const { preparePrefix } = freshPrefix()

    await preparePrefix(
      { title: 'LegGame', app_name: 'leg_app', runner: 'legendary' } as never,
      456,
      '/games/leg'
    )

    expect(windowify).toHaveBeenCalled()
  })
})

const PREFIX_EXIT_RESULT = {
  success: false,
  error: 'umu-run exited with code 1: WARNING: Executable not found: exit'
}

describe('EOS Overlay setup', () => {
  let launchUmu: jest.Mock
  let logWarning: jest.Mock

  beforeEach(() => {
    const umu = require('../umu')
    jest.mocked(umu.getUmuStoreLabel).mockReturnValue('egs')
    jest.mocked(umu.searchUmuGameId).mockResolvedValue('12345')
    launchUmu = jest.mocked(umu.launchUmu)
    // What umu really returns: the prefix call runs `exit`, which is not an
    // executable, so it always comes back non-zero. The overlay call that
    // follows runs a real script and can succeed.
    launchUmu.mockResolvedValue({ success: true })
    launchUmu.mockResolvedValueOnce(PREFIX_EXIT_RESULT)

    logWarning = jest.mocked(require('backend/logger').logWarning)

    // the overlay script is in place
    mockedExistsSync.mockReturnValue(true)
  })

  async function prepare(runner: string) {
    const { preparePrefix } = freshPrefix()
    await preparePrefix(
      { title: 'Game', app_name: 'app', runner } as never,
      777,
      '/games/game'
    )
  }

  test('legendary: runs the overlay script through umu after creating the prefix', async () => {
    await prepare('legendary')

    expect(launchUmu).toHaveBeenCalledTimes(2)
    // first call creates the prefix, second one sets up the overlay
    expect(launchUmu).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ executable: 'exit' })
    )
    expect(launchUmu).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        executable: '/mount/eos-overlay.bat',
        winePrefix: '/steam/steamapps/compatdata/777',
        gameId: '12345',
        store: 'egs'
      })
    )
  })

  test.each(['gog', 'nile'])(
    '%s: does not run the overlay script, it is Epic-only',
    async (runner) => {
      await prepare(runner)

      expect(launchUmu).toHaveBeenCalledTimes(1)
      expect(launchUmu).toHaveBeenCalledWith(
        expect.objectContaining({ executable: 'exit' })
      )
    }
  )

  test('skips the overlay when the script is missing', async () => {
    mockedExistsSync.mockReturnValue(false)

    await prepare('legendary')

    expect(launchUmu).toHaveBeenCalledTimes(1)
    expect(logWarning).toHaveBeenCalledWith(
      expect.stringContaining('EOS Overlay script not found'),
      'Relic'
    )
  })

  // Regression guard: `exit` is not a real executable, so the prefix call
  // ALWAYS comes back with a non-zero code even on success. Gating the overlay
  // on that code kills it on every single install.
  test('runs the overlay even though the prefix call reports failure, which it always does', async () => {
    await prepare('legendary')

    expect(launchUmu).toHaveBeenCalledTimes(2)
    expect(launchUmu).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ executable: '/mount/eos-overlay.bat' })
    )
  })

  test('a failing overlay is logged but does not throw, the game still reaches Steam', async () => {
    // queued after the prefix call, so this is the overlay run
    launchUmu.mockResolvedValueOnce({
      success: false,
      error: 'legendary.exe missing'
    })

    await expect(prepare('legendary')).resolves.toBeUndefined()

    expect(logWarning).toHaveBeenCalledWith(
      expect.stringContaining('EOS Overlay setup failed'),
      'Relic'
    )
  })
})
