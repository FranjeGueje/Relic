import { describe, expect, test, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { quit: vi.fn() },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: { handle: vi.fn(), on: vi.fn() }
}))

import { ipcMain } from 'electron'
import { IPC } from '../../shared/bridge'
import { answerCall, registerIpc, runLogin, runSetSetting } from '../ipc'

const link = (call: (...args: unknown[]) => Promise<unknown>) =>
  ({ call }) as unknown as Parameters<typeof answerCall>[0]

describe('answerCall', () => {
  test('passes an allowed channel to rakun and wraps the result', async () => {
    const call = vi.fn().mockResolvedValue(['g'])

    const reply = await answerCall(link(call), 'getLibrary', ['all'])

    expect(reply).toEqual({ ok: true, result: ['g'] })
    expect(call).toHaveBeenCalledWith('getLibrary', 'all')
  })

  test('refuses any channel that is not in the list, without asking rakun', async () => {
    const call = vi.fn()

    for (const channel of ['stopRakun', 'setSetting', 42, undefined]) {
      const reply = await answerCall(link(call), channel, [])
      expect(reply.ok).toBe(false)
    }
    expect(call).not.toHaveBeenCalled()
  })

  test('arguments have to be a list', async () => {
    const reply = await answerCall(link(vi.fn()), 'getLibrary', 'all')
    expect(reply).toEqual({ ok: false, error: 'args must be a list' })
  })

  test('the accounts channels are allowed, the two of the login are not', async () => {
    const call = vi.fn().mockResolvedValue(null)
    expect((await answerCall(link(call), 'getAccounts', [])).ok).toBe(true)
    expect((await answerCall(link(call), 'logout', ['gog'])).ok).toBe(true)
    for (const channel of ['getLoginInfo', 'submitLogin']) {
      expect((await answerCall(link(call), channel, ['gog'])).ok).toBe(false)
    }
    expect(call).toHaveBeenCalledTimes(2)
  })

  test('setSetting is not a channel of the interface: only the main saves settings', async () => {
    const call = vi.fn()
    expect((await answerCall(link(call), 'setSetting', [{}])).ok).toBe(false)
    expect(call).not.toHaveBeenCalled()
  })

  test('an error of rakun travels as text', async () => {
    const call = vi.fn().mockRejectedValue(new Error('already installed'))
    const reply = await answerCall(link(call), 'install', [{}])
    expect(reply).toEqual({ ok: false, error: 'already installed' })
  })
})

describe('rakun:start', () => {
  const register = (connection: string, reply: { ok: boolean }) => {
    const link = {
      connection,
      call: vi.fn(),
      onEvent: vi.fn(),
      onConnection: vi.fn(),
      retryNow: vi.fn()
    }
    const rakun = { start: vi.fn().mockResolvedValue(reply), owns: false }
    registerIpc(link as never, rakun as never)
    // eslint-disable-next-line @typescript-eslint/unbound-method -- a mock: it has no `this`
    const registered = vi.mocked(ipcMain.handle).mock.calls
    const handler = registered.findLast(
      ([name]) => name === IPC.start
    )?.[1] as () => Promise<unknown>
    return { link, rakun, handler }
  }

  test('asks rakunctl to start, knowing rakun was stopped, and reconnects at once', async () => {
    const { link, rakun, handler } = register('offline', { ok: true })
    await handler()
    expect(rakun.start).toHaveBeenCalledWith(true)
    expect(link.retryNow).toHaveBeenCalled()
  })

  test('with rakun answering, it is not marked as stopped', async () => {
    const { rakun, handler } = register('online', { ok: true })
    await handler()
    expect(rakun.start).toHaveBeenCalledWith(false)
  })

  test('a failed start does not reconnect', async () => {
    const { link, handler } = register('offline', { ok: false })
    await handler()
    expect(link.retryNow).not.toHaveBeenCalled()
  })

  test('the handler takes no arguments from the interface', () => {
    const { handler } = register('offline', { ok: true })
    expect(handler.length).toBe(0)
  })
})

describe('runLogin', () => {
  const stores = [{ id: 'gog', name: 'gog', label: 'GOG' }]
  const rakun = (submit: unknown = { ok: true }) =>
    vi.fn((channel: string) => {
      if (channel === 'getStores') return Promise.resolve(stores)
      if (channel === 'getLoginInfo')
        return Promise.resolve({
          runner: 'gog',
          url: 'https://login',
          instructions: ''
        })
      return Promise.resolve(submit)
    })
  const asLink = (call: unknown) => link(call as never)

  test('opens the page rakun gave and sends what the window ended on', async () => {
    const call = rakun()
    const open = vi.fn().mockResolvedValue('https://end?code=1')

    const reply = await runLogin(asLink(call), 'gog', open)

    expect(reply).toEqual({ ok: true })
    expect(open).toHaveBeenCalledWith('gog', 'https://login')
    expect(call).toHaveBeenLastCalledWith(
      'submitLogin',
      'gog',
      'https://end?code=1'
    )
  })

  test("a store that is not one of rakun's never opens a window", async () => {
    const open = vi.fn()
    const reply = await runLogin(asLink(rakun()), 'steam', open)
    expect(reply.ok).toBe(false)
    expect(open).not.toHaveBeenCalled()
  })

  test('closing the window is a cancellation and sends nothing', async () => {
    const call = rakun()
    const reply = await runLogin(asLink(call), 'gog', () =>
      Promise.resolve(undefined)
    )
    expect(reply).toEqual({ ok: false, error: 'cancelled', cancelled: true })
    expect(call).not.toHaveBeenCalledWith(
      'submitLogin',
      expect.anything(),
      expect.anything()
    )
  })

  test('a rejection by rakun comes back as the reason', async () => {
    const call = rakun({ ok: false, error: 'The store rejected the login' })
    const reply = await runLogin(asLink(call), 'gog', () =>
      Promise.resolve('x')
    )
    expect(reply).toEqual({ ok: false, error: 'The store rejected the login' })
  })
})

describe('runSetSetting', () => {
  test('saves one of the four settings through rakun', async () => {
    const call = vi.fn().mockResolvedValue(null)
    const reply = await runSetSetting(link(call), 'protonPath', '/p/GE')
    expect(reply).toEqual({ ok: true })
    expect(call).toHaveBeenCalledWith('setSetting', {
      key: 'protonPath',
      value: '/p/GE'
    })
  })

  test('any other setting, and a value that is not text, never reach rakun', async () => {
    const call = vi.fn()
    for (const key of ['altNileBin', 'maxWorkers', '', 7, undefined]) {
      expect((await runSetSetting(link(call), key, 'x')).ok).toBe(false)
    }
    expect((await runSetSetting(link(call), 'language', 5)).ok).toBe(false)
    expect(call).not.toHaveBeenCalled()
  })

  test('the reason rakun gives for refusing a value comes back as text', async () => {
    const call = vi.fn().mockRejectedValue(new Error('not a Proton folder'))
    const reply = await runSetSetting(link(call), 'protonPath', '/x')
    expect(reply).toEqual({ ok: false, error: 'not a Proton folder' })
  })
})
