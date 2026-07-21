import { getUmuPath } from 'backend/utils/compatibility_layers'
import { logInfo, logError } from 'backend/logger'
import { spawn } from 'child_process'

const LOG_PREFIX = 'UMU'

export interface UmuLaunchOptions {
  winePrefix: string
  gameId: string
  protonPath: string
  store: string
  executable: string
  args?: string[]
}

export async function launchUmu(
  options: UmuLaunchOptions
): Promise<{ success: boolean; error?: string }> {
  const umuPath = await getUmuPath()
  if (!umuPath) {
    const error = 'umu-run not found on PATH or bundled with Relic. Install UMU system-wide.'
    logError(error, LOG_PREFIX)
    return { success: false, error }
  }

  const env: Record<string, string | undefined> = {
    ...process.env,
    WINEPREFIX: options.winePrefix,
    GAMEID: options.gameId,
    PROTONPATH: options.protonPath,
    STORE: options.store
  }

  logInfo(
    `Launching: WINEPREFIX=${options.winePrefix} GAMEID=${options.gameId} ` +
    `PROTONPATH=${options.protonPath} STORE=${options.store} ${umuPath} ${options.executable}`,
    LOG_PREFIX
  )

  return new Promise((resolve) => {
    const child = spawn(umuPath, [options.executable, ...(options.args || [])], { env, stdio: 'pipe' })

    let stderr = ''
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    child.on('close', (code) => {
      if (code === 0) {
        logInfo('umu-run completed successfully', LOG_PREFIX)
        resolve({ success: true })
      } else {
        const error = `umu-run exited with code ${code}: ${stderr}`
        resolve({ success: false, error })
      }
    })

    child.on('error', (err) => {
      logError(`Failed to spawn umu-run: ${err.message}`, LOG_PREFIX)
      resolve({ success: false, error: err.message })
    })
  })
}
