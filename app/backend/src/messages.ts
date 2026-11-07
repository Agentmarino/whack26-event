// Drafts become AgentMessages here: an id unique in the session, and who wrote the text.

import type { AgentMessage } from 'shared'
import { messageId, type Session } from './session.ts'
import type { Draft } from './templates.ts'

/** How a turn's drafts get their words. `prewarm` starts the work for messages coming up soon. */
export type Wording = {
  word(s: Session, drafts: Draft[]): Promise<AgentMessage[]>
  prewarm?(s: Session, drafts: Draft[]): void
}

export function toMessage(s: Session, d: Draft, writtenBy: 'template' | 'claude', text = d.text): AgentMessage {
  return {
    id: messageId(s, d.base),
    kind: d.kind,
    text,
    emote: d.emote,
    gesture: d.gesture,
    ...(d.ref ? { ref: d.ref } : {}),
    writtenBy,
  }
}

/** Templates only (tests, and the fallback). */
export const templateWording: Wording = {
  word: async (s, drafts) => drafts.map(d => toMessage(s, d, 'template')),
}
