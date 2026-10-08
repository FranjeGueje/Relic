import type { Translate } from '../i18n'
import { hintKeys, type ControllerLayout } from '../input/controller'

/** The keys or buttons that work on the grid, in the words of the pad that is connected */
export function Hints({
  layout,
  t
}: {
  layout: ControllerLayout | null
  t: Translate
}) {
  const keys = hintKeys(layout)
  const hints: [string, string][] = [
    [keys.move, t('hint.move')],
    [keys.select, t('hint.select')],
    [keys.stores, t('hint.stores')],
    [keys.installed, t('hint.installed')],
    [keys.downloads, t('hint.downloads')],
    [keys.sort, t('hint.sort')],
    [keys.refresh, t('hint.refresh')],
    [keys.menu, t('hint.menu')],
    [keys.quit, t('hint.quit')]
  ]
  return (
    <footer className="hints">
      {hints.map(([key, text]) => (
        <span className="hint" key={text}>
          <kbd>{key}</kbd> {text}
        </span>
      ))}
    </footer>
  )
}
