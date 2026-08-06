jest.mock('backend/logger', () => ({
  logDebug: jest.fn(),
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Zoom: 'Zoom' }
}))

jest.mock('../electronStores', () => ({
  installedGamesStore: { get: jest.fn(), set: jest.fn() },
  libraryStore: { get: jest.fn(), set: jest.fn() }
}))

jest.mock('../../../utils', () => ({
  moveOnUnix: jest.fn()
}))

jest.mock('backend/relic/game_events', () => ({
  onGameMoved: jest.fn()
}))

jest.mock('../../index', () => ({
  libraryManagerMap: {
    zoom: { refresh: jest.fn() }
  }
}))

import ZoomGame from '../games'
import { installedGamesStore } from '../electronStores'
import { moveOnUnix } from '../../../utils'
import { onGameMoved } from 'backend/relic/game_events'
import { libraryManagerMap } from '../../index'

const mockedInstalledGamesStore = jest.mocked(installedGamesStore)
const mockedMoveOnUnix = jest.mocked(moveOnUnix)
const mockedOnGameMoved = jest.mocked(onGameMoved)

describe('ZoomGame.moveInstall', () => {
  const appName = 'test-zoom-game'
  let game: ZoomGame

  beforeEach(() => {
    jest.clearAllMocks()
    game = new ZoomGame(appName)
    game.getGameInfo = jest.fn().mockReturnValue({
      app_name: appName,
      title: 'Test Zoom Game',
      runner: 'zoom',
      install: { install_path: '/old/path/Test Zoom Game' }
    })
  })

  it('moves the game, updates the store, and notifies onGameMoved', async () => {
    mockedMoveOnUnix.mockResolvedValue({
      status: 'done',
      installPath: '/new/path/Test Zoom Game'
    })
    mockedInstalledGamesStore.get.mockReturnValue([
      { appName, install_path: '/old/path/Test Zoom Game' }
    ])

    const result = await game.moveInstall('/new/path')

    expect(result).toEqual({ status: 'done' })
    expect(mockedInstalledGamesStore.set).toHaveBeenCalledWith('installed', [
      { appName, install_path: '/new/path/Test Zoom Game' }
    ])
    expect(libraryManagerMap['zoom'].refresh).toHaveBeenCalled()
    expect(mockedOnGameMoved).toHaveBeenCalledWith(
      game,
      '/new/path/Test Zoom Game'
    )
  })

  it('returns an error and does not touch the store when the move fails', async () => {
    mockedMoveOnUnix.mockResolvedValue({
      status: 'error',
      error: 'disk full'
    })

    const result = await game.moveInstall('/new/path')

    expect(result).toEqual({ status: 'error', error: 'disk full' })
    expect(mockedInstalledGamesStore.set).not.toHaveBeenCalled()
    expect(mockedOnGameMoved).not.toHaveBeenCalled()
  })

  it('returns an error when the game is not found in the installed store', async () => {
    mockedMoveOnUnix.mockResolvedValue({
      status: 'done',
      installPath: '/new/path/Test Zoom Game'
    })
    mockedInstalledGamesStore.get.mockReturnValue([
      { appName: 'some-other-game', install_path: '/old/path/other' }
    ])

    const result = await game.moveInstall('/new/path')

    expect(result).toEqual({ status: 'error', error: "Game isn't installed" })
    expect(mockedInstalledGamesStore.set).not.toHaveBeenCalled()
    expect(mockedOnGameMoved).not.toHaveBeenCalled()
  })
})
