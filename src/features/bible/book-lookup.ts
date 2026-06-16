/**
 * Bible book name lookup with three abbreviation tiers:
 * - Full name: "Genesis", "1 Timothy"
 * - Standard abbreviation: "Gen", "1 Tim"
 * - Minimal abbreviation: "Gn", "1 Tm"
 *
 * All lookups are case-insensitive. Books with a number prefix
 * must include the number: "1Tm", "1 Tm", "1 Timothy"
 */

export type BookEntry = {
  /** Canonical display name */
  name: string
  /** Total number of chapters */
  chapters: number
}

// [canonical name, standard abbrev, minimal abbrev, chapter count]
const BOOK_DATA: [string, string, string, number][] = [
  // Old Testament
  ['Genesis', 'Gen', 'Gn', 50],
  ['Exodus', 'Exod', 'Ex', 40],
  ['Leviticus', 'Lev', 'Lv', 27],
  ['Numbers', 'Num', 'Nm', 36],
  ['Deuteronomy', 'Deut', 'Dt', 34],
  ['Joshua', 'Josh', 'Jos', 24],
  ['Judges', 'Judg', 'Jdg', 21],
  ['Ruth', 'Ruth', 'Ru', 4],
  ['1 Samuel', '1 Sam', '1 Sm', 31],
  ['2 Samuel', '2 Sam', '2 Sm', 24],
  ['1 Kings', '1 Kgs', '1 Ki', 22],
  ['2 Kings', '2 Kgs', '2 Ki', 25],
  ['1 Chronicles', '1 Chr', '1 Ch', 29],
  ['2 Chronicles', '2 Chr', '2 Ch', 36],
  ['Ezra', 'Ezra', 'Ezr', 10],
  ['Nehemiah', 'Neh', 'Ne', 13],
  ['Esther', 'Esth', 'Est', 10],
  ['Job', 'Job', 'Jb', 42],
  ['Psalms', 'Ps', 'Ps', 150],
  ['Proverbs', 'Prov', 'Prv', 31],
  ['Ecclesiastes', 'Eccl', 'Ec', 12],
  ['Song of Solomon', 'Song', 'Sg', 8],
  ['Isaiah', 'Isa', 'Is', 66],
  ['Jeremiah', 'Jer', 'Jr', 52],
  ['Lamentations', 'Lam', 'La', 5],
  ['Ezekiel', 'Ezek', 'Ezk', 48],
  ['Daniel', 'Dan', 'Dn', 12],
  ['Hosea', 'Hos', 'Ho', 14],
  ['Joel', 'Joel', 'Jl', 3],
  ['Amos', 'Amos', 'Am', 9],
  ['Obadiah', 'Obad', 'Ob', 1],
  ['Jonah', 'Jonah', 'Jon', 4],
  ['Micah', 'Mic', 'Mi', 7],
  ['Nahum', 'Nah', 'Na', 3],
  ['Habakkuk', 'Hab', 'Hb', 3],
  ['Zephaniah', 'Zeph', 'Zp', 3],
  ['Haggai', 'Hag', 'Hg', 2],
  ['Zechariah', 'Zech', 'Zc', 14],
  ['Malachi', 'Mal', 'Ml', 4],
  // New Testament
  ['Matthew', 'Matt', 'Mt', 28],
  ['Mark', 'Mark', 'Mk', 16],
  ['Luke', 'Luke', 'Lk', 24],
  ['John', 'John', 'Jn', 21],
  ['Acts', 'Acts', 'Ac', 28],
  ['Romans', 'Rom', 'Rm', 16],
  ['1 Corinthians', '1 Cor', '1 Co', 16],
  ['2 Corinthians', '2 Cor', '2 Co', 13],
  ['Galatians', 'Gal', 'Ga', 6],
  ['Ephesians', 'Eph', 'Ep', 6],
  ['Philippians', 'Phil', 'Php', 4],
  ['Colossians', 'Col', 'Col', 4],
  ['1 Thessalonians', '1 Thess', '1 Th', 5],
  ['2 Thessalonians', '2 Thess', '2 Th', 3],
  ['1 Timothy', '1 Tim', '1 Tm', 6],
  ['2 Timothy', '2 Tim', '2 Tm', 4],
  ['Titus', 'Titus', 'Ti', 3],
  ['Philemon', 'Phlm', 'Phm', 1],
  ['Hebrews', 'Heb', 'He', 13],
  ['James', 'Jas', 'Jm', 5],
  ['1 Peter', '1 Pet', '1 Pt', 5],
  ['2 Peter', '2 Pet', '2 Pt', 3],
  ['1 John', '1 John', '1 Jn', 5],
  ['2 John', '2 John', '2 Jn', 1],
  ['3 John', '3 John', '3 Jn', 1],
  ['Jude', 'Jude', 'Jd', 1],
  ['Revelation', 'Rev', 'Rv', 22],
]

