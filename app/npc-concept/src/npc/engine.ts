// The NPC engine: state machine + fixed-step animation + layered renderer.
// No React in here, so it can be driven from anywhere.
import { buildColorTable, IDX, type ColorName } from './palette'
import { IndexBuffer, NATIVE_H, NATIVE_W } from './raster'
import {
  AGENT_ORIGIN, BUBBLE_AT, buildBackdrop, buildCounter, CALC, CALCULATOR, DROP_ARROW, drawScreen, drawTray,
  PAPER, PAPER_END, PAPER_SIZE, PAPER_START, TRAY, TRAY_DOC, WORDMARK, WORDMARK_AT,
} from './scene'
import {
  BROWS, BROWS_POS, BUBBLE, EYES, EYES_POS, GLASSES, GLASSES_POS, HANDS, HEAD, HEAD_POS, ITEMS, MOUTH_POS,
  MOUTHS, SHOULDER_L, SHOULDER_R, TORSO, TORSO_POS,
  type BrowKey, type EyeKey, type HandKey, type ItemKey, type MouthKey,
} from './sprites/character'

export const AGENT_STATES = [
  'idle', 'greeting', 'talking', 'listening', 'asking', 'receive-document', 'reading', 'thinking',
  'explaining', 'slide-paper', 'coach',
] as const
export type AgentState = (typeof AGENT_STATES)[number]

export const EMOTES = ['neutral', 'warm', 'concerned', 'pleased'] as const
export type Emote = (typeof EMOTES)[number]

export const GESTURES = ['none', 'wave', 'point-down', 'point-side', 'chin', 'tap-calc', 'open-palm'] as const
export type Gesture = (typeof GESTURES)[number]

export type PaperState = 'none' | 'sliding' | 'ready'

export interface NpcSnapshot {
  state: AgentState
  emote: Emote
  gesture: Gesture
  mode: 'checker' | 'coach'
  trayDoc: boolean
  paper: PaperState
  dropHover: boolean
  reducedMotion: boolean
  ambient: boolean
}

/** Fixed simulation step (ms). Animation timing never depends on the display refresh rate. */
export const STEP_MS = 1000 / 60

/** How long each one-shot state takes before it settles (ms). Others settle at once. */
export const SEQUENCE_MS: Partial<Record<AgentState, number>> = {
  greeting: 1650,
  'receive-document': 1200,
  'slide-paper': 1600,
  coach: 1300,
}
const GESTURE_MS: Record<Gesture, number> = {
  none: 0, wave: 1600, 'point-down': 2000, 'point-side': 2000, chin: 2500, 'tap-calc': 2000, 'open-palm': 1800,
}

// ---------- arm poses (local coords in the 64x72 box; shoulders at (17, 31) and (46, 31)) ----------
// Gestures move the whole arm so each one reads in a thumbnail. The counter top is local y 64.
interface P { x: number; y: number }
interface ArmPose { elbow: P; hand: P; sprite: HandKey; grounded?: boolean }
const pt = (x: number, y: number): P => ({ x, y })
const arm = (ex: number, ey: number, hx: number, hy: number, sprite: HandKey, grounded = false): ArmPose => ({
  elbow: pt(ex, ey), hand: pt(hx, hy), sprite, grounded,
})

