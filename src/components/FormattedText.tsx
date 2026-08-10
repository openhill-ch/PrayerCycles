/** Renders plain text, preserving the line breaks the author typed. */
export function FormattedText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {text.split('\n').map((line, i) => (
        <div key={i} className="leading-snug">
          {line === '' ? <br /> : line}
        </div>
      ))}
    </div>
  )
}
