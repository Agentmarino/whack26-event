// What the agent says, as templates over the engine's data (conversation.md). Every number in a
// template comes straight from the engine result. Claude may reword some of these later (block 3);
// these are always the fallback. At most 40 words a message, "you", British spelling.

import type { Branch, Change, DeclineDecoded, EngineResult, EngineWhatIf, Emote, Expects, Gesture, MessageKind, PlanId, PlanStep, Ref, Rag, WhatIfRun } from 'shared'
import * as E from '../engine/index.ts'

/** A message before it gets its id. `base` is the id stem; `item` marks text Claude may reword. */
export type Draft = {
  base: string
  kind: MessageKind
  text: string
  emote: Emote
  gesture: Gesture
  ref?: Ref
  item?: ClaudeItem
}

/** Text Claude may reword (block 3), with the engine data its numbers must come from. */
export type ClaudeItem =
  | { what: 'headline' }
  | { what: 'reason'; factorId: string }
  | { what: 'step'; plan: PlanId; stepIndex: number }

export const MAX_WORDS = 40

const d = (base: string, kind: MessageKind, text: string, emote: Emote, gesture: Gesture, ref?: Ref, item?: ClaudeItem): Draft => ({
  base,
  kind,
  text: fit(text),
  emote,
  gesture,
  ...(ref ? { ref } : {}),
  ...(item ? { item } : {}),
})

export const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length

/** Keep a message to 40 words by dropping whole sentences from the end (never cutting a number in half). */
export function fit(text: string, max = MAX_WORDS): string {
  if (wordCount(text) <= max) return text
  const sentences = text.match(/[^.!?]+[.!?]+["')]?\s*|[^.!?]+$/g) ?? [text]
  let out = ''
  for (const s of sentences) {
    if (wordCount(out + s) > max) break
    out += s
  }
  return (out || sentences[0] || text).trim()
}

export const BUREAU_NAME: Record<string, string> = { experian: 'Experian', equifax: 'Equifax', transunion: 'TransUnion' }
export const count = (n: number) => ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][n] ?? String(n)
export const emoteFor = (rag: Rag): Emote => (rag === 'red' ? 'concerned' : rag === 'amber' ? 'warm' : 'pleased')
const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)
const money = (n: number) => E.gbp(Math.round(Math.abs(n)))
export const planMonths = (plan: PlanId) => (plan === '3m' ? 3 : 6)
export const planChip = (plan: PlanId) => (plan === '3m' ? '3 months' : '6 months')

export const CHIPS = {
  start: ["Let's start"],
  goal: ['A credit card', 'Car finance', 'A mortgage', 'Just build my credit'],
  horizon: ['3 months', '6 months'],
  yesNo: ['Yes', 'No', 'Not sure'],
  canRegister: ['Yes, I can', "No, I can't", 'Not sure'],
  housing: ['Rent', 'Own', 'With family'],
  bureau: ['Experian', 'Equifax', 'TransUnion', 'Not sure'],
}

// ---------------------------------------------------------------------------------------------
// Intake
// ---------------------------------------------------------------------------------------------

export const greet = (): Draft[] => [
  d('greet-1', 'text', "Hello, welcome to the Capital One desk. I'll look at your credit the way a lender would, then help you fix what's holding you back.", 'warm', 'wave'),
  d('greet-2', 'text', "It takes about five minutes. Nothing here is a credit search, so it can't harm your score.", 'neutral', 'none'),
]
export const greetExpects: Expects = { kind: 'choice', chips: CHIPS.start }

export const askReport = (): Draft =>
  d('ask-report', 'text', 'First, your credit report. Upload it from Experian, Equifax or TransUnion, or use one of our samples.', 'neutral', 'asking')
export const askReportExpects: Expects = { kind: 'file', fileKinds: ['credit_report'], optional: true }

export const ackReport = (name: string | undefined, bureau: string, score: number | undefined, scaleMax: number): Draft =>
  d(
    'ack-report',
    'text',
    `Thanks${name && name !== 'You' ? `, ${name}` : ''}. I've got your ${bureau} report.` + (score != null ? ` Your score there is ${score} out of ${scaleMax}.` : ''),
    'warm',
    'receive-document',
  )

export const askBank = (bundled: boolean): Draft =>
  bundled
    ? d('ask-bank', 'text', 'Your sample already has three months of bank data in it, so you can skip this, or hand me a different statement.', 'neutral', 'asking')
    : d('ask-bank', 'text', 'Next, three months of your bank statement, as a CSV or PDF. It shows me what you can afford each month. You can skip this.', 'neutral', 'asking')
