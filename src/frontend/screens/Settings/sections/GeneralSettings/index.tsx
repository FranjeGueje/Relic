import { useTranslation } from 'react-i18next'
import LanguageSelector from 'frontend/components/UI/LanguageSelector'
import { ThemeSelector } from 'frontend/components/UI/ThemeSelector'
import {
  AutoUpdateGames,
  ClearCache,
  DefaultInstallPath,
  MaxWorkers,
  ResetRelic,
  SteamGridDbApiKey,
  VerboseLogs
} from '../../components'

export default function GeneralSettings() {
  const { t } = useTranslation()

  return (
    <div>
      <h3 className="settingSubheader">{t('settings.navbar.general')}</h3>

      <LanguageSelector />

      <ThemeSelector />

      <DefaultInstallPath />

      <AutoUpdateGames />

      <VerboseLogs />

      <SteamGridDbApiKey />

      <MaxWorkers />

      <ClearCache />

      <ResetRelic />
    </div>
  )
}
