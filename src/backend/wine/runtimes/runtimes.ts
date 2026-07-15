import { existsSync } from 'graceful-fs'
import { join } from 'path'
import { runtimePath } from 'backend/constants/paths'

async function download(name: string): Promise<boolean> {
  return false
}

async function isInstalled(name: string) {
  return existsSync(join(runtimePath, name))
}

export { download, isInstalled }
