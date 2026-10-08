import { describe, expect, test } from 'vitest'
import type { GameInfo, GameStatus } from '../../../shared/types'
import { initialState, reducer, type Basics, type State } from '../reducer'

const game = (app_name: string, extra: Partial<GameInfo> = {}): GameInfo => ({
  runner: 'gog',
  app_name,
  title: app_name,
  art_cover: '',
  art_square: '',
  is_installed: false,
  install: {},
  ...extra
})

const basics: Basics = {
  stores: [
    { id: 'gog', name: 'gog', label: 'GOG' },
    { id: 'legendary', name: 'epic', label: 'Epic' }
  ],
  settings: {
    language: 'es',
    defaultInstallPath: '/juegos',
    protonPath: '',
    steamGridDbApiKey: ''
  },
  queue: { elements: [], finished: [], state: 'idle' }
}

/** Everything read: the basics, both stores and the updates */
const loaded = (): State => {
  let state = reducer(initialState, { type: 'basics', basics })
  state = reducer(state, {
    type: 'storeLibrary',
    runner: 'gog',
    games: [game('a')]
  })
  state = reducer(state, {
    type: 'storeLibrary',
    runner: 'legendary',
    games: []
  })
  return reducer(state, { type: 'updates', updates: ['a'] })
}

describe('loading', () => {
  test('the basics give the install path and the stores before any game is there', () => {
    const state = reducer(initialState, { type: 'basics', basics })
    expect(state.stores).toHaveLength(2)
    expect(state.defaultInstallPath).toBe('/juegos')
    expect(state.games).toEqual([])
    expect(state.loaded).toBe(false)
  })

  test('each store shows when it arrives; loaded is true when all have', () => {
    let state = reducer(initialState, { type: 'basics', basics })
    state = reducer(state, {
      type: 'storeLibrary',
      runner: 'gog',
      games: [game('a')]
    })
    expect(state.games.map((g) => g.app_name)).toEqual(['a'])
    expect(state.libraryLoaded).toEqual({ gog: true })
    expect(state.loaded).toBe(false)

    state = reducer(state, {
      type: 'storeLibrary',
      runner: 'legendary',
      games: []
    })
    expect(state.loaded).toBe(true)
  })

  test('reading a store again replaces its games and leaves the others', () => {
    let state = loaded()
    state = reducer(state, {
      type: 'storeLibrary',
      runner: 'legendary',
      games: [game('e', { runner: 'legendary' })]
    })
    state = reducer(state, {
      type: 'storeLibrary',
      runner: 'gog',
      games: [game('b')]
    })
    expect(state.games.map((g) => g.app_name).sort()).toEqual(['b', 'e'])
  })

  test('reconnecting starts the stores over but keeps the games on screen', () => {
    const state = reducer(loaded(), { type: 'basics', basics })
    expect(state.games).toHaveLength(1)
    expect(state.libraryLoaded).toEqual({})
    expect(state.loaded).toBe(false)
  })

  test('the updates arrive on their own', () => {
    const state = reducer(reducer(initialState, { type: 'basics', basics }), {
      type: 'updates',
      updates: ['x']
    })
    expect(state.updates).toEqual(['x'])
  })
})

describe('events', () => {
  const status = (update: Partial<GameStatus>): GameStatus => ({
    appName: 'a',
    status: 'installing',
    ...update
  })

  test('a game starts and keeps what it is doing', () => {
    let state = reducer(loaded(), {
      type: 'event',
      event: { event: 'gameStatusUpdate', args: [status({ status: 'queued' })] }
    })
    expect(state.statuses.a.status).toBe('queued')

    state = reducer(state, {
      type: 'event',
      event: {
        event: 'progressUpdate',
        args: [status({ progress: { bytes: '1MB', eta: '00:01', percent: 5 } })]
      }
    })
    expect(state.statuses.a).toMatchObject({
      status: 'installing',
      progress: { percent: 5 }
    })
  })

  test('a game that is done leaves the busy ones', () => {
    let state = reducer(loaded(), {
      type: 'event',
      event: { event: 'gameStatusUpdate', args: [status({})] }
    })
    state = reducer(state, {
      type: 'event',
      event: { event: 'gameStatusUpdate', args: [status({ status: 'done' })] }
    })
    expect(state.statuses).toEqual({})
  })

  test('pushGameToLibrary replaces the game or adds it', () => {
    let state = reducer(loaded(), {
      type: 'event',
      event: {
        event: 'pushGameToLibrary',
        args: [game('a', { is_installed: true })]
      }
    })
    expect(state.games).toHaveLength(1)
    expect(state.games[0].is_installed).toBe(true)

    state = reducer(state, {
      type: 'event',
      event: { event: 'pushGameToLibrary', args: [game('b')] }
    })
    expect(state.games.map((g) => g.app_name)).toEqual(['a', 'b'])
  })

  test('the queue event changes the queue and keeps the finished ones', () => {
    const withFinished = reducer(loaded(), {
      type: 'queue',
      queue: {
        elements: [],
        finished: [{ type: 'install' } as never],
        state: 'idle'
      }
    })
    const state = reducer(withFinished, {
      type: 'event',
      event: {
        event: 'changedDMQueueInformation',
        args: [[{ type: 'update' }], 'running']
      }
    })
    expect(state.queue.state).toBe('running')
    expect(state.queue.elements).toHaveLength(1)
    expect(state.queue.finished).toHaveLength(1)
  })

  test('a dialog of rakun becomes a notice, and can be dismissed', () => {
    let state = reducer(loaded(), {
      type: 'event',
      event: { event: 'showDialog', args: ['Warning', 'Epic is down', 'ERROR'] }
    })
    expect(state.notice).toEqual({ title: 'Warning', message: 'Epic is down' })
    state = reducer(state, { type: 'dismissNotice' })
    expect(state.notice).toBeNull()
  })

  test('helpersProgress shows the line while it goes on and clears it when it is done', () => {
    let state = reducer(loaded(), {
      type: 'event',
      event: { event: 'helpersProgress', args: ['Downloading legendary'] }
    })
    expect(state.helpersUpdate).toEqual({
      running: true,
      line: 'Downloading legendary'
    })
    state = reducer(state, {
      type: 'event',
      event: { event: 'helpersProgress', args: ['done'] }
    })
    expect(state.helpersUpdate).toEqual({ running: false, line: '' })
  })

  test('the helpers are kept as they arrive', () => {
    const helpers = [
      { helper: 'legendary', pinned: '1', installed: '', state: 'missing' }
    ] as const
    const state = reducer(loaded(), { type: 'helpers', helpers: [...helpers] })
    expect(state.helpers).toEqual(helpers)
  })

  test('the end of a library refresh stops the refreshing mark', () => {
    let state = reducer(loaded(), { type: 'refreshing', value: true })
    state = reducer(state, {
      type: 'event',
      event: { event: 'refreshLibrary', args: ['gog'] }
    })
    expect(state.refreshing).toBe(false)
  })
})

describe('connection', () => {
  test('losing rakun keeps what was read, to show it behind the notice', () => {
    const state = reducer(loaded(), { type: 'connection', state: 'offline' })
    expect(state.connection).toBe('offline')
    expect(state.games).toHaveLength(1)
  })
})
