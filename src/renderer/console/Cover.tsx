import { createContext, useContext, useEffect, useRef, useState } from 'react'

/**
 * The element that scrolls the grid. A cover starts loading when it gets near the
 * part of it that shows. The browser's own `loading="lazy"` was left out: after the
 * list changed under a programmatic scroll (switching store) some covers stayed
 * blank until the cursor reached them.
 */
export const ScrollRoot = createContext<HTMLElement | null>(null)

/** How far outside the visible area a cover is already loaded */
const MARGIN = '1500px 0px'

/** True once the element has been near the visible area of `root` (it stays true) */
function useNear(
  element: React.RefObject<HTMLElement | null>,
  root: HTMLElement | null,
  eager: boolean
): boolean {
  const [near, setNear] = useState(
    eager || typeof IntersectionObserver === 'undefined'
  )
  useEffect(() => {
    const target = element.current
    if (near || !target || !root) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { root, rootMargin: MARGIN }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [element, near, root])
  return near
}

/**
 * The first of the pictures that loads; if none does, the title in its place.
 * `eager` loads it at once (for a cover that is not inside the scrolling grid).
 */
export function Cover({
  sources,
  title,
  eager = false
}: {
  sources: string[]
  title: string
  eager?: boolean
}) {
  const box = useRef<HTMLSpanElement>(null)
  const near = useNear(box, useContext(ScrollRoot), eager)
  const [failed, setFailed] = useState(0)
  const source = sources[failed]

  return (
    <span className="coverBox" ref={box}>
      {near && !source && <span className="noImage">{title}</span>}
      {near && source && (
        <img
          src={source}
          alt=""
          onError={() => setFailed((count) => count + 1)}
        />
      )}
    </span>
  )
}
