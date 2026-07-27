import { NileUser } from '../user'

jest.mock('backend/logger', () => ({
  logDebug: jest.fn(),
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Nile: 'Nile' }
}))

jest.mock('backend/utils')

jest.mock('../electronStores', () => ({
  configStore: { get_nodefault: jest.fn(), delete: jest.fn(), set: jest.fn() }
}))

jest.mock('../constants', () => ({
  nileUserData: '/tmp/user.json'
}))

jest.mock('../..', () => ({
  libraryManagerMap: {
    nile: {
      runRunnerCommand: jest.fn()
    }
  }
}))

import { libraryManagerMap } from '../..'
const mockedRunRunnerCommand = jest.mocked(
  libraryManagerMap.nile.runRunnerCommand
)

describe('NileUser.getLoginData', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should throw when stdout is empty', async () => {
    mockedRunRunnerCommand.mockResolvedValue({
      stdout: '',
      stderr: 'ERROR: auth failed',
      error: undefined,
      abort: false
    })

    await expect(NileUser.getLoginData()).rejects.toThrow(
      'Empty response from nile auth command'
    )
  })

  it('should return login data when stdout has valid JSON', async () => {
    const loginData = {
      code: 'abc123',
      code_verifier: 'verifier',
      serial: 'serial123',
      client_id: 'client'
    }

    mockedRunRunnerCommand.mockResolvedValue({
      stdout: JSON.stringify(loginData),
      stderr: '',
      error: undefined,
      abort: false
    })

    const result = await NileUser.getLoginData()
    expect(result).toEqual(loginData)
  })
})