export const askBankExpects: Expects = { kind: 'file', fileKinds: ['bank'], optional: true }

export const ackBank = (surplus: number): Draft =>
  d(
    'ack-bank',
    'text',
    surplus >= 0
      ? `Got it. After rent, bills and the basics you have about ${money(surplus)} a month left over.`
      : `Got it. After rent, bills and the basics you're about ${money(surplus)} short each month. That matters, and we'll work on it.`,
    surplus >= 0 ? 'neutral' : 'concerned',
    'reading',
  )

export const askLetter = (bundledLender: string | null): Draft =>
  bundledLender
    ? d('ask-letter', 'text', `Your sample already has the letter from ${bundledLender} in it. I'll go through it after your results. You can skip this, or hand me another letter.`, 'neutral', 'asking')
    : d('ask-letter', 'text', "Have you been turned down for credit lately? If you've got the letter, hand it over and I'll explain what it means. If not, skip this.", 'neutral', 'asking')
export const askLetterExpects: Expects = { kind: 'file', fileKinds: ['letter'], optional: true }

export const ackLetter = (lender: string): Draft =>
  d('ack-letter', 'text', `Thanks, that's your ${lender} letter. I'll go through it once I've seen everything.`, 'warm', 'receive-document')

/** A letter handed over at any other step: one acknowledgement, step unchanged. */
export const ackLetterAnyStep = (lender: string, afterResults: boolean): Draft =>
  afterResults
    ? d('ack-letter-file', 'text', `Thanks, that's a letter from ${lender}. I've added it to your check, so your summary covers it too.`, 'warm', 'receive-document')
    : d('ack-letter-file', 'text', `Thanks, that's a letter from ${lender}. I'll go through it after your results.`, 'warm', 'receive-document')

/** A report or bank statement handed over out of order. */
export const ackLateFile = (what: 'report' | 'bank', afterResults: boolean): Draft =>
  afterResults
    ? d('ack-late', 'text', `Thanks. I've already done your check, so start again if you'd like me to use this ${what === 'report' ? 'report' : 'statement'}.`, 'neutral', 'receive-document')
    : d('ack-late', 'text', `Thanks, I've got your ${what === 'report' ? 'credit report' : 'bank statement'}. I'll use it in your check.`, 'warm', 'receive-document')

export const nudgeFile = (what: 'report' | 'bank' | 'letter'): Draft =>
  d(
    'nudge',
    'text',
    `Tap Upload to hand me your ${what === 'report' ? 'credit report' : what === 'bank' ? 'bank statement' : 'letter'}, or Use a sample. You can skip this too.`,
    'neutral',
    'asking',
  )

export const sampleMissing = (): Draft =>
  d('sample-missing', 'text', "I don't have that sample. Try Priya, Mei Lin or Alex Morgan.", 'neutral', 'asking')

/** `goal` (115): what the plan works towards, from the goals step ("the Balance Transfer card", "a score of 800"). */
export const assessing = (goal?: string | null): Draft =>
  d('assess-1', 'text', goal ? `Thanks! Give me a moment to build your plan towards ${goal}.` : "Thanks, that's everything I need. Give me a moment to go through it all.", 'neutral', 'thinking')

// ---------------------------------------------------------------------------------------------
// Diagnosis and decline
// ---------------------------------------------------------------------------------------------

export function diagnosis(res: EngineResult): Draft[] {
  const r = res.result
  const top3 = r.diagnosis.ranked.slice(0, 3)
  const flags = r.diagnosis.flags
  const out: Draft[] = [
    d('diag-headline', 'text', r.headline, 'warm', 'explaining', { on: 'headline' }, { what: 'headline' }),
    d('diag-intro', 'text', "Here's what's holding your score back, worst first.", 'neutral', 'explaining'),
    ...top3.map(f => d(`diag-${f.id}`, 'reason', f.reason, emoteFor(f.rag), 'explaining', { on: 'factor', factorId: f.id }, { what: 'reason', factorId: f.id })),
  ]
  if (flags.length) {
    const text =
      flags.length <= 2
        ? `${count(flags.length)} ${flags.length === 1 ? 'thing' : 'things'} in your spending stand${flags.length === 1 ? 's' : ''} out: ${flags.join(' and ')}.`
        : `${count(flags.length)} things in your spending stand out, starting with ${flags.slice(0, 2).join(' and ')}. They're all on the card.`
    out.push(d('diag-flags', 'text', text, 'concerned', 'explaining', { on: 'flags' }))
  }
  return out
}
/** `declineShown` (115): the declined branch already explained the decline before the goals step. */
export const diagnosisExpects = (res: EngineResult, declineShown = false): Expects => ({
  kind: 'choice',
  chips: declineShown ? ['Sum it up for me'] : res.decline ? ['Tell me about the letter'] : ['What can I do?'],
})

