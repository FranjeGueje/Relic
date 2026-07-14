import { isFlatpak } from 'backend/constants/environment'
import type { Path } from 'backend/schemas'

interface DiskInfo {
  freeSpace: number
  totalSpace: number
}

async function getDiskInfo(path: Path): Promise<DiskInfo> {
  const { getDiskInfo_unix } = await import('./unix')
  return getDiskInfo_unix(path)
}

async function isWritable(path: Path): Promise<boolean> {
  const { isWritable_unix } = await import('./unix')
  return isWritable_unix(path)
}

const isAccessibleWithinFlatpakSandbox = (path: Path): boolean =>
  !isFlatpak || !path.startsWith(process.env.XDG_RUNTIME_DIR || '/run/user/')

export { getDiskInfo, isWritable, isAccessibleWithinFlatpakSandbox }
export type { DiskInfo }
