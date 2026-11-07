// Block 2: the sliders sheet for what-ifs (POST /api/whatif). Placeholder until then.
import type { Change, EngineResult, PlanId } from 'shared'

export function WhatIfSheet(_props: {
  open: boolean
  onClose: () => void
  result: EngineResult | null
  plan: PlanId
  onRun: (changes: Change[], label: string) => void
}) {
  return null
}
