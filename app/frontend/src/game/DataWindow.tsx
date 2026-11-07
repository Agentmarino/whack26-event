// 116: the small game window above the dialogue box, like an item pop-up: the one thing worth seeing
// for a data moment (a reason's key fact and health, a step's date and title, a tiny chart, the card on
// the ladder...). "Details" opens the side panel at the full card; a reason also has "Why?".
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { resolveRef, type AgentMessage, type Factor, type RunResult } from 'shared'
import { useCards } from '../cards/context'
import { dayLabel, range } from '../format'
import { RAG_TONE, RAG_WORD, ToneIcon } from '../ui/Health'

/** "£950 of £1,200 = 79%; worst card Barclaycard 79%" → "79% of your £1,200 limit used" where the data allows. */
function keyFact(f: Factor): string {
  const first = f.because.dataPoint.split(/;\s*|\s·\s/)[0]?.trim() ?? ''
  const used = first.match(/^£[\d,]+ of (£[\d,]+) = (\d+%)$/)
  if (used) return `${used[2]} of your ${used[1]} limit used`
  return first
}

/** Ten pixel blocks for 0..100, with the word: never colour alone. */
function HealthBar({ factor }: { factor: Factor }) {
  const on = Math.max(1, Math.round(factor.health / 10))
  const tone = RAG_TONE[factor.rag]
  return (
    <div className="gwin__health">
      <span className={`gwin__word tone-${tone}`}>
        <ToneIcon tone={tone} /> {RAG_WORD[factor.rag]}
      </span>
      <span className="gwin__bar" role="img" aria-label={`Health ${factor.health} out of 100`}>
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} className={i < on ? `on tone-${tone}` : undefined} />
        ))}
      </span>
    </div>
  )
}

/** A tiny pixel chart: the plan's estimated midpoints, month by month. */
function MiniChart({ plans, plan, scaleMax }: { plans: RunResult['plans']; plan: '3m' | '6m'; scaleMax: number }) {
  const pts = plans[plan].projection
  const mids = pts.map((p) => (p.low + p.high) / 2)
  const lo = Math.min(...mids) - 10
  const hi = Math.max(...mids) + 10
  const w = 6 * pts.length
  return (
    <svg className="gwin__chart" viewBox={`0 0 ${w} 24`} shapeRendering="crispEdges" aria-hidden="true">
      {mids.map((m, i) => {
        const h = Math.max(2, Math.round(((m - lo) / Math.max(1, hi - lo)) * 22))
        return <rect key={i} x={i * 6} y={24 - h} width={4} height={h} />
      })}
      <title>{`Estimate up to ${scaleMax}`}</title>
    </svg>
  )
}

/**
 * `minTop`: the y (CSS px) where Cap's desk ends. The window never reaches above it: when the box is tall
 * (a menu) and there is no floor left, it shrinks to its title and buttons, and if that still covers the
 * desk it steps aside (the item is in the notebook). Checked again whenever the box changes size.
 */
