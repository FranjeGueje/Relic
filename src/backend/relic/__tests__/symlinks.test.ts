import { existsSync, unlinkSync } from 'graceful-fs'
import { symlinkSync } from 'graceful-fs'
import { createRelicSymlinks } from '../symlinks'

jest.mock('graceful-fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
  symlinkSync: jest.fn()
}))

jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn()
}))

jest.mock('backend/constants/paths', () => ({
  relicMountPath: '/mock/mount',
  relicInstallPath: '/mock/games'
}))

const mockedExistsSync = jest.mocked(existsSync)
const mockedUnlinkSync = jest.mocked(unlinkSync)
const mockedSymlinkSync = jest.mocked(symlinkSync)

const LINKS_PATH = '/tmp/relic-links'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('createRelicSymlinks', () => {
  test('creates symlinks when no existing links present', () => {
    mockedExistsSync.mockReturnValue(false)

    createRelicSymlinks(LINKS_PATH)

    expect(mockedUnlinkSync).not.toHaveBeenCalled()
    expect(mockedSymlinkSync).toHaveBeenCalledTimes(2)
    expect(mockedSymlinkSync).toHaveBeenCalledWith('/mock/mount', `${LINKS_PATH}/relic`)
    expect(mockedSymlinkSync).toHaveBeenCalledWith('/mock/games', `${LINKS_PATH}/games`)
  })

  test('cleans up existing symlinks before creating new ones', () => {
    mockedExistsSync.mockReturnValue(true)

    createRelicSymlinks(LINKS_PATH)

    expect(mockedUnlinkSync).toHaveBeenCalledTimes(2)
    expect(mockedUnlinkSync).toHaveBeenCalledWith(`${LINKS_PATH}/relic`)
    expect(mockedUnlinkSync).toHaveBeenCalledWith(`${LINKS_PATH}/games`)
    expect(mockedSymlinkSync).toHaveBeenCalledTimes(2)
  })

  test('throws and logs error when symlink creation fails', () => {
    mockedExistsSync.mockReturnValue(false)
    mockedSymlinkSync.mockImplementation(() => {
      throw new Error('permission denied')
    })

    expect(() => createRelicSymlinks(LINKS_PATH)).toThrow('permission denied')

    const { logError } = require('backend/logger')
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create symlinks'),
      'Relic'
    )
  })
})
