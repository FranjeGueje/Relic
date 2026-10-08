import { isEventChannel, type RakunEvent } from './channels'

/** One `event: x` + `data: [...]` block of the stream; a `: ping` has neither */
export function parseSseBlock(block: string): RakunEvent | undefined {
  const lines = block.split('\n')
  const event = lines.find((line) => line.startsWith('event: '))?.slice(7)
  const data = lines.find((line) => line.startsWith('data: '))?.slice(6)
  if (!event || data === undefined || !isEventChannel(event)) return undefined
  return { event, args: JSON.parse(data) as unknown[] }
}

/** Splits what arrives into whole blocks, keeping the unfinished tail */
export function splitBlocks(buffer: string): {
  blocks: string[]
  rest: string
} {
  const parts = buffer.split('\n\n')
  return { blocks: parts.slice(0, -1), rest: parts.at(-1) ?? '' }
}

/** The reason rakun gives in its error answer, or what the status says */
export function errorOf(status: number, body: string): string {
  try {
    const { error } = JSON.parse(body) as { error?: string }
    if (error) return error
  } catch {
    // not JSON: the status says enough
  }
  return `rakun answered ${status}`
}
