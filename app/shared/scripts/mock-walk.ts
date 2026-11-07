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
