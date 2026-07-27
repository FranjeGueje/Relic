import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import { useTranslation } from 'react-i18next'

interface GameChangeLogProps {
  title: string
  changelog: string
  backdropClick: () => void
}

const safeTags = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'ul',
  'ol',
  'li',
  'b',
  'i',
  'strong',
  'em',
  'a',
  'img',
  'table',
  'tr',
  'td',
  'th',
  'thead',
  'tbody',
  'caption',
  'col',
  'colgroup',
  'div',
  'span',
  'pre',
  'code',
  'blockquote',
  'hr',
  'dl',
  'dt',
  'dd',
  'sub',
  'sup',
  'u',
  's',
  'del',
  'ins',
  'mark',
  'small',
  'cite',
  'q',
  'dfn',
  'abbr',
  'time',
  'var',
  'samp',
  'kbd'
])

function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(
    `<body>${html}</body>`,
    'text/html'
  )
  const cleanNode = (node: Element): void => {
    for (const child of Array.from(node.children)) {
      if (!safeTags.has(child.tagName.toLowerCase())) {
        while (child.firstChild) node.insertBefore(child.firstChild, child)
        node.removeChild(child)
      } else {
        for (const attr of Array.from(child.attributes)) {
          if (
            attr.name.startsWith('on') ||
            attr.value.startsWith('javascript:')
          )
            child.removeAttribute(attr.name)
        }
        cleanNode(child)
      }
    }
  }
  cleanNode(doc.body)
  return doc.body.innerHTML
}

export default function GameChangeLog({
  title,
  changelog,
  backdropClick
}: GameChangeLogProps) {
  const { t } = useTranslation('gamepage')
  const santiziedChangeLog = useMemo(() => {
    return { __html: sanitizeHtml(changelog) }
  }, [changelog])

  return (
    <Dialog showCloseButton onClose={backdropClick}>
      <DialogHeader onClose={backdropClick}>
        {t('game.changelogFor', 'Changelog for {{gameTitle}}', {
          gameTitle: title
        })}
      </DialogHeader>
      <DialogContent className="changelogModalContent">
        <div
          dangerouslySetInnerHTML={santiziedChangeLog}
          className={'gameChangeLog'}
        />
      </DialogContent>
    </Dialog>
  )
}
