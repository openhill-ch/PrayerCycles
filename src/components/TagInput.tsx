import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { isDevMode } from '../lib/devmode'

type TagInputProps = {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  allTags?: string[]
  className?: string
}

/**
 * Hashtag input. The # is auto-shown — user just types the tag name.
 * Double-space or Enter commits the tag.
 * Blur with text commits the tag.
 * Empty input on blur is ignored.
 */
export function TagInput({ tags, onChange, placeholder, allTags = [], className }: TagInputProps) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const trimmed = input.trim()
    if (trimmed.length > 0) {
      const lower = trimmed.toLowerCase()
      const matches = allTags.filter(
        (t) => t.toLowerCase().includes(lower) && !tags.includes(t),
      )
      setSuggestions(matches.slice(0, 5))
    } else {
      setSuggestions([])
    }
  }, [input, allTags, tags])

  function commitTag(tagName: string) {
    const trimmed = tagName.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInput('')
    setSuggestions([])
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value

    // Double-space commits the current tag
    if (val.endsWith('  ')) {
      const tagText = val.trimEnd()
      if (tagText) {
        commitTag(tagText)
        return
      }
      // Empty double-space — ignore
      setInput('')
      return
    }

    // iOS auto-corrects double-space to ". " — treat as double-space commit
    if (val.endsWith('. ') && !input.endsWith('.')) {
      const tagText = val.slice(0, -2).trim()
      if (tagText) {
        commitTag(tagText)
        return
      }
      setInput('')
      return
    }

    setInput(val)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = input.trim()
      if (trimmed) {
        commitTag(trimmed)
      }
    }
    // Tab autocompletes to first suggestion (dev mode only)
    if (e.key === 'Tab' && isDevMode() && suggestions.length > 0) {
      e.preventDefault()
      commitTag(suggestions[0])
      return
    }
    // Backspace on empty input removes last tag
    if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  function handleBlur() {
    // If there's text when they leave, commit it as a tag
    const trimmed = input.trim()
    if (trimmed) {
      commitTag(trimmed)
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  function selectSuggestion(tag: string) {
    commitTag(tag)
    inputRef.current?.focus()
  }

  // Show # prefix when the input is focused or has text
  const showHash = input.length > 0

  return (
    <div className="relative">
      <div
        className={`flex flex-wrap items-center gap-1.5 rounded-lg px-3 py-2 min-h-[38px] cursor-text ${className ?? 'bg-input'}`}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-input-hover px-2 py-0.5 text-xs text-text-secondary"
          >
            <span className="text-text-tertiary">#</span>
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              className="ml-0.5 text-text-tertiary hover:text-text-secondary"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <div className="flex items-center min-w-[80px] flex-1">
          {showHash && <span className="text-sm text-text-tertiary select-none">#</span>}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={tags.length === 0 ? (placeholder ?? 'type a tag  (double-space to add)') : 'add another...'}
            className="flex-1 bg-transparent text-sm text-text placeholder-text-tertiary outline-none"
          />
        </div>
      </div>

      {/* Autocomplete suggestions */}
      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg bg-input py-1 shadow-lg border border-border-light">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectSuggestion(tag)}
              className="w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-input-hover"
            >
              <span className="text-text-tertiary">#</span>{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
