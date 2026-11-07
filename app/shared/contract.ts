// The contract between the backend (113) and the frontend (114). Handoff 112, 2026-11-07.
// 113 owns this file. Change it only with a `CONTRACT:` commit and a dated line in
// handoffs/113-backend-conversation.md ("Contract changes"). Re-run scripts/make-examples.ts after.
//
// Two halves:
//   1. Engine output: typed from what Jag's engine REALLY returns (analyse() and whatIf() run on
//      Priya, Sam, Dan, Alex and Mei on 2026-11-07). Field names are the engine's, not the plan doc's.
//   2. Conversation: steps, agent messages, what the agent expects back, and the HTTP bodies.
//
// No Node or DOM APIs here: the frontend imports this file as is.

import { z } from 'zod'

// ============================================================================================
// 1. Engine output
// ============================================================================================

/** ISO 8601 date-time string. The engine's Date objects arrive as these after toJSON(). */
export const IsoDate = z.string()

export const FactorId = z.enum(['payment', 'utilisation', 'affordability', 'searches', 'depth', 'identity'])
export type FactorId = z.infer<typeof FactorId>

/** Red, amber, green health. Never show it by colour alone (114). */
export const Rag = z.enum(['red', 'amber', 'green'])
export type Rag = z.infer<typeof Rag>

export const Bureau = z.enum(['experian', 'equifax', 'transunion'])
export type Bureau = z.infer<typeof Bureau>

/** Engine goals. The chat also offers "Car finance" and own words; the backend maps those onto these. */
export const Goal = z.enum(['build', 'card', 'mortgage'])
export type Goal = z.infer<typeof Goal>

export const PlanId = z.enum(['3m', '6m'])
export type PlanId = z.infer<typeof PlanId>

export const SourceLink = z.object({ label: z.string(), url: z.string() })
export type SourceLink = z.infer<typeof SourceLink>

/** The because-trail on a factor: how much it weighs, which data point, which source. */
export const FactorBecause = z.object({
  weight: z.number(),
  weightSource: z.string(),
  dataPoint: z.string(),
  rule: z.string(),
  source: SourceLink,
})

/** The because-trail on a plan step or a contribution: rule id, your data, the source, where the points come from. */
export const RuleBecause = z.object({
  rule: z.string(),
  name: z.string(),
  dataPoint: z.string(),
  source: SourceLink,
  /** null on steps that move no points (for example "avoid the thin-file traps"). */
  pointsSource: z.string().nullable(),
})
export type RuleBecause = z.infer<typeof RuleBecause>

export const Factor = z.object({
  id: FactorId,
  label: z.string(),
  weight: z.number(),
  /** 0 to 100, higher is healthier. */
  health: z.number(),
  reason: z.string(),
  rag: Rag,
  /** How much this factor holds the score back (weight x missing health). `ranked` is sorted by it. */
  drag: z.number(),
  because: FactorBecause,
})
export type Factor = z.infer<typeof Factor>

export const Diagnosis = z.object({
  /** In fixed order. */
  factors: z.array(Factor),
  /** Same factors, worst first. The chat uses the top 3. */
  ranked: z.array(Factor),
  /** Spending flags, already in words: "£40/month on buy now, pay later". */
  flags: z.array(z.string()),
  /** What a lender checks that this person does not meet yet (null when there is no decline). */
  declineWhy: z.array(z.string()).nullable(),
})
export type Diagnosis = z.infer<typeof Diagnosis>

export const Cash = z.object({
  bills: z.number(),
  debtMins: z.number(),
  essentials: z.number(),
  /** Money left each month after rent, bills, essentials and minimum payments. */
  surplus: z.number(),
  /** Money freed by stopping BNPL, gambling and payday payments. */
  freed: z.number(),
})

