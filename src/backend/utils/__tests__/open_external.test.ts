import { EventEmitter } from 'events'
import { spawn } from 'child_process'
import { logError } from 'backend/logger'
import { openExternal } from '../open_external'

jest.mock('child_process', () => ({ spawn: jest.fn() }))
jest.mock('backend/logger', () => ({
  logError: jest.fn(),
  LogPrefix: { Backend: 'Backend' }
}))

const mockedSpawn = jest.mocked(spawn)
const mockedLogError = jest.mocked(logError)

function fakeChild() {
  return new EventEmitter()
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('openExternal', () => {
  test('hands the target to xdg-open', async () => {
    const child = fakeChild()
    mockedSpawn.mockReturnValue(child as never)

    const promise = openExternal('https://example.com')
    child.emit('close', 0)
    await promise

    expect(mockedSpawn).toHaveBeenCalledWith(
      'xdg-open',
      ['https://example.com'],
      { stdio: 'ignore' }
    )
    expect(mockedLogError).not.toHaveBeenCalled()
  })

  test('passes a steam:// url through untouched', async () => {
    const child = fakeChild()
    mockedSpawn.mockReturnValue(child as never)

    const promise = openExternal('steam://gameproperties/42')
    child.emit('close', 0)
    await promise

    expect(mockedSpawn).toHaveBeenCalledWith(
      'xdg-open',
      ['steam://gameproperties/42'],
      expect.anything()
    )
  })

  test('passes a local path through untouched', async () => {
    const child = fakeChild()
    mockedSpawn.mockReturnValue(child as never)

    const promise = openExternal('/home/deck/Games')
    child.emit('close', 0)
    await promise

    expect(mockedSpawn).toHaveBeenCalledWith(
      'xdg-open',
      ['/home/deck/Games'],
      expect.anything()
    )
  })

  test('logs a non-zero exit without rejecting', async () => {
    const child = fakeChild()
    mockedSpawn.mockReturnValue(child as never)

    const promise = openExternal('/nope')
    child.emit('close', 3)

    await expect(promise).resolves.toBeUndefined()
    expect(mockedLogError).toHaveBeenCalledWith(
      expect.stringContaining('exited with code 3'),
      'Backend'
    )
  })

  test('logs a spawn failure without rejecting', async () => {
    // xdg-open missing from PATH must not take the caller down with it
    const child = fakeChild()
    mockedSpawn.mockReturnValue(child as never)

    const promise = openExternal('https://example.com')
    child.emit('error', new Error('ENOENT'))

    await expect(promise).resolves.toBeUndefined()
    expect(mockedLogError).toHaveBeenCalledWith(
      [expect.stringContaining('Failed to run xdg-open'), expect.any(Error)],
      'Backend'
    )
  })
})
