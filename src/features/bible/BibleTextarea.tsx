import { useEffect, useRef, useLayoutEffect, useState } from 'react'
import { useBibleAutocomplete, type BookMatch } from './useBibleAutocomplete'
import { BibleGhostText } from './BibleGhostText'

type BibleTextareaProps = {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (value: string) => void
  maxLength?: number
}

export function BibleAutocompleteOverlay({
  textareaRef,
  value,
  onChange,
  maxLength,
}: BibleTextareaProps) {
  const {
    suggestion,
    bookMatches,
    selectedMatchIndex,
    updateSuggestion,
    acceptSuggestion,
    dismissSuggestion,
    selectMatch,
  } = useBibleAutocomplete(value, textareaRef)

  useEffect(() => {
    updateSuggestion()
  }, [value, updateSuggestion])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return

    const handleSelect = () => updateSuggestion()
    el.addEventListener('select', handleSelect)
    el.addEventListener('click', handleSelect)

    return () => {
      el.removeEventListener('select', handleSelect)
      el.removeEventListener('click', handleSelect)
    }
  }, [textareaRef, updateSuggestion])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return

    const handleAccept = (e: Event) => {
      const detail = (e as CustomEvent).detail
      const newValue = maxLength ? detail.newValue.slice(0, maxLength) : detail.newValue
      onChange(newValue)
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = Math.min(detail.cursorPos, newValue.length)
        el.focus()
      }, 0)
    }

    el.addEventListener('bible-autocomplete', handleAccept)
    return () => el.removeEventListener('bible-autocomplete', handleAccept)
  }, [textareaRef, onChange, maxLength])

  // Keyboard: Tab/Enter to accept, Escape to dismiss, Up/Down to navigate matches
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!suggestion) return

      if (e.key === 'ArrowDown' && bookMatches.length > 1) {
        e.preventDefault()
        const next = (selectedMatchIndex + 1) % bookMatches.length
        selectMatch(next)
      } else if (e.key === 'ArrowUp' && bookMatches.length > 1) {
        e.preventDefault()
        const prev = (selectedMatchIndex - 1 + bookMatches.length) % bookMatches.length
        selectMatch(prev)
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault()
        acceptSuggestion()
      } else if (e.key === 'Escape') {
        dismissSuggestion()
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [textareaRef, suggestion, bookMatches, selectedMatchIndex, acceptSuggestion, dismissSuggestion, selectMatch])

  if (!suggestion) return null

  return (
    <>
      <BibleGhostText
        textareaRef={textareaRef}
        ghostText={suggestion.ghostText}
        value={value}
        onAccept={acceptSuggestion}
      />

      {bookMatches.length > 1 && (
        <BookMatchDropdown
          textareaRef={textareaRef}
          matches={bookMatches}
          selectedIndex={selectedMatchIndex}
          onSelect={(i) => {
            const match = bookMatches[i]
            if (!match || !suggestion) return
            const el = textareaRef.current
            if (!el) return
            const insertion = match.book.name + ' '
            const newValue = value.slice(0, suggestion.startPos) + insertion + value.slice(suggestion.startPos + suggestion.refLength)
            const detail = { newValue, cursorPos: suggestion.startPos + insertion.length }
            dismissSuggestion()
            onChange(detail.newValue.slice(0, maxLength ?? Infinity))
            setTimeout(() => {
              el.selectionStart = el.selectionEnd = Math.min(detail.cursorPos, detail.newValue.length)
              el.focus()
            }, 0)
          }}
          value={value}
        />
      )}
    </>
  )
}

function BookMatchDropdown({
  textareaRef,
  matches,
  selectedIndex,
  onSelect,
  value,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  matches: BookMatch[]
  selectedIndex: number
  onSelect: (index: number) => void
  value: string
}) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const mirrorRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = textareaRef.current
    const mirror = mirrorRef.current
    if (!el || !mirror) return

    const style = window.getComputedStyle(el)
    const props = [
      'fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'wordWrap', 'whiteSpace', 'wordBreak', 'overflowWrap', 'textIndent',
    ] as const

    for (const prop of props) {
      mirror.style[prop as any] = style[prop as any]
    }
    // Overlay the mirror exactly on the textarea so marker coordinates
    // map 1:1 into the shared relative wrapper.
    mirror.style.width = `${el.offsetWidth}px`
    mirror.style.position = 'absolute'
    mirror.style.top = '0'
    mirror.style.left = '0'
    mirror.style.visibility = 'hidden'
    mirror.style.pointerEvents = 'none'
    mirror.style.whiteSpace = 'pre-wrap'
    mirror.style.wordWrap = 'break-word'

    const cursorPos = el.selectionStart
    const textBefore = value.slice(0, cursorPos)

    mirror.innerHTML = ''
    mirror.appendChild(document.createTextNode(textBefore))
    const marker = document.createElement('span')
    marker.textContent = '​'
    mirror.appendChild(marker)

    const mirrorRect = mirror.getBoundingClientRect()
    const markerRect = marker.getBoundingClientRect()

    const lineHeight = parseInt(style.lineHeight) || 20
    const top = markerRect.top - mirrorRect.top - el.scrollTop + lineHeight + 4
    const left = markerRect.left - mirrorRect.left

    setPos({ top, left })
  }, [value, textareaRef, matches])

  // Scroll selected item into view
  useEffect(() => {
    const dropdown = dropdownRef.current
    if (!dropdown) return
    const selected = dropdown.children[selectedIndex] as HTMLElement | undefined
    selected?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Mirror must always render — it performs the position measurement.
  return (
    <>
      <div ref={mirrorRef} aria-hidden="true" style={{ position: 'absolute', visibility: 'hidden', top: 0, left: 0 }} />
      {pos && (
      <div
        ref={dropdownRef}
        className="absolute z-20 rounded-lg bg-card border border-border shadow-lg overflow-y-auto max-h-36 min-w-[140px]"
        style={{ top: pos.top, left: Math.max(0, Math.min(pos.left, 200)) }}
      >
        {matches.map((match, i) => (
          <button
            key={match.book.name}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              onSelect(i)
            }}
            className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
              i === selectedIndex
                ? 'bg-accent/15 text-accent-text'
                : 'text-text-secondary hover:bg-input'
            }`}
          >
            {match.book.name}
          </button>
        ))}
      </div>
      )}
    </>
  )
}
