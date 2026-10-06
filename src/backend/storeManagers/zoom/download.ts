import { createWriteStream, renameSync, rmSync } from 'fs'
import { pipeline } from 'stream/promises'
import type { Readable } from 'stream'

/**
 * Saves a stream to `destination` only if it arrives whole. It is written to a
 * `.part` file and renamed at the end, so an aborted download never leaves a
 * truncated file that a retry would take for the finished installer.
 */
export async function saveStreamToFile(
  stream: Readable,
  destination: string
): Promise<void> {
  const partial = `${destination}.part`
  try {
    await pipeline(stream, createWriteStream(partial))
    renameSync(partial, destination)
  } catch (error) {
    rmSync(partial, { force: true })
    throw error
  }
}
