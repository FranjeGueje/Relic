import type { RakunLink } from './rakun'
import type { LoginReply } from '../shared/bridge'
import type { LoginInfo } from '../shared/types'
import { errorText, parseUrl } from './helpers'

const ITCH = 'itch'
/** The person logs in on their own browser, which takes as long as they take */
const BROWSER_WAIT = { intervalMs: 1000, timeoutMs: 5 * 60_000 }

export type ItchWay = 'oauth' | 'key'

/** What the person sees: Electron windows in the app, stand-ins in the tests */
export type ItchUi = {
  /** Which of the two ways to log in; `undefined` if they cancel */
  choose: () => Promise<ItchWay | undefined>
  /** The page of the OAuth way, in their own browser */
  openBrowser: (url: string) => Promise<void>
  /** The API key they paste, or `undefined` if they cancel */
  askKey: (info: LoginInfo) => Promise<string | undefined>
}

type Wait = { intervalMs: number; timeoutMs: number }

/** Whether itch.io ends up with a session of its own, which rakun makes when the browser comes back to it */
export async function waitForSession(
  link: Pick<RakunLink, 'call'>,
  { intervalMs, timeoutMs }: Wait = BROWSER_WAIT
): Promise<boolean> {
  for (let waited = 0; waited <= timeoutMs; waited += intervalMs) {
    const status = (await link.call('getAccounts'))[ITCH]
    // An expired session is not the new one
    if (status.loggedIn && !status.expired) return true
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  return false
}

const cancelled: LoginReply = { ok: false, error: 'cancelled', cancelled: true }

/** What rakun said to `submitLogin`, as the interface gets it */
export function submitReply(result: {
  ok: boolean
  error?: string
}): LoginReply {
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error ?? 'login rejected' }
}

/**
 * The login of itch.io, which has two ways: authorize rakun in the browser (rakun ends it
 * by itself when the browser comes back to it) or paste an API key (sent to rakun as it is)
 */
export async function runItchLogin(
  link: Pick<RakunLink, 'call'>,
  ui: ItchUi,
  wait?: Wait
): Promise<LoginReply> {
  try {
    const info = await link.call('getLoginInfo', ITCH)
    const way = await ui.choose()
    if (!way) return cancelled
    if (way === 'oauth') {
      await ui.openBrowser(info.url)
      return (await waitForSession(link, wait))
        ? { ok: true }
        : { ok: false, error: 'itch.io did not finish the login' }
    }
    const key = (await ui.askKey(info))?.trim()
    if (!key) return cancelled
    return submitReply(await link.call('submitLogin', ITCH, key))
  } catch (error) {
    return { ok: false, error: errorText(error) }
  }
}

const KEY_HOST = 'relic.invalid'

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** The page of the window where the key is pasted: a form that ends on an address of ours, read by `keyFromUrl` */
export function keyFormHtml(
  alternative: NonNullable<LoginInfo['alternative']>
) {
  return `<!doctype html><meta charset="utf-8"><title>itch.io</title>
<style>body{font:16px sans-serif;margin:28px;max-width:640px}input{width:100%;font-size:16px;padding:8px;margin:12px 0}button{font-size:16px;padding:8px 16px;margin-right:8px}</style>
<p>${escapeHtml(alternative.instructions)}</p>
<form action="https://${KEY_HOST}/open" method="get"><button>${escapeHtml(alternative.label)}</button></form>
<form action="https://${KEY_HOST}/key" method="get">
<input name="key" autofocus autocomplete="off" spellcheck="false" placeholder="API key">
<button>OK</button></form>`
}

/** Whether the form of `keyFormHtml` asks to open the page where the key is made */
export function isOpenRequest(url: string): boolean {
  const parsed = parseUrl(url)
  return parsed?.hostname === KEY_HOST && parsed.pathname === '/open'
}

/** The key the form of `keyFormHtml` ended on, or `undefined` for any other address */
export function keyFromUrl(url: string): string | undefined {
  const parsed = parseUrl(url)
  if (parsed?.hostname !== KEY_HOST || parsed.pathname !== '/key')
    return undefined
  return parsed.searchParams.get('key')?.trim() || undefined
}
