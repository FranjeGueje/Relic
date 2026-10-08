import type { DMQueueElement, GameStatus } from '../../shared/types'

/** `15.37MB · 10.17% · 00:00:09 left`-style pieces, only the ones that exist */
export function progressText(status: GameStatus | undefined): string {
  const progress = status?.progress
  if (!progress) return ''
  const percent =
    progress.percent === undefined ? '' : `${Math.floor(progress.percent)}%`
  const speed = progress.downSpeed
    ? `${progress.downSpeed.toFixed(1)} MB/s`
    : ''
  return [percent, progress.bytes, speed, progress.eta]
    .filter((piece) => piece !== '')
    .join(' · ')
}

export const percentOf = (status: GameStatus | undefined): number =>
  Math.max(0, Math.min(100, status?.progress?.percent ?? 0))

export type FinishedKind = 'done' | 'error' | 'abort' | 'other'

export function finishedKind(element: DMQueueElement): FinishedKind {
  if (element.status === 'done') return 'done'
  if (element.status === 'error') return 'error'
  if (element.status === 'abort') return 'abort'
  return 'other'
}
