// The input area, pinned at the bottom and always on screen. What it shows follows the conversation:
// Next while the agent is talking, then the inputs his last message `expects`.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Expects, FileKind } from 'shared'
import { ChipIcon } from './chipIcons'
import { PixelArrow } from '../game/PixelArrow'
import { MicButton } from './Mic'

export type DockMode =
  | { kind: 'busy'; label: string }
  | { kind: 'error'; canGoOffline: boolean; sessionGone: boolean }
  | { kind: 'next'; typing: boolean; more: number }
  | { kind: 'continue' }
  | { kind: 'input'; expects: Expects }
  | { kind: 'idle' }

const ACCEPT: Record<FileKind, string> = {
  credit_report: '.pdf,.json,image/*',
  bank: '.csv,.pdf,image/*',
  letter: '.pdf,.txt,image/*',
}

// Last input modality: set on any key, cleared on any pointer. Decides whether the dock may move focus.
let usingKeyboard = false
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', () => (usingKeyboard = true), true)
  window.addEventListener('pointerdown', () => (usingKeyboard = false), true)
}

export function Dock(props: {
  mode: DockMode
  onNext: () => void
  onShowAll: () => void
  onContinue: () => void
  onChip: (value: string, how: 'choice' | 'text') => void
  onText: (value: string) => void
  onFile: (file: File, kind: FileKind) => void
  onSample: (kind: FileKind) => void
  onSkip: () => void
  onRetry: () => void
  onRestart: () => void
  onOffline: () => void
  /** Coach mode: opens the what-if sliders, shown first in the quick replies. */
  onSliders?: () => void
  /** 115: big friendly chips with an icon each: one per row ('list', the opening) or a grid ('grid', goals). */
  big?: 'list' | 'grid'
  /** 117: a wide, short screen (the line in a bubble beside Cap): every menu in two columns. */
  twoCols?: boolean
  /** 116: how many menu rows fit under the question; more rows page. */
  pageSize?: number
}) {
  const { mode, big } = props
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')
  // top is null while no on-screen keyboard has shrunk the view: then the dock stays where it is in the box
  const [pin, setPin] = useState<{ top: number | null; h: number } | null>(null)

  // Keyboard users: when the dock's contents change under the focus, or focus was lost (a sheet closed
  // and the button that opened it is gone), move focus to the dock's first control. Only after a key
  // press, so touch users never get a surprise focus (or keyboard).
  const modeKey = mode.kind === 'input' ? `input:${(mode.expects.chips ?? []).join('|')}:${mode.expects.kind}` : mode.kind
  const hadFocus = useRef(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !usingKeyboard) return
    const active = document.activeElement
    const lost = !active || active === document.body
    if ((hadFocus.current || lost) && !el.contains(active) && !document.querySelector('dialog[open]')) {
      el.querySelector<HTMLElement>('button:not([disabled]), input:not([type=file]):not([tabindex="-1"])')?.focus()
    }
  }, [modeKey])
  // Phone: while the text box has focus, pin the dock just above the on-screen keyboard.
  const pinned = pin !== null
  useEffect(() => {
    const vv = window.visualViewport
    if (!pinned || !vv) return
    const on = () => setPin((p) => p && { ...p, top: keyboardTop(p.h) })
    on()
    vv.addEventListener('resize', on)
    vv.addEventListener('scroll', on)
    return () => {
      vv.removeEventListener('resize', on)
      vv.removeEventListener('scroll', on)
    }
  }, [pinned])

  const fileKind: FileKind = mode.kind === 'input' ? (mode.expects.fileKinds?.[0] ?? 'credit_report') : 'credit_report'

  const chips = mode.kind === 'input' ? (mode.expects.chips ?? []) : []
  const chipRows: MenuRow[] = chips.map((c) => ({
    id: `chip:${c}`,
    label: c,
    icon: big ? <ChipIcon chip={c} /> : undefined,
    onSelect: () => props.onChip(c, 'choice'),
    attrs: { 'data-chip': c },
  }))
  const skipRow: MenuRow[] =
    mode.kind === 'input' && mode.expects.optional ? [{ id: 'skip', label: 'Skip', onSelect: props.onSkip, attrs: { 'data-action': 'skip' }, quiet: true }] : []
  // goals in two columns while there is room; at 150% text one column that pages
  // 116: with choices on screen, typing is a menu row that opens the field (keyed to these choices)
  const hasChoices = chipRows.length > 0 || !!props.onSliders
  const rowsKeyNow = mode.kind === 'input' ? `${mode.expects.kind}:${chips.join('|')}` : ''
  const [typingFor, setTyping] = useState<string | null>(null)
  const typing = typingFor !== null && typingFor === rowsKeyNow
  useEffect(() => {
    if (typing) document.getElementById('reply-box')?.focus()
  }, [typing])
  // 116: the field can unmount with focus (after Send, or a new turn) and no blur fires, so a pin left
  // over from it would hold the dock at a stale fixed spot below the box: pin only while the field is open.
  const fieldOpen = mode.kind === 'input' && mode.expects.kind === 'text' && (!hasChoices || typing)
  useEffect(() => {
    if (!fieldOpen) setPin(null)
  }, [fieldOpen])
  const shownPin = fieldOpen && pin && pin.top !== null ? { top: pin.top, h: pin.h } : null
  const cols = ((big === 'grid' && (props.pageSize ?? 99) >= 3) || props.twoCols) && document.documentElement.dataset.textSize !== '150' && window.innerWidth >= 600 ? 2 : 1

  return (
    <div style={shownPin ? { minHeight: shownPin.h } : undefined} className="flex-none">
      <div
        ref={ref}
        className="dock"
        // pinned over the keyboard it leaves the box, so it brings the box's ground with it (8 px + 4 px edge)
        style={
          shownPin
            ? { position: 'fixed', left: 0, right: 0, top: shownPin.top - 20, zIndex: 20, padding: 8, background: 'var(--panel)', borderTop: '4px solid var(--edge)' }
            : undefined
        }
        data-testid="dock"
        data-mode={mode.kind}
        role="group"
        aria-label="Your reply"
      >
        {mode.kind === 'busy' && <p className="sr-only">{mode.label}…</p>}

        {mode.kind === 'error' && (
          <div className="flex flex-wrap gap-2">
            {mode.sessionGone ? (
              <button type="button" className="gbtn gbtn--primary flex-1" onClick={props.onRestart} data-action="restart-chat">
                Start again
              </button>
            ) : (
              <button type="button" className="gbtn gbtn--primary flex-1" onClick={props.onRetry} data-action="retry">
                Try again
              </button>
            )}
            {mode.canGoOffline && (
              <button type="button" className="gbtn" onClick={props.onOffline} data-action="offline">
                Use the offline demo
              </button>
            )}
          </div>
        )}

        {mode.kind === 'next' && (
          <div className="flex gap-2">
            {/* 116: short labels so they stay on one line in the pixel font; the count is in the name */}
            <button
              type="button"
              className="gbtn gbtn--primary min-w-0 flex-1"
              onClick={props.onNext}
              data-action="next"
              aria-label={mode.typing ? 'Show all of it' : mode.more > 0 ? `Next (${mode.more} more)` : 'Next'}
            >
              <span>{mode.typing ? 'Show all' : 'Next'}</span>
              <PixelArrow dir="down" />
            </button>
            {mode.more > 1 && (
              <button type="button" className="gbtn flex-none" onClick={props.onShowAll} data-action="show-all" aria-label="Skip to the end">
                Skip all
              </button>
            )}
          </div>
        )}

        {mode.kind === 'continue' && (
          <Menu rows={[{ id: 'continue', label: 'Continue', onSelect: props.onContinue, attrs: { 'data-action': 'continue' } }]} label="Continue" pageSize={props.pageSize} />
        )}

        {mode.kind === 'input' && mode.expects.kind === 'choice' && (
          <Menu rows={[...chipRows, ...skipRow]} label="Choose an answer" big={big} cols={cols} pageSize={props.pageSize} />
        )}

        {mode.kind === 'input' && mode.expects.kind === 'text' && hasChoices && !typing && (
          // 116: the choices as a menu; typing is one more choice, so the field never crowds the question
          <Menu
            rows={[
              ...chipRows,
              ...(props.onSliders ? [{ id: 'sliders', label: 'Sliders', onSelect: props.onSliders, attrs: { 'data-action': 'whatif-sheet' } } satisfies MenuRow] : []),
              { id: 'type', label: mode.expects.allowVoice !== false ? 'Type or say my own' : 'Type my own', onSelect: () => setTyping(rowsKeyNow), attrs: { 'data-action': 'type-own' }, quiet: true },
              ...skipRow,
            ]}
            label="Quick replies"
            big={big}
            cols={cols}
            pageSize={props.pageSize}
          />
        )}

        {mode.kind === 'input' && mode.expects.kind === 'text' && (!hasChoices || typing) && (
          <div className="flex flex-col gap-2">
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                const v = draft.trim()
                if (!v) return
                props.onText(v)
                setDraft('')
                // 116: sent: the next turn's choices show again (the field is one tap away)
                setTyping(null)
              }}
            >
              <label className="sr-only" htmlFor="reply-box">
                Your reply
              </label>
              <input
                id="reply-box"
                className="gfield min-w-0 flex-1 basis-0"
                value={draft}
                placeholder={mode.expects.placeholder ?? 'Type your answer'}
                autoComplete="off"
                enterKeyHint="send"
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => {
                  if (window.visualViewport && window.matchMedia('(pointer: coarse)').matches) {
                    const h = ref.current?.offsetHeight ?? 0
                    setPin({ top: keyboardTop(h), h })
                  }
                }}
                onBlur={() => setPin(null)}
              />
              {mode.expects.allowVoice !== false && (
                // like Send: a tap keeps the field's focus, so the pinned dock does not jump under the finger
                <span className="contents" onPointerDown={(e) => pinned && e.preventDefault()}>
                  <MicButton onText={(t) => setDraft((d) => (d ? `${d} ${t}` : t))} />
                </span>
              )}
              <button type="submit" className="gbtn gbtn--primary" onPointerDown={(e) => pinned && e.preventDefault()} data-action="send">
                Send
              </button>
            </form>
            <div className="flex gap-2">
              {hasChoices && (
                <button type="button" className="gbtn" onPointerDown={(e) => pinned && e.preventDefault()} onClick={() => setTyping(null)} data-action="type-back">
                  <PixelArrow dir="left" /> Back
                </button>
              )}
              {mode.expects.optional && (
                <button type="button" className="gbtn" onPointerDown={(e) => pinned && e.preventDefault()} onClick={props.onSkip} data-action="skip">
                  Skip
                </button>
              )}
            </div>
          </div>
        )}

        {mode.kind === 'input' && mode.expects.kind === 'file' && (
          <>
            <Menu
              rows={[
                { id: 'upload', label: 'Upload', onSelect: () => fileRef.current?.click(), attrs: { 'data-action': 'upload' } },
                { id: 'sample', label: 'Use a sample', onSelect: () => props.onSample(fileKind), attrs: { 'data-action': 'sample' } },
                ...skipRow,
              ]}
              label="Hand over a file"
              pageSize={props.pageSize}
            />
            {/* Visually hidden, not display:none, so iOS Safari opens the picker from the tap. */}
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT[fileKind]}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              data-testid="dock-file"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) props.onFile(f, fileKind)
                e.target.value = ''
              }}
            />
          </>
        )}

        {mode.kind === 'input' && mode.expects.kind === 'none' && (
          <Menu rows={[{ id: 'continue', label: 'Continue', onSelect: props.onContinue, attrs: { 'data-action': 'continue' } }]} label="Continue" pageSize={props.pageSize} />
        )}
      </div>
    </div>
  )
}

