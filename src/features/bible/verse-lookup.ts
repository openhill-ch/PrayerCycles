/**
 * Lazy-loads KJV Bible data and provides verse lookup.
 * The ~4MB JSON is fetched on first use and cached in memory.
 */

type BibleData = Record<string, Record<string, Record<string, string>>>

let _bible: BibleData | null = null
let _loading: Promise<BibleData> | null = null

async function loadBible(): Promise<BibleData> {
  if (_bible) return _bible
  if (_loading) return _loading
  _loading = fetch('/data/kjv.json')
    .then((res) => res.json())
    .then((data: BibleData) => {
      _bible = data
      return data
    })
  return _loading
}

/** Preload the Bible data (call early so it's ready when needed) */
export function preloadBible(): void {
  loadBible()
}

/** Check if Bible data is loaded and ready for synchronous access */
export function isBibleLoaded(): boolean {
  return _bible !== null
}

/**
 * Get a single verse synchronously (returns undefined if data not loaded yet).
 */
export function getVerse(bookName: string, chapter: number, verse: number): string | undefined {
  if (!_bible) return undefined
  return _bible[bookName]?.[String(chapter)]?.[String(verse)]
}

/**
 * Get a range of verses synchronously.
 * Supports same-chapter ranges: (book, 2, 1, 2, 3) → verses 1-3 of chapter 2
 */
export function getVerseRange(
  bookName: string,
  chapter: number,
  startVerse: number,
  endVerse: number,
): string | undefined {
  if (!_bible) return undefined
  const ch = _bible[bookName]?.[String(chapter)]
  if (!ch) return undefined

  const parts: string[] = []
  for (let v = startVerse; v <= endVerse; v++) {
    const text = ch[String(v)]
    if (text) parts.push(text)
  }
  return parts.length > 0 ? parts.join(' ') : undefined
}

/**
 * Get the number of verses in a chapter (for validation).
 */
export function getVerseCount(bookName: string, chapter: number): number {
  if (!_bible) return 0
  const ch = _bible[bookName]?.[String(chapter)]
  if (!ch) return 0
  return Object.keys(ch).length
}

/**
 * Get the number of chapters in a book (for validation).
 */
export function getChapterCount(bookName: string): number {
  if (!_bible) return 0
  const book = _bible[bookName]
  if (!book) return 0
  return Object.keys(book).length
}
