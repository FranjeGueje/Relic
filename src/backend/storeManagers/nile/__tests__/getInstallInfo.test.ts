import NileLibraryManager from '../library'

jest.mock('backend/logger', () => ({
  logDebug: jest.fn(),
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Nile: 'Nile' }
}))

jest.mock('graceful-fs')
jest.mock('backend/online_monitor')

jest.mock('../electronStores', () => ({
  installStore: { get: jest.fn(), set: jest.fn() },
  libraryStore: { get: jest.fn(), set: jest.fn() }
}))

jest.mock('../e2eMock')
jest.mock('backend/utils')
jest.mock('backend/launcher')
jest.mock('fs-extra')
jest.mock('electron')

jest.mock('../..', () => ({}))

jest.mock('../constants', () => ({
  nileConfigPath: '/tmp/nile_config',
  nileInstalled: '/tmp/installed.json',
  nileLibrary: '/tmp/library.json'
}))

describe('NileLibraryManager.getInstallInfo', () => {
  let manager: NileLibraryManager

  beforeEach(() => {
    jest.clearAllMocks()
    manager = new NileLibraryManager()
    ;(manager as any).library = new Map([
      ['test-game', { app_name: 'test-game', title: 'Test Game' }]
    ])
    ;(manager as any).installedGames = new Map()
    manager.runRunnerCommand = jest.fn().mockResolvedValue({
      stdout: '',
      stderr: 'ERROR [AUTH_MANAGER]: Failed to refresh token',
      error: undefined,
      abort: false
    })
  })

  it('should throw when stdout is empty', async () => {
    await expect(manager.getInstallInfo('test-game')).rejects.toThrow(
      'Empty response from nile for test-game'
    )

    expect(manager.runRunnerCommand).toHaveBeenCalledTimes(1)
  })

  it('should return install info when stdout has valid JSON', async () => {
    const validResponse = {
      stdout: JSON.stringify({ download_size: 5000 }),
      stderr: '',
      error: undefined,
      abort: false
    }
    manager.runRunnerCommand = jest.fn().mockResolvedValue(validResponse)

    const result = await manager.getInstallInfo('test-game')
    expect(result).toBeDefined()
    expect(result.manifest.download_size).toBe(5000)
  })
})
