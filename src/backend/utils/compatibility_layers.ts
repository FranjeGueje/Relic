import { existsSync } from 'graceful-fs'
import { searchForExecutableOnPath } from './os/path'
import {
  defaultUmuPath
} from 'backend/constants/paths'
import { isLinux } from 'backend/constants/environment'

export const getUmuPath = async () =>
  searchForExecutableOnPath('umu-run').then((path) => path ?? defaultUmuPath)

export async function isUmuSupported(
  gameSettings: { disableUMU?: boolean },
  checkUmuInstalled = true
): Promise<boolean> {
  if (!isLinux) return false
  if (gameSettings.disableUMU === true) {
    return false
  }
  if (!checkUmuInstalled) return true
  if (!existsSync(await getUmuPath())) return false

  return true
}