export const Sim = z.object({
  /** Month-by-month card balance and utilisation (0 to 1) under the paydown. */
  rows: z.array(z.object({ month: z.number(), bal: z.number(), util: z.number() })),
  /** Per month, what to pay to which card. */
  pays: z.array(z.array(z.object({ card: z.string(), amount: z.number() }))),
  /** Extra paid off cards in month 1, then every month after. */
  extraM1: z.number(),
  extraLater: z.number(),
  limit: z.number(),
  /** Month index when utilisation first drops under 30%, 50%, 75%. Missing if never or already under. */
  crossings: z.object({ 30: z.number().nullish(), 50: z.number().nullish(), 75: z.number().nullish() }),
})

export const PlanStep = z.object({
  date: IsoDate,
  title: z.string(),
  /** Exact amounts and payees, already in words. */
  instruction: z.string(),
  /** The factor id this step works on (seen: every FactorId). */
  why: z.string(),
  /** How the person will know it worked. */
  check: z.string(),
  because: RuleBecause,
})
export type PlanStep = z.infer<typeof PlanStep>

export const ProjectionPoint = z.object({
  /** 0 is today (the score on the report). */
  month: z.number().int(),
  date: IsoDate,
  /** Estimated score range on the person's bureau scale. Always label it "estimate". */
  low: z.number(),
  high: z.number(),
  because: z.object({
    start: z.number(),
    rawLow: z.number(),
    rawHigh: z.number(),
    dampedLow: z.number(),
    dampedHigh: z.number(),
    method: z.string(),
    breakdown: z.array(z.object({ effect: z.string(), rule: z.string(), low: z.number(), high: z.number() })),
  }),
})
export type ProjectionPoint = z.infer<typeof ProjectionPoint>

export const Plan = z.object({ steps: z.array(PlanStep), projection: z.array(ProjectionPoint) })
export type Plan = z.infer<typeof Plan>

export const Contribution = z.object({
  label: z.string(),
  low: z.number(),
  high: z.number(),
  plan: z.enum(['both', '3m', '6m']),
  because: RuleBecause,
})

export const CardEntry = z.object({
  id: z.string(),
  name: z.string(),
  apr: z.number(),
  /** Text, e.g. "£200-£4,000". */
  limit: z.string(),
  note: z.string(),
})

/** The Capital One card ladder (the plan doc called it `cardLadder`). */
export const Ladder = z.object({
  /** null when the advice is "no new card" (e.g. a mortgage goal). */
  entry: CardEntry.nullable(),
  applyFrom: IsoDate.optional(),
  reason: z.string(),
  /** Small fixed payments to put on the new card. null when there is no entry card. */
  tx: z
    .object({
      chosen: z.array(z.object({ kind: z.string(), fixed: z.boolean(), name: z.string(), amount: z.number() })),
      total: z.number(),
      target: z.number(),
      limitAssumed: z.number(),
    })
    .nullable(),
  /** Checklist for the next card; `when` is "now", a month ("Jul 2027") or "not within 12 months"; month -1 = not within 12. */
  graduation: z.array(z.object({ label: z.string(), ok: z.boolean(), when: z.string(), month: z.number() })),
  graduateWhen: z.string().nullable(),
})
export type Ladder = z.infer<typeof Ladder>

const Card = z.object({
  name: z.string(),
  limit: z.number(),
  balance: z.number(),
  apr: z.number(),
  minOnly: z.boolean().optional(),
  hasDD: z.boolean().optional(),
  openedYears: z.number().optional(),
})

const Bank = z
  .object({
    rent: z.number(),
    rentByTransfer: z.boolean(),
    councilTax: z.number(),
    bills: z.array(z.object({ name: z.string(), amount: z.number(), fixed: z.boolean().optional() })),
    subscriptions: z.array(z.object({ name: z.string(), amount: z.number() })),
    groceries: z.number(),
    transport: z.number(),
    bnpl: z.number(),
    gambling: z.number(),
    payday: z.number(),
    cashAdvances: z.number(),
    savings: z.number(),
    lateFees3m: z.number(),
    overdraftDays3m: z.number(),
    billsInOwnName: z.boolean(),
    other: z.number(),
  })
  .partial()

