import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FileKind, Persona } from 'shared'
import { createApi, createMockApi, mockFromEnv, type Api } from './api/client'
import { CardContext, type CardCtx, type WhyTrail } from './cards/context'
import { lineDone, presentError, presentMessage, presentWaiting } from './chat/agent'
import { Dock, type DockMode } from './chat/Dock'
import { AGENT_NAME, Transcript } from './chat/Transcript'
import { useConversation } from './chat/useConversation'
import { useSpeech } from './chat/useSpeech'
import { NATIVE_H, NATIVE_W, NpcScene, useIntegerScale, usePrefersReducedMotion, useTypewriter, type NpcHandle } from './npc'
import { useSettings } from './settings'
import { PaperSheet } from './sheets/PaperSheet'
import { LetterSheet, PersonaSheet, WhySheet } from './sheets/PickSheets'
import { SettingsSheet } from './sheets/SettingsSheet'
import { WhatIfSheet } from './sheets/WhatIfSheet'

const LOGO = '/brand/capital-one-logo.png'
const DISCLAIMER = 'Estimates for a demo. Not financial advice and not a lending decision.'

function useMedia(query: string) {
  const [v, setV] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setV(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return v
}

const isControl = (t: EventTarget | null) =>
  t instanceof HTMLElement && !!t.closest('input, textarea, select, button, a, label, summary, [contenteditable="true"], dialog')

export default function App() {
  const { settings } = useSettings()
  const [api, setApi] = useState<Api>(() => createApi(mockFromEnv()))
  const npc = useRef<NpcHandle>(null)
  const systemReduced = usePrefersReducedMotion()
  const reduced = systemReduced
  const wide = useMedia('(min-width: 64rem)')
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const { scale } = useIntegerScale(wide ? 2.5 : 22, wide ? 32 * rootPx + 72 : 0)

  // ---------- samples ----------
  const [personas, setPersonas] = useState<Persona[] | null>(null)
  const [personasError, setPersonasError] = useState<string | null>(null)
  const loadPersonas = useCallback(() => {
    setPersonasError(null)
    api
      .personas()
      .then(setPersonas)
      .catch(() => setPersonasError("I couldn't load the samples just now."))
  }, [api])
  useEffect(loadPersonas, [loadPersonas])

  const conv = useConversation(api, { plainEnglish: settings.plainEnglish, personas: personas ?? [] })
  const { state, current } = conv

  // A new api (offline switch): start again on it.
  const apiRef = useRef(api)
  useEffect(() => {
    if (apiRef.current === api) return
    apiRef.current = api
    npc.current?.reset()
    conv.start()
  }, [api, conv])

  // ---------- typewriter for the current line ----------
  const instant = reduced || settings.demo || settings.speed === 'instant'
  const tw = useTypewriter(current?.msg.text ?? '', current?.key ?? 'none', {
    speed: settings.speed,
    instant,
    onChar: (c) => npc.current?.talk(c),
    onDone: () => lineDone(npc.current, current?.msg ?? null),
  })
  const typed = !!current && tw.done

  useSpeech(current?.msg.text ?? null, current?.key ?? null, settings.readAloud, settings.voiceRate)

  // ---------- the agent's body ----------
  useEffect(() => {
    if (current) presentMessage(npc.current, current.msg)
  }, [current?.key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (state.pending) presentWaiting(npc.current, state.pending.kind)
  }, [state.pending])
  useEffect(() => {
    if (state.error) presentError(npc.current)
  }, [state.error])

  // ---------- moving on ----------
  const advance = useCallback(() => {
    if (state.pending) return
    if (current && !tw.done) {
      tw.finish()
      npc.current?.stopTalking()
      return
    }
    if (state.queue.length) return conv.advance()
    if (current && state.expects?.kind === 'none') conv.skip()
  }, [state.pending, state.queue.length, state.expects, current, tw, conv])

  // Space or Enter anywhere outside a control (and with no sheet open) is "next".
  const advanceRef = useRef(advance)
  advanceRef.current = advance
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return
      if (e.metaKey || e.ctrlKey || e.altKey || isControl(e.target) || document.querySelector('dialog[open]')) return
      e.preventDefault()
      advanceRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Demo mode: a turn that expects nothing moves on by itself once its line is out.
  useEffect(() => {
    if (!settings.demo || !typed || state.queue.length || state.pending || state.expects?.kind !== 'none') return
    const id = window.setTimeout(() => conv.skip(), 900)
    return () => window.clearTimeout(id)
  }, [settings.demo, typed, state.queue.length, state.pending, state.expects, conv])

  const restart = useCallback(() => {
    npc.current?.reset()
    conv.start()
  }, [conv])

  // ---------- sheets ----------
  const [sheet, setSheet] = useState<null | 'persona' | 'letter' | 'paper' | 'settings' | 'whatif'>(null)
  const [why, setWhy] = useState<WhyTrail | null>(null)
  const [personaFor, setPersonaFor] = useState<FileKind>('credit_report')

  const onSample = (kind: FileKind) => {
    if (state.personaId) return conv.sample(kind)
    if (settings.demo && personas?.[0]) return conv.sample(kind, personas[0].id)
    setPersonaFor(kind)
    setSheet('persona')
  }
  const onFile = (file: File, kind: FileKind) => void conv.upload(file, kind)
  const onTrayFile = (file: File) => {
    if (state.pending) return
    const kind: FileKind = state.expects?.kind === 'file' ? (state.expects.fileKinds?.[0] ?? 'credit_report') : 'letter'
    onFile(file, kind)
  }

  const planChosen = useMemo(
    () => state.entries.some((e) => e.type === 'agent' && (e.msg.ref?.on === 'step' || e.msg.ref?.on === 'projection')),
    [state.entries],
  )
  const cardCtx = useMemo<CardCtx>(
    () => ({
      result: state.result,
      whatIfs: state.whatIfs,
      whatIfPlans: state.whatIfPlans,
      paperUrl: state.paperUrl,
      plan: state.plan,
      showWhy: setWhy,
      openPaper: () => setSheet('paper'),
    }),
    [state.result, state.whatIfs, state.whatIfPlans, state.paperUrl, state.plan],
  )

  // ---------- dock ----------
  const mode: DockMode = state.pending
    ? { kind: 'busy', label: state.pending.label }
    : state.error
      ? { kind: 'error', canGoOffline: api.mode === 'live', sessionGone: state.sessionGone }
      : current && !typed
        ? { kind: 'next', typing: true, more: state.queue.length }
        : state.queue.length
          ? { kind: 'next', typing: false, more: state.queue.length }
          : !state.expects
            ? { kind: 'idle' }
            : state.expects.kind === 'none'
              ? { kind: 'continue' }
              : { kind: 'input', expects: state.expects }

  const showLetter = !!state.step && state.step !== 'ask_letter' && !state.hasLetter && !state.pending
  const inCoach = state.step === 'coach' && planChosen

  // One polite live region for the agent's lines and status changes.
  const lastEntry = state.entries[state.entries.length - 1]
  const announce = current
    ? `${AGENT_NAME} says: ${current.msg.text}`
    : state.pending
      ? `${state.pending.label}.`
      : state.error
        ? `${AGENT_NAME} says: ${state.error}`
        : lastEntry?.type === 'notice'
          ? `${AGENT_NAME} says: ${lastEntry.text}`
          : ''

  // Short phone screens (iPhone with Safari's bars): hide the desk's front panel (13 of 96 rows) so the
  // chat gets the room. The desk top, tray and the summary sheet stay in view.
  const short = !wide && window.innerHeight < 760
  const cropPx = short ? Math.floor(13 * scale) : 0
  const sceneH = Math.ceil(NATIVE_H * scale - 1e-6)
  const width = NATIVE_W * scale
  return (
    <CardContext.Provider value={cardCtx}>
      <div className="app" data-api={api.mode} data-step={state.step ?? 'none'}>
        <div
          className="app__stage"
          style={{ ...(wide ? { width } : {}), ...(cropPx ? { height: sceneH - cropPx, overflow: 'clip' } : {}) }}
          data-crop={cropPx || undefined}
        >
          <NpcScene
            ref={npc}
            scale={scale}
            reducedMotion={reduced}
            wordmarkSrc={LOGO}
            facialHair="moustache-stubble"
            background="day"
            onFileDrop={onTrayFile}
            onPaperClick={() => setSheet('paper')}
          />
          {showLetter && (
            <button type="button" className="scene-btn left-2" onClick={() => setSheet('letter')} data-action="letter">
              Have a decline letter?
            </button>
          )}
          <button
            type="button"
            className="scene-btn right-2"
            onClick={() => setSheet('settings')}
            aria-label="Settings: text speed, text size, voice, colours"
            data-action="settings"
          >
            <svg width="18" height="18" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true" fill="currentColor">
              <path d="M0 1h9v1H0zM1 0h3v3H1zM0 4h9v1H0zM5 3h3v3H5zM0 7h9v1H0zM2 6h3v3H2z" />
            </svg>
            <span className="ml-1.5 hidden sm:inline">Settings</span>
          </button>
        </div>

        <main className="app__chat" aria-label="Conversation with the credit agent">
          <p className="sr-only" aria-live="polite" aria-atomic="true" data-testid="live">
            {announce}
          </p>
          <Transcript conv={state} printed={current ? tw.printed : 0} typed={typed} onAdvance={advance} />
          <Dock
            mode={mode}
            onNext={advance}
            onShowAll={conv.showAll}
            onContinue={() => conv.skip()}
            onChip={(v, how) => conv.choose(v, how)}
            onText={(v) => conv.choose(v, 'text')}
            onFile={onFile}
            onSample={onSample}
            onSkip={() => conv.skip('Skip')}
            onRetry={conv.retry}
            onRestart={restart}
            onOffline={() => setApi(createMockApi())}
            onSliders={inCoach ? () => setSheet('whatif') : undefined}
          />
          <footer className="flex-none px-3 pb-[max(0.375rem,env(safe-area-inset-bottom))] text-[0.6875rem] leading-tight text-muted" data-testid="disclaimer">
            {DISCLAIMER}
          </footer>
        </main>

        <PersonaSheet
          open={sheet === 'persona'}
          onClose={() => setSheet(null)}
          personas={personas}
          error={personasError}
          onRetry={loadPersonas}
          onPick={(p) => {
            setSheet(null)
            conv.sample(personaFor, p.id)
          }}
        />
        <LetterSheet
          open={sheet === 'letter'}
          onClose={() => setSheet(null)}
          onFile={(f) => {
            setSheet(null)
            onFile(f, 'letter')
          }}
          onText={(t) => {
            setSheet(null)
            void conv.pasteText(t, 'letter')
          }}
          onSample={() => {
            setSheet(null)
            conv.sample('letter', state.personaId ?? personas?.[0]?.id)
          }}
        />
        <PaperSheet
          open={sheet === 'paper'}
          onClose={() => setSheet(null)}
          api={api}
          result={state.result}
          paperUrl={state.paperUrl}
          plan={state.plan}
          planChosen={planChosen}
        />
        <SettingsSheet
          open={sheet === 'settings'}
          onClose={() => setSheet(null)}
          apiMode={api.mode}
          onRestart={() => {
            setSheet(null)
            restart()
          }}
        />
        <WhatIfSheet
          open={sheet === 'whatif'}
          onClose={() => setSheet(null)}
          result={state.result}
          plan={state.plan}
          onRun={(changes, label) => {
            setSheet(null)
            void conv.whatIf({ changes }, label)
          }}
        />
        <WhySheet trail={why} onClose={() => setWhy(null)} />
      </div>
    </CardContext.Provider>
  )
}
