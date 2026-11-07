// What-if with sliders: a paydown amount and a few switches, sent as the engine's levers to
// POST /api/whatif. The answer comes back into the chat as a `whatif` card.
import { useId, useState } from 'react'
import type { Change, EngineResult, PlanId } from 'shared'
import { gbp } from '../format'
import { Sheet } from '../ui/Sheet'

interface Lever {
  id: string
  label: string
  /** As it reads in "What if I …?" */
  say: string
  hint: string
  change: Change
  show: (r: EngineResult) => boolean
}

const LEVERS: Lever[] = [
  {
    id: 'bnpl',
    say: "I stop buy now, pay later",
    label: 'Stop buy now, pay later',
    hint: 'No new plans, and finish the ones you have.',
    change: { lever: 'stop', what: 'bnpl' },
    show: (r) => (r.result.profile.bank?.bnpl ?? 0) > 0,
  },
  {
    id: 'gambling',
    say: "I stop gambling payments",
    label: 'Stop gambling payments',
    hint: 'Lenders read these in your bank statement.',
    change: { lever: 'stop', what: 'gambling' },
    show: (r) => (r.result.profile.bank?.gambling ?? 0) > 0,
  },
  {
    id: 'roll',
    say: "I get on the electoral roll",
    label: "I'm on the electoral roll",
    hint: 'Registered to vote at your current address.',
    change: { lever: 'electoralRoll', value: true },
    show: (r) => r.result.profile.electoralRoll === false,
  },
  {
    id: 'rent',
    say: "I report my rent",
    label: 'Report my rent',
    hint: 'Rent paid on time shows on your file through a rent reporting service.',
    change: { lever: 'rentReporting', value: true },
    show: (r) => r.result.profile.housing === 'rent',
  },
  {
    id: 'clear',
    say: "I clear my cards",
    label: 'Clear my cards in full',
    hint: 'Pay every card down to £0.',
    change: { lever: 'clearCard' },
    show: (r) => (r.result.profile.cards ?? []).some((c) => c.balance > 0),
  },
]

export function WhatIfSheet(props: {
  open: boolean
  onClose: () => void
  result: EngineResult | null
  plan: PlanId
  onRun: (changes: Change[], label: string) => void
}) {
  const sliderId = useId()
  const [paydown, setPaydown] = useState(0)
  const [on, setOn] = useState<Record<string, boolean>>({})
  const levers = props.result ? LEVERS.filter((l) => l.show(props.result!)) : []
  const changes: Change[] = [
    ...(paydown > 0 ? [{ lever: 'paydown', value: paydown } as Change] : []),
    ...levers.filter((l) => on[l.id]).map((l) => l.change),
  ]
  const words = [
    ...(paydown > 0 ? [`I pay ${gbp(paydown)} extra a month`] : []),
    ...levers.filter((l) => on[l.id]).map((l) => l.say),
  ]
  const label = words.length ? `What if ${words.join(' and ').replace(/ and I /g, ' and ')}?` : ''

  return (
    <Sheet
      open={props.open}
      onClose={props.onClose}
      title={`Try a change to your ${props.plan === '3m' ? '3-month' : '6-month'} plan`}
      testId="whatif-sheet"
      footer={
        <div className="flex flex-col gap-2 border-t-2 border-dashed border-paper-line pt-3">
          <button
            type="button"
            className="btn btn--ink w-full"
            disabled={!changes.length}
            onClick={() => props.onRun(changes, label)}
            data-action="whatif-run"
          >
            See what changes
          </button>
          <p className="text-sm text-ink-muted">Compared with your plan. Estimates, not a promise.</p>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={sliderId} className="flex items-baseline justify-between gap-3">
          <span className="slip__tag">Extra off your cards each month</span>
          <span className="font-pixel text-sm" aria-hidden="true">
            {gbp(paydown)}
          </span>
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={600}
          step={25}
          value={paydown}
          aria-valuetext={`${gbp(paydown)} a month`}
          onChange={(e) => setPaydown(Number(e.target.value))}
          className="h-11 w-full accent-[var(--ink)]"
          data-testid="paydown"
        />
        <div className="flex justify-between text-sm text-ink-muted" aria-hidden="true">
          <span>£0</span>
          <span>£600</span>
        </div>
      </div>
      {levers.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="slip__tag mb-2">And</legend>
          {levers.map((l) => (
            <label key={l.id} className="flex min-h-11 cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-6 w-6 flex-none accent-[var(--ink)]"
                checked={!!on[l.id]}
                onChange={(e) => setOn((o) => ({ ...o, [l.id]: e.target.checked }))}
                data-lever={l.id}
              />
              <span className="flex flex-col">
                <span className="text-[1.0625rem] font-bold leading-snug">{l.label}</span>
                <span className="text-sm leading-snug text-ink-muted">{l.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </Sheet>
  )
}
