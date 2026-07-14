import { useTranslation } from 'react-i18next'
import LanguageSelector from 'frontend/components/UI/LanguageSelector'
import { ThemeSelector } from 'frontend/components/UI/ThemeSelector'
import {
  AutoUpdateGames,
  DefaultInstallPath,
  DefaultSteamPath,
  DisableController,
  HideChangelogOnStartup,
  LibraryTopSection,
  MaxRecentGames,
  MaxWorkers,
  Shortcuts,
  StartInConsoleMode,
  TraySettings
} from '../../components'

export default function GeneralSettings() {
  const { t } = useTranslation()

  return (
    <div>
      <h3 className="settingSubheader">{t('settings.navbar.general')}</h3>

      <LanguageSelector />

      <ThemeSelector />

      <DefaultInstallPath />

      <DefaultSteamPath />

      <AutoUpdateGames />

      <HideChangelogOnStartup />

      <StartInConsoleMode />

      <TraySettings />

      <Shortcuts />

      <DisableController />

      <LibraryTopSection />

      <MaxRecentGames />

      <MaxWorkers />
    </div>
  )
}
