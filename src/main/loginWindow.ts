import { BrowserWindow } from 'electron'
import type { Runner } from '../shared/types'

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/200.0'
const EPIC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EpicGamesLauncher'

/** Chromium's own user agent without the parts that give Electron away (itch.io sits behind Cloudflare) */
function plainChromium(own: string): string {
  return own.replace(/ (Electron|relic)\/\S+/gi, '')
}

/**
 * Epic only serves its login to its own launcher. itch.io's Cloudflare keeps asking for
 * its challenge to the made-up Chrome of the others, so it gets the real one.
 */
export function userAgentFor(runner: Runner, own = CHROME): string {
  if (runner === 'legendary') return EPIC
  return runner === 'itch' ? plainChromium(own) : CHROME
}

function hasParam(url: string, param: string): boolean {
  try {
    return !!new URL(url).searchParams.get(param)
  } catch {
    return false
  }
}

function isGogSuccess(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url)
    return hostname === 'embed.gog.com' && pathname === '/on_login_success'
  } catch {
    return false
  }
}

/** Epic's login for its own launcher: it ends on a localhost address that carries the code */
const EPIC_LAUNCHER_LOGIN =
  'https://www.epicgames.com/id/login?responseType=code'

function isLocalhostWithCode(url: string): boolean {
  try {
    return new URL(url).hostname === 'localhost' && hasParam(url, 'code')
  } catch {
    return false
  }
}

/**
 * The page to open. Epic's is not the one rakun gives (that one is for a
 * browser and shows a JSON): with the launcher's user agent Epic only accepts
 * its launcher login, and answers «Invalid Client» to the other.
 */
export function loginStartUrl(runner: Runner, url: string): string {
  return runner === 'legendary' ? EPIC_LAUNCHER_LOGIN : url
}

/**
 * What to hand to rakun (`submitLogin`) when the page the login window is on
 * means the login is over, or `undefined` while it is not.
 */
export function loginPageResult(
  runner: Runner,
  url: string
): string | undefined {
  if (runner === 'legendary') return isLocalhostWithCode(url) ? url : undefined
  if (runner === 'gog')
    return isGogSuccess(url) && hasParam(url, 'code') ? url : undefined
  const param = runner === 'nile' ? 'openid.oa2.authorization_code' : 'li_token'
  return hasParam(url, param) ? url : undefined
}

/** A page the login window may open for a popup: the web only, never `file:` or other schemes */
export function isLoginPopupUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

/** A fresh window, with nothing from the interface and no stored session */
function createLoginWindow(
  parent: BrowserWindow,
  runner: Runner
): BrowserWindow {
  const win = new BrowserWindow({
    parent,
    modal: true,
    width: 1100,
    height: 760,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      partition: `login-${runner}`,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  win.webContents.setUserAgent(
    userAgentFor(runner, win.webContents.getUserAgent())
  )
  // The main process loads it, past Chromium's own limits: so only https
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isLoginPopupUrl(url)) void win.loadURL(url)
    return { action: 'deny' }
  })
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      event.preventDefault()
      win.close()
    }
  })
  return win
}

/**
 * Shows the store's login page until it reaches its end. Resolves with what
 * rakun needs, or `undefined` if the person closes the window first.
 */
export function openLoginWindow(
  parent: BrowserWindow,
  runner: Runner,
  url: string
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const win = createLoginWindow(parent, runner)
    let done = false
    const finish = (result: string | undefined) => {
      if (done) return
      done = true
      resolve(result)
      if (!win.isDestroyed()) win.close()
    }
    const check = (url: string) => {
      const result = loginPageResult(runner, url)
      if (result && !done) finish(result)
    }
    const here = () => check(win.webContents.getURL())
    // The redirects are looked at before they load: a localhost address never loads
    win.webContents.on('will-redirect', (_e, url) => check(url))
    win.webContents.on('will-navigate', (_e, url) => check(url))
    win.webContents.on('did-navigate', here)
    win.webContents.on('did-navigate-in-page', here)
    win.on('closed', () => finish(undefined))
    void win.loadURL(loginStartUrl(runner, url))
  })
}
