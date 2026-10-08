import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC,
  type CallReply,
  type SettingReply,
  type LoginReply,
  type Ownership,
  type RakunBridge,
  type StartReply
} from '../shared/bridge'
import type { ConnectionState, RakunEvent } from '../shared/channels'

function subscribe<T>(message: string, listener: (payload: T) => void) {
  const wrapped = (_event: unknown, payload: T) => listener(payload)
  ipcRenderer.on(message, wrapped)
  return () => {
    ipcRenderer.removeListener(message, wrapped)
  }
}

const bridge: RakunBridge = {
  appName: 'Relic',
  call: async (channel, ...args) => {
    const reply = (await ipcRenderer.invoke(
      IPC.call,
      channel,
      args
    )) as CallReply
    if (!reply.ok) throw new Error(reply.error)
    return reply.result as never
  },
  connection: () => ipcRenderer.invoke(IPC.state) as Promise<ConnectionState>,
  onEvent: (listener) => subscribe<RakunEvent>(IPC.event, listener),
  onConnection: (listener) =>
    subscribe<ConnectionState>(IPC.connection, listener),
  quit: () => ipcRenderer.send(IPC.quit),
  start: () => ipcRenderer.invoke(IPC.start) as Promise<StartReply>,
  owns: () => ipcRenderer.invoke(IPC.owns) as Promise<Ownership>,
  setSetting: (key, value) =>
    ipcRenderer.invoke(IPC.setting, key, value) as Promise<SettingReply>,
  login: (runner) =>
    ipcRenderer.invoke(IPC.login, runner) as Promise<LoginReply>
}

contextBridge.exposeInMainWorld('rakun', bridge)
