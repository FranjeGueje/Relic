import { useEffect, useRef } from 'react'

import { BTN_ACTION, BTN_BACK } from 'frontend/screens/ConsoleMode/controller'
import { useGamepadButtonPress } from 'frontend/screens/ConsoleMode/hooks'

import './index.scss'

type Props = {
  gameTitle: string
  onDismiss: () => void
}

export default function InstallSuccessOverlay({ gameTitle, onDismiss }: Props) {
  const dismissRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    document.body.classList.add('console-modal-open')
    return () => document.body.classList.remove('console-modal-open')
  }, [])

  useEffect(() => {
    dismissRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        onDismiss()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onDismiss])

  useGamepadButtonPress(BTN_ACTION, onDismiss)
  useGamepadButtonPress(BTN_BACK, onDismiss)

  return (
    <div className="consoleLaunchOverlay" role="status" aria-live="polite">
      <div className="consoleModal consoleSuccessModal">
        <div className="consoleModalTitle">INSTALADO</div>
        <div className="consoleModalGameTitle">{gameTitle}</div>
        <p className="consoleSuccessBody">
          Juego instalado correctamente
        </p>
        <div className="consoleSuccessButtons">
          <button
            ref={dismissRef}
            className="consoleChip active"
            onClick={onDismiss}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
