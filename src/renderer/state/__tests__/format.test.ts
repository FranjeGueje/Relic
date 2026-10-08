import { describe, expect, test } from 'vitest'
import type { DMQueueElement, GameStatus } from '../../../shared/types'
import { finishedKind, percentOf, progressText } from '../format'

const status = (progress?: GameStatus['progress']): GameStatus => ({
  appName: 'a',
  status: 'installing',
  progress
})

describe('progressText', () => {
  test('joins the pieces that exist', () => {
    expect(
      progressText(
        status({
          bytes: '15.37MB',
          eta: '00:00:09',
          percent: 10.17,
          downSpeed: 4.25
        })
      )
    ).toBe('10% · 15.37MB · 4.3 MB/s · 00:00:09')
  })

  test('skips what is missing, and says nothing without progress', () => {
    expect(progressText(status({ bytes: '1MB', eta: '' }))).toBe('1MB')
    expect(progressText(status())).toBe('')
    expect(progressText(undefined)).toBe('')
  })

  test('percentOf is kept between 0 and 100', () => {
    expect(percentOf(status({ bytes: '', eta: '', percent: 140 }))).toBe(100)
    expect(percentOf(status({ bytes: '', eta: '', percent: -3 }))).toBe(0)
    expect(percentOf(undefined)).toBe(0)
  })
})

describe('finishedKind', () => {
  test('tells how a queue entry ended', () => {
    const entry = (status?: DMQueueElement['status']) =>
      ({ status }) as DMQueueElement
    expect(finishedKind(entry('done'))).toBe('done')
    expect(finishedKind(entry('error'))).toBe('error')
    expect(finishedKind(entry('abort'))).toBe('abort')
    expect(finishedKind(entry())).toBe('other')
  })
})
