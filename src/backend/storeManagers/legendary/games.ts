import { existsSync } from 'graceful-fs'
import axios from 'axios'

import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  InstallArgs,
  InstallPlatform,
  InstallProgress
} from 'common/types'
import { GameConfig } from '../../game_config'
import { GlobalConfig } from '../../config'
import { libraryManagerMap } from '..'
import {
  downloadFile,
  killPattern,
  moveOnUnix,
  sendGameStatusUpdate,
  sendProgressUpdate
} from '../../utils'
import {
  logDebug,
  logError,
  logInfo,
  LogPrefix,
  createGameLogWriter
} from 'backend/logger'

import { join } from 'path'
import { gameInfoStore } from './electronStores'
import { onGameInstalled, onGameImported, onGameMoved, onGameUninstalled } from 'backend/relic/game_events'
import { isOnline } from '../../online_monitor'
import { Catalog, Product } from 'common/types/epic-graphql'
import { sendFrontendMessage } from '../../ipc'
import { Game } from 'common/types/game_manager'
import {
  LegendaryAppName,
  LegendaryPlatform,
  NonEmptyString,
  PositiveInteger
} from './commands/base'
import { LegendaryCommand } from './commands'
import thirdParty from './thirdParty'
import { Path } from 'backend/schemas'
import { mkdirSync } from 'fs'
import { configStore } from 'backend/constants/key_value_stores'
import { epicRedistPath, legendaryInstalled } from './constants'


export default class LegendaryGame implements Game {
  private readonly appName: LegendaryAppName

  constructor(appName: LegendaryAppName) {
    this.appName = appName
  }

