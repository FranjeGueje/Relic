import { useCallback, useEffect, useReducer, useRef } from 'react'
import { HELPERS_DONE, type RakunEvent } from '../../shared/channels'
import type { GameInfo, GameStatus, Runner } from '../../shared/types'
import { mark } from '../perf'
import { initialState, reducer, type State } from './reducer'
import { installParams, platformFor, type Build } from './selectors'

export type Actions = {
  install: (game: GameInfo, build?: Build) => void
  /** Registers a game that is already in `path`, without downloading it */
  importFolder: (game: GameInfo, path: string) => void
  update: (game: GameInfo) => void
  repair: (game: GameInfo) => void
  uninstall: (game: GameInfo) => void
  cancelCurrent: () => void
  removeFromQueue: (appName: string) => void
  pause: () => void
  resume: () => void
  clearFinished: () => void
  refresh: () => void
  /** Reads one store's games again (after its login or logout) */
  reloadStore: (runner: Runner) => void
  /** Reads the settings the sheets show (the install folder) again */
  reloadSettings: () => void
  /** Asks rakun to download the helper binaries that are missing (all of them, unchecked, with `latest`) */
  updateHelpers: (latest?: boolean) => void
  dismissNotice: () => void
}

/** A game ending an operation is a reason to read the library and the queue again */
const ENDINGS = new Set(['done', 'installed', 'notInstalled'])

/**
 * Keeps the state of the app in step with rakun: reads everything when it
 * connects (events may have been missed) and then follows its events.
 */