/** `hadLetter` false (115): the declined branch without the letter, from the "who and what for" chips. */
export function decline(dd: DeclineDecoded, hadLetter = true): Draft[] {
  return [
    d(
      'decline-reasons',
      'decline',
      !hadLetter
        ? `About your application to ${dd.lender}${dd.product ? ` for the ${dd.product}` : ''}. Without the letter, here's what most likely sat behind the no.`
        : dd.stated === 'No specific reason given'
        ? `About your ${dd.lender} letter. It didn't give a reason, so I've worked out the most likely ones from your report.`
        : `About your ${dd.lender} letter. It said: "${dd.stated}". Here's what most likely sat behind it.`,
      'concerned',
      'explaining',
      { on: 'decline', part: 'reasons' },
    ),
    d('decline-fix', 'text', `The one fix that matters most: ${lowerFirst(dd.fix.title)}. ${dd.fix.how}`, 'warm', 'explaining', { on: 'decline', part: 'fix' }),
    d('decline-reapply', 'text', `Don't apply again before ${dd.reapply.when}. ${dd.reapply.how}`, 'warm', 'explaining', { on: 'decline', part: 'reapply' }),
    d(
      'decline-rights',
      'text',
      `You have rights here too. The lender must name the agency it used, and you can see and correct your ${dd.agency} report for free.`,
      'warm',
      'none',
      { on: 'decline', part: 'rights' },
    ),
  ]
}
export const declineExpects: Expects = { kind: 'choice', chips: ['Got it'] }

export const paper = (): Draft =>
  d('paper-1', 'paper', "Here's all of that on one sheet. Tap it to read it, or take a copy with you.", 'pleased', 'slide-paper', { on: 'paper' })
export const paperExpects: Expects = { kind: 'choice', chips: ['Make me a plan'] }

// ---------------------------------------------------------------------------------------------
// Coach
// ---------------------------------------------------------------------------------------------

export const coachChoose = (horizon: PlanId): Draft =>
  d(
    'coach-choose',
    'text',
    `Right, let's make you a plan. You said ${planChip(horizon)}. Shall we stick with that, or go for ${planMonths(horizon === '3m' ? '6m' : '3m')}?`,
    'warm',
    'coach',
  )
export const coachChooseExpects: Expects = { kind: 'choice', chips: CHIPS.horizon }

export function planMessages(res: EngineResult, plan: PlanId): Draft[] {
  const r = res.result
  const p = r.plans[plan]
  const end = p.projection.at(-1)
  const ladder = r.ladder
  const out: Draft[] = [
    d(`plan-${plan}-intro`, 'text', `Here's your ${planMonths(plan)}-month plan: ${p.steps.length} steps, week by week. Tap any step to see why it's there.`, 'warm', 'coach'),
    ...p.steps.map((s, i) =>
      d(`plan-${plan}-step-${i}`, 'step', `${E.fmtDate(s.date)}: ${s.title}.`, 'neutral', 'explaining', { on: 'step', plan, stepIndex: i }, { what: 'step', plan, stepIndex: i }),
    ),
  ]
  if (end)
    out.push(
      d(
        `plan-${plan}-projection`,
        'projection',
        `If you stick to it, your ${r.bureau} score could be ${end.low} to ${end.high} by ${end.date}. That's an estimate, not a promise.`,
        'pleased',
        'explaining',
        { on: 'projection', plan },
      ),
    )
  if (ladder)
    out.push(
      d(
        `plan-${plan}-ladder`,
        'ladder',
        ladder.entry && ladder.applyFrom
          ? `When you're ready for a new card, start with the ${ladder.entry.name}, from ${E.fmtMonth(ladder.applyFrom)}. Check with QuickCheck first: it won't leave a mark.`
          : ladder.reason,
        'warm',
        'explaining',
        { on: 'ladder' },
      ),
    )
  out.push(d(`plan-${plan}-whatif`, 'text', `Now ask me anything that starts with "what if". For example: ${lowerFirst(whatIfChips(res)[0] ?? 'What if I pay £300 a month?')}`, 'warm', 'coach'))
  return out
}

