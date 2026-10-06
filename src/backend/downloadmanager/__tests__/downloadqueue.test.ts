import { DMQueueElement } from 'common/types'

const store: Record<string, unknown> = {}
jest.mock('backend/electron_store', () => ({
  TypeCheckedStoreBackend: jest.fn().mockImplementation(() => ({
    get: (key: string, def: unknown) => store[key] ?? def,
    set: (key: string, value: unknown) => {
      store[key] = value
    },
    has: (key: string) => key in store,
    delete: (key: string) => {
      delete store[key]
    }
  }))
}))
jest.mock('backend/storeManagers', () => ({ libraryManagerMap: {} }))
jest.mock('backend/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { DownloadManager: 'DownloadManager' }
}))
jest.mock('backend/utils', () => ({
  getFileSize: jest.fn(),
  removeFolder: jest.fn(),
  sendGameStatusUpdate: jest.fn()
}))
jest.mock('backend/ipc', () => ({ sendFrontendMessage: jest.fn() }))
jest.mock('backend/utils/aborthandler/aborthandler', () => ({
  callAbortController: jest.fn()
}))
jest.mock('backend/online_monitor', () => ({ onConnectivityChange: jest.fn() }))
jest.mock('backend/downloadmanager/utils', () => ({
  installQueueElement: jest.fn(),
  updateQueueElement: jest.fn()
}))

import { initQueue } from '../downloadqueue'
import { installQueueElement } from '../utils'

const element = {
  type: 'install',
  params: { appName: 'game', runner: 'zoom' }
} as unknown as DMQueueElement

describe('initQueue', () => {
  test('a second call while the queue is running does not process the same element twice', async () => {
    store['queue'] = [element]
    let finish: (value: { status: 'done' }) => void = () => undefined
    jest.mocked(installQueueElement).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      })
    )

    const first = initQueue()
    const second = initQueue()
    finish({ status: 'done' })
    await Promise.all([first, second])

    expect(installQueueElement).toHaveBeenCalledTimes(1)
  })
})
