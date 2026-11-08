import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { FileKind, Persona } from 'shared'
import { createApi, createMockApi, mockFromEnv, type Api } from './api/client'
import { BusinessCardOverlay, CARD_RATIO, CARD_TEXT, DESK_CARD, DeskCard, type Rect } from './cards/BusinessCard'
import { CardContext, type CardCtx, type WhyTrail } from './cards/context'
import { lineDone, presentError, presentMessage, presentWaiting } from './chat/agent'
import { Dock, type DockMode } from './chat/Dock'
import { AGENT_NAME } from './chat/Transcript'
import { useConversation } from './chat/useConversation'
import { useSpeech } from './chat/useSpeech'
import {
  ExtendedScene, extendedLayout, frameCamera, NATIVE_H, usePrefersReducedMotion, useTypewriter, type FacialHair, type NpcHandle,
  type NpcSnapshot,
} from './npc'
import { blip, primeBlip } from './game/blip'
import { Guard } from './ui/Guard'
import { DataWindow } from './game/DataWindow'
import { GameBox, SCROLL_MS, type BubblePlace } from './game/GameBox'
import { GearIcon, LetterIcon, NotebookIcon, SidePanel, type PanelTab } from './game/SidePanel'
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

/**
 * 117: an on-screen keyboard is open: a text box has focus on a touch screen and the visual viewport is much
 * shorter than the window. Returns the visible height and its top then (null when closed).
 */
function useKeyboard() {
  const [k, setK] = useState<{ h: number; top: number } | null>(null)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const on = () => {
      const typing =
        !!document.activeElement?.matches('input:not([type=radio]):not([type=checkbox]):not([type=file]), textarea') &&
        window.matchMedia('(pointer: coarse)').matches
      const open = typing && vv.height < window.innerHeight - 120
      setK((p) => (open ? (p && p.h === vv.height && p.top === vv.offsetTop ? p : { h: vv.height, top: vv.offsetTop }) : null))
    }
    vv.addEventListener('resize', on)
    vv.addEventListener('scroll', on)
    window.addEventListener('focusin', on)
    window.addEventListener('focusout', on)
    return () => {
      vv.removeEventListener('resize', on)
      vv.removeEventListener('scroll', on)
      window.removeEventListener('focusin', on)
      window.removeEventListener('focusout', on)
    }
  }, [])
  return k
}

