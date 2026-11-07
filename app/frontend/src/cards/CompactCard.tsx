// History version of a card. Most cards stay whole; plan steps fold into one line you can open.
import { resolveRef, type AgentMessage } from 'shared'
import { Card } from './Card'
import { useCards } from './context'
import { StepLine } from './StepCard'

export function CompactCard({ msg }: { msg: AgentMessage }) {
  const ctx = useCards()
  if (msg.ref?.on === 'step') {
    const r = resolveRef(msg.ref, ctx.result)
    if (r?.on === 'step') return <StepLine step={r.step} plan={r.plan} stepIndex={r.stepIndex} total={r.total} />
  }
  return <Card msg={msg} />
}
