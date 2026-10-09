import { mkdtempSync, readdirSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import { ImageCache } from '../imageCache'

const png = (text = 'img') =>
  new Response(text, { headers: { 'content-type': 'image/png' } })

function setup(options: { maxBytes?: number; now?: () => number } = {}) {
  const dir = join(mkdtempSync(join(tmpdir(), 'rc-img-')), 'images')
  const fetch = vi.fn<(url: string) => Promise<Response>>(() =>
    Promise.resolve(png())
  )
  return { dir, fetch, cache: new ImageCache({ dir, fetch, ...options }) }
}

const text = async (response: Response) => response.text()

describe('ImageCache', () => {
  test('downloads a picture once and serves it from the disk after', async () => {
    const { cache, fetch } = setup()

    expect(await text(await cache.respond('https://cdn/a.png'))).toBe('img')
    const again = await cache.respond('https://cdn/a.png')

    expect(await text(again)).toBe('img')
    expect(again.headers.get('content-type')).toBe('image/png')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('a new cache object (the next start) still has it, even without a network', async () => {
    const { cache, dir } = setup()
    await cache.respond('https://cdn/a.png')

    const offline = new ImageCache({
      dir,
      fetch: () => Promise.reject(new Error('offline'))
    })
    expect(await text(await offline.respond('https://cdn/a.png'))).toBe('img')
    await expect(offline.respond('https://cdn/never.png')).rejects.toThrow(
      'offline'
    )
  })

  test('an old copy is looked up again, and still served if the network fails', async () => {
    let now = 1_000_000
    const { cache, fetch, dir } = setup({ now: () => now })
    await cache.respond('https://cdn/a.png')
    now += 31 * 24 * 60 * 60 * 1000
    fetch.mockResolvedValueOnce(png('new'))

    expect(await text(await cache.respond('https://cdn/a.png'))).toBe('new')
    expect(fetch).toHaveBeenCalledTimes(2)

    now += 31 * 24 * 60 * 60 * 1000
    const offline = new ImageCache({
      dir,
      now: () => now,
      fetch: () => Promise.reject(new Error('offline'))
    })
    expect(await text(await offline.respond('https://cdn/a.png'))).toBe('new')
  })

  test('keeps only good pictures', async () => {
    const { cache, fetch, dir } = setup()
    fetch.mockResolvedValueOnce(new Response('x', { status: 404 }))
    fetch.mockResolvedValueOnce(
      new Response('<html>', { headers: { 'content-type': 'text/html' } })
    )
    fetch.mockResolvedValueOnce(
      new Response(Buffer.alloc(9 * 1024 * 1024), {
        headers: { 'content-type': 'image/png' }
      })
    )

    expect((await cache.respond('https://cdn/missing.png')).status).toBe(404)
    expect(await text(await cache.respond('https://cdn/page'))).toBe('<html>')
    expect((await cache.respond('https://cdn/huge.png')).status).toBe(200)

    expect(() => readdirSync(dir)).toThrow() // nothing was written
  })

  test('asks the network once for the same picture at the same time', async () => {
    const { cache, fetch } = setup()

    const [first, second] = await Promise.all([
      cache.respond('https://cdn/a.png'),
      cache.respond('https://cdn/a.png')
    ])

    expect(await text(first)).toBe('img')
    expect(await text(second)).toBe('img')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('trim deletes the least recently used pictures down to the limit', async () => {
    const { cache, fetch, dir } = setup({ maxBytes: 7 })
    for (const name of ['a', 'b', 'c']) {
      fetch.mockResolvedValueOnce(png(`${name}${name}${name}`))
      await cache.respond(`https://cdn/${name}.png`)
    }
    const files = readdirSync(dir).sort()
    expect(files).toHaveLength(3)
    // make the order of use explicit: the one for `a` is the oldest
    const old = new Date(1000)
    for (const file of files) utimesSync(join(dir, file), old, new Date())
    await cache.respond('https://cdn/a.png') // used now

    cache.trim()

    const left = readdirSync(dir)
    expect(left).toHaveLength(2)
    expect(await text(await cache.respond('https://cdn/a.png'))).toBe('aaa')
  })

  test('a disk that cannot be written does not break the load', async () => {
    const { cache, dir } = setup()
    writeFileSync(
      dir.replace(/images$/, 'images'),
      'a file where the folder goes'
    )

    expect(await text(await cache.respond('https://cdn/a.png'))).toBe('img')
  })

  describe('shrinking what it saves', () => {
    test('serves the original now and saves a smaller copy later', async () => {
      const dir = join(mkdtempSync(join(tmpdir(), 'rc-img-')), 'images')
      const shrink = vi.fn(() => Buffer.from('s'))
      const cache = new ImageCache({
        dir,
        fetch: () => Promise.resolve(png('original')),
        shrink,
        shrinkGapMs: 0
      })

      expect(await text(await cache.respond('https://cdn/a.png'))).toBe(
        'original'
      )
      await cache.idle()

      expect(shrink).toHaveBeenCalledWith(Buffer.from('original'), 'image/png')
      expect(await text(await cache.respond('https://cdn/a.png'))).toBe('s')
      expect(readdirSync(dir)).toHaveLength(1) // no .tmp left
    })

    test('keeps the original when the copy is not smaller or cannot be made', async () => {
      for (const result of [
        Buffer.from('bigger than the original'),
        undefined
      ]) {
        const dir = join(mkdtempSync(join(tmpdir(), 'rc-img-')), 'images')
        const cache = new ImageCache({
          dir,
          fetch: () => Promise.resolve(png('orig')),
          shrink: () => result,
          shrinkGapMs: 0
        })
        await cache.respond('https://cdn/a.png')
        await cache.idle()
        expect(await text(await cache.respond('https://cdn/a.png'))).toBe(
          'orig'
        )
      }
    })

    test('a shrinker that throws does not break anything', async () => {
      const dir = join(mkdtempSync(join(tmpdir(), 'rc-img-')), 'images')
      const cache = new ImageCache({
        dir,
        fetch: () => Promise.resolve(png('orig')),
        shrink: () => {
          throw new Error('decode')
        },
        shrinkGapMs: 0
      })
      await cache.respond('https://cdn/a.png')
      await cache.idle()
      expect(await text(await cache.respond('https://cdn/a.png'))).toBe('orig')
    })

    test('does the shrinks one after another', async () => {
      const dir = join(mkdtempSync(join(tmpdir(), 'rc-img-')), 'images')
      let running = 0
      let most = 0
      const cache = new ImageCache({
        dir,
        fetch: (url) => Promise.resolve(png(`orig-${url}`)),
        shrink: () => {
          most = Math.max(most, ++running)
          running--
          return Buffer.from('s')
        },
        shrinkGapMs: 0
      })
      await Promise.all(
        ['a', 'b', 'c'].map((name) => cache.respond(`https://cdn/${name}.png`))
      )
      await cache.idle()
      expect(most).toBe(1)
      expect(readdirSync(dir)).toHaveLength(3)
    })
  })
})
