import axios from 'axios'
import { relicUserAgent } from 'backend/constants/others'
import { searchGame, getGrids, getHeroes, getLogos, getIcons } from '../api'

jest.mock('axios')
const mockedAxios = jest.mocked(axios)

const apiKey = 'test-api-key'
const expectedHeaders = {
  Authorization: `Bearer ${apiKey}`,
  'User-Agent': relicUserAgent
}

function respondWith(data: unknown) {
  mockedAxios.get.mockResolvedValueOnce({ data })
}

afterEach(() => {
  jest.clearAllMocks()
})

describe('searchGame', () => {
  test('returns the games on success and sends key + user agent', async () => {
    const games = [
      { id: 1, name: 'Game 1' },
      { id: 2, name: 'Game 2' }
    ]
    respondWith({ success: true, data: games })

    await expect(searchGame(apiKey, 'query')).resolves.toEqual(games)
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://www.steamgriddb.com/api/v2/search/autocomplete/query',
      { headers: expectedHeaders }
    )
  })

  test('url-encodes the query', async () => {
    respondWith({ success: true, data: [] })

    await searchGame(apiKey, 'Beat Cop & Co')

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://www.steamgriddb.com/api/v2/search/autocomplete/Beat%20Cop%20%26%20Co',
      { headers: expectedHeaders }
    )
  })

  test('throws the API errors joined together', async () => {
    respondWith({ success: false, errors: ['Invalid API Key', 'Nope'] })

    await expect(searchGame(apiKey, 'query')).rejects.toThrow(
      'Invalid API Key, Nope'
    )
  })

  test('throws a default message when the API gives no errors', async () => {
    respondWith({ success: false })

    await expect(searchGame(apiKey, 'query')).rejects.toThrow('Search failed')
  })
})

describe('getGrids', () => {
  test('joins dimensions into a comma-separated param', async () => {
    respondWith({ success: true, data: [] })

    await getGrids(apiKey, { gameId: 123, dimensions: ['460x215', '600x900'] })

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://www.steamgriddb.com/api/v2/grids/game/123',
      { params: { dimensions: '460x215,600x900' }, headers: expectedHeaders }
    )
  })

  test('sends no params when no dimensions are given', async () => {
    respondWith({ success: true, data: [] })

    await getGrids(apiKey, { gameId: 123 })

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://www.steamgriddb.com/api/v2/grids/game/123',
      { params: {}, headers: expectedHeaders }
    )
  })

  test('sends no params when dimensions is empty', async () => {
    respondWith({ success: true, data: [] })

    await getGrids(apiKey, { gameId: 123, dimensions: [] })

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ params: {} })
    )
  })

  test('returns the grids on success', async () => {
    const grids = [{ id: 10, url: 'url1', thumb: 'thumb1' }]
    respondWith({ success: true, data: grids })

    await expect(getGrids(apiKey, { gameId: 123 })).resolves.toEqual(grids)
  })

  test('throws on failure', async () => {
    respondWith({ success: false, errors: ['Game not found'] })

    await expect(getGrids(apiKey, { gameId: 123 })).rejects.toThrow(
      'Game not found'
    )
  })

  test('throws a default message when the API gives no errors', async () => {
    respondWith({ success: false })

    await expect(getGrids(apiKey, { gameId: 123 })).rejects.toThrow(
      'Failed to get grids'
    )
  })
})

// Relic only ever needs one hero/logo/icon per game, so these three ask the API
// for a single result instead of filtering client-side.
describe.each([
  ['getHeroes', getHeroes, 'heroes', 'Failed to get heroes'],
  ['getLogos', getLogos, 'logos', 'Failed to get logos'],
  ['getIcons', getIcons, 'icons', 'Failed to get icons']
] as const)('%s', (_name, fn, segment, defaultError) => {
  test('requests a single result for the game', async () => {
    respondWith({ success: true, data: [] })

    await fn(apiKey, { gameId: 456 })

    expect(mockedAxios.get).toHaveBeenCalledWith(
      `https://www.steamgriddb.com/api/v2/${segment}/game/456?limit=1`,
      { headers: expectedHeaders }
    )
  })

  test('returns the data on success', async () => {
    const data = [{ id: 1, url: 'u', thumb: 't' }]
    respondWith({ success: true, data })

    await expect(fn(apiKey, { gameId: 456 })).resolves.toEqual(data)
  })

  test('throws the API error', async () => {
    respondWith({ success: false, errors: ['boom'] })

    await expect(fn(apiKey, { gameId: 456 })).rejects.toThrow('boom')
  })

  test('throws a default message when the API gives no errors', async () => {
    respondWith({ success: false })

    await expect(fn(apiKey, { gameId: 456 })).rejects.toThrow(defaultError)
  })
})
