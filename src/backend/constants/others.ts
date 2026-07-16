import { GameConfigVersion, GlobalConfigVersion } from 'common/types'

export const currentGameConfigVersion: GameConfigVersion = 'v0'
export const currentGlobalConfigVersion: GlobalConfigVersion = 'v0'

function getShell() {
  return '/bin/bash'
}

const MAX_BUFFER = 25 * 1024 * 1024 // 25MB should be safe enough for big installations even on really slow internet

export const execOptions = {
  maxBuffer: MAX_BUFFER,
  shell: getShell()
}
