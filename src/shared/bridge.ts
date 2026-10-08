export type {
  LoginReply,
  Ownership,
  RakunBridge,
  SettingReply,
  StartReply
} from '@rakun-ui/api/bridge'

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
export type CallReply =
  { ok: true; result: unknown } | { ok: false; error: string }
