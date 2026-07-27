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
  windowify: jest.fn()
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

beforeEach(() => {
  jest.clearAllMocks()

  getSteamPathMock = jest.mocked(
    require('../steam_shortcuts/steam_helpers').getSteamPath
  )
  getSteamPathMock.mockReturnValue('/steam')

  logError = jest.mocked(require('backend/logger').logError)
  windowify = jest.mocked(require('../windowify').windowify)

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

    symlinkPrefix(123, '/games/test')

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

    expect(() => symlinkPrefix(123, '/games/broken')).not.toThrow()
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
  test('calls symlinkPrefix for zoom games', async () => {
    const { preparePrefix } = freshPrefix()

    await preparePrefix(
      { title: 'ZoomGame', app_name: 'zoom_app', runner: 'zoom' } as never,
      123,
      '/games/zoom'
    )

    expect(mockedMkdirSync).toHaveBeenCalled()
    expect(mockedSymlinkSync).toHaveBeenCalledWith(
      '/games/zoom',
      '/steam/steamapps/compatdata/123'
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
