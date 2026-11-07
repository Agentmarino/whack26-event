// What the agent says, as templates over the engine's data (conversation.md). Every number in a
// template comes straight from the engine result. Claude may reword some of these later (block 3);
// these are always the fallback. At most 40 words a message, "you", British spelling.

import type { Change, DeclineDecoded, EngineResult, EngineWhatIf, Emote, Expects, Gesture, MessageKind, PlanId, Ref, Rag, WhatIfRun } from 'shared'
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

export const assessing = (): Draft =>
  d('assess-1', 'text', "Thanks, that's everything I need. Give me a moment to go through it all.", 'neutral', 'thinking')

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
export const diagnosisExpects = (res: EngineResult): Expects => ({
  kind: 'choice',
  chips: res.decline ? ['Tell me about the letter'] : ['What can I do?'],
})

export function decline(dd: DeclineDecoded): Draft[] {
  return [
    d(
      'decline-reasons',
      'decline',
      dd.stated === 'No specific reason given'
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
