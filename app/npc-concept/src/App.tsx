import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BACKGROUND_NAMES, DEFAULT_FACIAL_HAIR, DebugPanel, DialogueBox, FACIAL_HAIR, NATIVE_H, NATIVE_W, NpcScene, useIntegerScale, usePrefersReducedMotion,
  type Background, type DialogueLine, type FacialHair, type NpcHandle, type NpcSnapshot, type Speed,
} from './npc'
import { OPENING, SAMPLE, TEST_LINE } from './sample'

const SPEAKER = 'Agent' // name TBD
type MotionPref = 'system' | 'on' | 'off'
/** Set by vite.config.ts only when public/brand/capital-one-logo.svg or .png exists. */
const LOGO_URL: string = import.meta.env.VITE_NPC_LOGO || ''

/** The debug panel sits beside the scene on wide screens and below it on a phone. */
function useWide(): boolean {
  const query = '(min-width: 64rem)'
  const [v, setV] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setV(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return v
}

export default function App() {
  const npc = useRef<NpcHandle>(null)
  const [snap, setSnap] = useState<NpcSnapshot | null>(null)
  const [debug, setDebug] = useState(false)
  const [speed, setSpeed] = useState<Speed>('1x')
  const [ambient, setAmbient] = useState(true)
  const [motionPref, setMotionPref] = useState<MotionPref>('system')
  const [green, setGreen] = useState(false)
  const [facialHair, setFacialHair] = useState<FacialHair>(DEFAULT_FACIAL_HAIR)
  const [background, setBackground] = useState<Background>('day')
  const [line, setLine] = useState<DialogueLine>({ id: 0, speaker: SPEAKER, text: OPENING.text })
  const [chips, setChips] = useState<string[]>(OPENING.chips)
  const [hasNext, setHasNext] = useState(false)
  const [sample, setSample] = useState<'idle' | 'running' | 'done'>('idle')
  const systemReduced = usePrefersReducedMotion()
  const reduced = motionPref === 'system' ? systemReduced : motionPref === 'on'
  const wide = useWide()
  const { scale, deviceScale } = useIntegerScale(23, debug && wide ? 16 * 16 + 16 : 0)

  const lineId = useRef(0)
  const lineDone = useRef<(() => void) | null>(null)
  const skipWait = useRef<(() => void) | null>(null)
  const skipRequested = useRef(false)
  const runToken = useRef(0)
  const dropTimer = useRef(0)

  const say = useCallback((text: string, nextChips: string[] = []) => {
    lineId.current += 1
    setLine({ id: lineId.current, speaker: SPEAKER, text })
    setChips(nextChips)
  }, [])

  // ---------- sample conversation ----------
  const stopSample = useCallback(() => {
    runToken.current += 1
    lineDone.current?.()
    skipWait.current?.()
    setHasNext(false)
    skipRequested.current = false
    setSample((s) => (s === 'running' ? 'idle' : s))
    if (document.body.dataset.sample === 'running') document.body.dataset.sample = 'stopped'
  }, [])

  /** Next button or any chip during the sample: move on now instead of waiting. */
  const advanceSample = useCallback(() => {
    if (skipWait.current) skipWait.current()
    else skipRequested.current = true
  }, [])

  const playSample = useCallback(async () => {
    const token = ++runToken.current
    const live = () => runToken.current === token
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        if (skipRequested.current) {
          skipRequested.current = false
          resolve()
          return
        }
        const finish = () => {
          window.clearTimeout(id)
          skipWait.current = null
          resolve()
        }
        const id = window.setTimeout(finish, ms)
        skipWait.current = () => {
          skipRequested.current = false
          finish()
        }
      })
    skipRequested.current = false
    setSample('running')
    document.body.dataset.sample = 'running'
    const h = npc.current!
    h.reset()
    for (let i = 0; i < SAMPLE.length; i++) {
      if (!live()) return
      const step = SAMPLE[i]
      h.emote(step.emote)
      h.setState(step.state)
      setHasNext(i < SAMPLE.length - 1)
      const printed = new Promise<void>((resolve) => (lineDone.current = resolve))
      say(step.text, step.chips)
      await printed
      if (!live()) return
      await wait(Math.max(h.settleIn(), step.hold ?? 0) + 900)
    }
    if (!live()) return
    setHasNext(false)
    setSample('done')
    document.body.dataset.sample = 'done'
  }, [say])

  // ---------- free play ----------
  const onFileDrop = useCallback((file: File) => {
    stopSample()
    const h = npc.current!
    h.emote('warm')
    h.setState('receive-document')
    say(`Thank you. I have ${file.name}. Let me read it.`)
    window.clearTimeout(dropTimer.current)
    dropTimer.current = window.setTimeout(() => h.snapshot()?.state === 'receive-document' && h.setState('reading'), h.settleIn() + 1200)
  }, [say, stopSample])

  const onPaperClick = useCallback(() => {
    npc.current?.emote('warm')
    npc.current?.setState('talking')
    say('This is your summary sheet. In the full app, this is where your download package opens.')
  }, [say])

  const onReply = useCallback((text: string) => {
    if (text === OPENING.chips[0]) {
      void playSample()
      return
    }
    if (sample === 'running') {
      advanceSample()
      return
    }
    stopSample()
    npc.current?.setState('listening')
    say(`Noted: "${text}". I'll keep that in mind.`)
  }, [advanceSample, playSample, sample, say, stopSample])

  // D toggles the debug panel (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key.toLowerCase() !== 'd' || e.metaKey || e.ctrlKey || e.altKey) return
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return
      setDebug((d) => !d)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    npc.current?.setPalette(green ? { uniform: '#1f6b45', uniformShade: '#124a2f', uniformLight: '#3d8c63' } : {})
  }, [green])

  const width = NATIVE_W * scale
  return (
    <div className="page">
      <header className="page-head">
        <h1>Lender&rsquo;s Eyes<span className="page-head__sub"> &middot; credit agent</span></h1>
        <button
          type="button"
          className="page-debug-toggle"
          aria-pressed={debug}
          aria-controls="npc-debug-panel"
          data-npc-action="debug-toggle"
          onClick={() => setDebug((d) => !d)}
        >
          Debug <kbd aria-hidden="true">D</kbd>
        </button>
      </header>
      <div className="page-main">
        <main className="stage" style={{ width }}>
          <NpcScene
            ref={npc}
            scale={scale}
            ambient={ambient}
            reducedMotion={reduced}
            onChange={setSnap}
            onFileDrop={onFileDrop}
            onPaperClick={onPaperClick}
            wordmarkSrc={LOGO_URL || undefined}
            facialHair={facialHair}
            background={background}
          />
          <DialogueBox
            line={line}
            width={width}
            speed={speed}
            onSpeedChange={setSpeed}
            reducedMotion={reduced}
            onChar={(c) => npc.current?.talk(c)}
            onSkip={() => npc.current?.stopTalking()}
            onLineDone={() => {
              npc.current?.stopTalking()
              lineDone.current?.()
              lineDone.current = null
            }}
            hasNext={hasNext}
            onNext={advanceSample}
            chips={chips}
            onChip={onReply}
            onSubmit={onReply}
            onInputFocus={(focused) => {
              const s = npc.current?.snapshot()?.state
              if (focused && (s === 'idle' || s === 'talking')) npc.current?.setState('listening')
              if (!focused && s === 'listening') npc.current?.setState('idle')
            }}
          />
        </main>
        {debug && (
          <DebugPanel
            snapshot={snap}
            onState={(s) => {
              stopSample()
              npc.current?.setState(s)
            }}
            onEmote={(e) => npc.current?.emote(e)}
            onGesture={(g) => npc.current?.gesture(g)}
            info={[
              ['state', snap?.state ?? ''],
              ['emote', snap?.emote ?? ''],
              ['gesture', snap?.gesture ?? ''],
              ['mode', snap?.mode ?? ''],
              ['look', `${snap?.facialHair ?? ''}, ${snap?.background ?? ''}`],
              ['paper', snap?.paper ?? ''],
              ['scale', `${deviceScale}x device, ${+(NATIVE_W * scale).toFixed(2)}x${+(NATIVE_H * scale).toFixed(2)} css`],
              ['reduced motion', reduced ? 'on' : 'off'],
              ['sample', sample],
            ]}
          >
            <section>
              <h3>Sample</h3>
              <div className="npc-debug__grid">
                <button
                  type="button"
                  data-npc-action="play-sample"
                  onClick={(e) => {
                    if (e.detail > 0) e.currentTarget.blur() // mouse click: let Space reach the dialogue
                    void playSample()
                  }}
                >
                  Play sample conversation
                </button>
                <button type="button" data-npc-action="stop-sample" onClick={stopSample}>Stop</button>
                <button
                  type="button"
                  data-npc-action="test-line"
                  onClick={(e) => {
                    if (e.detail > 0) e.currentTarget.blur()
                    stopSample()
                    npc.current?.setState('talking')
                    say(TEST_LINE)
                  }}
                >
                  Say a test line
                </button>
              </div>
            </section>
            <section>
              <h3>Facial hair</h3>
              <div className="npc-debug__grid">
                {FACIAL_HAIR.map((f) => (
                  <button key={f} type="button" data-npc-facial-hair={f} aria-pressed={facialHair === f} onClick={() => setFacialHair(f)}>
                    {f === 'moustache-stubble' ? 'moustache + stubble' : f}
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h3>Background</h3>
              <div className="npc-debug__grid">
                {BACKGROUND_NAMES.map((b) => (
                  <button key={b} type="button" data-npc-background={b} aria-pressed={background === b} onClick={() => setBackground(b)}>{b}</button>
                ))}
              </div>
            </section>
            <section>
              <h3>Scene</h3>
              <div className="npc-debug__grid">
                <button type="button" data-npc-action="tray-doc" aria-pressed={!!snap?.trayDoc} onClick={() => npc.current?.setTrayDoc(!snap?.trayDoc)}>Document on tray</button>
                <button type="button" data-npc-action="drop-hover" aria-pressed={!!snap?.dropHover} onClick={() => npc.current?.setDropHover(!snap?.dropHover)}>Drag highlight</button>
                <button type="button" data-npc-action="clear-paper" onClick={() => npc.current?.clearPaper()}>Clear paper</button>
                <button type="button" data-npc-action="ambient" aria-pressed={ambient} onClick={() => setAmbient((a) => !a)}>Ambient</button>
                <button type="button" data-npc-action="recolour" aria-pressed={green} onClick={() => setGreen((g) => !g)}>Recolour uniform</button>
                <button
                  type="button"
                  data-npc-action="reset"
                  onClick={() => {
                    stopSample()
                    npc.current?.reset()
                    say(OPENING.text, OPENING.chips)
                  }}
                >
                  Reset
                </button>
              </div>
              <label className="npc-debug__select">
                Reduced motion{' '}
                <select value={motionPref} data-npc-action="motion" onChange={(e) => setMotionPref(e.target.value as MotionPref)}>
                  <option value="system">follow system</option>
                  <option value="on">on</option>
                  <option value="off">off</option>
                </select>
              </label>
            </section>
          </DebugPanel>
        )}
      </div>
    </div>
  )
}
