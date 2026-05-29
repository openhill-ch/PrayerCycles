import type { ReactNode } from 'react'

/**
 * Renders plain text with lightweight formatting:
 * - Lines starting with "• " or "- " render as bullet points
 * - Text wrapped in ~~text~~ renders as strikethrough
 */
export function FormattedText({ text, className = '' }: { text: string; className?: string }) {
  const lines = text.split('\n')

  return (
    <div className={className}>
      {lines.map((line, i) => {
        const isBullet = /^[•\-]\s/.test(line)
        const content = isBullet ? line.slice(2) : line

        const formatted = renderStrikethrough(content)

        if (isBullet) {
          return (
            <div key={i} className="flex gap-1.5 items-start">
              <span className="shrink-0 leading-snug">•</span>
              <span className="leading-snug">{formatted}</span>
            </div>
          )
        }

        return (
          <div key={i} className="leading-snug">
            {line === '' ? <br /> : formatted}
          </div>
        )
      })}
    </div>
  )
}

function renderStrikethrough(text: string): ReactNode {
  const parts = text.split(/(~~.+?~~)/g)
  if (parts.length === 1) return text

  return parts.map((part, i) => {
    if (part.startsWith('~~') && part.endsWith('~~')) {
      return (
        <span key={i} className="line-through opacity-60">
          {part.slice(2, -2)}
        </span>
      )
    }
    return part
  })
}
