import { launchUmu } from '../launcher'
import { getUmuPath } from 'backend/utils/compatibility_layers'
import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'stream'

jest.mock('backend/utils/compatibility_layers', () => ({
  getUmuPath: jest.fn()
}))

jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}))

jest.mock('child_process', () => ({
  spawn: jest.fn()
}))

const mockedGetUmuPath = jest.mocked(getUmuPath)
const mockedSpawn = jest.mocked(spawn)


function createMockChild(): ChildProcess & EventEmitter {
  const child = new EventEmitter() as ChildProcess & EventEmitter
  child.stderr = new EventEmitter() as ChildProcess['stderr']
  child.stdout = new EventEmitter() as ChildProcess['stdout']
  return child
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedGetUmuPath.mockResolvedValue('/usr/bin/umu-run')
})

describe('launchUmu', () => {
  it('spawns umu-run with correct environment variables', async () => {
    expect.assertions(4)
    const mockChild = createMockChild()
    mockedSpawn.mockReturnValue(mockChild)

    const promise = launchUmu({
      winePrefix: '/home/user/.steam/steam/steamapps/compatdata/123/pfx',
      gameId: '456',
      protonPath: '/home/user/.local/share/Steam/compatibilitytools.d/GE-Proton9-25',
      store: 'egs',
      executable: 'exit'
    })

    await new Promise(process.nextTick)

    expect(mockedSpawn).toHaveBeenCalledTimes(1)
    const [cmd, args, options] = mockedSpawn.mock.calls[0]
    expect(cmd).toBe('/usr/bin/umu-run')
    expect(args).toEqual(['exit'])
    expect(options.env).toMatchObject({
      WINEPREFIX: '/home/user/.steam/steam/steamapps/compatdata/123/pfx',
      GAMEID: '456',
      PROTONPATH: '/home/user/.local/share/Steam/compatibilitytools.d/GE-Proton9-25',
      STORE: 'egs'
    })

    process.nextTick(() => {
      mockChild.emit('close', 0)
    })

    await promise
  })

  it('returns error on non-zero exit code', async () => {
    expect.assertions(2)
    const mockChild = createMockChild()
    mockedSpawn.mockReturnValue(mockChild)

    const promise = launchUmu({
      winePrefix: '/tmp/prefix',
      gameId: '0',
      protonPath: '/path/to/proton',
      store: 'gog',
      executable: 'exit'
    })

    await new Promise(process.nextTick)

    const stderr = mockChild.stderr!
    stderr.emit('data', Buffer.from('error message'))

    process.nextTick(() => {
      mockChild.emit('close', 1)
    })

    const result = await promise
    expect(result.success).toBe(false)
    expect(result.error).toContain('error message')
  })

  it('returns error when spawn emits error', async () => {
    expect.assertions(2)
    const mockChild = createMockChild()
    mockedSpawn.mockReturnValue(mockChild)

    const promise = launchUmu({
      winePrefix: '/tmp/prefix',
      gameId: '0',
      protonPath: '/path/to/proton',
      store: 'gog',
      executable: 'exit'
    })

    await new Promise(process.nextTick)

    process.nextTick(() => {
      mockChild.emit('error', new Error('ENOENT'))
    })

    const result = await promise
    expect(result.success).toBe(false)
    expect(result.error).toBe('ENOENT')
  })
})
