import type { GPUInfo } from '../index'
import { populateDeviceAndVendorName } from './pci_ids'

type PartialGpuInfo = Omit<GPUInfo, 'deviceString' | 'vendorString'>

async function getGpuInfo(): Promise<GPUInfo[]> {
  const { getGpuInfo_linux } = await import('./linux')
  const partialGpus = await getGpuInfo_linux()
  return populateDeviceAndVendorName(partialGpus)
}

export { getGpuInfo }
export type { PartialGpuInfo }
