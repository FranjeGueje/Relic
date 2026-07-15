import { existsSync } from 'graceful-fs'
import { join } from 'path'
import { RuntimeName } from 'common/types'
import { runtimePath } from 'backend/constants/paths'

async function download(name: RuntimeName): Promise<boolean> {
  return false
}

async function isInstalled(name: RuntimeName) {
  return existsSync(join(runtimePath, name))
}

export { download, isInstalled }
