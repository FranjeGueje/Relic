import { BrowserWindow, dialog, shell } from 'electron'
import {
  isOpenRequest,
  keyFormHtml,
  keyFromUrl,
  type ItchUi
} from './itchLogin'

const isWeb = (url: string) => /^https?:\/\//.test(url)

/** The window never leaves its own page: a link to the web opens in the person's browser instead */
function openLink(url: string): void {
  if (isWeb(url) && !keyFromUrl(url)) void shell.openExternal(url)
}

/** A window to paste the API key into; resolves with it, or `undefined` if the window is closed first */
function askApiKey(
  parent: BrowserWindow,
  alternative: NonNullable<Parameters<typeof keyFormHtml>[0]>
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      parent,
      modal: true,
      width: 720,
      height: 420,
      autoHideMenuBar: true,
      backgroundColor: '#ffffff',
      webPreferences: {
        partition: 'login-itch-key',
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    })
    let done = false
    const finish = (key: string | undefined) => {
      if (done) return
      done = true
      resolve(key)
      if (!win.isDestroyed()) win.close()
    }
    // The page that creates the key opens in the person's browser, whether the link opens a
    // new window or navigates this one
    win.webContents.setWindowOpenHandler(({ url }) => {
      openLink(url)
      return { action: 'deny' }
    })
    win.webContents.on('will-navigate', (event, url) => {
      if (url.startsWith('data:')) return
      event.preventDefault()
      const key = keyFromUrl(url)
      if (key) finish(key)
      else if (isOpenRequest(url)) openLink(alternative.url)
      else openLink(url)
    })
    win.on('closed', () => finish(undefined))
    void win.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(keyFormHtml(alternative))}`
    )
  })
}

/** The windows of itch.io's login, over `parent` */
export function itchWindows(parent: BrowserWindow): ItchUi {
  return {
    choose: async () => {
      const { response } = await dialog.showMessageBox(parent, {
        type: 'question',
        message: 'How do you want to log in to itch.io?',
        detail:
          'A: authorize rakun in your browser (reads your library; the games in your collections are not).\nB: paste an API key (also reads your collections, but gives rakun full access to your account).',
        buttons: [
          'A: Authorize in the browser',
          'B: Paste an API key',
          'Cancel'
        ],
        cancelId: 2
      })
      return response === 0 ? 'oauth' : response === 1 ? 'key' : undefined
    },
    openBrowser: (url) =>
      isWeb(url) ? shell.openExternal(url) : Promise.resolve(),
    askKey: (info) =>
      info.alternative
        ? askApiKey(parent, info.alternative)
        : Promise.resolve(undefined)
  }
}
