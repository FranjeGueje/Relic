import { existsSync, unlinkSync } from 'fs'
import { getUserdataInfo } from '../../steam_shortcuts/steam_helpers'
import { deleteGrids } from '../delete'

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  unlinkSync: jest.fn()
}))
jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}))
jest.mock('../../steam_shortcuts/steam_helpers', () => ({
  getUserdataInfo: jest.fn()
}))

const mockedExistsSync = jest.mocked(existsSync)
const mockedUnlinkSync = jest.mocked(unlinkSync)
const mockedGetUserdataInfo = jest.mocked(getUserdataInfo)

// Must stay in sync with the names download.ts writes. If the two lists ever
// drift, a grid file is left orphaned on uninstall.
const gridFileNames = (id: number) => [
  `${id}.png`,
  `${id}p.png`,
  `${id}_hero.png`,
  `${id}_logo.png`,
  `${id}_icon.png`
]

beforeEach(() => {
  jest.clearAllMocks()
  mockedExistsSync.mockReturnValue(true)
  mockedGetUserdataInfo.mockReturnValue({
    userdataDir: '/steam/userdata',
    folders: ['123456']
  })
})

describe('deleteGrids', () => {
  test('deletes the five grid files for the Steam user', () => {
    deleteGrids(42)

    const deleted = mockedUnlinkSync.mock.calls.map(([path]) => path)
    expect(deleted).toEqual(
      gridFileNames(42).map(
        (name) => `/steam/userdata/123456/config/grid/${name}`
      )
    )
  })

  test('deletes the icon as .png, not .ico', () => {
    // Regression guard: the icon was written as .ico until v0.5.4, so a stale
    // .ico name here would silently leave the file behind.
    deleteGrids(42)

    const deleted = mockedUnlinkSync.mock.calls.map(([path]) => String(path))
    expect(deleted).toContain('/steam/userdata/123456/config/grid/42_icon.png')
    expect(deleted.some((path) => path.endsWith('.ico'))).toBe(false)
  })

  test('deletes the grids of every Steam user on the machine', () => {
    mockedGetUserdataInfo.mockReturnValue({
      userdataDir: '/steam/userdata',
      folders: ['111', '222']
    })

    deleteGrids(7)

    expect(mockedUnlinkSync).toHaveBeenCalledTimes(10)
    expect(mockedUnlinkSync).toHaveBeenCalledWith(
      '/steam/userdata/111/config/grid/7.png'
    )
    expect(mockedUnlinkSync).toHaveBeenCalledWith(
      '/steam/userdata/222/config/grid/7.png'
    )
  })

  test('does nothing when there are no Steam users', () => {
    mockedGetUserdataInfo.mockReturnValue({
      userdataDir: '/steam/userdata',
      folders: []
    })

    deleteGrids(42)

    expect(mockedUnlinkSync).not.toHaveBeenCalled()
  })

  test('skips files that are not there', () => {
    mockedExistsSync.mockReturnValue(false)

    deleteGrids(42)

    expect(mockedUnlinkSync).not.toHaveBeenCalled()
  })

  test('keeps going when one file fails to delete', () => {
    mockedUnlinkSync.mockImplementationOnce(() => {
      throw new Error('permission denied')
    })

    expect(() => deleteGrids(42)).not.toThrow()
    // The first one threw; the remaining four are still attempted.
    expect(mockedUnlinkSync).toHaveBeenCalledTimes(5)
  })
})
