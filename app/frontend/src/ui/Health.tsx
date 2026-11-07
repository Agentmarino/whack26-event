// Health shown three ways at once: colour, a word and a pixel symbol. Never colour alone.
import type { Rag } from 'shared'

export type Tone = 'bad' | 'warn' | 'good' | 'neutral'

export const RAG_TONE: Record<Rag, Tone> = { red: 'bad', amber: 'warn', green: 'good' }
export const RAG_WORD: Record<Rag, string> = { red: 'Needs work', amber: 'Fair', green: 'Good' }

/** 7x7 pixel symbols: cross (bad), exclamation in a triangle (warn), tick (good), dot (neutral). */
export function ToneIcon({ tone, size = 14 }: { tone: Tone; size?: number }) {
  const d: Record<Tone, string> = {
    bad: 'M0 0h2v1H0zM5 0h2v1H5zM1 1h2v1H1zM4 1h2v1H4zM2 2h3v3H2zM1 5h2v1H1zM4 5h2v1H4zM0 6h2v1H0zM5 6h2v1H5z',
    warn: 'M3 0h1v1H3zM2 1h3v1H2zM2 2h1v1H2zM4 2h1v1H4zM1 3h2v1H1zM4 3h2v1H4zM1 4h5v1H1zM0 5h3v1H0zM4 5h3v1H4zM0 6h7v1H0zM3 2h1v2H3zM3 5h1v1H3z',
    good: 'M6 0h1v2H6zM5 2h1v1H5zM4 3h1v1H4zM0 3h1v1H0zM1 4h1v1H1zM3 4h1v1H3zM2 5h1v1H2z',
    neutral: 'M2 2h3v3H2z',
  }
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true" fill="currentColor" className="flex-none">
      <path d={d[tone]} />
    </svg>
  )
}

export function HealthPill({ rag, health }: { rag: Rag; health?: number }) {
  const tone = RAG_TONE[rag]
  return (
    <span className={`pill tone-${tone}`}>
      <ToneIcon tone={tone} />
      <span>{RAG_WORD[rag]}</span>
      {health !== undefined && <span className="sr-only">, health {Math.round(health)} out of 100</span>}
    </span>
  )
}

/** Ten blocks, filled by health / 10. */
export function HealthMeter({ rag, health }: { rag: Rag; health: number }) {
  const on = Math.max(0, Math.min(10, Math.round(health / 10)))
  return (
    <div className={`meter tone-${RAG_TONE[rag]} !bg-transparent !border-0`} aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} className={i < on ? 'on' : undefined} />
      ))}
    </div>
  )
}
