// 116: the expandable side panel, styled as Cap's pixel notebook. Closed by default; opens from the
// notebook icon or a data window's "Details". Desktop: slides in from the right (about 40%, the scene
// stays visible). Phone: a full-height sheet over the scene, closed by a swipe right or down, the X or Esc.
// Two tabs: Chat (the whole history) and Your plan (every detail card shown so far).
// It stays mounted while closed (inert), so the history is always there for assistive tech to reach on open.
import { useEffect, useMemo, useRef } from 'react'
import { Card } from '../cards/Card'
import { HistoryEntry } from '../chat/Transcript'
import type { ConvState } from '../chat/useConversation'
import { Guard } from '../ui/Guard'

export type PanelTab = 'chat' | 'plan'

export function SidePanel(props: {
  open: boolean
  tab: PanelTab
  /** Scroll to and focus this item on the plan tab (a message id), then forget it. */
  focusItem: string | null
  wide: boolean
  conv: ConvState
  onTab: (t: PanelTab) => void
  onClose: () => void
}) {
  const { open, tab, conv } = props
  const ref = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const back = useRef<HTMLElement | null>(null)

  // Focus in on open, back to what opened it on close.
  useEffect(() => {
    if (open) {
      back.current = document.activeElement as HTMLElement | null
      window.setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 0)
    } else if (back.current && document.body.contains(back.current)) {
      back.current.focus({ preventScroll: true })
      back.current = null
    }
  }, [open])

  // Esc closes (unless a sheet on top handles it).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
        e.preventDefault()
        props.onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, props.onClose]) // eslint-disable-line react-hooks/exhaustive-deps

  // "Details": the plan tab at that item.
  useEffect(() => {
    if (!open || tab !== 'plan' || !props.focusItem) return
    const el = ref.current?.querySelector<HTMLElement>(`[data-item="${CSS.escape(props.focusItem)}"]`)
    if (el) {
      el.scrollIntoView({ block: 'start' })
      el.focus({ preventScroll: true })
    }
  }, [open, tab, props.focusItem])

  // Phone: swipe right or down to close.
  const start = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    if (t) start.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = e.changedTouches[0]
    const s = start.current
    start.current = null
    if (!t || !s || props.wide) return
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    const scroller = ref.current?.querySelector('.panel__body')
    if ((dx > 80 && Math.abs(dy) < 60) || (dy > 110 && Math.abs(dx) < 60 && (scroller?.scrollTop ?? 0) <= 0)) props.onClose()
  }

  // The plan tab: every detail card shown so far, once each (the latest message for a ref wins).
  const items = useMemo(() => {
    const seen = new Map<string, (typeof conv.entries)[number]>()
    for (const e of conv.entries) {
      // a text line with a ref has a card too (the flags)
      if (e.type !== 'agent' || e.msg.kind === 'card' || (e.msg.kind === 'text' && !e.msg.ref)) continue
      seen.set(e.msg.ref ? JSON.stringify(e.msg.ref) : e.msg.id, e)
    }
    return [...seen.values()]
  }, [conv.entries])

  return (
    <aside
      ref={ref}
      className={`panel ${props.wide ? 'panel--side' : 'panel--sheet'}`}
      data-open={open || undefined}
      aria-hidden={!open}
      inert={!open}
      aria-label="Your notebook: the chat so far and your plan"
      data-testid="side-panel"
      role={props.wide ? 'complementary' : 'dialog'}
      aria-modal={!props.wide && open ? true : undefined}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="panel__head">
        <div className="panel__tabs" role="tablist" aria-label="Notebook">
          <button type="button" role="tab" aria-selected={tab === 'chat'} className="panel__tab" onClick={() => props.onTab('chat')} data-action="tab-chat">
            Chat
          </button>
          <button type="button" role="tab" aria-selected={tab === 'plan'} className="panel__tab" onClick={() => props.onTab('plan')} data-action="tab-plan">
            Your plan
          </button>
        </div>
        <button ref={closeRef} type="button" className="gicon" onClick={props.onClose} aria-label="Close the notebook" data-action="panel-close">
          <svg width="18" height="18" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true" fill="currentColor">
            <path d="M0 0h1v1H0zM1 1h1v1H1zM2 2h1v1H2zM3 3h1v1H3zM4 4h1v1H4zM5 5h1v1H5zM6 6h1v1H6zM6 0h1v1H6zM5 1h1v1H5zM4 2h1v1H4zM2 4h1v1H2zM1 5h1v1H1zM0 6h1v1H0z" />
          </svg>
        </button>
      </div>
      <div className="panel__body" tabIndex={0} role="tabpanel" aria-label={tab === 'chat' ? 'Chat so far' : 'Your plan'}>
        {tab === 'chat' && (
          <ol className="panel__list" aria-label="Chat so far">
            {conv.entries.map((e) => (
              <li key={e.key}>
                <HistoryEntry entry={e} />
              </li>
            ))}
          </ol>
        )}
        {tab === 'plan' &&
          (items.length ? (
            <ol className="panel__list" aria-label="Your plan">
              {items.map((e) =>
                e.type === 'agent' ? (
                  <li key={e.key} data-item={e.msg.id} tabIndex={-1}>
                    <Guard>
                      <Card msg={e.msg} />
                    </Guard>
                  </li>
                ) : null,
              )}
            </ol>
          ) : (
            <p className="panel__empty">Nothing here yet. Your reasons, steps and plan appear here as Cap shows them.</p>
          ))}
      </div>
    </aside>
  )
}

/** Pixel icons for the two top corners. */
export function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true" fill="currentColor">
      <path d="M3 0h3v1H3zM1 1h2v1H1zM6 1h2v1H6zM1 2h7v1H1zM0 3h3v3H0zM6 3h3v3H6zM1 6h7v1H1zM1 7h2v1H1zM6 7h2v1H6zM3 8h3v1H3zM3 3h3v1H3zM3 5h3v1H3z" />
    </svg>
  )
}
export function NotebookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true" fill="currentColor">
      <path d="M1 0h7v1H1zM1 8h7v1H1zM1 1h1v7H1zM7 1h1v7H7zM3 2h3v1H3zM3 4h3v1H3zM3 6h2v1H3zM0 2h1v1H0zM0 4h1v1H0zM0 6h1v1H0z" />
    </svg>
  )
}
