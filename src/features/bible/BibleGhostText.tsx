import { useRef, useLayoutEffect, useState } from 'react'

type BibleGhostTextProps = {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  ghostText: string
  value: string
  onAccept: () => void
}

export function BibleGhostText({ textareaRef, ghostText, value, onAccept }: BibleGhostTextProps) {
  const mirrorRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [fontStyles, setFontStyles] = useState<React.CSSProperties>({})

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

    setPos({
      top: markerRect.top - mirrorRect.top - el.scrollTop,
      left: markerRect.left - mirrorRect.left,
    })

    setFontStyles({
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
    })
  }, [value, ghostText, textareaRef])

  if (!ghostText) return null

  const displayText = ghostText.length > 80
    ? ghostText.slice(0, 77) + '...'
    : ghostText

  // The mirror div must ALWAYS render — it's what measures the cursor
  // position. Only the visible ghost span waits for the measurement.
  return (
    <>
      <div ref={mirrorRef} aria-hidden="true" style={{ position: 'absolute', visibility: 'hidden', top: 0, left: 0 }} />

      {pos && (
        <span
          aria-hidden="true"
          onMouseDown={(e) => {
            e.preventDefault()
            onAccept()
          }}
          className="absolute z-10 cursor-pointer select-none pointer-events-auto"
          style={{
            top: pos.top,
            left: pos.left,
            color: 'var(--color-text-muted)',
            opacity: 0.45,
            whiteSpace: 'pre',
            ...fontStyles,
          }}
        >
          {displayText}
        </span>
      )}
    </>
  )
}
