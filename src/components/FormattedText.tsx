import { useState, type ReactNode } from 'react'
import { BookOpen, X } from 'lucide-react'
import { getVerse, getVerseRange, isBibleLoaded } from '../features/bible/verse-lookup'

export function FormattedText({ text, className = '' }: { text: string; className?: string }) {
  const lines = text.split('\n')

  return (
    <div className={className}>
      {lines.map((line, i) => {
        const isBullet = /^[•\-]\s/.test(line)
        const content = isBullet ? line.slice(2) : line

        const formatted = renderInlineFormatting(content)

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

function renderInlineFormatting(text: string): ReactNode {
  // Split on both ~~strikethrough~~ and [[Bible Reference]] markers
  const parts = text.split(/(~~.+?~~|\[\[.+?\]\])/g)
  if (parts.length === 1) return text

  return parts.map((part, i) => {
    if (part.startsWith('~~') && part.endsWith('~~')) {
      return (
        <span key={i} className="line-through opacity-60">
          {part.slice(2, -2)}
        </span>
      )
    }
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const reference = part.slice(2, -2)
      return <VerseChip key={i} reference={reference} />
    }
    return part
  })
}

function VerseChip({ reference }: { reference: string }) {
  const [showPopup, setShowPopup] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPopup(true)}
        className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent-text hover:bg-accent/25 transition-colors align-baseline"
      >
        <BookOpen size={10} className="shrink-0" />
        {reference}
      </button>
      {showPopup && (
        <VersePopup reference={reference} onClose={() => setShowPopup(false)} />
      )}
    </>
  )
}

function parseReference(ref: string): { bookName: string; chapter: number; verse: number; endVerse?: number } | null {
  const m = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/)
  if (!m) return null
  return {
    bookName: m[1],
    chapter: parseInt(m[2], 10),
    verse: parseInt(m[3], 10),
    endVerse: m[4] ? parseInt(m[4], 10) : undefined,
  }
}

function VersePopup({ reference, onClose }: { reference: string; onClose: () => void }) {
  const parsed = parseReference(reference)
  let verseText: string | undefined

  if (parsed && isBibleLoaded()) {
    if (parsed.endVerse !== undefined) {
      verseText = getVerseRange(parsed.bookName, parsed.chapter, parsed.verse, parsed.endVerse)
    } else {
      verseText = getVerse(parsed.bookName, parsed.chapter, parsed.verse)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-md rounded-xl bg-card border border-border shadow-xl p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-accent-text shrink-0" />
            <h3 className="text-sm font-semibold text-text">{reference}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-tertiary hover:text-text-secondary hover:bg-input transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="text-sm text-text-secondary leading-relaxed italic">
          {verseText
            ? `"${verseText}"`
            : 'Verse not found — the Bible data may still be loading.'}
        </div>
        <div className="mt-3 text-[10px] text-text-muted text-right">KJV</div>
      </div>
    </>
  )
}