  /**
   * Alias for `LegendaryLibrary.getGameInfo(appName)`
   *
   * @returns GameInfo
   */
  getGameInfo(): GameInfo {
    const info = libraryManagerMap['legendary'].getGameInfo(this.appName)
    if (!info) {
      logError(
        [
          'Could not get game info for',
          `${this.appName},`,
          'returning empty object. Something is probably gonna go wrong soon'
        ],
        LogPrefix.Legendary
      )
      return {
        app_name: '',
        runner: 'legendary',
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

  private async getProductSlug(namespace: string, title: string) {
    // If you want to change this graphql query, make sure it works for these games:
    // Rocket League
    // Alba - A Wildlife Adventure
    const graphql = {
      query: `{
          Catalog {
            catalogNs(namespace: "${namespace}") {
              mappings (pageType: "productHome") {
                pageSlug
                pageType
              }
            }
          }
      }`
    }

    try {
      const result = await axios(
        'https://launcher.store.epicgames.com/graphql',
        {
          data: graphql,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) EpicGamesLauncher'
          },
          method: 'POST'
        }
      )

      const res = result.data.data.Catalog as Catalog
      const slugMapping = res.catalogNs.mappings.find(
        (mapping) => mapping.pageType === 'productHome'
      )

      if (slugMapping) {
        return slugMapping.pageSlug
      } else {
        return this.slugFromTitle(title)
      }
    } catch (error) {
      logError(error, LogPrefix.Legendary)
      return this.slugFromTitle(title)
    }
  }

  private async getExtraFromAPI(slug: string): Promise<ExtraInfo | null> {
    let lang = configStore.get('language', '')
    if (lang === 'pt') {
      lang = 'pt-BR'
    }
    if (lang === 'zh_Hans') {
      lang = 'zh-CN'
    }
    if (lang === 'es') {
      lang = 'es-ES'
    }

    const epicUrl = `https://store-content.ak.epicgames.com/api/${lang}/content/products/${slug}`

    try {
      const { data } = await axios({ method: 'GET', url: epicUrl })
      logInfo('Getting Info from Epic API', LogPrefix.Legendary)

      const about = data?.pages?.find(
        (e: { type: string }) => e.type === 'productHome'
      )

      if (about) {
        return {
          about: about.data.about,
          reqs: about.data.requirements.systems[0].details,
          releaseDate: about.data.meta.releaseDate?.substring(0, 19),
          storeUrl: `https://www.epicgames.com/store/product/${slug}`
        }
      } else {
        return null
      }
    } catch (error) {
      logDebug(
        ['Failed to get info from Epic API:', error],
        LogPrefix.Legendary
      )
      return null
    }
  }

  private async getExtraFromGraphql(
    namespace: string,
    slug: string
  ): Promise<ExtraInfo | null> {
    const graphql = {
      query: `{
        Product {
          sandbox(sandboxId: "${namespace}") {
            configuration {
              ... on StoreConfiguration {
                configs {
                  shortDescription
                  technicalRequirements {
                    macos {
                      minimum
                      recommended
                      title
                    }
                    windows {
                      minimum
                      recommended
                      title
                    }
                  }
                }
              }
            }
          }
        }
      }`
    }

    try {
      const result = await axios(
        'https://launcher.store.epicgames.com/graphql',
        {
          data: graphql,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) EpicGamesLauncher'
          },
          method: 'POST'
        }
      )

      const res = result.data.data.Product as Product

      const configuration = res.sandbox.configuration[0]

      if (!configuration) {
        return null
      }

      const requirements = configuration.configs.technicalRequirements.windows

      if (requirements) {
        return {
          about: {
            description: res.sandbox.configuration[0].configs.shortDescription,
            shortDescription: ''
          },
          reqs: requirements,
          storeUrl: `https://www.epicgames.com/store/product/${slug}`
        }
      } else {
        return null
      }
    } catch (error) {
      logError(error, LogPrefix.Legendary)
      return null
    }
  }

  private slugFromTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z ]/g, '')
      .replaceAll(' ', '-')
  }

  private emptyExtraInfo = {
    about: {
      description: '',
      shortDescription: ''
    },
    reqs: [],
    storeUrl: ''
  }
  /**
   * Get extra info from Epic's API.
   *
   */
  async getExtraInfo(): Promise<ExtraInfo> {
    const { namespace, title } = this.getGameInfo()
    if (namespace === undefined) return this.emptyExtraInfo

    const cachedExtraInfo = gameInfoStore.get(namespace)
    if (cachedExtraInfo) {
      return cachedExtraInfo
    }
    if (!isOnline()) {
      return this.emptyExtraInfo
    }

    const slug = await this.getProductSlug(namespace, title)

    // try the API first, it works for most games
    let extraData = await this.getExtraFromAPI(slug)

    // if the API doesn't work, try graphql
    if (!extraData) {
      extraData = await this.getExtraFromGraphql(namespace, slug)
    }

    // if we have data, store it and return
    if (extraData) {
      gameInfoStore.set(namespace, extraData)
      return extraData
    } else {
      logError('Error Getting Info from Epic API', LogPrefix.Legendary)
      return {
        about: {
          description: '',
          shortDescription: ''
        },
        reqs: [],
        storeUrl: ''
      }
    }
  }

  /**
   * Alias for `GameConfig.get(appName).config`
   * If it doesn't exist, uses getSettings() instead.
   *
   * @returns GameConfig
   */
  async getSettings() {
    return (
      GameConfig.get(this.appName).config ||
      (await GameConfig.get(this.appName).getSettings())
    )
  }

  /**
   * Parent folder to move app to.
   * Amends install path by adding the appropriate folder name.
   */
  async moveInstall(
    newInstallPath: string
  ): Promise<{ status: 'done' } | { status: 'error'; error: string }> {
    const gameInfo = this.getGameInfo()
    logInfo(`Moving ${gameInfo.title} to ${newInstallPath}`, LogPrefix.Gog)

    const moveImpl = moveOnUnix
    const moveResult = await moveImpl(newInstallPath, gameInfo)

    if (moveResult.status === 'error') {
      const { error } = moveResult
      logError(
        ['Error moving', gameInfo.title, 'to', newInstallPath, error],
        LogPrefix.Legendary
      )

      return { status: 'error', error }
    }

    await libraryManagerMap['legendary'].changeGameInstallPath(
      this.appName,
      moveResult.installPath
    )
    onGameMoved(this, moveResult.installPath)
    return { status: 'done' }
  }

  // used when downloading games, store the download size read from Legendary's output
  private currentDownloadSize: number | undefined

  getCurrentDownloadSize() {
    return this.currentDownloadSize
  }

  setCurrentDownloadSize(size: number) {
    this.currentDownloadSize = size
  }

  private defaultTmpProgres = () => ({
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
    totalDownloadSize: number
  ) {
    const downloadSizeMatch = data.match(/Download size: ([\d.]+) MiB/)

    // store the download size, needed for correct calculation
    // when cancel/resume downloads
    if (downloadSizeMatch) {
      this.currentDownloadSize = parseFloat(downloadSizeMatch[1])
    }

    if (!this.tmpProgress) {
      this.tmpProgress = this.defaultTmpProgres()
    }

    const progress = this.tmpProgress

    // parse log for eta
    if (progress.eta === '') {
      const etaMatch = data.match(/ETA: (\d\d:\d\d:\d\d)/m)
      progress.eta = etaMatch && etaMatch?.length >= 2 ? etaMatch[1] : ''
    }

    // parse log for game download progress
    if (progress.bytes === '') {
      const bytesMatch = data.match(/Downloaded: (\S+.) MiB/m)
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

    // original is in bytes, convert to MiB with 2 decimals
    totalDownloadSize =
      Math.round((totalDownloadSize / 1024 / 1024) * 100) / 100

    // calculate percentage
    if (progress.bytes !== '') {
      const downloaded = parseFloat(progress.bytes)
      const downloadCache = totalDownloadSize - (this.currentDownloadSize ?? 0)
      const totalDownloaded = downloaded + downloadCache
      const newPercent =
        Math.round((totalDownloaded / totalDownloadSize) * 10000) / 100
      progress.percent = newPercent >= 0 ? newPercent : undefined
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
        LogPrefix.Legendary
      )

      sendProgressUpdate({
        appName: this.appName,
        runner: 'legendary',
        status: action,
        progress: progress
      })

      // reset
      this.tmpProgress = this.defaultTmpProgres()
    }
  }

  /**
   * Update game.
   * Does NOT check for online connectivity.
   */
  async update(): Promise<{ status: 'done' | 'error' }> {
    sendGameStatusUpdate({
      appName: this.appName,
      runner: 'legendary',
      status: 'updating'
    })
    const { maxWorkers } = GlobalConfig.get().getSettings()
    const installPlatform = this.getGameInfo().install.platform!
    const info = await libraryManagerMap['legendary'].getInstallInfo(
      this.appName,
      installPlatform
    )

    const command: LegendaryCommand = {
      subcommand: 'update',
      appName: this.appName,
      '-y': true,
      '--skip-sdl': true
    }
    if (maxWorkers) command['--max-workers'] = PositiveInteger.parse(maxWorkers)

    const onOutput = (data: string) => {
      this.onInstallOrUpdateOutput(
        'updating',
        data,
        info.manifest?.download_size
      )
    }

    const updateLogWriter = await createGameLogWriter(
      this.appName,
      'legendary',
      'update'
    )
    const res = await libraryManagerMap['legendary'].runRunnerCommand(command, {
      abortId: this.appName,
      logWriters: [updateLogWriter],
      onOutput,
      logMessagePrefix: `Updating ${this.appName}`
    })

    sendGameStatusUpdate({
      appName: this.appName,
      runner: 'legendary',
      status: 'done'
    })

    if (res.error) {
      logError(
        ['Failed to update', `${this.appName}:`, res.error],
        LogPrefix.Legendary
      )
      return { status: 'error' }
    }
    return { status: 'done' }
  }

  /**
   * Adds a desktop shortcut to $HOME/Desktop and to /usr/share/applications
   * so that the game can be opened from the start menu and the desktop folder.
   * Both can be disabled with addDesktopShortcuts and addStartMenuShortcuts
   * @async
   * @public
   */
  /**
   * Install game.
   * Does NOT check for online connectivity.
   */
  async install({ path, sdlList, platformToInstall }: InstallArgs): Promise<{
    status: 'done' | 'error' | 'abort'
    error?: string
  }> {
    const gameInfo = this.getGameInfo()
    if (gameInfo.thirdPartyManagedApp) {
      if (gameInfo.isEAManaged) {
        return this.installEA(gameInfo, platformToInstall)
      } else if (gameInfo.isUbisoftManaged) {
        return this.installUbisoft(gameInfo, platformToInstall)
      }

      logError(
        ['Third party app', gameInfo.thirdPartyManagedApp, 'not supported'],
        LogPrefix.Legendary
      )
      return { status: 'error' }
    }
    const { maxWorkers } = GlobalConfig.get().getSettings()
    const info = await libraryManagerMap['legendary'].getInstallInfo(
      this.appName,
      platformToInstall
    )

    const command: LegendaryCommand = {
      subcommand: 'install',
      appName: this.appName,
      '--platform': LegendaryPlatform.parse(platformToInstall),
      '--base-path': Path.parse(path),
      '--skip-dlcs': true,
      '-y': true
    }
    if (maxWorkers) command['--max-workers'] = PositiveInteger.parse(maxWorkers)
    if (sdlList?.length)
      command.sdlList = sdlList.map((tag) => NonEmptyString.parse(tag))
    else command['--skip-sdl'] = true

    const onOutput = (data: string) => {
      this.onInstallOrUpdateOutput(
        'installing',
        data,
        info.manifest?.download_size
      )
    }

    const installLogWriter = await createGameLogWriter(
      this.appName,
      'legendary',
      'install'
    )
    let res = await libraryManagerMap['legendary'].runRunnerCommand(command, {
      abortId: this.appName,
      logWriters: [installLogWriter],
      onOutput,
      logMessagePrefix: `Installing ${this.appName}`
    })

    // try to run the install again with higher memory limit
    if (res.stderr.includes('MemoryError:')) {
      command['--max-shared-memory'] = PositiveInteger.parse(5000)
      res = await libraryManagerMap['legendary'].runRunnerCommand(command, {
        abortId: this.appName,
        logWriters: [installLogWriter],
        onOutput
      })
    }

    if (res.abort) {
      return { status: 'abort' }
    }

    if (res.error) {
      if (!res.error.includes('signal')) {
        logError(
          ['Failed to install', `${this.appName}:`, res.error],
          LogPrefix.Legendary
        )
      }
      return { status: 'error', error: res.error }
    }
    onGameInstalled(this)

    return { status: 'done' }
  }

  private async installEA(
    gameInfo: GameInfo,
    platformToInstall: string
  ): Promise<{
    status: 'done' | 'error' | 'abort'
    error?: string
  }> {
    logInfo('Getting EA App installer', LogPrefix.Legendary)
    const installerPath = join(epicRedistPath, 'EAappInstaller.exe')

    if (!existsSync(epicRedistPath)) {
      mkdirSync(epicRedistPath, { recursive: true })
    }

    if (!existsSync(installerPath)) {
      try {
        await downloadFile({
          url: 'https://origin-a.akamaihd.net/EA-Desktop-Client-Download/installer-releases/EAappInstaller.exe',
          dest: installerPath
        })
      } catch (e) {
        return { status: 'error', error: `${e}` }
      }
    }

    await thirdParty.addInstalledGame(gameInfo.app_name, platformToInstall)

    return { status: 'done' }
  }

  async installUbisoft(
    gameInfo: GameInfo,
    platformToInstall: string
  ): Promise<{
    status: 'done' | 'error' | 'abort'
    error?: string
  }> {
    logInfo('Getting Ubisoft installer', LogPrefix.Legendary)

    if (!existsSync(epicRedistPath)) {
      mkdirSync(epicRedistPath, { recursive: true })
    }

    await thirdParty.addInstalledGame(gameInfo.app_name, platformToInstall)

    return { status: 'done' }
  }

  async uninstall(): Promise<ExecResult> {
    const gameInfo = this.getGameInfo()
    if (gameInfo.thirdPartyManagedApp) {
      await thirdParty.removeInstalledGame(this.appName)
      return { stdout: '', stderr: '' }
    }

    const command: LegendaryCommand = {
      subcommand: 'uninstall',
      appName: this.appName,
      '-y': true
    }

    const res = await libraryManagerMap['legendary'].runRunnerCommand(command, {
      abortId: this.appName,
      logMessagePrefix: `Uninstalling ${this.appName}`
    })

    if (res.error) {
      logError(
        ['Failed to uninstall', `${this.appName}:`, res.error],
        LogPrefix.Legendary
      )
    } else if (!res.abort) {
      libraryManagerMap['legendary'].installState(this.appName, false)
      await onGameUninstalled(this)
    }
    sendFrontendMessage('refreshLibrary', 'legendary')
    return res
  }

  /**
   * Repair game.
   * Does NOT check for online connectivity.
   */
  async repair(): Promise<ExecResult> {
    const { maxWorkers } = GlobalConfig.get().getSettings()

    const command: LegendaryCommand = {
      subcommand: 'repair',
      appName: this.appName,
      '-y': true,
      '--skip-sdl': true
    }
    if (maxWorkers) command['--max-workers'] = PositiveInteger.parse(maxWorkers)

    const repairLogWriter = await createGameLogWriter(
      this.appName,
      'legendary',
      'repair'
    )
    const res = await libraryManagerMap['legendary'].runRunnerCommand(command, {
      abortId: this.appName,
      logWriters: [repairLogWriter],
      logMessagePrefix: `Repairing ${this.appName}`
    })

    if (res.error) {
      logError(
        ['Failed to repair', `${this.appName}:`, res.error],
        LogPrefix.Legendary
      )
    }
    return res
  }

  async importGame(
    folderPath: string,
    platform: InstallPlatform
  ): Promise<ExecResult> {
    const command: LegendaryCommand = {
      subcommand: 'import',
      appName: this.appName,
      installationDirectory: Path.parse(folderPath),
      '--with-dlcs': true,
      '--platform': LegendaryPlatform.parse(platform)
    }

    logInfo(`Importing ${this.appName}.`, LogPrefix.Legendary)

    const logWriter = await createGameLogWriter(
      this.appName,
      'legendary',
      'import'
    )
    const res = await libraryManagerMap['legendary'].runRunnerCommand(command, {
      abortId: this.appName,
      logWriters: [logWriter]
    })
    onGameImported(this)
    const errorMatch = res.stderr.match(/^.*ERROR:.*$/gm)?.join('') ?? ''
    res.error = (res.error ?? '') + errorMatch
    if (res.error) {
      logError(
        ['Failed to import', `${this.appName}:`, res.error],
        LogPrefix.Legendary
      )
    }
    return res
  }

  /**
   * Sync saves.
   * Does NOT check for online connectivity.
   */
  async syncSaves(arg: string, path: string): Promise<string> {
    if (!path) {
      logError(
        'No path provided for SavesSync, check your settings!',
        LogPrefix.Legendary
      )
      return 'No path provided.'
    }

    const command: LegendaryCommand = {
      subcommand: 'sync-saves',
      appName: this.appName,
      [arg]: true,
      '--save-path': Path.parse(path),
      '-y': true
    }

    let fullOutput = ''
    const res = await libraryManagerMap['legendary'].runRunnerCommand(command, {
      abortId: this.appName,
      logMessagePrefix: `Syncing saves for ${this.getGameInfo().title}`,
      onOutput: (output) => (fullOutput += output)
    })

    if (res.error) {
      logError(
        ['Failed to sync saves for', `${this.appName}:`, res.error],
        LogPrefix.Legendary
      )
    }
    return fullOutput
  }

  isNative(): boolean {
    return false
  }

  async forceUninstall() {
    // Modify Legendary installed.json file:
    try {
      await libraryManagerMap['legendary'].runRunnerCommand(
        {
          subcommand: 'uninstall',
          appName: this.appName,
          '-y': true,
          '--keep-files': true
        },
        {
          abortId: this.appName
        }
      )

      sendFrontendMessage('refreshLibrary', 'legendary')
    } catch (error) {
      logError(
        [
          `Error reading ${legendaryInstalled}, could not complete operation:`,
          error
        ],
        LogPrefix.Legendary
      )
    }
  }

  async stop() {
    const pattern = this.appName
    killPattern(pattern)
  }

  async isGameAvailable(): Promise<boolean> {
    const info = this.getGameInfo()
    if (!info.is_installed) return false
    if (info.install.install_path && existsSync(info.install.install_path))
      return true
    return false
  }
}
