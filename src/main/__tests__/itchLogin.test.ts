import { describe, expect, test, vi } from 'vitest'
import {
  isOpenRequest,
  keyFormHtml,
  keyFromUrl,
  runItchLogin,
  waitForSession,
  type ItchUi
} from '../itchLogin'

const quick = { intervalMs: 1, timeoutMs: 20 }
const alternative = {
  url: 'https://itch.io/user/settings/api-keys',
  label: 'Create a key',
  instructions: 'Make a key with <full> access'
}

/** rakun with itch.io's login info; `accounts` is what getAccounts answers, one after another */
function rakun(
  accounts: unknown[] = [{ loggedIn: false }],
  submit: unknown = { ok: true }
) {
  let asked = 0
  return vi.fn((channel: string) => {
    if (channel === 'getLoginInfo')
      return Promise.resolve({
        runner: 'itch',
        url: 'https://itch.io/user/oauth',
        instructions: '',
        callback: true,
        alternative
      })
    if (channel === 'submitLogin') return Promise.resolve(submit)
    return Promise.resolve({
      itch: accounts[Math.min(asked++, accounts.length - 1)]
    })
  })
}
const asLink = (call: unknown) => ({ call }) as never

const ui = (over: Partial<ItchUi> = {}): ItchUi => ({
  choose: () => Promise.resolve('oauth'),
  openBrowser: vi.fn().mockResolvedValue(undefined),
  askKey: () => Promise.resolve('KEY'),
  ...over
})

describe('runItchLogin', () => {
  test('A: opens the page in the browser and waits for the session rakun makes', async () => {
    const call = rakun([{ loggedIn: false }, { loggedIn: true, name: 'me' }])
    const window = ui()

    const reply = await runItchLogin(asLink(call), window, quick)

    expect(reply).toEqual({ ok: true })
    expect(window.openBrowser).toHaveBeenCalledWith(
      'https://itch.io/user/oauth'
    )
    expect(call).not.toHaveBeenCalledWith(
      'submitLogin',
      'itch',
      expect.anything()
    )
  })

  test('A: no session in time is an error, not a success', async () => {
    const reply = await runItchLogin(asLink(rakun()), ui(), quick)
    expect(reply).toEqual({
      ok: false,
      error: 'itch.io did not finish the login'
    })
  })

  test('B: the pasted key goes to rakun as it is (without spaces around)', async () => {
    const call = rakun()
    const reply = await runItchLogin(
      asLink(call),
      ui({
        choose: () => Promise.resolve('key'),
        askKey: () => Promise.resolve('  abc \n')
      }),
      quick
    )
    expect(reply).toEqual({ ok: true })
    expect(call).toHaveBeenCalledWith('submitLogin', 'itch', 'abc')
  })

  test('B: a key rakun refuses comes back with its reason', async () => {
    const reply = await runItchLogin(
      asLink(
        rakun([{ loggedIn: false }], {
          ok: false,
          error: 'too few permissions'
        })
      ),
      ui({ choose: () => Promise.resolve('key') }),
      quick
    )
    expect(reply).toEqual({ ok: false, error: 'too few permissions' })
  })

  test('cancelling the choice, or the key window, sends nothing', async () => {
    const call = rakun()
    const none = await runItchLogin(
      asLink(call),
      ui({ choose: () => Promise.resolve(undefined) }),
      quick
    )
    const empty = await runItchLogin(
      asLink(call),
      ui({
        choose: () => Promise.resolve('key'),
        askKey: () => Promise.resolve(undefined)
      }),
      quick
    )
    expect(none).toEqual({ ok: false, error: 'cancelled', cancelled: true })
    expect(empty).toEqual({ ok: false, error: 'cancelled', cancelled: true })
    expect(call).not.toHaveBeenCalledWith(
      'submitLogin',
      'itch',
      expect.anything()
    )
  })
})

describe('waitForSession', () => {
  test('an expired session is not the new one', async () => {
    const call = rakun([{ loggedIn: true, expired: true }])
    expect(await waitForSession(asLink(call), quick)).toBe(false)
  })
})

describe('the key form', () => {
  test('the text from rakun is escaped', () => {
    const html = keyFormHtml(alternative)
    expect(html).toContain('Make a key with &#60;full&#62; access')
    expect(html).not.toContain('<full>')
  })

  test('the page of the key opens from a button of the form, not from a link', () => {
    expect(keyFormHtml(alternative)).not.toContain('<a ')
    expect(isOpenRequest('https://relic.invalid/open?')).toBe(true)
    expect(isOpenRequest('https://relic.invalid/key?key=a')).toBe(false)
    expect(isOpenRequest('https://evil.example/open')).toBe(false)
  })

  test("only the form's own address gives a key", () => {
    expect(keyFromUrl('https://relic.invalid/key?key=%20abc%20')).toBe('abc')
    expect(keyFromUrl('https://relic.invalid/key?key=')).toBeUndefined()
    expect(keyFromUrl('https://evil.example/key?key=abc')).toBeUndefined()
    expect(keyFromUrl('not an address')).toBeUndefined()
  })
})
