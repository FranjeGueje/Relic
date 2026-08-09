import { faLinux, faWindows } from '@fortawesome/free-brands-svg-icons'
import { IconDefinition } from '@fortawesome/free-solid-svg-icons'

import { useCallback, useContext, useState } from 'react'

import ContextProvider from 'frontend/state/ContextProvider'
import { GameInfo, InstallPlatform, Runner } from 'common/types'
import { Dialog } from 'frontend/components/UI/Dialog'

import './index.scss'

import DownloadDialog from './DownloadDialog'
import ImportDialog from './ImportDialog'
import { SelectField } from 'frontend/components/UI'
import { useTranslation } from 'react-i18next'
import ThirdPartyDialog from './ThirdPartyDialog'
import { Box, MenuItem, SvgIcon } from '@mui/material'
import {
  closeInstallGameModal,
  useInstallGameModal
} from 'frontend/state/InstallGameModal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

type Props = {
  appName: string
  runner: Runner
  gameInfo?: GameInfo | null
}

export type AvailablePlatforms = {
  name: string
  available: boolean
  value: InstallPlatform
  icon: IconDefinition
}[]

function InstallModal({ appName, runner, gameInfo = null }: Props) {
  const { platform } = useContext(ContextProvider)
  const { t } = useTranslation('gamepage')
  const { action = 'install' } = useInstallGameModal()

  const isLinuxNative = Boolean(gameInfo?.is_linux_native)
  const isLinux = platform === 'linux'

  const platforms: AvailablePlatforms = [
    {
      name: 'Linux',
      available: isLinux && isLinuxNative,
      value: 'linux',
      icon: faLinux
    },
    {
      name: 'Windows',
      available: true,
      value: 'Windows',
      icon: faWindows
    }
  ]

  const availablePlatforms: AvailablePlatforms = platforms.filter(
    (p) => p.available
  )

  const getDefaultplatform = (): InstallPlatform => {
    return 'Windows'
  }

  const [platformToInstall, setPlatformToInstall] =
    useState<InstallPlatform>(getDefaultplatform())

  function platformSelection() {
    const showPlatformSelection = availablePlatforms.length > 1

    if (!showPlatformSelection) {
      return null
    }
    const disabledPlatformSelection = false
    return (
      <SelectField
        label={`${t('game.platform', 'Select Platform Version to Install')}:`}
        htmlId="platformPick"
        value={platformToInstall}
        disabled={disabledPlatformSelection}
        onChange={(e) =>
          setPlatformToInstall(e.target.value as InstallPlatform)
        }
      >
        {availablePlatforms.map((p, i) => (
          <MenuItem value={p.value} key={i}>
            <Box sx={{ display: 'flex', placeItems: 'center' }}>
              <SvgIcon sx={{ marginInlineEnd: 1 }}>
                <FontAwesomeIcon icon={p.icon} />
              </SvgIcon>
              {p.name}
            </Box>
          </MenuItem>
        ))}
      </SelectField>
    )
  }

  const showDownloadDialog = gameInfo
  const isThirdPartyManagedApp = gameInfo && !!gameInfo.thirdPartyManagedApp
  const isImportMode = action === 'import'

  const closeModal = useCallback(() => closeInstallGameModal(), [])

  return (
    <div className="InstallModal">
      <Dialog
        onClose={closeModal}
        showCloseButton
        className="InstallModal__dialog"
      >
        {isThirdPartyManagedApp ? (
          <ThirdPartyDialog
            appName={appName}
            runner={runner}
            availablePlatforms={availablePlatforms}
            backdropClick={closeModal}
            platformToInstall={platformToInstall}
            gameInfo={gameInfo}
          >
            {platformSelection()}
          </ThirdPartyDialog>
        ) : isImportMode && showDownloadDialog ? (
          <ImportDialog
            appName={appName}
            runner={runner}
            availablePlatforms={availablePlatforms}
            backdropClick={closeModal}
            platformToInstall={platformToInstall}
            gameInfo={gameInfo}
          >
            {platformSelection()}
          </ImportDialog>
        ) : showDownloadDialog ? (
          <DownloadDialog
            appName={appName}
            runner={runner}
            availablePlatforms={availablePlatforms}
            backdropClick={closeModal}
            platformToInstall={platformToInstall}
            gameInfo={gameInfo}
          >
            {platformSelection()}
          </DownloadDialog>
        ) : null}
      </Dialog>
    </div>
  )
}

export function InstallGameWrapper() {
  const installGameModalState = useInstallGameModal()

  if (!installGameModalState.isOpen) {
    return <></>
  }

  return (
    <InstallModal
      appName={installGameModalState.appName!}
      runner={installGameModalState.runner!}
      gameInfo={installGameModalState.gameInfo}
    />
  )
}
