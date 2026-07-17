import LegendaryLibraryManager from '../library'

jest.mock('backend/logger', () => ({
  logDebug: jest.fn(),
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Legendary: 'Legendary' }
}))

jest.mock('graceful-fs')
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

describe('LegendaryLibraryManager.getInstallInfo', () => {
  let manager: LegendaryLibraryManager

  beforeEach(() => {
    jest.clearAllMocks()
    manager = new LegendaryLibraryManager()

    const { installStore } = require('../electronStores')
    installStore.get.mockReturnValue(undefined)

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
})
