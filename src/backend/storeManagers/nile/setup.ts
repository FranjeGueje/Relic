import {
  LogPrefix,
  logInfo
} from 'backend/logger'

export default async function setup(
  appName: string,
  installedPath?: string
): Promise<void> {
  logInfo(`Setup for ${appName} is handled by the external script`, LogPrefix.Nile)
}
