import { describe, expect, test, vi } from 'vitest'
import { keyToAction } from '../actions'
import { dispatch, pushLayer } from '../bus'
import { buttonNames, detectControllerLayout, hintKeys } from '../controller'

describe('keyToAction', () => {
  test('maps the keys to actions and ignores the rest', () => {
    expect(keyToAction('ArrowLeft')).toBe('left')
    expect(keyToAction('Enter')).toBe('confirm')
    expect(keyToAction('Escape')).toBe('back')
    expect(keyToAction('PageDown')).toBe('nextStore')
    expect(keyToAction('q')).toBe('quit')
    expect(keyToAction('m')).toBe('menu')
    expect(keyToAction('F5')).toBeUndefined()
  })
})

describe('layers', () => {
  test('only the layer on top gets the action', () => {
    const base = vi.fn()
    const dialog = vi.fn()
    const popBase = pushLayer(base)
    const popDialog = pushLayer(dialog)

    dispatch('confirm')
    expect(dialog).toHaveBeenCalledWith('confirm')
    expect(base).not.toHaveBeenCalled()

    popDialog()
    dispatch('back')
    expect(base).toHaveBeenCalledWith('back')
    popBase()
  })

  test('with no layer an action goes nowhere', () => {
    expect(() => dispatch('up')).not.toThrow()
  })
})

describe('controller layout', () => {
  test('is told from the id of the pad', () => {
    expect(
      detectControllerLayout('Xbox 360 Controller (STANDARD GAMEPAD)')
    ).toBe('xbox')
    expect(
      detectControllerLayout('Wireless Controller (Vendor: 054c Product: 0ce6)')
    ).toBe('ps5')
    expect(
      detectControllerLayout('Wireless Controller (Vendor: 054c Product: 09cc)')
    ).toBe('ps4')
    expect(detectControllerLayout('Steam (Vendor: 28de Product: 11ff)')).toBe(
      'steam-deck'
    )
    expect(detectControllerLayout('mystery')).toBe('xbox')
  })

  test('names the buttons the way that pad prints them', () => {
    expect(buttonNames('ps5').confirm).toBe('✕')
    expect(buttonNames('xbox').back).toBe('B')
    expect(buttonNames('nintendo').secondary).toBe('Y')
  })

  test('the hints speak of keys without a pad and of buttons with one', () => {
    expect(hintKeys(null).select).toBe('Enter')
    expect(hintKeys('ps5')).toMatchObject({
      select: '✕',
      back: '◯',
      installed: '□',
      downloads: '△'
    })
    expect(hintKeys('xbox')).toMatchObject({
      select: 'A',
      installed: 'X',
      downloads: 'Y'
    })
  })
})
