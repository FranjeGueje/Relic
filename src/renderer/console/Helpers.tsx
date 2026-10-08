import { useState } from 'react'
import type { HelperInfo } from '../../shared/types'
import type { Translate } from '../i18n'
import { useLayer } from '../input/useInput'
import type { Actions } from '../state/useRakun'
import { CloseButton } from './CloseButton'

type Choice = 'missing' | 'latest'
const CHOICES: Choice[] = ['missing', 'latest']

/** The helper binaries, which are there and which are not, and the two ways to download them */
export function Helpers({
  helpers,
  update,
  actions,
  t,
  onClose
}: {
  helpers: HelperInfo[]
  update: { running: boolean; line: string }
  actions: Pick<Actions, 'updateHelpers'>
  t: Translate
  onClose: () => void
}) {
  const [focus, setFocus] = useState(0)

  const choose = (choice: Choice) => {
    if (update.running) return
    actions.updateHelpers(choice === 'latest')
  }

  useLayer((action) => {
    if (action === 'left') setFocus(Math.max(focus - 1, 0))
    else if (action === 'right')
      setFocus(Math.min(focus + 1, CHOICES.length - 1))
    else if (action === 'confirm') choose(CHOICES[focus])
    else if (action === 'back') onClose()
  })

  const label: Record<Choice, string> = {
    missing: t('helpers.downloadMissing'),
    latest: t('helpers.downloadLatest')
  }

  return (
    <div className="overlay solid" role="dialog">
      <div className="panel wide">
        <CloseButton t={t} onClose={onClose} />
        <h1>{t('menu.helpers')}</h1>
        <p className="muted small">{t('helpers.hint')}</p>
        <ul className="rows">
          {helpers.map(({ helper, pinned, installed, state }) => (
            <li key={helper} className="row helperRow">
              <span>{helper}</span>
              <span className="muted small">
                {t('helpers.pinned', { version: pinned })} ·{' '}
                {installed
                  ? t('helpers.installed', { version: installed })
                  : t('helpers.notInstalled')}{' '}
                · <strong>{t(`helpers.state.${state}`)}</strong>
              </span>
            </li>
          ))}
        </ul>
        <div className="buttons">
          {CHOICES.map((choice, index) => (
            <button
              key={choice}
              className={`button${index === focus ? ' focused' : ''}${update.running ? ' disabled' : ''}`}
              disabled={update.running}
              onMouseEnter={() => setFocus(index)}
              onClick={() => choose(choice)}
            >
              {label[choice]}
            </button>
          ))}
        </div>
        {update.running && (
          <p className="muted">{update.line || t('helpers.working')}</p>
        )}
      </div>
    </div>
  )
}
