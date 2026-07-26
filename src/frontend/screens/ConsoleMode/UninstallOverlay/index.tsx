import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { useEffect, useRef, useState } from 'react'

import './index.scss'

import { BTN_ACTION, BTN_BACK } from '../controller'
import { useGamepadButtonPress } from '../hooks'

import type { GameInfo } from 'common/types'

type FocusKey = 'cancel' | 'uninstall'

export default function UninstallOverlay({
  game,
  onDismiss
}: {
  game: GameInfo
  onDismiss: () => void
}) {
  const { t } = useTranslation()

  const [focused, setFocused] = useState<FocusKey>('uninstall')
  const uninstallButtonRef = useRef<HTMLButtonElement | null>(null)
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    document.body.classList.add('console-modal-open')
    return () => document.body.classList.remove('console-modal-open')
  }, [])

  const visibleRows: FocusKey[] = ['cancel', 'uninstall']

  useEffect(() => {
    const btn =
      focused === 'uninstall'
        ? uninstallButtonRef.current
        : cancelButtonRef.current
    btn?.focus({ preventScroll: true })
  }, [focused])

  const uninstallGame = async () => {
    await window.api.uninstall(
      game.app_name,
      game.runner,
      false,
      false
    )
    onDismiss()
  }

  const handlersRef = useRef({
    focused,
    visibleRows,
    uninstallGame,
    onDismiss
  })
  handlersRef.current = {
    focused,
    visibleRows,
    uninstallGame,
    onDismiss
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const h = handlersRef.current
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        h.onDismiss()
        return
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        const idx = h.visibleRows.indexOf(h.focused)
        if (idx === -1) return
        const delta = e.key === 'ArrowDown' ? 1 : -1
        const next = (idx + delta + h.visibleRows.length) % h.visibleRows.length
        setFocused(h.visibleRows[next])
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        e.stopPropagation()
        setFocused(h.focused === 'uninstall' ? 'cancel' : 'uninstall')
        return
      }
      if (e.key === 'Enter' || e.key === ' ') {
        if (h.focused === 'uninstall') {
          e.preventDefault()
          void h.uninstallGame()
        } else if (h.focused === 'cancel') {
          e.preventDefault()
          h.onDismiss()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  useGamepadButtonPress(BTN_ACTION, () => {
    if (focused === 'uninstall') void uninstallGame()
    else if (focused === 'cancel') onDismiss()
  })
  useGamepadButtonPress(BTN_BACK, onDismiss)

  return (
    <div className="consoleInstallOverlay" role="dialog" aria-live="polite">
      <div className="consoleModal">
        <div className="consoleModalTitle">
          {t('console.uninstall.title', 'Uninstall game')}
        </div>
        <div className="consoleModalGameTitle">{game.title}</div>

        <div className="consoleInstallFields">
          <div className="consoleInstallRow">
            <span className="consoleInstallLabel">
              {t('console.uninstall.message', 'Do you want to uninstall "{{title}}"?', { title: game.title })}
            </span>
          </div>
        </div>

        <div className="consoleInstallButtons">
          <button
            ref={cancelButtonRef}
            className={classNames('consoleChip', {
              active: focused === 'cancel'
            })}
            onClick={onDismiss}
            onMouseEnter={() => setFocused('cancel')}
            onFocus={() => setFocused('cancel')}
          >
            {t('button.cancel', 'Cancel')}
          </button>
          <button
            ref={uninstallButtonRef}
            className={classNames('consoleChip', {
              active: focused === 'uninstall'
            })}
            onClick={() => void uninstallGame()}
            onMouseEnter={() => setFocused('uninstall')}
            onFocus={() => setFocused('uninstall')}
          >
            {t('button.uninstall', 'Uninstall')}
          </button>
        </div>
      </div>
    </div>
  )
}
