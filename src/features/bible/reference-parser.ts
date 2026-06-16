/**
 * Parses Bible reference patterns from text input.
 *
 * Recognized patterns (case-insensitive):
 *   "Gen 1:1"       → Genesis 1:1
 *   "1 Tim 2:1"     → 1 Timothy 2:1
 *   "1Tm 2:1-3"     → 1 Timothy 2:1-3
 *   "Psalms 119:105" → Psalms 119:105
 *
 * The parser is designed for real-time typing detection:
 *   - "Gen"         → book matched, waiting for chapter
 *   - "Gen 1"       → chapter started, may be multi-digit
 *   - "Gen 1:"      → colon commits chapter, waiting for verse
 *   - "Gen 1:1"     → complete reference (single verse)
 *   - "Gen 1:1-"    → dash triggers range mode
 *   - "Gen 1:1-3"   → complete range reference
 */

import { resolveBook, matchBooks, type BookEntry } from './book-lookup'

export type ParseState =
  | { stage: 'none' }
  | { stage: 'book'; book: BookEntry; bookText: string; startPos: number }
  | { stage: 'chapter'; book: BookEntry; bookText: string; chapterText: string; startPos: number }
  | { stage: 'verse'; book: BookEntry; bookText: string; chapter: number; verseText: string; startPos: number }
  | { stage: 'range'; book: BookEntry; bookText: string; chapter: number; startVerse: number; endVerseText: string; startPos: number }
  | { stage: 'complete'; book: BookEntry; bookText: string; chapter: number; verse: number; endVerse?: number; startPos: number }

/**
 * Extract the current "word group" being typed at the cursor position.
 * A Bible reference can span multiple words: "1 Tim 2:1-3"
 * We scan backward from cursor to find the start of a potential reference.
 */
function extractRefAtCursor(text: string, cursorPos: number): { refText: string; startPos: number } | null {
  if (cursorPos <= 0) return null

  // Get text up to cursor
  const before = text.slice(0, cursorPos)

  // Find the start of the current line (don't cross line boundaries)
  const lineStart = before.lastIndexOf('\n') + 1
  const lineText = before.slice(lineStart)

  // Match a Bible reference pattern at the END of the line text.
  // Pattern: optional number prefix + book name + optional chapter:verse
  // We match greedily from right to left.
  const match = lineText.match(
    /(?:^|[\s(])([1-3]?\s*[A-Za-z]{2,}(?:\s+of\s+[A-Za-z]+)?\s*\d*:?\d*-?\d*)$/,
  )

  if (!match) return null

  const refText = match[1].trim()
  const startPos = lineStart + (match.index ?? 0) + match[0].length - match[1].length

  return { refText, startPos }
}

/**
 * Parse a reference string into its current state.
 */
function parseRefString(refText: string): ParseState & { startPos: number } {
  const startPos = 0 // caller will adjust

  // Try to split into book part and number part
  // Pattern: book name (may include leading number and spaces), then numbers
  const m = refText.match(/^([1-3]?\s*[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s*(.*)$/)
  if (!m) return { stage: 'none', startPos }

  const bookText = m[1].trim()
  const rest = m[2].trim()

  let book = resolveBook(bookText)

  // Partial book name ("Tim", "Gene") — no chapter typed yet, so we can
  // still offer completions even without an exact alias match.
  if (!book && !rest) {
    const partial = matchBooks(bookText)
    if (partial.length > 0) book = partial[0]
  }

  if (!book) return { stage: 'none', startPos }

  // No numbers yet — just the book name
  if (!rest) {
    return { stage: 'book', book, bookText, startPos }
  }

  // Check for chapter:verse pattern
  const cvMatch = rest.match(/^(\d+)(:(\d+)(-(\d+)?)?)?$/)
  if (!cvMatch) return { stage: 'none', startPos }

  const chapterText = cvMatch[1]
  const hasColon = rest.includes(':')
  const verseText = cvMatch[3] ?? ''
  const hasDash = rest.includes('-')
  const endVerseText = cvMatch[5] ?? ''

  if (!hasColon) {
    // Still typing chapter number
    return { stage: 'chapter', book, bookText, chapterText, startPos }
  }

  const chapter = parseInt(chapterText, 10)

  if (!verseText) {
    // Colon typed but no verse yet
    return { stage: 'verse', book, bookText, chapter, verseText: '', startPos }
  }

  if (!hasDash) {
    // Have a verse, no dash — this is a completable single-verse reference
    const verse = parseInt(verseText, 10)
    return { stage: 'complete', book, bookText, chapter, verse, startPos }
  }

  // Has dash — range mode
  const startVerse = parseInt(verseText, 10)

  if (!endVerseText) {
    // Dash typed but no end verse yet
    return { stage: 'range', book, bookText, chapter, startVerse, endVerseText: '', startPos }
  }

  // Full range
  const endVerse = parseInt(endVerseText, 10)
  return { stage: 'complete', book, bookText, chapter, verse: startVerse, endVerse, startPos }
}

/**
 * Analyze the text at the cursor position and return the current parse state.
 */
export function parseAtCursor(text: string, cursorPos: number): ParseState {
  const extracted = extractRefAtCursor(text, cursorPos)
  if (!extracted) return { stage: 'none' }

  const result = parseRefString(extracted.refText)
  if (result.stage === 'none') return { stage: 'none' }

  // Adjust startPos to be relative to the full text
  return { ...result, startPos: extracted.startPos }
}