/** Map of lowercase alias → BookEntry */
const LOOKUP = new Map<string, BookEntry>()

for (const [name, std, min, chapters] of BOOK_DATA) {
  const entry: BookEntry = { name, chapters }
  // Register all three tiers (lowercase, spaces removed for numbered books)
  const variants = new Set<string>()

  // Full name: "genesis", "1 timothy", "1timothy"
  variants.add(name.toLowerCase())
  variants.add(name.toLowerCase().replace(/\s+/g, ''))

  // Standard: "gen", "1 tim", "1tim"
  variants.add(std.toLowerCase())
  variants.add(std.toLowerCase().replace(/\s+/g, ''))

  // Minimal: "gn", "1 tm", "1tm"
  variants.add(min.toLowerCase())
  variants.add(min.toLowerCase().replace(/\s+/g, ''))

  for (const v of variants) {
    LOOKUP.set(v, entry)
  }
}

/**
 * Resolve a book name/abbreviation to its canonical entry.
 * Accepts any of the three tiers, case-insensitive, with or without space after number.
 */
export function resolveBook(input: string): BookEntry | undefined {
  const key = input.trim().toLowerCase()
  return LOOKUP.get(key)
}

/**
 * Get all book aliases for autocomplete suggestion matching.
 * Returns [alias, canonicalName][] sorted by canonical order.
 */
export function getAllBookAliases(): [string, string][] {
  const seen = new Set<string>()
  const result: [string, string][] = []
  for (const [name, std, min] of BOOK_DATA) {
    // Return the most user-friendly forms
    for (const alias of [name, std, min]) {
      const key = alias.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        result.push([alias, name])
      }
    }
  }
  return result
}

/**
 * Find books matching a partial input (for suggestion dropdown).
 * Returns canonical entries in biblical order, exact alias match first.
 *
 * Matching is forgiving about number prefixes in BOTH directions:
 *   "Tim"  → 1 Timothy, 2 Timothy   (number not typed yet)
 *   "1 Ti" → 1 Timothy              (number typed, name partial)
 *   "Ti"   → Titus, 1 Timothy, 2 Timothy
 */
export function matchBooks(partial: string): BookEntry[] {
  const key = partial.trim().toLowerCase().replace(/\s+/g, '')
  if (!key) return []

  // Split typed input into optional number prefix + name part
  const numMatch = key.match(/^([1-3])?(.*)$/)
  const typedNum = numMatch?.[1] ?? ''
  const typedName = numMatch?.[2] ?? ''

  const matches: BookEntry[] = []
  const seen = new Set<string>()
  const exact = LOOKUP.get(key)
  if (exact) {
    matches.push(exact)
    seen.add(exact.name)
  }

  for (const [name, std, min, chapters] of BOOK_DATA) {
    if (seen.has(name)) continue

    const bookNumMatch = name.toLowerCase().match(/^([1-3])\s+/)
    const bookNum = bookNumMatch?.[1] ?? ''

    // If the user typed a number, it must match the book's number
    if (typedNum && typedNum !== bookNum) continue

    if (!typedName) {
      // Just a number typed ("1") — match all books with that number
      if (typedNum && bookNum === typedNum) {
        matches.push({ name, chapters })
        seen.add(name)
      }
      continue
    }

    // Compare against each alias with the number prefix stripped
    for (const alias of [name, std, min]) {
      const core = alias.toLowerCase().replace(/^[1-3]\s*/, '').replace(/\s+/g, '')
      if (core.startsWith(typedName)) {
        matches.push({ name, chapters })
        seen.add(name)
        break
      }
    }
  }
  return matches
}