export const ProfileDecline = z.object({
  lender: z.string(),
  /** Capital One product id from the engine's CARDS ('classic', 'bt', ...). */
  productId: z.string().optional(),
  /** Months between the decline and the report. */
  monthsAgo: z.number().optional(),
  product: z.string().optional(),
  agency: z.string().optional(),
  statedReason: z.string().nullable().optional(),
})

/** The engine's input. Every field optional; normalise() fills defaults, so partial profiles from chat still run. */
export const Profile = z
  .object({
    name: z.string(),
    blurb: z.string(),
    age: z.number(),
    grossIncome: z.number(),
    /** Monthly take-home. null/missing = estimated from gross. */
    netIncome: z.number().nullable(),
    housing: z.string(),
    goal: Goal,
    bureau: Bureau,
    score: z.number(),
    cards: z.array(Card),
    loans: z.array(z.object({ name: z.string(), monthly: z.number(), openedYears: z.number().optional() })),
    lates: z.array(z.object({ account: z.string(), monthsAgo: z.number(), month: z.string().optional() })),
    defaults: z.array(z.object({ account: z.string(), monthsAgo: z.number() })),
    ccjs: z.array(z.looseObject({ monthsAgo: z.number() })),
    /** Months ago of each hard search. */
    searches: z.array(z.number()),
    electoralRoll: z.boolean(),
    addresses3y: z.number(),
    staleAssociates: z.array(z.string()),
    oldestAccountYears: z.number().nullable(),
    errorsOnReport: z.array(z.unknown()),
    decline: ProfileDecline.nullable(),
    paydownOverride: z.number().nullable(),
    student: z.boolean(),
    newToUK: z.boolean(),
    ukMonths: z.number().nullable(),
    canRegisterToVote: z.boolean(),
    hasPhoneContract: z.boolean().nullable(),
    bank: Bank,
  })
  .partial()
export type Profile = z.infer<typeof Profile>

/** What run() returns (after toJSON). The plan doc's names in brackets. */
export const RunResult = z.object({
  /** Normalised profile: every default filled in. Score is `profile.score` [score]. */
  profile: Profile,
  /** Plan start date (next Monday). */
  start: IsoDate,
  /** 999 Experian, 1000 Equifax, 710 TransUnion. */
  scaleMax: z.number(),
  /** Display name, e.g. "Experian". */
  bureau: z.string(),
  headline: z.string(),
  /** [factors] are in `diagnosis.ranked`, worst first. */
  diagnosis: Diagnosis,
  cash: Cash,
  sim: Sim,
  /** true = thin file, the build-from-zero plan. */
  build: z.boolean(),
  plans: z.object({ '3m': Plan, '6m': Plan }),
  contributions: z.array(Contribution),
  /** [cardLadder] */
  ladder: Ladder.nullable(),
  /** Points one missed payment would cost (show as a dip below the bands). */
  riskLine: z.number(),
})
export type RunResult = z.infer<typeof RunResult>

export const Finding = z.object({ label: z.string(), value: z.string(), tone: z.enum(['neutral', 'good', 'warn', 'bad']) })
export type Finding = z.infer<typeof Finding>

/** What the engine read out of a credit-coach-report/v1 file. null when the input was a Profile. */
export const Findings = z.object({ report: z.array(Finding), bank: z.array(Finding), letter: z.array(Finding) })

export const Likelihood = z.enum(['Most likely', 'Likely', 'Possible'])

