jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  rmSync: jest.fn(),
  statSync: jest.fn(),
  symlinkSync: jest.fn(),
  unlinkSync: jest.fn(),
  writeFileSync: jest.fn(),
  copyFileSync: jest.fn()
}))

jest.mock('node:crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn(() => ({
      digest: jest.fn(() => 'abc123')
    }))
  }))
}))

jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn()
}))

jest.mock('backend/constants/paths', () => ({
  relicMountPath: '/mock/mount',
  relicInstallPath: '/mock/games',
  userDataPath: '/mock/userdata',
  publicDir: '/mock/public'
}))

jest.mock('backend/storeManagers/legendary/constants', () => ({
  legendaryConfigPath: '/mock/legendary',
  legendaryInstalled: '/mock/legendary/installed.json'
}))

jest.mock('backend/storeManagers/nile/constants', () => ({
  nileConfigPath: '/mock/nile',
  nileInstalled: '/mock/nile/installed.json'
}))

jest.mock('backend/storeManagers/gog/constants', () => ({
  gogdlConfigPath: '/mock/gogdl'
}))

jest.mock('../steam_shortcuts/add_game', () => ({
  createGameSymlink: jest.fn()
}))

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  copyFileSync
} from 'fs'

const mockedExistsSync = jest.mocked(existsSync)
const mockedMkdirSync = jest.mocked(mkdirSync)
const mockedCopyFileSync = jest.mocked(copyFileSync)
const mockedReaddirSync = jest.mocked(readdirSync)
const mockedStatSync = jest.mocked(statSync)
const mockedWriteFileSync = jest.mocked(writeFileSync)

let logWarning: jest.Mock

beforeEach(() => {
  jest.clearAllMocks()

  mockedExistsSync.mockReturnValue(false)
  mockedReaddirSync.mockReturnValue([])
  mockedStatSync.mockReturnValue({ isFile: () => true } as ReturnType<
    typeof statSync
  >)

  logWarning = jest.mocked(require('backend/logger').logWarning)
})

function freshWindowify() {
  let mod: typeof import('../windowify')
  jest.isolateModules(() => {
    mod = require('../windowify')
  })
  return mod!
}

describe('windowify', () => {
  test('creates mount directories', () => {
    const { windowify } = freshWindowify()

    windowify(
      { title: 'Test', app_name: 'test', runner: 'legendary' } as never,
      '/games/test'
    )

    expect(mockedMkdirSync).toHaveBeenCalled()
  })

  test('warns for unsupported zoom runner', () => {
    const { windowify } = freshWindowify()

    windowify(
      { title: 'Zoom', app_name: 'zoom', runner: 'zoom' } as never,
      '/games/zoom'
    )

    expect(logWarning).toHaveBeenCalledWith(
      expect.stringContaining('windowify not implemented'),
      'Relic'
    )
  })

  test('warns when installed.json is missing', () => {
    const { windowify } = freshWindowify()

    windowify(
      { title: 'Test', app_name: 'test', runner: 'legendary' } as never,
      '/games/test'
    )

    expect(logWarning).toHaveBeenCalledWith(
      expect.stringContaining('No installed.json found'),
      'Relic'
    )
  })

  test('transforms legendary installed.json with windows paths', () => {
    mockedExistsSync.mockReturnValue(true)
    mockedReaddirSync.mockReturnValue([])
    jest.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ test: { install_path: '/games/test/game_dir' } })
    )

    const { windowify } = freshWindowify()

    windowify(
      { title: 'Test', app_name: 'test', runner: 'legendary' } as never,
      '/games/test/game_dir'
    )

    expect(mockedWriteFileSync).toHaveBeenCalled()
    const written = JSON.parse(
      (mockedWriteFileSync.mock.calls[0]?.[1] as string) || '{}'
    )
    expect(written.test.install_path).toBe('c:\\games\\game_dir')
  })

  test('transforms gog installed.json with windows paths', () => {
    mockedExistsSync.mockReturnValue(true)
    mockedReaddirSync.mockReturnValue([])
    jest.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        installed: [{ install_path: '/games/gog/game' }]
      })
    )

    const { windowify } = freshWindowify()

    windowify(
      { title: 'GogGame', app_name: 'gog', runner: 'gog' } as never,
      '/games/gog/game'
    )

    expect(mockedWriteFileSync).toHaveBeenCalled()
    const written = JSON.parse(
      (mockedWriteFileSync.mock.calls[0]?.[1] as string) || '{}'
    )
    expect(written.installed[0].install_path).toBe('c:\\games\\game')
  })
})

describe('syncMountBin', () => {
  test('returns early when source directory does not exist', () => {
    const { syncMountBin } = freshWindowify()

    syncMountBin()

    expect(logWarning).toHaveBeenCalledWith(
      expect.stringContaining('source not found'),
      'Relic'
    )
  })

  test('copies binary files when missing', () => {
    mockedExistsSync.mockImplementation((p: any) => {
      const str = String(p)
      if (str.includes('bin/x64/win32')) return true
      if (str.includes('/mount/bin/')) return false
      return false
    })
    mockedReaddirSync.mockReturnValue(['helper.exe', 'config.txt'] as any)
    mockedStatSync.mockReturnValue({ isFile: () => true } as ReturnType<
      typeof statSync
    >)

    const { syncMountBin } = freshWindowify()

    syncMountBin()

    expect(mockedCopyFileSync).toHaveBeenCalledTimes(2)
  })

  test('skips files with matching hashes', () => {
    mockedExistsSync.mockImplementation((p: any) => {
      const str = String(p)
      if (str.includes('bin/x64/win32')) return true
      if (str.includes('/mount/bin/')) return true
      return false
    })
    mockedReaddirSync.mockReturnValue(['helper.exe'] as any)
    mockedStatSync.mockReturnValue({ isFile: () => true } as ReturnType<
      typeof statSync
    >)

    const { syncMountBin } = freshWindowify()

    syncMountBin()

    expect(mockedCopyFileSync).not.toHaveBeenCalled()
  })
})
