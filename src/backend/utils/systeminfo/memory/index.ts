import type { SystemInformation } from '../index'

type PartialMemoryInfo = Omit<
  SystemInformation['memory'],
  'totalFormatted' | 'usedFormatted'
>

async function getMemoryInfo(): Promise<PartialMemoryInfo> {
  const { getMemoryInfo_linux } = await import('./linux')
  return getMemoryInfo_linux()
}

export { getMemoryInfo }
export type { PartialMemoryInfo }
