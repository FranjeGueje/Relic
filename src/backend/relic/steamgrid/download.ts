import { existsSync, mkdirSync } from 'fs'
import { GameInfo, SGDBGrid } from 'common/types'
import { join } from 'path'
import { logError, logInfo } from 'backend/logger'
import { GlobalConfig } from 'backend/config'
import { downloadFile } from 'backend/utils'
import { decryptApiKey } from '../../steamgrid/secureKey'
import { getUserdataInfo } from '../steam_shortcuts/steam_helpers'
import { searchGame, getGrids, getHeroes, getLogos, getIcons } from './api'

const LOG_PREFIX = 'Relic'

export async function downloadGrids(
  gameInfo: GameInfo,
  steamAppId: number
): Promise<boolean> {
  const apiKey = getApiKey()
  if (!apiKey) return false

  try {
    const results = await searchGame(apiKey, gameInfo.title)
    if (!results.length) return false

    const images = await fetchGridImages(apiKey, results[0].id)
    const { userdataDir, folders } = getUserdataInfo()
    if (folders.length === 0) return false

    for (const folder of folders) {
      const gridFolder = join(userdataDir, folder, 'config', 'grid')
      const imageMap = buildImageMap(gridFolder, steamAppId, images)
      await downloadToGridFolder(gridFolder, imageMap)
    }

    logInfo(`Downloaded grid images for ${gameInfo.title}`, LOG_PREFIX)
    return true
  } catch (error) {
    logError(`Failed to download grid images: ${error}`, LOG_PREFIX)
    return false
  }
}

function getApiKey(): string | null {
  const stored = GlobalConfig.get().getSettings().steamGridDbApiKey
  if (!stored) return null
  const apiKey = decryptApiKey(stored)
  return apiKey || null
}

async function fetchGridImages(apiKey: string, gameId: number) {
  const [header, portrait, heroes, logos, icons] = await Promise.all([
    getGrids(apiKey, { gameId, dimensions: ['460x215'] }),
    getGrids(apiKey, { gameId, dimensions: ['600x900'] }),
    getHeroes(apiKey, { gameId }),
    getLogos(apiKey, { gameId }),
    getIcons(apiKey, { gameId })
  ])

  return { header, portrait, heroes, logos, icons }
}

function buildImageMap(
  gridFolder: string,
  steamAppId: number,
  images: {
    header: SGDBGrid[]
    portrait: SGDBGrid[]
    heroes: SGDBGrid[]
    logos: SGDBGrid[]
    icons: SGDBGrid[]
  }
): [string, SGDBGrid | undefined][] {
  return [
    [join(gridFolder, `${steamAppId}.png`), images.header[0]],
    [join(gridFolder, `${steamAppId}p.png`), images.portrait[0]],
    [join(gridFolder, `${steamAppId}_hero.png`), images.heroes[0]],
    [join(gridFolder, `${steamAppId}_logo.png`), images.logos[0]],
    [join(gridFolder, `${steamAppId}_icon.png`), images.icons[0]]
  ]
}

async function downloadToGridFolder(
  gridFolder: string,
  imageMap: [string, SGDBGrid | undefined][]
): Promise<void> {
  if (!existsSync(gridFolder)) {
    mkdirSync(gridFolder, { recursive: true })
  }

  for (const [filePath, grid] of imageMap) {
    if (!grid || existsSync(filePath)) continue
    await downloadFile({ url: grid.url, dest: filePath })
  }
}
