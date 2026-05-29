import { useCallback } from 'react'
import { List, Strikethrough } from 'lucide-react'

type DescriptionToolbarProps = {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (value: string) => void
  maxLength?: number
}

export function useDescriptionKeyDown(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  onChange: (value: string) => void,
  maxLength?: number,
) {
  return useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const el = textareaRef.current
      if (!el) return

      const start = el.selectionStart
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const lineText = value.slice(lineStart, start)

      if (e.key === 'Enter') {
        // If current line is a bullet line, auto-continue bullet on next line
        if (/^[•\-]\s/.test(lineText)) {
          // If bullet line is empty (just "• "), remove the bullet instead
          if (lineText.trim() === '•' || lineText.trim() === '-') {
            e.preventDefault()
            const newVal = value.slice(0, lineStart) + value.slice(start)
            const clipped = maxLength ? newVal.slice(0, maxLength) : newVal
            onChange(clipped)
            setTimeout(() => {
              el.selectionStart = el.selectionEnd = lineStart
              el.focus()
            }, 0)
            return
          }
          e.preventDefault()
          const insert = '\n• '
          const newVal = value.slice(0, start) + insert + value.slice(start)
          const clipped = maxLength ? newVal.slice(0, maxLength) : newVal
          onChange(clipped)
          setTimeout(() => {
            el.selectionStart = el.selectionEnd = start + insert.length
            el.focus()
          }, 0)
          return
        }
      }

      if (e.key === 'Backspace') {
        // If cursor is right after "• " at the start of a line, remove the bullet prefix
        if (lineText === '• ' || lineText === '- ') {
          e.preventDefault()
          const newVal = value.slice(0, lineStart) + value.slice(lineStart + 2)
          const clipped = maxLength ? newVal.slice(0, maxLength) : newVal
          onChange(clipped)
          setTimeout(() => {
            el.selectionStart = el.selectionEnd = lineStart
            el.focus()
          }, 0)
          return
        }
      }
    },
    [textareaRef, value, onChange, maxLength],
  )
}

export function DescriptionToolbar({ textareaRef, value, onChange, maxLength }: DescriptionToolbarProps) {
  function insertBullet() {
    const el = textareaRef.current
    if (!el) return

    const start = el.selectionStart
    const end = el.selectionEnd

    // Find the start of the current line
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const lineText = value.slice(lineStart, end)

    // If line already starts with bullet, remove it
    if (/^[•\-]\s/.test(lineText)) {
      const newVal = value.slice(0, lineStart) + lineText.slice(2) + value.slice(end)
      const clipped = maxLength ? newVal.slice(0, maxLength) : newVal
      onChange(clipped)
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start - 2
        el.focus()
      }, 0)
    } else {
      const insert = '• '
      const newVal = value.slice(0, lineStart) + insert + value.slice(lineStart)
      const clipped = maxLength ? newVal.slice(0, maxLength) : newVal
      onChange(clipped)
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + insert.length
        el.focus()
      }, 0)
    }
  }

  function toggleStrikethrough() {
    const el = textareaRef.current
    if (!el) return

    const start = el.selectionStart
    const end = el.selectionEnd

    if (start === end) {
      // No selection — insert ~~ markers and place cursor between
      const insert = '~~~~'
      const newVal = value.slice(0, start) + insert + value.slice(end)
      const clipped = maxLength ? newVal.slice(0, maxLength) : newVal
      onChange(clipped)
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + 2
        el.focus()
      }, 0)
      return
    }

    const selected = value.slice(start, end)

    // If already wrapped in ~~, unwrap
    if (selected.startsWith('~~') && selected.endsWith('~~') && selected.length > 4) {
      const unwrapped = selected.slice(2, -2)
      const newVal = value.slice(0, start) + unwrapped + value.slice(end)
      const clipped = maxLength ? newVal.slice(0, maxLength) : newVal
      onChange(clipped)
      setTimeout(() => {
        el.selectionStart = start
        el.selectionEnd = start + unwrapped.length
        el.focus()
      }, 0)
    } else {
      const wrapped = `~~${selected}~~`
      const newVal = value.slice(0, start) + wrapped + value.slice(end)
      const clipped = maxLength ? newVal.slice(0, maxLength) : newVal
      onChange(clipped)
      setTimeout(() => {
        el.selectionStart = start
        el.selectionEnd = start + wrapped.length
        el.focus()
      }, 0)
    }
  }

  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={insertBullet}
        className="rounded p-1 text-text-muted hover:text-text-secondary hover:bg-input transition-colors"
        title="Bullet point"
      >
        <List size={16} />
      </button>
      <button
        type="button"
        onClick={toggleStrikethrough}
        className="rounded p-1 text-text-muted hover:text-text-secondary hover:bg-input transition-colors"
        title="Strikethrough"
      >
        <Strikethrough size={16} />
      </button>
    </div>
  )
}
