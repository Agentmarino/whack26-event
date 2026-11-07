// A backend-free conversation for the frontend (114, VITE_USE_MOCK=true).
// 115: replays the real backend's walk for each branch (examples/bundle.ts, made by
// scripts/make-examples.ts from app/backend with template wording). Pure: no I/O, no timers, state in and out.
//
//   let state = initialMockState
//   const { state: next, response } = mockTurn(state, { sessionId: null, input: { type: 'start' } })
//
// intro → opening → the branch picked by the opening chip (a letter dropped at the opening picks
// `declined`), then that branch's recorded turns in order, whatever is tapped. In coach, "3 months" /
// "6 months" pick the plan and anything else is a what-if (buy now pay later, or a paydown).
// declined, report and prepare answer as Priya; new answers as Mei Lin.

import { z } from 'zod'
import { Branch, EngineResult, Persona, TurnResponse, UploadResult, WhatIfResponse, paperUrlFor } from './contract.ts'
import type { FileKind, PlanId, TurnRequest, WhatIfRequest } from './contract.ts'
import { bundle as rawBundle } from './examples/bundle.ts'

const Stored = z.object({ resultKey: z.string().nullable(), response: TurnResponse })
type Stored = z.infer<typeof Stored>
const BranchWalk = z.object({
  persona: z.string(),
  turns: z.array(Stored).min(1),
  coach: z.object({ plan3m: Stored, plan6m: Stored, whatIfs: z.object({ paydown: Stored, bnpl: Stored.nullable() }) }),
})
const Bundle = z.object({
  sessionId: z.string(),
  results: z.record(z.string(), EngineResult),
  intro: Stored,
  opening: Stored,
  branches: z.object({ declined: BranchWalk, report: BranchWalk, prepare: BranchWalk, new: BranchWalk }),
  letterAck: Stored,
  whatIfResponse: WhatIfResponse,
  upload: UploadResult,
  uploadError: UploadResult,
  personas: z.array(Persona),
})
type Bundle = z.infer<typeof Bundle>

let cached: Bundle | null = null
/** The examples, validated against the contract on first use. */
const data = (): Bundle => (cached ??= Bundle.parse(rawBundle))

export type MockState = {
  sessionId: string | null
  /** Where the conversation is: before start, Cap's card, the opening question, a branch's turns, or coach. */
  at: 'none' | 'intro' | 'opening' | 'branch' | 'coach'
  branch: Branch | null
  /** Index of the last branch turn served. */
  i: number
  /** The plan picked in coach (null while choosing); what-if answers quote it. */
  plan: PlanId | null
  /** A letter was handed over at any step. */
  hasLetter: boolean
  /** Counters that keep message ids unique when a reply is served again. */
  whatIfCount: number
  letterCount: number
  planCount: number
  /** How many times the conversation was started; restarts get a new sessionId so ids stay unique per session. */
  runs: number
  /** The last response, so a letter at any step can keep the step and expects. */
  last: TurnResponse | null
}

export const initialMockState: MockState = {
  sessionId: null,
  at: 'none',
  branch: null,
  i: -1,
  plan: null,
  hasLetter: false,
  whatIfCount: 0,
  letterCount: 0,
  planCount: 0,
  runs: 0,
  last: null,
}

const BRANCH_ORDER: Branch[] = ['declined', 'report', 'prepare', 'new']
const valueOf = (input: TurnRequest['input']) => (input.type === 'choice' || input.type === 'text' ? input.value : '')
const isFile = (input: TurnRequest['input']) => input.type === 'file' || input.type === 'sample'
const isLetter = (input: TurnRequest['input']) => isFile(input) && 'fileKind' in input && input.fileKind === 'letter'

/** The opening chip (by its position in the recorded chips) or words → a branch. */
function branchFrom(input: TurnRequest['input']): Branch | null {
  if (isLetter(input)) return 'declined'
  if (isFile(input)) return 'report'
  const v = valueOf(input).trim().toLowerCase()
  const chips = data().opening.response.expects.chips ?? []
  const i = chips.findIndex(c => c.toLowerCase() === v)
  if (i >= 0) return BRANCH_ORDER[i] ?? null
  if (/declin|turned down|refus|reject/.test(v)) return 'declined'
  if (/new to|student|never had/.test(v)) return 'new'
  if (/ready|prepar|before i apply/.test(v)) return 'prepare'
  if (/report|score|check/.test(v)) return 'report'
  return null
}

/** A recorded reply, with its result attached and every message id made unique with `suffix`. */
function serve(stored: Stored, suffix = ''): TurnResponse {
  const response = structuredClone(stored.response)
  if (stored.resultKey) response.result = structuredClone(data().results[stored.resultKey]!)
  if (suffix) response.messages = response.messages.map(m => ({ ...m, id: `${m.id}-${suffix}` }))
  return response
}

