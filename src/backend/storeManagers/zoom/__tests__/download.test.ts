import { existsSync, mkdtempSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { Readable } from 'stream'
import { saveStreamToFile } from '../download'

const newDestination = () =>
  join(mkdtempSync(join(tmpdir(), 'relicd-zoom-')), 'installer.exe')

describe('saveStreamToFile', () => {
  test('writes the whole stream to the destination and leaves no .part file', async () => {
    const destination = newDestination()

    await saveStreamToFile(Readable.from(['abc', 'def']), destination)

    expect(readFileSync(destination, 'utf-8')).toBe('abcdef')
    expect(existsSync(`${destination}.part`)).toBe(false)
  })

  test('an aborted stream leaves neither the destination nor a .part file', async () => {
    const destination = newDestination()
    const aborted = new Readable({
      read() {
        this.push('partial')
        this.destroy(new Error('aborted'))
      }
    })

    await expect(saveStreamToFile(aborted, destination)).rejects.toThrow(
      'aborted'
    )

    expect(existsSync(destination)).toBe(false)
    expect(existsSync(`${destination}.part`)).toBe(false)
  })
})
