import { env } from 'process'

export const isLinux = true
export const isWindows = false
export const isMac = false
export const isIntelMac = false
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
export const isSnap = Boolean(env.SNAP)
export const isAppImage = Boolean(env.APPIMAGE)
export const autoUpdateSupported = isAppImage
