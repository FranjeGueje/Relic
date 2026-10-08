import { describe, expect, test } from 'vitest'
import { errorOf, parseSseBlock, splitBlocks } from '../sse'

describe('the event stream format', () => {
  test('a block gives its event and arguments; a ping gives nothing', () => {
    expect(
      parseSseBlock('event: gameStatusUpdate\ndata: [{"appName":"g"}]')
    ).toEqual({
      event: 'gameStatusUpdate',
      args: [{ appName: 'g' }]
    })
    expect(parseSseBlock(': ping')).toBeUndefined()
    expect(parseSseBlock('event: unknown\ndata: []')).toBeUndefined()
  })

  test('splitBlocks keeps the unfinished tail for the next chunk', () => {
    expect(splitBlocks('a\n\nb\n\nc')).toEqual({
      blocks: ['a', 'b'],
      rest: 'c'
    })
    expect(splitBlocks('abc')).toEqual({ blocks: [], rest: 'abc' })
  })
})

describe('errorOf', () => {
  test('gives the reason rakun answers, or what the status says', () => {
    expect(errorOf(500, '{"error":"Unknown store"}')).toBe('Unknown store')
    expect(errorOf(502, 'not json')).toBe('rakun answered 502')
  })
})
