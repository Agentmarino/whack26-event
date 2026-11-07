import type { PlanId, WhatIfRun } from 'shared'
import { range, signed } from '../format'

/**
 * Before and after for the plan the person chose. What-ifs compare against the plan, not against doing
 * nothing (conversation.md): when the estimate does not go up, say it stays, never show a lower number.
 */
export function WhatIfCard({ run, plan }: { run: WhatIfRun; plan: PlanId }) {
  const o = run.output
  const key = plan === '3m' ? 'm3' : 'm6'
  const before = o.before[key]
  const after = o.after[key]
  const delta = o.delta[key]
  const up = delta.low > 0 || delta.high > 0
  // Taking something good away (off the roll, no rent reporting, a slider "set") can really lower it:
  // the backend says so (templates.ts whatIfMessage), so the card shows it too. Otherwise "stays".
  const down =
    !up && (delta.low < 0 || delta.high < 0) && run.changes.some((c) => ('value' in c && c.value === false) || c.lever === 'set')
  const pts = o.result.plans[plan].projection
  const by = pts[pts.length - 1]?.date ?? ''
  const b = o.because
  return (
    <article className="slip p-3" data-card="whatif" aria-label="What if">
      <h3 className="slip__tag">What if · estimate</h3>
      <ul className="mt-1.5 flex flex-col gap-0.5 text-[1.0625rem] font-bold leading-snug">
        {o.applied.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      <dl className="mt-2.5 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 border-t-2 border-dashed border-paper-line pt-2.5">
        <dt className="text-[0.9375rem] text-ink-muted">Your plan, by {by}</dt>
        <dd className="text-[1.0625rem] tabular-nums">{range(before)}</dd>
        <dt className="text-[0.9375rem] text-ink-muted">With this</dt>
        <dd className="text-[1.1875rem] font-bold tabular-nums">
          {up || down ? (
            <>
              {range(after)}{' '}
              <span className={`pill ${up ? 'tone-good' : 'tone-bad'} !px-1.5 !py-0 !text-sm`}>
                {signed(delta.low)} to {signed(delta.high)}
              </span>
            </>
          ) : (
            <>stays at {range(before)}</>
          )}
        </dd>
      </dl>
      {!up && !down && (
        <p className="mt-1.5 text-[0.9375rem] leading-snug">Your plan already gets you there, so this doesn't add points by then.</p>
      )}
      {down && <p className="mt-1.5 text-[0.9375rem] leading-snug">This would lower your estimate. Better to keep it.</p>}
      {(b.under30 || b.nextCard) && (
        <ul className="mt-2 flex flex-col gap-1 text-[0.9375rem] leading-snug">
          {b.under30 && b.under30.before !== b.under30.after && (
            <li>
              Cards under 30%: <span className="font-bold">{b.under30.after ?? 'later'}</span> instead of {b.under30.before ?? 'not in the plan'}
            </li>
          )}
          {b.nextCard && b.nextCard.before !== b.nextCard.after && (
            <li>
              Ready for the next card: <span className="font-bold">{b.nextCard.after ?? 'later'}</span> instead of {b.nextCard.before ?? 'later'}
            </li>
          )}
        </ul>
      )}
      {(b.stepsAdded.length > 0 || b.stepsRemoved.length > 0) && (
        <details className="mt-2">
          <summary className="flex min-h-11 cursor-pointer items-center text-[0.9375rem] font-bold underline underline-offset-4">
            What changes in your plan
          </summary>
          <ul className="flex flex-col gap-1 text-[0.9375rem] leading-snug">
            {b.stepsAdded.map((s) => (
              <li key={`+${s}`}>
                <span className="font-bold">Added:</span> {s}
              </li>
            ))}
            {b.stepsRemoved.map((s) => (
              <li key={`-${s}`} className="text-ink-muted">
                <span className="font-bold">No longer needed:</span> {s}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  )
}
