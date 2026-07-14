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

export { getDiskInfo, isWritable }
export type { DiskInfo }