/** Quick replies in coach, built from the data so each one can move something. */
export function whatIfChips(res: EngineResult): string[] {
  const p = res.result.profile
  const chips: string[] = []
  if ((p.cards ?? []).some(c => c.balance > 0)) chips.push('What if I pay £300 a month?', 'What if I pay £400 a month?')
  if ((p.bank?.bnpl ?? 0) > 0) chips.push('What if I stop buy now, pay later?')
  if ((p.bank?.gambling ?? 0) > 0) chips.push('What if I stop gambling?')
  if (chips.length < 2 && p.electoralRoll === false && p.canRegisterToVote !== false) chips.push('What if I register to vote?')
  if (chips.length < 2) chips.push('What if I report my rent?')
  return chips.slice(0, 3)
}
export const whatIfExpects = (res: EngineResult): Expects => ({
  kind: 'text',
  chips: whatIfChips(res),
  placeholder: 'What if I…',
  allowVoice: true,
})

/** A change that takes something good away. Never shown as a gain (114 review: coming off the roll showed a rise). */
export const isRemoval = (c: Change) => (c.lever === 'electoralRoll' || c.lever === 'rentReporting') && c.value === false

/** Does the engine's answer go up on either plan? */
export const rises = (o: EngineWhatIf) => [o.delta.m3, o.delta.m6].some(d => d.low > 0 || d.high > 0)

/** Words for a list of changes: "Paying £300 extra a month and stopping buy now, pay later". */
export function leadFor(run: WhatIfRun | { changes: Change[] }): string {
  const parts = run.changes.map(c => {
    switch (c.lever) {
      case 'paydown':
        return `Paying ${E.gbp(c.value)} extra a month`
      case 'stop':
        return c.what === 'bnpl' ? 'Stopping buy now, pay later' : c.what === 'gambling' ? 'Stopping gambling' : 'Stopping payday loans'
      case 'electoralRoll':
        return c.value === false ? 'Coming off the electoral roll' : 'Registering to vote'
      case 'removeAssociates':
        return 'Breaking the financial link'
      case 'clearCard':
        return c.card ? `Clearing your ${c.card}` : 'Clearing your cards'
      case 'rentReporting':
        return c.value === false ? 'Not reporting your rent' : 'Reporting your rent'
      case 'set':
        return 'With that change'
    }
  })
  const [first, ...rest] = parts
  if (!first) return 'That change'
  const tail = rest.map(lowerFirst)
  const last = tail.pop()
  return last ? [first, ...tail].join(', ') + ` and ${last}` : first
}

/**
 * The answer to a what-if, quoting the plan the person chose. When the estimate does not go up the
 * baseline plan already gets there (BNPL and the roll are in it; on the 6-month plan extra paydown
 * lands on the same range): say so instead of showing a lower number (112 RESULT, conversation.md).
 */
export function whatIfMessage(res: EngineResult, run: WhatIfRun, plan: PlanId): Draft {
  const k = plan === '3m' ? 'm3' : 'm6'
  const b = run.output.before[k]
  const a = run.output.after[k]
  const delta = run.output.delta[k]
  const end = res.result.plans[plan].projection.at(-1)
  const by = end ? end.date : 'the end of your plan'
  // Coming off the roll or dropping rent reporting never reads as a gain, alone or next to other changes.
  const removals = run.changes.filter(isRemoval)
  const gains = run.changes.filter(c => !isRemoval(c))
  if (!gains.length && removals.length) {
    const why = [
      removals.some(c => c.lever === 'electoralRoll') ? 'lenders use the roll to check who you are.' : '',
      removals.some(c => c.lever === 'rentReporting') ? 'Reported rent adds payment history.' : '',
    ].filter(Boolean)
    const text = `${leadFor(run)} won't raise your score${why.length ? ': ' + why.join(' ') : '.'} Your estimate by ${by} stays at ${b.low} to ${b.high} at best.`
    return d('whatif', 'whatif', text, 'concerned', 'explaining', { on: 'whatif', whatIfId: run.id })
  }
  const leftOut = removals.length ? ` I left out ${lowerFirst(leadFor({ changes: removals }))}: it won't help.` : ''
  const up = delta.high > 0 || delta.low > 0
  // A change that takes something good away (off the roll, no rent reporting, a number set by the sliders)
  // can really lower the estimate: say so with the engine's numbers.
  const down = (delta.high < 0 || delta.low < 0) && run.changes.some(c => ('value' in c && c.value === false) || c.lever === 'set')
  const under30 = run.output.because.under30
  const tail = (under30?.after ? ` You'd get under 30% by ${under30.after}.` : '') + leftOut
  const lead = leadFor({ changes: gains })
  const text = up
    ? `${lead}: by ${by} your score could be ${a.low} to ${a.high}, up from ${b.low} to ${b.high}. An estimate.${tail}`
    : down
      ? `${lead}: by ${by} your estimate would drop to ${a.low} to ${a.high}, from ${b.low} to ${b.high}. Better to keep it.`
      : `${lead}: your estimate by ${by} stays at ${b.low} to ${b.high}. Your plan already gets you there.${tail}`
  return d('whatif', 'whatif', text, up ? 'pleased' : down ? 'concerned' : 'neutral', 'explaining', { on: 'whatif', whatIfId: run.id })
}

