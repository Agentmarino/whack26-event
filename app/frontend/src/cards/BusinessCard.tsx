// 115: Cap's business card. He slides it across the desk; when it lands it grows from there into a full
// screen card (a native modal <dialog>: focus moves in, Escape closes). Tap anywhere, Enter or Space puts it
// away. In the history it stays as a small card row that opens it again.
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from 'react'
import { NpcPortrait, type FacialHair } from '../npc'

export const CARD_FACE = { name: 'Cap', title: 'Credit Coach', line: 'Here to make your credit make sense' }
/** What a screen reader hears when the message has no text of its own. */
export const CARD_TEXT = `${CARD_FACE.name}, ${CARD_FACE.title}. ${CARD_FACE.line}.`
const LOGO = '/brand/capital-one-logo.png'

export type Rect = { x: number; y: number; width: number; height: number }

const GROW_MS = 460
const AWAY_MS = 160

/** 117 follow-up: a real business card, ISO/IEC 7810 ID-1: 85.6 x 54 mm, landscape. */
export const CARD_RATIO = 85.6 / 54
/** The full card's width in CSS px: the same for the card on the desk (scaled down) and the full card. */
export function cardWidth() {
  const w = typeof window === 'undefined' ? 400 : window.innerWidth
  return Math.round(Math.min(w - 32, w >= 640 ? 560 : 416))
}
/** The card on the desk: native scene px. 12 px wide, sliding 4 rows towards you; its bottom ends just above the box. */
export const DESK_CARD = { x: 54, w: 12, bottomFrom: 77, bottomTo: 81 }
/** The engine's slide: it starts 250 ms into the gesture and takes 750 ms (engine.drawCard). */
const SLIDE_DELAY_MS = 250
const SLIDE_MS = 750

/**
 * The card face: logo, portrait, name, title, line, the band. Every size comes from the card's own width (--cw), so
 * it only ever changes size as a whole (uniform scale), never shape. Crisp: a DOM element, the portrait at whole
 * device pixels, the logo file unchanged.
 */
export function CardFace(props: { width: number; facialHair: FacialHair; nameId?: string; ref?: Ref<HTMLElement>; style?: CSSProperties; className?: string }) {
  const { width } = props
  return (
    <article
      ref={props.ref}
      className={`bcard ${props.className ?? ''}`}
      style={{ width, height: width / CARD_RATIO, '--cw': `${width}px`, ...props.style } as CSSProperties}
      aria-labelledby={props.nameId}
    >
      <div className="bcard__logo">
        <img src={LOGO} alt="Capital One" draggable={false} />
      </div>
      <NpcPortrait width={Math.round(width * 0.28)} facialHair={props.facialHair} className="bcard__portrait" />
      <div className="bcard__who">
        <h2 id={props.nameId} className="bcard__name">
          {CARD_FACE.name}
        </h2>
        <span className="bcard__rule" aria-hidden="true" />
        <p className="bcard__title">{CARD_FACE.title}</p>
        <p className="bcard__line">{CARD_FACE.line}</p>
      </div>
      <div className="bcard__band" aria-hidden="true" />
    </article>
  )
}

/**
 * The small card sliding across the desk: the same face at full size, scaled down uniformly (transform only),
 * moved from `from` to `to` (viewport px, top-left) on the engine's slide timing. Purely visual.
 */
export function DeskCard(props: { from: Rect; to: Rect; facialHair: FacialHair }) {
  const W = cardWidth()
  const m = props.to.width / W
  const [at, setAt] = useState(props.from)
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAt(props.to)))
    return () => cancelAnimationFrame(id)
  }, [props.to])
  return (
    <div className="deskcard" aria-hidden="true" data-testid="desk-card" style={{ transform: `translate(${at.x}px, ${at.y}px) scale(${m})`, transitionDelay: `${SLIDE_DELAY_MS}ms`, transitionDuration: `${SLIDE_MS}ms` }}>
      <CardFace width={W} facialHair={props.facialHair} />
    </div>
  )
}

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
  const W = cardWidth()

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
    // Grow from where the card landed: one uniform scale (never a stretch), from the origin box to the full card.
    // The desk card has the card's own proportions, so it lines up exactly; any other origin (the history row) is
    // matched by width and centred on it.
    const to = c.getBoundingClientRect()
    const from = props.origin ?? { x: to.x + to.width * 0.4, y: to.y + to.height * 0.4, width: to.width * 0.2, height: to.height * 0.2 }
    const sc = Math.max(0.02, from.width / to.width)
    const dx = from.x - to.x
    const dy = from.y + from.height / 2 - (to.y + (to.height * sc) / 2)
    c.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(${sc})` }, { transform: 'none' }],
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
        <CardFace ref={card} width={W} facialHair={props.facialHair} nameId={nameId} />
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
