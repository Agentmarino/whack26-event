// The chat column: a short history, then the agent's current line in the dialogue box with its card.
// Agent text is real DOM text. The current line types out visually (aria-hidden spans); the screen
// reader copy lives in the app's one polite live region (App.tsx), so each line is read once, in full.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { resolveRef, type AgentMessage } from 'shared'
import { Card } from '../cards/Card'
import { useCards } from '../cards/context'
import { CompactCard } from '../cards/CompactCard'
import { Guard } from '../ui/Guard'
import { ToneIcon } from '../ui/Health'
import { termsIn, type Term } from './glossary'
import type { ConvState, Entry } from './useConversation'

export const AGENT_NAME = 'Credit agent'

export function Transcript(props: {
  conv: ConvState
  printed: number
  typed: boolean
  onAdvance: () => void
}) {
  const { conv } = props
  const scroller = useRef<HTMLDivElement>(null)
  const tail = conv.currentKey ?? `${conv.entries.length}:${conv.pending ? 'p' : ''}:${conv.error ? 'e' : ''}`

  // Keep the newest thing in view: the whole of it if it fits (history peeks above), else its top.
  // Instant, not smooth: the previous card folds into a one-line step as the new one lands, and a
  // smooth scroll would race that.
  useLayoutEffect(() => {
    const box = scroller.current
    const el = box?.querySelector<HTMLElement>('[data-latest]')
    if (!box || !el) return
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop
    const fits = el.offsetHeight <= box.clientHeight - 8
    box.scrollTop = fits ? box.scrollHeight - box.clientHeight : Math.max(0, top - 12)
  }, [tail])

  const last = conv.entries[conv.entries.length - 1]
  return (
    <div
      ref={scroller}
      className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-2"
      data-testid="transcript"
      // focusable so a keyboard user can scroll a tall card with the arrow keys (Safari will not otherwise)
      tabIndex={0}
      role="region"
      aria-label="Conversation so far. Use the arrow keys to scroll."
    >
      <ol className="flex flex-col gap-3" aria-label="Conversation so far">
        {conv.entries.map((e) => {
          const latest = !conv.pending && !conv.error && e === last
          if (e.type === 'agent' && e.key === conv.currentKey)
            return (
              <li key={e.key} data-latest={latest || undefined} data-current>
                <CurrentLine msg={e.msg} printed={props.printed} typed={props.typed} onAdvance={props.onAdvance} more={conv.queue.length} />
              </li>
            )
          return (
            <li key={e.key} data-latest={latest || undefined}>
              <HistoryEntry entry={e} />
            </li>
          )
        })}
        {conv.pending && (
          <li data-latest>
            <DialogueFrame>
              <p className="dlg__text flex items-center gap-3 text-muted" data-testid="pending">
                <Dots /> <span>{conv.pending.label}</span>
              </p>
            </DialogueFrame>
          </li>
        )}
        {conv.error && !conv.pending && (
          <li data-latest>
            <DialogueFrame>
              <p className="dlg__text" data-testid="error">
                {conv.error}
              </p>
            </DialogueFrame>
          </li>
        )}
      </ol>
    </div>
  )
}

function DialogueFrame({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <section className="dlg mt-2.5 px-3.5 pt-4 pb-2.5" onClick={onClick}>
      <span className="dlg__name absolute -top-3 left-3" aria-hidden="true">
        {AGENT_NAME}
      </span>
      {children}
    </section>
  )
}

function Dots() {
  return (
    <span className="inline-flex gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <i key={i} className="next-arrow--blink block h-2 w-2 bg-current" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
    </span>
  )
}

function CurrentLine(props: { msg: AgentMessage; printed: number; typed: boolean; onAdvance: () => void; more: number }) {
  const { msg } = props
  const ctx = useCards()
  const [open, setOpen] = useState<string | null>(null)
  const terms = termsIn(msg.text, ...cardTexts(msg, ctx))
  const chars = [...msg.text]
  return (
    <div className="flex flex-col gap-2.5" data-kind={msg.kind} data-message-id={msg.id}>
      <DialogueFrame onClick={props.onAdvance}>
        <p className="dlg__text cursor-pointer pr-6" aria-hidden="true" data-testid="dialogue-text">
          {chars.map((c, i) => (
            <span key={i} className={i < props.printed ? undefined : 'unprinted'}>
              {c}
            </span>
          ))}
        </p>
        {(!props.typed || props.more > 0) && (
          <span className="absolute right-2.5 bottom-2 text-text" aria-hidden="true">
            <span className={props.typed ? 'next-arrow next-arrow--blink' : 'next-arrow opacity-50'} />
          </span>
        )}
      </DialogueFrame>
      <Guard>
        <Card msg={msg} />
      </Guard>
      {props.typed && terms.length > 0 && <Explain terms={terms} open={open} setOpen={setOpen} />}
    </div>
  )
}

