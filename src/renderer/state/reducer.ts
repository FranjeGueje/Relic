import {
  HELPERS_DONE,
  type ConnectionState,
  type RakunEvent
} from '../../shared/channels'
import type {
  AppSettings,
  DialogNotice,
  GameInfo,
  GameStatus,
  HelperInfo,
  QueueInfo,
  Runner,
  StoreInfo
} from '../../shared/types'

export type State = {
  connection: ConnectionState
  /** Every store's library has been read since connecting */
  loaded: boolean
  /** Which stores' libraries have arrived since connecting: each one shows as it comes */
  libraryLoaded: Partial<Record<Runner, boolean>>
  stores: StoreInfo[]
  games: GameInfo[]
  /** Names of the games with an update waiting */
  updates: string[]
  /** What each game is doing now, by its app name */
  statuses: Record<string, GameStatus>
  queue: QueueInfo
  defaultInstallPath: string
  refreshing: boolean
  /** The helper binaries (legendary, gogdl…): which are installed */
  helpers: HelperInfo[]
  /** An update of the helpers is going on, and the last thing rakun said about it */
  helpersUpdate: { running: boolean; line: string }
  notice: DialogNotice | null
}

export const emptyQueue: QueueInfo = {
  elements: [],
  finished: [],
  state: 'idle'
}

export const initialState: State = {
  connection: 'connecting',
  loaded: false,
  libraryLoaded: {},
  stores: [],
  games: [],
  updates: [],
  statuses: {},
  queue: emptyQueue,
  defaultInstallPath: '',
  refreshing: false,
  helpers: [],
  helpersUpdate: { running: false, line: '' },
  notice: null
}

/** What is read first, because it is small and the screen needs it to start */
export type Basics = {
  stores: StoreInfo[]
  settings: AppSettings
  queue: QueueInfo
}

export type Action =
  | { type: 'connection'; state: ConnectionState }
  | { type: 'basics'; basics: Basics }
  | { type: 'installPath'; path: string }
  | { type: 'storeLibrary'; runner: Runner; games: GameInfo[] }
  | { type: 'updates'; updates: string[] }
  | { type: 'queue'; queue: QueueInfo }
  | { type: 'refreshing'; value: boolean }
  | { type: 'helpers'; helpers: HelperInfo[] }
  | { type: 'helpersUpdating'; running: boolean }
  | { type: 'notice'; notice: DialogNotice }
  | { type: 'dismissNotice' }
  | { type: 'event'; event: RakunEvent }

/** A game in these states has nothing going on: it leaves the list of busy ones */
const IDLE_STATUSES = new Set([
  'done',
  'installed',
  'notInstalled',
  'canceled',
  'error',
  'notAvailable',
  'notSupportedGame'
])

function withStatus(
  statuses: State['statuses'],
  update: GameStatus
): State['statuses'] {
  const rest = { ...statuses }
  if (IDLE_STATUSES.has(update.status)) {
    delete rest[update.appName]
    return rest
  }
  return { ...rest, [update.appName]: { ...rest[update.appName], ...update } }
}

function withGame(games: GameInfo[], game: GameInfo): GameInfo[] {
  const index = games.findIndex(
    (g) => g.app_name === game.app_name && g.runner === game.runner
  )
  if (index === -1) return [...games, game]
  return games.map((g, i) => (i === index ? game : g))
}

/** A dialog argument of rakun, as text */
const text = (value: unknown): string =>
  typeof value === 'string' ? value : ''

function applyEvent(state: State, { event, args }: RakunEvent): State {
  switch (event) {
    case 'gameStatusUpdate':
    case 'progressUpdate':
      return {
        ...state,
        statuses: withStatus(state.statuses, args[0] as GameStatus)
      }
    case 'pushGameToLibrary':
      return { ...state, games: withGame(state.games, args[0] as GameInfo) }
    case 'changedDMQueueInformation':
      return {
        ...state,
        queue: {
          ...state.queue,
          elements: args[0] as QueueInfo['elements'],
          state: args[1] as QueueInfo['state']
        }
      }
    case 'refreshLibrary':
      return { ...state, refreshing: false }
    case 'helpersProgress':
      return {
        ...state,
        helpersUpdate:
          args[0] === HELPERS_DONE
            ? { running: false, line: '' }
            : { running: true, line: text(args[0]) }
      }
    case 'showDialog':
      return {
        ...state,
        notice: { title: text(args[0]), message: text(args[1]) }
      }
  }
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'connection':
      return { ...state, connection: action.state }
    case 'basics':
      return {
        ...state,
        loaded: false,
        libraryLoaded: {},
        stores: action.basics.stores,
        queue: action.basics.queue,
        defaultInstallPath: action.basics.settings.defaultInstallPath
      }
    case 'installPath':
      return { ...state, defaultInstallPath: action.path }
    case 'storeLibrary': {
      const libraryLoaded = { ...state.libraryLoaded, [action.runner]: true }
      return {
        ...state,
        games: [
          ...state.games.filter((game) => game.runner !== action.runner),
          ...action.games
        ],
        libraryLoaded,
        loaded: state.stores.every((store) => libraryLoaded[store.id])
      }
    }
    case 'updates':
      return { ...state, updates: action.updates }
    case 'queue':
      return { ...state, queue: action.queue }
    case 'refreshing':
      return { ...state, refreshing: action.value }
    case 'helpers':
      return { ...state, helpers: action.helpers }
    case 'helpersUpdating':
      return {
        ...state,
        helpersUpdate: { running: action.running, line: '' }
      }
    case 'notice':
      return { ...state, notice: action.notice }
    case 'dismissNotice':
      return { ...state, notice: null }
    case 'event':
      return applyEvent(state, action.event)
  }
}
