import { libraryManagerMap } from 'backend/storeManagers'
import { addHandler, sendFrontendMessage } from '../ipc'
import { runWineCommandOnGame } from '.'
import path from 'path'
import { execAsync, sendGameStatusUpdate } from 'backend/utils'
import { isWindows } from 'backend/constants/environment'

addHandler(
  'runWineCommandForGame',
  async (event, { appName, commandParts, runner }) => {
    if (isWindows) {
      return execAsync(commandParts.join(' '))
    }

    // FIXME: Why are we using `runinprefix` here?
    return runWineCommandOnGame(runner, appName, {
      commandParts,
      wait: false,
      protonVerb: 'runinprefix'
    })
  }
)

addHandler('callTool', async (event, { tool, exe, appName, runner }) => {
  const gameSettings = await libraryManagerMap[runner]
    .getGame(appName)
    .getSettings()

  switch (tool) {
    case 'winecfg':
      await runWineCommandOnGame(runner, appName, {
        gameSettings,
        commandParts: ['winecfg'],
        wait: false
      })
      break
    case 'runExe':
      if (exe) {
        const workingDir = path.parse(exe).dir
        await runWineCommandOnGame(runner, appName, {
          gameSettings,
          commandParts: [exe],
          wait: false,
          startFolder: workingDir
        })
      }
      break
  }
  if (runner === 'gog') {
    // Check if game was modified by offline installer / wine uninstaller
    await libraryManagerMap['gog'].checkForOfflineInstallerChanges(appName)
    const maybeNewGameInfo = libraryManagerMap['gog'].getGameInfo(appName)
    if (maybeNewGameInfo)
      sendFrontendMessage('pushGameToLibrary', maybeNewGameInfo)
  }

  sendGameStatusUpdate({ appName, runner, status: 'done' })
})
