// Picks the card for a message from its `ref`, resolved into `result` (never from copied text).
// A ref that does not resolve renders nothing: the message text still stands on its own.
import { resolveRef, type AgentMessage } from 'shared'
import { ToneIcon } from '../ui/Health'
import { BusinessCardRow, CARD_TEXT } from './BusinessCard'
import { useCards } from './context'
import { DeclineCard } from './DeclineCard'
import { LadderCard } from './LadderCard'
import { ProjectionCard } from './ProjectionCard'
import { ReasonCard } from './ReasonCard'
import { StepCard } from './StepCard'
import { WhatIfCard } from './WhatIfCard'

export function Card({ msg }: { msg: AgentMessage }) {
  const ctx = useCards()
  // 115: Cap's business card has no ref; its text is what a screen reader hears.
  if (msg.kind === 'card') {
    const text = msg.text || CARD_TEXT
    return <BusinessCardRow text={text} facialHair={ctx.facialHair} onOpen={(from) => ctx.openBusinessCard(from, text)} />
  }
  const r = resolveRef(msg.ref, ctx.result, { whatIfs: ctx.whatIfs, paperUrl: ctx.paperUrl })
  if (!r) {
    // The paper message before paperUrl arrives still gets its sheet.
    if (msg.kind === 'paper') return <PaperCard />
    return null
  }
  switch (r.on) {
    case 'factor':
      return <ReasonCard factor={r.factor} rank={r.rank} said={msg.text} />
    case 'decline':
      return <DeclineCard decline={r.decline} part={r.part} />
    case 'flags':
      return r.flags.length ? <FlagsCard flags={r.flags} /> : null
    case 'paper':
      return <PaperCard />
    case 'step':
      return <StepCard step={r.step} plan={r.plan} stepIndex={r.stepIndex} total={r.total} />
    case 'projection':
      return <ProjectionCard plan={r.plan} plans={r.plans} riskLine={r.riskLine} scaleMax={r.scaleMax} bureau={r.bureau} />
    case 'ladder':
      return <LadderCard ladder={r.ladder} />
    case 'whatif':
      return <WhatIfCard run={r.whatIf} plan={ctx.whatIfPlans[r.whatIf.id] ?? ctx.plan} />
    case 'headline':
      return null
  }
}

function FlagsCard({ flags }: { flags: string[] }) {
  return (
    <article className="slip p-3.5" data-card="flags" aria-label="Spending that stands out">
      <h3 className="slip__tag">In your spending</h3>
      <ul className="mt-2 flex flex-col gap-1.5">
        {flags.map((f) => (
          <li key={f} className="flex items-center gap-2 text-[1.0625rem] leading-snug">
            <span className="pill tone-warn !p-1">
              <ToneIcon tone="warn" />
            </span>
            {f}
          </li>
        ))}
      </ul>
    </article>
  )
}

function PaperCard() {
  const { openPaper } = useCards()
  return (
    <article className="slip flex items-center gap-3 p-3.5" data-card="paper" aria-label="Your summary sheet">
      <svg width="40" height="50" viewBox="0 0 8 10" shapeRendering="crispEdges" aria-hidden="true" className="flex-none">
        <rect x="0" y="0" width="8" height="10" fill="var(--halo)" />
        <rect x="1" y="1" width="6" height="8" fill="var(--paper)" />
        <rect x="2" y="2" width="4" height="1" fill="var(--accent)" />
        <rect x="2" y="4" width="4" height="1" fill="var(--ink-muted)" />
        <rect x="2" y="6" width="3" height="1" fill="var(--ink-muted)" />
      </svg>
      <div className="min-w-0 flex-1">
        <h3 className="text-[1.0625rem] font-bold leading-snug">Your summary, on one sheet</h3>
        <p className="text-sm text-ink-muted">It's on the desk too. Tap the sheet.</p>
      </div>
      <button type="button" className="btn btn--ink flex-none" onClick={openPaper} data-action="open-paper">
        Read it
      </button>
    </article>
  )
}
