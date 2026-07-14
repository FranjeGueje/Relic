import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import { DeleteOutline } from '@mui/icons-material'

const ResetRelic = () => {
  const { showResetDialog } = useContext(ContextProvider)
  const { t } = useTranslation()

  return (
    <>
      <h3 className="settingSubheader">
        {t('settings.advanced.title.resetRelic', 'Reset Relic')}
      </h3>
      <InfoBox text={t('settings.advanced.details', 'Details')}>
        {t(
          'settings.advanced.resetRelic.help',
          "This will remove all Settings and Caching but won't remove your Installed games or your Epic credentials. Portable versions (AppImage, WinPortable, ...) of Relic needs to be restarted manually afterwards."
        )}
      </InfoBox>
      <button className="button is-footer is-danger" onClick={showResetDialog}>
        <div className="button-icontext-flex">
          <div className="button-icon-flex">
            <DeleteOutline />
          </div>
          <span className="button-icon-text">
            {t('settings.reset-relic', 'Reset Relic')}
          </span>
        </div>
      </button>
    </>
  )
}

export default ResetRelic
