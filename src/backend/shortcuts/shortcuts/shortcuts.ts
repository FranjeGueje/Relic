import { app, shell } from 'electron'
import {
  existsSync,
  unlink,
  writeFile
} from 'graceful-fs'
import { join } from 'path'
import { logError, logInfo, LogPrefix } from 'backend/logger'
import { GlobalConfig } from '../../config'
import { getIcon } from '../utils'
import sanitize from 'sanitize-filename'
import { libraryManagerMap } from 'backend/storeManagers'
import { userHome } from 'backend/constants/paths'
import type { Game } from 'common/types/game_manager'

/**
 * Adds a desktop shortcut to $HOME/Desktop and to /usr/share/applications
 * so that the game can be opened from the start menu and the desktop folder.
 * Both can be disabled with addDesktopShortcuts and addStartMenuShortcuts
 * @async
 * @public
 */
async function addShortcuts(game: Game, fromMenu?: boolean) {
  const gameInfo = game.getGameInfo()
  if (gameInfo.install.is_dlc) return

  const { app_name, runner, title } = gameInfo

  logInfo(`Adding shortcuts for ${title}`, LogPrefix.Backend)
  const { addDesktopShortcuts } =
    GlobalConfig.get().getSettings()

  const [desktopFile, menuFile] = shortcutFiles(gameInfo.title)
  if (!desktopFile || !menuFile) {
    return
  }

  switch (process.platform) {
    case 'linux': {
      const icon = await getIcon(gameInfo.app_name, gameInfo)
      const shortcut = `[Desktop Entry]
Name=${gameInfo.title}
Exec=${app.getPath('exe')}
Terminal=false
Type=Application
Icon=${icon}
Categories=Game;
`

      if (addDesktopShortcuts || fromMenu) {
        //777 = -rwxrwxrwx
        writeFile(desktopFile, shortcut, { mode: 0o777 }, () => {
          logInfo(`Shortcut saved on ${desktopFile}`, LogPrefix.Backend)
        })
      }
      break
    }
    case 'win32': {
      const shortcutOptions: Electron.ShortcutDetails = {
        target: app.getPath('exe')
      }
      let executable = gameInfo.install.executable
      if (gameInfo.runner === 'gog') {
        executable = libraryManagerMap['gog'].getExecutable(gameInfo.app_name)
      }
      if (executable) {
        let icon: string
        if (
          'install_path' in gameInfo.install &&
          gameInfo.install.install_path
        ) {
          icon = join(gameInfo.install.install_path, executable)
        } else {
          icon = executable
        }
        shortcutOptions.icon = icon
        shortcutOptions.iconIndex = 0
      }

      if (addDesktopShortcuts || fromMenu) {
        shell.writeShortcutLink(desktopFile, shortcutOptions)
      }
      break
    }
  }
}

/**
 * Removes a desktop shortcut from $HOME/Desktop and to $HOME/.local/share/applications
 * @async
 * @public
 */
async function removeShortcuts(game: Game) {
  const gameInfo = game.getGameInfo()
  if (gameInfo.install.is_dlc) return

  const [desktopFile, menuFile] = shortcutFiles(gameInfo.title)

  if (desktopFile) {
    unlink(desktopFile, () =>
      logInfo('Desktop shortcut removed', LogPrefix.Backend)
    )
  }

  if (menuFile) {
    unlink(menuFile, () =>
      logInfo('Applications shortcut removed', LogPrefix.Backend)
    )
  }
}

function shortcutFiles(gameTitle: string) {
  let desktopFile
  let menuFile

  gameTitle = sanitize(gameTitle)

  desktopFile = `${app.getPath('desktop')}/${gameTitle}.desktop`
  menuFile = `${userHome}/.local/share/applications/${gameTitle}.desktop`

  return [desktopFile, menuFile]
}

export { removeShortcuts, addShortcuts, shortcutFiles }
