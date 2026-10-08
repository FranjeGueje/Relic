import { useState } from 'react'
import { SUPPORTED_LANGUAGES } from '../../shared/languages'
import type { Translate } from '../i18n'
import { CloseButton } from './CloseButton'
import { useLayer } from '../input/useInput'

/** «Spanish (es)»: the name in English for those who do not know the code */
export function languageLabel(code: string): string {
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'language' }).of(
      code.replace('_', '-')
    )
    return name && name !== code ? `${name} (${code})` : code
  } catch {
    return code
  }
}

/** Left and right go through the languages rakun accepts; A saves */
export function LanguageSelect({
  title,
  current,
  t,
  onSave,
  onClose
}: {
  title: string
  current: string
  t: Translate
  /** Saves the code; answers the reason when it is refused */
  onSave: (value: string) => Promise<string | undefined>
  onClose: () => void
}) {
  const start = Math.max(SUPPORTED_LANGUAGES.indexOf(current as never), 0)
  const [index, setIndex] = useState(start)
  const [error, setError] = useState('')
  const count = SUPPORTED_LANGUAGES.length

  const save = async () => {
    const reason = await onSave(SUPPORTED_LANGUAGES[index])
    if (reason) setError(t('settings.failed', { error: reason }))
  }

  const go = (step: number) => setIndex((index + step + count) % count)

  useLayer((action) => {
    if (action === 'left') go(-1)
    else if (action === 'right') go(1)
    else if (action === 'confirm') void save()
    else if (action === 'back') onClose()
  })

  return (
    <div className="overlay solid" role="dialog">
      <div className="panel">
        <CloseButton t={t} onClose={onClose} />
        <h1>{title}</h1>
        <p className="choice">
          <button
            className="arrow"
            aria-label={t('language.previous')}
            onClick={() => go(-1)}
          >
            ‹
          </button>
          <strong>{languageLabel(SUPPORTED_LANGUAGES[index])}</strong>
          <button
            className="arrow"
            aria-label={t('language.next')}
            onClick={() => go(1)}
          >
            ›
          </button>
        </p>
        <div className="buttons">
          <button className="button" onClick={() => void save()}>
            {t('common.ok')}
          </button>
        </div>
        <p className="muted small">{t('language.hint')}</p>
        {error && <p className="errorText">{error}</p>}
      </div>
    </div>
  )
}
