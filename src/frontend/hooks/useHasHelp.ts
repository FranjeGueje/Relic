import ContextProvider from 'frontend/state/ContextProvider'
import { useEffect, useContext } from 'react'

export const useHasHelp = (
  helpItemId: string,
  title: string,
  content: JSX.Element
) => {
  const { help } = useContext(ContextProvider)

  useEffect(() => {
    help.addHelpItem(helpItemId, {
      title,
      content
    })

    return () => {
      help.removeHelpItem(helpItemId)
    }
    // intentionally mount/unmount-only: `content` is a JSX element, a new
    // reference every render, which would otherwise churn the help item
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