/** decodeDecline(): why the last decline probably happened. */
export const DeclineDecoded = z.object({
  lender: z.string(),
  product: z.string().optional(),
  agency: z.string(),
  /** What the letter said, or "No specific reason given". */
  stated: z.string(),
  /** At most 4, most likely first. */
  reasons: z.array(
    z.object({ id: z.string(), weight: z.number(), title: z.string(), evidence: z.string(), likelihood: Likelihood }),
  ),
  /** The one fix. */
  fix: z.object({ title: z.string(), how: z.string() }),
  reapply: z.object({ when: z.string(), how: z.string() }),
  /** Your rights, already in words. */
  rights: z.array(z.string()),
})
export type DeclineDecoded = z.infer<typeof DeclineDecoded>

/** analyse(): the backend's one call. [decline] is the decoded decline, or null. */
export const EngineResult = z.object({
  /** The profile as given (or as parsed from a report), before defaults. */
  profile: Profile,
  findings: Findings.nullable(),
  result: RunResult,
  decline: DeclineDecoded.nullable(),
})
export type EngineResult = z.infer<typeof EngineResult>

// ---------- What-if ----------

/** The engine's levers. Claude may only produce these (113 validates with this schema). */
export const Change = z.discriminatedUnion('lever', [
  /** Pay this much extra a month off cards. */
  z.object({ lever: z.literal('paydown'), value: z.number().min(0) }),
  z.object({ lever: z.literal('stop'), what: z.enum(['bnpl', 'gambling', 'payday']) }),
  /** value false = take off the roll; default true. */
  z.object({ lever: z.literal('electoralRoll'), value: z.boolean().optional() }),
  z.object({ lever: z.literal('removeAssociates') }),
  /** Clear one card by name, or every card when `card` is missing. */
  z.object({ lever: z.literal('clearCard'), card: z.string().optional() }),
  z.object({ lever: z.literal('rentReporting'), value: z.boolean().optional() }),
  /** Set any profile path, e.g. "bank.rent". For the sliders only; not for Claude. */
  z.object({ lever: z.literal('set'), path: z.string().min(1), value: z.union([z.number(), z.string(), z.boolean()]) }),
])
export type Change = z.infer<typeof Change>

const Range = z.object({ low: z.number(), high: z.number() })
const Pair = z.tuple([z.number(), z.number()])

export const HeadlineNumbers = z.object({
  score: z.number(),
  /** Score range at the end of the 3- and 6-month plans. */
  m3: Range,
  m6: Range,
  /** Month utilisation crosses 30%, e.g. "Feb 2027". */
  under30: z.string().nullable(),
  /** [extra in month 1, extra each later month] */
  paydown: Pair,
  nextCard: z.string().nullable(),
  steps6: z.number(),
})

/** whatIf(profile, changes): before and after, and why it changed. */
export const EngineWhatIf = z.object({
  /** The changes in words: "Pay £300 extra a month off cards". */
  applied: z.array(z.string()),
  before: HeadlineNumbers,
  after: HeadlineNumbers,
  delta: z.object({ m3: Range, m6: Range }),
  because: z.object({
    effectChanges: z.array(
      z.object({ effect: z.string(), before: Pair.nullable(), after: Pair.nullable(), because: RuleBecause }),
    ),
    stepsAdded: z.array(z.string()),
    stepsRemoved: z.array(z.string()),
    under30: z.object({ before: z.string().nullable(), after: z.string().nullable() }).nullable(),
    nextCard: z.object({ before: z.string().nullable(), after: z.string().nullable() }).nullable(),
  }),
  result: RunResult,
  profile: Profile,
})
export type EngineWhatIf = z.infer<typeof EngineWhatIf>

/** A credit-coach-report/v1 file (the upload format). Only the top level is checked; the engine reads the rest. */
export const CreditReport = z.looseObject({
  format: z.literal('credit-coach-report/v1'),
  provider: z.string().optional(),
  reportDate: z.string().optional(),
  score: z.looseObject({ value: z.number(), scaleMax: z.number() }),
  personal: z.looseObject({ name: z.string() }),
  accounts: z.array(z.looseObject({ type: z.string() })),
})
export type CreditReport = z.infer<typeof CreditReport>

// ============================================================================================
// 2. Conversation
// ============================================================================================

