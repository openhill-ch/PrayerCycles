import {
  Children,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/** Mirrors the columns-2/3/4/5 breakpoints, but as a value we can use in JS. */
export function useColumnCount(): number {
  const [count, setCount] = useState(2)
  useEffect(() => {
    const steps: [MediaQueryList, number][] = [
      [window.matchMedia('(min-width: 1024px)'), 5],
      [window.matchMedia('(min-width: 768px)'), 4],
      [window.matchMedia('(min-width: 640px)'), 3],
    ]
    const update = () => setCount(steps.find(([mq]) => mq.matches)?.[1] ?? 2)
    update()
    steps.forEach(([mq]) => mq.addEventListener('change', update))
    return () => steps.forEach(([mq]) => mq.removeEventListener('change', update))
  }, [])
  return count
}

/** Height assumed for a card we haven't measured yet. */
const ASSUMED_HEIGHT = 160

/**
 * Masonry layout using real flex columns.
 *
 * CSS multi-column looks equivalent, but WebKit pushes the top of later
 * columns down when `break-inside: avoid` is in play, so the first card in
 * column two never lined up with column one.
 *
 * Cards are placed into whichever column is currently shortest (measured, not
 * round-robin), so one tall card can't leave a column running several cards
 * past its neighbour.
 */
export function MasonryColumns({ children }: { children: ReactNode }) {
  const count = useColumnCount()
  const items = useMemo(() => Children.toArray(children), [children])

  const nodes = useRef(new Map<string, HTMLElement>())
  const [heights, setHeights] = useState<Record<string, number>>({})

  const keyFor = (child: ReactNode, i: number) =>
    isValidElement(child) && child.key != null ? String(child.key) : `idx-${i}`

  // Measure after layout and keep the map current; heights are stable once
  // measured (columns are equal width), so this settles in a pass or two.
  useLayoutEffect(() => {
    let changed = false
    const next: Record<string, number> = {}
    nodes.current.forEach((el, key) => {
      const h = el.offsetHeight
      next[key] = h
      if (Math.abs((heights[key] ?? 0) - h) > 1) changed = true
    })
    if (changed || Object.keys(next).length !== Object.keys(heights).length) {
      setHeights(next)
    }
  })

  const columns = useMemo(() => {
    const buckets: { key: string; child: ReactNode }[][] = Array.from({ length: count }, () => [])
    const totals = new Array<number>(count).fill(0)

    items.forEach((child, i) => {
      const key = keyFor(child, i)
      // Shortest column wins; ties fall to the leftmost, which keeps the
      // original order intact before anything has been measured.
      let target = 0
      for (let c = 1; c < count; c++) {
        if (totals[c] < totals[target]) target = c
      }
      buckets[target].push({ key, child })
      totals[target] += heights[key] ?? ASSUMED_HEIGHT
    })
    return buckets
  }, [items, count, heights])

  return (
    <div className="flex items-start gap-3">
      {columns.map((column, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-3">
          {column.map(({ key, child }) => (
            <div
              key={key}
              ref={(el) => {
                if (el) nodes.current.set(key, el)
                else nodes.current.delete(key)
              }}
            >
              {child}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
