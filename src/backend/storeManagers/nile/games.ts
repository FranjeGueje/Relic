import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  GameSettings,
  InstallArgs,
  InstallProgress
} from 'common/types'
import { Game, InstallResult } from 'common/types/game_manager'
import { libraryManagerMap } from '..'
import {
  LogPrefix,
  logDebug,
  logError,
  logInfo,
  createGameLogWriter
} from 'backend/logger'
import { GameConfig } from 'backend/game_config'

import { existsSync } from 'fs'
import {
  killPattern,
  moveOnUnix,
  sendGameStatusUpdate,
  sendProgressUpdate
} from 'backend/utils'
import { GlobalConfig } from 'backend/config'
import {
  onGameInstalled,
  onGameImported,
  onGameMoved,
  onGameUninstalled
} from 'backend/relic/game_events'
import { sendFrontendMessage } from '../../ipc'
import { isLinux } from 'backend/constants/environment'

export default class NileGameManager implements Game {
  private readonly id: string

  constructor(id: string) {
    this.id = id
  }

  async getSettings(): Promise<GameSettings> {
    const gameConfig = GameConfig.get(this.id)
    return gameConfig.config || (await gameConfig.getSettings())
  }

  getGameInfo(): GameInfo {
    const info = libraryManagerMap['nile'].getGameInfo(this.id)
    if (!info) {
      logError(
        [
          'Could not get game info for',
          `${this.id},`,
          'returning empty object. Something is probably gonna go wrong soon'
        ],
        LogPrefix.Nile
      )
      return {
        app_name: '',
        runner: 'nile',
        art_cover: '',
        art_square: '',
        install: {},
        is_installed: false,
        title: '',
        canRunOffline: false
      }
    }
    return info
  }

  async getExtraInfo(): Promise<ExtraInfo> {
    const info = this.getGameInfo()
    return {
      reqs: [],
      about: info?.description
        ? {
            description: info.description,
            shortDescription: info.description
          }
        : undefined,
      releaseDate: info?.extra?.releaseDate
    }
  }

  async importGame(folderPath: string): Promise<ExecResult> {
    const importLogWriter = await createGameLogWriter(this.id, 'nile', 'import')
    const res = await libraryManagerMap['nile'].runRunnerCommand(
      ['import', '--path', folderPath, this.id],
      {
        abortId: this.id,
        logWriters: [importLogWriter],
        logMessagePrefix: `Importing ${this.id}`
      }
    )

    if (res.abort) {
      return res
    }

    if (res.error) {
      logError(['Failed to import', `${this.id}:`, res.error], LogPrefix.Nile)
      return res
    }

    const errorMatch = res.stderr.match(/ERROR \[IMPORT]:\t(.*)/)
    if (errorMatch) {
      logError(
        ['Failed to import', `${this.id}:`, errorMatch[1]],
        LogPrefix.Nile
      )
      return {
        ...res,
        error: errorMatch[1]
      }
    }

    try {
      void onGameImported(this).catch((err) => logError(err, LogPrefix.Nile))
      libraryManagerMap['nile'].installState(this.id, true)
    } catch (error) {
      logError(['Failed to import', `${this.id}:`, error], LogPrefix.Nile)
    }

    return res
  }

  private defaultTmpProgress = () => ({
    bytes: '',
    eta: '',
    percent: undefined,
    diskSpeed: undefined,
    downSpeed: undefined
  })
  private tmpProgress: InstallProgress | undefined = undefined

  onInstallOrUpdateOutput(action: 'installing' | 'updating', data: string) {
    if (!this.tmpProgress) {
      this.tmpProgress = this.defaultTmpProgress()
    }
    const progress = this.tmpProgress

    // parse log for percent
    if (!progress.percent) {
      const percentMatch = data.match(/Progress: (\d+\.\d+) /m)

      progress.percent = !Number.isNaN(Number(percentMatch?.at(1)))
        ? Number(percentMatch?.at(1))
        : undefined
    }

    // parse log for eta
    if (progress.eta === '') {
      const etaMatch = data.match(/ETA: (\d\d:\d\d:\d\d)/m)
      progress.eta = etaMatch && etaMatch?.length >= 2 ? etaMatch[1] : ''
    }

    // parse log for game download progress
    if (progress.bytes === '') {
      const bytesMatch = data.match(/Downloaded: (\S+) MiB/m)
      progress.bytes =
        bytesMatch && bytesMatch?.length >= 2 ? `${bytesMatch[1]}MB` : ''
    }

    // parse log for download speed
    if (!progress.downSpeed) {
      const downSpeedMBytes = data.match(/Download\t- (\S+.) MiB/m)
      progress.downSpeed = !Number.isNaN(Number(downSpeedMBytes?.at(1)))
        ? Number(downSpeedMBytes?.at(1))
        : undefined
    }

    // parse disk write speed
    if (!progress.diskSpeed) {
      const diskSpeedMBytes = data.match(/Disk\t- (\S+.) MiB/m)
      progress.diskSpeed = !Number.isNaN(Number(diskSpeedMBytes?.at(1)))
        ? Number(diskSpeedMBytes?.at(1))
        : undefined
    }

    // only send to frontend if all values are updated
    if (
      Object.values(progress).every(
        (value) => !(value === undefined || value === '')
      )
    ) {
      logInfo(
        [
          `Progress for ${this.getGameInfo().title}:`,
          `${progress.percent}%/${progress.bytes}/${progress.eta}`.trim(),
          `Down: ${progress.downSpeed}MB/s / Disk: ${progress.diskSpeed}MB/s`
        ],
        LogPrefix.Nile
      )

      sendProgressUpdate({
        appName: this.id,
        runner: 'nile',
        status: action,
        progress
      })

      // reset
      this.tmpProgress = this.defaultTmpProgress()
    }
  }

