jest.mock('backend/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Gog: 'Gog' }
}))
jest.mock('../electronStores', () => ({
  configStore: { get: jest.fn(), set: jest.fn(), clear: jest.fn() }
}))
jest.mock('../../../online_monitor', () => ({ isOnline: jest.fn(() => true) }))
jest.mock('../../index', () => ({
  libraryManagerMap: { gog: { runRunnerCommand: jest.fn() } }
}))
jest.mock('backend/utils', () => ({ clearCache: jest.fn() }))
jest.mock('backend/constants/others', () => ({ relicVersion: '0.0.0' }))
jest.mock('../constants', () => ({ gogdlAuthConfig: '/tmp/auth.json' }))
jest.mock('axios')

import { GOGUser } from '../user'
import { libraryManagerMap } from '../../index'
import { isOnline } from '../../../online_monitor'

const runRunnerCommand = jest.mocked(
  libraryManagerMap['gog'].runRunnerCommand as jest.Mock
)
const mockedIsOnline = jest.mocked(isOnline)

const credentials = {
  access_token: 'token',
  expires_in: 3600,
  token_type: 'bearer',
  scope: '',
  session_id: 'sid',
  refresh_token: 'refresh',
  user_id: 'uid',
  loginType: 1
}

function respondWithCredentials(overrides: Record<string, unknown> = {}) {
  runRunnerCommand.mockResolvedValue({
    stdout: JSON.stringify({ ...credentials, ...overrides })
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useRealTimers()
  mockedIsOnline.mockReturnValue(true)
  GOGUser.invalidateCredentialsCache()
  respondWithCredentials()
})

describe('GOGUser.getCredentials - in-flight sharing', () => {
  test('concurrent callers share a single gogdl run', async () => {
    // The startup burst hit gogdl several times within the same second
    let release: (value: { stdout: string }) => void = () => undefined
    runRunnerCommand.mockReturnValue(
      new Promise((resolve) => {
        release = resolve
      })
    )

    const calls = [
      GOGUser.getCredentials(),
      GOGUser.getCredentials(),
      GOGUser.getCredentials()
    ]
    release({ stdout: JSON.stringify(credentials) })
    const results = await Promise.all(calls)

    expect(runRunnerCommand).toHaveBeenCalledTimes(1)
    expect(results.map((r) => r?.access_token)).toEqual([
      'token',
      'token',
      'token'
    ])
  })

  test('a failed run does not stick around and block later calls', async () => {
    runRunnerCommand.mockRejectedValueOnce(new Error('gogdl exploded'))

    await expect(GOGUser.getCredentials()).rejects.toThrow('gogdl exploded')

    respondWithCredentials()
    await expect(GOGUser.getCredentials()).resolves.toMatchObject({
      access_token: 'token'
    })
    expect(runRunnerCommand).toHaveBeenCalledTimes(2)
  })
})

describe('GOGUser.getCredentials - caching', () => {
  test('reuses the result instead of spawning gogdl again', async () => {
    await GOGUser.getCredentials()
    await GOGUser.getCredentials()
    await GOGUser.getCredentials()

    expect(runRunnerCommand).toHaveBeenCalledTimes(1)
  })

  test('spawns gogdl again once the cache window passes', async () => {
    jest.useFakeTimers()

    await GOGUser.getCredentials()
    jest.advanceTimersByTime(61_000)
    await GOGUser.getCredentials()

    expect(runRunnerCommand).toHaveBeenCalledTimes(2)
  })

  test('never caches past the token lifetime gogdl reports', async () => {
    jest.useFakeTimers()
    respondWithCredentials({ expires_in: 5 })

    await GOGUser.getCredentials()
    jest.advanceTimersByTime(6_000)
    await GOGUser.getCredentials()

    expect(runRunnerCommand).toHaveBeenCalledTimes(2)
  })

  test('does not cache empty gogdl output', async () => {
    runRunnerCommand.mockResolvedValue({ stdout: '   ' })

    await expect(GOGUser.getCredentials()).resolves.toBeUndefined()
    await GOGUser.getCredentials()

    expect(runRunnerCommand).toHaveBeenCalledTimes(2)
  })

  test('does not cache unparseable gogdl output', async () => {
    runRunnerCommand.mockResolvedValue({ stdout: '{ not json' })

    await expect(GOGUser.getCredentials()).resolves.toBeUndefined()
    await GOGUser.getCredentials()

    expect(runRunnerCommand).toHaveBeenCalledTimes(2)
  })

  test('skips gogdl entirely while offline', async () => {
    mockedIsOnline.mockReturnValue(false)

    await expect(GOGUser.getCredentials()).resolves.toBeUndefined()
    expect(runRunnerCommand).not.toHaveBeenCalled()
  })
})

describe('GOGUser - cache invalidation', () => {
  test('logging out drops the cached credentials', async () => {
    await GOGUser.getCredentials()
    GOGUser.logout()
    await GOGUser.getCredentials()

    expect(runRunnerCommand).toHaveBeenCalledTimes(2)
  })

  test('invalidateCredentialsCache forces the next read to re-run gogdl', async () => {
    await GOGUser.getCredentials()
    GOGUser.invalidateCredentialsCache()
    await GOGUser.getCredentials()

    expect(runRunnerCommand).toHaveBeenCalledTimes(2)
  })
})
