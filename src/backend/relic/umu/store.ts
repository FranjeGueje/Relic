import { logInfo, logError } from 'backend/logger'

const LOG_PREFIX = 'UMU'

const umuStoreMap: Record<string, string | undefined> = {
  legendary: 'egs',
  gog: 'gog',
  nile: 'amazon',
  zoom: 'zoom',
  sideload: undefined
}

export function getUmuStoreLabel(runner: string): string | undefined {
  return umuStoreMap[runner]
}

export async function searchUmuGameId(
  store: string,
  appName: string
): Promise<string | null> {
  try {
    const url = `https://umu.openwinecomponents.org/umu_api.php?store=${store}&codename=${appName}`
    const response = await fetch(url)
    if (!response.ok) return null

    const data = await response.json() as { umu_id?: number | string }[]
    if (!Array.isArray(data) || data.length === 0) return null

    const umuId = data[0]?.umu_id
    if (umuId !== undefined && umuId !== null) {
      logInfo(`UMU game found: ${appName} → GAMEID=${umuId}`, LOG_PREFIX)
      return String(umuId)
    }
    return null
  } catch (error) {
    logError(`UMU database lookup failed for ${appName}: ${error}`, LOG_PREFIX)
    return null
  }
}