export const ARM_POSES = {
  restL: arm(11, 49, 16, 67, 'rest', true),
  restR: arm(52, 49, 47, 67, 'rest', true),
  // wave: hand up by the head
  raiseL: arm(5, 44, 4, 30, 'open'),
  waveL1: arm(5, 34, 3, 15, 'open'),
  waveL2: arm(6, 33, 10, 12, 'open'),
  // open palm: forearm out to the side, hand presented at chest height
  palmL: arm(3, 51, -6, 43, 'openL'),
  // reach to the tray (screen left) and back
  reach1L: arm(6, 48, 2, 60, 'open'),
  reach2L: arm(0, 52, -8, 66, 'open'),
  reach3L: arm(-2, 56, -12, 71, 'grip', true),
  reach2LDoc: arm(0, 52, -8, 66, 'grip'),
  reach1LDoc: arm(6, 48, 2, 60, 'grip'),
  holdDocL: arm(8, 54, 18, 58, 'grip'),
  readL: arm(8, 54, 21, 52, 'grip'),
  readR: arm(55, 54, 42, 52, 'grip'),
  // hand to chin, forearm up across the chest
  chinR: arm(53, 56, 37, 28, 'grip'),
  // point down: the right arm crosses the body towards the tray
  pointDownR: arm(38, 55, 4, 63, 'pointDown'),
  // explaining: points down at the front-centre of the counter, where the summary lands
  explainR: arm(56, 52, 40, 66, 'pointDown'),
  explainTapR: arm(56, 53, 40, 67, 'pointDown'),
  // point side: arm straight out to screen right
  pointSideR: arm(59, 37, 72, 34, 'pointRight'),
  // tap the calculator (screen right)
  tapUpR: arm(61, 52, 75, 61, 'pointDown'),
  tapDownR: arm(61, 53, 75, 64, 'pointDown', true),
  retractR: arm(54, 54, 44, 70, 'flat', true),
  plannerR: arm(56, 54, 43, 56, 'grip'),
  toFace1L: arm(7, 46, 12, 34, 'grip'),
  toFace2L: arm(9, 40, 22, 16, 'grip'),
} satisfies Record<string, ArmPose>

/** x, y are local coords, or an offset from the hand when attached to an arm. */
interface HeldItem { key: ItemKey; x: number; y: number; attach?: 'L' | 'R' }
interface Frame {
  L: ArmPose
  R: ArmPose
  items: HeldItem[]
  eyes?: EyeKey
  brows?: BrowKey
  /** Eyebrows that win over the emote (asking: up), except for 'concerned'. */
  browsForce?: BrowKey
  headDy: number
  tilt: number
  lean: number
  bubbleDots: number
  glance: boolean
}

/**
 * Each emote changes eyebrows, eyes and mouth together so it reads at a glance.
 * eyes replaces the plain 'open' eyes only (state eyes such as 'down' still win).
 * talk: the small, open and wide talking frames; closed is the rest mouth.
 */
const EMOTE_FACE: Record<Emote, { brows?: BrowKey; eyes?: EyeKey; mouth: MouthKey; talk: [MouthKey, MouthKey, MouthKey] }> = {
  neutral: { mouth: 'flat', talk: ['small', 'open', 'wide'] },
  warm: { brows: 'warm', eyes: 'warm', mouth: 'smile', talk: ['smallSmile', 'open', 'wide'] },
  concerned: { brows: 'concerned', eyes: 'soft', mouth: 'frown', talk: ['small', 'small', 'open'] },
  pleased: { brows: 'pleased', eyes: 'happy', mouth: 'grin', talk: ['smallSmile', 'grin', 'wide'] },
}
/** Talking cycle over the four mouth frames: 0 closed, 1 small, 2 open, 3 wide. */
const TALK_CYCLE = [1, 2, 3, 2, 1, 0] as const
const TALK_FRAME_MS = 75

