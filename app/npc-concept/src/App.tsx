import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DebugPanel, DialogueBox, NpcScene, useIntegerScale, usePrefersReducedMotion,
  type DialogueLine, type NpcHandle, type NpcSnapshot, type Speed,
} from './npc'
import { OPENING, SAMPLE, TEST_LINE } from './sample'

const SPEAKER = 'Agent' // name TBD
type MotionPref = 'system' | 'on' | 'off'

export default function App() {
  const npc = useRef<NpcHandle>(null)
  const [snap, setSnap] = useState<NpcSnapshot | null>(null)
  const [debug, setDebug] = useState(false)
  const [speed, setSpeed] = useState<Speed>('1x')
  const [ambient, setAmbient] = useState(true)
  const [motionPref, setMotionPref] = useState<MotionPref>('system')
  const [green, setGreen] = useState(false)
  const [line, setLine] = useState<DialogueLine>({ id: 0, speaker: SPEAKER, text: OPENING.text })
  const [chips, setChips] = useState<string[]>(OPENING.chips)
  const [hasNext, setHasNext] = useState(false)
  const [sample, setSample] = useState<'idle' | 'running' | 'done'>('idle')
  const systemReduced = usePrefersReducedMotion()
  const reduced = motionPref === 'system' ? systemReduced : motionPref === 'on'
  const { scale, deviceScale } = useIntegerScale(16, debug ? 16 * 16 + 16 : 0)

  const lineId = useRef(0)
  const lineDone = useRef<(() => void) | null>(null)
  const skipWait = useRef<(() => void) | null>(null)
  const runToken = useRef(0)

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
    setSample((s) => (s === 'running' ? 'idle' : s))
  }, [])

  const playSample = useCallback(async () => {
    const token = ++runToken.current
    const live = () => runToken.current === token
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = window.setTimeout(resolve, ms)
        skipWait.current = () => {
          window.clearTimeout(id)
          resolve()
        }
      })
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
    window.setTimeout(() => h.snapshot()?.state === 'receive-document' && h.setState('reading'), h.settleIn() + 1200)
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
    stopSample()
    npc.current?.setState('listening')
    say(`Noted: "${text}". I'll keep that in mind.`)
  }, [playSample, say, stopSample])

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

  const width = 320 * scale
  return (
    <div className="page">
      <header className="page-head">
        <h1>Lender&rsquo;s Eyes &middot; credit agent concept</h1>
        <p>Press <kbd>D</kbd> for the debug panel</p>
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
            onNext={() => skipWait.current?.()}
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
              ['paper', snap?.paper ?? ''],
              ['scale', `${deviceScale}x device, ${320 * scale}x${180 * scale} css`],
              ['reduced motion', reduced ? 'on' : 'off'],
              ['sample', sample],
            ]}
          >
            <section>
              <h3>Sample</h3>
              <div className="npc-debug__grid">
                <button type="button" data-npc-action="play-sample" onClick={() => void playSample()}>Play sample conversation</button>
                <button type="button" data-npc-action="stop-sample" onClick={stopSample}>Stop</button>
                <button
                  type="button"
                  data-npc-action="test-line"
                  onClick={() => {
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
