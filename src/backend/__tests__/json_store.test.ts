import { dirSync } from 'tmp'

const tmpUserData = dirSync({ unsafeCleanup: true })
jest.mock('backend/constants/paths', () => ({
  get userDataPath() {
    return tmpUserData.name
  }
}))

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { JsonStore } from '../json_store'

let counter = 0
function freshStore(
  options: { cwd?: string; clearInvalidConfig?: boolean } = {}
) {
  const name = `store_${counter++}`
  return {
    store: new JsonStore({ name, ...options }),
    filePath: join(
      options.cwd ? join(tmpUserData.name, options.cwd) : tmpUserData.name,
      `${name}.json`
    ),
    name
  }
}

describe('JsonStore - file location', () => {
  test('resolves a relative cwd against userDataPath, like electron-store did', () => {
    const { store, filePath } = freshStore({ cwd: 'store_cache' })
    store.set('foo', 'bar')

    expect(filePath.startsWith(join(tmpUserData.name, 'store_cache'))).toBe(
      true
    )
    expect(existsSync(filePath)).toBe(true)
  })

  test('uses an absolute cwd as-is', () => {
    const absolute = dirSync({ unsafeCleanup: true })
    const store = new JsonStore({ cwd: absolute.name, name: 'abs' })
    store.set('foo', 'bar')

    expect(existsSync(join(absolute.name, 'abs.json'))).toBe(true)
  })

  test("defaults the file name to 'config'", () => {
    const store = new JsonStore({ cwd: 'defaults_check' })
    store.set('foo', 'bar')

    expect(
      existsSync(join(tmpUserData.name, 'defaults_check', 'config.json'))
    ).toBe(true)
  })

  test('reading a store whose file does not exist yields an empty store', () => {
    const { store } = freshStore()

    expect(store.store).toEqual({})
    expect(store.get('anything')).toBeUndefined()
    expect(store.has('anything')).toBe(false)
  })
})

describe('JsonStore - dot notation', () => {
  test('gets and sets nested keys', () => {
    const { store } = freshStore()
    store.set('games.recent', [{ appName: 'a' }])

    expect(store.get('games.recent')).toEqual([{ appName: 'a' }])
    expect(store.get('games')).toEqual({ recent: [{ appName: 'a' }] })
  })

  test('creates missing intermediate objects', () => {
    const { store } = freshStore()
    store.set('a.b.c', 1)

    expect(store.store).toEqual({ a: { b: { c: 1 } } })
  })

  test('has() walks the full path', () => {
    const { store } = freshStore()
    store.set('userData.username', 'someone')

    expect(store.has('userData.username')).toBe(true)
    expect(store.has('userData')).toBe(true)
    expect(store.has('userData.missing')).toBe(false)
    expect(store.has('missing.username')).toBe(false)
  })

  test('delete() removes only the leaf', () => {
    const { store } = freshStore()
    store.set('games.recent', [1])
    store.set('games.hidden', [2])
    store.delete('games.recent')

    expect(store.has('games.recent')).toBe(false)
    expect(store.get('games.hidden')).toEqual([2])
  })

  test('does not treat a non-object on the path as traversable', () => {
    const { store } = freshStore()
    store.set('a', 'scalar')

    expect(store.get('a.b')).toBeUndefined()
    expect(store.has('a.b')).toBe(false)
  })

  test('overwrites a scalar when setting through it', () => {
    const { store } = freshStore()
    store.set('a', 'scalar')
    store.set('a.b', 1)

    expect(store.store).toEqual({ a: { b: 1 } })
  })

  test('ignores writes that would reach Object.prototype', () => {
    const { store } = freshStore()
    store.set('__proto__.polluted', true)
    store.set('constructor.prototype.polluted', true)

    expect(store.store).toEqual({})
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})

describe('JsonStore - defaults and values', () => {
  test('get() falls back to the default only when the key is absent', () => {
    const { store } = freshStore()

    expect(store.get('missing', 'fallback')).toBe('fallback')

    store.set('present', false)
    expect(store.get('present', 'fallback')).toBe(false)

    store.set('zero', 0)
    expect(store.get('zero', 'fallback')).toBe(0)
  })

  test('clear() empties the store but keeps the file readable', () => {
    const { store, filePath } = freshStore()
    store.set('foo', 'bar')
    store.clear()

    expect(store.store).toEqual({})
    expect(JSON.parse(readFileSync(filePath, 'utf-8'))).toEqual({})
  })
})

describe('JsonStore - file format and coherence', () => {
  test('writes tab-indented JSON with no trailing newline, as electron-store did', () => {
    const { store, filePath } = freshStore()
    store.set('userHome', '/home/deck')

    const raw = readFileSync(filePath, 'utf-8')
    expect(raw).toBe('{\n\t"userHome": "/home/deck"\n}')
  })

  test('reads a file written by electron-store unchanged', () => {
    const name = 'legacy'
    const legacy =
      '{\n\t"userHome": "/home/deck",\n\t"games": {\n\t\t"recent": []\n\t}\n}'
    writeFileSync(join(tmpUserData.name, `${name}.json`), legacy, 'utf-8')

    const store = new JsonStore({ name })
    expect(store.get('userHome')).toBe('/home/deck')
    expect(store.get('games.recent')).toEqual([])
  })

  test('a second instance over the same file sees writes from the first', () => {
    // The backend and the preload each open their own instance of the same store
    const name = 'shared'
    const a = new JsonStore({ name })
    const b = new JsonStore({ name })

    a.set('language', 'es')
    expect(b.get('language')).toBe('es')

    b.set('language', 'en')
    expect(a.get('language')).toBe('en')
  })

  test('is iterable over top-level entries, so `new Map(store)` works', () => {
    const { store } = freshStore()
    store.set('a', 1)
    store.set('b', 2)

    expect(new Map(store)).toEqual(
      new Map([
        ['a', 1],
        ['b', 2]
      ])
    )
  })

  test('the store setter replaces the whole contents', () => {
    const { store } = freshStore()
    store.set('old', true)
    store.store = { fresh: true }

    expect(store.store).toEqual({ fresh: true })
  })
})

describe('JsonStore - invalid JSON', () => {
  test('clearInvalidConfig treats a corrupt file as empty', () => {
    const name = 'corrupt_tolerated'
    writeFileSync(join(tmpUserData.name, `${name}.json`), '{ not json', 'utf-8')

    const store = new JsonStore({ name, clearInvalidConfig: true })
    expect(store.store).toEqual({})
  })

  test('without clearInvalidConfig a corrupt file throws', () => {
    const name = 'corrupt_strict'
    writeFileSync(join(tmpUserData.name, `${name}.json`), '{ not json', 'utf-8')

    const store = new JsonStore({ name })
    expect(() => store.store).toThrow()
  })

  test('a JSON file holding a non-object is treated as empty', () => {
    const name = 'array_file'
    mkdirSync(tmpUserData.name, { recursive: true })
    writeFileSync(join(tmpUserData.name, `${name}.json`), '[1,2,3]', 'utf-8')

    expect(new JsonStore({ name }).store).toEqual({})
  })
})
