import { logInfo, LogPrefix } from 'backend/logger'
import LogWriter from 'backend/logger/log_writer'

export const legendarySetup = async (appName: string, logWriter: LogWriter) => {
  logInfo(`Setup for ${appName} is handled by the external script`, LogPrefix.Legendary)
}
