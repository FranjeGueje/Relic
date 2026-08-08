import axios from 'axios'
import { existsSync, unlinkSync } from 'fs'
import { logError, logInfo, LogPrefix, logWarning } from 'backend/logger'
import { relicVersion } from 'backend/constants/others'
import { GOGLoginData } from 'common/types'
import { configStore } from './electronStores'
import { isOnline } from '../../online_monitor'
import { GOGCredentials, UserData } from 'common/types/gog'
import { libraryManagerMap } from '../index'
import { clearCache } from 'backend/utils'
import { gogdlAuthConfig } from './constants'

function authLogSanitizer(line: string) {
  try {
    const output = JSON.parse(line)
    output.access_token = '<redacted>'
    output.session_id = '<redacted>'
    output.refresh_token = '<redacted>'
    output.user_id = '<redacted>'
    return JSON.stringify(output) + '\n'
  } catch {
    return line
  }
}

// `gogdl auth` spawns a process and may hit the network to refresh the token,
// and getCredentials() is called from ~18 places (library refresh, install,
// update, metadata lookups...). A single startup used to spawn it ~17 times in
// 75 seconds, several of them within the same second. Two guards fix that:
// concurrent callers share one in-flight call, and the result is reused for a
// short window afterwards.
const CREDENTIALS_TTL_MS = 60_000

let cachedCredentials: { value: GOGCredentials; expiresAt: number } | undefined
let credentialsInFlight: Promise<GOGCredentials | undefined> | undefined

export class GOGUser {
  static async login(
    code: string
    // TODO: Write types for this
  ): Promise<{
    status: 'done' | 'error'
    data?: UserData
  }> {
    logInfo('Logging using GOG credentials', LogPrefix.Gog)

    // Gets token from GOG basaed on authorization code
    const { stdout } = await libraryManagerMap['gog'].runRunnerCommand(
      ['auth', '--code', code],
      {
        abortId: 'gogdl-auth',
        logSanitizer: authLogSanitizer
      }
    )

    try {
      const data: GOGLoginData = JSON.parse(stdout.trim())
      if (data?.error) {
        return { status: 'error' }
      }
    } catch (err) {
      logError(
        `GOG login failed to parse std output from gogdl. stdout: ${stdout.trim()}, error ${err}`,
        LogPrefix.Gog
      )
      return { status: 'error' }
    }
    logInfo('Login Successful', LogPrefix.Gog)
    GOGUser.invalidateCredentialsCache()
    configStore.set('isLoggedIn', true)
    const userDetails = await this.getUserDetails()
    return { status: 'done', data: userDetails }
  }

  public static async getUserDetails(): Promise<UserData | undefined> {
    if (!isOnline()) {
      logError('Unable to login information, Relic offline', LogPrefix.Gog)
      return
    }
    logInfo('Checking if login is valid', LogPrefix.Gog)
    if (!this.isLoggedIn()) {
      logWarning('User is not logged in', LogPrefix.Gog)
      return
    }
    const user = await this.getCredentials()
    if (!user) {
      logError("No credentials, can't get login information", LogPrefix.Gog)
      return
    }
    const response = await axios
      .get(`https://users.gog.com/users/${user.user_id}`, {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
          'User-Agent': `Relic/${relicVersion}`
        }
      })
      .catch((error) => {
        logError(['Error getting login information', error], LogPrefix.Gog)
      })

    if (!response) {
      return
    }

    const data: UserData = response.data

    configStore.set('userData', data)
    logInfo('Saved username to config file', LogPrefix.Gog)

    return data
  }
  /**
   * Loads user credentials from config
   * if needed refreshes token and returns new credentials
   * @returns user credentials
   */
  public static async getCredentials(): Promise<GOGCredentials | undefined> {
    if (!isOnline()) {
      logWarning('Unable to get credentials - app is offline', {
        prefix: LogPrefix.Gog
      })
      return
    }

    if (cachedCredentials && Date.now() < cachedCredentials.expiresAt) {
      return cachedCredentials.value
    }

    // Share one gogdl run between callers that ask at the same time
    credentialsInFlight ??= GOGUser.fetchCredentials().finally(() => {
      credentialsInFlight = undefined
    })

    return credentialsInFlight
  }

  private static async fetchCredentials(): Promise<GOGCredentials | undefined> {
    const { stdout } = await libraryManagerMap['gog'].runRunnerCommand(
      ['auth'],
      {
        abortId: 'gogdl-get-credentials',
        logSanitizer: authLogSanitizer
      }
    )
    const trimmed = stdout?.trim()
    if (!trimmed) {
      logWarning(
        'gogdl auth returned empty output - re-login may be required',
        LogPrefix.Gog
      )
      return undefined
    }
    try {
      const credentials = JSON.parse(trimmed) as GOGCredentials | undefined
      if (credentials) {
        // Never hold credentials past the token's own lifetime. gogdl reports
        // `expires_in` as the token's total validity and we cannot tell when it
        // was issued, so the short TTL is what actually bounds this in practice
        // — the cap only matters if gogdl ever reports a very short-lived token.
        const ttl = Math.min(
          CREDENTIALS_TTL_MS,
          (credentials.expires_in ?? 0) * 1000
        )
        cachedCredentials = { value: credentials, expiresAt: Date.now() + ttl }
      }
      return credentials
    } catch (error) {
      logError(['Error getting GOG credentials:', error])
      return undefined
    }
  }

  /** Drop the cached credentials, so the next read runs `gogdl auth` again. */
  public static invalidateCredentialsCache() {
    cachedCredentials = undefined
  }

  public static logout() {
    GOGUser.invalidateCredentialsCache()
    clearCache('gog')
    configStore.clear()
    if (existsSync(gogdlAuthConfig)) {
      unlinkSync(gogdlAuthConfig)
    }
    logInfo('Logging user out', LogPrefix.Gog)
  }

  public static isLoggedIn() {
    return configStore.get_nodefault('isLoggedIn') || false
  }
}
