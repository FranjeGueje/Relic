import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  EmbeddedRakun,
  embeddedScriptPath,
  shouldAutostart,
  type Child,
  type Spawn
} from '../embeddedRakun'

/** A child that can be told to exit, and records the signals it gets */
class FakeChild extends EventEmitter {
  exitCode: number | null = null
  stderr = new EventEmitter()
  signals: string[] = []
  /** Exits on SIGTERM unless told otherwise */
  stubborn = false
  kill(signal?: string | number): boolean {
    this.signals.push(String(signal))
    if (signal === 'SIGKILL' || (signal === 'SIGTERM' && !this.stubborn))
      this.finish(null)
    return true
  }
  finish(code: number | null) {
    this.exitCode = code ?? 0
    this.emit('exit', code)
  }
}

const rakun = (child = new FakeChild(), graceMs = 10_000) => {
  const run = vi.fn<Spawn>(() => child as unknown as Child)
  return {
    child,
    run,
    rakun: new EmbeddedRakun('/app/rakun/rakun.cjs', run, '/app/relic', graceMs)
  }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('embeddedScriptPath', () => {
  test('the bundled script, or the one the environment names', () => {
    const exists = (path: string) => path === '/res/rakun/rakun.cjs'
    expect(embeddedScriptPath('/res', {}, exists)).toBe('/res/rakun/rakun.cjs')
    expect(
      embeddedScriptPath('/res', { RELIC_RAKUN_CJS: '/dev/x.cjs' }, () => true)
    ).toBe('/dev/x.cjs')
  })

  test('nothing when the package has no rakun', () => {
    expect(embeddedScriptPath('/res', {}, () => false)).toBeUndefined()
    expect(embeddedScriptPath(undefined, {}, () => true)).toBeUndefined()
  })
})

describe('shouldAutostart', () => {
  test('only once, when rakun does not answer and there is one inside', () => {
    expect(shouldAutostart('offline', true, false)).toBe(true)
    expect(shouldAutostart('offline', true, true)).toBe(false)
    expect(shouldAutostart('offline', false, false)).toBe(false)
    expect(shouldAutostart('connecting', true, false)).toBe(false)
    expect(shouldAutostart('online', true, false)).toBe(false)
  })
})

describe('start', () => {
  test('runs the script on the Electron binary as plain Node, with the web off', async () => {
    const { rakun: r, run } = rakun()
    const started = r.start(true)
    await vi.advanceTimersByTimeAsync(2000)

    expect(await started).toEqual({ ok: true })
    expect(run).toHaveBeenCalledWith(
      '/app/relic',
      ['/app/rakun/rakun.cjs', '--web=off'],
      expect.objectContaining({ ELECTRON_RUN_AS_NODE: '1' })
    )
    const env = run.mock.calls[0][2]
    expect(env.LD_PRELOAD).toBeUndefined()
    expect(env.LD_LIBRARY_PATH).toBeUndefined()
    expect(r.ownership).toBe('embedded')
  })

  test('if rakun was already answering it is not started, and not ours', async () => {
    const { rakun: r, run } = rakun()
    expect(await r.start(false)).toEqual({ ok: true })
    expect(run).not.toHaveBeenCalled()
    expect(r.ownership).toBe('none')
  })

  test('does not start a second one', async () => {
    const { rakun: r, run } = rakun()
    const first = r.start(true)
    await vi.advanceTimersByTimeAsync(2000)
    await first
    expect(await r.start(true)).toEqual({ ok: true })
    expect(run).toHaveBeenCalledTimes(1)
  })

  test('if it stops right away, says why and owns nothing', async () => {
    const { rakun: r, child } = rakun()
    const started = r.start(true)
    child.stderr.emit('data', Buffer.from('port 17370 is taken\n'))
    child.finish(1)

    expect(await started).toEqual({ ok: false, error: 'port 17370 is taken' })
    expect(r.ownership).toBe('none')
  })

  test('a start that fails without a word still says it stopped', async () => {
    const { rakun: r, child } = rakun()
    const started = r.start(true)
    child.finish(3)
    const reply = await started
    expect(reply.ok === false && reply.error).toContain('(3)')
  })
})

describe('stopIfOurs', () => {
  const running = async (graceMs?: number) => {
    const made = rakun(new FakeChild(), graceMs)
    const started = made.rakun.start(true)
    await vi.advanceTimersByTimeAsync(2000)
    await started
    return made
  }

  test('does nothing when it did not start rakun', async () => {
    const { rakun: r, child } = rakun()
    expect(await r.stopIfOurs()).toBe('left')
    expect(child.signals).toEqual([])
  })

  test('asks it to stop and waits for it to be gone', async () => {
    const { rakun: r, child } = await running()
    expect(await r.stopIfOurs()).toBe('stopped')
    expect(child.signals).toEqual(['SIGTERM'])
    expect(r.ownership).toBe('none')
  })

  test('kills it if it does not stop in time, so the package can be unmounted', async () => {
    const { rakun: r, child } = await running(5000)
    child.stubborn = true
    const stopped = r.stopIfOurs()
    await vi.advanceTimersByTimeAsync(5001)

    expect(await stopped).toBe('stopped')
    expect(child.signals).toEqual(['SIGTERM', 'SIGKILL'])
  })
})
