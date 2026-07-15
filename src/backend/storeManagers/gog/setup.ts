import { logInfo, LogPrefix } from 'backend/logger'

async function setup(
  appName: string,
  installInfo?: unknown,
  installRedist = true
): Promise<void> {
  logInfo(`Setup for ${appName} is handled by the external script`, LogPrefix.Gog)
}

export default setup
