export interface AddGameToSteamOptions {
  gameName: string
  installPath: string
  runner?: string
  appName?: string
}

export interface AddGameToSteamResult {
  success: boolean
  steamAppId?: number
  alreadyExists?: boolean
  error?: string
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
