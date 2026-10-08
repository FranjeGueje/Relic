import { describe, expect, test, vi } from 'vitest'

vi.mock('electron', () => ({ BrowserWindow: vi.fn() }))

import { loginPageResult, loginStartUrl, userAgentFor } from '../loginWindow'

describe('loginPageResult', () => {
  test('GOG: the success address with its code is what gets sent', () => {
    const url = 'https://embed.gog.com/on_login_success?origin=client&code=abc'
    expect(loginPageResult('gog', url)).toBe(url)
  })

  test('GOG: the pages before the end, and a success without code, are not', () => {
    expect(
      loginPageResult('gog', 'https://login.gog.com/login?code=x')
    ).toBeUndefined()
    expect(
      loginPageResult(
        'gog',
        'https://embed.gog.com/on_login_success?origin=client'
      )
    ).toBeUndefined()
  })

  test('Amazon: the address carrying the authorization code', () => {
    const url =
      'https://www.amazon.com/ap/maplanding?openid.oa2.authorization_code=ANxyz'
    expect(loginPageResult('nile', url)).toBe(url)
    expect(
      loginPageResult('nile', 'https://www.amazon.com/ap/signin')
    ).toBeUndefined()
  })

  test('Zoom: the address carrying li_token', () => {
    const url = 'https://www.zoom-platform.com/?li_token=tok'
    expect(loginPageResult('zoom', url)).toBe(url)
    expect(
      loginPageResult('zoom', 'https://www.zoom-platform.com/login')
    ).toBeUndefined()
  })

  test('Epic: the localhost address with the code, not the pages before it', () => {
    const url = 'http://localhost/launcher/authorized?code=c0de'
    expect(loginPageResult('legendary', url)).toBe(url)
    expect(
      loginPageResult('legendary', 'https://www.epicgames.com/id/login')
    ).toBeUndefined()
    expect(
      loginPageResult('legendary', 'http://localhost/launcher/authorized')
    ).toBeUndefined()
  })

  test('an address that is not valid never ends a login', () => {
    expect(loginPageResult('gog', 'about:blank')).toBeUndefined()
    expect(loginPageResult('zoom', '')).toBeUndefined()
  })
})

describe('userAgentFor', () => {
  test('only Epic is told it is the Epic launcher', () => {
    expect(userAgentFor('legendary')).toContain('EpicGamesLauncher')
    expect(userAgentFor('gog')).not.toContain('EpicGamesLauncher')
  })
})

describe('loginStartUrl', () => {
  test('Epic opens its launcher login; the others the page rakun gave', () => {
    expect(loginStartUrl('legendary', 'https://legendary.gl/epiclogin')).toBe(
      'https://www.epicgames.com/id/login?responseType=code'
    )
    expect(loginStartUrl('gog', 'https://auth.gog.com/x')).toBe(
      'https://auth.gog.com/x'
    )
  })
})
