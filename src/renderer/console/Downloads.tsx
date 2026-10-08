import { useState } from 'react'
import type { DMQueueElement, GameStatus } from '../../shared/types'
import type { Translate } from '../i18n'
import { useLayer } from '../input/useInput'
import { finishedKind, percentOf, progressText } from '../state/format'
import type { State } from '../state/reducer'
import type { Actions } from '../state/useRakun'
import { statusText } from './Card'
import { CloseButton } from './CloseButton'
import { ConfirmDialog } from './ConfirmDialog'

type Control = 'toggle' | 'cancel' | 'clear'
const CONTROLS: Control[] = ['toggle', 'cancel', 'clear']

function Entry({
  element,
  status,
  t
}: {
  element: DMQueueElement
  status: GameStatus | undefined
  t: Translate
}) {
  return (
    <li className="entry">
      <div className="entryTitle">
        <span>{element.params.gameInfo.title}</span>
        <span className="muted small">
          {t(`downloads.kind.${element.type}`)}
          {element.params.size ? ` · ${element.params.size}` : ''}
        </span>
      </div>
      {status?.progress ? (
        <>
          <span className="bar">
            <span style={{ width: `${percentOf(status)}%` }} />
          </span>
          <span className="muted small">{progressText(status)}</span>
        </>
      ) : (
        <span className="muted small">
          {status ? statusText(t, status) : t('status.queued')}
        </span>
      )}
    </li>
  )
}

function Finished({ element, t }: { element: DMQueueElement; t: Translate }) {
  const kind = finishedKind(element)
  const result =
    kind === 'done'
      ? t('downloads.done')
      : kind === 'abort'
        ? t('downloads.aborted')
        : kind === 'error'
          ? element.error
            ? t('downloads.failed', { error: element.error })
            : t('downloads.failedNoReason')
          : ''
  return (
    <li className={`entry finished ${kind}`}>
      <div className="entryTitle">
        <span>{element.params.gameInfo.title}</span>
        <span className="muted small">{result}</span>
      </div>
    </li>
  )
}

export function Downloads({
  state,
  actions,
  t,
  onClose
}: {
  state: State
  actions: Actions
  t: Translate
  onClose: () => void
}) {
  const { elements, finished, state: queueState } = state.queue
  const [focus, setFocus] = useState(0)
  const [asking, setAsking] = useState(false)
  const paused = queueState === 'paused'

  const enabled: Record<Control, boolean> = {
    toggle: elements.length > 0,
    cancel: elements.length > 0 && !paused,
    clear: finished.length > 0
  }
  const activate = (control: Control) => {
    if (!enabled[control]) return
    if (control === 'toggle') {
      if (paused) actions.resume()
      else actions.pause()
    } else if (control === 'cancel') setAsking(true)
    else actions.clearFinished()
  }

  useLayer((action) => {
    if (action === 'left') setFocus(Math.max(focus - 1, 0))
    else if (action === 'right')
      setFocus(Math.min(focus + 1, CONTROLS.length - 1))
    else if (action === 'confirm') activate(CONTROLS[focus])
    else if (action === 'back' || action === 'downloads') onClose()
  })

  const label: Record<Control, string> = {
    toggle: paused ? t('downloads.resume') : t('downloads.pause'),
    cancel: t('downloads.cancel'),
    clear: t('downloads.clear')
  }

  return (
    <div className="overlay solid" role="dialog">
      <div className="panel wide">
        <CloseButton t={t} onClose={onClose} />
        <h1>
          {t('downloads.title')}{' '}
          <span className="muted small">
            {t(`downloads.state.${queueState}`)}
          </span>
        </h1>
        <div className="buttons">
          {CONTROLS.map((control, index) => (
            <button
              key={control}
              className={`button${index === focus ? ' focused' : ''}${enabled[control] ? '' : ' disabled'}`}
              onMouseEnter={() => setFocus(index)}
              onClick={() => activate(control)}
            >
              {label[control]}
            </button>
          ))}
        </div>
        <div className="lists">
          {elements.length === 0 && finished.length === 0 && (
            <p className="muted">{t('downloads.empty')}</p>
          )}
          {elements.length > 0 && (
            <>
              <h2>{t('downloads.queue')}</h2>
              <ul>
                {elements.map((element) => (
                  <Entry
                    key={`${element.params.runner}-${element.params.appName}`}
                    element={element}
                    status={state.statuses[element.params.appName]}
                    t={t}
                  />
                ))}
              </ul>
            </>
          )}
          {finished.length > 0 && (
            <>
              <h2>{t('downloads.finished')}</h2>
              <ul>
                {[...finished]
                  .reverse()
                  .slice(0, 12)
                  .map((element) => (
                    <Finished
                      key={`${element.params.runner}-${element.params.appName}-${element.endTime}`}
                      element={element}
                      t={t}
                    />
                  ))}
              </ul>
            </>
          )}
        </div>
      </div>
      {asking && (
        <ConfirmDialog
          title={t('confirm.cancel.title', {
            title: elements[0]?.params.gameInfo.title ?? ''
          })}
          message={t('confirm.cancel.message')}
          t={t}
          onYes={() => {
            setAsking(false)
            actions.cancelCurrent()
          }}
          onNo={() => setAsking(false)}
        />
      )}
    </div>
  )
}
