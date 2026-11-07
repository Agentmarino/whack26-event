// The NPC engine: state machine + fixed-step animation + layered renderer.
// No React in here, so it can be driven from anywhere.
import { buildColorTable, IDX, type ColorName } from './palette'
import { IndexBuffer, NATIVE_H, NATIVE_W } from './raster'
import {
  AGENT_ORIGIN, BUBBLE_AT, buildBackdrop, buildCounter, buildCounterProps, buildHall, CALC, CALCULATOR,
  DROP_ARROW, drawScreen, drawTray, PAPER, PAPER_END, PAPER_SIZE, PAPER_START, TRAY, TRAY_DOC, WALKER,
  WORDMARK, WORDMARK_AT,
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

// ---------- arm poses (local coords in the 48x64 box) ----------
interface P { x: number; y: number }
interface ArmPose { elbow: P; hand: P; sprite: HandKey; grounded?: boolean }
const pt = (x: number, y: number): P => ({ x, y })
const arm = (ex: number, ey: number, hx: number, hy: number, sprite: HandKey, grounded = false): ArmPose => ({
  elbow: pt(ex, ey), hand: pt(hx, hy), sprite, grounded,
})

export const ARM_POSES = {
  restL: arm(10, 41, 14, 53, 'rest', true),
  restR: arm(37, 41, 33, 53, 'rest', true),
  raiseL: arm(7, 38, 6, 28, 'open'),
  waveL1: arm(6, 32, 5, 17, 'open'),
  waveL2: arm(6, 32, 8, 16, 'open'),
  palmL: arm(7, 42, 4, 47, 'open'),
  reach1L: arm(6, 38, 2, 46, 'open'),
  reach2L: arm(2, 41, -5, 50, 'open'),
  reach3L: arm(1, 43, -6, 55, 'grip', true),
  reach2LDoc: arm(2, 41, -5, 50, 'grip'),
  reach1LDoc: arm(6, 38, 2, 46, 'grip'),
  holdDocL: arm(8, 42, 16, 45, 'grip'),
  readL: arm(9, 40, 16, 42, 'grip'),
  readR: arm(38, 40, 31, 42, 'grip'),
  chinR: arm(37, 40, 27, 23, 'grip'),
  pointDownR: arm(42, 36, 46, 46, 'pointDown'),
  pointSideR: arm(41, 31, 47, 30, 'pointRight'),
  tapUpR: arm(42, 41, 50, 51, 'pointDown'),
  tapDownR: arm(42, 42, 50, 53, 'pointDown', true),
  retractR: arm(37, 42, 30, 57, 'flat', true),
  plannerR: arm(39, 40, 31, 45, 'grip'),
  toFace1L: arm(7, 36, 9, 26, 'grip'),
  toFace2L: arm(8, 30, 13, 15, 'grip'),
} satisfies Record<string, ArmPose>

interface HeldItem { key: ItemKey; x: number; y: number }
interface Frame {
  L: ArmPose
  R: ArmPose
  items: HeldItem[]
  eyes?: EyeKey
  brows?: BrowKey
  headDy: number
  tilt: number
  lean: number
  bubbleDots: number
  glance: boolean
}

const EMOTE_FACE: Record<Emote, { brows?: BrowKey; mouth: MouthKey; talk: [MouthKey, MouthKey] }> = {
  neutral: { mouth: 'neutral', talk: ['talk1', 'talk2'] },
  warm: { brows: 'warm', mouth: 'smile', talk: ['talk1', 'talkSmile'] },
  concerned: { brows: 'concerned', mouth: 'concerned', talk: ['talkSmall', 'talk1'] },
  pleased: { brows: 'pleased', mouth: 'bigSmile', talk: ['talkSmile', 'talk2'] },
}

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
  private ctx: CanvasRenderingContext2D
  private image: ImageData
  private out: Uint32Array
  private colors = buildColorTable()
  private screen = new IndexBuffer(NATIVE_W, NATIVE_H)
  private headBuf = new IndexBuffer(HEAD.w + 6, HEAD.h)
  private hall = buildHall()
  private backdrop = buildBackdrop()
  private counter = buildCounter()
  private props = buildCounterProps()

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
  private walker: { x: number; dir: 1 | -1 } | null = null
  private nextWalker = 2000

  private onChange?: (s: NpcSnapshot) => void

  constructor(canvas: HTMLCanvasElement, opts: NpcEngineOptions = {}) {
    canvas.width = NATIVE_W
    canvas.height = NATIVE_H
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas not available')
    ctx.imageSmoothingEnabled = false
    this.ctx = ctx
    this.image = ctx.createImageData(NATIVE_W, NATIVE_H)
    this.out = new Uint32Array(this.image.data.buffer)
    this.ambient = opts.ambient ?? true
    this.reduced = opts.reducedMotion ?? false
    this.onChange = opts.onChange
  }

  // ---------- public API ----------
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
    this.emit()
  }
  setAmbient(on: boolean) {
    this.ambient = on
    if (!on) this.walker = null
    this.emit()
  }
  setReducedMotion(on: boolean) {
    this.reduced = on
    if (on) {
      this.walker = null
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
      if (this.ambient) {
        if (!this.walker && this.t >= this.nextWalker) {
          const dir = Math.random() < 0.5 ? 1 : -1
          this.walker = { x: dir === 1 ? -12 : NATIVE_W + 2, dir }
        }
        if (this.walker) {
          this.walker.x += (this.walker.dir * 12 * dt) / 1000
          if (this.walker.x < -14 || this.walker.x > NATIVE_W + 4) {
            this.walker = null
            this.nextWalker = this.t + rand(6000, 14000)
          }
        }
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
        f.brows = 'raised'
        f.eyes = 'open'
        break
      case 'receive-document': {
        f.L = seq(T, [[0, A.reach1L], [200, A.reach2L], [450, A.reach3L], [700, A.reach2LDoc], [950, A.reach1LDoc], [1200, A.holdDocL]])
        if (T >= 200 && T < 950) f.lean = -2
        if (T >= 600) f.items.push({ key: 'docSmall', x: f.L.hand.x - 4, y: f.L.hand.y - 10 })
        f.eyes = T < 700 ? 'down-left' : 'open'
        break
      }
      case 'reading':
        f.L = A.readL
        f.R = A.readR
        f.items.push({ key: 'docHeld', x: 17, y: 31 })
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
        f.R = !rm && Math.floor(st / 450) % 2 === 1 ? { ...A.pointDownR, hand: pt(46, 47) } : A.pointDownR
        f.eyes = 'open'
        break
      case 'slide-paper': {
        const p = clamp01((T - 250) / 750)
        const handY = Math.round(52 + 11 * p)
        if (T < 1000) f.R = { elbow: pt(37, 40 + Math.round(p * 5)), hand: pt(24, handY), sprite: 'flat', grounded: true }
        else if (T < 1200) f.R = A.retractR
        f.eyes = T < 1000 ? 'down' : 'open'
        break
      }
      case 'coach':
        f.L = seq(T, [[0, A.toFace1L], [250, A.toFace2L], [600, A.restL]])
        if (T >= 850) {
          f.R = A.plannerR
          f.items.push({ key: 'planner', x: A.plannerR.hand.x - 5, y: A.plannerR.hand.y - 9 })
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
      const keep = usesR ? A.readL : A.readR
      f.items.push({ key: 'docSmall', x: keep.hand.x - 4, y: keep.hand.y - 10 })
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
      const i = Math.floor(this.t / 80) % 4
      return i === 3 ? face.mouth : face.talk[i % 2]
    }
    return face.mouth
  }

  // ---------- render ----------
  private render() {
    const b = this.screen
    const t = this.t
    const animate = this.ambient && !this.reduced
    const f = this.stateFrame()
    const bob = this.reduced ? 0 : Math.floor(t / 750) % 2
    const ox = AGENT_ORIGIN.x + f.lean
    const oy = AGENT_ORIGIN.y

    // 1 hall, 2 ambient passer-by, 3 stand backdrop, 4 wordmark, 5 screen
    b.clear()
    b.blitBuffer(this.hall)
    if (animate && this.walker) b.blit(WALKER[Math.floor(t / 280) % 2], Math.round(this.walker.x), 100)
    b.blitBuffer(this.backdrop)
    b.blit(WORDMARK, WORDMARK_AT.x, WORDMARK_AT.y)
    drawScreen(b, t, animate)

    // 6 agent, back pass: torso then the head group
    b.blit(TORSO, ox + TORSO_POS.x, oy + TORSO_POS.y + bob)
    this.drawHead(f, ox, oy + bob + f.headDy)

    // 7 counter, 8 props, 9 drop zone
    b.blitBuffer(this.counter)
    b.blitBuffer(this.props)
    b.blit(CALCULATOR, CALC.x, CALC.y)
    if (this.gestureV === 'tap-calc' && !this.reduced) {
      for (let i = 0; i < 4; i++) if ((Math.floor(t / 220) + i) % 3 !== 0) b.rect(CALC.x + 2 + i * 2, CALC.y + 1, 1, 2, IDX.outline)
    }
    drawTray(b)
    if (this.trayDoc) b.blit(TRAY_DOC, TRAY.x + 4, TRAY.y + 2)
    if (this.paper !== 'none') this.drawPaper()
    if (this.dropHover) {
      const phase = this.reduced ? 0 : Math.floor(t / 120)
      b.dashed(TRAY.x - 2, TRAY.y - 2, TRAY.w + 4, TRAY.h + 4, IDX.glow, phase)
      const bounce = this.reduced ? 0 : Math.floor(t / 300) % 2
      b.blit(DROP_ARROW, TRAY.x + (TRAY.w >> 1) - 3, TRAY.y - 10 + bounce)
    }

    // 10 agent, front pass: arms, held items, hands
    this.drawArms(f, ox, oy, bob)

    // 11 thinking bubble
    if (f.bubbleDots > 0) {
      b.blit(BUBBLE, BUBBLE_AT.x, BUBBLE_AT.y)
      for (let i = 0; i < f.bubbleDots; i++) b.rect(BUBBLE_AT.x + 4 + i * 4, BUBBLE_AT.y + 3, 2, 2, IDX.outline)
    }

    b.toRGBA(this.out, this.colors, IDX.hallWall)
    this.ctx.putImageData(this.image, 0, 0)
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
    hb.blit(BROWS[face.brows ?? f.brows ?? 'neutral'], m + BROWS_POS.x, BROWS_POS.y)
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
      b.thickLine(s.x, s.y, e.x, e.y, 5, 2, IDX.outline)
      b.thickLine(e.x, e.y, h.x, h.y, 5, 2, IDX.outline)
      b.thickLine(s.x, s.y, e.x, e.y, 2, 1, IDX.uniformLight)
      b.thickLine(e.x, e.y, h.x, h.y, 2, 1, IDX.uniformLight)
      // white cuff just before the hand
      const len = Math.hypot(h.x - e.x, h.y - e.y) || 1
      const cx = Math.round(h.x - ((h.x - e.x) / len) * 3)
      const cy = Math.round(h.y - ((h.y - e.y) / len) * 3)
      b.thickLine(cx, cy, cx, cy, 2, 1, IDX.shirt)
    }
    for (const it of f.items) {
      const grounded = it.key === 'docSmall' && f.L.grounded
      const p = place(pt(it.x, it.y), grounded)
      b.blit(ITEMS[it.key], p.x, p.y)
    }
    for (const [, a] of arms) {
      const hs = HANDS[a.sprite]
      const h = place(a.hand, a.grounded)
      b.blit(hs, h.x - (hs.w >> 1), h.y - (hs.h >> 1))
    }
  }
}
