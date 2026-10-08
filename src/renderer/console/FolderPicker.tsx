import { useEffect, useRef, useState } from 'react'
import type { FolderListing } from '../../shared/types'
import type { Translate } from '../i18n'
import { CloseButton } from './CloseButton'
import { useLayer } from '../input/useInput'

type Row = {
  id: string
  label: string
  run: () => void
  /** The row that does what the screen is for: drawn in the accent colour */
  primary?: boolean
}

const childOf = (path: string, folder: string) =>
  path.endsWith('/') ? `${path}${folder}` : `${path}/${folder}`

/**
 * Chooses a folder by walking through the disk with the gamepad. What is
 * valid is up to rakun: its refusal is shown and the picker stays open.
 */
export function FolderPicker({
  title,
  start,
  automatic,
  t,
  onPick,
  onClose
}: {
  title: string
  start: string
  /** A row that picks «nothing» (the empty setting) */
  automatic?: boolean
  t: Translate
  /** Saves the folder; answers the reason when it is refused */
  onPick: (path: string) => Promise<string | undefined>
  onClose: () => void
}) {
  const [listing, setListing] = useState<FolderListing | null>(null)
  const [focus, setFocus] = useState(0)
  const [error, setError] = useState('')
  const rowsRef = useRef<HTMLUListElement>(null)

  const open = async (path: string | undefined) => {
    try {
      // no path at all, not an undefined one: JSON would turn it into null
      const next = await (path === undefined
        ? window.rakun.call('listFolders')
        : window.rakun.call('listFolders', path))
      setListing(next)
      setFocus(0)
      setError('')
    } catch (reason) {
      if (path) await open(undefined)
      else setError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  useEffect(() => {
    void open(start || undefined)
    // only when it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pick = async (path: string) => {
    const reason = await onPick(path)
    if (reason) setError(t('settings.failed', { error: reason }))
  }

  const rows: Row[] = listing
    ? [
        {
          id: 'use',
          primary: true,
          label: t('folders.use'),
          run: () => void pick(listing.path)
        },
        ...(automatic
          ? [
              {
                id: 'auto',
                label: t('folders.automatic'),
                run: () => void pick('')
              }
            ]
          : []),
        ...(listing.parent !== null
          ? [
              {
                id: 'up',
                label: `.. ${t('folders.up')}`,
                run: () => void open(listing.parent ?? undefined)
              }
            ]
          : []),
        ...listing.folders.map((folder) => ({
          id: `dir-${folder}`,
          label: folder,
          run: () => void open(childOf(listing.path, folder))
        }))
      ]
    : []

  useEffect(() => {
    rowsRef.current?.children[focus]?.scrollIntoView({ block: 'nearest' })
  }, [focus, listing])

  useLayer((action) => {
    if (action === 'up') setFocus(Math.max(focus - 1, 0))
    else if (action === 'down') setFocus(Math.min(focus + 1, rows.length - 1))
    else if (action === 'confirm') rows[focus]?.run()
    else if (action === 'back') onClose()
  })

  return (
    <div className="overlay solid" role="dialog">
      <div className="panel wide">
        <CloseButton t={t} onClose={onClose} />
        <h1>{title}</h1>
        <p className="muted small path">{listing?.path ?? ''}</p>
        <ul className="rows tall" ref={rowsRef}>
          {rows.map((row, index) => (
            <li key={row.id}>
              <button
                className={`row${row.primary ? ' primary' : ''}${index === focus ? ' focused' : ''}`}
                onMouseEnter={() => setFocus(index)}
                onClick={row.run}
              >
                {row.label}
              </button>
            </li>
          ))}
        </ul>
        {listing && listing.folders.length === 0 && (
          <p className="muted">{t('folders.empty')}</p>
        )}
        {error && <p className="errorText">{error}</p>}
      </div>
    </div>
  )
}
