import { getUmuStoreLabel, searchUmuGameId } from '../store'
import { logInfo, logError } from 'backend/logger'

jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}))

const mockedLogInfo = jest.mocked(logInfo)
const mockedLogError = jest.mocked(logError)

const originalFetch = global.fetch

beforeEach(() => {
  jest.clearAllMocks()
})

afterEach(() => {
  global.fetch = originalFetch
})

describe('getUmuStoreLabel', () => {
  it('maps legendary to egs', () => {
    expect(getUmuStoreLabel('legendary')).toBe('egs')
  })

  it('maps gog to gog', () => {
    expect(getUmuStoreLabel('gog')).toBe('gog')
  })

  it('maps nile to amazon', () => {
    expect(getUmuStoreLabel('nile')).toBe('amazon')
  })

  it('returns undefined for sideload', () => {
    expect(getUmuStoreLabel('sideload')).toBeUndefined()
  })

  it('returns zoom for zoom', () => {
    expect(getUmuStoreLabel('zoom')).toBe('zoom')
  })

  it('returns undefined for unknown runner', () => {
    expect(getUmuStoreLabel('unknown')).toBeUndefined()
  })
})

describe('searchUmuGameId', () => {
  it('returns umu_id on successful API response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ umu_id: 12345 }]
    })

    const result = await searchUmuGameId('egs', 'some-game')
    expect(result).toBe('12345')
    expect(mockedLogInfo).toHaveBeenCalledWith(
      'UMU game found: some-game → GAMEID=12345',
      'UMU'
    )
  })

  it('returns null when API returns empty array', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => []
    })

    const result = await searchUmuGameId('egs', 'unknown-game')
    expect(result).toBeNull()
  })

  it('returns null on HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false
    })

    const result = await searchUmuGameId('gog', 'some-game')
    expect(result).toBeNull()
  })

  it('returns null on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'))

    const result = await searchUmuGameId('amazon', 'some-game')
    expect(result).toBeNull()
    expect(mockedLogError).toHaveBeenCalledWith(
      expect.stringContaining('UMU database lookup failed for some-game'),
      'UMU'
    )
  })
})
