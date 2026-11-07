import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useTypewriter, type Speed } from './hooks'

export interface DialogueLine {
  id: string | number
  speaker: string
  text: string
}

export interface DialogueBoxProps {
  line: DialogueLine
  width?: number
  speed: Speed
  onSpeedChange: (s: Speed) => void
  /** Forces instant text (prefers-reduced-motion). */
  reducedMotion?: boolean
  onChar?: (ch: string) => void
  /** Called when the user skips to the end of a line. */
  onSkip?: () => void
  onLineDone?: () => void
  hasNext?: boolean
  onNext?: () => void
  chips?: string[]
  onChip?: (chip: string) => void
  onSubmit?: (text: string) => void
  onInputFocus?: (focused: boolean) => void
  inputPlaceholder?: string
}

const SPEEDS: { value: Speed; label: string }[] = [
  { value: '1x', label: '1x' },
  { value: '2x', label: '2x' },
  { value: 'instant', label: 'Instant' },
]

const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement && !!t.closest('input, textarea, select, button, a, label, [contenteditable="true"]')

export function DialogueBox(props: DialogueBoxProps) {
  const { line, speed, reducedMotion = false } = props
  const id = useId()
  const [draft, setDraft] = useState('')
  const tw = useTypewriter(line.text, line.id, {
    speed,
    instant: reducedMotion,
    onChar: props.onChar,
    onDone: props.onLineDone,
  })

  const advance = () => {
    if (!tw.done) {
      tw.finish()
      props.onSkip?.()
    } else if (props.hasNext) props.onNext?.()
  }
  const advanceRef = useRef(advance)
  useLayoutEffect(() => {
    advanceRef.current = advance
  })

  // Space finishes the line (or goes to the next one) unless focus is on a control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTypingTarget(e.target)) return
      e.preventDefault()
      advanceRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const showNext = !tw.done || props.hasNext
  const chars = [...line.text]

  return (
    <section className={reducedMotion ? "npc-dialogue npc-dialogue--still" : "npc-dialogue"} style={props.width ? { width: props.width } : undefined} aria-label="Conversation with the credit agent">
      <div className="npc-dialogue__head">
        <span className="npc-dialogue__speaker" aria-hidden="true">{line.speaker}</span>
        <fieldset className="npc-speed">
          <legend className="npc-speed__legend">Text speed</legend>
          {SPEEDS.map((s) => (
            <label key={s.value} className="npc-speed__opt">
              <input
                type="radio"
                name={`${id}-speed`}
                value={s.value}
                checked={speed === s.value}
                onChange={() => props.onSpeedChange(s.value)}
              />
              <span>{s.label}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <div className="npc-dialogue__body" onClick={advance}>
        <p className="npc-dialogue__text" aria-live="polite" aria-atomic="true">
          <span key={line.id}>
            <span className="npc-sr-only">{line.speaker} says: </span>
            {chars.map((c, i) => (
              <span key={i} className={i < tw.printed ? undefined : 'npc-unprinted'}>{c}</span>
            ))}
          </span>
        </p>
        {showNext && (
          <button
            type="button"
            className="npc-next"
            data-npc-next={tw.done ? 'next' : 'finish'}
            aria-label={tw.done ? 'Next line' : 'Show the whole line'}
            onClick={(e) => {
              e.stopPropagation()
              advance()
            }}
          >
            <span className={tw.done ? 'npc-next__arrow npc-next__arrow--blink' : 'npc-next__arrow'} aria-hidden="true" />
          </button>
        )}
      </div>

      {props.chips && props.chips.length > 0 && (
        <div className="npc-chips" role="group" aria-label="Quick replies">
          {props.chips.map((c) => (
            <button key={c} type="button" className="npc-chip" onClick={() => props.onChip?.(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      <form
        className="npc-reply"
        onSubmit={(e) => {
          e.preventDefault()
          const v = draft.trim()
          if (!v) return
          props.onSubmit?.(v)
          setDraft('')
        }}
      >
        <label htmlFor={`${id}-reply`} className="npc-sr-only">Your reply</label>
        <input
          id={`${id}-reply`}
          className="npc-reply__input"
          value={draft}
          placeholder={props.inputPlaceholder ?? 'Type a reply'}
          autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => props.onInputFocus?.(true)}
          onBlur={() => props.onInputFocus?.(false)}
        />
        <button type="submit" className="npc-reply__send">Send</button>
      </form>
    </section>
  )
}
