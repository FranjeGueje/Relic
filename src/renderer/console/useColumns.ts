import { useLayoutEffect, useState, type RefObject } from 'react'

/** How many cards fit in a row: the grid itself knows, through its computed columns */
export function useColumns(
  grid: RefObject<HTMLElement | null>,
  watch: number
): number {
  const [columns, setColumns] = useState(1)
  useLayoutEffect(() => {
    const measure = () => {
      const element = grid.current
      if (!element) return
      const template = getComputedStyle(element).gridTemplateColumns
      setColumns(Math.max(1, template.split(' ').filter(Boolean).length))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [grid, watch])
  return columns
}
