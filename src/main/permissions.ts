import type { Session } from 'electron'

/** What the interface uses: its text fields read the clipboard (paste a login address) */
const INTERFACE_PERMISSIONS = new Set([
  'clipboard-read',
  'clipboard-sanitized-write'
])

/**
 * Whether a page may have a permission. Electron grants everything by default, and the login
 * windows show the stores' own pages: none of them gets camera, microphone, location,
 * notifications or anything else. Only the interface (its file, or the dev server) gets the clipboard.
 */
export function isPermissionAllowed(
  permission: string,
  url: string,
  devServer?: string
): boolean {
  if (!INTERFACE_PERMISSIONS.has(permission)) return false
  return url.startsWith('file://') || (!!devServer && url.startsWith(devServer))
}

/** Puts `isPermissionAllowed` in charge of a session's requests and checks */
export function guardPermissions(session: Session, devServer?: string): void {
  session.setPermissionRequestHandler(
    (_contents, permission, callback, details) =>
      callback(
        isPermissionAllowed(permission, details.requestingUrl, devServer)
      )
  )
  session.setPermissionCheckHandler((_contents, permission, origin) =>
    isPermissionAllowed(permission, origin, devServer)
  )
}
