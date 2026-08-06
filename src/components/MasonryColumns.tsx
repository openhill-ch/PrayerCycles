import { Children, useEffect, useMemo, useState, type ReactNode } from 'react'

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

/**
 * Masonry-ish layout using real flex columns.
 *
 * CSS multi-column looks equivalent, but WebKit pushes the top of later
 * columns down when `break-inside: avoid` is in play, so the first card in
 * column two never lined up with column one. Distributing the children
 * ourselves keeps every column starting at the same y.
 */
export function MasonryColumns({ children }: { children: ReactNode }) {
  const count = useColumnCount()

  const columns = useMemo(() => {
    const items = Children.toArray(children)
    const buckets: ReactNode[][] = Array.from({ length: count }, () => [])
    items.forEach((child, i) => buckets[i % count].push(child))
    return buckets
  }, [children, count])

  return (
    <div className="flex items-start gap-3">
      {columns.map((column, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-3">
          {column}
        </div>
      ))}
    </div>
  )
}
