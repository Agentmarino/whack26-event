import type { PlanId, PlanStep } from 'shared'
import { dayLabel, weekOf } from '../format'
import { useCards } from './context'

function useFactorLabel(id: string) {
  const { result } = useCards()
  return result?.result.diagnosis.factors.find((f) => f.id === id)?.label ?? null
}

/** One step of the plan: when, what (exact amounts and payees), why, and how you'll know it worked. */
export function StepCard(props: { step: PlanStep; plan: PlanId; stepIndex: number; total: number }) {
  const { step } = props
  const { showWhy, result } = useCards()
  const week = result ? weekOf(step.date, result.result.start) : null
  const worksOn = useFactorLabel(step.why)
  return (
    <article className="slip p-3" data-card="step" aria-label={`Step ${props.stepIndex + 1} of ${props.total}: ${step.title}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[1.1875rem] font-bold leading-snug">{step.title}</h3>
          <p className="mt-1 text-[0.9375rem] leading-snug">
            <span className="font-pixel text-[0.6875rem] text-[var(--bad-ink)]">{dayLabel(step.date)}</span>
            <span className="text-ink-muted">
              {week ? ` · week ${week}` : ''} · step {props.stepIndex + 1} of {props.total}
            </span>
          </p>
        </div>
        <WhyButton
          label={step.title}
          onClick={() =>
            showWhy({
              tag: `Why this step · rule ${step.because.rule}`,
              title: step.because.name,
              rows: [
                { label: 'Your data', value: step.because.dataPoint },
                ...(step.because.pointsSource ? [{ label: 'Where the points come from', value: step.because.pointsSource }] : []),
                ...(worksOn ? [{ label: 'Works on', value: worksOn }] : []),
              ],
              link: step.because.source,
            })
          }
        />
      </div>
      <p className="mt-2 text-[1.0625rem] leading-snug">{step.instruction}</p>
      <dl className="mt-2.5 flex flex-col gap-1.5 border-t-2 border-dashed border-paper-line pt-2.5 text-[0.9375rem] leading-snug">
        {worksOn && (
          <div className="flex gap-2">
            <dt className="flex-none font-bold">Why:</dt>
            <dd>it works on your {worksOn.toLowerCase()}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="flex-none font-bold">You'll know:</dt>
          <dd>{step.check}</dd>
        </div>
      </dl>
    </article>
  )
}

function WhyButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="btn btn--ink-quiet flex-none" onClick={onClick} aria-label={`Why? ${label}`} data-action="why">
      Why?
    </button>
  )
}

/** History: one line per step that opens to the whole card. */
export function StepLine(props: { step: PlanStep; plan: PlanId; stepIndex: number; total: number }) {
  return (
    <details className="group" data-card="step-line">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 py-1 text-[1.0625rem] leading-snug text-muted [&::-webkit-details-marker]:hidden">
        <span className="w-[5.25rem] flex-none font-bold text-text">{dayLabel(props.step.date)}</span>
        <span className="min-w-0 flex-1">{props.step.title}</span>
        <span aria-hidden="true" className="next-arrow flex-none -rotate-90 text-muted group-open:rotate-0" />
      </summary>
      <div className="mt-2">
        <StepCard {...props} />
      </div>
    </details>
  )
}