function Explain(props: { terms: Term[]; open: string | null; setOpen: (f: (o: string | null) => string | null) => void }) {
  const { terms, open, setOpen } = props
  return (
    <div className="px-1" data-testid="explain">
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="text-sm text-muted">Explain:</span>
        {terms.map((t) => (
          <button
            key={t.id}
            type="button"
            className="min-h-11 min-w-11 px-1 text-base font-bold text-text underline decoration-dotted decoration-2 underline-offset-4"
            aria-expanded={open === t.id}
            data-term={t.id}
            onClick={() => setOpen((o) => (o === t.id ? null : t.id))}
          >
            {t.word}
          </button>
        ))}
      </div>
      {terms
        .filter((t) => t.id === open)
        .map((t) => (
          <p key={t.id} className="pb-1 text-base leading-snug text-text" data-testid="term-explain">
            <span className="font-bold">{t.word}: </span>
            {t.explain}
          </p>
        ))}
    </div>
  )
}

/** Card text the glossary should look at (so "hard search" in a decline reason gets explained too). */
function cardTexts(msg: AgentMessage, ctx: ReturnType<typeof useCards>): string[] {
  try {
    return cardTextsUnsafe(msg, ctx)
  } catch {
    return []
  }
}
function cardTextsUnsafe(msg: AgentMessage, ctx: ReturnType<typeof useCards>): string[] {
  const r = resolveRef(msg.ref, ctx.result, { whatIfs: ctx.whatIfs, paperUrl: ctx.paperUrl })
  if (!r) return []
  switch (r.on) {
    case 'factor':
      return [r.factor.label, r.factor.reason]
    case 'decline':
      return r.part === 'reasons' || !r.part ? r.decline.reasons.flatMap((x) => [x.title, x.evidence]) : []
    case 'step':
      return [r.step.title, r.step.instruction]
    case 'ladder':
      return [r.ladder.reason, ...r.ladder.graduation.map((g) => g.label)]
    default:
      return []
  }
}

function HistoryEntry({ entry }: { entry: Entry }) {
  if (entry.type === 'you')
    return (
      <div className="ml-auto flex max-w-[85%] flex-col items-end gap-1" data-entry="you">
        <p className="border-2 border-you-edge bg-you px-3 py-2 text-[1.0625rem] leading-snug text-text">
          <span className="sr-only">You: </span>
          {entry.text}
        </p>
        {entry.findings && entry.findings.length > 0 && (
          <ul className="flex flex-col items-end gap-1 text-sm text-muted" aria-label="What the agent read from it">
            {entry.findings.slice(0, 4).map((f) => (
              <li key={f.label} className="flex items-center gap-1.5">
                <span className="font-bold text-text">{f.label}:</span> {f.value}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  if (entry.type === 'notice')
    return (
      <p className="flex items-start gap-2 border-2 border-[var(--warn-edge)] bg-panel px-3 py-2 text-[1.0625rem] leading-snug" data-entry="notice">
        <span className="mt-1 text-[var(--warn-edge)]">
          <ToneIcon tone="warn" />
        </span>
        <span>{entry.text}</span>
      </p>
    )
  return <AgentHistory msg={entry.msg} />
}

function AgentHistory({ msg }: { msg: AgentMessage }) {
  const ctx = useCards()
  // A step folds into its one-line card; if its ref does not resolve, the text stands on its own.
  const stepLine = msg.kind === 'step' && resolveRef(msg.ref, ctx.result)?.on === 'step'
  return (
    <div className="flex flex-col gap-2" data-entry="agent" data-kind={msg.kind}>
      {!stepLine && (
        <p className="text-[1.0625rem] leading-snug text-muted">
          <span className="sr-only">{AGENT_NAME}: </span>
          {msg.text}
        </p>
      )}
      <Guard>
        <CompactCard msg={msg} />
      </Guard>
    </div>
  )
}
