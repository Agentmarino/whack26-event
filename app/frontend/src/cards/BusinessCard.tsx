// 115: Cap's business card. He slides it across the desk; when it lands it grows from there into a full
// screen card (a native modal <dialog>: focus moves in, Escape closes). Tap anywhere, Enter or Space puts it
// away. In the history it stays as a small card row that opens it again.
import { useId, useLayoutEffect, useRef } from 'react'
import { NpcPortrait, type FacialHair } from '../npc'

export const CARD_FACE = { name: 'Cap', title: 'Credit Coach', line: 'Here to make your credit make sense' }
/** What a screen reader hears when the message has no text of its own. */
export const CARD_TEXT = `${CARD_FACE.name}, ${CARD_FACE.title}. ${CARD_FACE.line}.`
const LOGO = '/brand/capital-one-logo.png'

export type Rect = { x: number; y: number; width: number; height: number }

const GROW_MS = 460
const AWAY_MS = 160

export function BusinessCardOverlay(props: {
  /** Where the card grows from (the card on the desk, or the history row); null grows from the middle. */
  origin: Rect | null
  /** The card message's text, for screen readers. */
  text: string
  reduced: boolean
  facialHair: FacialHair
  /** Called once the card is put away (after its short exit). */
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const card = useRef<HTMLElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const closing = useRef(false)
  const grown = useRef(false)
  const nameId = useId()
  const descId = useId()
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 40rem)').matches

  useLayoutEffect(() => {
    const d = dialog.current
    const c = card.current
    if (!d || !c) return
    if (!d.open) d.showModal()
    closeBtn.current?.focus({ preventScroll: true })
    d.scrollTop = 0 // with large text the card can be taller than the screen: show its top first
    // Once only (StrictMode runs this twice in dev; a second run would measure the card mid-grow).
    if (grown.current || props.reduced || typeof c.animate !== 'function') return
    grown.current = true
    // Grow from where the card landed: invert the final box onto the origin box, then play it back.
    const to = c.getBoundingClientRect()
    const from = props.origin ?? { x: to.x + to.width * 0.4, y: to.y + to.height * 0.4, width: to.width * 0.2, height: to.height * 0.2 }
    const sx = Math.max(0.02, from.width / to.width)
    const sy = Math.max(0.02, from.height / to.height)
    const dx = from.x - to.x
    const dy = from.y - to.y
    c.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transform: 'none' }],
      { duration: GROW_MS, easing: 'cubic-bezier(0.2, 0.75, 0.25, 1)' },
    )
    d.querySelector('.bizcard-dialog__shade')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: GROW_MS * 0.7, easing: 'ease-out' })
    d.querySelector('.bizcard-dialog__hint')?.animate([{ opacity: 0 }, { opacity: 0, offset: 0.7 }, { opacity: 1 }], { duration: GROW_MS + 120 })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const putAway = () => {
    if (closing.current) return
    closing.current = true
    const d = dialog.current
    const done = () => {
      if (d?.open) d.close()
      props.onClose()
    }
    if (props.reduced || !d || typeof d.animate !== 'function') return done()
    d.style.pointerEvents = 'none'
    d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: AWAY_MS, easing: 'ease-in' })
    card.current?.animate([{ transform: 'none' }, { transform: 'scale(0.94)' }], { duration: AWAY_MS, easing: 'ease-in' })
    window.setTimeout(done, AWAY_MS - 10)
  }

  return (
    <dialog
      ref={dialog}
      className="bizcard-dialog"
      aria-label={`${CARD_FACE.name}'s business card`}
      aria-describedby={descId}
      data-testid="business-card"
      onCancel={(e) => {
        e.preventDefault()
        putAway()
      }}
      onClick={putAway}
      onKeyDown={(e) => {
        // The button handles its own Enter and Space; anywhere else in the card does the same.
        if (e.target === closeBtn.current) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (e.key === 'Enter') putAway()
        }
      }}
      onKeyUp={(e) => {
        if (e.target !== closeBtn.current && e.key === ' ') putAway()
      }}
    >
      <div className="bizcard-dialog__shade" aria-hidden="true" />
      <div className="bizcard-dialog__stage">
        <article ref={card} className="bizcard" aria-labelledby={nameId}>
          <div className="bizcard__logo">
            <img src={LOGO} alt="Capital One" draggable={false} />
          </div>
          <div className="bizcard__body">
            <NpcPortrait width={wide ? 205 : 128} facialHair={props.facialHair} className="bizcard__portrait" />
            <div className="bizcard__who">
              <h2 id={nameId} className="bizcard__name">
                {CARD_FACE.name}
              </h2>
              <span className="bizcard__rule" aria-hidden="true" />
              <p className="bizcard__title">{CARD_FACE.title}</p>
              <p className="bizcard__line">{CARD_FACE.line}</p>
            </div>
          </div>
          <div className="bizcard__band" aria-hidden="true" />
        </article>
        <button ref={closeBtn} type="button" className="btn bizcard-dialog__hint" onClick={putAway} data-action="card-close">
          Put the card away
        </button>
      </div>
      <p id={descId} className="sr-only">
        {props.text}
      </p>
    </dialog>
  )
}

/** The card in the chat: a small business card you can open again. */
export function BusinessCardRow(props: { text: string; facialHair: FacialHair; onOpen: (from: Rect) => void }) {
  return (
    <button
      type="button"
      className="bizcard-row"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        props.onOpen({ x: r.x, y: r.y, width: r.width, height: r.height })
      }}
      aria-label={`Open ${CARD_FACE.name}'s business card: ${props.text}`}
      data-action="card-open"
      data-card="business-card"
    >
      <NpcPortrait width={34} facialHair={props.facialHair} className="bizcard-row__portrait" />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left">
        <span className="bizcard-row__name">{CARD_FACE.name}</span>
        <span className="text-[0.9375rem] leading-tight text-ink-muted">{CARD_FACE.title}</span>
      </span>
      <span className="bizcard-row__open">Open</span>
    </button>
  )
}