export const whatIfUnknown = (): Draft =>
  d(
    'whatif-unknown',
    'text',
    "I can't test that one. I can model these: paying more off your cards, clearing a card, stopping buy now pay later, gambling or payday loans, registering to vote, breaking a financial link, or reporting your rent.",
    'neutral',
    'coach',
  )

export const whatIfFailed = (): Draft =>
  d('whatif-failed', 'text', "I couldn't work that one out. Try a different amount, or one change at a time.", 'neutral', 'coach')

// ---------------------------------------------------------------------------------------------
// 115: Cap's intro, the opening question, the branches' early reads and the goals step
// ---------------------------------------------------------------------------------------------

export const CAP = { name: 'Cap', title: 'Credit Coach', tagline: 'Here to make your credit make sense' }

export const intro = (): Draft[] => [
  d('intro-hello', 'text', "Hi, nice to meet you. My name's Cap, here's my card.", 'warm', 'slide-card'),
  d('intro-card', 'card', `${CAP.name}, ${CAP.title}. ${CAP.tagline}.`, 'warm', 'none'),
]
export const introExpects: Expects = { kind: 'choice', chips: ['Nice to meet you, Cap!'] }

/** The opening chips, exactly; the chip picks the branch. */
export const OPENING: Record<Branch, string> = {
  declined: "I've been declined already",
  report: "I've got a credit report I want help with",
  prepare: 'I want to get ready before I apply',
  new: "I'm new to credit or new to the UK",
}

export const opening = (): Draft[] => [
  d('opening-safe', 'text', "Nothing we do here is a credit search, so it can't harm your score.", 'warm', 'none'),
  d('opening', 'text', "I understand you're here to make your credit better. Where should we start?", 'pleased', 'asking'),
]
export const openingAgain = (): Draft => d('opening-again', 'text', "Sorry, I didn't quite catch that. Which of these is closest?", 'neutral', 'asking')
export const openingExpects: Expects = { kind: 'choice', chips: Object.values(OPENING) }

export function branchAck(b: Branch): Draft {
  switch (b) {
    case 'declined':
      return d('branch-ack', 'text', "Oh, I'm sorry. That's frustrating, and the letter rarely says why. Let's work it out together.", 'concerned', 'none')
    case 'report':
      return d('branch-ack', 'text', "Lovely, let's go through it together.", 'pleased', 'none')
    case 'prepare':
      return d('branch-ack', 'text', 'Great idea. Checking first means no surprises, and nothing goes on your file.', 'pleased', 'none')
    case 'new':
      return d('branch-ack', 'text', "Welcome! Everyone starts somewhere. I'll show you how to build your credit from zero.", 'pleased', 'none')
  }
}

export const askLetterDeclined = (): Draft =>
  d('ask-letter', 'text', "Have you got the letter they sent? Hand it over and I'll tell you what most likely happened. No letter? Tap Skip.", 'neutral', 'asking')

/** The report request, worded for the branch. */
export function askReportFor(b: Branch | null): Draft {
  switch (b) {
    case 'declined':
      return d('ask-report', 'text', 'Next, your credit report, so I can see what the lender saw. Upload it from Experian, Equifax or TransUnion, or use a sample.', 'neutral', 'asking')
    case 'prepare':
      return d('ask-report', 'text', 'Now your credit report, so I can check you against it. Upload it, or use a sample. No report yet? Tap Skip.', 'neutral', 'asking')
    case 'new':
      return d('ask-report', 'text', 'Have you got a credit report yet? Even a short one helps. Upload it, use a sample, or tap Skip.', 'neutral', 'asking')
    default:
      return d('ask-report', 'text', 'Hand it over: upload it from Experian, Equifax or TransUnion, or use one of our samples.', 'neutral', 'asking')
  }
}

