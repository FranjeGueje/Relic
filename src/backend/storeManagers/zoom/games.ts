import { GameConfig } from '../../game_config'
import {
  getFileSize,
  parseSize,
  spawnAsync,
  sendProgressUpdate,
  moveOnUnix
} from '../../utils'
import { join, relative, dirname, basename } from 'node:path'
import * as fs from 'fs'
import axios, { AxiosProgressEvent } from 'axios'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import {
  ExtraInfo,
  GameInfo,
  GameSettings,
  ExecResult,
  InstallArgs,
  InstalledInfo,
  InstallProgress
} from 'common/types'
import { existsSync, rmSync } from 'fs'
import { installedGamesStore, libraryStore } from './electronStores'
import {
  logError,
  logInfo,
  LogPrefix,
  logWarning,
  logDebug
} from 'backend/logger'

import {
  onGameInstalled,
  onGameMoved,
  onGameUninstalled
} from 'backend/relic/game_events'
import { zoomPlatformScriptPath } from 'backend/constants/paths'
import { GlobalConfig } from 'backend/config'
import { ZoomInstallPlatform, ZoomDownloadFile } from 'common/types/zoom'
import { t } from 'i18next'
import { showDialogBoxModalAuto } from '../../dialog/dialog'
import { sendFrontendMessage } from '../../ipc'
import { Game } from 'common/types/game_manager'
import { isLinux } from 'backend/constants/environment'
import { libraryManagerMap } from '..'

import { rm } from 'node:fs/promises'

export default class ZoomGame implements Game {
  private readonly id: string

  constructor(id: string) {
    this.id = id
  }

  private async findDosboxExecutable(dir: string): Promise<string | undefined> {
    let list: fs.Dirent[]
    try {
      list = await fs.promises.readdir(dir, { withFileTypes: true })
    } catch (error) {
      logError(
        `Error reading directory ${dir} for dosbox.exe: ${error}`,
        LogPrefix.Zoom
      )
      return undefined // Cannot read dir, so stop here for this branch
    }

    for (const file of list) {
      const fullPath = join(dir, file.name)
      if (file.isDirectory()) {
        const result = await this.findDosboxExecutable(fullPath)
        if (result) {
          return result
        }
      } else if (file.name.toLowerCase() === 'dosbox.exe') {
        return fullPath
      }
    }

    return undefined
  }

  private async findConfFiles(dir: string): Promise<string[]> {
    let confFiles: string[] = []
    try {
      const list = await fs.promises.readdir(dir, { withFileTypes: true })
      for (const file of list) {
        const fullPath = join(dir, file.name)
        if (file.isDirectory()) {
          confFiles = confFiles.concat(await this.findConfFiles(fullPath))
        } else if (file.name.toLowerCase().endsWith('.conf')) {
          confFiles.push(fullPath)
        }
      }
    } catch (error) {
      logError(`Error finding .conf files in ${dir}: ${error}`, LogPrefix.Zoom)
    }
    return confFiles
  }

  async getExtraInfo(): Promise<ExtraInfo> {
    // Zoom.py doesn't have direct equivalents for reqs, changelog, etc.
    // This part would need to be implemented if the Zoom API provides such data.
    const extra: ExtraInfo = {
      about: { description: '', shortDescription: '' },
      reqs: [],
      releaseDate: undefined,
      storeUrl: undefined,
      changelog: undefined
    }
    return extra
  }

