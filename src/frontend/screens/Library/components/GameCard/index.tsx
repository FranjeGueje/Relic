import './index.css'

import { useContext, CSSProperties, useMemo, useState, useEffect } from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRepeat, faBan } from '@fortawesome/free-solid-svg-icons'

import DownIcon from 'frontend/assets/down-icon.svg?react'
import { FavouriteGame, GameInfo, HiddenGame } from 'common/types'
import { Link, useNavigate } from 'react-router-dom'
import StopIcon from 'frontend/assets/stop-icon.svg?react'
import StopIconAlt from 'frontend/assets/stop-icon-alt.svg?react'
import {
  getGameInfo,
  getProgress,
  getStoreName,
  repair,
  sendKill
} from 'frontend/helpers'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { updateGame } from 'frontend/helpers/library'
import { CachedImage, SvgButton } from 'frontend/components/UI'
import ContextMenu, { Item } from '../ContextMenu'
import { hasProgress } from 'frontend/hooks/hasProgress'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'

import classNames from 'classnames'
import StoreLogos from 'frontend/components/UI/StoreLogos'
import UninstallModal from 'frontend/components/UI/UninstallModal'
import ModifyInstallModal from 'frontend/screens/Game/ModifyInstallModal'
import { getCardStatus, getImageFormatting } from './constants'
import { hasStatus } from 'frontend/hooks/hasStatus'
import fallBackImage from 'frontend/assets/relic_card.jpg'
import LibraryContext from '../../LibraryContext'
import {
  Cancel,
  CheckCircle,
  DeleteForever,
  Download,
  DriveFileMove,
  Favorite,
  FavoriteBorder,
  Folder,
  OpenInNew,
  PlaylistRemove,
  Repartition,
  Upgrade,
  Visibility,
  VisibilityOff
} from '@mui/icons-material'

interface Card {
  buttonClick: () => void
  hasUpdate: boolean
  isRecent: boolean
  justPlayed: boolean
  gameInfo: GameInfo
  forceCard?: boolean
  dataTour?: string
}

