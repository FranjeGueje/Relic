import { existsSync, mkdirSync } from 'fs'
import { GameInfo } from 'common/types'
import { GlobalConfig } from 'backend/config'
import { downloadFile } from 'backend/utils'
import { getUserdataInfo } from '../../steam_shortcuts/steam_helpers'
import { searchGame, getGrids, getHeroes, getLogos, getIcons } from '../api'
import { downloadGrids } from '../download'

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}))
jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}))
jest.mock('backend/config', () => ({
  GlobalConfig: { get: jest.fn() }
}))
jest.mock('backend/utils', () => ({
  downloadFile: jest.fn()
}))
jest.mock('../../steam_shortcuts/steam_helpers', () => ({
  getUserdataInfo: jest.fn()
}))
jest.mock('../api', () => ({
  searchGame: jest.fn(),
  getGrids: jest.fn(),
  getHeroes: jest.fn(),
  getLogos: jest.fn(),
  getIcons: jest.fn()
}))

const mockedExistsSync = jest.mocked(existsSync)
const mockedMkdirSync = jest.mocked(mkdirSync)
const mockedGlobalConfig = jest.mocked(GlobalConfig)
const mockedDownloadFile = jest.mocked(downloadFile)
const mockedGetUserdataInfo = jest.mocked(getUserdataInfo)
const mockedSearchGame = jest.mocked(searchGame)
const mockedGetGrids = jest.mocked(getGrids)
const mockedGetHeroes = jest.mocked(getHeroes)
const mockedGetLogos = jest.mocked(getLogos)
const mockedGetIcons = jest.mocked(getIcons)

const gameInfo = { title: 'Beat Cop' } as GameInfo

function grid(url: string) {
  return [{ id: 1, url, thumb: `${url}-thumb` }]
}

function setStoredApiKey(stored: string) {
  mockedGlobalConfig.get.mockReturnValue({
    getSettings: () => ({ steamGridDbApiKey: stored })
  } as never)
}

beforeEach(() => {
  jest.clearAllMocks()

  setStoredApiKey('plain-key')
  mockedGetUserdataInfo.mockReturnValue({
    userdataDir: '/steam/userdata',
    folders: ['123456']
  })
  mockedSearchGame.mockResolvedValue([{ id: 99, name: 'Beat Cop' }] as never)
  // header and portrait come from the same function, in that order
  mockedGetGrids
    .mockResolvedValueOnce(grid('header-url'))
    .mockResolvedValueOnce(grid('portrait-url'))
  mockedGetHeroes.mockResolvedValue(grid('hero-url'))
  mockedGetLogos.mockResolvedValue(grid('logo-url'))
  mockedGetIcons.mockResolvedValue(grid('icon-url'))
  // Nothing on disk yet: the folder is missing and no file exists
  mockedExistsSync.mockReturnValue(false)
})

describe('downloadGrids - api key', () => {
  test('does nothing when no key is stored', async () => {
    setStoredApiKey('')

    await expect(downloadGrids(gameInfo, 42)).resolves.toBe(false)
    expect(mockedSearchGame).not.toHaveBeenCalled()
  })

  test('does nothing when the stored value is a leftover encrypted key', async () => {
    // Regression guard: v0.6.0 briefly encrypted this with safeStorage,
    // prefixing the value with "sgdb:v1:". That value is unusable as an API
    // key and must never be sent to SteamGridDB as one.
    setStoredApiKey('sgdb:v1:garbage-ciphertext')

    await expect(downloadGrids(gameInfo, 42)).resolves.toBe(false)
    expect(mockedSearchGame).not.toHaveBeenCalled()
  })

  test('searches with the stored key as-is', async () => {
    await downloadGrids(gameInfo, 42)

    expect(mockedSearchGame).toHaveBeenCalledWith('plain-key', 'Beat Cop')
  })
})

