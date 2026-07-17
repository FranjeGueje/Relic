export interface AddGameToSteamOptions {
  gameName: string
  installPath: string
}

export interface AddGameToSteamResult {
  success: boolean
  steamAppId?: number
  error?: string
}

export interface SteamShortcut {
  appId: string
  steamAppId: number
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
