import { BrowserWindow, Menu, nativeImage, Tray } from 'electron'
import i18next from 'i18next'
import { RecentGame } from 'common/types'
import { getRecentGames, maxRecentGames } from '../recent_games/recent_games'
import { handleExit, showAboutWindow } from '../utils'
import { backendEvents } from '../backend_events'
import { join } from 'node:path'
import { fixAsarPath, publicDir } from 'backend/constants/paths'

const iconLight = fixAsarPath(join(publicDir, 'icon-light.png'))

export const initTrayIcon = async (mainWindow: BrowserWindow) => {
  // create icon
  const appIcon = new Tray(getIcon(process.platform))

  // helper function to set/update the context menu and on macOS the dock menu
  const loadContextMenu = async (recentGames?: RecentGame[]) => {
    recentGames ??= await getRecentGames({ limited: true })
    const newContextMenu = contextMenu(mainWindow, recentGames)
    appIcon.setContextMenu(newContextMenu)
  }
  await loadContextMenu()

  appIcon.setToolTip('Relic')

  // event listeners
  appIcon.on('click', () => {
    mainWindow.show()
  })

  backendEvents.on('languageChanged', async () => {
    await loadContextMenu()
  })

  backendEvents.on('recentGamesChanged', async (recentGames: RecentGame[]) => {
    const limit = await maxRecentGames()
    if (recentGames.length > limit) {
      recentGames = recentGames.slice(0, limit)
    }
    await loadContextMenu(recentGames)
  })

  return appIcon
}

const iconSizesByPlatform = {
  linux: {
    width: 32,
    height: 32
  }
}

// get the icon path based on platform and settings
const getIcon = (platform = process.platform) => {
  return nativeImage
    .createFromPath(iconLight)
    .resize(iconSizesByPlatform[platform as keyof typeof iconSizesByPlatform])
}

// generate the context menu
const contextMenu = (mainWindow: BrowserWindow, recentGames: RecentGame[]) => {
  const recentsMenu = recentGames.map((game) => {
    return {
      click: function () {
        mainWindow.show()
      },
      label: game.title
    }
  })

  return Menu.buildFromTemplate([
    ...recentsMenu,
    { type: 'separator' },
    {
      click: function () {
        mainWindow.show()
      },
      label: i18next.t('tray.show')
    },
    {
      click: function () {
        showAboutWindow()
      },
      label: i18next.t('tray.about', 'About')
    },
    {
      accelerator: 'Ctrl+R',
      click: function () {
        mainWindow.reload()
      },
      label: i18next.t('tray.reload', 'Reload')
    },
    {
      label: 'Debug',
      accelerator: 'Ctrl+Shift+I',
      click: () => {
        mainWindow.webContents.openDevTools()
      }
    },
    {
      click: function () {
        handleExit()
      },
      label: i18next.t('tray.quit', 'Quit'),
      accelerator: 'Ctrl+Q'
    }
  ])
}

// Exported only for testing purpose
// ts-prune-ignore-next
export const testingExportsTrayIcon = {
  contextMenu,
  getIcon
}
