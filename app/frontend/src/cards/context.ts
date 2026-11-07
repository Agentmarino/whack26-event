import { createContext, useContext } from 'react'
import type { EngineResult, PlanId, WhatIfRun } from 'shared'
import type { FacialHair } from '../npc'
import type { Rect } from './BusinessCard'

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
  whatIfPlans: Record<string, PlanId>
  paperUrl: string | null
  plan: PlanId
  showWhy: (trail: WhyTrail) => void
  openPaper: () => void
  /** 115: open Cap's business card again, growing from `from` (the row that was tapped). */
  openBusinessCard: (from: Rect | null, text: string) => void
  /** 115: the agent's facial hair, so the card's portrait matches the scene. */
  facialHair: FacialHair
}

export const CardContext = createContext<CardCtx | null>(null)

export function useCards(): CardCtx {
  const c = useContext(CardContext)
  if (!c) throw new Error('useCards outside CardContext')
  return c
}
