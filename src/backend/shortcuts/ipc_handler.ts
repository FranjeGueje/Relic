import { existsSync } from 'graceful-fs'
import { addListener, addHandler } from 'backend/ipc'
import i18next from 'i18next'
import { shortcutFiles } from './shortcuts/shortcuts'
import { getGame } from '../utils'
import { notify } from 'backend/dialog/dialog'

addListener('addShortcut', async (event, appName, runner, fromMenu) => {
  getGame(appName, runner).addShortcuts(fromMenu)

  notify({
    body: i18next.t(
      'box.shortcuts.message',
      'Shortcuts were created on Desktop and Start Menu'
    ),
    title: i18next.t('box.shortcuts.title', 'Shortcuts')
  })
})

addHandler('shortcutsExists', (event, appName, runner) => {
  const { title } = getGame(appName, runner).getGameInfo()

  const [desktopFile, menuFile] = shortcutFiles(title)

  return existsSync(desktopFile ?? '') || existsSync(menuFile ?? '')
})

addListener('removeShortcut', async (event, appName, runner) => {
  getGame(appName, runner).removeShortcuts()

  notify({
    body: i18next.t(
      'box.shortcuts.message-remove',
      'Shortcuts were removed from Desktop and Start Menu'
    ),
    title: i18next.t('box.shortcuts.title', 'Shortcuts Removed')
  })
})
