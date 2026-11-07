// The score estimate as a small SVG chart, months 0 to 6. Both plans are bands (low to high) with a
// midpoint line; the chosen one is solid, the other hatched, so they differ without colour. The dotted
// line is where one missed payment would put you. Every label says "estimate". Months are plotted by
// `month`; the engine's `date` ("Feb 2027") is only ever printed, never parsed.
import { useId } from 'react'
import type { PlanId, ProjectionPoint, RunResult } from 'shared'
import { range, shortMonth } from '../format'
import { useSettings } from '../settings'

const mid = (p: ProjectionPoint) => Math.round((p.low + p.high) / 2)

export function ProjectionCard(props: { plan: PlanId; plans: RunResult['plans']; riskLine: number; scaleMax: number; bureau: string }) {
  const { settings } = useSettings()
  const uid = useId().replace(/:/g, '')
  const chosen = props.plans[props.plan].projection
  const other: PlanId = props.plan === '3m' ? '6m' : '3m'
  const otherPts = props.plans[other].projection
  const all = [...props.plans['3m'].projection, ...props.plans['6m'].projection]
  const start = chosen[0]
  const end = chosen[chosen.length - 1]
  const otherEnd = otherPts[otherPts.length - 1]
  if (!start || !end || !otherEnd) return null

  // Text scales with the text-size setting: a bigger k shrinks the plot around the same text size.
  const k = settings.textSize / 100
  const W = 340
  const font = 11 * k
  const pad = { l: 34 * k, r: 12, t: 26 * k, b: 22 * k }
  const H = 200 + 30 * (k - 1)
  const months = Math.max(...all.map((p) => p.month))
  const risk = chosen.map((p) => ({ month: p.month, v: p.month === 0 ? p.low : Math.max(0, mid(p) - props.riskLine) }))
  const lo = Math.floor((Math.min(...all.map((p) => p.low), ...risk.map((r) => r.v)) - 45) / 25) * 25
  const hi = Math.min(props.scaleMax, Math.ceil((Math.max(...all.map((p) => p.high)) + 30) / 25) * 25)
  const x = (m: number) => pad.l + (m / months) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b)
  const band = (pts: ProjectionPoint[]) =>
    [...pts.map((p) => `${x(p.month)},${y(p.high)}`), ...[...pts].reverse().map((p) => `${x(p.month)},${y(p.low)}`)].join(' ')
  const line = (pts: { month: number; v: number }[]) => pts.map((p) => `${x(p.month)},${y(p.v)}`).join(' ')
  const ticks = [lo, Math.round((lo + hi) / 2 / 25) * 25, hi]
  const label = (p: PlanId) => (p === '3m' ? '3-month plan' : '6-month plan')
  // the lowest point of the missed-payment line carries its label
  const dip = risk.slice(1).reduce((a, b) => (b.v < a.v ? b : a), risk[1] ?? risk[0]!)
  // Bigger text: the short label (the key under the chart says "if you miss one payment" in full).
  const riskLabel = k > 1 ? `−${props.riskLine} (estimate)` : `−${props.riskLine} if you miss one payment (estimate)`
  // does it fit to the right of the dip? (about 0.55 em per character) If not, it goes to the left.
  const dipRight = x(dip.month) + 6 + riskLabel.length * font * 0.55 > W - pad.r

  return (
    <article className="slip p-3" data-card="projection" aria-label="Your score estimate">
      <h3 className="slip__title">Your {props.bureau} score, estimated</h3>
      {/* The agent's line says the range in words; the card adds the picture and the other plan. */}
      <p className="sr-only">
        {range(end)} by {end.date} on your {label(props.plan)}, from {start.low} now. An estimate, not a promise.
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 block h-auto w-full"
        role="img"
        aria-labelledby={`${uid}-t`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <title id={`${uid}-t`}>
          {`Estimated ${props.bureau} score. ${label(props.plan)}: ${range(end)} by ${end.date}. ${label(other)}: ${range(otherEnd)} by ${otherEnd.date}. Missing one payment could cost about ${props.riskLine} points. All estimates.`}
        </title>
        <defs>
          <pattern id={`${uid}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--paper)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--chart-b)" strokeWidth="2" />
          </pattern>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--paper-line)" strokeWidth="1" />
            <text x={pad.l - 5} y={y(t) + font / 3} fontSize={font} textAnchor="end" fill="var(--ink-muted)">
              {t}
            </text>
          </g>
        ))}
        {/* other plan: hatched band, dashed midpoint */}
        <polygon points={band(otherPts)} fill={`url(#${uid}-hatch)`} opacity="0.75" />
        <polyline points={line(otherPts.map((p) => ({ month: p.month, v: mid(p) })))} fill="none" stroke="var(--chart-b)" strokeWidth="2" strokeDasharray="5 4" />
        {/* chosen plan: solid band, solid midpoint */}
        <polygon points={band(chosen)} fill="var(--chart-a-fill)" stroke="var(--chart-a)" strokeWidth="1.5" />
        <polyline points={line(chosen.map((p) => ({ month: p.month, v: mid(p) })))} fill="none" stroke="var(--chart-a)" strokeWidth="3" />
        {/* one missed payment */}
        <polyline points={line(risk)} fill="none" stroke="var(--risk)" strokeWidth="2.5" strokeDasharray="1.5 4" strokeLinecap="round" />
        {/* the label sits after the dip, or before it when the dip is in the right half (bigger text) */}
        <text
          x={x(dip.month) + (dipRight ? -6 : 6)}
          y={y(dip.v) + font + 3}
          fontSize={font}
          textAnchor={dipRight ? 'end' : 'start'}
          fill="var(--bad-ink)"
          fontWeight="700"
        >
          {riskLabel}
        </text>
        {/* end labels */}
        <text
          x={x(end.month) + (end.month === months ? -2 : 0)}
          y={y(end.high) - 7}
          fontSize={font}
          textAnchor={end.month === months ? 'end' : 'middle'}
          fill="var(--ink)"
          fontWeight="700"
        >
          {range(end)} estimate
        </text>
        {otherEnd.month !== end.month && (
          <text
            x={x(otherEnd.month) + (otherEnd.month === months ? -2 : 0)}
            y={y(otherEnd.high) - 7}
            fontSize={font}
            textAnchor={otherEnd.month === months ? 'end' : 'middle'}
            fill="var(--ink-muted)"
          >
            {range(otherEnd)} estimate
          </text>
        )}
        <circle cx={x(0)} cy={y(start.low)} r="4" fill="var(--ink)" />
        {/* months: from the engine's display month, as text */}
        {props.plans['6m'].projection.filter((p) => k <= 1 || p.month % 2 === 0 || p.month === months).map((p) => (
          <text key={p.month} x={x(p.month)} y={H - 6} fontSize={font} textAnchor={p.month === 0 ? 'start' : p.month === months ? 'end' : 'middle'} fill="var(--ink-muted)">
            {p.month === 0 ? 'Now' : shortMonth(p.date)}
          </text>
        ))}
      </svg>
      <ul className="mt-2 flex flex-col gap-1 text-sm leading-snug" aria-label="Key">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-6 flex-none border-[1.5px] border-[var(--chart-a)] bg-[var(--chart-a-fill)]" />
          Your {label(props.plan)} (solid)
        </li>
        <li className="flex items-center gap-2">
          <svg aria-hidden="true" width="24" height="12" className="flex-none">
            <rect width="24" height="12" fill={`url(#${uid}-hatch)`} />
          </svg>
          The {label(other)} (striped): {range(otherEnd)} by {otherEnd.date}
        </li>
        <li className="flex items-center gap-2">
          <svg aria-hidden="true" width="24" height="12" className="flex-none">
            <line x1="1" y1="6" x2="23" y2="6" stroke="var(--risk)" strokeWidth="2.5" strokeDasharray="1.5 4" strokeLinecap="round" />
          </svg>
          If you miss one payment: about {props.riskLine} points lower (dotted, estimate)
        </li>
      </ul>
      <div className="sr-only">
      <table>
        <caption>Estimated score by month</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>{label('3m')}</th>
            <th>{label('6m')}</th>
          </tr>
        </thead>
        <tbody>
          {props.plans['6m'].projection.map((p) => {
            const p3 = props.plans['3m'].projection.find((q) => q.month === p.month)
            return (
              <tr key={p.month}>
                <td>{p.date}</td>
                <td>{p3 ? `${range(p3)} (estimate)` : 'plan ended'}</td>
                <td>{range(p)} (estimate)</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </article>
  )
}
