import axios from 'axios'
import { existsSync, readFileSync, unlinkSync } from 'fs'
import { configStore } from '../electronStores'
import { isOnline } from '../../../online_monitor'
import { ZoomUser } from '../user'

jest.mock('axios')
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(() => 'a-token'),
  unlinkSync: jest.fn(),
  writeFileSync: jest.fn()
}))
jest.mock('backend/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Zoom: 'Zoom' }
}))
jest.mock('../electronStores', () => ({
  configStore: { get: jest.fn(), set: jest.fn(), clear: jest.fn() }
}))
jest.mock('../../../online_monitor', () => ({ isOnline: jest.fn() }))
jest.mock('backend/utils', () => ({ clearCache: jest.fn() }))
jest.mock('../constants', () => ({
  tokenPath: '/tmp/zoom.token',
  apiUrl: 'https://api.test',
  embedUrl: 'https://embed.test'
}))

const mockedAxios = jest.mocked(axios)
const mockedExistsSync = jest.mocked(existsSync)
const mockedReadFileSync = jest.mocked(readFileSync)
const mockedUnlinkSync = jest.mocked(unlinkSync)
const mockedConfigStore = jest.mocked(configStore)
const mockedIsOnline = jest.mocked(isOnline)

function axiosError(status?: number) {
  return Object.assign(new Error('request failed'), {
    response: status === undefined ? undefined : { status }
  })
}

beforeEach(() => {
  // The backend jest config sets resetMocks, which also wipes implementations
  // given in the jest.mock() factories -- so every one of them belongs here
  mockedExistsSync.mockReturnValue(true)
  mockedReadFileSync.mockReturnValue('a-token')
  mockedIsOnline.mockReturnValue(true)
  mockedConfigStore.get.mockReturnValue(true)
  mockedAxios.get.mockResolvedValue({ data: { name: 'someone' } })

  // Drop the module-level verification window left by the previous test
  ZoomUser.logout()
  jest.clearAllMocks()
})

describe('ZoomUser.getUserDetails', () => {
  test('verifies the login with a single request', async () => {
    // It used to call isLoggedIn() -- itself a network check against
    // /li/loggedin -- and then request the very same endpoint again
    await expect(ZoomUser.getUserDetails()).resolves.toEqual({
      username: 'someone'
    })

    expect(mockedAxios.get).toHaveBeenCalledTimes(1)
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.test/li/loggedin',
      expect.anything()
    )
  })

  test('its verification lets a following isLoggedIn() skip the network', async () => {
    await ZoomUser.getUserDetails()
    await expect(ZoomUser.isLoggedIn()).resolves.toBe(true)

    expect(mockedAxios.get).toHaveBeenCalledTimes(1)
  })

  test('returns nothing when there is no token', async () => {
    mockedExistsSync.mockReturnValue(false)

    await expect(ZoomUser.getUserDetails()).resolves.toBeUndefined()
    expect(mockedAxios.get).not.toHaveBeenCalled()
  })
})

describe('ZoomUser.isLoggedIn', () => {
  test('asks Zoom once and reuses the answer', async () => {
    await expect(ZoomUser.isLoggedIn()).resolves.toBe(true)
    await expect(ZoomUser.isLoggedIn()).resolves.toBe(true)
    await expect(ZoomUser.isLoggedIn()).resolves.toBe(true)

    expect(mockedAxios.get).toHaveBeenCalledTimes(1)
  })

  test('concurrent callers share one request', async () => {
    let release: (value: unknown) => void = () => undefined
    mockedAxios.get.mockReturnValue(
      new Promise((resolve) => {
        release = resolve
      })
    )

    const calls = [ZoomUser.isLoggedIn(), ZoomUser.isLoggedIn()]
    release({ data: {} })
    await Promise.all(calls)

    expect(mockedAxios.get).toHaveBeenCalledTimes(1)
  })

  test('does not touch the network without a token', async () => {
    mockedExistsSync.mockReturnValue(false)

    await expect(ZoomUser.isLoggedIn()).resolves.toBe(false)
    expect(mockedAxios.get).not.toHaveBeenCalled()
  })

  test('trusts the stored state while offline', async () => {
    mockedIsOnline.mockReturnValue(false)

    await expect(ZoomUser.isLoggedIn()).resolves.toBe(true)
    expect(mockedAxios.get).not.toHaveBeenCalled()
  })
})

describe('ZoomUser - failures must not destroy the session', () => {
  test('a network error keeps the token', async () => {
    // A dropped connection used to log the user out and delete their token
    mockedAxios.get.mockRejectedValue(axiosError())

    await expect(ZoomUser.isLoggedIn()).resolves.toBe(true)
    expect(mockedUnlinkSync).not.toHaveBeenCalled()
    expect(mockedConfigStore.clear).not.toHaveBeenCalled()
  })

  test('a server error keeps the token', async () => {
    mockedAxios.get.mockRejectedValue(axiosError(500))

    await expect(ZoomUser.isLoggedIn()).resolves.toBe(true)
    expect(mockedUnlinkSync).not.toHaveBeenCalled()
  })

  test('a 401 from Zoom does log the user out', async () => {
    mockedAxios.get.mockRejectedValue(axiosError(401))

    await expect(ZoomUser.isLoggedIn()).resolves.toBe(false)
    expect(mockedUnlinkSync).toHaveBeenCalledWith('/tmp/zoom.token')
  })

  test('a 403 from Zoom does log the user out', async () => {
    mockedAxios.get.mockRejectedValue(axiosError(403))

    await expect(ZoomUser.isLoggedIn()).resolves.toBe(false)
    expect(mockedUnlinkSync).toHaveBeenCalledWith('/tmp/zoom.token')
  })

  test('a failed verification is not remembered as a success', async () => {
    mockedAxios.get.mockRejectedValue(axiosError())
    await ZoomUser.isLoggedIn()

    mockedAxios.get.mockResolvedValue({ data: {} })
    await ZoomUser.isLoggedIn()

    expect(mockedAxios.get).toHaveBeenCalledTimes(2)
  })
})
