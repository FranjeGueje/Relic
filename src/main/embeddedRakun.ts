import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ConnectionState } from '../shared/channels'
import type { Ownership } from '../shared/bridge'
import { userEnv } from './paths'
import type { StartReply, StopOutcome } from './rakunProcess'

/** How the app starts, stops and tells apart the rakun it runs: `rakunctl`'s, or the embedded one */
export type RakunController = {
  readonly ownership: Ownership
  /** `wasStopped`: rakun did not answer when it was asked for. If it did, it is not ours. */
  start: (wasStopped: boolean) => Promise<StartReply>
  stopIfOurs: () => Promise<StopOutcome>
}

/** rakun is a bundled script that runs on Electron's own Node; here is where the package puts it */
export function embeddedScriptPath(
  resourcesPath: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
  exists: (path: string) => boolean = existsSync
): string | undefined {
  const candidates = [
    env.RELIC_RAKUN_CJS,
    resourcesPath && join(resourcesPath, 'rakun', 'rakun.cjs')
  ]
  return candidates.find((path): path is string => !!path && exists(path))
}

/** Start it once, on its own, when it does not answer and there is one inside */
export function shouldAutostart(
  connection: ConnectionState,
  hasEmbedded: boolean,
  tried: boolean
): boolean {
  return hasEmbedded && !tried && connection === 'offline'
}

/** What `child_process.spawn` gives back, as far as this class uses it */
export type Child = Pick<ChildProcess, 'kill' | 'once' | 'exitCode' | 'stderr'>
export type Spawn = (
  file: string,
  args: string[],
  env: NodeJS.ProcessEnv
) => Child

export const spawnChild: Spawn = (file, args, env) =>
  spawn(file, args, { env, stdio: ['ignore', 'ignore', 'pipe'] })

/** Long enough for rakun to fail at start (port taken, bad Node), short enough to answer the button */
const EARLY_EXIT_MS = 1500
const STOP_GRACE_MS = 10_000

/**
 * rakun inside the app: the same Electron binary, run as plain Node on `rakun.cjs`
 * (`ELECTRON_RUN_AS_NODE`). It is a child of the app and dies with it: the app waits
 * for it before it exits, since a process left behind would keep the AppImage mounted.
 */
export class EmbeddedRakun implements RakunController {
  private child: Child | undefined

  constructor(
    private readonly script: string,
    private readonly run: Spawn = spawnChild,
    private readonly execPath: string = process.execPath,
    private readonly graceMs: number = STOP_GRACE_MS
  ) {}

  get ownership(): Ownership {
    return this.child ? 'embedded' : 'none'
  }

  async start(wasStopped: boolean): Promise<StartReply> {
    if (this.child) return { ok: true }
    if (!wasStopped) return { ok: true }
    const env: NodeJS.ProcessEnv = {
      ...userEnv,
      ELECTRON_RUN_AS_NODE: '1'
    }
    delete env.LD_PRELOAD
    delete env.LD_LIBRARY_PATH
    // The web is the client's job here; and `--web=off` does not change the saved setting
    const child = this.run(this.execPath, [this.script, '--web=off'], env)
    let output = ''
    child.stderr?.on('data', (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-2000)
    })
    this.child = child
    child.once('exit', () => {
      if (this.child === child) this.child = undefined
    })
    const early = await new Promise<number | undefined>((resolve) => {
      const timer = setTimeout(() => resolve(undefined), EARLY_EXIT_MS)
      child.once('exit', (code) => {
        clearTimeout(timer)
        resolve(code ?? 1)
      })
      child.once('error', () => {
        clearTimeout(timer)
        resolve(1)
      })
    })
    if (early === undefined) return { ok: true }
    this.child = undefined
    return {
      ok: false,
      error: output.trim() || `rakun stopped right after starting (${early})`
    }
  }

  async stopIfOurs(): Promise<StopOutcome> {
    const child = this.child
    if (!child) return 'left'
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        child.kill('SIGKILL')
      }, this.graceMs)
      child.once('exit', () => {
        clearTimeout(timer)
        resolve()
      })
      if (child.exitCode !== null) {
        clearTimeout(timer)
        resolve()
      } else child.kill('SIGTERM')
    })
    this.child = undefined
    return 'stopped'
  }
}