const GameCard = ({
  hasUpdate,
  buttonClick,
  forceCard,
  isRecent = false,
  justPlayed = false,
  gameInfo: gameInfoFromProps,
  dataTour
}: Card) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // render an empty div until the card enters the viewport
    // check GameList for the other side of this detection
    const callback = (e: CustomEvent<{ appNames: string[] }>) => {
      if (e.detail.appNames.includes(gameInfoFromProps.app_name)) {
        setVisible(true)
      }
    }

    window.addEventListener('visible-cards', callback)

    return () => {
      window.removeEventListener('visible-cards', callback)
    }
  }, [])

  const [gameInfo, setGameInfo] = useState<GameInfo>(gameInfoFromProps)
  const [showUninstallModal, setShowUninstallModal] = useState(false)
  const [showModifyInstallModal, setShowModifyInstallModal] = useState(false)

  const { t } = useTranslation('gamepage')
  const { t: t2 } = useTranslation()

  const navigate = useNavigate()

  const {
    hiddenGames,
    favouriteGames,
    showDialogModal,
    activeController
  } = useContext(ContextProvider)
  const { layout } = useContext(LibraryContext)

  const {
    art_logo: logo = undefined,
    app_name: appName,
    runner,
    is_installed: isInstalled,
    install: gameInstallInfo
  } = { ...gameInfoFromProps }
  const title = gameInfoFromProps.overrides?.title || gameInfoFromProps.title
  const art_cover =
    gameInfoFromProps.overrides?.art_cover || gameInfoFromProps.art_cover
  const cover =
    gameInfoFromProps.overrides?.art_square || gameInfoFromProps.art_square

  const isInstallable =
    gameInfo.installable === undefined || gameInfo.installable // If it's undefined we assume it's installable

  const [progress] = hasProgress(appName, runner)
  const { install_size: size = '0' } = {
    ...gameInstallInfo
  }

  const { status, label } = hasStatus(gameInfo, size)

  const isThirdPartyManaged = !!gameInfo.thirdPartyManagedApp

  useEffect(() => {
    const updateGameInfo = async () => {
      const newInfo = await getGameInfo(appName, runner)
      if (newInfo) {
        setGameInfo(newInfo)
      }
    }
    updateGameInfo()
  }, [status])

  async function handleUpdate() {
    updateGame({ appName, runner, gameInfo })
  }

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

  async function onRepairYesClick() {
    await repair(appName, runner)
  }

  function handleRepair() {
    showDialogModal({
      showDialog: true,
      message: t('box.repair.message'),
      title: t('box.repair.title'),
      buttons: [
        { text: t('box.yes'), onClick: onRepairYesClick },
        { text: t('box.no') }
      ]
    })
  }

  const grid = forceCard || layout === 'grid'

  const {
    isInstalling,
    notSupportedGame,
    isUninstalling,
    isQueued,
    isPlaying,
    notAvailable,
    isUpdating,
    haveStatus
  } = getCardStatus(status, isInstalled, layout)

  const installingGrayscale = isInstalling
    ? `${125 - getProgress(progress)}%`
    : '100%'

  const handleRemoveFromQueue = () => {
    window.api.removeFromDMQueue(appName)
  }

  const renderIcon = () => {
    if (!isInstallable) {
      return (
        <FontAwesomeIcon
          title={t(
            'label.game.not-installable-game',
            'Game is NOT Installable'
          )}
          className="downIcon"
          icon={faBan}
        />
      )
    }

    if (notSupportedGame) {
      return (
        <FontAwesomeIcon
          title={t(
            'label.game.third-party-game',
            'Third-Party Game NOT Supported'
          )}
          className="downIcon"
          icon={faBan}
        />
      )
    }
    if (isUninstalling) {
      return (
        <button className="svg-button iconDisabled">
          <svg />
        </button>
      )
    }
    if (isQueued) {
      return (
        <SvgButton
          title={t('button.queue.remove', 'Remove from Queue')}
          className="queueIcon"
          onClick={() => handleRemoveFromQueue()}
        >
          <RemoveCircleIcon />
        </SvgButton>
      )
    }
    if (isPlaying) {
      return (
        <SvgButton
          className="cancelIcon"
          onClick={async () => sendKill(appName, runner)}
          title={`${t('label.playing.stop')} (${title})`}
        >
          <StopIconAlt />
        </SvgButton>
      )
    }
    if (isInstalling || isQueued) {
      return (
        <SvgButton
          className="cancelIcon"
          onClick={async () => sendKill(appName, runner)}
          title={`${t('button.cancel')} (${title})`}
        >
          <StopIcon />
        </SvgButton>
      )
    }
    if (isInstalled) {
      return <></>
    } else {
      return (
        <SvgButton
          className="downIcon"
          onClick={() => buttonClick()}
          title={`${t('button.install')} (${title})`}
        >
          <DownIcon />
        </SvgButton>
      )
    }
  }

  const isHiddenGame = useMemo(() => {
    return !!hiddenGames.list.find(
      (hiddenGame: HiddenGame) => hiddenGame.appName === appName
    )
  }, [hiddenGames, appName])

  const isFavouriteGame = useMemo(() => {
    return !!favouriteGames.list.find(
      (favouriteGame: FavouriteGame) => favouriteGame.appName === appName
    )
  }, [favouriteGames, appName])

  const onUninstallClick = function () {
    setShowUninstallModal(true)
  }

  const items: Item[] = [
    {
      // remove from install queue
      label: t('button.queue.remove'),
      onclick: () => handleRemoveFromQueue(),
      show: isQueued && !isInstalling,
      icon: <Cancel />
    },
    {
      // stop if running
      label: t('label.playing.stop'),
      onclick: async () => sendKill(appName, runner),
      show: isPlaying,
      icon: <Cancel />
    },
    {
      // update
      label: t('button.update', 'Update'),
      onclick: async () => handleUpdate(),
      show: hasUpdate && !isUpdating && !isQueued,
      icon: <Upgrade />
    },
    {
      // install
      label: t('button.install'),
      onclick: () => buttonClick(),
      show: !isInstalled && !isQueued && isInstallable,
      icon: <Download />
    },
    {
      // cancel installation/update
      label: t('button.cancel'),
      onclick: async () => sendKill(appName, runner),
      show: isInstalling || isUpdating,
      icon: <Cancel />
    },
    {
      // open the game page
      label: t('button.details', 'Details'),
      onclick: () =>
        navigate(`/gamepage/${runner}/${appName}`, { state: { gameInfo } }),
      show: true,
      icon: <OpenInNew />
    },
    {
      label: t('button.force_update', 'Force Update if Available'),
      onclick: async () => handleUpdate(),
      show: isInstalled && !isThirdPartyManaged,
      icon: <Upgrade />
    },
    {
      label: t('submenu.move', 'Move Game'),
      onclick: () => handleMoveInstall(),
      show: isInstalled && !isThirdPartyManaged,
      icon: <DriveFileMove />
    },
    {
      label: t('submenu.verify', 'Verify and Repair'),
      onclick: () => handleRepair(),
      show: isInstalled && !isThirdPartyManaged,
      icon: <CheckCircle />
    },
    {
      label: t('game.modify', 'Modify Installation'),
      onclick: () => setShowModifyInstallModal(true),
      show:
        ['legendary', 'gog'].includes(runner) &&
        isInstalled &&
        !isThirdPartyManaged,
      icon: <Repartition />
    },
    {
      label: t('button.browse_files', 'Browse Files'),
      onclick: () => {
        const folder =
          gameInfo.install.install_path || gameInfo.folder_name
        if (folder) window.api.openFolder(folder)
      },
      show: isInstalled,
      icon: <Folder />
    },
    {
      // hide
      label: t('button.hide_game', 'Hide Game'),
      onclick: () => hiddenGames.add(appName, title),
      show: !isHiddenGame,
      icon: <VisibilityOff />
    },
    {
      // unhide
      label: t('button.unhide_game', 'Unhide Game'),
      onclick: () => hiddenGames.remove(appName),
      show: isHiddenGame,
      icon: <Visibility />
    },
    {
      label: t('button.add_to_favourites', 'Add To Favourites'),
      onclick: () => favouriteGames.add(appName, title),
      show: !isFavouriteGame,
      icon: <Favorite />
    },
    {
      label: t('button.remove_from_favourites', 'Remove From Favourites'),
      onclick: () => favouriteGames.remove(appName),
      show: isFavouriteGame,
      icon: <FavoriteBorder />
    },
    {
      label: t('button.remove_from_recent', 'Remove From Recent'),
      onclick: async () => window.api.removeRecentGame(appName),
      show: isRecent,
      icon: <PlaylistRemove />
    },
    {
      // uninstall
      label: t('button.uninstall'),
      onclick: onUninstallClick,
      show: isInstalled && !isUpdating && !isPlaying,
      icon: <DeleteForever />
    }
  ]

  const wrapperClasses = classNames(grid ? 'gameCard' : 'gameListItem', {
    installed: isInstalled,
    hidden: isHiddenGame,
    notAvailable: notAvailable,
    gamepad: activeController,
    justPlayed: justPlayed
  })

  const imgClasses = classNames('gameImg', { installed: isInstalled })
  const logoClasses = classNames('gameLogo', { installed: isInstalled })

  const showUpdateButton =
    hasUpdate && !isUpdating && !isQueued && !notAvailable

  if (!visible) {
    return (
      <div
        className={wrapperClasses}
        data-app-name={appName}
        data-invisible={true}
        data-tour={dataTour}
      ></div>
    )
  }

  const showUpdateBadge =
    hasUpdate && !isUpdating && !isQueued && activeController

  const hasIcons = showUpdateButton || !isInstalled || isPlaying || isUninstalling || notSupportedGame || !isInstallable

  return (
    <div>
      {showUninstallModal && (
        <UninstallModal
          appName={appName}
          runner={runner}
          isDlc={Boolean(gameInfo.install.is_dlc)}
          onClose={() => setShowUninstallModal(false)}
        />
      )}
      {showModifyInstallModal && (
        <ModifyInstallModal
          gameInfo={gameInfo}
          gameInstallInfo={null}
          onClose={() => setShowModifyInstallModal(false)}
        />
      )}
      <ContextMenu items={items}>
        <div
          className={wrapperClasses}
          data-app-name={appName}
          data-tour={dataTour}
        >
          {haveStatus && <span className="gameCardStatus">{label}</span>}
          {showUpdateBadge && (
            <span className="gameCardUpdateBadge">
              {t('status.hasUpdates')}
            </span>
          )}
          <Link
            to={`/gamepage/${runner}/${appName}`}
            state={{ gameInfo }}
            style={
              { '--installing-effect': installingGrayscale } as CSSProperties
            }
          >
            <StoreLogos runner={runner} />
            {justPlayed ? (
              <CachedImage
                src={art_cover || fallBackImage}
                className="justPlayedImg"
                alt={title}
              />
            ) : (
              <CachedImage
                src={getImageFormatting(cover, runner)}
                className={imgClasses}
                alt="cover"
              />
            )}
            {(justPlayed || runner !== 'nile') && logo && (
              <CachedImage
                alt="logo"
                src={`${logo}?h=400&resize=1&w=300`}
                className={logoClasses}
              />
            )}
            {haveStatus && (
              <span
                className={classNames('gameListInfo', {
                  active: haveStatus,
                  installed: isInstalled
                })}
              >
                {label}
              </span>
            )}
            <span
              className={classNames('gameTitle', {
                active: haveStatus,
                installed: isInstalled
              })}
            >
              <span>{title}</span>
            </span>
            <span
              className={classNames('runner', {
                active: haveStatus,
                installed: isInstalled
              })}
            >
              {getStoreName(runner, t2('Other'))}
            </span>
          </Link>
          {hasIcons && (
            <span className="icons">
              {showUpdateButton && (
                <SvgButton
                  className="updateIcon"
                  title={`${t('button.update')} (${title})`}
                  onClick={async () => handleUpdate()}
                >
                  <FontAwesomeIcon size={'2x'} icon={faRepeat} />
                </SvgButton>
              )}

              {renderIcon()}
            </span>
          )}
        </div>
      </ContextMenu>
    </div>
  )
}

export default GameCard
