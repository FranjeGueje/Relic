import { describe, expect, test } from 'vitest'
import { idlePad, readPad, stickDirection } from '../pad'

const buttons = (...down: number[]) =>
  Array.from({ length: 17 }, (_, i) => down.includes(i))
const NO_AXES = [0, 0]

describe('readPad', () => {
  test('a button counts when it goes down, not while it stays down', () => {
    const first = readPad(buttons(0), NO_AXES, idlePad, 0)
    const held = readPad(buttons(0), NO_AXES, first.state, 16)
    const released = readPad(buttons(), NO_AXES, held.state, 32)
    const again = readPad(buttons(0), NO_AXES, released.state, 48)

    expect(first.actions).toEqual(['confirm'])
    expect(held.actions).toEqual([])
    expect(again.actions).toEqual(['confirm'])
  })

  test('the buttons mean what the hints say', () => {
    const names = [
      [1, 'back'],
      [2, 'toggleInstalled'],
      [3, 'downloads'],
      [4, 'prevStore'],
      [5, 'nextStore'],
      [7, 'sort'],
      [8, 'menu'],
      [9, 'refresh']
    ] as const
    for (const [button, action] of names)
      expect(readPad(buttons(button), NO_AXES, idlePad, 0).actions).toEqual([
        action
      ])
  })

  test('the d-pad moves, and holding it repeats after a pause', () => {
    let state = idlePad
    const seen: string[][] = []
    for (const now of [0, 100, 399, 400, 450, 510, 520]) {
      const read = readPad(buttons(13), NO_AXES, state, now)
      seen.push(read.actions)
      state = read.state
    }
    // down at once, nothing until the delay, then every 110 ms
    expect(seen).toEqual([['down'], [], [], ['down'], [], ['down'], []])
  })

  test('changing direction answers at once', () => {
    const down = readPad(buttons(13), NO_AXES, idlePad, 0)
    const right = readPad(buttons(15), NO_AXES, down.state, 10)
    expect(right.actions).toEqual(['right'])
  })

  test('letting go of the direction starts over', () => {
    const down = readPad(buttons(13), NO_AXES, idlePad, 0)
    const idle = readPad(buttons(), NO_AXES, down.state, 100)
    const again = readPad(buttons(13), NO_AXES, idle.state, 150)
    expect(again.actions).toEqual(['down'])
  })

  test('the stick moves like the d-pad', () => {
    expect(readPad(buttons(), [0, 0.9], idlePad, 0).actions).toEqual(['down'])
    expect(readPad(buttons(), [-0.9, 0.1], idlePad, 0).actions).toEqual([
      'left'
    ])
  })
})

describe('stickDirection', () => {
  test('a stick near the middle is not a direction', () => {
    expect(stickDirection(0.3, -0.3)).toBeUndefined()
  })

  test('the axis that leans further wins', () => {
    expect(stickDirection(0.7, 0.9)).toBe('down')
    expect(stickDirection(0.9, -0.7)).toBe('right')
    expect(stickDirection(-0.1, -0.8)).toBe('up')
  })
})
