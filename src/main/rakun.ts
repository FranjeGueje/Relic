import { readFileSync } from 'node:fs'
import { request as httpRequest, type IncomingMessage } from 'node:http'
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { errorOf, parseSseBlock, splitBlocks } from '../shared/sse'
import {
  type ConnectionState,
  type LinkCallMap,
  type RakunEvent
} from '../shared/channels'

export type Credentials = { port: number; token: string }

/** rakun does not answer: it is stopped, or `api.json` is not there yet */
export class RakunOffline extends Error {}

/** `RAKUN_API_FILE`, or rakun's own `api.json` (it follows `XDG_CONFIG_HOME`) */
export function credentialsFile(env: NodeJS.ProcessEnv = process.env): string {
  if (env.RAKUN_API_FILE) return env.RAKUN_API_FILE
  const xdg = env.XDG_CONFIG_HOME
  const config = xdg && isAbsolute(xdg) ? xdg : join(homedir(), '.config')
  return join(config, 'rakun', 'api.json')
}

export function readCredentials(file = credentialsFile()): Credentials {
  let parsed: Partial<Credentials>
  try {
    parsed = JSON.parse(readFileSync(file, 'utf-8')) as Partial<Credentials>
  } catch {
    throw new RakunOffline(`rakun has no ${file} yet: is it running?`)
  }
  if (!parsed.port || !parsed.token)
    throw new RakunOffline(`${file} has no port and token`)
  return { port: parsed.port, token: parsed.token }
}

async function readBody(res: IncomingMessage): Promise<string> {
  res.setEncoding('utf8')
  let text = ''
  for await (const chunk of res) text += chunk as string
  return text
}

type Options = {
  credentials?: () => Credentials
  /** Wait before each reconnection; the last one repeats */
  retryDelays?: number[]
}

/** The link with rakun: calls, the event stream and whether it answers */
export class RakunLink {
  private readonly credentials: () => Credentials
  private readonly retryDelays: number[]
  private readonly eventListeners = new Set<(event: RakunEvent) => void>()
  private readonly stateListeners = new Set<(state: ConnectionState) => void>()
  private state: ConnectionState = 'connecting'
  private running = false
  private attempt = 0
  private timer: NodeJS.Timeout | undefined
  private stream: { destroy: () => void } | undefined

  constructor(options: Options = {}) {
    this.credentials = options.credentials ?? readCredentials
    this.retryDelays = options.retryDelays ?? [1000, 2000, 5000]
  }

  get connection(): ConnectionState {
    return this.state
  }

  onEvent(listener: (event: RakunEvent) => void): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  onConnection(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.connect()
  }

  /** Try now instead of waiting for the next retry: used right after rakun was started */
  retryNow(): void {
    if (!this.running || this.state === 'online') return
    clearTimeout(this.timer)
    this.stream?.destroy()
    this.attempt = 0
    this.connect()
  }

  stop(): void {
    this.running = false
    clearTimeout(this.timer)
    this.stream?.destroy()
    this.stream = undefined
  }

  async call<C extends keyof LinkCallMap>(
    channel: C,
    ...args: LinkCallMap[C]['args']
  ): Promise<LinkCallMap[C]['result']> {
    const res = await this.open('POST', `/api/${channel}`, { args }).response
    const body = await readBody(res)
    if (res.statusCode !== 200)
      throw new Error(errorOf(res.statusCode ?? 0, body))
    return (JSON.parse(body) as { result: LinkCallMap[C]['result'] }).result
  }

  /** The answer when it arrives, and a way to cut the request */
  private open(
    method: string,
    path: string,
    body?: unknown
  ): { cancel: () => void; response: Promise<IncomingMessage> } {
    let credentials: Credentials
    try {
      credentials = this.credentials()
    } catch (error) {
      const reason = error instanceof Error ? error : new Error(String(error))
      return { cancel: () => undefined, response: Promise.reject(reason) }
    }
    const { port, token } = credentials
    let cancel = () => undefined as void
    const response = new Promise<IncomingMessage>((resolve, reject) => {
      const req = httpRequest(
        {
          host: '127.0.0.1',
          port,
          method,
          path,
          headers: {
            'x-rakun-token': token,
            'content-type': 'application/json'
          }
        },
        resolve
      )
      req.once('error', () =>
        reject(new RakunOffline(`rakun does not answer on port ${port}`))
      )
      req.end(body === undefined ? undefined : JSON.stringify(body))
      cancel = () => req.destroy()
    })
    return { cancel, response }
  }

  private setState(state: ConnectionState): void {
    if (state === this.state) return
    this.state = state
    this.stateListeners.forEach((listener) => listener(state))
  }

  private retryLater(): void {
    this.setState('offline')
    if (!this.running) return
    const delay =
      this.retryDelays[Math.min(this.attempt, this.retryDelays.length - 1)]
    this.attempt++
    this.timer = setTimeout(() => this.connect(), delay)
  }

  private connect(): void {
    if (!this.running) return
    const { cancel, response } = this.open('GET', '/events')
    this.stream = { destroy: cancel }
    response.then((res) => this.follow(res)).catch(() => this.retryLater())
  }

  private follow(res: IncomingMessage): void {
    if (res.statusCode !== 200) {
      res.resume()
      return this.retryLater()
    }
    this.attempt = 0
    this.setState('online')
    res.setEncoding('utf8')
    let buffer = ''
    res.on('data', (chunk: string) => {
      const { blocks, rest } = splitBlocks(buffer + chunk)
      buffer = rest
      blocks.forEach((block) => this.dispatch(block))
    })
    res.once('close', () => this.retryLater())
    res.once('error', () => this.retryLater())
  }

  private dispatch(block: string): void {
    let event: RakunEvent | undefined
    try {
      event = parseSseBlock(block)
    } catch {
      return // a malformed block is not worth dropping the stream
    }
    if (event) this.eventListeners.forEach((listener) => listener(event))
  }
}
