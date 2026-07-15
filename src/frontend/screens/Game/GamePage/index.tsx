import './index.css'

import React, { useContext, useEffect, useRef, useState } from 'react'

import {
  ArrowBackIosNew,
  Info,
  Star,
  Monitor,
  EmojiEvents
} from '@mui/icons-material'

import { Tab, Tabs } from '@mui/material'

import {
  getGameInfo,
  getInstallInfo,
  updateGame
} from 'frontend/helpers'
import { Link, NavLink, useLocation, useParams } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { CachedImage, UpdateComponent, TabPanel } from 'frontend/components/UI'
import UninstallModal from 'frontend/components/UI/UninstallModal'

import {
  ExtraInfo,
  GameInfo,
  GameSettings,
  Runner,
  InstallInfo,
  GameAchievement
} from 'common/types'

import GamePicture from '../GamePicture'

import { install } from 'frontend/helpers/library'
import { hasProgress } from 'frontend/hooks/hasProgress'
import ErrorComponent from 'frontend/components/UI/ErrorComponent'

import StoreLogos from 'frontend/components/UI/StoreLogos'
import { hasStatus } from 'frontend/hooks/hasStatus'
import GameContext from '../GameContext'
import { GameContextType } from 'frontend/types'
import {
  Description,
  Developer,
  DotsMenu,
  DownloadSizeInfo,
  GameStatus,
  InstallButton,
  InstalledInfo,
  Requirements
} from './components'
import { hasHelp } from 'frontend/hooks/hasHelp'
import Genres from './components/Genres'
import ReleaseDate from './components/ReleaseDate'
import { hasKnownFixes } from 'frontend/hooks/hasKnownFixes'
import { openInstallGameModal } from 'frontend/state/InstallGameModal'
import useSettingsContext from 'frontend/hooks/useSettingsContext'
import SettingsContext from 'frontend/screens/Settings/SettingsContext'
import useGlobalState from 'frontend/state/GlobalStateV2'
import Achievements from './components/Achievements'

