import { createContext, useContext } from 'react'
import type { EngineResult, PlanId, WhatIfRun } from 'shared'

/** One row of a because-trail. */
export interface WhyRow {
  label: string
  value: string
}
export interface WhyTrail {
  tag: string
  title: string
  rows: WhyRow[]
  link?: { label: string; url: string }
}

export interface CardCtx {
  result: EngineResult | null
  whatIfs: Record<string, WhatIfRun>
  paperUrl: string | null
  plan: PlanId
  showWhy: (trail: WhyTrail) => void
  openPaper: () => void
}

export const CardContext = createContext<CardCtx | null>(null)

export function useCards(): CardCtx {
  const c = useContext(CardContext)
  if (!c) throw new Error('useCards outside CardContext')
  return c
}
