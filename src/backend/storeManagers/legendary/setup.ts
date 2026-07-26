import { logInfo, LogPrefix } from 'backend/logger'

export const legendarySetup = async (appName: string) => {
  logInfo(`Setup for ${appName} is handled by the external script`, LogPrefix.Legendary)
}