/** Step order: see conversation.md. `questions` and `coach` span several turns. */
export const Step = z.enum([
  'greet',
  'ask_report',
  'ask_bank',
  'ask_letter',
  'questions',
  'assessing',
  'diagnosis',
  'decline',
  'paper',
  'coach',
])
export type Step = z.infer<typeof Step>

export const Emote = z.enum(['neutral', 'warm', 'concerned', 'pleased'])
export type Emote = z.infer<typeof Emote>

/**
 * What the agent does with his body. Several of these are STATES in the NPC kit, not gestures;
 * conversation.md has the mapping table onto setState()/gesture().
 */
export const Gesture = z.enum([
  'none',
  'wave',
  'asking',
  'receive-document',
  'reading',
  'thinking',
  'explaining',
  'slide-paper',
  'coach',
])
export type Gesture = z.infer<typeof Gesture>

/** How the frontend draws the message. Every kind except `text` has a card built from `ref`. */
export const MessageKind = z.enum(['text', 'reason', 'decline', 'step', 'projection', 'ladder', 'whatif', 'paper'])
export type MessageKind = z.infer<typeof MessageKind>

/**
 * Where a card's data lives. Cards render from here, never from numbers copied into `text`.
 * Resolve with resolveRef() below.
 */
export const Ref = z.discriminatedUnion('on', [
  /** result.result.headline */
  z.object({ on: z.literal('headline') }),
  /** result.result.diagnosis.ranked, by id */
  z.object({ on: z.literal('factor'), factorId: FactorId }),
  /** result.result.diagnosis.flags (all of them) */
  z.object({ on: z.literal('flags') }),
  /** result.decline; `part` says which bit this message is about (the card may show all) */
  z.object({ on: z.literal('decline'), part: z.enum(['reasons', 'fix', 'reapply', 'rights']).optional() }),
  /** result.result.plans[plan].steps[stepIndex] */
  z.object({ on: z.literal('step'), plan: PlanId, stepIndex: z.number().int().min(0) }),
  /** Both plans' projections and riskLine; `plan` is the one to highlight */
  z.object({ on: z.literal('projection'), plan: PlanId }),
  /** result.result.ladder */
  z.object({ on: z.literal('ladder') }),
  /** A what-if run, by id: TurnResponse.whatIf or WhatIfResponse.whatIf. Keep them by id. */
  z.object({ on: z.literal('whatif'), whatIfId: z.string() }),
  /** paperUrl on the response */
  z.object({ on: z.literal('paper') }),
])
export type Ref = z.infer<typeof Ref>

export const AgentMessage = z.object({
  /** Unique within the session. */
  id: z.string(),
  kind: MessageKind,
  /** What the agent says. At most 40 words, "you", British spelling. */
  text: z.string(),
  emote: Emote,
  gesture: Gesture,
  ref: Ref.optional(),
  /** For the debug panel (113 block 3): who wrote `text`. Missing = template. */
  writtenBy: z.enum(['template', 'claude']).optional(),
})
export type AgentMessage = z.infer<typeof AgentMessage>

export const FileKind = z.enum(['credit_report', 'bank', 'letter'])
export type FileKind = z.infer<typeof FileKind>

/**
 * What the agent wants back.
 * - file: upload tray + "Use a sample". `fileKinds` lists what fits here (a letter is accepted at ANY step anyway)
 * - choice: chips only
 * - text: text box; `chips` (if any) are quick replies
 * - none: no input. The frontend sends {type:'skip'} once the person has read the messages
 * `optional` true = show a Skip button.
 */
export const Expects = z.object({
  kind: z.enum(['file', 'choice', 'text', 'none']),
  fileKinds: z.array(FileKind).optional(),
  chips: z.array(z.string()).optional(),
  optional: z.boolean().optional(),
  placeholder: z.string().optional(),
  allowVoice: z.boolean().optional(),
})
export type Expects = z.infer<typeof Expects>

