import { shareInFlight } from '../inflight'

let inFlight: Map<string, Promise<string>>

beforeEach(() => {
  inFlight = new Map()
})

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined
  let reject: (error: unknown) => void = () => undefined
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('shareInFlight', () => {
  test('runs once for concurrent callers on the same key', async () => {
    const { promise, resolve } = deferred<string>()
    const run = jest.fn(() => promise)

    const calls = [
      shareInFlight(inFlight, 'game', run),
      shareInFlight(inFlight, 'game', run),
      shareInFlight(inFlight, 'game', run)
    ]
    resolve('info')

    await expect(Promise.all(calls)).resolves.toEqual(['info', 'info', 'info'])
    expect(run).toHaveBeenCalledTimes(1)
  })

  test('keeps different keys independent', async () => {
    const run = jest.fn((value: string) => Promise.resolve(value))

    await Promise.all([
      shareInFlight(inFlight, 'a', () => run('a')),
      shareInFlight(inFlight, 'b', () => run('b'))
    ])

    expect(run).toHaveBeenCalledTimes(2)
  })

  test('is a concurrency guard, not a cache', async () => {
    const run = jest.fn(() => Promise.resolve('info'))

    await shareInFlight(inFlight, 'game', run)
    await shareInFlight(inFlight, 'game', run)

    expect(run).toHaveBeenCalledTimes(2)
    expect(inFlight.size).toBe(0)
  })

  test('a rejection does not stick to block later attempts', async () => {
    const failing = jest.fn(() => Promise.reject(new Error('boom')))
    await expect(shareInFlight(inFlight, 'game', failing)).rejects.toThrow(
      'boom'
    )

    const succeeding = jest.fn(() => Promise.resolve('info'))
    await expect(shareInFlight(inFlight, 'game', succeeding)).resolves.toBe(
      'info'
    )
    expect(inFlight.size).toBe(0)
  })

  test('concurrent callers all see the same rejection', async () => {
    const { promise, reject } = deferred<string>()
    const run = jest.fn(() => promise)

    const first = shareInFlight(inFlight, 'game', run)
    const second = shareInFlight(inFlight, 'game', run)
    reject(new Error('boom'))

    await expect(first).rejects.toThrow('boom')
    await expect(second).rejects.toThrow('boom')
    expect(run).toHaveBeenCalledTimes(1)
  })

  test('leaves no entry behind once settled', async () => {
    await shareInFlight(inFlight, 'game', () => Promise.resolve('info'))
    expect(inFlight.has('game')).toBe(false)
  })
})
