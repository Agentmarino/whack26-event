// 116: the classic RPG dialogue box over the scene. Chunky pixel border, the "Cap" name plate, the
// current line in pixel text, page by page (2 to 4 lines a page, never scrolling inside the box), a
// blinking ▼ when a page is done. Below the text: the inputs (the Dock, as a game menu).
// The text is real DOM text. The letter-by-letter reveal is visual only (aria-hidden spans); screen
// readers get each whole line once from the app's live region.
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
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
  const style: CSSProperties = down
    ? { left: Math.round(place.tailAt - 9), bottom: -16 }
    : { top: Math.round(Math.max(6, place.tailAt - 9)), [place.tail]: -16 }
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

/** A word that ends a sentence (or a clause worth a pause): a good place to end a page. */
const ENDS = /[.!?:;]["'’”)]*$/

/**
 * Split `text` into pages that each fit `lines` lines in `measurer` (same width and font as the box).
 * Like a game script: a full page ends at its last sentence end when that keeps at least half of it, and
 * a last page of a word or two ("start?" alone) takes the start of its sentence back from the page before.
 */
function paginate(text: string, measurer: HTMLElement, lines: number, extraLine: boolean): string[] {
  const lh = parseFloat(getComputedStyle(measurer).lineHeight) || 24
  const fitsIn = (ws: string[], n: number) => {
    measurer.textContent = ws.join(' ')
    return measurer.offsetHeight <= lh * n + lh * 0.4
  }
  const fits = (ws: string[]) => fitsIn(ws, lines)
  const words = text.split(/\s+/).filter(Boolean)
  const pages: string[][] = []
  let cur: string[] = []
  for (const w of words) {
    if (!cur.length || fits([...cur, w])) {
      cur.push(w)
      continue
    }
    let cut = cur.length
    for (let j = cur.length - 1; j >= Math.ceil(cur.length / 2); j--) {
      if (ENDS.test(cur[j - 1] ?? '')) {
        cut = j
        break
      }
    }
    pages.push(cur.slice(0, cut))
    cur = cur.slice(cut)
    if (cur.length && !fits([...cur, w])) {
      pages.push(cur)
      cur = []
    }
    cur.push(w)
  }
  if (cur.length) pages.push(cur)

  const tail = pages[pages.length - 1]
  const prev = pages[pages.length - 2]
  if (tail && prev && tail.length <= 2) {
    if (extraLine && lines < 4 && fitsIn([...prev, ...tail], lines + 1)) {
      // 2 or 3 lines a page: one more line is fine
      pages.splice(-2, 2, [...prev, ...tail])
    } else {
      // take back the start of the tail's sentence, or a few words, keeping at least half the page before
      const keep = Math.ceil(prev.length / 2)
      let k = prev.length
      for (let j = prev.length - 1; j >= keep; j--) {
        if (ENDS.test(prev[j - 1] ?? '')) {
          if (fits([...prev.slice(j), ...tail])) k = j
          break
        }
      }
      if (k === prev.length) {
        while (k > keep && prev.length - k + tail.length < 4 && fits([...prev.slice(k - 1), ...tail])) k--
      }
      if (k < prev.length) pages.splice(-2, 2, prev.slice(0, k), [...prev.slice(k), ...tail])
    }
  }
  measurer.textContent = ''
  return pages.length ? pages.map((p) => p.join(' ')) : ['']
}

export function GameBox(props: {
  /** The line on screen (null while thinking, on an error, or idle). */
  current: { key: string; msg: AgentMessage } | null
  /** The page on screen and how much of it is printed. */
  page: number
  printed: number
  pageDone: boolean
  /** More to read after this page: further pages, or queued lines. */
  more: boolean
  lines: number
  onPages: (key: string, pages: string[]) => void
  pages: string[]
  onAdvance: () => void
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
  /** 117: never page one line over `lines` (the camera framed for the box at that height). */
  strictLines?: boolean
  /** 117: the line shows in a speech bubble here (portal into `bubbleHost`); the box keeps the inputs. */
  bubble?: BubblePlace | null
  bubbleHost?: HTMLElement | null
}) {
  const { current, status } = props
  const measurer = useRef<HTMLParagraphElement>(null)
  const ctx = useCards()
  const [openTerm, setOpenTerm] = useState<string | null>(null)
  const text = current && current.msg.kind !== 'card' ? current.msg.text : ''

  // Page the line whenever it, the font, the text size or the width change. Before paint, so the first
  // page is what types.
  useLayoutEffect(() => {
    const el = measurer.current
    if (!el || !current) return
    const measure = () => props.onPages(current.key, paginate(text, el, props.lines, !props.strictLines))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    // a line that came before the pixel font loaded was measured in the fallback font: page it again
    let live = true
    void document.fonts?.ready.then(() => live && measure())
    return () => {
      live = false
      ro.disconnect()
    }
  }, [current?.key, text, props.lines, props.layoutKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // How many menu rows fit under what is showing: the box's room minus the text, the explain line,
  // the name plate, padding and the fine print. 116: the menu pages rather than cover the question.
  const top = useRef<HTMLDivElement>(null)
  const [topH, setTopH] = useState(0)
  // Measured after every render, before paint (a layout effect's update re-renders at once), so no frame
  // shows a menu paged for the last line's height; the observer catches changes from outside (fonts, width).
  useLayoutEffect(() => {
    const h = top.current?.offsetHeight ?? 0
    if (h !== topH) setTopH(h)
  })
  useLayoutEffect(() => {
    const el = top.current
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
  // (the page count is in it: the line shows whole for one render before it is paged, and a cut made
  // then must not stick)
  const fitKey = `${current?.key ?? status?.kind ?? 'none'}:${props.page}/${props.pages.length}:${props.inputKey}:${props.lines}:${props.layoutKey}:${props.maxPx}`
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

  const pageText = props.pages[props.page] ?? text
  const chars = [...pageText]
  const lastPage = props.page >= props.pages.length - 1
  const terms = current && lastPage && props.pageDone ? termsIn(current.msg.text, ...cardTexts(current.msg, ctx)) : []

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
        <div className="gbox__textwrap" onClick={props.onAdvance}>
          <p className="gbox__text" aria-hidden="true" data-testid="dialogue-text" style={{ minHeight: `calc(${Math.min(props.lines, 2)} * 1lh)` }}>
            {chars.map((c, i) => (
              <span key={i} className={i < props.printed ? undefined : 'unprinted'}>
                {c}
              </span>
            ))}
          </p>
          {(!props.pageDone || props.more) && (
            <span className={props.pageDone ? 'gbox__more gbox__more--blink' : 'gbox__more gbox__more--dim'} aria-hidden="true">
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
    ? { left: Math.round(bub.left), width: Math.round(bub.width), top: bub.top === undefined ? undefined : Math.round(bub.top), bottom: bub.bottom === undefined ? undefined : Math.round(bub.bottom) }
    : undefined

  return (
    <section
      ref={box}
      className={inBubble ? 'gbox gbox--dock' : 'gbox'}
      data-current={current ? '' : undefined}
      data-kind={current?.msg.kind}
      data-message-id={current?.msg.id}
      data-page={current ? `${props.page + 1}/${props.pages.length}` : undefined}
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
        <div ref={top}>
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
            <div ref={top}>{linePart}</div>
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
