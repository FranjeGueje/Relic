import { useState } from 'react'
import type { GameInfo, GameStatus } from '../../shared/types'
import type { Translate } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { useLayer } from '../input/useInput'
import type { Actions } from '../state/useRakun'
import { actionsFor, coverSources, type GameAction } from '../state/selectors'
import { Cover } from './Cover'
import { ConfirmDialog } from './ConfirmDialog'
import { FolderPicker } from './FolderPicker'

const LABELS: Record<GameAction, StringKey> = {
  install: 'sheet.install',
  installWindows: 'sheet.installWindows',
  installLinux: 'sheet.installLinux',
  importFolder: 'sheet.importFolder',
  update: 'sheet.update',
  repair: 'sheet.repair',
  uninstall: 'sheet.uninstall',
  cancel: 'sheet.cancel',
  removeFromQueue: 'sheet.removeFromQueue'
}

/** These cannot be undone, or stop something running: they ask first */
const ASKS: Partial<
  Record<GameAction, { title: StringKey; message: StringKey }>
> = {
  uninstall: {
    title: 'confirm.uninstall.title',
    message: 'confirm.uninstall.message'
  },
  cancel: { title: 'confirm.cancel.title', message: 'confirm.cancel.message' },
  removeFromQueue: {
    title: 'confirm.remove.title',
    message: 'confirm.remove.message'
  }
}

type Props = {
  game: GameInfo
  status: GameStatus | undefined
  needsUpdate: boolean
  defaultInstallPath: string
  actions: Actions
  t: Translate
  onClose: () => void
}

export function GameSheet({
  game,
  status,
  needsUpdate,
  defaultInstallPath,
  actions,
  t,
  onClose
}: Props) {
  const available = actionsFor(game, status, needsUpdate)
  const [focus, setFocus] = useState(0)
  const [asking, setAsking] = useState<GameAction | null>(null)
  const [picking, setPicking] = useState(false)
  // The available actions and a «close» at the end
  const rows = [...available, 'close' as const]
  const selected = Math.min(focus, rows.length - 1)

  const run = (action: GameAction) => {
    const doIt: Record<GameAction, () => void> = {
      install: () => actions.install(game),
      installWindows: () => actions.install(game, 'windows'),
      installLinux: () => actions.install(game, 'linux'),
      importFolder: () => undefined, // picks a folder first: see `choose`
      update: () => actions.update(game),
      repair: () => actions.repair(game),
      uninstall: () => actions.uninstall(game),
      cancel: () => actions.cancelCurrent(),
      removeFromQueue: () => actions.removeFromQueue(game.app_name)
    }
    doIt[action]()
    onClose()
  }

  const choose = (row: (typeof rows)[number]) => {
    if (row === 'close') onClose()
    else if (row === 'importFolder') setPicking(true)
    else if (ASKS[row]) setAsking(row)
    else run(row)
  }

  useLayer((action) => {
    if (asking) return
    if (action === 'up') setFocus(Math.max(selected - 1, 0))
    else if (action === 'down')
      setFocus(Math.min(selected + 1, rows.length - 1))
    else if (action === 'confirm') choose(rows[selected])
    else if (action === 'back') onClose()
  })

  const ask = asking ? ASKS[asking] : undefined
  const location = game.is_installed
    ? t('sheet.installedAt', { path: game.install.install_path ?? '' })
    : t('sheet.installPath', { path: defaultInstallPath })

  return (
    <div className="overlay" role="dialog">
      <div className="panel sheet">
        <div className="sheetCover">
          <Cover sources={coverSources(game)} title={game.title} eager />
        </div>
        <div className="sheetBody">
          <h1>{game.title}</h1>
          {game.developer && <p className="muted">{game.developer}</p>}
          <p className="muted">
            {[
              game.is_installed ? t('badge.installed') : '',
              game.install.version ?? '',
              needsUpdate ? t('badge.update') : ''
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="muted small">{location}</p>
          {available.length === 0 && <p>{t('sheet.busy')}</p>}
          <div className="column">
            {rows.map((row, index) => (
              <button
                key={row}
                className={`button${index === selected ? ' focused' : ''}`}
                onMouseEnter={() => setFocus(index)}
                onClick={() => choose(row)}
              >
                {row === 'close' ? t('sheet.close') : t(LABELS[row])}
              </button>
            ))}
          </div>
        </div>
      </div>
      {picking && (
        <FolderPicker
          title={t('sheet.importFolder')}
          start={defaultInstallPath}
          t={t}
          onPick={(path) => {
            actions.importFolder(game, path)
            onClose()
            return Promise.resolve(undefined)
          }}
          onClose={() => setPicking(false)}
        />
      )}
      {asking && ask && (
        <ConfirmDialog
          title={t(ask.title, { title: game.title })}
          message={t(ask.message)}
          t={t}
          onYes={() => run(asking)}
          onNo={() => setAsking(null)}
        />
      )}
    </div>
  )
}
