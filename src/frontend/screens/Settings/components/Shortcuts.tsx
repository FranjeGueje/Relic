import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'

const Shortcuts = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)

  const [addSteamShortcuts, setAddSteamShortcuts] = useSetting(
    'addSteamShortcuts',
    false
  )

  if (!isDefault) {
    return <></>
  }

  return (
    <>
      <ToggleSwitch
        htmlId="shortcutsToSteam"
        value={addSteamShortcuts}
        handleChange={() => setAddSteamShortcuts(!addSteamShortcuts)}
        title={t('setting.addgamestosteam', 'Add games to Steam automatically')}
      />
    </>
  )
}

export default Shortcuts
