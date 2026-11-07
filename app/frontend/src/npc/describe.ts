// Plain-language description of what the agent is doing, used as the canvas aria-label.
import type { AgentState, Emote, NpcSnapshot } from './engine'

const STATE_TEXT: Record<AgentState, string> = {
  idle: 'at his desk, hands on the keyboard',
  greeting: 'waving hello',
  talking: 'talking to you',
  listening: 'listening, looking down at your reply',
  asking: 'asking you a question, head tilted',
  'receive-document': 'taking your document from the tray on his desk',
  reading: 'reading your document line by line',
  thinking: 'thinking, hand on chin',
  explaining: 'explaining, pointing down at the reason on the desk',
  'slide-paper': 'sliding a summary sheet across the desk to you',
  coach: 'switching to coach mode: glasses on, holding a planner',
  'slide-card': 'sliding his business card across the desk to you',
}

const EMOTE_TEXT: Record<Emote, string> = {
  neutral: 'calm',
  warm: 'warm and friendly',
  concerned: 'concerned but kind',
  pleased: 'pleased',
}

export function describeAgent(s: NpcSnapshot | null): string {
  if (!s) return 'Cap, the credit coach, at his desk in a Capital One office'
  const parts = [`Cap, the credit coach, at his desk in a Capital One office, ${STATE_TEXT[s.state]}. Expression: ${EMOTE_TEXT[s.emote]}.`]
  if (s.mode === 'coach' && s.state !== 'coach') parts.push('Coach mode, wearing glasses.')
  if (s.trayDoc) parts.push('A document is on the tray.')
  if (s.paper === 'ready') parts.push('A summary sheet is at the front of the desk.')
  if (s.card === 'landed') parts.push('His business card is at the front of the desk.')
  if (s.dropHover) parts.push('The tray is highlighted: drop your file to hand it over.')
  return parts.join(' ')
}
