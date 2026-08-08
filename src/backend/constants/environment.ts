import { env } from 'process'

export const isLinux = true
export const isSteamDeckGameMode =
  process.env.XDG_CURRENT_DESKTOP === 'gamescope'
const isSteamDeckDesktopMode =
  env.SESSION_MANAGER?.includes('unix/steamdeck') &&
  env.HOME === '/home/deck' &&
  env.DESKTOP_SESSION?.includes('steamos')
export const isSteamDeck = isSteamDeckGameMode || isSteamDeckDesktopMode
export const isCLIFullscreen = process.argv.includes('--fullscreen')
export const isCLINoGui = process.argv.includes('--no-gui')
export const isCLIConsoleMode = process.argv.includes('--console')
export const isAppImage = Boolean(env.APPIMAGE)
// Equivalent to Electron's `app.isPackaged`, without importing electron: a
// packaged Relic runs from inside an asar archive (electron-builder keeps asar
// enabled — see `asarUnpack` in electron-builder.yml), while a dev run executes
// build/main straight from the source tree.
export const isPackaged = __dirname.includes('app.asar')
export const autoUpdateSupported = isAppImage
