import { describe, expect, test } from 'vitest'
import { translator } from '..'
import { en } from '../strings'

describe('texts', () => {
  test('no text is empty', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[])
      expect(en[key].length, key).toBeGreaterThan(0)
  })
})

describe('translator', () => {
  test('fills the placeholders', () => {
    expect(translator()('sheet.installPath', { path: '/games' })).toBe(
      'It will be installed in /games'
    )
  })

  test('leaves a placeholder alone when nothing fills it', () => {
    expect(translator()('sheet.installPath')).toBe(
      'It will be installed in {path}'
    )
  })
})
