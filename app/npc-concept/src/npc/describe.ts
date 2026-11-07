// Plain-language description of what the agent is doing, used as the canvas aria-label.
import type { AgentState, Emote, NpcSnapshot } from './engine'

const STATE_TEXT: Record<AgentState, string> = {
  idle: 'waiting behind the counter',
  greeting: 'waving hello',
  talking: 'talking to you',
  listening: 'listening, looking down at your reply',
  asking: 'asking you a question, head tilted',
  'receive-document': 'taking your document from the tray on the counter',
  reading: 'reading your document line by line',
  thinking: 'thinking, hand on chin',
  explaining: 'explaining, pointing down at the reason',
  'slide-paper': 'sliding a summary sheet across the counter to you',
  coach: 'switching to coach mode: glasses on, holding a planner',
}

const EMOTE_TEXT: Record<Emote, string> = {
  neutral: 'calm',
  warm: 'warm and friendly',
  concerned: 'concerned but kind',
  pleased: 'pleased',
}

export function describeAgent(s: NpcSnapshot | null): string {
  if (!s) return 'Credit agent at the Capital One stand'
  const parts = [`Credit agent at the Capital One stand, ${STATE_TEXT[s.state]}. Expression: ${EMOTE_TEXT[s.emote]}.`]
  if (s.mode === 'coach' && s.state !== 'coach') parts.push('Coach mode, wearing glasses.')
  if (s.trayDoc) parts.push('A document is on the tray.')
  if (s.paper === 'ready') parts.push('A summary sheet is at the front of the counter.')
  if (s.dropHover) parts.push('The tray is highlighted: drop your file to hand it over.')
  return parts.join(' ')
}
