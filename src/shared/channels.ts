import type { CallChannel } from '@rakun-ui/api/channels'

export * from '@rakun-ui/api/channels'

/**
 * The only channels of rakun the interface can ask for. The preload and the main
 * process both refuse anything else, so this list is what the renderer can do. The
 * login and `setSetting` are in rakun's `CallMap` too, but only the main process
 * uses them (the interface never sees a login code): they are not here.
 */
const CALL_CHANNELS: readonly string[] = [
  'getStores',
  'getLibrary',
  'getAccounts',
  'listFolders',
  'logout',
  'refreshLibrary',
  'checkGameUpdates',
  'requestAppSettings',
  'install',
  'updateGame',
  'importGame',
  'getHelpers',
  'updateHelpers',
  'repair',
  'uninstall',
  'getDMQueueInformation',
  'pauseCurrentDownload',
  'resumeCurrentDownload',
  'cancelDownload',
  'removeFromDMQueue',
  'clearFinishedDMQueue'
] satisfies CallChannel[]

export function isCallChannel(channel: unknown): channel is CallChannel {
  return typeof channel === 'string' && CALL_CHANNELS.includes(channel)
}