/** Persona ids that have sample files: see GET /api/personas. */
export const PersonaId = z.string()

export const TurnInput = z.discriminatedUnion('type', [
  /** First turn. sessionId null. */
  z.object({ type: z.literal('start') }),
  /** After POST /api/upload. A `letter` is accepted at any step: one acknowledgement, step unchanged. */
  z.object({ type: z.literal('file'), fileKind: FileKind, fileId: z.string() }),
  /** "Use a sample". personaId is needed for the first sample (the report); later samples use the same persona. */
  z.object({ type: z.literal('sample'), fileKind: FileKind, personaId: PersonaId.optional() }),
  /** Skip an optional step, or move on after expects.kind 'none'. */
  z.object({ type: z.literal('skip') }),
  /** A chip. value = the chip's text, exactly. */
  z.object({ type: z.literal('choice'), value: z.string() }),
  /** Typed or spoken text. */
  z.object({ type: z.literal('text'), value: z.string().min(1) }),
])
export type TurnInput = z.infer<typeof TurnInput>

export const Settings = z.object({ plainEnglish: z.boolean() })

/** POST /api/turn */
export const TurnRequest = z.object({
  sessionId: z.string().nullable(),
  input: TurnInput,
  settings: Settings.optional(),
})
export type TurnRequest = z.infer<typeof TurnRequest>

/** One what-if: the request, the levers it became, and the engine's answer. */
export const WhatIfRun = z.object({
  id: z.string(),
  /** The person's words, or null when it came from the sliders. */
  text: z.string().nullable(),
  changes: z.array(Change),
  output: EngineWhatIf,
})
export type WhatIfRun = z.infer<typeof WhatIfRun>

/** POST /api/turn response */
export const TurnResponse = z.object({
  sessionId: z.string(),
  /** The step these messages belong to (the current step after this turn). */
  step: Step,
  messages: z.array(AgentMessage),
  expects: Expects,
  /** null until `assessing`; from then on every response carries it. */
  result: EngineResult.nullable(),
  /** Set from the `paper` step on: GET it for the PDF. */
  paperUrl: z.string().nullable(),
  /** Addition to the 112 spec: set on a coach turn that answered a free-text what-if; messages ref it by id. */
  whatIf: WhatIfRun.nullable().optional(),
})
export type TurnResponse = z.infer<typeof TurnResponse>

/** POST /api/upload response. Request: multipart with fields `file`, `fileKind`, `sessionId` (may be empty). */
export const UploadResult = z.object({
  ok: z.boolean(),
  /** Pass to POST /api/turn as {type:'file', fileKind, fileId}. null when ok is false. */
  fileId: z.string().nullable(),
  fileKind: FileKind,
  fileName: z.string(),
  /** What was read from it (engine findings for a report or letter; bank categories for a CSV). */
  findings: z.array(Finding),
  /** Friendly reason when ok is false ("I couldn't read that, try the sample?"). */
  error: z.string().nullable(),
})
export type UploadResult = z.infer<typeof UploadResult>

/** POST /api/whatif. Send `text` (Claude turns it into changes) or `changes` (sliders), not neither. */
export const WhatIfRequest = z
  .object({ sessionId: z.string(), text: z.string().min(1).optional(), changes: z.array(Change).min(1).optional() })
  .refine(r => r.text !== undefined || r.changes !== undefined, { message: 'Send text or changes' })
export type WhatIfRequest = z.infer<typeof WhatIfRequest>

/** POST /api/whatif response: the agent's answer (kind 'whatif', ref to whatIf.id) and the data. */
export const WhatIfResponse = z.object({
  sessionId: z.string(),
  messages: z.array(AgentMessage),
  whatIf: WhatIfRun,
})
export type WhatIfResponse = z.infer<typeof WhatIfResponse>

