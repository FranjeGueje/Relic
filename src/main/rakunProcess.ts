import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Ownership } from '../shared/bridge'
import { userEnv } from './paths'

export type ExecResult = { code: number; output: string; missing: boolean }
export type Exec = (
  file: string,
  args: string[],
  timeoutMs: number
) => Promise<ExecResult>

export const runProgram: Exec = (file, args, timeoutMs) =>
  new Promise((resolve) => {
    execFile(
      file,
      args,
      { timeout: timeoutMs, env: userEnv },
      (error, stdout, stderr) => {
        const code = error
          ? typeof error.code === 'number'
            ? error.code
            : 1
          : 0
        resolve({
          code,
          output: `${stdout}${stderr}`.trim(),
          missing: error?.code === 'ENOENT'
        })
      }
    )
  })

/** Where `install.sh` leaves rakunctl, then whatever the PATH has. Never a path from the interface. */
export function controlCandidates(home = homedir()): string[] {
  return [join(home, '.local', 'opt', 'rakun', 'rakunctl'), 'rakunctl']
}

/** The fixed path if it is there, else the bare name (the PATH decides; a miss is reported by `start`) */
export function findControl(
  exists: (path: string) => boolean = existsSync,
  candidates: string[] = controlCandidates()
): string {
  const [fixed, bare] = candidates
  return exists(fixed) ? fixed : bare
}

export type StartReply = { ok: true } | { ok: false; error: string }
export type StopOutcome = 'stopped' | 'left'

const START_TIMEOUT_MS = 20_000
const STOP_TIMEOUT_MS = 10_000
const NOT_FOUND = 'rakunctl not found: install rakun with its install.sh'

/**
 * Starts and stops rakun through `rakunctl`, which knows how to wait for it and
 * refuses to stop it while it downloads. The client only stops a rakun it started.
 */
export class RakunProcess {
  private started = false

  constructor(
    private readonly exec: Exec = runProgram,
    private readonly find: () => string = findControl
  ) {}

  /** rakun was stopped when the client started it, so the client closes it on exit */
  get ownership(): Ownership {
    return this.started ? 'cli' : 'none'
  }

  /** `wasStopped`: rakun did not answer when it was asked for. If it did, it is not ours. */
  async start(wasStopped: boolean): Promise<StartReply> {
    const result = await this.exec(this.find(), ['start'], START_TIMEOUT_MS)
    if (result.missing) return { ok: false, error: NOT_FOUND }
    if (result.code !== 0)
      return {
        ok: false,
        error: result.output || `rakunctl start failed (${result.code})`
      }
    this.started = this.started || wasStopped
    return { ok: true }
  }

  /** `left` also when rakunctl refuses (it is downloading) or fails: it is then better left running */
  async stopIfOurs(): Promise<StopOutcome> {
    if (!this.started) return 'left'
    const result = await this.exec(this.find(), ['stop'], STOP_TIMEOUT_MS)
    if (result.code !== 0) return 'left'
    this.started = false
    return 'stopped'
  }
}
