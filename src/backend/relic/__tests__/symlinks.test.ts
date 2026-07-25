import { existsSync, unlinkSync } from 'graceful-fs'
import { symlinkSync } from 'graceful-fs'
import { createRelicSymlinks } from '../windowify'

jest.mock('../steam_shortcuts/add_game', () => ({
  createGameSymlink: jest.fn()
}))

jest.mock('graceful-fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
  symlinkSync: jest.fn()
}))

jest.mock('backend/storeManagers/legendary/constants', () => ({
  legendaryConfigPath: '/mock/legendary',
  legendaryInstalled: '/mock/legendary/installed.json',
  legendaryMetadata: '/mock/legendary/metadata',
  legendaryUserInfo: '/mock/legendary/user.json',
  thirdPartyInstalled: '/mock/legendary/third-party-installed.json',
  epicRedistPath: '/mock/redist/legendary'
}))

jest.mock('backend/storeManagers/nile/constants', () => ({
  nileConfigPath: '/mock/nile',
  nileInstalled: '/mock/nile/installed.json',
  nileLibrary: '/mock/nile/library.json',
  nileUserData: '/mock/nile/current_user.json'
}))

jest.mock('backend/storeManagers/gog/constants', () => ({
  gogdlConfigPath: '/mock/gogdl',
  gogSupportPath: '/mock/gogdl/gog-support',
  gogRedistPath: '/mock/redist/gog',
  gogdlAuthConfig: '/mock/gog/auth.json'
}))

jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn()
}))

jest.mock('backend/constants/environment', () => ({
  isSnap: false,
  isLinux: true,
  isWindows: false,
  isMac: false,
  isFlatpak: false
}))

jest.mock('backend/constants/paths', () => ({
  appFolder: '/mock/relic',
  userDataPath: '/mock/userdata',
  toolsPath: '/mock/tools',
  relicMountPath: '/mock/mount',
  relicInstallPath: '/mock/games',
  relicGamesPath: '/mock/games',
  relicRunnerPath: '/mock/runner',
  configPath: '/mock/config.json',
  gamesConfigPath: '/mock/gamesconfig',
  relicIconFolder: '/mock/icons',
  fixesPath: '/mock/fixes',
  publicDir: '/mock/public',
  fakeEpicExePath: '/mock/epic.exe',
  galaxyCommunicationExePath: '/mock/galaxy.exe',
  webviewPreloadPath: '/mock/webview.js',
  windowIcon: '/mock/icon.png',
  fixAsarPath: (s: string): string => s,
  userHome: '/home/user'
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
