import './index.css'

import { useCallback, useContext, useEffect, useState } from 'react'

import { GameInfo, GameStatus, Runner } from 'common/types'

import { createNewWindow, repair } from 'frontend/helpers'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'

import { CircularProgress, SvgIcon } from '@mui/material'
import UninstallModal from 'frontend/components/UI/UninstallModal'
import GameContext from '../GameContext'
import {
  ArrowUpward as ArrowUpwardIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  DesktopAccessDisabled as DesktopAccessDisabledIcon,
  DriveFileMove as DriveFileMoveIcon,
  Folder as FolderIcon,
  Info as InfoIcon,
  PictureInPicture as PictureInPictureIcon,
  Repartition as RepartitionIcon
} from '@mui/icons-material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLinux } from '@fortawesome/free-brands-svg-icons'

interface Props {
  appName: string
  isInstalled: boolean
  title: string
  storeUrl: string
  changelog?: string
  runner: Runner
  handleUpdate: () => void
  handleChangeLog: () => void
  disableUpdate: boolean
  onShowRequirements?: () => void
  onShowModifyInstall?: () => void
  gameInfo: GameInfo
}

export default function GamesSubmenu({
  appName,
  isInstalled,
  title,
  storeUrl,
  changelog,
  runner,
  handleUpdate,
  handleChangeLog,
  disableUpdate,
  onShowRequirements,
  onShowModifyInstall,
  gameInfo
}: Props) {
  const { refresh, platform, libraryStatus, showDialogModal } =
    useContext(ContextProvider)
  const { is, gameSettings } = useContext(GameContext)
  const isWin = platform === 'win32'
  const isLinux = platform === 'linux'

  const [eosOverlayEnabled, setEosOverlayEnabled] = useState<boolean>(false)
  const [eosOverlayRefresh, setEosOverlayRefresh] = useState<boolean>(false)
  const eosOverlayAppName = '98bc04bc842e4906993fd6d6644ffb8d'
  const [showUninstallModal, setShowUninstallModal] = useState(false)
  const [protonDBurl, setProtonDBurl] = useState(
    `https://www.protondb.com/search?q=${title}`
  )
  const { t } = useTranslation('gamepage')
  const isSideloaded = runner === 'sideload'
  const isThirdPartyManaged = !!gameInfo.thirdPartyManagedApp

  async function onMoveInstallYesClick() {
    const { defaultInstallPath } = await window.api.requestAppSettings()
    const path = await window.api.openDialog({
      buttonLabel: t('box.choose'),
      properties: ['openDirectory'],
      title: t('box.move.path'),
      defaultPath: defaultInstallPath
    })
    if (path) {
      await window.api.moveInstall({ appName, path, runner })
    }
  }

  function handleMoveInstall() {
    showDialogModal({
      showDialog: true,
      message: t('box.move.message'),
      title: t('box.move.title'),
      buttons: [
        { text: t('box.yes'), onClick: onMoveInstallYesClick },
        { text: t('box.no') }
      ]
    })
  }

  async function onRepairYesClick(appName: string) {
    await repair(appName, runner)
  }

  function handleRepair(appName: string) {
    showDialogModal({
      showDialog: true,
      message: t('box.repair.message'),
      title: t('box.repair.title'),
      buttons: [
        { text: t('box.yes'), onClick: async () => onRepairYesClick(appName) },
        { text: t('box.no') }
      ]
    })
  }

  async function handleEosOverlay() {
    setEosOverlayRefresh(true)
    if (eosOverlayEnabled) {
      await window.api.disableEosOverlay(appName)
      setEosOverlayEnabled(false)
    } else {
      const initialEnableResult = await window.api.enableEosOverlay(appName)
      const { installNow } = initialEnableResult
      let { wasEnabled } = initialEnableResult

      if (installNow) {
        await window.api.installEosOverlay()
        wasEnabled = (await window.api.enableEosOverlay(appName)).wasEnabled
      }
      setEosOverlayEnabled(wasEnabled)
    }
    setEosOverlayRefresh(false)
  }

  useEffect(() => {
    if (!isInstalled) {
      return
    }

    // only unix specific
    if (!isWin && runner === 'legendary') {
      // check if eos overlay is enabled
      const { status } =
        libraryStatus.filter(
          (game: GameStatus) => game.appName === eosOverlayAppName
        )[0] || {}
      setEosOverlayRefresh(status === 'installing')

      window.api
        .isEosOverlayEnabled(appName)
        .then((enabled) => setEosOverlayEnabled(enabled))
    }
  }, [isInstalled])

  useEffect(() => {
    // Get steam id and set direct proton db link
    window.api.getWikiGameInfo(title, appName, runner).then((info) => {
      const steamID = info?.pcgamingwiki?.steamID ?? info?.gamesdb?.steamID
      if (steamID) {
        setProtonDBurl(`https://www.protondb.com/app/${steamID}`)
      }
    })
  }, [title, appName])

  const refreshCircle = () => {
    return <CircularProgress className="link button is-text is-link" />
  }

  const showModifyItem =
    onShowModifyInstall &&
    ['legendary', 'gog'].includes(runner) &&
    isInstalled &&
    !isThirdPartyManaged

  const onBrowseFiles = useCallback(() => {
    const path = gameInfo.install.install_path || gameInfo.folder_name

    if (path) {
      window.api.openFolder(path)
    }
  }, [gameInfo])

  return (
    <>
      <div className="gameTools subMenuContainer">
        {showUninstallModal && (
          <UninstallModal
            appName={appName}
            runner={runner}
            onClose={() => setShowUninstallModal(false)}
            isDlc={false}
          />
        )}
        <div className={`submenu`}>
          {isInstalled && (
            <>
              <button
                onClick={async () => setShowUninstallModal(true)}
                className="link button is-text is-link buttonWithIcon"
                disabled={is.playing}
              >
                <DeleteIcon />
                {t('button.uninstall', 'Uninstall')}
              </button>{' '}
              {!isSideloaded && !isThirdPartyManaged && (
                <button
                  onClick={async () => handleUpdate()}
                  className="link button is-text is-link buttonWithIcon"
                  disabled={disableUpdate}
                >
                  <ArrowUpwardIcon />
                  {t('button.force_update', 'Force Update if Available')}
                </button>
              )}{' '}
              {!isSideloaded && !isThirdPartyManaged && (
                <button
                  onClick={async () => handleMoveInstall()}
                  className="link button is-text is-link buttonWithIcon"
                >
                  <DriveFileMoveIcon />
                  {t('submenu.move', 'Move Game')}
                </button>
              )}{' '}
              {!isSideloaded && !isThirdPartyManaged && (
                <button
                  onClick={async () => handleRepair(appName)}
                  className="link button is-text is-link buttonWithIcon"
                >
                  <CheckCircleIcon />
                  {t('submenu.verify', 'Verify and Repair')}
                </button>
              )}{' '}
              {isLinux &&
                runner === 'legendary' &&
                (eosOverlayRefresh ? (
                  refreshCircle()
                ) : (
                  <button
                    className="link button is-text is-link buttonWithIcon"
                    onClick={handleEosOverlay}
                  >
                    <PictureInPictureIcon />
                    {eosOverlayEnabled
                      ? t('submenu.disableEosOverlay', 'Disable EOS Overlay')
                      : t('submenu.enableEosOverlay', 'Enable EOS Overlay')}
                  </button>
                ))}
            </>
          )}
          {!isSideloaded && !!changelog?.length && (
            <button
              onClick={() => handleChangeLog()}
              className="link button is-text is-link buttonWithIcon"
            >
              <InfoIcon />
              {t('button.changelog', 'Show Changelog')}
            </button>
          )}{' '}
          {!isSideloaded && isLinux && (
            <button
              onClick={() => createNewWindow(protonDBurl)}
              className="link button is-text is-link buttonWithIcon"
            >
              <SvgIcon>
                <FontAwesomeIcon icon={faLinux} />
              </SvgIcon>
              {t('submenu.protondb', 'Check Compatibility')}
            </button>
          )}
          {onShowRequirements && (
            <button
              onClick={async () => onShowRequirements()}
              className="link button is-text is-link buttonWithIcon"
            >
              <DesktopAccessDisabledIcon />
              {t('game.requirements', 'Requirements')}
            </button>
          )}
          {showModifyItem && (
            <button
              onClick={async () => onShowModifyInstall()}
              className="link button is-text is-link buttonWithIcon"
            >
              <RepartitionIcon />
              {t('game.modify', 'Modify Installation')}
            </button>
          )}
          {isInstalled && (
            <button
              onClick={async () => onBrowseFiles()}
              className="link button is-text is-link buttonWithIcon"
            >
              <FolderIcon />
              {t('button.browse_files', 'Browse Files')}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
