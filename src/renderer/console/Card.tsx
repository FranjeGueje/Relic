import { forwardRef, memo } from 'react'
import type { GameInfo, GameStatus } from '../../shared/types'
import type { Translate } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { percentOf } from '../state/format'
import { coverSources, isBusy } from '../state/selectors'
import { Cover } from './Cover'

const STATUS_TEXT: Partial<Record<GameStatus['status'], StringKey>> = {
  queued: 'status.queued',
  installing: 'status.installing',
  updating: 'status.updating',
  repairing: 'status.repairing',
  uninstalling: 'status.uninstalling',
  moving: 'status.moving',
  extracting: 'status.extracting'
}

export const statusText = (t: Translate, status: GameStatus): string =>
  t(STATUS_TEXT[status.status] ?? 'status.busy')

type Props = {
  game: GameInfo
  index: number
  status: GameStatus | undefined
  needsUpdate: boolean
  focused: boolean
  t: Translate
  onSelect: (index: number) => void
  onOpen: (index: number) => void
}

/**
 * Memoised, with handlers that take the index and do not change: a progress event of
 * one game repaints that card, not the other thousand.
 */
export const Card = memo(
  forwardRef<HTMLButtonElement, Props>(function Card(
    { game, index, status, needsUpdate, focused, t, onSelect, onOpen },
    ref
  ) {
    const busy = isBusy(status)

    return (
      <button
        ref={ref}
        className={`card${focused ? ' focused' : ''}`}
        onMouseEnter={() => onSelect(index)}
        onClick={() => (focused ? onOpen(index) : onSelect(index))}
        title={game.title}
      >
        <Cover sources={coverSources(game)} title={game.title} />
        <span className="badges">
          {game.is_installed && (
            <span className="badge" title={t('badge.installed')}>
              ●
            </span>
          )}
          {needsUpdate && (
            <span className="badge update" title={t('badge.update')}>
              ↑
            </span>
          )}
        </span>
        {status && busy && (
          <span className="statusOverlay">
            <span>{statusText(t, status)}</span>
            {status.progress && (
              <span className="bar">
                <span style={{ width: `${percentOf(status)}%` }} />
              </span>
            )}
          </span>
        )}
      </button>
    )
  })
)
