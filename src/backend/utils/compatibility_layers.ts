import { existsSync } from 'graceful-fs'
import { searchForExecutableOnPath } from './os/path'
import { publicDir, fixAsarPath } from 'backend/constants/paths'
import { isLinux } from 'backend/constants/environment'
import { join } from 'path'

export const getUmuPath = async (): Promise<string | null> => {
  const path = await searchForExecutableOnPath('umu-run')
  if (path) return path

  const bundled = fixAsarPath(join(publicDir, 'bin', 'umu', 'umu-run'))
  if (existsSync(bundled)) return bundled

  return null
}

export async function isUmuSupported(
  checkUmuInstalled = true
): Promise<boolean> {
  if (!isLinux) return false
  if (!checkUmuInstalled) return true
  const path = await getUmuPath()
  return path !== null && existsSync(path)
}