describe('downloadGrids - lookup', () => {
  test('gives up when the search finds no game', async () => {
    mockedSearchGame.mockResolvedValue([])

    await expect(downloadGrids(gameInfo, 42)).resolves.toBe(false)
    expect(mockedDownloadFile).not.toHaveBeenCalled()
  })

  test('gives up when Steam has no user folders', async () => {
    mockedGetUserdataInfo.mockReturnValue({
      userdataDir: '/steam/userdata',
      folders: []
    })

    await expect(downloadGrids(gameInfo, 42)).resolves.toBe(false)
    expect(mockedDownloadFile).not.toHaveBeenCalled()
  })

  test('asks for the artwork of the first search result', async () => {
    await downloadGrids(gameInfo, 42)

    expect(mockedGetGrids).toHaveBeenCalledWith('plain-key', {
      gameId: 99,
      dimensions: ['460x215']
    })
    expect(mockedGetGrids).toHaveBeenCalledWith('plain-key', {
      gameId: 99,
      dimensions: ['600x900']
    })
    expect(mockedGetHeroes).toHaveBeenCalledWith('plain-key', { gameId: 99 })
    expect(mockedGetLogos).toHaveBeenCalledWith('plain-key', { gameId: 99 })
    expect(mockedGetIcons).toHaveBeenCalledWith('plain-key', { gameId: 99 })
  })

  test('returns false and does not throw when a request fails', async () => {
    mockedSearchGame.mockRejectedValue(new Error('network down'))

    await expect(downloadGrids(gameInfo, 42)).resolves.toBe(false)
  })
})

describe('downloadGrids - writing files', () => {
  const gridDir = '/steam/userdata/123456/config/grid'

  test('writes the five artwork files under the Steam app id', async () => {
    await expect(downloadGrids(gameInfo, 42)).resolves.toBe(true)

    expect(mockedDownloadFile.mock.calls.map(([args]) => args)).toEqual([
      { url: 'header-url', dest: `${gridDir}/42.png` },
      { url: 'portrait-url', dest: `${gridDir}/42p.png` },
      { url: 'hero-url', dest: `${gridDir}/42_hero.png` },
      { url: 'logo-url', dest: `${gridDir}/42_logo.png` },
      { url: 'icon-url', dest: `${gridDir}/42_icon.png` }
    ])
  })

  test('writes the icon as .png, not .ico', async () => {
    // Regression guard: the icon was saved as .ico until v0.5.4. delete.ts has
    // the matching list, so both must use the same extension.
    await downloadGrids(gameInfo, 42)

    const destinations = mockedDownloadFile.mock.calls.map(
      ([args]) => args.dest
    )
    expect(destinations).toContain(`${gridDir}/42_icon.png`)
    expect(destinations.some((dest) => dest.endsWith('.ico'))).toBe(false)
  })

  test('creates the grid folder when it is missing', async () => {
    await downloadGrids(gameInfo, 42)

    expect(mockedMkdirSync).toHaveBeenCalledWith(gridDir, { recursive: true })
  })

  test('leaves artwork that is already on disk alone', async () => {
    mockedExistsSync.mockImplementation(
      (path) => path === `${gridDir}/42p.png` || path === gridDir
    )

    await downloadGrids(gameInfo, 42)

    const destinations = mockedDownloadFile.mock.calls.map(
      ([args]) => args.dest
    )
    expect(destinations).not.toContain(`${gridDir}/42p.png`)
    expect(destinations).toHaveLength(4)
    // The folder already exists, so it is not recreated
    expect(mockedMkdirSync).not.toHaveBeenCalled()
  })

  test('skips artwork the API does not have', async () => {
    mockedGetLogos.mockResolvedValue([])
    mockedGetIcons.mockResolvedValue([])

    await downloadGrids(gameInfo, 42)

    const destinations = mockedDownloadFile.mock.calls.map(
      ([args]) => args.dest
    )
    expect(destinations).toEqual([
      `${gridDir}/42.png`,
      `${gridDir}/42p.png`,
      `${gridDir}/42_hero.png`
    ])
  })

  test('writes the artwork for every Steam user on the machine', async () => {
    mockedGetUserdataInfo.mockReturnValue({
      userdataDir: '/steam/userdata',
      folders: ['111', '222']
    })

    await expect(downloadGrids(gameInfo, 42)).resolves.toBe(true)

    const destinations = mockedDownloadFile.mock.calls.map(
      ([args]) => args.dest
    )
    expect(destinations).toContain('/steam/userdata/111/config/grid/42.png')
    expect(destinations).toContain('/steam/userdata/222/config/grid/42.png')
    expect(destinations).toHaveLength(10)
  })
})
