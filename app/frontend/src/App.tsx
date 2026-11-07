import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FileKind, Persona } from 'shared'
import { createApi, createMockApi, mockFromEnv, type Api } from './api/client'
import { BusinessCardOverlay, CARD_TEXT, type Rect } from './cards/BusinessCard'
import { CardContext, type CardCtx, type WhyTrail } from './cards/context'
import { lineDone, presentError, presentMessage, presentWaiting } from './chat/agent'
import { Dock, type DockMode } from './chat/Dock'
import { AGENT_NAME } from './chat/Transcript'
import { useConversation } from './chat/useConversation'
import { useSpeech } from './chat/useSpeech'
import {
  ExtendedScene, extendedLayout, NATIVE_H, usePrefersReducedMotion, useTypewriter, type FacialHair, type NpcHandle,
  type NpcSnapshot,
} from './npc'
import { blip } from './game/blip'
import { DataWindow } from './game/DataWindow'
import { GameBox } from './game/GameBox'
import { GearIcon, NotebookIcon, SidePanel, type PanelTab } from './game/SidePanel'
import { useSettings } from './settings'
import { PaperSheet } from './sheets/PaperSheet'
import { LetterSheet, PersonaSheet, WhySheet } from './sheets/PickSheets'
import { SettingsSheet } from './sheets/SettingsSheet'
import { WhatIfSheet } from './sheets/WhatIfSheet'

const LOGO = '/brand/capital-one-logo.png'
const FACIAL_HAIR: FacialHair = 'moustache-stubble'
/** 115: the card rests on the desk this long after it lands, then grows into the full card. */
const CARD_REST_MS = 220
/** 116: kinds that get a small game window above the dialogue box. */
const WINDOW_KINDS = new Set(['reason', 'decline', 'step', 'projection', 'ladder', 'whatif', 'paper'])

/** 116: the window size, kept current (the scene and the box size from it). */
function useViewport() {
  const [v, setV] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const on = () => setV({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    window.visualViewport?.addEventListener('resize', on)
    return () => {
      window.removeEventListener('resize', on)
      window.visualViewport?.removeEventListener('resize', on)
    }
  }, [])
  return v
}

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

/**
 * 116: the dialogue font size nearest `target` that is a whole CSS px and puts each Press Start 2P pixel
 * (1/8 em) on a whole number of device pixels, so the letters stay crisp: on a 3x phone 8, 16, 24...; on a
 * 2x screen every 4 px; on a 1x screen every 8 px. A tie goes up (bigger text was asked for).
 */