/** PWA (117 follow-up): the safe-area insets in CSS px (the --safe-* variables: env(), or ?inset= in a test). */
function useSafeArea() {
  const read = () => {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left)'
    document.body.appendChild(probe)
    const cs = getComputedStyle(probe)
    const v = { top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0, bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0 }
    probe.remove()
    return v
  }
  const [v, setV] = useState(read)
  useEffect(() => {
    const on = () => setV((p) => {
      const n = read()
      return n.top === p.top && n.right === p.right && n.bottom === p.bottom && n.left === p.left ? p : n
    })
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
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
  const boxMax116 = Math.floor(vp.h - NATIVE_H * scale - 4)
  // The dialogue font: Press Start 2P at a crisp size (16 px on a phone, 24 px wide). VT323 with Readable
  // font, and with bigger text on a phone: Press Start 2P's next crisp size there (24 px) fits 13 letters
  // a line and one menu choice a page.
  const pf = crispPx((wide ? 24 : 16) * (settings.textSize / 100), dpr)
  const boxVt = settings.readable || (settings.textSize > 100 && stageW < 600)

  // ---------- 117: the camera ----------
  // Cap fills the screen: the camera (npc/camera.ts) crops the scene to the framing and picks a whole number of
  // device px per scene px. It needs the room the box takes at rest: the name plate, three lines, the Next row
  // and the fine print (measured in WebKit: 7.25rem of padding, plate and buttons, plus the lines, plus the
  // fine print at 0.875rem a line, two lines on a phone). 'full' is 116's whole desk.
  const kbd = useKeyboard()
  const safe = useSafeArea()
  // the box sits on the home bar's inset (HUD padding: the larger of 0.5rem and the inset)
  const homeBar = Math.max(0, safe.bottom - 8)
  const rem = 16 * (settings.textSize / 100)
  const lineLh = boxVt ? 1.2 * (wide ? 1.75 : 1.375) * rem : pf * 1.5
  const fine = (stageW < 600 ? (settings.textSize > 100 ? 3 : 2) : 1) * 0.875 * rem
  const cam = useMemo(
    () =>
      settings.framing === 'full'
        ? null
        : frameCamera({
            w: stageW,
            h: vp.h,
            dpr,
            framing: settings.framing,
            restBox: 7.25 * rem + 3 * lineLh + fine + homeBar,
            dockBox: 4.5 * rem + fine + homeBar,
            // a bubble above his head: under the corner icons, the plate, three lines, padding and the tail
            bubbleTop: 3.5 * rem + 3 * lineLh + 5.5 * rem,
            bubbleSide: Math.min(18 * rem, 15 * (boxVt ? 0.55 * lineLh : pf) + 3 * rem),
            // below the status bar and the Dynamic Island in the home-screen app
            topPad: 4 + safe.top,
            // one icon wide on each side: the left corner stacks the gear and the envelope in a column
            corner: { left: 3.5 * rem + safe.left, right: 3.5 * rem + safe.right, h: 3.5 * rem + Math.max(0, safe.top - 8) },
            minFill: vp.h > stageW ? 0.55 : 0.5,
          }),
    [settings.framing, stageW, vp.h, dpr, rem, lineLh, fine, boxVt, pf, safe, homeBar],
  )
  // 116: 2 to 4 lines in the box (at most 4 on a phone): fewer when the text is big. 117: 3 with the camera, so
  // the box at rest leaves his hands and the desk strip in view. 118: a longer message scrolls inside them.
  const lines = cam ? 3 : boxVt ? (settings.textSize === 150 ? 3 : 4) : wide ? 3 : pf > 16 ? 3 : 4
  // The line goes to a speech bubble when the box has no room for it under his chin, or a keyboard is open.
  const bubble = useMemo<BubblePlace | null>(() => {
    if (!cam || (cam.mode === 'box' && !kbd)) return null
    const maxW = Math.min(stageW - 16, 26 * rem)
    if (kbd) {
      // over the top of the visible part, pointing down at him (the field is pinned over the keyboard)
      const width = maxW
      return { left: Math.round((stageW - width) / 2), width, top: kbd.top + 3.5 * rem + 22, tail: 'down', tailAt: cam.mouth.x - (stageW - width) / 2 }
    }
    if (cam.side === 'above') {
      const width = maxW
      const left = Math.min(Math.max(8, cam.mouth.x - width / 2), stageW - 8 - width)
      return { left, width, bottom: vp.h - (cam.head.top - 14), tail: 'down', tailAt: cam.mouth.x - left }
    }
    const top = Math.max(3.5 * rem + 18, Math.min(cam.mouth.y - 2.5 * rem, cam.head.top + rem))
    if (cam.side === 'right') {
      const left = cam.head.right + 18
      return { left, width: Math.min(maxW, stageW - left - 10), top, tail: 'left', tailAt: cam.mouth.y - top }
    }
    const right = cam.head.left - 18
    const width = Math.min(maxW, right - 10)
    return { left: right - width, width, top, tail: 'right', tailAt: cam.mouth.y - top }
  }, [cam, kbd, stageW, vp.h, rem])
  const [bubbleHost, setBubbleHost] = useState<HTMLDivElement | null>(null)
  // The box (or, in bubble mode, the inputs) may grow up to just under his chin, never over his face; with a
  // bubble beside his head, only up to the bubble's bottom (three lines, its padding and border).
  const bubbleBottom = bubble && !kbd && bubble.top !== undefined && bubble.tail !== 'down' ? bubble.top + 3 * lineLh + 2.75 * rem : 0
  const boxMax = cam ? Math.floor(vp.h - Math.max(cam.chinY, bubbleBottom) - 8) : boxMax116

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

  // ---------- 118: the current line, typed out in one go; the box scrolls ----------
  // GameBox measures where the line's visual lines start. The typewriter types the whole message; when it reaches
  // the end of the box's last line, the text scrolls up one line (SCROLL_MS) and typing goes on. With the whole
  // message shown at once (reduced motion, Instant text) the box starts at the top and scrolls by hand. The
  // business card is not typed out (and does not move his mouth): it is a card, not a line.
  const curKey = current?.key ?? 'none'
  const isText = !!current && current.msg.kind !== 'card'
  const lineText = isText ? current!.msg.text : ''
  const [lineInfo, setLineInfo] = useState<{ key: string; starts: number[] }>({ key: '', starts: [] })
  const onLines = useCallback((key: string, starts: number[]) => {
    setLineInfo((p) => (p.key === key && p.starts.join(',') === starts.join(',') ? p : { key, starts }))
  }, [])
  const starts = useMemo(() => (isText && lineInfo.key === curKey ? lineInfo.starts : null), [isText, lineInfo, curKey])
  const total = starts?.length ?? 0
  const maxTop = Math.max(0, total - lines)
  /** The visual line char i is on. */
  const lineOf = useCallback((i: number) => {
    if (!starts) return 0
    let l = 0
    while (l + 1 < starts.length && starts[l + 1] <= i) l++
    return l
  }, [starts])
  // the first letter of each line past the box's last one: the box scrolls up a line before it types
  const scrollsAt = useMemo(() => new Set((starts ?? []).filter((_, l) => l >= lines)), [starts, lines])
  const showWhole = reduced || settings.speed === 'instant'
  // 118: "Skip all" lands on the turn's last line already typed out (scrolled to its end): at once when it is on
  // screen, else as soon as the last line shows.
  const toEnd = useRef(false)
  const instant = showWhole || current?.msg.kind === 'card'
  const blipOn = settings.blip && !settings.readAloud && !reduced
  const tw = useTypewriter(lineText, curKey, {
    speed: settings.speed,
    instant,
    pauseBefore: (i) => (scrollsAt.has(i) ? SCROLL_MS : 0),
    onChar: (c) => {
      npc.current?.talk(c)
      if (blipOn) blip(c)
    },
    onDone: () => lineDone(npc.current, current?.msg ?? null),
  })
  const twRef = useRef(tw)
  twRef.current = tw
  useLayoutEffect(() => {
    if (!toEnd.current || state.queue.length || !current) return
    toEnd.current = false
    twRef.current.finish()
    npc.current?.stopTalking()
  }, [curKey, state.queue.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const showAll = useCallback(() => {
    if (state.queue.length) {
      toEnd.current = true
      conv.showAll()
    } else if (current && !tw.done) {
      tw.finish()
      npc.current?.stopTalking()
    }
  }, [state.queue.length, conv, current, tw])
  const typed = !!current && tw.done

  // Which lines are in view. While typing: the line being typed is the box's last. Typed out: its end (or, shown
  // whole at once, its start), unless scrolled by hand (tap, arrow keys, the wheel).
  const [scrolled, setScrolled] = useState<{ key: string; top: number } | null>(null)
  const autoTop = !starts ? 0 : !tw.done ? Math.min(maxTop, Math.max(0, lineOf(tw.printed) - lines + 1)) : showWhole ? 0 : maxTop
  const byHand = !!scrolled && scrolled.key === curKey && tw.done
  const top = byHand ? Math.min(maxTop, Math.max(0, scrolled!.top)) : autoTop
  const atEnd = top >= maxTop
  const scrollBy = useCallback(
    (d: number) => setScrolled({ key: curKey, top: Math.min(maxTop, Math.max(0, top + d)) }),
    [curKey, maxTop, top],
  )
  // a typed-out message longer than the box scrolls by hand (arrow keys, the wheel; a tap or Space scrolls on); the
  // indicator shows when it is shown whole at once, or scrolled back from its end
  const scrollable = isText && tw.done && total > lines
  const indicator = scrollable && (showWhole || top < maxTop)

  useSpeech(current?.msg.text ?? null, current?.key ?? null, settings.readAloud, settings.voiceRate)
  // 116: the letter sound was switched on in an earlier visit: unlock audio on the first tap or key
  useEffect(() => {
    if (!settings.blip) return
    const on = () => primeBlip()
    window.addEventListener('pointerdown', on, { once: true })
    window.addEventListener('keydown', on, { once: true })
    return () => {
      window.removeEventListener('pointerdown', on)
      window.removeEventListener('keydown', on)
    }
  }, [settings.blip])

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
  // 118: a tap while typing finishes the message (scrolled to its end). Then, with `scrollFirst` (a tap on the
  // text, Space or Enter, the Dock's button, Demo mode), a message whose end is not in view scrolls on a box-full
  // first: shown whole at once (reduced motion, Instant text), the Dock's button says More until the end is in view,
  // so nobody skips the lines below the box.
  const advance = useCallback(
    (scrollFirst = false) => {
      if (state.pending) return
      if (current && !tw.done) {
        tw.finish()
        npc.current?.stopTalking()
        return
      }
      if (scrollFirst && current && !atEnd) {
        scrollBy(lines)
        return
      }
      if (state.queue.length) return conv.advance()
      if (current && state.expects?.kind === 'none') conv.skip()
    },
    [state.pending, state.queue.length, state.expects, current, tw, conv, atEnd, scrollBy, lines],
  )

  // Space or Enter anywhere outside a control (and with no sheet open) is "next".
  const advanceRef = useRef(advance)
  advanceRef.current = advance
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return
      if (e.metaKey || e.ctrlKey || e.altKey || isControl(e.target) || document.querySelector('dialog[open]')) return
      // 116: keys inside the open notebook are the notebook's (Space scrolls it), not "next"
      if (e.target instanceof Element && e.target.closest('[data-testid="side-panel"]')) return
      e.preventDefault()
      advanceRef.current(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  // 118: the up and down arrow keys (Page Up/Down, Home/End) scroll a long line shown whole, wherever focus is,
  // except in a text field, a slider, a menu (its own arrows) or the notebook
  const scrollRef = useRef({ scrollable, scrollBy, lines })
  scrollRef.current = { scrollable, scrollBy, lines }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { scrollable: can, scrollBy: by, lines: n } = scrollRef.current
      if (!can || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target instanceof Element ? e.target : null
      if (t?.closest('input, textarea, select, [contenteditable="true"], [data-testid="side-panel"]') || document.querySelector('dialog[open]')) return
      const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : e.key === 'PageDown' ? n : e.key === 'PageUp' ? -n : 0
      if (!d) return
      e.preventDefault()
      by(d)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])


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
    setDeskCard((d) => (d && d.run !== state.run ? null : d))
  }, [state.run])
  // 117 follow-up: the card on the desk is a DOM card (CardFace scaled down), not the pixel sprite: it slides with
  // his hand, then the full card grows from exactly where it stopped (one uniform scale).
  const [deskCard, setDeskCard] = useState<{ from: Rect; to: Rect; run: number } | null>(null)
  const deskCardRef = useRef(deskCard)
  deskCardRef.current = deskCard
  const onNpcChange = useCallback(
    (s: NpcSnapshot) => {
      const was = cardPhase.current
      cardPhase.current = s.card
      const run = runNow.current
      if (s.card === 'sliding' && was !== 'sliding' && !reduced && cardShownFor.current !== run) {
        const h = DESK_CARD.w / CARD_RATIO
        const at = (bottom: number) => npc.current?.nativeRect({ x: DESK_CARD.x, y: bottom - h, w: DESK_CARD.w, h }) ?? null
        const from = at(DESK_CARD.bottomFrom)
        const to = at(DESK_CARD.bottomTo)
        if (from && to) setDeskCard({ from, to, run })
      }
      if (s.card !== 'landed' || was === 'landed' || cardShownFor.current === run) return
      cardShownFor.current = run
      const desk = deskCardRef.current
      const origin = desk && desk.run === run ? desk.to : (npc.current?.cardRect() ?? null)
      window.clearTimeout(cardTimer.current.id)
      const id = window.setTimeout(
        () => {
          npc.current?.clearCard()
          setBizCard({ origin, text: cardTextRef.current(), run })
          setDeskCard(null)
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
        ? { kind: 'next', typing: true, more: state.queue.length }
        : state.queue.length
          ? { kind: 'next', typing: false, more: state.queue.length, scroll: isText && !atEnd }
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

  // ---------- 117: Demo mode moves on by itself ----------
  // 118: each message types out in full, then waits a reading pause for its length (250 ms a word, at least 1.2 s;
  // at least 2.5 s with an item window), then goes on. Shown whole at once (reduced motion, Instant text), a long
  // one scrolls on a box-full at a time, each with the pause for the words in view. It stops only where the
  // presenter acts: choices (the turn waits for an answer), the paper (until it has been opened), the business card,
  // and the first reason's Why? (until Why? has been opened), each once the message's end is in view. A sheet,
  // the notebook or a Why? drawer open pauses it; with read aloud on it waits for the voice. A tap still skips.
  const paperOpened = useRef<string | null>(null)
  const whyStop = useRef<{ run: number; key: string | null; done: boolean }>({ run: -1, key: null, done: false })
  if (whyStop.current.run !== state.run) whyStop.current = { run: state.run, key: null, done: false }
  if (current?.msg.kind === 'reason' && windowMsg && !whyStop.current.key) whyStop.current.key = current.key
  useEffect(() => {
    if (sheet === 'paper' && current?.msg.kind === 'paper') paperOpened.current = current.key
  }, [sheet, current])
  useEffect(() => {
    if (why && whyStop.current.key === current?.key) whyStop.current.done = true
  }, [why, current?.key])
  const inView = starts && showWhole && total > lines ? lineText.slice(starts[top], starts[top + lines] ?? lineText.length) : lineText
  const demoPause = !current
    ? null
    : current.msg.kind === 'card' || bizCard || sheet || why || panel.open || state.pending
      ? null
      : atEnd && !state.queue.length && state.expects?.kind !== 'none'
        ? null // choices, a file, typing: the presenter answers
        : current.msg.kind === 'paper' && atEnd && paperOpened.current !== current.key
          ? null
          : whyStop.current.key === current.key && atEnd && !whyStop.current.done
            ? null
            : Math.max(windowMsg ? 2500 : 1200, 250 * inView.split(/\s+/).filter(Boolean).length)
  useEffect(() => {
    if (!settings.demo || !tw.done || demoPause === null) return
    let id = 0
    const go = () => {
      // read aloud: let the voice finish first
      if (settings.readAloud && window.speechSynthesis?.speaking) id = window.setTimeout(go, 400)
      else advanceRef.current(true)
    }
    id = window.setTimeout(go, demoPause)
    return () => window.clearTimeout(id)
  }, [settings.demo, settings.readAloud, tw.done, demoPause, curKey, top])

  return (
    <CardContext.Provider value={cardCtx}>
      <div
        className="game"
        style={{ '--pf': `${pf}px` } as React.CSSProperties}
        data-font={boxVt ? 'vt323' : 'press-start'}
        data-api={api.mode}
        data-step={state.step ?? 'none'}
        data-panel={panel.open ? (wide ? 'side' : 'sheet') : undefined}
        data-framing={settings.framing}
        data-text-in={bubble ? 'bubble' : 'box'}
        data-layout={cam?.layout ?? 'standard'}
        data-fill={cam ? cam.fill.toFixed(3) : undefined}
        data-k={cam?.k}
        data-demo={settings.demo ? (demoPause === null ? 'hold' : `${demoPause}${tw.done ? '' : ' typing'}`) : undefined}
      >
        <div className="game__stage" style={{ width: stageW }}>
          {/* 116: the scene fills the stage; Cap's desk ends just above the box's room */}
          <div className="game__scene">
            <ExtendedScene
              ref={npc}
              reserveBottom={boxMax116 + 4}
              camera={cam ? { k: cam.k, left: cam.base.left, top: cam.base.top } : null}
              layout={cam?.layout ?? 'standard'}
              reducedMotion={reduced}
              wordmarkSrc={LOGO}
              facialHair={FACIAL_HAIR}
              background="day"
              onFileDrop={onTrayFile}
              onPaperClick={() => setSheet('paper')}
              onChange={onNpcChange}
              cardSprite={false}
            />
          </div>
          {/* 117: the speech bubble, over the scene and under the corner icons and the box */}
          <div className="game__bubbles" ref={setBubbleHost} />
          {deskCard && !bizCard && <DeskCard from={deskCard.from} to={deskCard.to} facialHair={FACIAL_HAIR} />}

          <div className="game__corner game__corner--left">
            <button type="button" className="gicon" onClick={() => setSheet('settings')} aria-label="Settings: text speed, size, font, voice, colours" data-action="settings">
              <GearIcon />
            </button>
            {showLetter &&
              (cam ? (
                // 117: Cap's head is up here now: an envelope icon, not a wide button over his hair
                <button type="button" className="gicon" onClick={() => setSheet('letter')} aria-label="Have a decline letter?" title="Have a decline letter?" data-action="letter">
                  <LetterIcon />
                </button>
              ) : (
                <button type="button" className="gbtn gbtn--small" onClick={() => setSheet('letter')} data-action="letter">
                  Have a decline letter?
                </button>
              ))}
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
            {windowMsg && (
              <Guard>
                <DataWindow
                  key={current!.key}
                  msg={windowMsg}
                  onDetails={openDetails}
                  minTop={cam ? cam.chinY + 8 : vp.h - boxMax116 - 4}
                  maxBottom={cam && windowMsg.kind === 'paper' ? cam.deskTopY - 2 : undefined}
                  side={bubble?.tail === 'left' ? 'left' : 'right'}
                />
              </Guard>
            )}
            <GameBox
              current={current ? { key: current.key, msg: current.msg } : null}
              printed={current ? tw.printed : 0}
              done={tw.done}
              more={state.queue.length > 0}
              lines={lines}
              top={top}
              total={total}
              onLines={onLines}
              onTextTap={() => advance(true)}
              scrollable={scrollable}
              indicator={indicator}
              onScroll={scrollBy}
              status={status}
              layoutKey={`${settings.textSize}:${boxVt}:${pf}:${stageW}:${bubble ? `bubble${Math.round(bubble.width)}` : 'box'}`}
              bubble={bubble}
              bubbleHost={bubbleHost}
              inputKey={mode.kind}
              maxPx={boxMax}
            >
              {(rowsFit) => (
                <Dock
                  mode={mode}
                  onNext={() => advance(true)}
                  onShowAll={showAll}
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
                  twoCols={bubble?.tail === 'left' || bubble?.tail === 'right'}
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
