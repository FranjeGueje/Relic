import LegendaryLibraryManager from '../library'

jest.mock('backend/logger', () => ({
  logDebug: jest.fn(),
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Legendary: 'Legendary' }
}))

jest.mock('backend/online_monitor')
jest.mock('backend/schemas')
jest.mock('shlex')

jest.mock('../../../utils', () => ({
  isEpicServiceOffline: jest.fn().mockResolvedValue(false),
  getLegendaryBin: jest.fn().mockReturnValue({ dir: '/tmp', bin: 'legendary' }),
  formatEpicStoreUrl: jest.fn(),
  getFileSize: jest.fn()
}))

jest.mock('../electronStores', () => ({
  installStore: { get: jest.fn(), set: jest.fn() },
  libraryStore: { get: jest.fn(), set: jest.fn() }
}))

jest.mock('../user', () => ({ LegendaryUser: {} }))
jest.mock('../e2eMock')
jest.mock('../../../launcher')
jest.mock('../../index', () => ({}))

import { installStore } from '../electronStores'
const mockedInstallStore = jest.mocked(installStore)

describe('LegendaryLibraryManager.getInstallInfo', () => {
  let manager: LegendaryLibraryManager

  beforeEach(() => {
    jest.clearAllMocks()
    manager = new LegendaryLibraryManager()

    mockedInstallStore.get.mockReturnValue(undefined as any)

    manager.runRunnerCommand = jest.fn().mockResolvedValue({
      stdout: '',
      stderr: '',
      error: undefined,
      abort: false
    })
  })

  it('should retry 3 times when stdout is empty then throw', async () => {
    await expect(
      manager.getInstallInfo('test-game', 'Windows')
    ).rejects.toThrow(
      'Empty response from legendary for test-game after 3 retries.'
    )

    expect(manager.runRunnerCommand).toHaveBeenCalledTimes(4)
  })

  it('should succeed when stdout has valid JSON with manifest', async () => {
    const validResponse = {
      stdout: JSON.stringify({
        manifest: { download_size: 1000, disk_size: 2000 },
        game: { app_name: 'test-game', title: 'Test' }
      }),
      stderr: '',
      error: undefined,
      abort: false
    }
    manager.runRunnerCommand = jest.fn().mockResolvedValue(validResponse)

    const result = await manager.getInstallInfo('test-game', 'Windows')
    expect(result).toBeDefined()
    expect(result.manifest).toBeDefined()
  })

  it('should run legendary once for concurrent callers on the same game', async () => {
    // installStore is only written after the fetch finishes, so concurrent
    // callers used to both miss the cache and both spawn legendary
    const validResponse = {
      stdout: JSON.stringify({
        manifest: { download_size: 1000, disk_size: 2000 },
        game: { app_name: 'test-game', title: 'Test' }
      }),
      stderr: '',
      error: undefined,
      abort: false
    }
    manager.runRunnerCommand = jest.fn().mockResolvedValue(validResponse)

    const results = await Promise.all([
      manager.getInstallInfo('test-game', 'Windows'),
      manager.getInstallInfo('test-game', 'Windows'),
      manager.getInstallInfo('test-game', 'Windows')
    ])

    expect(manager.runRunnerCommand).toHaveBeenCalledTimes(1)
    results.forEach((result) => expect(result.manifest).toBeDefined())
  })

  it('should keep different games independent', async () => {
    const response = (appName: string) => ({
      stdout: JSON.stringify({
        manifest: { download_size: 1, disk_size: 2 },
        game: { app_name: appName, title: appName }
      }),
      stderr: '',
      error: undefined,
      abort: false
    })
    manager.runRunnerCommand = jest
      .fn()
      .mockImplementation((command: { appName: string }) =>
        Promise.resolve(response(command.appName))
      )

    await Promise.all([
      manager.getInstallInfo('game-a', 'Windows'),
      manager.getInstallInfo('game-b', 'Windows')
    ])

    expect(manager.runRunnerCommand).toHaveBeenCalledTimes(2)
  })
})
