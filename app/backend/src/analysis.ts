// The engine calls the conversation makes. No logic of our own: analyse() is run() + decodeDecline(),
// composed here so findings from the samples or uploads stay on the result (analyse() keeps them only
// for report files, and our profile is built up from several pieces plus the answers).

import type { EngineResult, Profile } from 'shared'
import * as E from '../engine/index.ts'
import type { Findings } from './personas.ts'

export function analyseProfile(profile: Profile, findings: Findings | null): EngineResult {
  const input = structuredClone(profile)
  const raw = E.run(input)
  return { profile: input, findings, result: E.serialise(raw), decline: E.decodeDecline(raw) }
}

/** Money left each month for the bank acknowledgement (before the full analysis). */
export const surplusOf = (profile: Profile): number => E.serialise(E.run(structuredClone(profile))).cash.surplus

/** The decoded decline for the letter acknowledgement (lender name). */
export const declineFor = (profile: Profile) => E.decodeDeclineFor(structuredClone(profile))
