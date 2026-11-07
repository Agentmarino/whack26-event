// 116: the classic RPG dialogue box over the scene. Chunky pixel border, the "Cap" name plate, the
// current line in pixel text, page by page (2 to 4 lines a page, never scrolling inside the box), a
// blinking ▼ when a page is done. Below the text: the inputs (the Dock, as a game menu).
// The text is real DOM text. The letter-by-letter reveal is visual only (aria-hidden spans); screen
// readers get each whole line once from the app's live region.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { AgentMessage } from 'shared'
import { Card } from '../cards/Card'
import { useCards } from '../cards/context'
import { Guard } from '../ui/Guard'
import { ToneIcon } from '../ui/Health'
import { AGENT_NAME, Explain, cardTexts } from '../chat/Transcript'
import { termsIn } from '../chat/glossary'
import { PixelArrow } from './PixelArrow'

const DISCLAIMER = 'Estimates only. Not financial advice or a lending decision.'

/** A word that ends a sentence (or a clause worth a pause): a good place to end a page. */
const ENDS = /[.!?:;]["'’”)]*$/

/**
 * Split `text` into pages that each fit `lines` lines in `measurer` (same width and font as the box).
 * Like a game script: a full page ends at its last sentence end when that keeps at least half of it, and
 * a last page of a word or two ("start?" alone) takes the start of its sentence back from the page before.
 */
function paginate(text: string, measurer: HTMLElement, lines: number): string[] {
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
    if (lines < 4 && fitsIn([...prev, ...tail], lines + 1)) {
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
  /** The most the box may take; the menu below the text pages to stay inside it. */
  maxPx: number
  /** The inputs, told how many menu rows fit under the text. */
  children: (rowsFit: number) => ReactNode
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
    const measure = () => props.onPages(current.key, paginate(text, el, props.lines))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
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
  const estimate = Math.max(2, Math.floor((props.maxPx - topH - 3.75 * rem) / rowPx))
  // The estimate cannot know how many lines each choice wraps to: if the box still overflows, take one
  // row off the menu's page and try again (from scratch for each line, page and layout).
  const box = useRef<HTMLElement>(null)
  // (the page count is in it: the line shows whole for one render before it is paged, and a cut made
  // then must not stick)
  const fitKey = `${current?.key ?? status?.kind ?? 'none'}:${props.page}/${props.pages.length}:${props.lines}:${props.layoutKey}:${props.maxPx}`
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

  return (
    <section
      ref={box}
      className="gbox"
      data-current={current ? '' : undefined}
      data-kind={current?.msg.kind}
      data-message-id={current?.msg.id}
      data-page={current ? `${props.page + 1}/${props.pages.length}` : undefined}
      data-rows-fit={rowsFit}
      aria-label="Cap's dialogue"
    >
      <span className="gbox__plate" aria-hidden="true">
        {AGENT_NAME}
      </span>
      {/* the measurer: same width and font as the text, never seen */}
      <p ref={measurer} className="gbox__text gbox__measure" aria-hidden="true" />
      <div ref={top}>

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
      {!current && status && (
        <p
          className={`gbox__text gbox__status gbox__status--${status.kind}`}
          data-testid={status.kind === 'pending' ? 'pending' : status.kind === 'error' ? 'error' : undefined}
          data-entry={status.kind === 'notice' ? 'notice' : undefined}
        >
          {status.kind === 'pending' && <span className="gbox__dots" aria-hidden="true" />}
          {status.kind === 'notice' && <ToneIcon tone="warn" />}
          <span>{status.text}</span>
        </p>
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
      </div>
      <div className="gbox__inputs">{props.children(rowsFit)}</div>
      <p className="gbox__fine" data-testid="disclaimer">
        {DISCLAIMER}
      </p>
    </section>
  )
}
