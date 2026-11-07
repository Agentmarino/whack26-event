import type { DeclineDecoded } from 'shared'

type Part = 'reasons' | 'fix' | 'reapply' | 'rights'
const LIKELY_DOTS: Record<string, number> = { 'Most likely': 3, Likely: 2, Possible: 1 }

function Dots({ n }: { n: number }) {
  return (
    <svg width="27" height="7" viewBox="0 0 27 7" shapeRendering="crispEdges" aria-hidden="true" className="flex-none">
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={i * 10 + 0.5}
          y={0.5}
          width={6}
          height={6}
          fill={i < n ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={1}
        />
      ))}
    </svg>
  )
}

/** The decoded decline. With a `part`, only that part; without, all four. */
export function DeclineCard({ decline, part }: { decline: DeclineDecoded; part?: Part }) {
  const show = (p: Part) => !part || part === p
  return (
    <article className="slip p-3.5" data-card={`decline${part ? `-${part}` : ''}`} aria-label="About your decline">
      {show('reasons') && (
        <section>
          <h3 className="slip__title">
            Why {decline.lender} likely said no
            {decline.product ? <span className="mt-1 block font-body text-[0.9375rem] font-bold text-ink-muted">{decline.product}</span> : null}
          </h3>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.9375rem]">
            <dt className="text-ink-muted">The letter said</dt>
            <dd className="font-bold">{decline.stated}</dd>
            <dt className="text-ink-muted">Agency used</dt>
            <dd className="font-bold">{decline.agency}</dd>
          </dl>
          <ol className="mt-3 flex flex-col gap-2.5">
            {decline.reasons.map((r) => (
              <li key={r.id}>
                <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-muted">
                  <Dots n={LIKELY_DOTS[r.likelihood] ?? 1} />
                  {r.likelihood}
                </p>
                <p className="mt-0.5 text-[1.0625rem] font-bold leading-snug">{r.title}</p>
                <p className="text-[0.9375rem] leading-snug text-ink-muted">{r.evidence}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
      {show('fix') && (
        <section className={part ? undefined : 'mt-4 border-t-2 border-dashed border-paper-line pt-3'}>
          <h3 className="slip__tag">The one fix</h3>
          <p className="mt-2 text-[1.0625rem] font-bold leading-snug">{decline.fix.title}</p>
          <p className="mt-1 text-[0.9375rem] leading-snug">{decline.fix.how}</p>
        </section>
      )}
      {show('reapply') && (
        <section className={part ? undefined : 'mt-4 border-t-2 border-dashed border-paper-line pt-3'}>
          <h3 className="slip__tag">When to apply again</h3>
          <p className="mt-2 font-pixel text-sm leading-relaxed">Not before {decline.reapply.when}</p>
          <p className="mt-1 text-[0.9375rem] leading-snug">{decline.reapply.how}</p>
        </section>
      )}
      {show('rights') && (
        <section className={part ? undefined : 'mt-4 border-t-2 border-dashed border-paper-line pt-3'}>
          <h3 className="slip__tag">Your rights</h3>
          <ul className="mt-2 flex list-none flex-col gap-2 text-[0.9375rem] leading-snug">
            {decline.rights.map((r) => (
              <li key={r} className="flex gap-2">
                <span aria-hidden="true" className="mt-[0.4em] h-1.5 w-1.5 flex-none bg-ink" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
