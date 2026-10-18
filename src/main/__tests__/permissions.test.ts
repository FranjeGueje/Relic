import { describe, expect, test } from 'vitest'
import { isPermissionAllowed } from '../permissions'

describe('isPermissionAllowed', () => {
  test('the interface may use the clipboard, from its file or the dev server', () => {
    expect(
      isPermissionAllowed(
        'clipboard-read',
        'file:///app/out/renderer/index.html'
      )
    ).toBe(true)
    expect(isPermissionAllowed('clipboard-sanitized-write', 'file://')).toBe(
      true
    )
    expect(
      isPermissionAllowed(
        'clipboard-read',
        'http://localhost:5173/',
        'http://localhost:5173'
      )
    ).toBe(true)
  })

  test('a store page gets nothing, not even the clipboard', () => {
    for (const permission of [
      'clipboard-read',
      'media',
      'geolocation',
      'notifications'
    ])
      expect(
        isPermissionAllowed(permission, 'https://www.epicgames.com/id/login')
      ).toBe(false)
  })

  test('the interface gets nothing else', () => {
    for (const permission of ['media', 'geolocation', 'notifications'])
      expect(isPermissionAllowed(permission, 'file:///index.html')).toBe(false)
  })

  test('without a dev server, an http page is not the interface', () => {
    expect(
      isPermissionAllowed('clipboard-read', 'http://localhost:5173/')
    ).toBe(false)
  })
})
