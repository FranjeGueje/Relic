import { describe, expect, test, vi } from 'vitest'
import {
  controlCandidates,
  findControl,
  RakunProcess,
  type Exec,
  type ExecResult
} from '../rakunProcess'

const ok: ExecResult = { code: 0, output: '', missing: false }
const exec = (result: Partial<ExecResult> = {}) =>
  vi.fn<Exec>(() => Promise.resolve({ ...ok, ...result }))
const process_ = (run: Exec) => new RakunProcess(run, () => '/ctl/rakunctl')

describe('finding rakunctl', () => {
  test('the install.sh path first, the PATH as a fallback', () => {
    const [fixed, bare] = controlCandidates('/home/u')
    expect(fixed).toBe('/home/u/.local/opt/rakun/rakunctl')
    expect(findControl(() => true, [fixed, bare])).toBe(fixed)
    expect(findControl(() => false, [fixed, bare])).toBe('rakunctl')
  })
})

describe('start', () => {
  test('runs `rakunctl start`, and owns rakun when it was stopped', async () => {
    const run = exec()
    const rakun = process_(run)

    expect(await rakun.start(true)).toEqual({ ok: true })
    expect(run).toHaveBeenCalledWith(
      '/ctl/rakunctl',
      ['start'],
      expect.any(Number)
    )
    expect(rakun.owns).toBe(true)
  })

  test('if rakun was already answering it is not ours, even if start says ok', async () => {
    const rakun = process_(exec())
    await rakun.start(false)
    expect(rakun.owns).toBe(false)
  })

  test('no rakunctl: says how to get it, owns nothing', async () => {
    const rakun = process_(exec({ code: 1, missing: true }))
    const reply = await rakun.start(true)
    expect(reply.ok).toBe(false)
    expect(reply.ok === false && reply.error).toContain('install.sh')
    expect(rakun.owns).toBe(false)
  })

  test('rakunctl failing gives its own message', async () => {
    const rakun = process_(exec({ code: 1, output: 'rakun no ha arrancado' }))
    expect(await rakun.start(true)).toEqual({
      ok: false,
      error: 'rakun no ha arrancado'
    })
    expect(rakun.owns).toBe(false)
  })
})

describe('stopIfOurs', () => {
  test('runs nothing when rakun is not ours', async () => {
    const run = exec()
    const rakun = process_(run)
    expect(await rakun.stopIfOurs()).toBe('left')
    expect(run).not.toHaveBeenCalled()
  })

  test('stops the rakun it started, once', async () => {
    const run = exec()
    const rakun = process_(run)
    await rakun.start(true)
    run.mockClear()

    expect(await rakun.stopIfOurs()).toBe('stopped')
    expect(run).toHaveBeenCalledWith(
      '/ctl/rakunctl',
      ['stop'],
      expect.any(Number)
    )
    expect(rakun.owns).toBe(false)
    expect(await rakun.stopIfOurs()).toBe('left')
  })

  test('rakunctl refusing (it is downloading) leaves rakun running and still ours', async () => {
    const run = exec()
    const rakun = process_(run)
    await rakun.start(true)
    run.mockResolvedValue({
      code: 1,
      output: 'está descargando',
      missing: false
    })

    expect(await rakun.stopIfOurs()).toBe('left')
    expect(rakun.owns).toBe(true)
  })
})