/** GET /api/personas: the samples. */
export const Persona = z.object({ id: PersonaId, name: z.string(), blurb: z.string() })
export type Persona = z.infer<typeof Persona>
export const PersonasResponse = z.array(Persona)

/** Every error body. */
export const ApiError = z.object({ error: z.string() })
export type ApiError = z.infer<typeof ApiError>

export const HealthResponse = z.object({ ok: z.literal(true) })

// ============================================================================================
// Routes (built in 113). Backend on :8000, frontend on :5173 (Vite proxies /api).
// CORS: http://localhost:5173 and the phone's LAN origin (http://<Mac LAN IP>:5173).
// ============================================================================================

export const BACKEND_PORT = 8000
export const FRONTEND_PORT = 5173

export const ROUTES = {
  health: 'GET /api/health', // -> HealthResponse
  personas: 'GET /api/personas', // -> PersonasResponse
  turn: 'POST /api/turn', // TurnRequest -> TurnResponse
  upload: 'POST /api/upload', // multipart file, fileKind, sessionId -> UploadResult
  whatif: 'POST /api/whatif', // WhatIfRequest -> WhatIfResponse
  paper: 'GET /api/paper/:sessionId.pdf', // -> application/pdf, 404 {error} until the paper step
} as const

export const paperUrlFor = (sessionId: string) => `/api/paper/${encodeURIComponent(sessionId)}.pdf`

// ============================================================================================
// Resolve a message's ref into the data its card shows
// ============================================================================================

export type Resolved =
  | { on: 'headline'; headline: string; build: boolean }
  | { on: 'factor'; factor: Factor; rank: number }
  | { on: 'flags'; flags: string[] }
  | { on: 'decline'; decline: DeclineDecoded; part?: 'reasons' | 'fix' | 'reapply' | 'rights' }
  | { on: 'step'; step: PlanStep; plan: PlanId; stepIndex: number; total: number }
  | { on: 'projection'; plan: PlanId; plans: RunResult['plans']; riskLine: number; scaleMax: number; bureau: string }
  | { on: 'ladder'; ladder: Ladder }
  | { on: 'whatif'; whatIf: WhatIfRun }
  | { on: 'paper'; paperUrl: string }

/**
 * Find a card's data. Returns null when the ref does not resolve (render the text only).
 * `whatIfs` is every WhatIfRun the frontend has received, by id.
 */
export function resolveRef(
  ref: Ref | undefined,
  result: EngineResult | null,
  extra: { whatIfs?: Record<string, WhatIfRun>; paperUrl?: string | null } = {},
): Resolved | null {
  if (!ref) return null
  if (ref.on === 'whatif') {
    const whatIf = extra.whatIfs?.[ref.whatIfId]
    return whatIf ? { on: 'whatif', whatIf } : null
  }
  if (ref.on === 'paper') return extra.paperUrl ? { on: 'paper', paperUrl: extra.paperUrl } : null
  if (!result) return null
  const r = result.result
  switch (ref.on) {
    case 'headline':
      return { on: 'headline', headline: r.headline, build: r.build }
    case 'factor': {
      const rank = r.diagnosis.ranked.findIndex(f => f.id === ref.factorId)
      return rank < 0 ? null : { on: 'factor', factor: r.diagnosis.ranked[rank]!, rank }
    }
    case 'flags':
      return { on: 'flags', flags: r.diagnosis.flags }
    case 'decline':
      return result.decline ? { on: 'decline', decline: result.decline, part: ref.part } : null
    case 'step': {
      const steps = r.plans[ref.plan].steps
      const step = steps[ref.stepIndex]
      return step ? { on: 'step', step, plan: ref.plan, stepIndex: ref.stepIndex, total: steps.length } : null
    }
    case 'projection':
      return { on: 'projection', plan: ref.plan, plans: r.plans, riskLine: r.riskLine, scaleMax: r.scaleMax, bureau: r.bureau }
    case 'ladder':
      return r.ladder ? { on: 'ladder', ladder: r.ladder } : null
  }
}