/** One turn. Same contract as POST /api/turn. */
export function mockTurn(state: MockState, request: TurnRequest): { state: MockState; response: TurnResponse } {
  const b = data()
  const input = request.input
  const restart = state.at === 'none' || input.type === 'start'

  // A letter at any step after the opening (other than the declined branch's letter step): one acknowledgement, step unchanged.
  const atLetterStep = state.at === 'branch' && state.last?.step === 'ask_letter'
  if (!restart && isLetter(input) && state.at !== 'opening' && state.at !== 'intro' && !atLetterStep && state.last) {
    const letterCount = state.letterCount + 1
    const ack = serve(b.letterAck, String(letterCount))
    const response: TurnResponse = { ...structuredClone(state.last), messages: ack.messages, whatIf: null }
    return { state: { ...state, hasLetter: true, letterCount, last: response }, response }
  }

  let next: MockState
  let response: TurnResponse
  if (restart) {
    response = serve(b.intro)
    next = { ...initialMockState, runs: state.runs + 1, at: 'intro' }
  } else if (state.at === 'intro') {
    response = serve(b.opening)
    next = { ...state, at: 'opening' }
  } else if (state.at === 'opening') {
    const branch = branchFrom(input)
    if (!branch) {
      // Not one of the four: ask again (same reply, fresh ids).
      response = serve(b.opening, `again-${state.letterCount + state.whatIfCount + state.planCount + 1}`)
      next = { ...state, planCount: state.planCount + 1 }
    } else {
      // A letter dropped at the opening is the declined branch's letter: go straight to the report request.
      const i = branch === 'declined' && isLetter(input) ? 1 : 0
      response = serve(b.branches[branch].turns[i]!)
      next = { ...state, at: 'branch', branch, i, hasLetter: isLetter(input) }
    }
  } else if (state.at === 'branch') {
    const walk = b.branches[state.branch!]
    const i = Math.min(state.i + 1, walk.turns.length - 1)
    response = serve(walk.turns[i]!)
    // Skipped an upload: drop the "thanks, I've got it" message.
    if (input.type === 'skip' && state.last && ['ask_report', 'ask_bank', 'ask_letter'].includes(state.last.step)) {
      response.messages = response.messages.filter(m => !m.id.startsWith('ack-'))
    }
    const done = i === walk.turns.length - 1
    next = { ...state, i, at: done ? 'coach' : 'branch', plan: null, hasLetter: state.hasLetter || isLetter(input) }
  } else {
    // coach: pick or switch the plan, else a what-if.
    const walk = b.branches[state.branch!]
    const v = valueOf(input)
    const planAsked = /^\s*(3|6|three|six)\s*months?\s*(plan)?\s*$/i.test(v)
    if (state.plan === null || planAsked) {
      const plan: PlanId = /6|six/i.test(v) ? '6m' : '3m'
      const planCount = state.planCount + 1
      response = serve(plan === '3m' ? walk.coach.plan3m : walk.coach.plan6m, planCount > 1 ? `p${planCount}` : '')
      next = { ...state, plan, planCount }
    } else {
      const whatIfCount = state.whatIfCount + 1
      const pick = /stop|bnpl|buy now|klarna/i.test(v) && walk.coach.whatIfs.bnpl ? walk.coach.whatIfs.bnpl : walk.coach.whatIfs.paydown
      response = serve(pick, String(whatIfCount))
      const id = `wi-mock-${whatIfCount}`
      if (response.whatIf) response.whatIf = { ...response.whatIf, id, text: v || null }
      response.messages = response.messages.map(m => (m.ref?.on === 'whatif' ? { ...m, ref: { on: 'whatif' as const, whatIfId: id } } : m))
      next = { ...state, whatIfCount }
    }
  }

  response.sessionId = next.runs > 1 ? `${b.sessionId}-${next.runs}` : b.sessionId
  if (response.paperUrl) response.paperUrl = paperUrlFor(response.sessionId)
  next = { ...next, sessionId: response.sessionId, last: response }
  return { state: next, response }
}

/** Same contract as POST /api/whatif (the sliders sheet). Always answers with the example what-if. */
export function mockWhatIf(state: MockState, request: WhatIfRequest): { state: MockState; response: WhatIfResponse } {
  const response = structuredClone(data().whatIfResponse)
  const whatIfCount = state.whatIfCount + 1
  const id = `wi-mock-${whatIfCount}`
  response.whatIf = { ...response.whatIf, id, text: request.text ?? null }
  response.messages = response.messages.map(m => ({
    ...m,
    id: `${m.id}-${whatIfCount}`,
    ...(m.ref?.on === 'whatif' ? { ref: { on: 'whatif' as const, whatIfId: id } } : {}),
  }))
  response.sessionId = state.sessionId ?? response.sessionId
  return { state: { ...state, whatIfCount }, response }
}

/** Same contract as GET /api/personas. */
export const mockPersonas = (): Persona[] => structuredClone(data().personas)

/** Same contract as POST /api/upload. `fail` returns the friendly error. */
export function mockUpload(fileKind: FileKind, fileName: string, opts: { fail?: boolean } = {}): UploadResult {
  const b = data()
  if (opts.fail) return { ...structuredClone(b.uploadError), fileKind, fileName }
  return { ...structuredClone(b.upload), fileKind, fileName, fileId: `up-mock-${fileKind}`, findings: fileKind === 'credit_report' ? structuredClone(b.upload.findings) : [] }
}
