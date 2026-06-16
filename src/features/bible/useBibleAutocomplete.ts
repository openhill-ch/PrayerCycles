import { useState, useCallback, useEffect, useRef } from 'react'
import { parseAtCursor, type ParseState } from './reference-parser'
import { getVerse, getVerseRange, isBibleLoaded, preloadBible } from './verse-lookup'
import { matchBooks, type BookEntry } from './book-lookup'
import { isDevMode } from '../../lib/devmode'

export type Suggestion = {
  ghostText: string
  verseText: string
  reference: string
  startPos: number
  refLength: number
  kind: 'book-complete' | 'verse'
}

export type BookMatch = {
  book: BookEntry
  suffix: string
}

export function useBibleAutocomplete(
  value: string,
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [bookMatches, setBookMatches] = useState<BookMatch[]>([])
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0)
  const [parseState, setParseState] = useState<ParseState>({ stage: 'none' })
  const lastCursorPos = useRef(0)

  useEffect(() => {
    preloadBible()
  }, [])

  const updateSuggestion = useCallback(() => {
    const el = textareaRef.current
    if (!el) {
      setSuggestion(null)
      setBookMatches([])
      setParseState({ stage: 'none' })
      return
    }

    const cursorPos = el.selectionStart
    lastCursorPos.current = cursorPos

    const state = parseAtCursor(value, cursorPos)
    setParseState(state)

    // Book name completion with multiple matches
    if (state.stage === 'book') {
      const { bookText, startPos } = state
      const matches = matchBooks(bookText)

      if (matches.length > 0) {
        // Strip an optional "1 "/"2 "/"3 " prefix from both sides so
        // "Tim" completes against "Timothy" inside "1 Timothy".
        const typedCore = bookText.toLowerCase().replace(/^[1-3]\s*/, '').replace(/\s+/g, '')
        const matchList: BookMatch[] = matches.map((b) => {
          const nameCore = b.name.replace(/^[1-3]\s+/, '')
          const coreLower = nameCore.toLowerCase()
          let suffix = ''
          if (typedCore && coreLower.startsWith(typedCore) && typedCore.length < coreLower.length) {
            suffix = nameCore.slice(typedCore.length)
          }
          return { book: b, suffix }
        }).filter((m) => m.suffix)

        if (matchList.length > 0) {
          setBookMatches(matchList)
          setSelectedMatchIndex(0)

          // Ghost text shows the first match's suffix
          const first = matchList[0]
          setSuggestion({
            ghostText: first.suffix,
            verseText: '',
            reference: first.book.name,
            startPos,
            refLength: cursorPos - startPos,
            kind: 'book-complete',
          })
          return
        }
      }
    }

    setBookMatches([])

    // Verse completion
    if (state.stage === 'complete' && isBibleLoaded()) {
      const { book, chapter, verse, endVerse, startPos } = state
      let verseText: string | undefined
      let reference: string

      if (endVerse !== undefined) {
        verseText = getVerseRange(book.name, chapter, verse, endVerse)
        reference = `${book.name} ${chapter}:${verse}-${endVerse}`
      } else {
        verseText = getVerse(book.name, chapter, verse)
        reference = `${book.name} ${chapter}:${verse}`
      }

      if (verseText) {
        const refLength = cursorPos - startPos
        const ghostPreview = verseText.length > 60
          ? ` "${verseText.slice(0, 57)}..."`
          : ` "${verseText}"`

        setSuggestion({
          ghostText: ghostPreview,
          verseText,
          reference,
          startPos,
          refLength,
          kind: 'verse',
        })
        return
      }
    }

    setSuggestion(null)
  }, [value, textareaRef])

  const selectMatch = useCallback((index: number) => {
    if (index < 0 || index >= bookMatches.length) return
    setSelectedMatchIndex(index)
    const match = bookMatches[index]
    const state = parseState
    if (state.stage !== 'book') return
    const cursorPos = lastCursorPos.current
    setSuggestion({
      ghostText: match.suffix,
      verseText: '',
      reference: match.book.name,
      startPos: state.startPos,
      refLength: cursorPos - state.startPos,
      kind: 'book-complete',
    })
  }, [bookMatches, parseState])

  const acceptSuggestion = useCallback((): boolean => {
    if (!suggestion) return false

    const el = textareaRef.current
    if (!el) return false

    const { startPos, refLength, kind } = suggestion
    const refEnd = startPos + refLength

    if (kind === 'book-complete') {
      const insertion = suggestion.reference + ' '
      const newValue = value.slice(0, startPos) + insertion + value.slice(refEnd)
      setSuggestion(null)
      setBookMatches([])
      setParseState({ stage: 'none' })
      const event = new CustomEvent('bible-autocomplete', {
        detail: { newValue, cursorPos: startPos + insertion.length },
      })
      el.dispatchEvent(event)
      return true
    }

    // Verse completion
    const state = parseState
    if (state.stage !== 'complete') return false

    const { book, chapter, verse, endVerse } = state
    const canonicalRef = endVerse !== undefined
      ? `${book.name} ${chapter}:${verse}-${endVerse}`
      : `${book.name} ${chapter}:${verse}`

    const devPullIn = isDevMode()
    let insertion: string

    if (devPullIn) {
      insertion = `${canonicalRef} ${suggestion.verseText}`
    } else {
      insertion = `[[${canonicalRef}]]`
    }

    const newValue = value.slice(0, startPos) + insertion + value.slice(refEnd)
    setSuggestion(null)
    setBookMatches([])
    setParseState({ stage: 'none' })

    const event = new CustomEvent('bible-autocomplete', {
      detail: { newValue, cursorPos: startPos + insertion.length },
    })
    el.dispatchEvent(event)
    return true
  }, [suggestion, parseState, value, textareaRef])

  const dismissSuggestion = useCallback(() => {
    setSuggestion(null)
    setBookMatches([])
    setParseState({ stage: 'none' })
  }, [])

  return {
    suggestion,
    bookMatches,
    selectedMatchIndex,
    parseState,
    updateSuggestion,
    acceptSuggestion,
    dismissSuggestion,
    selectMatch,
  }
}
