const handlers = new Map<string, (...args: unknown[]) => unknown>()

jest.mock('backend/ipc', () => ({
  addHandler: (name: string, fn: (...args: unknown[]) => unknown) => {
    handlers.set(name, fn)
  }
}))

let settings: { steamGridDbApiKey?: string }

jest.mock('backend/config', () => ({
  GlobalConfig: {
    get: () => ({
      getSettings: () => settings,
      setSetting: (key: 'steamGridDbApiKey', value: string) => {
        settings[key] = value
      }
    })
  }
}))

function call(name: string, ...args: unknown[]) {
  const handler = handlers.get(name)
  if (!handler) throw new Error(`no handler registered for ${name}`)
  return handler(...args)
}

beforeEach(() => {
  jest.resetModules()
  handlers.clear()
  settings = {}
  require('../ipc_handler')
})

describe('steamgriddb.hasApiKey', () => {
  test('false when nothing is stored', () => {
    expect(call('steamgriddb.hasApiKey')).toBe(false)
  })

  test('true for a stored plain-text key', () => {
    settings.steamGridDbApiKey = 'a-real-key'
    expect(call('steamgriddb.hasApiKey')).toBe(true)
  })

  test('false for a leftover encrypted value, and clears it', () => {
    // v0.6.0 briefly encrypted this with safeStorage, prefixing the value
    // with "sgdb:v1:". That ciphertext can't be recovered once safeStorage
    // is gone, so it must not be reported as a usable key.
    settings.steamGridDbApiKey = 'sgdb:v1:some-ciphertext'

    expect(call('steamgriddb.hasApiKey')).toBe(false)
    expect(settings.steamGridDbApiKey).toBe('')
  })
})

describe('steamgriddb.setApiKey', () => {
  test('stores the key as plain text, trimmed', () => {
    call('steamgriddb.setApiKey', {}, '  a-real-key  ')

    expect(settings.steamGridDbApiKey).toBe('a-real-key')
  })

  test('storing an empty string clears the key', () => {
    settings.steamGridDbApiKey = 'a-real-key'

    call('steamgriddb.setApiKey', {}, '')

    expect(settings.steamGridDbApiKey).toBe('')
  })
})
