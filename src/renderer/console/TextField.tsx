import { useState, type ReactNode } from 'react'
import type { Translate } from '../i18n'
import { CloseButton } from './CloseButton'
import { useLayer } from '../input/useInput'

/** One line of text, typed with the keyboard (the on-screen one of Steam too) */
export function TextField({
  title,
  initial,
  t,
  intro,
  onSave,
  onClose
}: {
  title: string
  initial: string
  t: Translate
  /** What goes between the title and the field */
  intro?: ReactNode
  /** Saves the text; answers the reason when it is refused */
  onSave: (value: string) => Promise<string | undefined>
  onClose: () => void
}) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState('')

  const save = async (text: string) => {
    const reason = await onSave(text.trim())
    if (reason) setError(t('settings.failed', { error: reason }))
  }

  // A and B of the gamepad arrive as actions; the keys are the field's own
  useLayer((action) => {
    if (action === 'confirm') void save(value)
    else if (action === 'back') onClose()
  })

  return (
    <div className="overlay solid" role="dialog">
      <div className="panel wide">
        <CloseButton t={t} onClose={onClose} />
        <h1>{title}</h1>
        {intro}
        <input
          className="field"
          type="text"
          value={value}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void save(value)
            else if (event.key === 'Escape') onClose()
          }}
        />
        <div className="buttons">
          <button className="button" onClick={() => void save(value)}>
            {t('common.ok')}
          </button>
        </div>
        <p className="muted small">{t('field.hint')}</p>
        {error && <p className="errorText">{error}</p>}
      </div>
    </div>
  )
}