/**
 * 116: where the pinned dock's top goes: just above the on-screen keyboard, or null when there is none
 * (the visual viewport is the whole window), so a focus alone never moves the dock out of the box.
 */
function keyboardTop(h: number): number | null {
  const vv = window.visualViewport
  if (!vv || vv.height >= window.innerHeight - 60) return null
  return vv.offsetTop + vv.height - h
}

// ---------- 116: the game menu ----------

export type MenuRow = { id: string; label: string; onSelect: () => void; attrs: Record<string, string>; icon?: ReactNode; trail?: ReactNode; quiet?: boolean }

/**
 * A game menu: one row per choice with a pixel ▶ cursor on the active row; up and down (and left and
 * right in two columns) move it, Enter or a tap picks. Every row stays a Tab stop. When the rows do not
 * fit (`pageSize`, from the space left under the question), they page: a "More ▶" row shows the next
 * page and the last page has "◀ Back", so the menu never covers the question.
 */
function Menu(props: { rows: MenuRow[]; label: string; big?: 'list' | 'grid'; cols?: 1 | 2; pageSize?: number }) {
  const { rows } = props
  const cols = props.cols ?? 1
  // pageSize counts rows; a two-column grid holds two choices a row
  const capacity = props.pageSize ? props.pageSize * cols : Infinity
  const size = rows.length > capacity ? Math.max(1, capacity - 1) : rows.length
  const pages = Math.max(1, Math.ceil(rows.length / Math.max(1, size)))
  const rowsKey = rows.map((r) => r.id).join('|')
  const [st, setSt] = useState({ key: rowsKey, page: 0, active: 0 })
  const cur = st.key === rowsKey ? st : { key: rowsKey, page: 0, active: 0 }
  const page = Math.min(cur.page, pages - 1)
  const shown = rows.slice(page * size, page * size + size)
  const nav: MenuRow | null =
    pages > 1
      ? page < pages - 1
        ? { id: 'more', label: `More (${page + 1}/${pages})`, trail: <PixelArrow dir="right" />, onSelect: () => setSt({ key: rowsKey, page: page + 1, active: 0 }), attrs: { 'data-action': 'menu-more' }, quiet: true }
        : { id: 'back', label: `Back (${page + 1}/${pages})`, icon: <PixelArrow dir="left" />, onSelect: () => setSt({ key: rowsKey, page: 0, active: 0 }), attrs: { 'data-action': 'menu-back' }, quiet: true }
      : null
  const all = nav ? [...shown, nav] : shown
  const box = useRef<HTMLDivElement>(null)
  const focusRow = (i: number) => box.current?.querySelectorAll<HTMLButtonElement>('[data-row]')[i]?.focus()
  const onKey = (e: React.KeyboardEvent) => {
    const n = all.length
    const i = Math.max(0, all.findIndex((r) => r.id === (document.activeElement as HTMLElement | null)?.dataset.rowId))
    const step = e.key === 'ArrowDown' ? cols : e.key === 'ArrowUp' ? -cols : e.key === 'ArrowRight' && cols > 1 ? 1 : e.key === 'ArrowLeft' && cols > 1 ? -1 : 0
    if (step) {
      e.preventDefault()
      const next = (i + step + n) % n
      setSt({ key: rowsKey, page, active: next })
      focusRow(next)
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      const next = e.key === 'Home' ? 0 : n - 1
      setSt({ key: rowsKey, page, active: next })
      focusRow(next)
    }
  }
  // after "More" / "Back", keep the cursor (and keyboard focus) in the menu
  useLayoutEffect(() => {
    if (box.current?.contains(document.activeElement)) focusRow(0)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      ref={box}
      className={`gmenu ${cols === 2 ? 'gmenu--grid' : ''} ${props.big ? 'gmenu--big' : ''}`}
      role="group"
      aria-label={props.label}
      data-chips={props.big ?? 'normal'}
      data-menu-page={pages > 1 ? `${page + 1}/${pages}` : undefined}
      onKeyDown={onKey}
    >
      {all.map((r, i) => (
        <button
          key={r.id}
          type="button"
          className={`mrow ${r.quiet ? 'mrow--quiet' : ''}`}
          data-row=""
          data-row-id={r.id}
          data-active={i === Math.min(cur.active, all.length - 1) ? '' : undefined}
          onFocus={() => setSt({ key: rowsKey, page, active: i })}
          onMouseEnter={() => setSt({ key: rowsKey, page, active: i })}
          onClick={r.onSelect}
          {...r.attrs}
        >
          <span className="mrow__cursor" aria-hidden="true">
            <PixelArrow dir="right" />
          </span>
          {r.icon}
          <span className="mrow__label">{r.label}</span>
          {r.trail}
        </button>
      ))}
    </div>
  )
}
