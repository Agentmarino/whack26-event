// A backend-free conversation for the frontend (114, VITE_USE_MOCK=true).
// Walks the steps in conversation.md using the examples generated from the real engine on Priya
// (examples/bundle.ts, made by scripts/make-examples.ts). Pure: no I/O, no timers, state in and out.
//
//   let state = initialMockState
//   const { state: next, response } = mockTurn(state, { sessionId: null, input: { type: 'start' } })
//
// Whatever persona or file is picked, the mock always answers as Priya.

import { z } from 'zod'
import { EngineResult, Persona, TurnResponse, UploadResult, WhatIfResponse } from './contract.ts'
import type { FileKind, TurnRequest, WhatIfRequest } from './contract.ts'
import { bundle as rawBundle } from './examples/bundle.ts'

const Bundle = z.object({
  sessionId: z.string(),
  result: EngineResult,
  turns: z.record(z.string(), z.object({ hasResult: z.boolean(), response: TurnResponse })),
  letterAck: TurnResponse,
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
  /** Key of the last turn example served (see examples/walk.json), null before start. */
  at: string | null
  /** A letter was handed over (sample or file) at any step: the decline step will run. */
  hasLetter: boolean
  /** Counts what-ifs so every answer gets fresh ids. */
  whatIfCount: number
  /** The last response, so a letter at any step can keep the step and expects. */
  last: TurnResponse | null
}

export const initialMockState: MockState = { sessionId: null, at: null, hasLetter: false, whatIfCount: 0, last: null }

const LINEAR = [
  'greet',
  'ask_report',
  'ask_bank',
  'ask_letter',
  'questions-1',
  'questions-2',
  'questions-3',
  'questions-4',
  'assessing',
  'diagnosis',
  'decline',
  'paper',
  'coach-choose',
] as const

function nextKey(state: MockState, input: TurnRequest['input']): string {
  const at = state.at
  if (at === null || input.type === 'start') return 'greet'
  if (at === 'diagnosis') return state.hasLetter ? 'decline' : 'paper'
  if (at === 'coach-choose') {
    const value = input.type === 'choice' || input.type === 'text' ? input.value : ''
    return /6/.test(value) ? 'coach-plan-6m' : 'coach-plan-3m'
  }
  if (at.startsWith('coach-')) return 'coach-whatif'
  const i = LINEAR.indexOf(at as (typeof LINEAR)[number])
  return LINEAR[Math.min(i + 1, LINEAR.length - 1)] ?? 'greet'
}

const isLetter = (input: TurnRequest['input']) => (input.type === 'file' || input.type === 'sample') && input.fileKind === 'letter'

/** One turn. Same contract as POST /api/turn. */
export function mockTurn(state: MockState, request: TurnRequest): { state: MockState; response: TurnResponse } {
  const b = data()
  const input = request.input

  // A letter at any step other than ask_letter: one acknowledgement, step and expects unchanged.
  if (isLetter(input) && state.at !== null && state.at !== 'ask_letter' && state.last) {
    const ack = structuredClone(b.letterAck)
    const response: TurnResponse = { ...structuredClone(state.last), messages: ack.messages, whatIf: null }
    return { state: { ...state, hasLetter: true, last: response }, response }
  }

  const key = nextKey(state, input)
  const example = b.turns[key]
  if (!example) throw new Error(`mockTurn: no example for "${key}"`)
  const response = structuredClone(example.response)
  if (example.hasResult) response.result = structuredClone(b.result)

  let hasLetter = key === 'greet' ? false : state.hasLetter
  if (state.at === 'ask_letter' && isLetter(input)) hasLetter = true

  // Skipped an upload: drop the "thanks, I've got it" message.
  if (input.type === 'skip' && state.at && ['ask_report', 'ask_bank', 'ask_letter'].includes(state.at)) {
    response.messages = response.messages.filter(m => !m.id.startsWith('ack-'))
  }
  // No letter: the diagnosis leads straight to the paper.
  if (key === 'diagnosis' && !hasLetter) response.expects = { kind: 'choice', chips: ['What can I do?'] }

  let whatIfCount = state.whatIfCount
  if (key === 'coach-whatif' && response.whatIf) {
    whatIfCount += 1
    const id = `wi-mock-${whatIfCount}`
    response.whatIf = { ...response.whatIf, id, text: input.type === 'text' || input.type === 'choice' ? input.value : null }
    response.messages = response.messages.map(m => ({
      ...m,
      id: `${m.id}-${whatIfCount}`,
      ...(m.ref?.on === 'whatif' ? { ref: { on: 'whatif' as const, whatIfId: id } } : {}),
    }))
  }

  const next: MockState = { sessionId: response.sessionId, at: key, hasLetter, whatIfCount, last: response }
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
