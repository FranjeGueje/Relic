import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from 'fs'
import { dirname, isAbsolute, join } from 'path'
import { userDataPath } from './constants/paths'
import type { StoreOptions } from 'common/types/electron_store'

type StoreData = Record<string, unknown>

// Assigning through these would let a crafted key reach Object.prototype.
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype'])

function isPlainObject(value: unknown): value is StoreData {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Keys are split on every '.', matching electron-store's default
// `accessPropertiesByDotNotation`. Escaping ('a\.b') is deliberately not
// supported: no store in Relic relies on it.
function readPath(data: StoreData, path: string): unknown {
  let current: unknown = data
  for (const segment of path.split('.')) {
    if (!isPlainObject(current)) return undefined
    current = current[segment]
  }
  return current
}

function pathExists(data: StoreData, path: string): boolean {
  let current: unknown = data
  for (const segment of path.split('.')) {
    if (!isPlainObject(current) || !Object.hasOwn(current, segment))
      return false
    current = current[segment]
  }
  return true
}

function writePath(data: StoreData, path: string, value: unknown): void {
  const segments = path.split('.')
  if (segments.some((segment) => FORBIDDEN_SEGMENTS.has(segment))) return

  let current = data
  for (const segment of segments.slice(0, -1)) {
    if (!isPlainObject(current[segment])) {
      current[segment] = {}
    }
    current = current[segment] as StoreData
  }
  current[segments[segments.length - 1]] = value
}

function deletePath(data: StoreData, path: string): void {
  const segments = path.split('.')
  let current: unknown = data
  for (const segment of segments.slice(0, -1)) {
    if (!isPlainObject(current)) return
    current = current[segment]
  }
  if (isPlainObject(current)) {
    delete current[segments[segments.length - 1]]
  }
}

/**
 * Persistent JSON store, replacing electron-store.
 *
 * Keeps the subset of its behaviour Relic actually used: dot-notation keys,
 * `cwd`/`name`/`clearInvalidConfig`, iteration over top-level entries, and a
 * readable/writable `store` property. Files stay byte-compatible with what
 * electron-store wrote (tab-indented, no trailing newline).
 *
 * Like electron-store (really `conf`, underneath), the file is re-read on every
 * access rather than cached. Relic depends on that: the backend and the preload
 * open separate instances over the same files, and a write through one has to be
 * visible to the other.
 */
export class JsonStore {
  private readonly filePath: string
  private readonly clearInvalidConfig: boolean

  constructor(options: StoreOptions = {}) {
    const cwd = options.cwd
    const directory = !cwd
      ? userDataPath
      : isAbsolute(cwd)
        ? cwd
        : join(userDataPath, cwd)

    this.filePath = join(directory, `${options.name ?? 'config'}.json`)
    this.clearInvalidConfig = options.clearInvalidConfig ?? false
  }

  private read(): StoreData {
    if (!existsSync(this.filePath)) return {}

    try {
      const parsed: unknown = JSON.parse(readFileSync(this.filePath, 'utf-8'))
      return isPlainObject(parsed) ? parsed : {}
    } catch (error) {
      if (this.clearInvalidConfig) return {}
      throw error
    }
  }

  private write(data: StoreData): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    // Write-then-rename so a crash can't leave a half-written config behind.
    // Both paths share a directory, so the rename is atomic.
    const tempPath = `${this.filePath}.tmp`
    writeFileSync(tempPath, JSON.stringify(data, null, '\t'), 'utf-8')
    renameSync(tempPath, this.filePath)
  }

  public get(key: string): unknown
  public get(key: string, defaultValue: unknown): unknown
  public get(key: string, defaultValue?: unknown): unknown {
    const value = readPath(this.read(), key)
    return value === undefined ? defaultValue : value
  }

  public set(key: string, value: unknown): void {
    const data = this.read()
    writePath(data, key, value)
    this.write(data)
  }

  public has(key: string): boolean {
    return pathExists(this.read(), key)
  }

  public delete(key: string): void {
    const data = this.read()
    deletePath(data, key)
    this.write(data)
  }

  public clear(): void {
    this.write({})
  }

  public get store(): StoreData {
    return this.read()
  }

  public set store(value: StoreData) {
    this.write(value)
  }

  public *[Symbol.iterator](): IterableIterator<[string, unknown]> {
    yield* Object.entries(this.read())
  }
}
