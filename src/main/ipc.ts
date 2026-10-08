import { app, BrowserWindow, ipcMain } from 'electron'
import {
  IPC,
  type CallReply,
  type LoginReply,
  type SettingReply
} from '../shared/bridge'
import type { RakunProcess } from './rakunProcess'
import { isCallChannel, type CallChannel } from '../shared/channels'
import type { RakunLink } from './rakun'
import { openLoginWindow } from './loginWindow'
import { SETTING_KEYS, type Runner, type SettingKey } from '../shared/types'

/** Runs a call asked by the interface, if the channel is one it may ask for */
export async function answerCall(
  link: Pick<RakunLink, 'call'>,
  channel: unknown,
  args: unknown
): Promise<CallReply> {
  if (!isCallChannel(channel))
    return { ok: false, error: `channel not allowed: ${String(channel)}` }
  if (!Array.isArray(args)) return { ok: false, error: 'args must be a list' }
  try {
    // The channel was checked above and rakun checks its arguments
    const call = link.call.bind(link) as unknown as (
      channel: CallChannel,
      ...args: unknown[]
    ) => Promise<unknown>
    return { ok: true, result: await call(channel, ...(args as unknown[])) }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

type OpenLogin = (runner: Runner, url: string) => Promise<string | undefined>

/** The login of a store: its page in a window, then what the window ends on goes to rakun */
export async function runLogin(
  link: Pick<RakunLink, 'call'>,
  runner: unknown,
  open: OpenLogin
): Promise<LoginReply> {
  try {
    const stores = await link.call('getStores')
    const store = stores.find((candidate) => candidate.id === runner)
    if (!store) return { ok: false, error: `unknown store: ${String(runner)}` }
    const info = await link.call('getLoginInfo', store.id)
    const pasted = await open(store.id, info.url)
    if (pasted === undefined)
      return { ok: false, error: 'cancelled', cancelled: true }
    const result = await link.call('submitLogin', store.id, pasted)
    return result.ok
      ? { ok: true }
      : { ok: false, error: result.error ?? 'login rejected' }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

const isSettingKey = (key: unknown): key is SettingKey =>
  SETTING_KEYS.some((allowed) => allowed === key)

/** Saves one of the few settings the interface may change; rakun checks the value */
export async function runSetSetting(
  link: Pick<RakunLink, 'call'>,
  key: unknown,
  value: unknown
): Promise<SettingReply> {
  if (!isSettingKey(key))
    return { ok: false, error: `setting not allowed: ${String(key)}` }
  if (typeof value !== 'string')
    return { ok: false, error: 'the value must be text' }
  try {
    await link.call('setSetting', { key, value })
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

function broadcast(message: string, payload: unknown): void {
  BrowserWindow.getAllWindows().forEach((win) =>
    win.webContents.send(message, payload)
  )
}

export function registerIpc(link: RakunLink, rakun: RakunProcess): void {
  ipcMain.handle(IPC.call, (_e, channel: unknown, args: unknown) =>
    answerCall(link, channel, args)
  )
  ipcMain.handle(IPC.state, () => link.connection)
  ipcMain.on(IPC.quit, () => app.quit())
  // No arguments: what is run and where is decided here, not by the interface
  ipcMain.handle(IPC.start, async () => {
    const reply = await rakun.start(link.connection !== 'online')
    if (reply.ok) link.retryNow()
    return reply
  })
  ipcMain.handle(IPC.owns, () => rakun.owns)
  ipcMain.handle(IPC.setting, (_e, key: unknown, value: unknown) =>
    runSetSetting(link, key, value)
  )
  ipcMain.handle(IPC.login, (event, runner: unknown) => {
    const parent = BrowserWindow.fromWebContents(event.sender)
    if (!parent) return { ok: false, error: 'no window' } satisfies LoginReply
    return runLogin(link, runner, (store, url) =>
      openLoginWindow(parent, store, url)
    )
  })
  link.onEvent((event) => broadcast(IPC.event, event))
  link.onConnection((state) => broadcast(IPC.connection, state))
}
