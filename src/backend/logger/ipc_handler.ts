import { addHandler, addListener } from 'backend/ipc'
import { existsSync, readFileSync } from 'graceful-fs'

import { logInfo, logError, LogPrefix } from '.'
import { getLogFilePath } from './paths'

addListener('logInfo', (e, message) => logInfo(message, LogPrefix.Frontend))
addListener('logError', (e, message) => logError(message, LogPrefix.Frontend))

addHandler('getLogContent', (event, appNameOrRunner) => {
  const logPath = getLogFilePath(appNameOrRunner)
  return existsSync(logPath) ? readFileSync(logPath, 'utf-8') : ''
})
