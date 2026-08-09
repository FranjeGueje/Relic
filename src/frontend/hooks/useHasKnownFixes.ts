import { useEffect, useState } from 'react'
import { KnowFixesInfo, Runner } from 'common/types'

export const useHasKnownFixes = (appName: string, runner: Runner) => {
  const [knownFixes, setKnownFixes] = useState<KnowFixesInfo | null>(null)

  useEffect(() => {
    void window.api
      .getKnownFixes(appName, runner)
      .then((info: KnowFixesInfo | null) => {
        console.log({ info })
        setKnownFixes(info)
      })
  }, [appName])

  return knownFixes
}