/** Pick the last keyframe whose start time is <= t. */
function seq<T>(t: number, keys: [number, T][]): T {
  let v = keys[0][1]
  for (const [at, k] of keys) if (t >= at) v = k
  return v
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const rand = (a: number, b: number) => a + Math.random() * (b - a)

export interface NpcEngineOptions {
  ambient?: boolean
  reducedMotion?: boolean
  onChange?: (s: NpcSnapshot) => void
}

export class NpcEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  /** The 160x120 frame; copied onto the visible canvas at a whole-number device scale. */
  private frame: HTMLCanvasElement
  private frameCtx: CanvasRenderingContext2D
  private image: ImageData
  private out: Uint32Array
  private deviceScale = 1
  private colors = buildColorTable()
  private screen = new IndexBuffer(NATIVE_W, NATIVE_H)
  private headBuf = new IndexBuffer(HEAD.w + 6, HEAD.h)
  private backdrop = buildBackdrop()
  private counter = buildCounter()
  private wordmark = true

  private raf = 0
  private last: number | undefined
  private acc = 0
  private t = 0

  private state: AgentState = 'idle'
  private stateStart = 0
  private emoteV: Emote = 'neutral'
  private gestureV: Gesture = 'none'
  private gestureStart = 0
  private mode: 'checker' | 'coach' = 'checker'
  private trayDoc = false
  private paper: PaperState = 'none'
  private paperHover = false
  private dropHover = false
  private reduced: boolean
  private ambient: boolean
  private mouthOpenUntil = 0

  private nextBlink = rand(2000, 6000)
  private blinkStart = -1000
  private nextGlance = rand(3000, 7000)
  private glanceUntil = 0
  private glanceDir: EyeKey = 'left'

  private onChange?: (s: NpcSnapshot) => void

  constructor(canvas: HTMLCanvasElement, opts: NpcEngineOptions = {}) {
    canvas.width = NATIVE_W
    canvas.height = NATIVE_H
    const ctx = canvas.getContext('2d')
    this.frame = document.createElement('canvas')
    this.frame.width = NATIVE_W
    this.frame.height = NATIVE_H
    const frameCtx = this.frame.getContext('2d')
    if (!ctx || !frameCtx) throw new Error('2D canvas not available')
    this.canvas = canvas
    this.ctx = ctx
    this.frameCtx = frameCtx
    this.image = frameCtx.createImageData(NATIVE_W, NATIVE_H)
    this.out = new Uint32Array(this.image.data.buffer)
    this.ambient = opts.ambient ?? true
    this.reduced = opts.reducedMotion ?? false
    this.onChange = opts.onChange
  }

  // ---------- public API ----------
  /**
   * Draw at device resolution: the canvas backing store is backingW x backingH device pixels and each
   * native pixel becomes deviceScale x deviceScale of them. The browser then maps the canvas 1:1 and
   * never rescales it (WebKit at dpr 3 otherwise paints 7x as 1119 px and drops a column).
   */
  setOutput(deviceScale: number, backingW: number, backingH: number) {
    this.deviceScale = Math.max(1, Math.floor(deviceScale + 1e-6))
    if (this.canvas.width !== backingW) this.canvas.width = backingW
    if (this.canvas.height !== backingH) this.canvas.height = backingH
    this.render()
  }
  start() {
    if (!this.raf) this.raf = requestAnimationFrame(this.loop)
  }
  destroy() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }
  setState(s: AgentState) {
    if (this.paper === 'sliding') this.paper = 'ready'
    this.state = s
    this.stateStart = this.t
    this.gestureV = 'none'
    if (s === 'receive-document') this.trayDoc = true
    if (s === 'slide-paper') this.paper = 'sliding'
    this.applyStateEffects()
    this.emit()
  }
  emote(e: Emote) {
    this.emoteV = e
    this.emit()
  }
  gesture(g: Gesture) {
    this.gestureV = g
    this.gestureStart = this.t
    this.emit()
  }
  /** Call once per character printed by the typewriter. Letters open the mouth, punctuation closes it. */
  talk(ch: string) {
    if (this.reduced) return
    if (/[.,!?;:…—–]/.test(ch)) {
      this.mouthOpenUntil = 0
      return
    }
    if (/\s/.test(ch)) return
    this.mouthOpenUntil = this.t + 130
  }
  /** Close the mouth now (e.g. when the line is skipped). */
  stopTalking() {
    this.mouthOpenUntil = 0
  }
  setTrayDoc(on: boolean) {
    this.trayDoc = on
    this.emit()
  }
  setDropHover(on: boolean) {
    if (this.dropHover === on) return
    this.dropHover = on
    this.emit()
  }
  setPaperHover(on: boolean) {
    this.paperHover = on
  }
  clearPaper() {
    this.paper = 'none'
    this.paperHover = false
    this.emit()
  }
  setAmbient(on: boolean) {
    this.ambient = on
    this.emit()
  }
  /** Hide the pixel-text wordmark when the official logo image is shown in its place. */
  setWordmarkVisible(on: boolean) {
    this.wordmark = on
  }
  setReducedMotion(on: boolean) {
    this.reduced = on
    if (on) {
      this.mouthOpenUntil = 0
      if (this.paper === 'sliding') this.paper = 'ready'
    }
    this.applyStateEffects()
    this.emit()
  }
  setPalette(overrides: Partial<Record<ColorName, string>>) {
    this.colors = buildColorTable(overrides)
  }
  reset() {
    this.paperHover = false
    this.mode = 'checker'
    this.trayDoc = false
    this.paper = 'none'
    this.emoteV = 'neutral'
    this.setState('idle')
  }
  /** ms until the current one-shot state animation has finished (0 if settled). */
  settleIn(): number {
    const total = this.reduced ? (this.state === 'greeting' ? 1500 : 0) : (SEQUENCE_MS[this.state] ?? 0)
    return Math.max(0, total - (this.t - this.stateStart))
  }
  snapshot(): NpcSnapshot {
    return {
      state: this.state, emote: this.emoteV, gesture: this.gestureV, mode: this.mode, trayDoc: this.trayDoc,
      paper: this.paper, dropHover: this.dropHover, reducedMotion: this.reduced, ambient: this.ambient,
    }
  }

  // ---------- loop ----------
  private loop = (now: number) => {
    if (this.last === undefined) this.last = now
    this.acc += Math.min(250, now - this.last)
    this.last = now
    while (this.acc >= STEP_MS) {
      this.update(STEP_MS)
      this.acc -= STEP_MS
    }
    this.render()
    this.raf = requestAnimationFrame(this.loop)
  }

  private emit() {
    this.onChange?.(this.snapshot())
  }

  /** Effects that happen at fixed points of a state (also applied instantly in reduced motion). */
  private applyStateEffects() {
    const st = this.reduced ? Infinity : this.t - this.stateStart
    let changed = false
    if (this.state === 'receive-document' && st >= 600 && this.trayDoc) {
      this.trayDoc = false
      changed = true
    }
    if (this.state === 'slide-paper' && this.paper === 'sliding' && st >= 1000) {
      this.paper = 'ready'
      changed = true
    }
    if (this.state === 'coach' && this.mode !== 'coach' && st >= 450) {
      this.mode = 'coach'
      changed = true
    }
    return changed
  }

  private update(dt: number) {
    this.t += dt
    let changed = this.applyStateEffects()
    if (this.gestureV !== 'none' && this.t - this.gestureStart >= GESTURE_MS[this.gestureV]) {
      this.gestureV = 'none'
      changed = true
    }
    if (!this.reduced) {
      if (this.t >= this.nextBlink) {
        this.blinkStart = this.t
        this.nextBlink = this.t + rand(2000, 6000)
      }
      if (this.t >= this.nextGlance && this.t >= this.glanceUntil) {
        this.glanceUntil = this.t + rand(600, 1100)
        this.glanceDir = (['left', 'right', 'down'] as const)[Math.floor(Math.random() * 3)]
        this.nextGlance = this.glanceUntil + rand(2500, 6000)
      }
    }
    if (changed) this.emit()
  }

  // ---------- frame composition ----------
  private stateFrame(): Frame {
    const rm = this.reduced
    const st = this.t - this.stateStart
    const T = rm ? 1e9 : st
    const A = ARM_POSES
    const f: Frame = { L: A.restL, R: A.restR, items: [], headDy: 0, tilt: 0, lean: 0, bubbleDots: 0, glance: false }
    switch (this.state) {
      case 'idle':
        f.glance = true
        break
      case 'greeting':
        if (rm) f.L = st < 1500 ? A.waveL1 : A.restL
        else if (st < 150) f.L = A.raiseL
        else if (st < 1650) f.L = Math.floor((st - 150) / 200) % 2 === 0 ? A.waveL1 : A.waveL2
        f.glance = st >= 1650
        break
      case 'talking':
        f.eyes = 'open'
        break
      case 'listening': {
        f.eyes = 'down'
        const ph = st % 2200
        if (!rm && (ph < 180 || (ph >= 360 && ph < 540))) f.headDy = 1
        break
      }
      case 'asking':
        f.L = A.palmL
        f.tilt = 0.09
        f.browsForce = 'raised'
        f.eyes = 'open'
        break
      case 'receive-document': {
        f.L = seq(T, [[0, A.reach1L], [200, A.reach2L], [450, A.reach3L], [700, A.reach2LDoc], [950, A.reach1LDoc], [1200, A.holdDocL]])
        if (T >= 200 && T < 950) f.lean = -3
        if (T >= 600) f.items.push({ key: 'docSmall', x: -5, y: -13, attach: 'L' })
        f.eyes = T < 700 ? 'down-left' : 'open'
        break
      }
      case 'reading':
        f.L = A.readL
        f.R = A.readR
        f.items.push({ key: 'docHeld', x: 20, y: 40 })
        f.eyes = rm ? 'down' : seq(st % 1500, [[0, 'down-left'], [450, 'down'], [900, 'down-right'], [1350, 'half']] as [number, EyeKey][])
        f.headDy = 1
        break
      case 'thinking':
        f.R = A.chinR
        f.eyes = 'up-right'
        f.brows = 'quizzical'
        f.bubbleDots = rm ? 3 : 1 + (Math.floor(st / 400) % 3)
        break
      case 'explaining':
        f.R = !rm && Math.floor(st / 450) % 2 === 1 ? A.explainTapR : A.explainR
        f.eyes = 'open'
        break
      case 'slide-paper': {
        // the flat hand rides on the sheet as it slides to the front edge
        const p = clamp01((T - 250) / 750)
        const paperY = Math.round(PAPER_START.y + (PAPER_END.y - PAPER_START.y) * p)
        const handY = paperY + 2 - AGENT_ORIGIN.y
        if (T < 1000) f.R = { elbow: pt(54, 52 + Math.round(p * 4)), hand: pt(38, handY), sprite: 'flat', grounded: true }
        else if (T < 1200) f.R = A.retractR
        f.eyes = T < 1000 ? 'down' : 'open'
        break
      }
      case 'coach':
        f.L = seq(T, [[0, A.toFace1L], [250, A.toFace2L], [600, A.restL]])
        if (T >= 850) {
          f.R = A.plannerR
          f.items.push({ key: 'planner', x: -7, y: -12, attach: 'R' })
        }
        f.glance = T >= 1300
        break
    }
    this.applyGesture(f, rm)
    return f
  }

  private applyGesture(f: Frame, rm: boolean) {
    const g = this.gestureV
    if (g === 'none') return
    const gt = this.t - this.gestureStart
    const A = ARM_POSES
    const usesR = g === 'point-down' || g === 'point-side' || g === 'chin' || g === 'tap-calc'
    // An arm that leaves a two-handed document hands it to the other hand.
    if (f.items.some((i) => i.key === 'docHeld')) {
      f.items = f.items.filter((i) => i.key !== 'docHeld')
      f.items.push({ key: 'docSmall', x: -5, y: -13, attach: usesR ? 'L' : 'R' })
    }
    if (usesR) f.items = f.items.filter((i) => i.key !== 'planner')
    f.glance = false
    switch (g) {
      case 'wave':
        f.L = rm ? A.waveL1 : Math.floor(gt / 200) % 2 === 0 ? A.waveL1 : A.waveL2
        break
      case 'open-palm':
        f.L = A.palmL
        break
      case 'point-down':
        f.R = A.pointDownR
        break
      case 'point-side':
        f.R = A.pointSideR
        f.eyes = 'right'
        break
      case 'chin':
        f.R = A.chinR
        f.eyes = 'up-right'
        break
      case 'tap-calc':
        f.R = rm || Math.floor(gt / 220) % 2 === 0 ? A.tapDownR : A.tapUpR
        f.eyes = 'down-right'
        break
    }
  }

  private eyesFor(f: Frame): EyeKey {
    let eyes: EyeKey = f.eyes ?? 'open'
    if (eyes === 'open') eyes = EMOTE_FACE[this.emoteV].eyes ?? 'open'
    if (!this.reduced) {
      if (!f.eyes && f.glance && this.t < this.glanceUntil) eyes = this.glanceDir
      const b = this.t - this.blinkStart
      if (b >= 0 && b < 140) eyes = b < 35 || b >= 105 ? 'half' : 'closed'
    }
    return eyes
  }

  private mouthFor(): MouthKey {
    const face = EMOTE_FACE[this.emoteV]
    if (this.t < this.mouthOpenUntil) {
      const frame = TALK_CYCLE[Math.floor(this.t / TALK_FRAME_MS) % TALK_CYCLE.length]
      return frame === 0 ? face.mouth : face.talk[frame - 1]
    }
    return face.mouth
  }

  // ---------- render ----------
  private render() {
    const b = this.screen
    const t = this.t
    const f = this.stateFrame()
    const bob = this.reduced ? 0 : Math.floor(t / 750) % 2
    const ox = AGENT_ORIGIN.x + f.lean
    const oy = AGENT_ORIGIN.y

    // 1 stand backdrop, 2 wordmark, 3 stand screen (ambient only)
    b.clear()
    b.blitBuffer(this.backdrop)
    if (this.wordmark) b.blit(WORDMARK, WORDMARK_AT.x, WORDMARK_AT.y)
    if (this.ambient) drawScreen(b, t, !this.reduced)

    // 4 agent, back pass: torso then the head group
    b.blit(TORSO, ox + TORSO_POS.x, oy + TORSO_POS.y + bob)
    this.drawHead(f, ox, oy + bob + f.headDy)

    // 5 counter, 6 props, 7 drop zone
    b.blitBuffer(this.counter)
    b.blit(CALCULATOR, CALC.x, CALC.y)
    if (this.gestureV === 'tap-calc' && !this.reduced) {
      for (let i = 0; i < 4; i++) if ((Math.floor(t / 220) + i) % 3 !== 0) b.rect(CALC.x + 2 + i * 2, CALC.y + 2, 1, 2, IDX.outline)
    }
    drawTray(b)
    if (this.trayDoc) b.blit(TRAY_DOC, TRAY.x + 4, TRAY.y + 2)
    if (this.paper !== 'none') this.drawPaper()
    if (this.dropHover) {
      const phase = this.reduced ? 0 : Math.floor(t / 120)
      b.dashed(TRAY.x - 2, TRAY.y - 2, TRAY.w + 4, TRAY.h + 4, IDX.glow, phase)
      const bounce = this.reduced ? 0 : Math.floor(t / 300) % 2
      b.blit(DROP_ARROW, TRAY.x + (TRAY.w >> 1) - 3, TRAY.y - 11 + bounce)
    }

    // 8 agent, front pass: arms, held items, hands
    this.drawArms(f, ox, oy, bob)

    // 9 thinking bubble
    if (f.bubbleDots > 0) {
      b.blit(BUBBLE, BUBBLE_AT.x, BUBBLE_AT.y)
      for (let i = 0; i < f.bubbleDots; i++) b.rect(BUBBLE_AT.x + 5 + i * 5, BUBBLE_AT.y + 4, 2, 2, IDX.outline)
    }

    b.toRGBA(this.out, this.colors, IDX.standPanel)
    this.frameCtx.putImageData(this.image, 0, 0)
    const k = this.deviceScale
    this.ctx.imageSmoothingEnabled = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.drawImage(this.frame, 0, 0, NATIVE_W * k, NATIVE_H * k)
  }

  private drawPaper() {
    const b = this.screen
    let y = PAPER_END.y
    if (this.paper === 'sliding') {
      const p = clamp01((this.t - this.stateStart - 250) / 750)
      y = Math.round(PAPER_START.y + (PAPER_END.y - PAPER_START.y) * p)
    }
    b.blit(PAPER, PAPER_START.x, y)
    const { w, h } = PAPER_SIZE
    // glow once, right after it arrives
    const gt = this.t - this.stateStart - 1000
    if (this.state === 'slide-paper' && !this.reduced && gt >= 0 && gt < 600) {
      const ph = Math.floor(gt / 150)
      b.frame(PAPER_END.x - 1, PAPER_END.y - 1, w + 2, h + 2, ph === 1 || ph === 2 ? IDX.glow : IDX.glowSoft)
      if (ph === 1) b.frame(PAPER_END.x - 2, PAPER_END.y - 2, w + 4, h + 4, IDX.glowSoft)
    } else if (this.paper === 'ready' && this.paperHover) {
      b.frame(PAPER_END.x - 1, PAPER_END.y - 1, w + 2, h + 2, IDX.glow)
    }
  }

  private drawHead(f: Frame, ox: number, oy: number) {
    const hb = this.headBuf
    const m = 3 // margin so the tilt has room
    hb.clear()
    hb.blit(HEAD, m, 0)
    hb.blit(EYES[this.eyesFor(f)], m + EYES_POS.x, EYES_POS.y)
    if (this.mode === 'coach') hb.blit(GLASSES, m + GLASSES_POS.x, GLASSES_POS.y)
    const face = EMOTE_FACE[this.emoteV]
    const brows = f.browsForce && this.emoteV !== 'concerned' ? f.browsForce : face.brows ?? f.brows ?? 'neutral'
    hb.blit(BROWS[brows], m + BROWS_POS.x, BROWS_POS.y)
    hb.blit(MOUTHS[this.mouthFor()], m + MOUTH_POS.x, MOUTH_POS.y)
    const s = { w: hb.w, h: hb.h, px: hb.px }
    if (f.tilt) this.screen.blitShear(s, ox + HEAD_POS.x - m, oy + HEAD_POS.y, f.tilt, HEAD.h - 1)
    else this.screen.blit(s, ox + HEAD_POS.x - m, oy + HEAD_POS.y)
  }

  private drawArms(f: Frame, ox: number, oy: number, bob: number) {
    const b = this.screen
    const place = (p: P, grounded = false) => pt(ox + p.x, oy + p.y + (grounded ? 0 : bob))
    const arms: [P, ArmPose][] = [[SHOULDER_L, f.L], [SHOULDER_R, f.R]]
    for (const [sh, a] of arms) {
      const s = place(sh)
      const e = place(a.elbow)
      const h = place(a.hand, a.grounded)
      // sleeve: 7px outline, 5px navy fill, so the arm reads as one bold shape
      b.thickLine(s.x, s.y, e.x, e.y, 10, 3, IDX.outline)
      b.thickLine(e.x, e.y, h.x, h.y, 10, 3, IDX.outline)
      b.thickLine(s.x, s.y, e.x, e.y, 5, 2, IDX.uniform)
      b.thickLine(e.x, e.y, h.x, h.y, 5, 2, IDX.uniform)
      // white shirt cuff just before the hand
      const len = Math.hypot(h.x - e.x, h.y - e.y) || 1
      const cx = Math.round(h.x - ((h.x - e.x) / len) * 4)
      const cy = Math.round(h.y - ((h.y - e.y) / len) * 4)
      b.thickLine(cx, cy, cx, cy, 5, 2, IDX.shirt)
    }
    for (const it of f.items) {
      const holder = it.attach === 'L' ? f.L : it.attach === 'R' ? f.R : null
      const at = holder ? pt(holder.hand.x + it.x, holder.hand.y + it.y) : pt(it.x, it.y)
      const p = place(at, !!holder?.grounded)
      b.blit(ITEMS[it.key], p.x, p.y)
    }
    for (const [, a] of arms) {
      const hs = HANDS[a.sprite]
      const h = place(a.hand, a.grounded)
      b.blit(hs, h.x - (hs.w >> 1), h.y - (hs.h >> 1))
    }
  }
}