function crispPx(target: number, dpr: number) {
  const d = Math.max(1, Math.round(dpr))
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
  const step = 8 / gcd(8, d)
  return Math.max(step, Math.round(target / step) * step)
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
  const vp = useViewport()
  // 116: the dialogue box may use up to this much of the screen; the scene keeps Cap and the desk above it.
  const [panel, setPanel] = useState<{ open: boolean; tab: PanelTab; focus: string | null }>({ open: false, tab: 'chat', focus: null })
  const stageW = wide && panel.open ? Math.round(vp.w * 0.6) : vp.w
  // The scene takes the biggest whole-number scale that leaves the box at least this share of the
  // screen (more with bigger text), then the box gets all the height the scene does not need. The
  // corner icons sit over the ceiling, so nothing else is reserved.
  // Same rule as ExtendedScene (extendedLayout): a whole number of device pixels per scene pixel.
  const dpr = window.devicePixelRatio || 1
  const minBox = vp.h * (wide ? 0.45 : settings.textSize === 150 ? 0.7 : settings.textSize === 125 ? 0.48 : 0.4)
  const { scale } = extendedLayout(stageW, vp.h, 0, minBox, dpr)
  const boxMax = Math.floor(vp.h - NATIVE_H * scale - 4)
  // The dialogue font: Press Start 2P at a crisp size (16 px on a phone, 24 px wide). VT323 with Readable
  // font, and with bigger text on a phone: Press Start 2P's next crisp size there (24 px) fits 13 letters
  // a line and one menu choice a page.
  const pf = crispPx((wide ? 24 : 16) * (settings.textSize / 100), dpr)
  const boxVt = settings.readable || (settings.textSize > 100 && stageW < 600)
  // 116: 2 to 4 lines a page (at most 4 on a phone): fewer when the text is big.
  const lines = boxVt ? (settings.textSize === 150 ? 3 : 4) : wide ? 3 : pf > 16 ? 3 : 4

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

  // ---------- 116: the current line, page by page ----------
  // GameBox measures the line into pages (2 to 4 lines each); each page types on its own. The business
  // card is not typed out (and does not move his mouth): it is a card, not a line.
  const curKey = current?.key ?? 'none'
  const [paged, setPaged] = useState<{ key: string; pages: string[] }>({ key: '', pages: [] })
  const [pageAt, setPageAt] = useState<{ key: string; page: number }>({ key: '', page: 0 })
  const pages = current?.msg.kind === 'card' ? [''] : paged.key === curKey && paged.pages.length ? paged.pages : [current?.msg.text ?? '']
  const page = pageAt.key === curKey ? Math.min(pageAt.page, pages.length - 1) : 0
  const lastPage = page >= pages.length - 1
  const onPages = useCallback((key: string, next: string[]) => {
    setPaged((p) => (p.key === key && p.pages.join('\u0000') === next.join('\u0000') ? p : { key, pages: next }))
  }, [])
  const instant = reduced || settings.demo || settings.speed === 'instant' || current?.msg.kind === 'card'
  const blipOn = settings.blip && !settings.readAloud && !reduced
  const tw = useTypewriter(pages[page] ?? '', `${curKey}:${page}`, {
    speed: settings.speed,
    instant,
    onChar: (c) => {
      npc.current?.talk(c)
      if (blipOn) blip(c)
    },
    onDone: () => {
      if (lastPage) lineDone(npc.current, current?.msg ?? null)
      else npc.current?.stopTalking()
    },
  })
  const typed = !!current && tw.done && lastPage

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
    // 116: the next page of a long line
    if (current && !lastPage) {
      setPageAt({ key: curKey, page: page + 1 })
      return
    }
    if (state.queue.length) return conv.advance()
    if (current && state.expects?.kind === 'none') conv.skip()
  }, [state.pending, state.queue.length, state.expects, current, tw, conv, lastPage, curKey, page])

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

  // ---------- 115: Cap's business card ----------
  // It opens by itself once per conversation: when the card he slides lands on the desk (at once with
  // reduced motion), or when a `card` message shows without a slide. The history row opens it again.
  // Keyed by the conversation run, not reset in an effect: with a fast backend the restart and the first
  // turn can land in one render, and the card must still open.
  const [bizCard, setBizCard] = useState<{ origin: Rect | null; text: string; run: number } | null>(null)
  const runNow = useRef(state.run)
  runNow.current = state.run
  const cardShownFor = useRef(-1)
  const cardTimer = useRef({ id: 0, run: -1 })
  const cardPhase = useRef<NpcSnapshot['card']>('none')
  const cardText = () => state.queue.find((m) => m.kind === 'card')?.text || (current?.msg.kind === 'card' ? current.msg.text : '') || CARD_TEXT
  const cardTextRef = useRef(cardText)
  cardTextRef.current = cardText
  useEffect(() => {
    // a new conversation (restart, offline switch): drop a card still waiting or open from the last one
    if (cardTimer.current.run !== state.run) window.clearTimeout(cardTimer.current.id)
    setBizCard((b) => (b && b.run !== state.run ? null : b))
  }, [state.run])
  const onNpcChange = useCallback(
    (s: NpcSnapshot) => {
      const was = cardPhase.current
      cardPhase.current = s.card
      const run = runNow.current
      if (s.card !== 'landed' || was === 'landed' || cardShownFor.current === run) return
      cardShownFor.current = run
      const origin = npc.current?.cardRect() ?? null
      window.clearTimeout(cardTimer.current.id)
      const id = window.setTimeout(
        () => {
          npc.current?.clearCard()
          setBizCard({ origin, text: cardTextRef.current(), run })
        },
        reduced ? 0 : CARD_REST_MS,
      )
      cardTimer.current = { id, run }
    },
    [reduced],
  )
  useEffect(() => () => window.clearTimeout(cardTimer.current.id), [])
  useEffect(() => {
    if (current?.msg.kind !== 'card' || cardShownFor.current === state.run) return
    if (npc.current?.snapshot()?.card === 'sliding') return // it opens when it lands
    cardShownFor.current = state.run
    setBizCard({ origin: null, text: current.msg.text || CARD_TEXT, run: state.run })
  }, [current?.key]) // eslint-disable-line react-hooks/exhaustive-deps
  const focusDock = useRef(false)
  const putCardAway = () => {
    setBizCard(null)
    focusDock.current = true
    // The intro: putting the card away moves on to the card message, so its reply chip shows at once.
    if (state.queue[0]?.kind === 'card' && !state.pending) {
      if (current && !tw.done) tw.finish()
      npc.current?.stopTalking()
      conv.advance()
    }
  }
  // Focus back to the reply area once it has re-rendered (and after the key or tap that closed the card
  // has finished, so it cannot press the new chip).
  useEffect(() => {
    if (bizCard || !focusDock.current) return
    focusDock.current = false
    const id = window.setTimeout(() => {
      document
        .querySelector<HTMLElement>('[data-testid="dock"] button:not([disabled]), [data-testid="dock"] input:not([type=file])')
        ?.focus({ preventScroll: true })
    }, 0)
    return () => window.clearTimeout(id)
  }, [bizCard, state.currentKey])

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
      openBusinessCard: (origin, text) => setBizCard({ origin, text, run: runNow.current }),
      facialHair: FACIAL_HAIR,
    }),
    [state.result, state.whatIfs, state.whatIfPlans, state.paperUrl, state.plan],
  )

  // ---------- dock ----------
  const mode: DockMode = state.pending
    ? { kind: 'busy', label: state.pending.label }
    : state.error
      ? { kind: 'error', canGoOffline: api.mode === 'live', sessionGone: state.sessionGone }
      : current && !typed
        ? { kind: 'next', typing: !tw.done, more: state.queue.length + (pages.length - 1 - page) }
        : state.queue.length
          ? { kind: 'next', typing: false, more: state.queue.length }
          : !state.expects
            ? { kind: 'idle' }
            : state.expects.kind === 'none'
              ? { kind: 'continue' }
              : { kind: 'input', expects: state.expects }

  // Not during the intro: the card has the stage to itself.
  const showLetter = !!state.step && state.step !== 'ask_letter' && state.step !== 'intro' && !state.hasLetter && !state.pending && !bizCard
  const inCoach = state.step === 'coach' && planChosen

  // One polite live region for the agent's lines and status changes.
  const lastEntry = state.entries[state.entries.length - 1]
  const announce = current
    ? current.msg.kind === 'card'
      ? `${AGENT_NAME}'s business card: ${current.msg.text || CARD_TEXT}`
      : `${AGENT_NAME} says: ${current.msg.text}`
    : state.pending
      ? `${state.pending.label}.`
      : state.error
        ? `${AGENT_NAME} says: ${state.error}`
        : lastEntry?.type === 'notice'
          ? `${AGENT_NAME} says: ${lastEntry.text}`
          : ''

  // 116: what the text area shows when no line is on screen (or a notice after it).
  const status: { kind: 'pending' | 'error' | 'notice'; text: string } | null = state.pending
    ? { kind: 'pending', text: state.pending.label }
    : state.error
      ? { kind: 'error', text: state.error }
      : lastEntry?.type === 'notice'
        ? { kind: 'notice', text: lastEntry.text }
        : null
  const windowMsg = current && WINDOW_KINDS.has(current.msg.kind) && (current.msg.ref || current.msg.kind === 'paper') ? current.msg : null
  const openDetails = useCallback((msgId: string) => setPanel({ open: true, tab: 'plan', focus: msgId }), [])

  return (
    <CardContext.Provider value={cardCtx}>
      <div
        className="game"
        style={{ '--pf': `${pf}px` } as React.CSSProperties}
        data-font={boxVt ? 'vt323' : 'press-start'}
        data-api={api.mode}
        data-step={state.step ?? 'none'}
        data-panel={panel.open ? (wide ? 'side' : 'sheet') : undefined}
      >
        <div className="game__stage" style={{ width: stageW }}>
          {/* 116: the scene fills the stage; Cap's desk ends just above the box's room */}
          <div className="game__scene">
            <ExtendedScene
              ref={npc}
              reserveBottom={boxMax + 4}
              reducedMotion={reduced}
              wordmarkSrc={LOGO}
              facialHair={FACIAL_HAIR}
              background="day"
              onFileDrop={onTrayFile}
              onPaperClick={() => setSheet('paper')}
              onChange={onNpcChange}
            />
          </div>

          <div className="game__corner game__corner--left">
            <button type="button" className="gicon" onClick={() => setSheet('settings')} aria-label="Settings: text speed, size, font, voice, colours" data-action="settings">
              <GearIcon />
            </button>
            {showLetter && (
              <button type="button" className="gbtn gbtn--small" onClick={() => setSheet('letter')} data-action="letter">
                Have a decline letter?
              </button>
            )}
          </div>
          <div className="game__corner game__corner--right">
            <button
              type="button"
              className="gicon"
              onClick={() => setPanel((p) => ({ ...p, open: !p.open, focus: null }))}
              aria-label={panel.open ? 'Close the notebook' : 'Open the notebook: the chat so far and your plan'}
              aria-expanded={panel.open}
              data-action="panel"
            >
              <NotebookIcon />
            </button>
          </div>

          <main className="game__hud" style={{ maxHeight: boxMax }} aria-label="Conversation with Cap, the credit coach">
            <p className="sr-only" aria-live="polite" aria-atomic="true" data-testid="live">
              {announce}
            </p>
            {windowMsg && <DataWindow key={current!.key} msg={windowMsg} onDetails={openDetails} />}
            <GameBox
              current={current ? { key: current.key, msg: current.msg } : null}
              page={page}
              printed={current ? tw.printed : 0}
              pageDone={tw.done}
              more={!lastPage || state.queue.length > 0}
              lines={lines}
              pages={pages}
              onPages={onPages}
              onAdvance={advance}
              status={status}
              layoutKey={`${settings.textSize}:${boxVt}:${pf}:${stageW}`}
              maxPx={boxMax}
            >
              {(rowsFit) => (
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
                  big={state.step === 'opening' ? 'list' : state.step === 'goals' ? 'grid' : undefined}
                  pageSize={rowsFit}
                />
              )}
            </GameBox>
          </main>
        </div>

        <SidePanel
          open={panel.open}
          tab={panel.tab}
          focusItem={panel.focus}
          wide={wide}
          conv={state}
          onTab={(tab) => setPanel((p) => ({ ...p, tab, focus: null }))}
          onClose={() => setPanel((p) => ({ ...p, open: false, focus: null }))}
        />

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
        {bizCard && (
          <BusinessCardOverlay origin={bizCard.origin} text={bizCard.text} reduced={reduced} facialHair={FACIAL_HAIR} onClose={putCardAway} />
        )}
      </div>
    </CardContext.Provider>
  )
}
