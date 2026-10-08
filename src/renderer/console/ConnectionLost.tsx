import { useState } from 'react'
import type { ConnectionState } from '../../shared/channels'
import type { Translate } from '../i18n'
import { useLayer } from '../input/useInput'

/** Covers the app while rakun does not answer; nothing behind it can be used */
export function ConnectionLost({
  connection,
  t
}: {
  connection: ConnectionState
  t: Translate
}) {
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const offline = connection === 'offline'

  const start = () => {
    if (starting || !offline) return
    setStarting(true)
    setError('')
    window.rakun
      .start()
      .then((reply) => {
        if (!reply.ok) setError(reply.error)
      })
      .catch((failure: unknown) =>
        setError(failure instanceof Error ? failure.message : String(failure))
      )
      .finally(() => setStarting(false))
  }

  useLayer((action) => {
    if (action === 'confirm') start()
    else if (action === 'back') window.rakun.quit()
  })

  return (
    <div className="overlay solid" role="alert">
      <div className="panel center">
        {!offline ? (
          <h1>{t('offline.connecting')}</h1>
        ) : (
          <>
            <h1>{t('offline.title')}</h1>
            <p>{t('offline.hint')}</p>
            <div className="buttons centered">
              <button
                className={`button focused${starting ? ' disabled' : ''}`}
                onClick={start}
              >
                {starting ? t('offline.starting') : t('offline.start')}
              </button>
            </div>
            {error && (
              <p className="errorText">{t('offline.startFailed', { error })}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
