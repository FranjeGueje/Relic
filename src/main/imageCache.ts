import { createHash } from 'node:crypto'
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'

const TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg'
}
const EXTENSIONS = Object.fromEntries(
  Object.entries(TYPES).map(([type, extension]) => [extension, type])
)

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const TRIM_EVERY = 50

type Options = {
  dir: string
  /** Where the pictures come from when they are not on the disk */
  fetch: (url: string) => Promise<Response>
  maxBytes?: number
  ttlMs?: number
  now?: () => number
  /** A smaller copy of a picture, or undefined when it cannot be made smaller */
  shrink?: (bytes: Buffer, type: string) => Buffer | undefined
  /** Wait between one shrink and the next, so they do not hog the app */
  shrinkGapMs?: number
}

/**
 * A disk cache of the store pictures (covers), so the library shows them without a connection and
 * does not download them again on every start. Cache first; a copy older than `ttlMs` is looked up
 * again and, if the network fails, the old one is still served. The disk never breaks a load:
 * any error there falls through to the network.
 */
export class ImageCache {
  private readonly dir: string
  private readonly fetchImage: Options['fetch']
  private readonly maxBytes: number
  private readonly ttlMs: number
  private readonly now: () => number
  private readonly shrinkImage: Options['shrink']
  private readonly shrinkGapMs: number
  private readonly shrinkQueue: Array<() => void> = []
  private shrinking: Promise<void> | undefined
  private readonly inFlight = new Map<string, Promise<Response>>()
  private writes = 0

  constructor(options: Options) {
    this.dir = options.dir
    this.fetchImage = options.fetch
    this.maxBytes = options.maxBytes ?? 300 * 1024 * 1024
    this.ttlMs = options.ttlMs ?? 30 * 24 * 60 * 60 * 1000
    this.now = options.now ?? Date.now
    this.shrinkImage = options.shrink
    this.shrinkGapMs = options.shrinkGapMs ?? 50
  }

  async respond(url: string): Promise<Response> {
    const key = createHash('sha256').update(url).digest('hex')
    const shared = this.inFlight.get(key)
    // Everyone asking for the same picture at once gets a copy of one answer
    if (shared) return (await shared).clone()
    const pending = this.lookUp(url, key)
    this.inFlight.set(key, pending)
    try {
      return (await pending).clone()
    } finally {
      this.inFlight.delete(key)
    }
  }

  private async lookUp(url: string, key: string): Promise<Response> {
    const stored = this.read(key)
    if (stored && this.now() - stored.time < this.ttlMs)
      return this.serve(stored)
    try {
      const response = await this.fetchImage(url)
      return await this.keep(response, key)
    } catch (error) {
      if (stored) return this.serve(stored)
      throw error
    }
  }

  /** Saves a good answer and returns it; any other answer goes by untouched */
  private async keep(response: Response, key: string): Promise<Response> {
    const type = (response.headers.get('content-type') ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase()
    const extension = TYPES[type]
    if (!response.ok || !extension) return response
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length <= MAX_IMAGE_BYTES) this.write(key, extension, bytes, type)
    return new Response(bytes, { headers: { 'content-type': type } })
  }

  private serve(stored: { bytes: Buffer; type: string }): Response {
    return new Response(stored.bytes, {
      headers: { 'content-type': stored.type }
    })
  }

  private read(key: string) {
    try {
      const name = readdirSync(this.dir).find(
        (file) => file.startsWith(`${key}.`) && !file.endsWith('.tmp')
      )
      if (!name) return undefined
      const path = join(this.dir, name)
      const bytes = readFileSync(path)
      const time = statSync(path).mtimeMs
      // A hit counts as use for the eviction, not as a fresh copy
      const used = new Date(this.now())
      utimesSync(path, used, new Date(time))
      return {
        bytes,
        time,
        type: EXTENSIONS[name.slice(key.length + 1)] ?? 'image/png'
      }
    } catch {
      return undefined
    }
  }

  private write(key: string, extension: string, bytes: Buffer, type: string) {
    try {
      mkdirSync(this.dir, { recursive: true })
      const path = join(this.dir, `${key}.${extension}`)
      const temporary = `${path}.${process.pid}.tmp`
      writeFileSync(temporary, bytes)
      renameSync(temporary, path)
      // The same picture under another type (it was replaced): only the new one stays
      for (const other of readdirSync(this.dir))
        if (other.startsWith(`${key}.`) && other !== `${key}.${extension}`)
          rmSync(join(this.dir, other), { force: true })
      const now = new Date(this.now())
      utimesSync(path, now, now)
      if (this.shrinkImage) this.queueShrink(path, type)
      if (++this.writes % TRIM_EVERY === 0) this.trim()
    } catch {
      // the picture still reaches the page
    }
  }

  /**
   * The page already has the original: a smaller copy replaces the saved one later, one picture
   * at a time with a pause between, so the cache holds many more covers in the same space.
   */
  private queueShrink(path: string, type: string) {
    this.shrinkQueue.push(() => {
      try {
        // Read now, not kept in memory while it waits its turn
        const bytes = readFileSync(path)
        const smaller = this.shrinkImage?.(bytes, type)
        if (!smaller || smaller.length >= bytes.length) return
        const temporary = `${path}.${process.pid}.tmp`
        writeFileSync(temporary, smaller)
        renameSync(temporary, path)
      } catch {
        // the original stays
      }
    })
    this.shrinking ??= this.drainShrinks()
  }

  private async drainShrinks(): Promise<void> {
    let task = this.shrinkQueue.shift()
    while (task) {
      await new Promise((resolve) => setTimeout(resolve, this.shrinkGapMs))
      task()
      task = this.shrinkQueue.shift()
    }
    this.shrinking = undefined
  }

  /** Resolves when no shrink is waiting (for the tests) */
  async idle(): Promise<void> {
    while (this.shrinking) await this.shrinking
  }

  /** Deletes the least recently used pictures until the folder fits in `maxBytes` */
  trim(): void {
    try {
      const files = readdirSync(this.dir).flatMap((name) => {
        try {
          const stat = statSync(join(this.dir, name))
          return [{ name, size: stat.size, used: stat.atimeMs }]
        } catch {
          return []
        }
      })
      let total = files.reduce((sum, file) => sum + file.size, 0)
      for (const file of files.sort((a, b) => a.used - b.used)) {
        if (total <= this.maxBytes) break
        rmSync(join(this.dir, file.name), { force: true })
        total -= file.size
      }
    } catch {
      // nothing to trim
    }
  }
}
