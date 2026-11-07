import type { Factor } from 'shared'
import { HealthMeter, HealthPill } from '../ui/Health'
import { useCards } from './context'

/** "£950 of £1,200 = 79%; worst card Barclaycard 79%" -> two chips. */
const evidence = (dataPoint: string) =>
  dataPoint
    .split(/;\s*|\s·\s/)
    .map((s) => s.trim())
    .filter(Boolean)

/**
 * A factor from the diagnosis. `said` is the agent's line: when it is the factor's own reason word for word,
 * the card does not print it a second time (it shows it whenever the wording differs, e.g. Claude's).
 */
export function ReasonCard({ factor, rank, total = 3, said }: { factor: Factor; rank: number; total?: number; said?: string }) {
  const { showWhy } = useCards()
  const pct = Math.round(factor.weight * 100)
  const repeat = said?.trim() !== factor.reason.trim()
  return (
    <article className="slip p-3" aria-label={`Reason ${rank + 1}: ${factor.label}`} data-card="reason">
      <div className="flex items-start justify-between gap-2">
        <h3 className="slip__title min-w-0 pt-1">{factor.label}</h3>
        <button
          type="button"
          className="btn btn--ink-quiet flex-none"
          data-action="why"
          aria-label={`Why? How ${factor.label.toLowerCase()} was worked out`}
          onClick={() =>
            showWhy({
              tag: 'Why this reason',
              title: factor.label,
              rows: [
                { label: 'The rule', value: factor.because.rule },
                { label: 'Your data', value: factor.because.dataPoint },
                { label: 'How much it counts', value: `About ${pct}% of the picture. ${factor.because.weightSource}` },
              ],
              link: factor.because.source,
            })
          }
        >
          Why?
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <HealthPill rag={factor.rag} health={factor.health} />
        <div className="w-24 flex-none">
          <HealthMeter rag={factor.rag} health={factor.health} />
        </div>
        <p className="text-sm text-ink-muted">
          Counts for about {pct}% · reason {rank + 1} of {Math.max(total, rank + 1)}
        </p>
      </div>
      {repeat && <p className="mt-2.5 text-[1.0625rem] leading-snug">{factor.reason}</p>}
      <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="From your data">
        {evidence(factor.because.dataPoint).map((e) => (
          <li key={e} className="pill tone-neutral !font-normal !text-sm !whitespace-normal">
            {e}
          </li>
        ))}
      </ul>
    </article>
  )
}
