import { useState } from 'react'
import type { Translate } from '../i18n'
import { useLayer } from '../input/useInput'

/** Yes or no. It starts on «no»: what asks for confirmation cannot be undone. */
export function ConfirmDialog({
  title,
  message,
  t,
  onYes,
  onNo
}: {
  title: string
  message: string
  t: Translate
  onYes: () => void
  onNo: () => void
}) {
  const [yes, setYes] = useState(false)

  useLayer((action) => {
    if (action === 'left' || action === 'right') setYes((value) => !value)
    else if (action === 'confirm') (yes ? onYes : onNo)()
    else if (action === 'back') onNo()
  })

  return (
    <div className="overlay" role="alertdialog">
      <div className="panel">
        <h1>{title}</h1>
        <p>{message}</p>
        <div className="buttons">
          <button
            className={`button${yes ? ' focused' : ''}`}
            onClick={onYes}
            onMouseEnter={() => setYes(true)}
          >
            {t('confirm.yes')}
          </button>
          <button
            className={`button${yes ? '' : ' focused'}`}
            onClick={onNo}
            onMouseEnter={() => setYes(false)}
          >
            {t('confirm.no')}
          </button>
        </div>
      </div>
    </div>
  )
}
