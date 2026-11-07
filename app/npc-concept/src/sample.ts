// The sample conversation for the concept page. Numbers match the demo profile
// (prep/lenders-eyes fixtures: utilisation 94.5%, rule declines above 50%).
import type { AgentState, Emote } from './npc'

export interface SampleStep {
  state: AgentState
  emote: Emote
  text: string
  chips?: string[]
  /** Minimum time to stay on this step after the line has printed (ms). */
  hold?: number
}

export const SAMPLE: SampleStep[] = [
  {
    state: 'greeting',
    emote: 'warm',
    text: "Hello, I'm your credit agent. I read credit files the way a lender does, and I'll tell you what they see.",
  },
  {
    state: 'asking',
    emote: 'neutral',
    text: 'First, could you put your credit report on the tray? A PDF or a screenshot is fine.',
    chips: ['Here it is'],
  },
  { state: 'receive-document', emote: 'warm', text: 'Thank you. I have it.' },
  { state: 'reading', emote: 'neutral', text: 'Let me read it through, line by line.', hold: 2500 },
  { state: 'thinking', emote: 'neutral', text: "One moment. I'm checking it the way a lender would.", hold: 2000 },
  {
    state: 'explaining',
    emote: 'concerned',
    text: 'Your cards are at 94.5% of their limits. The lender rules I use decline anything above 50%, so this is the main reason you were turned down.',
    hold: 1500,
  },
  { state: 'slide-paper', emote: 'warm', text: "Here's a summary of what I found. It's yours to keep." },
  {
    state: 'coach',
    emote: 'pleased',
    text: "Now let's plan. What are you aiming for? I'll give you steps for 3, 6 and 12 months.",
    chips: ['Credit card', 'Car finance', 'Mortgage', 'Something else'],
  },
]

export const OPENING = {
  text: "Hello. I read credit files the way a lender does. Put your credit report on the tray when you're ready, or start the sample conversation.",
  chips: ['Start the sample conversation'],
}

export const TEST_LINE =
  'This line tests the mouth. It moves while letters print, and stops at commas, full stops and pauses.'