export function DataWindow({ msg, onDetails, minTop }: { msg: AgentMessage; onDetails: (msgId: string) => void; minTop: number }) {
  const ctx = useCards()
  const ref = useRef<HTMLElement>(null)
  const [tick, setTick] = useState(0)
  const fitKey = `${msg.id}:${minTop}:${tick}`
  const [fit, setFit] = useState({ key: '', level: 0 })
  const level = fit.key === fitKey ? fit.level : 0
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || level >= 2) return
    if (el.getBoundingClientRect().top < minTop - 1) setFit({ key: fitKey, level: level + 1 })
  })
  useEffect(() => {
    const box = document.querySelector('.gbox')
    if (!box) return
    const ro = new ResizeObserver(() => setTick((t) => t + 1))
    ro.observe(box)
    return () => ro.disconnect()
  }, [])
  let r
  try {
    r = resolveRef(msg.ref, ctx.result, { whatIfs: ctx.whatIfs, paperUrl: ctx.paperUrl })
  } catch {
    r = null
  }
  if (!r && msg.kind !== 'paper') return null

  let tag = ''
  let title = ''
  let body: React.ReactNode = null
  let why: (() => void) | null = null
  if (!r || r.on === 'paper') {
    tag = 'Item'
    title = 'Your summary'
    body = <p className="gwin__fact">One sheet with all of it.</p>
  } else
    switch (r.on) {
      case 'factor': {
        const f = r.factor
        tag = `Reason ${r.rank + 1}`
        title = f.label
        body = (
          <>
            <HealthBar factor={f} />
            <p className="gwin__fact">{keyFact(f)}</p>
          </>
        )
        why = () =>
          ctx.showWhy({
            tag: 'Why this reason',
            title: f.label,
            rows: [
              { label: 'The rule', value: f.because.rule },
              { label: 'Your data', value: f.because.dataPoint },
              { label: 'How much it counts', value: `About ${Math.round(f.weight * 100)}% of the picture. ${f.because.weightSource}` },
            ],
            link: f.because.source,
          })
        break
      }
      case 'step':
        tag = `Step ${r.stepIndex + 1} of ${r.total}`
        title = r.step.title
        body = <p className="gwin__fact">{dayLabel(r.step.date)}</p>
        break
      case 'projection': {
        const end = r.plans[r.plan].projection.at(-1)
        tag = 'Estimate'
        title = end ? `${range(end)} by ${end.date}` : 'Your estimate'
        body = <MiniChart plans={r.plans} plan={r.plan} scaleMax={r.scaleMax} />
        break
      }
      case 'ladder':
        tag = 'Next card'
        title = r.ladder.entry ? r.ladder.entry.name : 'No new card for now'
        body = r.ladder.entry && r.ladder.applyFrom ? <p className="gwin__fact">From {dayLabel(r.ladder.applyFrom).replace(/^\w+ \d+ /, '')}</p> : null
        break
      case 'decline': {
        const top = r.decline.reasons[0]
        tag = r.part === 'fix' ? 'The one fix' : r.part === 'reapply' ? 'Try again' : r.part === 'rights' ? 'Your rights' : 'Why they said no'
        title = r.part === 'fix' ? r.decline.fix.title : r.part === 'reapply' ? `Not before ${r.decline.reapply.when}` : r.decline.lender
        body =
          !r.part || r.part === 'reasons' ? (
            <p className="gwin__fact">{top ? `${top.likelihood}: ${top.title}` : 'No clear reason on file'}</p>
          ) : null
        break
      }
      case 'whatif': {
        const k = ctx.whatIfPlans[r.whatIf.id] === '6m' ? 'm6' : 'm3'
        tag = 'What if'
        title = `${range(r.whatIf.output.before[k])} → ${range(r.whatIf.output.after[k])}`
        body = <p className="gwin__fact">An estimate</p>
        break
      }
      default:
        return null
    }

  return (
    <aside
      ref={ref}
      className={level === 1 ? 'gwin gwin--compact' : 'gwin'}
      hidden={level >= 2}
      aria-label={`${tag}: ${title}`}
      data-testid="data-window"
      data-window={r?.on ?? 'paper'}
      data-fit={level === 0 ? 'full' : level === 1 ? 'compact' : 'hidden'}
      // measured again once the pop-in (a scale) has finished: mid-animation the window looks smaller
      onAnimationEnd={() => setTick((t) => t + 1)}
    >
      <p className="gwin__tag">{tag}</p>
      <p className="gwin__title">{title}</p>
      {body}
      <div className="gwin__actions">
        {why && (
          <button type="button" className="gbtn gbtn--small" onClick={why} data-action="why">
            Why?
          </button>
        )}
        {(!r || r.on === 'paper') && (
          <button type="button" className="gbtn gbtn--small" onClick={ctx.openPaper} data-action="open-paper">
            Read it
          </button>
        )}
        <button type="button" className="gbtn gbtn--small" onClick={() => onDetails(msg.id)} data-action="details">
          Details
        </button>
      </div>
    </aside>
  )
}
