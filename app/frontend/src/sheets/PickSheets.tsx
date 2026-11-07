// The persona picker for "Use a sample", the "Have a decline letter?" sheet, and the because-trail drawer.
import { useId, useRef, useState } from 'react'
import type { Persona } from 'shared'
import type { WhyTrail } from '../cards/context'
import { Sheet } from '../ui/Sheet'

export function PersonaSheet(props: {
  open: boolean
  onClose: () => void
  personas: Persona[] | null
  error: string | null
  onRetry: () => void
  onPick: (p: Persona) => void
}) {
  return (
    <Sheet open={props.open} onClose={props.onClose} title="Pick a sample person" testId="persona-sheet">
      <p className="text-[1.0625rem] leading-snug">Each sample is a made-up person with a real-looking credit file. Nothing here is a credit search.</p>
      {props.error ? (
        <div className="flex flex-col items-start gap-2">
          <p className="font-bold">{props.error}</p>
          <button type="button" className="btn btn--ink" onClick={props.onRetry}>
            Try again
          </button>
        </div>
      ) : !props.personas ? (
        <p className="font-pixel text-[0.625rem]" role="status">
          Loading samples…
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {props.personas.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex min-h-11 w-full flex-col items-start gap-1 border-[0.1875rem] border-ink bg-paper-shade px-3 py-2.5 text-left"
                onClick={() => props.onPick(p)}
                data-persona={p.id}
              >
                <span className="font-pixel text-[0.6875rem] leading-relaxed">{p.name}</span>
                <span className="text-[0.9375rem] leading-snug text-ink-muted">{p.blurb}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}

export function LetterSheet(props: {
  open: boolean
  onClose: () => void
  onFile: (f: File) => void
  onText: (text: string) => void
  onSample: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const pasteId = useId()
  const [text, setText] = useState('')
  return (
    <Sheet open={props.open} onClose={props.onClose} title="Have a decline letter?" testId="letter-sheet">
      <p className="text-[1.0625rem] leading-snug">
        Hand it over at any point. I'll keep going where we are, then explain why they likely said no once I've seen your results.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn--ink flex-1" onClick={() => fileRef.current?.click()} data-action="letter-upload">
          Upload the letter
        </button>
        <button type="button" className="btn btn--ink-quiet flex-1" onClick={props.onSample} data-action="letter-sample">
          Use the sample letter
        </button>
      </div>
      <p className="text-sm text-ink-muted">A photo or a PDF of the letter works.</p>
      <form
        className="flex flex-col gap-2 border-t-2 border-dashed border-paper-line pt-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim().length < 20) return
          props.onText(text.trim())
          setText('')
        }}
      >
        <label htmlFor={pasteId} className="slip__tag">
          Or paste the letter or email
        </label>
        <textarea
          id={pasteId}
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-24 w-full border-[0.1875rem] border-ink bg-paper px-3 py-2 text-base text-ink"
          placeholder="Thank you for applying for…"
          data-testid="letter-text"
        />
        <button type="submit" className="btn btn--ink self-start" disabled={text.trim().length < 20} data-action="letter-paste">
          Hand it over
        </button>
      </form>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.txt,image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="letter-file"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) props.onFile(f)
          e.target.value = ''
        }}
      />
    </Sheet>
  )
}

/** Bare URLs in engine text (e.g. a weight source) become links. */
function linkify(text: string) {
  return text.split(/(https?:\/\/[^\s)]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="font-bold text-link underline">
        {part.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
      </a>
    ) : (
      part
    ),
  )
}

export function WhySheet({ trail, onClose }: { trail: WhyTrail | null; onClose: () => void }) {
  return (
    <Sheet open={!!trail} onClose={onClose} title={trail ? `Why: ${trail.title}` : ''} testId="why-sheet">
      {trail && (
        <>
          <dl className="flex flex-col gap-3">
            {trail.rows.map((row) => (
              <div key={row.label}>
                <dt className="slip__tag">{row.label}</dt>
                <dd className="mt-1 text-[1.0625rem] leading-snug [overflow-wrap:anywhere]">{linkify(row.value)}</dd>
              </div>
            ))}
          </dl>
          {trail.link && (
            <p className="text-[1.0625rem]">
              Source:{' '}
              <a href={trail.link.url} target="_blank" rel="noopener noreferrer" className="font-bold text-link underline underline-offset-2">
                {trail.link.label}
              </a>
            </p>
          )}
          <p className="text-sm text-ink-muted">Points and weights are estimates from public guidance, not any lender's real scorecard.</p>
        </>
      )}
    </Sheet>
  )
}