export function useRakun(): { state: State; actions: Actions } {
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state
  const timers = useRef<Record<string, number>>({})
  const loading = useRef(false)

  const fail = useCallback((error: unknown) => {
    dispatch({
      type: 'notice',
      notice: {
        title: '',
        message: error instanceof Error ? error.message : String(error)
      }
    })
  }, [])

  /** One store's games, shown as soon as they are read; the other stores do not wait for it */
  const loadStore = useCallback(
    async (runner: Runner): Promise<number> => {
      try {
        const games = await window.rakun.call('getLibrary', runner)
        dispatch({ type: 'storeLibrary', runner, games })
        mark(`library ${runner} (${games.length})`)
        return games.length
      } catch (error) {
        dispatch({ type: 'storeLibrary', runner, games: [] })
        fail(error)
        return 0
      }
    },
    [fail]
  )

  /**
   * Which games have an update waiting. It asks the stores over the network and, if
   * rakun's `autoUpdateGames` is on, queues the updates: it never holds up the screen.
   */
  const loadUpdates = useCallback(async () => {
    try {
      dispatch({
        type: 'updates',
        updates: await window.rakun.call('checkGameUpdates')
      })
      mark('updates')
    } catch {
      // without the update marks the games are all there; the next refresh asks again
    }
  }, [])

  const loadLibrary = useCallback(
    async (runner?: Runner) => {
      const runners = runner
        ? [runner]
        : stateRef.current.stores.map((s) => s.id)
      await Promise.all(runners.map((id) => loadStore(id)))
      void loadUpdates()
    },
    [loadStore, loadUpdates]
  )

  const loadHelpers = useCallback(async () => {
    const helpers = await window.rakun.call('getHelpers')
    dispatch({ type: 'helpers', helpers: helpers ?? [] })
  }, [])

  const loadQueue = useCallback(async () => {
    dispatch({
      type: 'queue',
      queue: await window.rakun.call('getDMQueueInformation')
    })
  }, [])

  const refresh = useCallback(() => {
    dispatch({ type: 'refreshing', value: true })
    window.rakun.call('refreshLibrary', 'all').catch((error: unknown) => {
      dispatch({ type: 'refreshing', value: false })
      fail(error)
    })
  }, [fail])

  const loadSnapshot = useCallback(async () => {
    if (loading.current) return
    loading.current = true
    try {
      const bridge = window.rakun
      const [stores, settings, queue] = await Promise.all([
        bridge.call('getStores'),
        bridge.call('requestAppSettings'),
        bridge.call('getDMQueueInformation')
      ])
      dispatch({ type: 'basics', basics: { stores, settings, queue } })
      mark('basics')
      // Not needed to show the games: what is missing shows when it arrives
      void loadHelpers().catch(() => undefined)
      // Each store shows as soon as it arrives; the updates come last, in the background
      const counts = await Promise.all(
        stores.map((store) => loadStore(store.id))
      )
      if (counts.every((count) => count === 0)) refresh()
      void loadUpdates()
    } catch (error) {
      fail(error)
    } finally {
      loading.current = false
    }
  }, [fail, loadHelpers, loadStore, loadUpdates, refresh])

  const later = useCallback((name: string, ms: number, work: () => void) => {
    window.clearTimeout(timers.current[name])
    timers.current[name] = window.setTimeout(work, ms)
  }, [])

  const onEvent = useCallback(
    (event: RakunEvent) => {
      dispatch({ type: 'event', event })
      if (event.event === 'refreshLibrary') {
        const runner = event.args[0]
        const only =
          typeof runner === 'string' && runner !== 'all'
            ? (runner as Runner)
            : undefined
        later('library', 200, () => void loadLibrary(only).catch(fail))
      }
      if (event.event === 'helpersProgress' && event.args[0] === HELPERS_DONE)
        later('helpers', 200, () => void loadHelpers().catch(fail))
      if (event.event === 'changedDMQueueInformation')
        later('queue', 300, () => void loadQueue().catch(fail))
      if (
        event.event === 'gameStatusUpdate' &&
        ENDINGS.has((event.args[0] as GameStatus).status)
      ) {
        later('library', 500, () => void loadLibrary().catch(fail))
        later('queue', 500, () => void loadQueue().catch(fail))
      }
    },
    [fail, later, loadHelpers, loadLibrary, loadQueue]
  )

  useEffect(() => {
    const bridge = window.rakun
    const connect = (connection: State['connection']) => {
      dispatch({ type: 'connection', state: connection })
      if (connection === 'online') void loadSnapshot()
    }
    mark('connecting')
    const stopConnection = bridge.onConnection(connect)
    const stopEvents = bridge.onEvent(onEvent)
    void bridge.connection().then(connect)
    const pending = timers.current
    return () => {
      stopConnection()
      stopEvents()
      Object.values(pending).forEach((id) => window.clearTimeout(id))
    }
  }, [loadSnapshot, onEvent])

  const run = useCallback(
    (work: () => Promise<unknown>) => {
      work().catch(fail)
    },
    [fail]
  )

  const actions: Actions = {
    install: (game, build) =>
      run(() =>
        window.rakun.call(
          'install',
          installParams(game, stateRef.current.defaultInstallPath, build)
        )
      ),
    importFolder: (game, path) =>
      run(async () => {
        await window.rakun.call('importGame', {
          appName: game.app_name,
          runner: game.runner,
          path,
          platform: platformFor(game)
        })
        const games = await window.rakun.call('getLibrary', game.runner)
        await loadLibrary(game.runner)
        if (!games.some((g) => g.app_name === game.app_name && g.is_installed))
          throw new Error(`Could not import ${game.title} from ${path}`)
      }),
    update: (game) =>
      run(() =>
        window.rakun.call('updateGame', {
          appName: game.app_name,
          runner: game.runner,
          gameInfo: game
        })
      ),
    repair: (game) =>
      run(() => window.rakun.call('repair', game.app_name, game.runner)),
    uninstall: (game) =>
      run(async () => {
        await window.rakun.call('uninstall', game.app_name, game.runner, true)
        await loadLibrary(game.runner)
      }),
    // Like `rakunctl cancel --remove-files`: what was half downloaded is deleted
    cancelCurrent: () => run(() => window.rakun.call('cancelDownload', true)),
    removeFromQueue: (appName) =>
      run(() => window.rakun.call('removeFromDMQueue', appName)),
    pause: () => run(() => window.rakun.call('pauseCurrentDownload')),
    resume: () => run(() => window.rakun.call('resumeCurrentDownload')),
    clearFinished: () =>
      run(async () => {
        await window.rakun.call('clearFinishedDMQueue')
        await loadQueue()
      }),
    refresh,
    reloadStore: (runner) => void loadLibrary(runner),
    reloadSettings: () =>
      run(async () => {
        const settings = await window.rakun.call('requestAppSettings')
        dispatch({ type: 'installPath', path: settings.defaultInstallPath })
      }),
    updateHelpers: (latest) =>
      run(async () => {
        dispatch({ type: 'helpersUpdating', running: true })
        try {
          const result = await window.rakun.call('updateHelpers', { latest })
          dispatch({ type: 'helpers', helpers: result.helpers })
          if (result.failures.length)
            throw new Error(
              `Could not install: ${result.failures
                .map(({ helper, error }) => `${helper} (${error})`)
                .join(', ')}`
            )
          await loadLibrary()
        } finally {
          dispatch({ type: 'helpersUpdating', running: false })
        }
      }),
    dismissNotice: () => dispatch({ type: 'dismissNotice' })
  }

  return { state, actions }
}
