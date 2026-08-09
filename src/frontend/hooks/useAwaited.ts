import { useEffect, useState } from 'react'

export function useAwaited<T>(getter: () => Promise<T>): T | null
export function useAwaited<T>(getter: () => Promise<T>, defaultValue: T): T
export function useAwaited<T>(
  getter: () => Promise<T>,
  defaultValue: T | null = null
): T | null {
  const [value, setValue] = useState<T | null>(defaultValue)

  useEffect(() => {
    // This is `setValue` as long as the component requesting the value is mounted
    let setValueIfMounted = setValue
    void getter().then(setValueIfMounted)
    return () => {
      // TODO: Send signal to BE to abort the promise
      setValueIfMounted = () => {
        // We want to do nothing with the value here, since the component
        // requesting it no longer exists
      }
    }
    // intentionally mount-only: callers may pass a new `getter` closure every
    // render, and this hook is meant to fetch once, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return value
}
