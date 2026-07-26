import { LogPrefix, logInfo } from 'backend/logger'

export default async function setup(
  appName: string,
  _installedPath?: string
): Promise<void> {
  void _installedPath
  logInfo(
    `Setup for ${appName} is handled by the external script`,
    LogPrefix.Nile
  )
}