export default React.memo(function GamePage(): JSX.Element | null {
  const { appName, runner } = useParams() as { appName: string; runner: Runner }
  const location = useLocation() as {
    state: { fromDM: boolean; gameInfo: GameInfo }
  }
  const { t, i18n } = useTranslation('gamepage')
  const { t: t2 } = useTranslation()

  const { gameInfo: locationGameInfo } = location.state

  const [showUninstallModal, setShowUninstallModal] = useState(false)

  const { epic, gog, gameUpdates, platform, showDialogModal, connectivity } =
    useContext(ContextProvider)

  const { settingsModalProps } = useGlobalState.keys('settingsModalProps')

  hasHelp(
    'gamePage',
    t('help.title.gamePage', 'Game Page'),
    <p>
      {t(
        'help.content.gamePage',
        'Show all game details and actions. Use the 3 dots menu for more options.'
      )}
    </p>
  )

  const [gameInfo, setGameInfo] = useState(locationGameInfo)
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null)

  const { status, folder, statusContext } = hasStatus(gameInfo)
  const gameAvailable = gameInfo.is_installed && status !== 'notAvailable'

  const [progress, previousProgress] = hasProgress(appName, runner)

  const [extraInfo, setExtraInfo] = useState<ExtraInfo | null>(
    gameInfo.extra || null
  )
  const [achievements, setAchievements] = useState<GameAchievement[]>([])
  const hasAchievements = achievements && achievements.length > 0
  const achievementPercentage = hasAchievements
    ? Math.round(
        (achievements.filter((x) => x.date_unlocked).length /
          achievements.length) *
          100
      )
    : 0

  const [notInstallable, setNotInstallable] = useState<boolean>(false)
  const [gameInstallInfo, setGameInstallInfo] = useState<InstallInfo | null>(
    null
  )

  const [hasError, setHasError] = useState<{
    error: boolean
    message: unknown
  }>({ error: false, message: '' })

  const knownFixes = hasKnownFixes(appName, runner)

  const isWin = platform === 'win32'
  const isLinux = platform === 'linux'
  const isMac = platform === 'darwin'
  const isSideloaded = runner === 'sideload'
  const isBrowserGame = gameInfo?.install.platform === 'Browser'

  const isInstalling = status === 'installing'
  const isImporting = status === 'importing'
  const isPlaying = status === 'playing'
  const isUpdating = status === 'updating'
  const isQueued = status === 'queued'
  const isReparing = status === 'repairing'
  const isMoving = status === 'moving'
  const isUninstalling = status === 'uninstalling'
  const isSyncing = status === 'syncing-saves'
  const isLaunching = status === 'launching'
  const isInstallingRedist = status === 'redist'
  const notAvailable = !gameAvailable && gameInfo.is_installed
  const notSupportedGame =
    gameInfo.runner !== 'sideload' &&
    !!gameInfo.thirdPartyManagedApp &&
    !gameInfo.isEAManaged &&
    !gameInfo.isUbisoftManaged
  const isOffline = connectivity.status !== 'online'
  const notPlayableOffline = isOffline && !gameInfo.canRunOffline

  const backRoute = location.state?.fromDM ? '/download-manager' : '/library'

  const storage: Storage = window.localStorage

  const [currentTab, setCurrentTab] = useState<
    'info' | 'achievements' | 'extra' | 'requirements'
  >('info')

  const previousIsPlaying = useRef<boolean>(isPlaying)
  useEffect(() => {
    const updateAchievements = async () => {
      if (!isPlaying && previousIsPlaying.current)
        window.api.clearAchievementCache(appName)
      setAchievements(await window.api.getAchievements(appName, runner))
    }

    updateAchievements()
    previousIsPlaying.current = isPlaying
  }, [isPlaying, appName])

  useEffect(() => {
    const updateGameInfo = async () => {
      if (status) {
        const newInfo = await getGameInfo(appName, runner)
        if (newInfo) {
          setGameInfo(newInfo)
        }
        setExtraInfo(await window.api.getExtraInfo(appName, runner))
      }
    }
    updateGameInfo()
  }, [status, gog.library, epic.library, isMoving])

  useEffect(() => {
    const updateConfig = async () => {
      if (gameInfo && status) {
        const {
          install,
          thirdPartyManagedApp,
          is_mac_native = undefined
        } = { ...gameInfo }

        const installPlatform =
          install.platform || (is_mac_native && isMac ? 'Mac' : 'Windows')

        if (
          runner !== 'sideload' &&
          !notSupportedGame &&
          !notInstallable &&
          !thirdPartyManagedApp &&
          !isOffline
        ) {
          getInstallInfo(appName, runner, installPlatform)
            .then((info) => {
              if (!info) {
                throw new Error('Cannot get game info')
              }
              if (
                info.manifest &&
                info.manifest.disk_size === 0 &&
                info.manifest.download_size === 0
              ) {
                setNotInstallable(true)
                return
              }
              setGameInstallInfo(info)
            })
            .catch((error) => {
              console.error(error)
              window.api.logError(`${`${error}`}`)
              setHasError({ error: true, message: `${error}` })
            })
        }

        try {
          const gameSettings = await window.api.requestGameSettings(appName)
          setGameSettings(gameSettings)
        } catch (error) {
          setHasError({ error: true, message: error })
          window.api.logError(`${error}`)
        }
      }
    }
    updateConfig()
  }, [
    status,
    epic.library,
    gog.library,
    gameInfo,
    settingsModalProps.isOpen,
    isOffline
  ])

  function handleUpdate() {
    if (gameInfo.runner !== 'sideload')
      updateGame({ appName, runner, gameInfo })
  }

  function handleModal() {
    openInstallGameModal({ appName, runner, gameInfo })
  }

  let hasUpdate = false

  const settingsContextValues = useSettingsContext({
    appName,
    gameInfo,
    runner
  })

  if (gameInfo && gameInfo.install && settingsContextValues) {
    const {
      runner,
      art_background,
      art_logo,
      install: { platform: installPlatform },
      is_installed
    } = gameInfo
    const title = gameInfo.overrides?.title || gameInfo.title
    const art_cover = gameInfo.overrides?.art_cover || gameInfo.art_cover

    hasUpdate = is_installed && gameUpdates?.includes(appName)

    /*
    Other Keys:
    t('box.stopInstall.title')
    t('box.stopInstall.message')
    t('box.stopInstall.keepInstalling')
    */

    if (hasError.error) {
      if (
        hasError.message !== undefined &&
        typeof hasError.message === 'string'
      )
        window.api.logError(hasError.message)
      const message =
        typeof hasError.message === 'string'
          ? hasError.message
          : t('generic.error', 'Unknown error')
      return <ErrorComponent message={message} />
    }

    const isMacNative = ['osx', 'Mac'].includes(installPlatform ?? '')
    const isLinuxNative = ['linux', 'Linux'].includes(installPlatform ?? '')

    // create setting context functions
    const contextValues: GameContextType = {
      appName,
      gameInfo,
      runner,
      gameSettings,
      gameInstallInfo,
      gameExtraInfo: extraInfo,
      is: {
        installing: isInstalling,
        importing: isImporting,
        installingRedist: isInstallingRedist,
        launching: isLaunching,
        linux: isLinux,
        linuxNative: isLinuxNative,
        mac: isMac,
        macNative: isMacNative,
        moving: isMoving,
        native: isWin || isMacNative || isLinuxNative,
        notAvailable,
        notInstallable,
        notSupportedGame,
        playing: isPlaying,
        queued: isQueued,
        reparing: isReparing,
        sideloaded: isSideloaded,
        syncing: isSyncing,
        uninstalling: isUninstalling,
        updating: isUpdating,
        win: isWin,
        notPlayableOffline: notPlayableOffline
      },
      statusContext,
      status
    }

    const hasRequirements = extraInfo ? extraInfo.reqs.length > 0 : false

    let wikiLink = <></>
    if (knownFixes && knownFixes.wikiLink) {
      wikiLink = (
        <p className="wikiLink">
          <Info />
          <span>
            <Trans key="wikiLink" i18n={i18n}>
              Important information about this game, read this:&nbsp;
              <Link to={knownFixes.wikiLink}>Open page</Link>
            </Trans>
          </span>
        </p>
      )
    }

    return (
      <SettingsContext.Provider value={settingsContextValues}>
        <div className="gameConfigContainer">
          {!!(art_background ?? art_cover) && (
            <CachedImage
              src={art_background || art_cover}
              className="backgroundImage"
            />
          )}
          {showUninstallModal && (
            <UninstallModal
              appName={appName}
              runner={runner}
              onClose={() => setShowUninstallModal(false)}
              isDlc={false}
            />
          )}

          {title ? (
            <>
              <GameContext.Provider value={contextValues}>
                {/* NEW DESIGN */}
                <>
                  <div className="topRowWrapper">
                    <NavLink
                      className="backButton"
                      to={backRoute}
                      title={t2('webview.controls.back', 'Go Back')}
                    >
                      <ArrowBackIosNew />
                    </NavLink>
                    <div className="topRowWapperInner">
                      <DotsMenu
                        gameInfo={gameInfo}
                        handleUpdate={handleUpdate}
                      />
                    </div>
                  </div>
                  <div className="mainInfoWrapper">
                    <div className="mainInfo">
                      <GamePicture
                        art_square={art_cover}
                        art_logo={art_logo}
                        store={runner}
                      />
                      <div className="store-icon">
                        <StoreLogos runner={runner} />
                      </div>

                      <h1 style={{ opacity: art_logo ? 0 : 1 }}>{title}</h1>
                      <Genres
                        genres={
                          gameInfo.extra?.genres ||
                          []
                        }
                      />
                      <Developer gameInfo={gameInfo} />
                      <ReleaseDate
                        runnerDate={extraInfo?.releaseDate}
                      />

                      <Description />
                      <GameStatus
                        gameInfo={gameInfo}
                        progress={progress}
                        handleUpdate={handleUpdate}
                        hasUpdate={hasUpdate}
                      />
                      <div className="buttons">
                        <InstallButton
                          gameInfo={gameInfo}
                          is_installed={gameInfo.is_installed}
                          handleInstall={handleInstall}
                        />
                      </div>
                      {wikiLink}
                    </div>
                  </div>
                  <div className="extraInfoWrapper">
                    <div className="extraInfo">
                      <div className="extraInfoTabs">
                        <Tabs
                          className="gameInfoTabs"
                          value={currentTab}
                          onChange={(e, newVal) => setCurrentTab(newVal)}
                          aria-label="gameinfo tabs"
                          selectionFollowsFocus
                          variant="scrollable"
                          scrollButtons="auto"
                        >
                          <Tab
                            className="tabButton"
                            value={'info'}
                            label={t('game.install_info', 'Install info')}
                            iconPosition="start"
                            icon={<Info className="gameInfoTabsIcon" />}
                          />
                          {hasAchievements && (
                            <Tab
                              className="tabButton"
                              value={'achievements'}
                              label={
                                t('game.achievements', 'Achievements') +
                                ` · ${achievementPercentage}%`
                              }
                              iconPosition="start"
                              icon={
                                <EmojiEvents className="gameInfoTabsIcon" />
                              }
                            />
                          )}
                          {hasRequirements && (
                            <Tab
                              className="tabButton"
                              value={'requirements'}
                              label={t('game.requirements', 'Requirements')}
                              iconPosition="start"
                              icon={<Monitor className="gameInfoTabsIcon" />}
                            />
                          )}
                        </Tabs>
                      </div>

                      <div>
                        <TabPanel
                          value={currentTab}
                          index="achievements"
                          className="achievementsTab"
                        >
                          <Achievements achievements={achievements} />
                        </TabPanel>
                        <TabPanel
                          value={currentTab}
                          index="info"
                          className="infoTab"
                        >
                          <DownloadSizeInfo gameInfo={gameInfo} />
                          <InstalledInfo gameInfo={gameInfo} />
                        </TabPanel>

                         
                        <TabPanel
                          className="tabPanelRequirements"
                          value={currentTab}
                          index="requirements"
                        >
                          <Requirements />
                        </TabPanel>
                      </div>
                    </div>
                  </div>
                </>
              </GameContext.Provider>
            </>
          ) : (
            <UpdateComponent />
          )}
        </div>
      </SettingsContext.Provider>
    )
  }
  return <UpdateComponent />

  async function handleInstall(is_installed: boolean) {
    if (isQueued) {
      storage.removeItem(appName)
      return window.api.removeFromDMQueue(appName)
    }

    if (!is_installed && !isInstalling) {
      return handleModal()
    }

    if (!folder) {
      return
    }

    if (gameInfo.runner === 'sideload') return

    return install({
      gameInfo,
      installPath: folder,
      isInstalling,
      previousProgress,
      progress,
      t,
      showDialogModal: showDialogModal
    })
  }
})
