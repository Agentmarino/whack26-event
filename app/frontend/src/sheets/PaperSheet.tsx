// The summary sheet the agent slides across the desk: a paper-styled overlay with the same data the
// cards use, and a Download button for the backend's PDF (paperUrl). No PDF yet: "Summary not ready yet".
import { useState } from 'react'
import type { EngineResult, PlanId } from 'shared'
import type { Api } from '../api/client'
import { dayLabel, range } from '../format'
import { HealthPill } from '../ui/Health'
import { Sheet } from '../ui/Sheet'

export function PaperSheet(props: {
  open: boolean
  onClose: () => void
  api: Api
  result: EngineResult | null
  paperUrl: string | null
  plan: PlanId
  planChosen: boolean
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'missing'>('idle')
  const r = props.result?.result
  const decline = props.result?.decline
  const plan = r?.plans[props.plan]
  const end = plan?.projection[plan.projection.length - 1]

  const download = async () => {
    if (!props.paperUrl) {
      setStatus('missing')
      return
    }
    setStatus('loading')
    const blob = await props.api.paper(props.paperUrl)
    if (!blob) {
      setStatus('missing')
      return
    }
    setStatus('idle')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'credit-summary.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }

  return (
    <Sheet
      open={props.open}
      onClose={() => {
        setStatus('idle')
        props.onClose()
      }}
      tag="Capital One desk · summary"
      title="Your credit, on one sheet"
      testId="paper-sheet"
      footer={
        <div className="flex flex-col gap-2 border-t-2 border-dashed border-paper-line pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn--ink" onClick={download} disabled={status === 'loading'} data-action="download">
              {status === 'loading' ? 'Getting it…' : 'Download'}
            </button>
            <p role="status" className="text-[0.9375rem] font-bold" data-testid="paper-status">
              {status === 'missing' ? 'Summary not ready yet' : ''}
            </p>
          </div>
          <p className="text-sm text-ink-muted">Estimates for a demo. Not financial advice and not a lending decision.</p>
        </div>
      }
    >
      {!r ? (
        <p className="text-[1.0625rem]">Your summary appears here once the agent has looked at your file.</p>
      ) : (
        <div className="flex flex-col gap-4 text-[1.0625rem] leading-snug">
          <section>
            <p className="slip__tag">
              {r.bureau} score {r.profile.score ?? '–'} of {r.scaleMax}
            </p>
            <p className="mt-1 text-[1.1875rem] font-bold">{r.headline}</p>
          </section>
          <section>
            <h3 className="slip__tag">What holds it back</h3>
            <ol className="mt-2 flex flex-col gap-2">
              {r.diagnosis.ranked.slice(0, 3).map((f, i) => (
                <li key={f.id} className="flex flex-col gap-1">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    {i + 1}. {f.label} <HealthPill rag={f.rag} />
                  </p>
                  <p>{f.reason}</p>
                  <p className="text-sm text-ink-muted">From your data: {f.because.dataPoint}</p>
                </li>
              ))}
            </ol>
          </section>
          {decline && (
            <section>
              <h3 className="slip__tag">Your {decline.lender} decline</h3>
              <p className="mt-1">
                Most likely: {decline.reasons.filter((x) => x.likelihood === 'Most likely').map((x) => x.title.toLowerCase()).join(', ') || decline.reasons[0]?.title}.
              </p>
              <p className="mt-1">
                <span className="font-bold">The one fix:</span> {decline.fix.title}. Don't apply again before {decline.reapply.when}.
              </p>
            </section>
          )}
          {props.planChosen && plan && end && (
            <section>
              <h3 className="slip__tag">Your {props.plan === '3m' ? '3-month' : '6-month'} plan</h3>
              <ol className="mt-2 flex flex-col gap-1">
                {plan.steps.map((s, i) => (
                  <li key={`${s.title}-${i}`} className="grid grid-cols-[5.5rem_1fr] gap-2">
                    <span className="text-ink-muted">{dayLabel(s.date)}</span>
                    <span>{s.title}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 font-bold">
                By {end.date}: {range(end)} (estimate)
              </p>
            </section>
          )}
          {r.ladder?.entry && (
            <section>
              <h3 className="slip__tag">Next card</h3>
              <p className="mt-1">
                {r.ladder.entry.name}. Check with QuickCheck first.
              </p>
            </section>
          )}
          {decline && (
            <section>
              <h3 className="slip__tag">Your rights</h3>
              <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
                {decline.rights.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Sheet>
  )
}
