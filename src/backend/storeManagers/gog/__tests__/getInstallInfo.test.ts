import GOGLibraryManager from '../library'

jest.mock('backend/logger', () => ({
  logDebug: jest.fn(),
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Gog: 'Gog' }
}))

jest.mock('backend/online_monitor', () => ({
  isOnline: true,
  runOnceWhenOnline: jest.fn()
}))

jest.mock('graceful-fs')

jest.mock('../electronStores', () => ({
  libraryStore: { get: jest.fn(), set: jest.fn() },
  installedGamesStore: { get: jest.fn(), set: jest.fn() },
  installInfoStore: { get: jest.fn(), set: jest.fn(), has: jest.fn() },
  apiInfoCache: { get: jest.fn(), set: jest.fn() },
  privateBranchesStore: { get: () => '' },
  playtimeSyncQueue: { get: jest.fn(), set: jest.fn() }
}))

jest.mock('../../../launcher')
jest.mock('../../../utils', () => ({
  getGOGdlBin: jest.fn().mockReturnValue({ dir: '/tmp', bin: 'gogdl' }),
  getFileSize: jest.fn().mockReturnValue(0),
  axiosClient: jest.fn()
}))
jest.mock('../../../../common/types/game_manager')
jest.mock('fs-extra')
jest.mock('node:zlib')
jest.mock('node:fs/promises')
jest.mock('node:fs', () => ({
  readdirSync: jest.fn().mockReturnValue([]),
  rmSync: jest.fn(),
  writeFileSync: jest.fn()
}))
jest.mock('fs/promises')
jest.mock('backend/constants/paths')
jest.mock('i18next', () => ({
  languages: ['en'],
  t: (key: string) => key
}))
jest.mock('../redist', () => ({ checkForRedistUpdates: jest.fn() }))
jest.mock('../constants', () => ({
  gogdlConfigPath: '/tmp/gogdl_config'
}))
jest.mock('../user', () => ({
  GOGUser: {
    getCredentials: () => Promise.resolve({
      access_token: 'test-token',
      refresh_token: 'test-refresh'
    })
  }
}))
jest.mock('../games')
jest.mock('../../index', () => ({ libraryManagerMap: {} }))

import { libraryStore, installInfoStore } from '../electronStores'
const mockedLibraryStore = jest.mocked(libraryStore)
const mockedInstallInfoStore = jest.mocked(installInfoStore)

describe('GOGLibraryManager.getInstallInfo', () => {
  let manager: GOGLibraryManager

  beforeEach(() => {
    jest.clearAllMocks()
    manager = new GOGLibraryManager()

    const mockGameInfo = { title: 'Test Game', app_name: 'test-game' }
    manager.getGameInfo = jest.fn().mockReturnValue(mockGameInfo)

    mockedLibraryStore.get.mockImplementation((key: string, def?: any) => {
      if (key === 'games') return [mockGameInfo]
      return def
    })
    mockedInstallInfoStore.has.mockReturnValue(false)

    manager.runRunnerCommand = jest.fn().mockResolvedValue({
      stdout: '',
      stderr: '',
      error: undefined,
      abort: false
    })
  })

  it('should return undefined when stdout is empty', async () => {
    const result = await manager.getInstallInfo('test-game', 'windows')
    expect(result).toBeUndefined()
    expect(manager.runRunnerCommand).toHaveBeenCalledTimes(1)
  })

  it('should return install info when stdout has valid JSON', async () => {
    const validInfo = {
      size: { '*': { download_size: 3000, disk_size: 5000 } },
      download_size: 3000,
      disk_size: 5000,
      languages: ['en'],
      dlcs: [],
      buildId: '',
      os: 'windows',
      branch: null,
      dependencies: [],
      versionName: '',
      versionEtag: '',
      folder_name: '',
      available_branches: [],
      builds: { items: [], total_count: 0, count: 0, has_private_branches: false }
    }
    manager.runRunnerCommand = jest.fn().mockResolvedValue({
      stdout: JSON.stringify(validInfo),
      stderr: '',
      error: undefined,
      abort: false
    })

    const result = await manager.getInstallInfo('test-game', 'windows')
    expect(result).toBeDefined()
    expect(result?.manifest.download_size).toBe(3000)
  })
})
