import { useTranslation } from 'react-i18next'
import { DownloadDone } from '@mui/icons-material'
import PopoverComponent from 'frontend/components/UI/PopoverComponent'
import { GameInfo } from 'common/types'

interface Props {
  gameInfo: GameInfo
}

const InstalledInfo = ({ gameInfo }: Props) => {
  const { t } = useTranslation('gamepage')

  if (!gameInfo.is_installed) {
    return null
  }

  const isThirdParty = !!gameInfo.thirdPartyManagedApp

  const {
    install: { platform: installPlatform },
    canRunOffline,
    folder_name
  } = gameInfo

  if (installPlatform === 'Browser') {
    return (
      <div style={{ textTransform: 'capitalize' }}>
        <b>{t('info.installedPlatform', 'Installed Platform')}:</b>{' '}
        {installPlatform}
      </div>
    )
  }

  const install_path = gameInfo.install.install_path
  const install_size = gameInfo.install.install_size
  const version = gameInfo.install.version

  const appLocation = install_path || folder_name

  const info = (
    <>
      {!isThirdParty && (
        <div>
          <b>{t('info.size')}:</b> {install_size}
        </div>
      )}
      <div style={{ textTransform: 'capitalize' }}>
        <b>{t('info.installedPlatform', 'Installed Platform')}:</b>{' '}
        {installPlatform === 'osx' ? 'MacOS' : installPlatform}
      </div>
      {!isThirdParty && (
        <div>
          <b>{t('info.version')}:</b> {version}
        </div>
      )}
      <div>
        <b>{t('info.canRunOffline', 'Online Required')}:</b>{' '}
        {t(canRunOffline ? 'box.no' : 'box.yes')}
      </div>
      {isThirdParty && (
        <div>
          <b>{t('info.third-party-app', 'Third-Party Manager')}</b>{' '}
          {gameInfo.isEAManaged ? 'EA app' : gameInfo.thirdPartyManagedApp}
        </div>
      )}
      {!isThirdParty && (
        <div
          className="clickable"
          onClick={() =>
            appLocation !== undefined ? window.api.openFolder(appLocation) : {}
          }
        >
          <b>{t('info.path')}:</b>{' '}
          <div className="truncatedPath">{appLocation}</div>
        </div>
      )}
    </>
  )

  return info

  return (
    <PopoverComponent
      item={
        <span
          title={t('info.clickToOpen', 'Click to open')}
          className="iconWithText"
        >
          <DownloadDone />
          {t('info.installedInfo', 'Installed Information')}
        </span>
      }
    >
      <div className="poppedElement">{info}</div>
    </PopoverComponent>
  )
}

export default InstalledInfo
