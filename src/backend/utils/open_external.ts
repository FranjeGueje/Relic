import { spawn } from 'child_process'
import { logError, LogPrefix } from 'backend/logger'

/**
 * Hands a URL or a local path to the desktop's default handler, replacing
 * Electron's `shell.openExternal` and `shell.openPath`. `xdg-open` covers both,
 * so callers no longer need to pick between them.
 *
 * Never rejects: failing to open a browser or a file manager is not worth
 * propagating an error for. Problems are logged instead.
 *
 * Deliberately uses `child_process` directly rather than `spawnAsync` from
 * `backend/utils`, so that the `relic/` modules can use it without pulling in
 * the whole utils barrel.
 */
export function openExternal(target: string): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn('xdg-open', [target], { stdio: 'ignore' })

    child.on('error', (error) => {
      logError(
        [`Failed to run xdg-open for "${target}":`, error],
        LogPrefix.Backend
      )
      resolve()
    })

    child.on('close', (code) => {
      if (code !== 0) {
        logError(
          `xdg-open exited with code ${code} for "${target}"`,
          LogPrefix.Backend
        )
      }
      resolve()
    })
  })
}
