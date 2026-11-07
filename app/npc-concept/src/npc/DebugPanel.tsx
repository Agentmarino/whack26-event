import { useEffect, useRef, type ReactNode } from 'react'
import { AGENT_STATES, EMOTES, GESTURES, type AgentState, type Emote, type Gesture, type NpcSnapshot } from './engine'

export interface DebugPanelProps {
  snapshot: NpcSnapshot | null
  onState: (s: AgentState) => void
  onEmote: (e: Emote) => void
  onGesture: (g: Gesture) => void
  info?: [string, string][]
  children?: ReactNode
}

/** Buttons for every state, emote and gesture. Extra sections go in children. */
export function DebugPanel({ snapshot, onState, onEmote, onGesture, info, children }: DebugPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])
  return (
    <aside className="npc-debug" aria-labelledby="npc-debug-title">
      <h2 id="npc-debug-title" ref={headingRef} tabIndex={-1}>Debug panel <kbd>D</kbd></h2>
      <section>
        <h3>State</h3>
        <div className="npc-debug__grid">
          {AGENT_STATES.map((s) => (
            <button key={s} type="button" data-npc-state={s} aria-pressed={snapshot?.state === s} onClick={() => onState(s)}>{s}</button>
          ))}
        </div>
      </section>
      <section>
        <h3>Emote</h3>
        <div className="npc-debug__grid">
          {EMOTES.map((e) => (
            <button key={e} type="button" data-npc-emote={e} aria-pressed={snapshot?.emote === e} onClick={() => onEmote(e)}>{e}</button>
          ))}
        </div>
      </section>
      <section>
        <h3>Gesture</h3>
        <div className="npc-debug__grid">
          {GESTURES.map((g) => (
            <button key={g} type="button" data-npc-gesture={g} aria-pressed={snapshot?.gesture === g} onClick={() => onGesture(g)}>{g}</button>
          ))}
        </div>
      </section>
      {children}
      {info && (
        <dl className="npc-debug__info">
          {info.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd data-npc-info={k}>{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  )
}
