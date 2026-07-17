export type GameRunner = 'legendary' | 'gog' | 'nile' | 'sideload' | 'zoom'

export interface AddGameToSteamOptions {
  gameName: string
}

export interface AddGameToSteamResult {
  success: boolean
  steamAppId?: number
  error?: string
}

export interface SteamShortcut {
  appId: string
  steamAppId: number
  batPath: string
  installPath: string
}

export interface UserdataInfo {
  userdataDir: string
  folders: string[]
}

export interface FindResult {
  entry: Record<string, unknown> | null
  found: boolean
  error?: string
}