  async install({ path }: InstallArgs): Promise<InstallResult> {
    const { maxWorkers } = GlobalConfig.get().getSettings()
    const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []

    const commandParts = ['install', '--base-path', path, ...workers, this.id]

    const onOutput = (data: string) => {
      this.onInstallOrUpdateOutput('installing', data)
    }

    const installLogWriter = await createGameLogWriter(
      this.id,
      'nile',
      'install'
    )
    const res = await libraryManagerMap['nile'].runRunnerCommand(commandParts, {
      abortId: this.id,
      logWriters: [installLogWriter],
      onOutput,
      logMessagePrefix: `Installing ${this.id}`
    })

    if (res.abort) {
      return { status: 'abort' }
    }

    if (res.error) {
      if (!res.error.includes('signal')) {
        logError(['Failed to install', this.id, res.error], LogPrefix.Nile)
      }
      return { status: 'error', error: res.error }
    }
    void onGameInstalled(this).catch((err) => logError(err, LogPrefix.Nile))
    libraryManagerMap['nile'].installState(this.id, true)
    return { status: 'done' }
  }

  isNative(): boolean {
    return false
  }

  /**
   * Adds a desktop shortcut to $HOME/Desktop and to /usr/share/applications
   * so that the game can be opened from the start menu and the desktop folder.
   * Both can be disabled with addDesktopShortcuts and addStartMenuShortcuts
   * @async
   * @public
   */
  async moveInstall(newInstallPath: string): Promise<InstallResult> {
    const gameInfo = this.getGameInfo()
    logInfo(`Moving ${gameInfo.title} to ${newInstallPath}`, LogPrefix.Nile)

    const moveImpl = moveOnUnix
    const moveResult = await moveImpl(newInstallPath, gameInfo)

    if (moveResult.status === 'error') {
      const { error } = moveResult
      logError(
        ['Error moving', gameInfo.title, 'to', newInstallPath, error],
        LogPrefix.Nile
      )
      return { status: 'error', error }
    }

    await libraryManagerMap['nile'].changeGameInstallPath(
      this.id,
      moveResult.installPath
    )
    void onGameMoved(this, moveResult.installPath).catch((err) =>
      logError(err, LogPrefix.Nile)
    )
    return { status: 'done' }
  }

  async repair(): Promise<ExecResult> {
    const installInfo = this.getGameInfo()
    const { install_path } = installInfo.install ?? {}

    if (!install_path) {
      const error = `Could not find install path for ${this.id}`
      logError(error, LogPrefix.Nile)
      return {
        stderr: '',
        stdout: '',
        error
      }
    }

    logDebug([this.id, 'is installed at', install_path], LogPrefix.Nile)
    const repairLogWriter = await createGameLogWriter(this.id, 'nile', 'repair')
    const res = await libraryManagerMap['nile'].runRunnerCommand(
      ['verify', '--path', install_path, this.id],
      {
        abortId: this.id,
        logWriters: [repairLogWriter],
        logMessagePrefix: `Repairing ${this.id}`
      }
    )

    if (res.error) {
      logError(['Failed to repair', `${this.id}:`, res.error], LogPrefix.Nile)
    }

    return res
  }

  async syncSaves(): Promise<string> {
    // Amazon Games doesn't support cloud saves
    return ''
  }

  // FIXME: This doesn't respect the `RemoveArgs` passed to it
  async uninstall(): Promise<ExecResult> {
    const commandParts = ['uninstall', this.id]

    const res = await libraryManagerMap['nile'].runRunnerCommand(commandParts, {
      abortId: this.id,
      logMessagePrefix: `Uninstalling ${this.id}`
    })

    if (res.error) {
      logError(
        ['Failed to uninstall', `${this.id}:`, res.error],
        LogPrefix.Nile
      )
    } else if (!res.abort) {
      await onGameUninstalled(this)
      libraryManagerMap['nile'].installState(this.id, false)
    }
    sendFrontendMessage('refreshLibrary', 'nile')
    return res
  }

  async update(): Promise<InstallResult> {
    const { maxWorkers } = GlobalConfig.get().getSettings()
    const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []

    const commandParts = ['update', ...workers, this.id]

    const onOutput = (data: string) => {
      this.onInstallOrUpdateOutput('updating', data)
    }

    const updateLogWriter = await createGameLogWriter(this.id, 'nile', 'update')
    const res = await libraryManagerMap['nile'].runRunnerCommand(commandParts, {
      abortId: this.id,
      logWriters: [updateLogWriter],
      onOutput,
      logMessagePrefix: `Updating ${this.id}`
    })

    if (res.abort) {
      return { status: 'abort' }
    }

    if (res.error) {
      if (!res.error.includes('signal')) {
        logError(['Failed to update', this.id, res.error], LogPrefix.Nile)
      }
      return { status: 'error', error: res.error }
    }

    sendGameStatusUpdate({
      appName: this.id,
      runner: 'nile',
      status: 'done'
    })

    return { status: 'done' }
  }

  async forceUninstall() {
    libraryManagerMap['nile'].removeFromInstalledConfig(this.id)
  }

  async stop() {
    const pattern = isLinux ? this.id : 'nile'
    killPattern(pattern)
  }

  async isGameAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const info = this.getGameInfo()
      resolve(
        Boolean(
          info?.is_installed &&
          info.install.install_path &&
          existsSync(info.install.install_path)
        )
      )
    })
  }
}
