// Walks mockTurn from start to coach on Priya (all three samples) and prints the step sequence.
//   pnpm --filter shared exec tsx scripts/mock-walk.ts
import { initialMockState, mockTurn } from '../mock-conversation.ts'
import type { TurnRequest } from '../contract.ts'

const inputs: TurnRequest['input'][] = [
  { type: 'start' },
  { type: 'choice', value: "Let's start" },
  { type: 'sample', fileKind: 'credit_report', personaId: 'priya' },
  { type: 'sample', fileKind: 'bank' },
  { type: 'sample', fileKind: 'letter' },
  { type: 'choice', value: 'A credit card' },
  { type: 'choice', value: '3 months' },
  { type: 'choice', value: 'Yes, I can' },
  { type: 'choice', value: 'No' },
  { type: 'skip' },
  { type: 'choice', value: 'Tell me about the letter' },
  { type: 'choice', value: 'Got it' },
  { type: 'choice', value: 'Make me a plan' },
  { type: 'choice', value: '3 months' },
  { type: 'text', value: 'What if I pay £300 a month?' },
]
let state = initialMockState
const steps: string[] = []
for (const input of inputs) {
  const out = mockTurn(state, { sessionId: state.sessionId, input })
  state = out.state
  steps.push(out.response.step)
}
console.log(steps.join(', '))

// Edge paths: skip everything, a letter mid-questions, the 6-month plan, a BNPL what-if, then start again.
const ids = new Set<string>()
let s2 = initialMockState
const seen: string[] = []
for (const input of [
  { type: 'start' }, { type: 'choice', value: "Let's start" }, { type: 'skip' }, { type: 'skip' }, { type: 'skip' },
  { type: 'sample', fileKind: 'letter' }, { type: 'sample', fileKind: 'letter' }, { type: 'choice', value: 'A credit card' },
  { type: 'choice', value: '6 months' }, { type: 'choice', value: 'Not sure' }, { type: 'choice', value: 'Not sure' }, { type: 'skip' },
  { type: 'choice', value: 'Tell me about the letter' }, { type: 'choice', value: 'Got it' }, { type: 'choice', value: 'Make me a plan' },
  { type: 'choice', value: '6 months' }, { type: 'choice', value: 'What if I stop buy now, pay later?' }, { type: 'text', value: 'What if I pay £300 a month?' },
  { type: 'start' },
] as TurnRequest['input'][]) {
  const out = mockTurn(s2, { sessionId: s2.sessionId, input })
  s2 = out.state
  for (const m of out.response.messages) {
    const id = `${out.response.sessionId}/${m.id}`
    if (ids.has(id)) throw new Error(`duplicate message id ${id}`)
    ids.add(id)
  }
  seen.push(out.response.messages.at(-1)?.text.slice(0, 48) ?? '')
}
console.log(`edge walk OK, ${ids.size} unique message ids; last what-ifs:\n  ${seen.slice(-3, -1).join('\n  ')}`)
