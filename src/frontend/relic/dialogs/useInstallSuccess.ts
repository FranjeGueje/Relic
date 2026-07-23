import { useCallback, useEffect, useRef, useState } from 'react'

type InstallSuccessState = {
  show: boolean
  gameTitle: string
  steamAppId: number
}

const EMPTY_STATE: InstallSuccessState = {
  show: false,
  gameTitle: '',
  steamAppId: 0
}

const AUTO_DISMISS_MS = 4000

export function useInstallSuccess() {
  const [state, setState] = useState<InstallSuccessState>(EMPTY_STATE)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setState(EMPTY_STATE)
  }, [])

  useEffect(() => {
    const removeListener = window.api.handleInstallCompleted(
      (_e, args) => {
        if (timerRef.current) clearTimeout(timerRef.current)
        setState({ show: true, gameTitle: args.gameTitle, steamAppId: args.steamAppId })
        timerRef.current = setTimeout(() => {
          setState(EMPTY_STATE)
          timerRef.current = null
        }, AUTO_DISMISS_MS)
      }
    )
    return () => {
      removeListener()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { ...state, dismiss }
}
