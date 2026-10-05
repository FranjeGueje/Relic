import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { dirSync } from 'tmp'

const tmpConfig = dirSync({ unsafeCleanup: true })
const tmpCache = dirSync({ unsafeCleanup: true })
jest.mock('backend/constants/paths', () => ({
  get userDataPath() {
    return tmpConfig.name
  },
  get appFolder() {
    return tmpConfig.name
  },
  get storeCachePath() {
    return join(tmpCache.name, 'store_cache')
  },
  get imagesCachePath() {
    return join(tmpCache.name, 'images-cache')
  }
}))

import { MoveCacheToXdgMigration } from '../cache'

const oldStore = () => join(tmpConfig.name, 'store_cache')
const newStore = () => join(tmpCache.name, 'store_cache')
const oldImages = () => join(tmpConfig.name, 'images-cache')
const newImages = () => join(tmpCache.name, 'images-cache')

const seed = (dir: string, content = 'data') => {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'f.json'), content)
}

describe('MoveCacheToXdgMigration', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    for (const dir of [oldStore(), newStore(), oldImages(), newImages()]) {
      jest.requireActual('fs').rmSync(dir, { recursive: true, force: true })
    }
  })

  test('is a no-op when there is nothing to move', async () => {
    await expect(new MoveCacheToXdgMigration().run()).resolves.toBe(true)
    expect(existsSync(newStore())).toBe(false)
    expect(existsSync(newImages())).toBe(false)
  })

  test('moves old caches to the new location', async () => {
    seed(oldStore(), 'lib')
    seed(oldImages(), 'img')

    await expect(new MoveCacheToXdgMigration().run()).resolves.toBe(true)

    expect(existsSync(oldStore())).toBe(false)
    expect(existsSync(oldImages())).toBe(false)
    expect(readFileSync(join(newStore(), 'f.json'), 'utf-8')).toBe('lib')
    expect(readFileSync(join(newImages(), 'f.json'), 'utf-8')).toBe('img')
  })

  test('drops the stale copy when the destination already exists', async () => {
    seed(oldStore(), 'old')
    seed(newStore(), 'new')

    await new MoveCacheToXdgMigration().run()

    expect(existsSync(oldStore())).toBe(false)
    expect(readFileSync(join(newStore(), 'f.json'), 'utf-8')).toBe('new')
  })

  test('falls back to copy + delete when rename fails', async () => {
    seed(oldStore(), 'lib')
    const fs = jest.requireActual('fs')
    jest.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw Object.assign(new Error('cross-device'), { code: 'EXDEV' })
    })

    await new MoveCacheToXdgMigration().run()

    expect(existsSync(oldStore())).toBe(false)
    expect(readFileSync(join(newStore(), 'f.json'), 'utf-8')).toBe('lib')
  })
})
