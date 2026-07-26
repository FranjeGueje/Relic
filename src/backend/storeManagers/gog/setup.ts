import { logInfo, LogPrefix } from 'backend/logger'

async function setup(appName: string, _installInfo?: unknown): Promise<void> {
  void _installInfo
  logInfo(
    `Setup for ${appName} is handled by the external script`,
    LogPrefix.Gog
  )
}

export default setup
