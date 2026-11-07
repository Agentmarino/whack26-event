// Walks mockTurn through each 115 branch from start to a what-if, checks every reply against the
// contract and that message ids stay unique, and prints the step sequence per branch.
//   pnpm --filter shared exec tsx scripts/mock-walk.ts
import { TurnResponse } from '../contract.ts'
import type { TurnRequest } from '../contract.ts'
import { initialMockState, mockTurn, type MockState } from '../mock-conversation.ts'

type Input = TurnRequest['input']
const choice = (value: string): Input => ({ type: 'choice', value })

function run(inputs: Input[], label: string) {
  let state: MockState = initialMockState
  const steps: string[] = []
  const ids = new Set<string>()
  let last: TurnResponse | null = null
  for (const input of inputs) {
    const out = mockTurn(state, { sessionId: state.sessionId, input })
    state = out.state
    last = TurnResponse.parse(out.response)
    steps.push(last.step)
    for (const m of last.messages) {
      const id = `${last.sessionId}/${m.id}`
      if (ids.has(id)) throw new Error(`${label}: duplicate message id ${id}`)
      ids.add(id)
    }
  }
  return { steps, last: last!, state }
}

/** Taps whatever is offered until the plan, then a plan and a what-if. */
function branchInputs(opening: string, extra: Input[] = []): Input[] {
  const ins: Input[] = [{ type: 'start' }, choice('Nice to meet you, Cap!'), choice(opening), ...extra]
  for (let i = 0; i < 16; i++) ins.push({ type: 'skip' })
  return ins
}

const OPEN = ["I've been declined already", "I've got a credit report I want help with", 'I want to get ready before I apply', "I'm new to credit or new to the UK"]
for (const [i, name] of ['declined', 'report', 'prepare', 'new'].entries()) {
  // Walk until coach, then pick the plan and ask a what-if.
  let ins = branchInputs(OPEN[i]!)
  let out = run(ins, name)
  const coachAt = out.steps.indexOf('coach')
  if (coachAt < 0) throw new Error(`${name}: never reached coach: ${out.steps.join(', ')}`)
  ins = [...ins.slice(0, coachAt + 1), choice('3 months'), choice('What if I pay £300 a month?'), choice('6 months'), choice('What if I stop buy now, pay later?')]
  out = run(ins, name)
  if (out.state.branch !== name) throw new Error(`${name}: mock picked ${out.state.branch}`)
  if (out.last.messages[0]?.kind !== 'whatif') throw new Error(`${name}: the last what-if is not a what-if`)
  console.log(`${name.padEnd(9)} ${out.steps.join(' → ')}`)
}

// Edge paths: a letter at the opening, a letter mid-questions, an unclear opening, then start again.
const edge = run(
  [
    { type: 'start' }, choice('Nice to meet you, Cap!'), choice('banana'),
    { type: 'sample', fileKind: 'letter', personaId: 'priya' }, { type: 'sample', fileKind: 'credit_report' },
    { type: 'sample', fileKind: 'letter' }, { type: 'skip' }, { type: 'start' }, choice('Nice to meet you, Cap!'),
  ],
  'edge',
)
console.log(`edge      ${edge.steps.join(' → ')}`)
console.log('mock walk OK: every reply valid, ids unique per session')