  getGameInfo(): GameInfo {
    const info = libraryManagerMap['zoom'].getGameInfo(this.id)
    if (!info) {
      logError(
        [
          'Could not get game info for',
          `${this.id},`,
          'returning empty object. Something is probably gonna go wrong soon'
        ],
        LogPrefix.Zoom
      )
      return {
        app_name: '',
        runner: 'zoom',
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

  async getSettings(): Promise<GameSettings> {
    return (
      GameConfig.get(this.id).config ||
      (await GameConfig.get(this.id).getSettings())
    )
  }

  async importGame(): Promise<ExecResult> {
    // The original zoom.py doesn't have an explicit "import" function for installed games.
    // It relies on scanning the library. This function might need to be adapted
    // if Zoom has a way to import already installed games.
    logWarning(
      `Import game not fully implemented for Zoom: ${this.id}`,
      LogPrefix.Zoom
    )
    return { stdout: '', stderr: 'Import not fully implemented' }
  }

  private defaultTmpProgress = () => ({
    bytes: '',
    eta: '',
    percent: undefined,
    diskSpeed: undefined,
    downSpeed: undefined
  })
  private tmpProgress: InstallProgress | undefined

  onInstallOrUpdateOutput(
    action: 'installing' | 'updating',
    data: string,
    total: number
  ) {
    if (data.length === 0) return

    if (!this.tmpProgress) {
      this.tmpProgress = this.defaultTmpProgress()
    }
    // This part needs to be adapted to parse output from the actual installer.
    // For now, it's a placeholder.
    logDebug(
      `Installer output for ${this.id}: ${data}% (total: ${getFileSize(total)})`,
      LogPrefix.Zoom
    )

    this.tmpProgress.percent = parseInt(data)
    if (this.tmpProgress.percent > 100) {
      this.tmpProgress.percent = 100
    }
    this.tmpProgress.bytes = 'N/A'
    this.tmpProgress.eta = 'N/A'
    this.tmpProgress.downSpeed = 0
    this.tmpProgress.diskSpeed = 0

    sendProgressUpdate({
      appName: this.id,
      runner: 'zoom',
      status: action,
      progress: this.tmpProgress
    })
  }

  async install({
    path,
    platformToInstall,
    installLanguage
  }: InstallArgs): Promise<{
    status: 'done' | 'error' | 'abort'
    error?: string
  }> {
    logInfo(
      `Installing ${this.id} to ${path} for platform ${platformToInstall}`,
      LogPrefix.Zoom
    )
    logInfo(`Installation path: ${path}`, LogPrefix.Zoom)

    const gameInfo = this.getGameInfo()
    if (!gameInfo || !gameInfo.folder_name) {
      logError(`Game info not found for ${this.id}`, LogPrefix.Zoom)
      return { status: 'error', error: 'Game info not found' }
    }

    const installPlatform =
      platformToInstall.toLowerCase() as ZoomInstallPlatform
    let finalInstallPlatform = installPlatform

    // Fetch installer URL
    const installers: ZoomDownloadFile[] = await libraryManagerMap[
      'zoom'
    ].getInstallers(installPlatform, this.id)
    if (installers.length === 0 || !installers[0].url) {
      logError(
        `No installer found for ${this.id} on ${installPlatform}`,
        LogPrefix.Zoom
      )
      return { status: 'error', error: 'No installer found' }
    }

    const installPath = join(path, gameInfo.folder_name)
    const downloadRoot = join(path, '.zoom-download')

    fs.mkdirSync(installPath, { recursive: true })

    const totalSize = installers
      .map((file) => parseSize(file.size))
      .reduce((acc, num) => acc + num, 0)
    let downloaded = 0

    for (const file of installers) {
      const downloadPath = join(downloadRoot, file.filename)
      let fileDownloaded = 0

      // Create game directory
      fs.mkdirSync(downloadRoot, { recursive: true })

      // Download the installer
      logInfo(
        `Downloading installer from ${file.url} to ${downloadPath}`,
        LogPrefix.Zoom
      )

      if (!existsSync(downloadPath)) {
        try {
          const response = await axios.get(file.url!, {
            responseType: 'stream',
            onDownloadProgress: (progressEvent: AxiosProgressEvent) => {
              let percent: undefined | number
              if (progressEvent.bytes) {
                fileDownloaded = fileDownloaded + progressEvent.bytes
                percent = Math.round(
                  ((downloaded + fileDownloaded) * 100) / totalSize
                )
              }

              this.onInstallOrUpdateOutput(
                'installing',
                `${percent}`,
                totalSize
              )
            }
          })

          await pipeline(response.data, createWriteStream(downloadPath)) // Use pipeline for robust stream handling
          logInfo(`Installer downloaded to ${downloadPath}`, LogPrefix.Zoom)

          downloaded = downloaded + parseSize(file.size)
        } catch (error) {
          logError(['Failed to download installer:', error], LogPrefix.Zoom)
          return {
            status: 'error',
            error: `Failed to download installer: ${error}`
          }
        }
      } else {
        logDebug(`File already exists ${downloadPath}, skipping`)
      }
    }

    // Execute the installer
    let installResult: ExecResult
    const confFilesBefore: string[] = []
    let executable: string = ''

    if (installPlatform === 'linux') {
      const downloadPath = join(installPath, installers[0].filename)

      if (downloadPath.endsWith('.tar.xz')) {
        logInfo(`Extracting ${downloadPath}...`, LogPrefix.Zoom)
        installResult = await spawnAsync('tar', [
          '-xf',
          downloadPath,
          '-C',
          installPath
        ])
        let gamePath = installPath
        const files = await fs.promises.readdir(installPath)
        const gameDir = files.find((f) =>
          fs.statSync(join(path, gameInfo.folder_name!, f)).isDirectory()
        )
        if (gameDir) {
          gamePath = join(installPath, gameDir)
        }

        const exe = join(gamePath, 'start.sh')
        if (existsSync(exe)) {
          executable = exe
          await fs.promises.chmod(executable, '755')
        }
      } else {
        await fs.promises.chmod(executable, '755')
        installResult = await spawnAsync(executable, [], {
          cwd: installPath
        })
      }
    } else {
      const downloadPath = join(downloadRoot, installers[0].filename)
      const protonPath = GlobalConfig.get().getSettings().protonPath
      if (!protonPath) {
        logWarning(
          'No GE-Proton configured for Windows installer. Set it in Settings > General.',
          LogPrefix.Zoom
        )
        installResult = { stdout: '', stderr: 'No GE-Proton configured' }
      } else {
        logInfo(
          `Running zoom-platform.sh: PROTONPATH=${protonPath} ${zoomPlatformScriptPath} -i ${downloadPath} -d ${installPath}`,
          LogPrefix.Zoom
        )
        const scriptResult = await spawnAsync(
          'bash',
          [zoomPlatformScriptPath, '-i', downloadPath, '-d', installPath],
          {
            env: { ...process.env, PROTONPATH: protonPath }
          }
        )
        installResult = {
          stdout: scriptResult.stdout,
          stderr: scriptResult.stderr
        }
        if (scriptResult.code === 0) {
          logInfo('Windows installer completed successfully', LogPrefix.Zoom)
          finalInstallPlatform = 'windows'
        } else {
          logError(
            ['Windows installer failed:', scriptResult.stderr],
            LogPrefix.Zoom
          )
        }
      }
    }

    if (installResult.error) {
      logError(
        ['Installer execution failed:', installResult.error],
        LogPrefix.Zoom
      )
      await rm(downloadRoot, { recursive: true, force: true })
      return {
        status: 'error',
        error: `Installer execution failed: ${installResult.error}`
      }
    }

    await rm(downloadRoot, { recursive: true, force: true })

    // After successful installation, we need to determine the actual executable path
    let isDosbox = false
    let dosboxConf: string[] | undefined
    let finalExecutable = ''

    if (installPlatform === 'windows') {
      logInfo(`Searching for executable in ${installPath}`, LogPrefix.Zoom)

      const confFilesAfter = await this.findConfFiles(installPath)
      const newConfFiles = confFilesAfter.filter(
        (f) => !confFilesBefore.includes(f)
      )

      if (newConfFiles.length > 0) {
        dosboxConf = newConfFiles
        const gameDirectory = dirname(newConfFiles[0])
        const dosboxExePath = await this.findDosboxExecutable(gameDirectory)
        if (dosboxExePath) {
          isDosbox = true
          finalExecutable = 'dosbox'
          finalInstallPlatform = 'linux'
          const sourceDir = gameDirectory
          const destDir = join(path, gameInfo.folder_name)
          logInfo(
            `Copying DOSBox game files from ${sourceDir} to ${destDir}`,
            LogPrefix.Zoom
          )
          const items = await fs.promises.readdir(sourceDir)
          for (const item of items) {
            await fs.promises.cp(join(sourceDir, item), join(destDir, item), {
              recursive: true
            })
          }
          dosboxConf = newConfFiles.map((file) => join(destDir, basename(file)))
        }
      }

      if (!isDosbox) {
        const findExes = async (dir: string): Promise<string[]> => {
          let exes: string[] = []
          try {
            const list = await fs.promises.readdir(dir, { withFileTypes: true })
            for (const file of list) {
              const fullPath = join(dir, file.name)
              if (file.isDirectory()) {
                exes = exes.concat(await findExes(fullPath))
              } else if (file.name.toLowerCase().endsWith('.exe')) {
                exes.push(fullPath)
              }
            }
          } catch (error) {
            logError(
              `Error finding .exe files in ${dir}: ${error}`,
              LogPrefix.Zoom
            )
          }
          return exes
        }
        const exes = (await findExes(installPath))
          .map((f) => relative(installPath, f))
          .filter((name) => !/setup|unins|redist/i.test(name))

        if (exes.length === 1) {
          finalExecutable = exes[0]
        } else if (exes.length > 1) {
          const gameName = gameInfo.title
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
          const bestMatch = exes.find((exe) =>
            exe
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '')
              .includes(gameName)
          )
          if (bestMatch) {
            finalExecutable = bestMatch
          } else {
            let largestSize = 0
            for (const exe of exes) {
              const exePath = join(installPath, exe)
              const stats = fs.statSync(exePath)
              if (stats.size > largestSize) {
                largestSize = stats.size
                finalExecutable = exe
              }
            }
          }
        }
      }
    } else {
      finalExecutable = executable
    }
    if (!finalExecutable) {
      logError(['Could not find executable for', this.id], LogPrefix.Zoom)
      showDialogBoxModalAuto({
        title: t('box.error.executableNotFound', 'Executable not found'),
        message: t(
          'box.error.executableNotFoundMessage',
          'Relic could not find the executable for this game. Please set it manually in the game settings.'
        ),
        type: 'ERROR'
      })
      return { status: 'error', error: 'Executable not found' }
    }

    const installedData: InstalledInfo = {
      platform: finalInstallPlatform,
      executable: finalExecutable.replace('{app}', installPath),
      install_path: installPath,
      isDosbox,
      dosboxConf,
      install_size: getFileSize(totalSize), // This might need to be the actual installed size, not just installer size
      is_dlc: false,
      version: '1.0', // Placeholder, ideally extracted from installer or API
      appName: this.id,
      installedDLCs: [],
      language: installLanguage,
      versionEtag: '',
      buildId: '',
      pinnedVersion: false
    }
    const array = installedGamesStore.get('installed', [])
    array.push(installedData)
    installedGamesStore.set('installed', array)
    libraryManagerMap['zoom'].refresh()
    const libraryGame = this.getGameInfo()
    if (libraryGame) {
      libraryGame.is_installed = true
      libraryGame.install = installedData
      libraryManagerMap['zoom'].updateGameInLibrary(libraryGame)
      libraryStore.set(
        'games',
        libraryStore
          .get('games', [])
          .map((g) => (g.app_name === this.id ? libraryGame : g))
      )
    }

    logInfo(`Installation of ${this.id} completed.`, LogPrefix.Zoom)
    await onGameInstalled(this, installPath)
    return { status: 'done' }
  }

  isNative(): boolean {
    const gameInfo = this.getGameInfo()
    if (isLinux && gameInfo.install.platform === 'linux') {
      return true
    }

    return false
  }

  async moveInstall(
    newInstallPath: string
  ): Promise<{ status: 'done' } | { status: 'error'; error: string }> {
    const gameInfo = this.getGameInfo()
    logInfo(`Moving ${gameInfo.title} to ${newInstallPath}`, LogPrefix.Zoom)

    const moveResult = await moveOnUnix(newInstallPath, gameInfo)

    if (moveResult.status === 'error') {
      logError(
        [
          'Error moving',
          gameInfo.title,
          'to',
          newInstallPath,
          moveResult.error
        ],
        LogPrefix.Zoom
      )
      return { status: 'error', error: moveResult.error }
    }

    const array = installedGamesStore.get('installed', [])
    const index = array.findIndex((game) => game.appName === this.id)
    if (index === -1) {
      return { status: 'error', error: "Game isn't installed" }
    }

    array[index].install_path = moveResult.installPath
    installedGamesStore.set('installed', array)
    libraryManagerMap['zoom'].refresh()

    await onGameMoved(this, moveResult.installPath)

    return { status: 'done' }
  }

  async repair(): Promise<ExecResult> {
    logWarning(`Repair not implemented for Zoom: ${this.id}`, LogPrefix.Zoom)
    return { stdout: '', stderr: 'Repair not implemented' }
  }

  async syncSaves(): Promise<string> {
    logWarning(
      `Sync saves not implemented for Zoom: ${this.id}`,
      LogPrefix.Zoom
    )
    return 'Sync saves not implemented'
  }

  async uninstall(): Promise<ExecResult> {
    const array = installedGamesStore.get('installed', [])
    const index = array.findIndex((game) => game.appName === this.id)
    if (index === -1) {
      throw Error("Game isn't installed")
    }

    const [object] = array.splice(index, 1)
    logInfo(['Removing', object.install_path], LogPrefix.Zoom)

    if (existsSync(object.install_path)) {
      rmSync(object.install_path, { recursive: true })
    }
    installedGamesStore.set('installed', array)
    libraryManagerMap['zoom'].refresh()
    const gameInfo = this.getGameInfo()
    gameInfo.is_installed = false
    gameInfo.install = { is_dlc: false }
    await onGameUninstalled(this)
    sendFrontendMessage('pushGameToLibrary', gameInfo)
    return { stdout: 'Uninstalled', stderr: '' }
  }

  async update(): Promise<{ status: 'done' | 'error'; error?: string }> {
    logWarning(`Update not implemented for Zoom: ${this.id}`, LogPrefix.Zoom)
    return { status: 'error', error: 'Update not implemented' }
  }

  async forceUninstall(): Promise<void> {
    const installed = installedGamesStore.get('installed', [])
    const newInstalled = installed.filter((g) => g.appName !== this.id)
    installedGamesStore.set('installed', newInstalled)
    libraryManagerMap['zoom'].refresh()
    const gameInfo = this.getGameInfo()
    gameInfo.is_installed = false
    gameInfo.install = { is_dlc: false }
    sendFrontendMessage('pushGameToLibrary', gameInfo)
  }

  async stop(): Promise<void> {
    logWarning(
      `Stop not fully implemented for Zoom: ${this.id}`,
      LogPrefix.Zoom
    )
    // For now, we don't have a specific process to stop for Zoom games
    // If wine is used, it will be handled by the launcher's wine cleanup.
  }

  async isGameAvailable(): Promise<boolean> {
    const info = this.getGameInfo()
    if (!info || !info.is_installed || !info.install.install_path) {
      return false
    }
    return existsSync(info.install.install_path)
  }
}
