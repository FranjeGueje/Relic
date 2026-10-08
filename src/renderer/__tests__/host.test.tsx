// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import App from '@rakun-ui/App'
import type { RakunBridge } from '../../shared/bridge'

/**
 * The interface is rakun's web (the submodule) and it is tested there. Here is only what
 * Relic adds as its host: the bridge it puts in `window.rakun`, which decides what the
 * interface offers.
 */

const answers: Record<string, unknown> = {
  getStores: [{ id: 'gog', name: 'gog', label: 'GOG' }],
  getLibrary: [],
  checkGameUpdates: [],
  getHelpers: [],
  requestAppSettings: {
    language: 'en',
    defaultInstallPath: '/g',
    protonPath: '',
    steamGridDbApiKey: ''
  },
  getDMQueueInformation: { elements: [], finished: [], state: 'idle' }
}

function bridge(overrides: Partial<RakunBridge> = {}) {
  const quit = vi.fn()
  const host: RakunBridge = {
    appName: 'Relic',
    call: ((channel: string) =>
      Promise.resolve(answers[channel] ?? null)) as RakunBridge['call'],
    connection: () => Promise.resolve('online'),
    onEvent: () => () => undefined,
    onConnection: () => () => undefined,
    setSetting: () => Promise.resolve({ ok: true }),
    quit,
    owns: () => Promise.resolve('embedded'),
    start: () => Promise.resolve({ ok: true }),
    login: () => Promise.resolve({ ok: true }),
    ...overrides
  }
  window.rakun = host
  return { host, quit }
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  Object.defineProperty(navigator, 'getGamepads', {
    value: () => [],
    configurable: true
  })
})
afterEach(cleanup)

describe("Relic as the host of rakun's interface", () => {
  test('names itself in the header and can quit', async () => {
    const { quit } = bridge()
    render(<App />)
    await screen.findByRole('img', { name: 'Relic' })
    expect(screen.getByText('Relic', { selector: '.appName' })).toBeTruthy()

    // back on the grid asks first, and says what happens to the rakun inside
    act(() => void fireEvent.keyDown(window, { key: 'Escape' }))
    expect(await screen.findByText('Quit Relic?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(quit).toHaveBeenCalledTimes(1)
  })

  test('logs in in a window of its own: no pasting', async () => {
    const login = vi.fn(() => Promise.resolve({ ok: true as const }))
    bridge({ login })
    render(<App />)
    await screen.findByRole('img', { name: 'Relic' })
    act(() => void fireEvent.keyDown(window, { key: 'm' }))
    act(() => void fireEvent.keyDown(window, { key: 'Enter' }))
    await screen.findByText('GOG')
    expect(screen.queryByRole('link')).toBeNull()
  })
})
