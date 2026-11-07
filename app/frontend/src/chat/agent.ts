// Drives the NPC kit from contract messages. The contract's `gesture` names are mostly kit STATES
// (conversation.md, "Gesture → NPC kit"); a few message kinds add one of the kit's own gestures.
import type { AgentMessage } from 'shared'
import type { NpcHandle } from '../npc'

let settleTimer = 0

/** Call when a message becomes the current one. */
export function presentMessage(npc: NpcHandle | null, msg: AgentMessage) {
  if (!npc) return
  window.clearTimeout(settleTimer)
  npc.emote(msg.emote)
  switch (msg.gesture) {
    case 'none':
      npc.setState('talking')
      break
    case 'wave':
      npc.setState('greeting')
      break
    case 'receive-document':
      // An upload already had him take the file: keep reading rather than reach twice.
      if (npc.snapshot()?.state === 'reading') break
      npc.setState('receive-document')
      settleTimer = window.setTimeout(() => {
        if (npc.snapshot()?.state === 'receive-document') npc.setState('reading')
      }, npc.settleIn() + 150)
      break
    case 'coach':
      // The switch (glasses on, planner up) plays once; later coach lines keep the pose.
      if (npc.snapshot()?.state !== 'coach') npc.setState('coach')
      break
    default:
      npc.setState(msg.gesture)
  }
  // Extra kit gestures that fit a card (call after setState, which clears gestures).
  if (msg.kind === 'projection' || msg.kind === 'whatif') npc.gesture('tap-calc')
  else if (msg.kind === 'ladder') npc.gesture('open-palm')
}

/** Call when the current line has finished typing. */
export function lineDone(npc: NpcHandle | null, msg: AgentMessage | null) {
  if (!npc) return
  npc.stopTalking()
  if (msg?.gesture === 'none' && npc.snapshot()?.state === 'talking') npc.setState('idle')
}

/** While a request is out. Uploads read; everything else thinks. */
export function presentWaiting(npc: NpcHandle | null, kind: 'turn' | 'upload' | 'whatif') {
  if (!npc) return
  window.clearTimeout(settleTimer)
  npc.stopTalking()
  if (kind === 'upload') {
    npc.emote('neutral')
    npc.setState('receive-document')
    settleTimer = window.setTimeout(() => {
      if (npc.snapshot()?.state === 'receive-document') npc.setState('reading')
    }, npc.settleIn() + 150)
    return
  }
  // Keep the document in his hands if he is still reading it.
  if (npc.snapshot()?.state === 'reading' || npc.snapshot()?.state === 'receive-document') return
  npc.setState('thinking')
}

export function presentError(npc: NpcHandle | null) {
  if (!npc) return
  npc.stopTalking()
  npc.emote('concerned')
  npc.setState('idle')
}
