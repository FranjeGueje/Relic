import type { HelperInfo } from '../../shared/types'
import type { Translate } from '../i18n'
import type { Actions } from '../state/useRakun'

/** Says which helper binaries are missing and offers to download them; nothing when none is */
export function HelpersBanner({
  helpers,
  update,
  actions,
  t
}: {
  helpers: HelperInfo[]
  update: { running: boolean; line: string }
  actions: Pick<Actions, 'updateHelpers'>
  t: Translate
}) {
  const missing = helpers.filter(({ state }) => state === 'missing')
  if (!missing.length && !update.running) return null
  return (
    <div className="helpersBanner" role="alert">
      <span>
        {update.running
          ? update.line || t('helpers.working')
          : t('helpers.missing', {
              helpers: missing.map(({ helper }) => helper).join(', ')
            })}
      </span>
      <button
        className="chip active"
        disabled={update.running}
        onClick={() => actions.updateHelpers()}
      >
        {t('helpers.download')}
      </button>
    </div>
  )
}