/** A plan step as a plain line Claude may reword (same cache key as the plan's step message), with no card. */
const stepLine = (stem: string, plan: PlanId, i: number, s: PlanStep): Draft =>
  d(`${stem}-${i}`, 'text', `${E.fmtDate(s.date)}: ${s.title}.`, 'neutral', 'explaining', undefined, { what: 'step', plan, stepIndex: i })

/**
 * The declined branch, after the explanation: the first 3-month plan step for each likely reason, in
 * the reasons' order, at most three. Plain lines, not step cards: the plan is run again after the goals
 * step, and a card would show the new plan's step under the old words.
 */
export function improve(res: EngineResult): Draft[] {
  const steps = res.result.plans['3m'].steps
  const picked: number[] = []
  for (const reason of res.decline?.reasons ?? []) {
    const why = reason.id === 'identity2' ? 'identity' : reason.id
    const i = steps.findIndex((s, j) => s.why === why && !picked.includes(j))
    if (i >= 0) picked.push(i)
    if (picked.length === 3) break
  }
  if (!picked.length) picked.push(...steps.slice(0, 3).map((_, i) => i))
  picked.sort((a, b) => a - b) // the plan is in date order
  return [
    d('improve-intro', 'text', `Here's where to start. ${count(picked.length)} ${picked.length === 1 ? 'step works' : 'steps work'} on those reasons:`, 'warm', 'explaining'),
    ...picked.map(i => stepLine('improve', '3m', i, steps[i]!)),
  ]
}

/** The new branch: the first three steps of the build-from-zero plan. */
export function buildStart(res: EngineResult): Draft[] {
  const steps = res.result.plans['3m'].steps.slice(0, 3)
  const first = `The first ${count(steps.length).toLowerCase()} ${steps.length === 1 ? 'step' : 'steps'}:`
  return [
    // "From zero" only when the engine is on its build-from-zero track (a thin file).
    d('build-intro', 'text', res.result.build ? `Here's how you start from zero. ${first}` : `Here's where to start. ${first}`, 'warm', 'explaining'),
    ...steps.map((s, i) => stepLine('build', '3m', i, s)),
  ]
}

export const CARD_NAME: Record<'classic' | 'bt' | 'purchase', string> = {
  classic: 'Capital One Classic',
  bt: 'Capital One Balance Transfer',
  purchase: 'Capital One 0% Purchase',
}
export const CARD_SHORT: Record<'classic' | 'bt' | 'purchase', string> = { classic: 'Classic card', bt: 'Balance Transfer card', purchase: '0% Purchase card' }

/**
 * The prepare branch: how they stand against the product they want first (the card ladder's criteria
 * and the month each turns green). Plain lines, not the ladder card: the plan is run again after the
 * goals step, and a card in the history would show the new ladder under the old words. The ladder
 * card itself comes with the plan.
 */
export function readiness(res: EngineResult, product: { id: string; label: string }): Draft[] {
  const l = res.result.ladder
  if (product.id === 'classic' && l?.entry && l.applyFrom)
    return [
      d('ready-card', 'text', `The Classic is a credit-builder card. You could check it on QuickCheck from ${E.fmtMonth(l.applyFrom)}. It's a soft search, so it won't leave a mark.`, 'pleased', 'explaining'),
    ]
  if ((product.id === 'bt' || product.id === 'purchase') && l && l.graduation.length) {
    const met = l.graduation.filter(g => g.ok).length
    const total = l.graduation.length
    const when = l.graduateWhen ? ` All of them should be green by ${l.graduateWhen}.` : ''
    const text =
      product.id === 'bt'
        ? `Against the Balance Transfer card's published criteria, you meet ${met} of ${total} today.${when}`
        : `The 0% Purchase card asks for a record like the Balance Transfer card's. Against those criteria you meet ${met} of ${total} today.${when}`
    const open = l.graduation.filter(g => !g.ok).slice(0, 3)
    const out = [d('ready-card', 'text', text, met === total ? 'pleased' : 'warm', 'explaining')]
    if (open.length) out.push(d('ready-note', 'text', `Still to turn green: ${open.map(g => `${g.label} (${g.when})`).join(', ')}.`, 'neutral', 'none'))
    return out
  }
  return [
    d('ready-other', 'text', `For ${product.label.toLowerCase()}, lenders look at your payment history, how much of your limits you use and how settled you are. I'll check all of that for you.`, 'warm', 'explaining'),
  ]
}
