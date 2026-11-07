// In-memory sessions. One per conversation; a restart (`start`) makes a new one.

import { randomUUID } from 'node:crypto'
import type { EngineResult, Expects, PlanId, Profile, Step, WhatIfRun } from 'shared'
import type { Findings } from './personas.ts'

export type QuestionKey = 'age' | 'income' | 'housing' | 'goal' | 'horizon' | 'bureau' | 'roll' | 'dd'

export type Session = {
  id: string
  createdAt: number
  step: Step
  /** Which sample persona the samples come from (the first sample names it). */
  personaId: string | null
  /** Everything gathered so far: the engine's input. */
  profile: Profile
  findings: Findings | null
  /** What has been handed over, and whether the report file already carried bank data or a letter. */
  has: { report: boolean; bank: boolean; letter: boolean }
  bundled: { bank: boolean; letter: boolean }
  /** Questions still to ask, and the one on screen. */
  queue: QuestionKey[]
  current: QuestionKey | null
  /** Card the Direct Debit question is about (index into profile.cards). */
  ddCard: number | null
  /** From the horizon question; the coach offers it first. */
  horizon: PlanId
  /** The goal in the person's words, when it is not one of the engine's goals ("car finance"). */
  goalWords: string | null
  /** Plan picked in coach; null while choosing. */
  plan: PlanId | null
  result: EngineResult | null
  paperReady: boolean
  whatIfs: Record<string, WhatIfRun>
  whatIfCount: number
  /** The last step and expects, so a letter at any step keeps them. */
  lastExpects: Expects
  plainEnglish: boolean
  /** Message ids used in this session (ids are unique within a session). */
  ids: Set<string>
}

const sessions = new Map<string, Session>()

export function newSession(): Session {
  const s: Session = {
    id: randomUUID(),
    createdAt: Date.now(),
    step: 'greet',
    personaId: null,
    profile: {},
    findings: null,
    has: { report: false, bank: false, letter: false },
    bundled: { bank: false, letter: false },
    queue: [],
    current: null,
    ddCard: null,
    horizon: '3m',
    goalWords: null,
    plan: null,
    result: null,
    paperReady: false,
    whatIfs: {},
    whatIfCount: 0,
    lastExpects: { kind: 'none' },
    plainEnglish: false,
    ids: new Set(),
  }
  sessions.set(s.id, s)
  return s
}

export const getSession = (id: string): Session | undefined => sessions.get(id)

/** For tests. */
export const clearSessions = () => sessions.clear()

/** A unique message id within the session: the base, or base-2, base-3... */
export function messageId(s: Session, base: string): string {
  let id = base
  for (let n = 2; s.ids.has(id); n++) id = `${base}-${n}`
  s.ids.add(id)
  return id
}
