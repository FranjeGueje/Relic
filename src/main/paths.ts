import { rmSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The environment the person started the app with. The AppImage's `AppRun` has to move
 * `XDG_CACHE_HOME` before Electron starts (the GPU driver writes its cache before any of
 * our code runs) and keeps the original in `RELIC_USER_XDG_CACHE_HOME`.
 */
export function restoreUserEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const restored = { ...env }
  const saved = restored.RELIC_USER_XDG_CACHE_HOME
  if (saved !== undefined) {
    if (saved) restored.XDG_CACHE_HOME = saved
    else delete restored.XDG_CACHE_HOME
    delete restored.RELIC_USER_XDG_CACHE_HOME
  }
  return restored
}

/**
 * What the programs the app runs for the person (`rakunctl`, and the rakun it starts) get:
 * they keep their own folders. Taken when this module loads, before the app redirects
 * `XDG_CACHE_HOME` and `XDG_DATA_HOME` itself.
 */
export const userEnv = restoreUserEnv(process.env)

/**
 * Where everything the app writes while it runs goes (Electron's user data, caches,
 * logs, and the GPU driver's shader cache). `XDG_RUNTIME_DIR` is a tmpfs that the
 * system empties on logout, so a crash leaves nothing behind in the home folder.
 */
export function ephemeralDir(
  env: Record<string, string | undefined>,
  tmp: string
): string {
  return join(env.XDG_RUNTIME_DIR || tmp, 'relic')
}

/** The folders under `ephemeralDir`, one per kind of file */
export function ephemeralPaths(dir: string) {
  return {
    userData: join(dir, 'userData'),
    sessionData: join(dir, 'sessionData'),
    cache: join(dir, 'cache'),
    logs: join(dir, 'logs'),
    crashDumps: join(dir, 'crashDumps'),
    mesa: join(dir, 'mesa'),
    // Chromium's NSS certificate database and the GPU drivers' caches ignore Electron's
    // paths and follow these two
    xdgCache: join(dir, 'xdgCache'),
    xdgData: join(dir, 'xdgData')
  }
}

export function removeEphemeral(dir: string): void {
  rmSync(dir, { recursive: true, force: true })
}
