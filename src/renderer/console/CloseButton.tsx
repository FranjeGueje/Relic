import type { Translate } from '../i18n'

/** Whoever has the mouse needs something to click to leave a panel (the gamepad has B) */
export function CloseButton({
  t,
  onClose
}: {
  t: Translate
  onClose: () => void
}) {
  return (
    <button className="closeX" onClick={onClose}>
      {t('common.close')}
    </button>
  )
}
