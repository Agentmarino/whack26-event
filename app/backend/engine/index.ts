// Typed wrapper around Jag's credit engine (engine.js, copied unchanged from prep-incoming/credit-coach).
// No logic here: only types, and toJSON() on the two calls that return Date objects.
// Types come from the shared contract (typed from the engine's real output on 2026-11-07).
//
// engine.js is a browser/Node script: it sets globalThis.CreditEngine (and module.exports under CommonJS).
// This package is ESM, so it runs as a module and we read the global it sets.

import './engine.js'
import type {
  Change,
  CreditReport,
  DeclineDecoded,
  EngineResult,
  EngineWhatIf,
  Finding,
  Profile,
  RunResult,
  SourceLink,
} from 'shared'

export type EngineOptions = {
  /** Plan start date. Default: next Monday. */
  start?: Date
}

/** run()'s raw result: Date objects inside. Only pass it back to decodeDecline() and summary(), or serialise() it. */
export type RawRun = { readonly __rawRun: true }

export type ReportFindings = { report: Finding[]; bank: Finding[]; letter: Finding[] }

export type CapitalOneCard = {
  id: string
  name: string
  apr: number
  limit: string
  note: string
  [key: string]: unknown
}

type RawEngine = {
  analyse(input: Profile | CreditReport, opts?: EngineOptions): EngineResult
  run(profile: Profile, opts?: EngineOptions): RawRun
  whatIf(profile: Profile, changes: Change[], opts?: EngineOptions): unknown
  applyChanges(profile: Profile, changes: Change[]): { profile: Profile; applied: string[] }
  decodeDecline(r: RawRun): DeclineDecoded | null
  parseReport(report: CreditReport): { profile: Profile; found: ReportFindings }
  summary(r: RawRun): string
  normalise(profile: Profile): Profile
  toJSON<T>(x: unknown): T
  PERSONAS: Record<'priya' | 'sam' | 'dan', Profile & { name: string; blurb: string }>
  CARDS: Record<string, CapitalOneCard>
  SRC: Record<string, SourceLink>
  SCALE: Record<'experian' | 'equifax' | 'transunion', number>
  fmtDate(d: Date): string
  fmtMonth(d: Date): string
  gbp(n: number): string
  gbp2(n: number): string
}

const E = (globalThis as unknown as { CreditEngine?: RawEngine }).CreditEngine
if (!E) throw new Error('engine.js did not load: globalThis.CreditEngine is missing')

/** Main entry. A credit-coach-report/v1 report (has `accounts`) or a Profile. Plain JSON back. */
export const analyse = (input: Profile | CreditReport, opts?: EngineOptions): EngineResult => E.analyse(input, opts)

/** Before/after for a list of levers. Serialised to plain JSON (the engine's own result holds Dates). */
export const whatIf = (profile: Profile, changes: Change[], opts?: EngineOptions): EngineWhatIf =>
  E.toJSON<EngineWhatIf>(E.whatIf(profile, changes, opts))

/** Raw run. Use analyse() unless you need decodeDecline() or summary() on its own. */
export const run = (profile: Profile, opts?: EngineOptions): RawRun => E.run(profile, opts)

/** run() as plain JSON. */
export const serialise = (r: RawRun): RunResult => E.toJSON<RunResult>(r)

/** Why the last decline probably happened, or null when profile.decline is empty. Takes a raw run. */
export const decodeDecline = (r: RawRun): DeclineDecoded | null => E.toJSON<DeclineDecoded | null>(E.decodeDecline(r))

/** Decline decoder straight from a profile. */
export const decodeDeclineFor = (profile: Profile, opts?: EngineOptions): DeclineDecoded | null =>
  decodeDecline(run(profile, opts))

export const applyChanges = (profile: Profile, changes: Change[]) => E.applyChanges(profile, changes)

/** A credit-coach-report/v1 JSON into a Profile plus what was found. Throws if it is not a report. */
export const parseReport = (report: CreditReport) => E.parseReport(report)

/** A JSON string sized for a Claude prompt (parse it). Takes a raw run. */
export const summary = (r: RawRun): string => E.summary(r)

export const normalise = (profile: Profile): Profile => E.normalise(profile)

export const toJSON = <T>(x: unknown): T => E.toJSON<T>(x)

/** Built-in personas (priya, sam, dan). Same as app/backend/data/personas/*.json. */
export const PERSONAS = E.PERSONAS
/** Capital One cards, "as of 7 Nov 2026". */
export const CARDS = E.CARDS
/** Sources for the because-trails. */
export const SRC = E.SRC
/** Score scale per bureau. */
export const SCALE = E.SCALE

/** "9 Nov 2026". Accepts the ISO strings in JSON results too (not projection `date`, which is already text). */
export const fmtDate = (d: Date | string): string => E.fmtDate(typeof d === 'string' ? new Date(d) : d)
/** "Nov 2026". */
export const fmtMonth = (d: Date | string): string => E.fmtMonth(typeof d === 'string' ? new Date(d) : d)
/** "£1,200" */
export const gbp = (n: number): string => E.gbp(n)
/** "£11.99" */
export const gbp2 = (n: number): string => E.gbp2(n)
