import { GameConfigVersion, GlobalConfigVersion } from 'common/types'
import pkg_json from 'backend/../../package.json'

export const currentGameConfigVersion: GameConfigVersion = 'v0'
export const currentGlobalConfigVersion: GlobalConfigVersion = 'v0'

// Replaces Electron's `app.getVersion()`, which read this very field from
// package.json. Resolved at build time by the bundler, so it needs no runtime
// filesystem access and works outside Electron.
export const relicVersion: string = pkg_json.version

// Sent by every request Relic makes to a third-party API.
export const relicUserAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Relic/${relicVersion}`

function getShell() {
  return '/bin/bash'
}

const MAX_BUFFER = 25 * 1024 * 1024 // 25MB should be safe enough for big installations even on really slow internet

export const execOptions = {
  maxBuffer: MAX_BUFFER,
  shell: getShell()
}
