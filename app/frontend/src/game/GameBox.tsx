// 116: the classic RPG dialogue box over the scene. Chunky pixel border, the "Cap" name plate, the
// current line in pixel text, a blinking ▼ when it is done. Below the text: the inputs (the Dock, as a game menu).
// 118: one message types out continuously. The box shows its usual lines; when the typewriter reaches the end of
// the last one, the text scrolls up a line (150 ms) and typing goes on. No pages. With the whole message shown at
// once (reduced motion, Instant text) a long one scrolls by tap, the arrow keys or the wheel, with an indicator.
// The text is real DOM text. The letter-by-letter reveal is visual only (aria-hidden); screen readers get each
// whole line once from the app's live region.
import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type WheelEvent } from 'react'
import { createPortal } from 'react-dom'
import type { AgentMessage } from 'shared'
import { Card } from '../cards/Card'
import { useCards } from '../cards/context'
import { Guard } from '../ui/Guard'
import { ToneIcon } from '../ui/Health'
import { AGENT_NAME, Explain, cardTexts } from '../chat/Transcript'
import { termsIn } from '../chat/glossary'
import { PixelArrow } from './PixelArrow'

const DISCLAIMER = 'Estimates only. Not financial advice or a lending decision.'

/**
 * 117: where the speech bubble goes (stage CSS px) when the box has no room for the line under Cap's chin.
 * `tail` is the side the tail leaves from and `tailAt` how far along that side (px from the bubble's top for
 * left/right, from its left for down); the tail points at his mouth.
 */
export interface BubblePlace {
  left: number
  width: number
  top?: number
  bottom?: number
  tail: 'left' | 'right' | 'down'
  tailAt: number
}

/** A stepped pixel tail in the box's edge and panel colours. */
function Tail({ place }: { place: BubblePlace }) {
  const down = place.tail === 'down'
  // beside: at his mouth, but never below the bubble's own bottom edge (a one-line bubble is short)
  const style: CSSProperties = down
    ? { left: Math.round(place.tailAt - 9), bottom: -16 }
    : { top: `min(${Math.round(Math.max(6, place.tailAt - 9))}px, calc(100% - 1.75rem))`, [place.tail]: -16 }
  // drawn pointing left; mirrored or turned for the other sides
  const transform = place.tail === 'right' ? 'scale(-1,1)' : down ? 'rotate(-90 9 9)' : undefined
  return (
    <svg className="gbub__tail" width="18" height="18" viewBox="0 0 18 18" shapeRendering="crispEdges" style={style} aria-hidden="true">
      <g transform={transform}>
        <polygon points="18,0 18,18 12,18 12,14 8,14 8,11 4,11 4,8 0,8 0,5 4,5 4,3 8,3 8,1 12,1 12,0" fill="var(--edge)" />
        <polygon points="18,4 18,15 13,15 13,11 9,11 9,8.5 4,8.5 4,6.5 9,6.5 9,5 13,5 13,4" fill="var(--panel)" />
      </g>
    </svg>
  )
}

/** 118: how long the box takes to scroll up one line (the typewriter waits this long before the new line's first letter). */
export const SCROLL_MS = 150

/**
 * 118: where each visual line of `text` starts (char indices; the first is 0), laid out in `measurer` (same width
 * and font as the box's text). Spaces are skipped: the one a line wraps at belongs to the line before.
 */
function lineStarts(text: string, measurer: HTMLElement): number[] {
  measurer.textContent = text
  const node = measurer.firstChild
  const starts = [0]
  if (node) {
    const lh = parseFloat(getComputedStyle(measurer).lineHeight) || 24
    const range = document.createRange()
    let lastTop: number | null = null
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i)
      if ((c >= 0xdc00 && c <= 0xdfff) || /\s/.test(text[i])) continue // a pair's second half, or a space
      range.setStart(node, i)
      range.setEnd(node, Math.min(text.length, c >= 0xd800 && c <= 0xdbff ? i + 2 : i + 1))
      const r = range.getBoundingClientRect()
      if (!r.width && !r.height) continue
      if (lastTop === null) lastTop = r.top
      else if (r.top > lastTop + lh / 2) {
        starts.push(i)
        lastTop = r.top
      }
    }
  }
  measurer.textContent = ''
  return starts
}

