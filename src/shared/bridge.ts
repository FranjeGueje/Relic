import type {
  CallChannel,
  CallMap,
  ConnectionState,
  RakunEvent
} from './channels'
import type { Runner, SettingKey } from './types'

/** The names of the IPC messages between the renderer and the main process */
export const IPC = {
  call: 'rakun:call',
  state: 'rakun:state',
  event: 'rakun:event',
  connection: 'rakun:connection',
  quit: 'rakun:quit',
  start: 'rakun:start',
  owns: 'rakun:owns',
  login: 'rakun:login',
  setting: 'rakun:setting'
} as const

/** What the main process answers to a call: errors travel as text, not as exceptions */
export type StartReply = { ok: true } | { ok: false; error: string }

/** How a login ended: `cancelled` when the person closed the window */
export type LoginReply =
  { ok: true } | { ok: false; error: string; cancelled?: true }

/** How saving a setting ended: the reason comes from rakun, which validates it */
export type SettingReply = { ok: true } | { ok: false; error: string }

export type CallReply =
  { ok: true; result: unknown } | { ok: false; error: string }

/** What the preload gives the interface as `window.rakun` */
export type RakunBridge = {
  call: <C extends CallChannel>(
    channel: C,
    ...args: CallMap[C]['args']
  ) => Promise<CallMap[C]['result']>
  connection: () => Promise<ConnectionState>
  onEvent: (listener: (event: RakunEvent) => void) => () => void
  onConnection: (listener: (state: ConnectionState) => void) => () => void
  quit: () => void
  /** Starts rakun (through rakunctl); the interface cannot say how or where */
  start: () => Promise<StartReply>
  /** Whether this client started rakun, and will close it on exit */
  owns: () => Promise<boolean>
  /** Opens the store's login page in a window and hands the result to rakun */
  login: (runner: Runner) => Promise<LoginReply>
  /** Saves one of the few settings the interface may change */
  setSetting: (key: SettingKey, value: string) => Promise<SettingReply>
}
