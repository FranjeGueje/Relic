import type { DialogNotice } from '../../shared/types'
import type { Translate } from '../i18n'
import { useLayer } from '../input/useInput'

/** A problem rakun or an action reported: one button, any answer closes it */
export function Notice({
  notice,
  t,
  onDismiss
}: {
  notice: DialogNotice
  t: Translate
  onDismiss: () => void
}) {
  useLayer((action) => {
    if (action === 'confirm' || action === 'back') onDismiss()
  })

  return (
    <div className="overlay" role="alertdialog">
      <div className="panel">
        <h1>{notice.title || t('error.title')}</h1>
        <p>{notice.message}</p>
        <div className="buttons">
          <button className="button focused" onClick={onDismiss}>
            {t('common.ok')}
          </button>
        </div>
      </div>
    </div>
  )
}
