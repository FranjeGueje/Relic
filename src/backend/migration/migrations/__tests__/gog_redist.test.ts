import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { dirSync } from 'tmp'

const tmpTools = dirSync({ unsafeCleanup: true })
jest.mock('backend/constants/paths', () => ({
  get toolsPath() {
    return tmpTools.name
  }
}))

import { RemoveGogRedistMigration } from '../gog_redist'

describe('RemoveGogRedistMigration', () => {
  const redistDir = () => join(tmpTools.name, 'redist', 'gog')

  test('removes the leftover redist folder', async () => {
    mkdirSync(redistDir(), { recursive: true })
    writeFileSync(join(redistDir(), 'setup.exe'), 'x')

    await expect(new RemoveGogRedistMigration().run()).resolves.toBe(true)

    expect(existsSync(redistDir())).toBe(false)
  })

  test('is a no-op when the folder does not exist', async () => {
    await expect(new RemoveGogRedistMigration().run()).resolves.toBe(true)
  })
})
