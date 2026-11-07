import type { Ladder } from 'shared'
import { gbp, monthLabel } from '../format'
import { ToneIcon } from '../ui/Health'

/** The Capital One card ladder: the entry card, what to put on it, and when you can move up. */
export function LadderCard({ ladder }: { ladder: Ladder }) {
  const e = ladder.entry
  if (!e)
    return (
      <article className="slip p-3" data-card="ladder" aria-label="Your next card">
        <p className="slip__tag">Your next card</p>
        <p className="mt-1.5 text-[1.0625rem] font-bold leading-snug">No new card for now</p>
        <p className="mt-1 text-[1.0625rem] leading-snug">{ladder.reason}</p>
      </article>
    )
  const tx = ladder.tx
  const pct = tx && tx.limitAssumed > 0 ? Math.round((tx.total / tx.limitAssumed) * 100) : null
  return (
    <article className="slip p-3" data-card="ladder" aria-label={`Your next card: ${e.name}`}>
      <p className="slip__tag">Your next card · Capital One</p>
      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="slip__title">{e.name}</h3>
        <p className="text-[0.9375rem] font-bold">{e.apr}% APR</p>
      </div>
      <p className="mt-1 text-[0.9375rem] leading-snug text-ink-muted">
        Limit {e.limit}
        {ladder.applyFrom ? ` · apply from ${monthLabel(ladder.applyFrom)}` : ''}. {e.note}
      </p>
      <p className="mt-2 text-[1.0625rem] leading-snug">{ladder.reason}</p>
      {ladder.saving && <p className="mt-1.5 text-[1.0625rem] font-bold leading-snug">{ladder.saving}</p>}

      {tx && tx.chosen.length > 0 && (
        <section className="mt-3 border-t-2 border-dashed border-paper-line pt-2.5">
          <h4 className="slip__tag">Put only these on it</h4>
          <ul className="mt-1.5 flex flex-col gap-1 text-[1.0625rem]">
            {tx.chosen.map((c) => (
              <li key={c.name} className="flex justify-between gap-3">
                <span>{c.name}</span>
                <span className="font-bold tabular-nums">{gbp(c.amount)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 border-t-2 border-paper-line pt-1 font-bold">
              <span>A month</span>
              <span className="tabular-nums">{gbp(tx.total)}</span>
            </li>
          </ul>
          {pct !== null && (
            <p className="mt-1 text-[0.9375rem] leading-snug text-ink-muted">
              That's {pct}% of a {gbp(tx.limitAssumed)} starting limit. Pay it off in full by Direct Debit every month.
            </p>
          )}
        </section>
      )}

      {ladder.graduation.length > 0 && (
        <section className="mt-3 border-t-2 border-dashed border-paper-line pt-2.5">
          <h4 className="slip__tag">Ready to move up when</h4>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {ladder.graduation.map((g) => (
              <li key={g.label} className="flex items-start gap-2 text-[0.9375rem] leading-snug">
                <span className={`pill ${g.ok ? 'tone-good' : 'tone-neutral'} !p-1`}>
                  <ToneIcon tone={g.ok ? 'good' : 'neutral'} size={12} />
                </span>
                <span className="min-w-0 flex-1">
                  {g.label}
                  <span className="sr-only">{g.ok ? ': done' : ': not yet'}</span>
                </span>
                <span className={`flex-none text-right ${g.ok ? 'font-bold' : 'text-ink-muted'}`}>
                  {g.ok ? 'done' : g.when === 'not within 12 months' ? 'not in 12 months' : `from ${g.when}`}
                </span>
              </li>
            ))}
          </ul>
          {ladder.graduateWhen && (
            <p className="mt-2 text-[1.0625rem] font-bold leading-snug">All ticked by {ladder.graduateWhen} (estimate).</p>
          )}
        </section>
      )}
      <p className="mt-3 flex items-start gap-2 bg-paper-shade p-2 text-[0.9375rem] leading-snug">
        <span className="font-bold">Check with QuickCheck first.</span>
        <span>It's a soft search: it shows you your chances and leaves no mark on your file.</span>
      </p>
    </article>
  )
}
