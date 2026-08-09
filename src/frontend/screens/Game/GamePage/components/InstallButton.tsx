import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { openInstallGameModal } from 'frontend/state/InstallGameModal'
import GameContext from '../../GameContext'
import { Cancel, Download, Error, Pause, Warning } from '@mui/icons-material'
import { cx as classNames } from 'frontend/helpers/cx'
import { GameInfo } from 'common/types'

interface Props {
  gameInfo: GameInfo
  is_installed: boolean
  handleInstall: (is_installed: boolean) => void
}

const InstallButton = ({ gameInfo, is_installed, handleInstall }: Props) => {
  const { t } = useTranslation('gamepage')
  const { is } = useContext(GameContext)

  const disabledInstallButtons =
    is.playing ||
    is.updating ||
    is.reparing ||
    is.moving ||
    is.uninstalling ||
    is.notSupportedGame ||
    is.notInstallable ||
    is.importing

  function getButtonLabel() {
    if (is.notInstallable) {
      return (
        <span className="buttonWithIcon">
          <Error style={{ cursor: 'not-allowed' }} />
          {t('status.goodie', 'Not installable')}
        </span>
      )
    }
    if (is.notSupportedGame) {
      return (
        <span className="buttonWithIcon">
          <Warning style={{ cursor: 'not-allowed' }} />
          {t('status.notSupported', 'Not supported')}
        </span>
      )
    }

    if (is.queued) {
      return (
        <span className="buttonWithIcon">
          <Cancel />
          {t('button.queue.remove', 'Remove from Queue')}
        </span>
      )
    }

    if (is.installing) {
      return (
        <span className="buttonWithIcon">
          <Pause />
          {t('button.cancel')}
        </span>
      )
    }
    return (
      <span className="buttonWithIcon">
        <Download />
        {t('button.install')}
      </span>
    )
  }

  return (
    <>
      {(!is_installed || is.queued) && (
        <span className="installButtons">
          <button
            onClick={() => {
              if (!is_installed && !is.queued) {
                openInstallGameModal({
                  appName: gameInfo.app_name,
                  runner: gameInfo.runner,
                  gameInfo,
                  action: 'install'
                })
                return
              }
              handleInstall(is_installed)
            }}
            disabled={disabledInstallButtons}
            autoFocus={true}
            className={classNames(
              'button',
              {
                'is-primary': is_installed,
                'is-tertiary':
                  is.notAvailable ||
                  is.installing ||
                  is.queued ||
                  is.notInstallable,
                'is-secondary': !is_installed && !is.queued
              },
              'mainBtn'
            )}
          >
            {getButtonLabel()}
          </button>
          <button
            disabled={disabledInstallButtons || is.installing || is.importing}
            className={'button mainBtn outline'}
            onClick={() =>
              openInstallGameModal({
                appName: gameInfo.app_name,
                runner: gameInfo.runner,
                gameInfo,
                action: 'import'
              })
            }
          >
            {t('button.import', 'Import Game')}
          </button>
        </span>
      )}
    </>
  )
}

export default InstallButton
