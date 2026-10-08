import { mkdtempSync, writeFileSync } from 'node:fs'
import { createServer, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import type { ConnectionState, RakunEvent } from '../../shared/channels'
import {
  credentialsFile,
  readCredentials,
  RakunLink,
  RakunOffline
} from '../rakun'

const TOKEN = 'secret'
let server: Server | undefined
let link: RakunLink | undefined
const open: ServerResponse[] = []

afterEach(async () => {
  link?.stop()
  link = undefined
  open.splice(0).forEach((res) => res.destroy())
  await new Promise((resolve) => (server ? server.close(resolve) : resolve(0)))
  server = undefined
})

async function listen(
  handler: Parameters<typeof createServer>[1]
): Promise<number> {
  server = createServer(handler)
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve))
  return (server.address() as AddressInfo).port
}

const linkTo = (port: number) =>
  new RakunLink({
    credentials: () => ({ port, token: TOKEN }),
    retryDelays: [10]
  })

async function until(check: () => boolean, ms = 2000): Promise<void> {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > ms) throw new Error('timed out waiting')
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

describe('credentials', () => {
  test('RAKUN_API_FILE wins, then XDG_CONFIG_HOME, then ~/.config', () => {
    expect(credentialsFile({ RAKUN_API_FILE: '/x/api.json' })).toBe(
      '/x/api.json'
    )
    expect(credentialsFile({ XDG_CONFIG_HOME: '/cfg' })).toBe(
      '/cfg/rakun/api.json'
    )
    expect(credentialsFile({ XDG_CONFIG_HOME: 'relative' })).toMatch(
      /\.config\/rakun\/api\.json$/
    )
  })

  test('reads the port and token', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'rc-')), 'api.json')
    writeFileSync(file, JSON.stringify({ port: 1234, token: 'abc' }))
    expect(readCredentials(file)).toEqual({ port: 1234, token: 'abc' })
  })

  test('a missing or incomplete file means rakun is not there', () => {
    expect(() => readCredentials('/no/such/api.json')).toThrow(RakunOffline)
    const file = join(mkdtempSync(join(tmpdir(), 'rc-')), 'api.json')
    writeFileSync(file, '{"port": 1}')
    expect(() => readCredentials(file)).toThrow(RakunOffline)
  })
})

describe('call', () => {
  test('sends the token and the arguments and gives back the result', async () => {
    let seen: { token?: string; url?: string; body?: string } = {}
    const port = await listen((req, res) => {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        seen = {
          token: req.headers['x-rakun-token'] as string,
          url: req.url,
          body
        }
        res.setHeader('content-type', 'application/json')
        res.end(
          JSON.stringify({ result: [{ id: 'gog', name: 'gog', label: 'GOG' }] })
        )
      })
    })

    const result = await linkTo(port).call('getLibrary', 'all')

    expect(result).toEqual([{ id: 'gog', name: 'gog', label: 'GOG' }])
    expect(seen).toEqual({
      token: TOKEN,
      url: '/api/getLibrary',
      body: JSON.stringify({ args: ['all'] })
    })
  })

  test('rakun refusing says why', async () => {
    const port = await listen((_req, res) => {
      res.statusCode = 500
      res.end(
        JSON.stringify({ error: 'already installed: use repair or update' })
      )
    })

    await expect(linkTo(port).call('requestAppSettings')).rejects.toThrow(
      'already installed: use repair or update'
    )
  })

  test('a status with no JSON body still says something', async () => {
    const port = await listen((_req, res) => {
      res.statusCode = 403
      res.end('nope')
    })

    await expect(linkTo(port).call('requestAppSettings')).rejects.toThrow('403')
  })

  test('nobody listening is RakunOffline', async () => {
    const port = await listen(() => undefined)
    await new Promise((resolve) => server?.close(resolve))
    server = undefined

    await expect(
      linkTo(port).call('requestAppSettings')
    ).rejects.toBeInstanceOf(RakunOffline)
  })
})

describe('events', () => {
  test('reports the events, also when a block arrives in pieces', async () => {
    const port = await listen((_req, res) => {
      open.push(res)
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      res.write(': connected\n\n')
      res.write('event: gameStatusUpdate\ndata: [{"appName":')
      setTimeout(() => res.write('"g1","status":"installing"}]\n\n'), 20)
      setTimeout(
        () => res.write(': ping\n\nevent: refreshLibrary\ndata: ["gog"]\n\n'),
        40
      )
    })
    link = linkTo(port)
    const events: RakunEvent[] = []
    link.onEvent((event) => events.push(event))

    link.start()
    await until(() => events.length === 2)

    expect(events).toEqual([
      {
        event: 'gameStatusUpdate',
        args: [{ appName: 'g1', status: 'installing' }]
      },
      { event: 'refreshLibrary', args: ['gog'] }
    ])
  })

  test('goes online, offline when rakun stops, and online again when it is back', async () => {
    let up = true
    const port = await listen((_req, res) => {
      if (!up) return res.destroy()
      open.push(res)
      res.writeHead(200)
      res.write(': connected\n\n')
    })
    link = linkTo(port)
    const states: ConnectionState[] = []
    link.onConnection((state) => states.push(state))

    link.start()
    await until(() => states.includes('online'))
    up = false
    open.splice(0).forEach((res) => res.destroy())
    await until(() => states.includes('offline'))
    up = true
    await until(() => states.filter((s) => s === 'online').length === 2)

    expect(states).toEqual(['online', 'offline', 'online'])
    expect(link.connection).toBe('online')
  })

  test('a refused token keeps it offline and retrying', async () => {
    let tries = 0
    const port = await listen((_req, res) => {
      tries++
      res.statusCode = 401
      res.end()
    })
    link = linkTo(port)

    link.start()
    await until(() => tries >= 3)

    expect(link.connection).toBe('offline')
  })

  test('stop ends the retries', async () => {
    let tries = 0
    const port = await listen((_req, res) => {
      tries++
      res.statusCode = 401
      res.end()
    })
    link = linkTo(port)
    link.start()
    await until(() => tries >= 2)

    link.stop()
    const seen = tries
    await new Promise((resolve) => setTimeout(resolve, 80))

    expect(tries).toBe(seen)
  })

  test('retryNow reconnects at once instead of waiting for the next retry', async () => {
    let up = false
    const port = await listen((_req, res) => {
      if (!up) return res.destroy()
      open.push(res)
      res.writeHead(200)
      res.write(': connected\n\n')
    })
    // a retry that would take a minute: only retryNow can make it quick
    link = new RakunLink({
      credentials: () => ({ port, token: TOKEN }),
      retryDelays: [60_000]
    })
    const states: ConnectionState[] = []
    link.onConnection((state) => states.push(state))
    link.start()
    await until(() => states.includes('offline'))

    up = true
    link.retryNow()
    await until(() => states.includes('online'))
    expect(link.connection).toBe('online')
  })
})