export function GameBox(props: {
  /** The line on screen (null while thinking, on an error, or idle). */
  current: { key: string; msg: AgentMessage } | null
  /** How much of the message is printed, and whether all of it is (118: the whole message, not a page). */
  printed: number
  done: boolean
  /** More to read after this message: queued lines. */
  more: boolean
  /** The box's text lines (118: the window's height; longer messages scroll). */
  lines: number
  /** 118: the first line in view, and how many lines the message has (from onLines). */
  top: number
  total: number
  /** 118: where each visual line starts, measured before paint whenever the message or the layout change. */
  onLines: (key: string, starts: number[]) => void
  /** A tap on the text: finish typing, scroll on, or next (App decides). */
  onTextTap: () => void
  /** 118: the message can be scrolled by hand (typed out, longer than the box): focusable, keys, the wheel. */
  scrollable: boolean
  /** 118: show the scroll indicator (shown whole at once, or scrolled back from the end). */
  indicator: boolean
  /** 118: scroll by this many lines (±Infinity: to the start or the end). */
  onScroll: (delta: number) => void
  /** Thinking, an error, or a notice: shown in the text area instead of a line. */
  status: { kind: 'pending' | 'error' | 'notice'; text: string } | null
  /** Re-measure when these change (text size, font, width). */
  layoutKey: string
  /** What the inputs show (Next, a menu...): the menu's fit starts again when it changes. */
  inputKey: string
  /** The most the box may take; the menu below the text pages to stay inside it. */
  maxPx: number
  /** The inputs, told how many menu rows fit under the text. */
  children: (rowsFit: number) => ReactNode
  /** 117: the line shows in a speech bubble here (portal into `bubbleHost`); the box keeps the inputs. */
  bubble?: BubblePlace | null
  bubbleHost?: HTMLElement | null
}) {
  const { current, status } = props
  const measurer = useRef<HTMLParagraphElement>(null)
  const ctx = useCards()
  const [openTerm, setOpenTerm] = useState<string | null>(null)
  const text = current && current.msg.kind !== 'card' ? current.msg.text : ''

  // 118: measure where its lines start whenever the line, the font, the text size or the width change. Before
  // paint, so the first frame already has the right height and the typewriter knows where the box scrolls.
  useLayoutEffect(() => {
    const el = measurer.current
    if (!el || !current) return
    const measure = () => props.onLines(current.key, lineStarts(text, el))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    // a line that came before the pixel font loaded was measured in the fallback font: measure it again
    let live = true
    void document.fonts?.ready.then(() => live && measure())
    return () => {
      live = false
      ro.disconnect()
    }
  }, [current?.key, text, props.layoutKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // How many menu rows fit under what is showing: the box's room minus the text, the explain line,
  // the name plate, padding and the fine print. 116: the menu pages rather than cover the question.
  const textTop = useRef<HTMLDivElement>(null)
  const [topH, setTopH] = useState(0)
  // Measured after every render, before paint (a layout effect's update re-renders at once), so no frame
  // shows a menu paged for the last line's height; the observer catches changes from outside (fonts, width).
  useLayoutEffect(() => {
    const h = textTop.current?.offsetHeight ?? 0
    if (h !== topH) setTopH(h)
  })
  useLayoutEffect(() => {
    const el = textTop.current
    if (!el) return
    const ro = new ResizeObserver(() => setTopH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  // a menu row is 2.75rem (44 px) at least plus its gap; plate, padding, borders and the fine print ~3.75rem
  const rowPx = 2.95 * rem
  const inBubble = !!(props.bubble && props.bubbleHost)
  const estimate = Math.max(2, Math.floor((props.maxPx - (inBubble ? 0 : topH) - 3.75 * rem) / rowPx))
  // The estimate cannot know how many lines each choice wraps to: if the box still overflows, take one
  // row off the menu's page and try again (from scratch for each line, page and layout).
  const box = useRef<HTMLElement>(null)
  // (the line count is in it: a new line has no count for its first render, and a cut made then must not stick)
  const fitKey = `${current?.key ?? status?.kind ?? 'none'}:${props.total}:${props.inputKey}:${props.lines}:${props.layoutKey}:${props.maxPx}`
  const [cut, setCut] = useState({ key: fitKey, n: 0 })
  const n = cut.key === fitKey ? cut.n : 0
  const rowsFit = Math.max(1, estimate - n)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    // The HUD caps the box's height, so a full box shrinks and its content spills out of the bottom:
    // compare the content (scrollHeight) with the room, not the box's own height.
    const check = () => {
      const over = el.scrollHeight > el.clientHeight + 1 || el.offsetHeight > props.maxPx + 1
      if (over && rowsFit > 1) setCut({ key: fitKey, n: n + 1 })
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  })

  const { top, total } = props
  const atEnd = top >= total - props.lines
  const terms = current && props.done ? termsIn(current.msg.text, ...cardTexts(current.msg, ctx)) : []
  // 118: the window is the box's lines tall (at least two, as before; fewer when the message is shorter)
  const rows = Math.max(Math.min(props.lines, 2), Math.min(total || props.lines, props.lines))
  // Scroll smoothly only for a one-line step (typing on, an arrow key); a jump (a tap that finishes the line, Skip
  // all, a box-full) is instant, even when it is a single line. The choice is kept between scrolls, so a re-render
  // mid-scroll (the next letter) does not cut it short.
  const anim = useRef({ key: '', top: 0, done: false, smooth: false })
  const key = current?.key ?? ''
  const prev = anim.current
  const smooth = prev.key === key && prev.top === top ? prev.smooth : prev.key === key && Math.abs(top - prev.top) === 1 && !(props.done && !prev.done)
  useLayoutEffect(() => {
    anim.current = { key, top, done: props.done, smooth }
  })
  const wheelAt = useRef(0)
  const onWindowKey = (e: KeyboardEvent) => {
    if (!props.scrollable) return
    const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : e.key === 'PageDown' ? props.lines : e.key === 'PageUp' ? -props.lines : e.key === 'End' ? Infinity : e.key === 'Home' ? -Infinity : 0
    if (!d) return
    e.preventDefault()
    props.onScroll(d)
  }
  const onWheel = (e: WheelEvent) => {
    if (!props.scrollable || !e.deltaY) return
    // one line a notch; a trackpad's stream of small deltas moves a line at most every 90 ms
    if (e.timeStamp - wheelAt.current < 90) return
    wheelAt.current = e.timeStamp
    props.onScroll(e.deltaY > 0 ? 1 : -1)
  }
  const showNext = props.done && atEnd && props.more
  const showDown = props.scrollable && !atEnd

  const linePart = (
    <>
      {current && current.msg.kind === 'card' && (
        <div className="gbox__cardrow">
          <Guard>
            <Card msg={current.msg} />
          </Guard>
        </div>
      )}
      {current && current.msg.kind !== 'card' && (
        <div className="gbox__textwrap" onClick={props.onTextTap}>
          <div
            className="gbox__window"
            style={{ height: `calc(${rows} * 1lh)` }}
            data-testid="dialogue-window"
            tabIndex={props.scrollable ? 0 : undefined}
            role={props.scrollable ? 'region' : undefined}
            aria-label={props.scrollable ? "Cap's line: scroll it with the up and down arrow keys" : undefined}
            onKeyDown={onWindowKey}
            onWheel={onWheel}
          >
            <p
              className="gbox__text"
              aria-hidden="true"
              data-testid="dialogue-text"
              style={{ transform: top ? `translateY(calc(${-top} * 1lh))` : undefined, transition: smooth ? `transform ${SCROLL_MS}ms ease-out` : 'none' }}
            >
              <span>{text.slice(0, props.printed)}</span>
              <span className="unprinted">{text.slice(props.printed)}</span>
            </p>
          </div>
          {props.indicator && (
            <span className="gbox__scroll" aria-hidden="true" data-testid="scroll-indicator">
              <PixelArrow dir="up" className={top > 0 ? undefined : 'is-off'} />
              <span className="gbox__track">
                <span className="gbox__thumb" style={{ top: `${(top / total) * 100}%`, height: `${(Math.min(props.lines, total) / total) * 100}%` }} />
              </span>
            </span>
          )}
          {(showNext || showDown) && (
            <span className={showNext ? 'gbox__more gbox__more--blink' : 'gbox__more'} aria-hidden="true">
              <PixelArrow dir="down" />
            </span>
          )}
        </div>
      )}
      {current && status?.kind === 'notice' && (
        <p className="gbox__notice" data-entry="notice">
          <ToneIcon tone="warn" /> <span>{status.text}</span>
        </p>
      )}
      {terms.length > 0 && (
        <div className="gbox__explain">
          <Explain terms={terms} open={openTerm} setOpen={setOpenTerm} />
        </div>
      )}
    </>
  )
  const statusPart = !current && status && (
    <p
      className={`gbox__text gbox__status gbox__status--${status.kind}`}
      data-testid={status.kind === 'pending' ? 'pending' : status.kind === 'error' ? 'error' : undefined}
      data-entry={status.kind === 'notice' ? 'notice' : undefined}
    >
      {status.kind === 'pending' && <span className="gbox__dots" aria-hidden="true" />}
      {status.kind === 'notice' && <ToneIcon tone="warn" />}
      <span>{status.text}</span>
    </p>
  )
  const bub = props.bubble
  const bubbleStyle: CSSProperties | undefined = bub
    ? {
        left: Math.round(bub.left),
        width: Math.round(bub.width),
        // a landscape iPhone with viewport-fit=cover: stay clear of the right safe area
        maxWidth: `calc(100vw - ${Math.round(bub.left)}px - env(safe-area-inset-right) - 0.5rem)`,
        top: bub.top === undefined ? undefined : Math.round(bub.top), bottom: bub.bottom === undefined ? undefined : Math.round(bub.bottom) }
    : undefined

  return (
    <section
      ref={box}
      className={inBubble ? 'gbox gbox--dock' : 'gbox'}
      data-current={current ? '' : undefined}
      data-kind={current?.msg.kind}
      data-message-id={current?.msg.id}
      data-lines={current ? total : undefined}
      data-top={current ? top : undefined}
      data-typed={current ? (props.done ? 'done' : 'typing') : undefined}
      data-more={current && props.more ? '' : undefined}
      data-rows-fit={rowsFit}
      data-text-in={inBubble ? 'bubble' : 'box'}
      aria-label="Cap's dialogue"
    >
      {!inBubble && (
        <span className="gbox__plate" aria-hidden="true">
          {AGENT_NAME}
        </span>
      )}
      {/* the measurer: same width and font as the text, never seen */}
      {!inBubble && <p ref={measurer} className="gbox__text gbox__measure" aria-hidden="true" />}
      {inBubble ? (
        statusPart
      ) : (
        <div ref={textTop}>
          {linePart}
          {statusPart}
        </div>
      )}
      {inBubble &&
        current &&
        createPortal(
          <div className={`gbub gbub--${bub!.tail}`} style={bubbleStyle} data-testid="speech-bubble" data-tail={bub!.tail}>
            <span className="gbox__plate" aria-hidden="true">
              {AGENT_NAME}
            </span>
            <p ref={measurer} className="gbox__text gbub__measure" aria-hidden="true" />
            <div ref={textTop}>{linePart}</div>
            <Tail place={bub!} />
          </div>,
          props.bubbleHost!,
        )}
      <div className="gbox__inputs">{props.children(rowsFit)}</div>
      <p className="gbox__fine" data-testid="disclaimer">
        {DISCLAIMER}
      </p>
    </section>
  )
}
