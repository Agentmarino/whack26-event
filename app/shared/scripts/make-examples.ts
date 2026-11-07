// Regenerates app/shared/examples/ from the REAL engine run on Priya, then validates every example
// against the zod schemas and checks that every message's `ref` resolves. Exits 1 on any problem.
//
//   pnpm --filter shared exec tsx scripts/make-examples.ts
//
// The message builders below are the first cut of the templates in conversation.md.
// 113 can lift them into the backend; the wording rules (40 words, "you", British spelling) are checked here.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as E from '../../backend/engine/index.ts'
import {
  AgentMessage,
  Change,
  CreditReport,
  EngineResult,
  Persona,
  PersonasResponse,
  TurnRequest,
  TurnResponse,
  UploadResult,
  WhatIfRequest,
  WhatIfResponse,
  paperUrlFor,
  resolveRef,
} from '../contract.ts'
import type {
  Emote,
  Expects,
  Gesture,
  MessageKind,
  PlanId,
  Profile,
  Ref,
  Step,
  WhatIfRun,
} from '../contract.ts'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, '..', 'examples')
const DATA = join(here, '..', '..', 'backend', 'data', 'personas')
const SESSION = 'example-priya'
const MAX_WORDS = 40

const readJson = <T>(file: string): T => JSON.parse(readFileSync(join(DATA, file), 'utf8')) as T

// ---------- engine runs ----------
const priya = readJson<Profile>('priya.json')
// The samples split Priya so each upload adds a piece (conversation.md): report, then bank, then letter.
const { bank: _bank, decline: _decline, ...reportPart } = priya
const analysis = E.analyse(priya) // what the backend holds once all three samples are in
const r = analysis.result
const paperUrl = paperUrlFor(SESSION)

// Every sample input must also fit the schema, not only Priya.
const indexed = readJson<Array<Persona & { file: string }>>('index.json')
for (const file of ['priya.json', 'sam.json', 'dan.json', 'mock-credit-report.json', 'mock-report-mei.json']) {
  const input = readJson<Profile | CreditReport>(file)
  const check = EngineResult.safeParse(E.analyse(input))
  if (!check.success) fail(`engine output for ${file} does not match EngineResult:\n${check.error.message}`)
}

// ---------- message helpers ----------
const msg = (id: string, kind: MessageKind, text: string, emote: Emote, gesture: Gesture, ref?: Ref) =>
  AgentMessage.parse({ id, kind, text, emote, gesture, ...(ref ? { ref } : {}), writtenBy: 'template' })

const emoteFor = (rag: 'red' | 'amber' | 'green'): Emote => (rag === 'red' ? 'concerned' : rag === 'amber' ? 'warm' : 'pleased')
const round = (n: number) => E.gbp(Math.round(n))
const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)
const count = (n: number) => ['No', 'One', 'Two', 'Three', 'Four', 'Five'][n] ?? String(n)

const CHIPS = {
  start: ["Let's start"],
  goal: ['A credit card', 'Car finance', 'A mortgage', 'Just build my credit'],
  horizon: ['3 months', '6 months'],
  yesNo: ['Yes', 'No', 'Not sure'],
  canRegister: ['Yes, I can', "No, I can't", 'Not sure'],
  // Only the paydown amount moves the estimate: stopping BNPL and registering to vote are already in the baseline plan.
  whatIfs: ['What if I pay £300 a month?', 'What if I pay £400 a month?', 'What if I stop buy now, pay later?'],
}

const expectsWhatIf: Expects = { kind: 'text', chips: CHIPS.whatIfs, placeholder: 'What if I…', allowVoice: true }

// ---------- the conversation, step by step (Priya, all three samples) ----------
type Turn = {
  key: string
  request: TurnRequest
  step: Step
  messages: AgentMessage[]
  expects: Expects
  hasResult: boolean
  hasPaper: boolean
  whatIf?: WhatIfRun
}
const turns: Turn[] = []
const turn = (t: Turn) => turns.push(t)
const req = (input: TurnRequest['input'], first = false): TurnRequest =>
  TurnRequest.parse({ sessionId: first ? null : SESSION, input, settings: { plainEnglish: false } })

turn({
  key: 'greet',
  request: req({ type: 'start' }, true),
  step: 'greet',
  messages: [
    msg('greet-1', 'text', "Hello, welcome to the Capital One desk. I'll look at your credit the way a lender would, then help you fix what's holding you back.", 'warm', 'wave'),
    msg('greet-2', 'text', "It takes about five minutes. Nothing here is a credit search, so it can't harm your score.", 'neutral', 'none'),
  ],
  expects: { kind: 'choice', chips: CHIPS.start },
  hasResult: false,
  hasPaper: false,
})

turn({
  key: 'ask_report',
  request: req({ type: 'choice', value: "Let's start" }),
  step: 'ask_report',
  messages: [
    msg('ask-report', 'text', 'First, your credit report. Upload it from Experian, Equifax or TransUnion, or use one of our samples.', 'neutral', 'asking'),
  ],
  expects: { kind: 'file', fileKinds: ['credit_report'], optional: true },
  hasResult: false,
  hasPaper: false,
})

turn({
  key: 'ask_bank',
  request: req({ type: 'sample', fileKind: 'credit_report', personaId: 'priya' }),
  step: 'ask_bank',
  messages: [
    msg('ack-report', 'text', `Thanks, ${reportPart.name}. I've got your ${r.bureau} report. Your score there is ${reportPart.score} out of ${r.scaleMax}.`, 'warm', 'receive-document'),
    msg('ask-bank', 'text', 'Next, three months of your bank statement, as a CSV or PDF. It shows me what you can afford each month. You can skip this.', 'neutral', 'asking'),
  ],
  expects: { kind: 'file', fileKinds: ['bank'], optional: true },
  hasResult: false,
  hasPaper: false,
})

turn({
  key: 'ask_letter',
  request: req({ type: 'sample', fileKind: 'bank' }),
  step: 'ask_letter',
  messages: [
    msg('ack-bank', 'text', `Got it. After rent, bills and the basics you have about ${round(r.cash.surplus)} a month left over.`, 'neutral', 'reading'),
    msg('ask-letter', 'text', "Have you been turned down for credit lately? If you've got the letter, hand it over and I'll explain what it means. If not, skip this.", 'neutral', 'asking'),
  ],
  expects: { kind: 'file', fileKinds: ['letter'], optional: true },
  hasResult: false,
  hasPaper: false,
})

const lender = priya.decline?.lender ?? 'the lender'
turn({
  key: 'questions-1',
  request: req({ type: 'sample', fileKind: 'letter' }),
  step: 'questions',
  messages: [
    msg('ack-letter', 'text', `Thanks, that's your ${lender} letter. I'll go through it once I've seen everything.`, 'warm', 'receive-document'),
    msg('q-goal', 'text', 'What are you hoping to get? Pick one, or tell me in your own words.', 'neutral', 'asking'),
  ],
  expects: { kind: 'text', chips: CHIPS.goal, placeholder: 'Or type your own', allowVoice: true },
  hasResult: false,
  hasPaper: false,
})

turn({
  key: 'questions-2',
  request: req({ type: 'choice', value: 'A credit card' }),
  step: 'questions',
  messages: [msg('q-horizon', 'text', 'And how soon? I can plan for the next 3 months or the next 6.', 'neutral', 'asking')],
  expects: { kind: 'choice', chips: CHIPS.horizon },
  hasResult: false,
  hasPaper: false,
})

// Data questions (at most 2), built from the profile. Priya: not on the roll; minimum-only card with no Direct Debit.
const card = priya.cards?.[0]
turn({
  key: 'questions-3',
  request: req({ type: 'choice', value: '3 months' }),
  step: 'questions',
  messages: [
    msg('q-roll', 'text', "Your report says you're not on the electoral roll at your current address. Can you register to vote there?", 'neutral', 'asking'),
  ],
  expects: { kind: 'choice', chips: CHIPS.canRegister },
  hasResult: false,
  hasPaper: false,
})

turn({
  key: 'questions-4',
  request: req({ type: 'choice', value: 'Yes, I can' }),
  step: 'questions',
  messages: [msg('q-dd', 'text', `You pay the minimum on your ${card?.name ?? 'card'} each month. Is that set up as a Direct Debit?`, 'neutral', 'asking')],
  expects: { kind: 'choice', chips: CHIPS.yesNo },
  hasResult: false,
  hasPaper: false,
})

turn({
  key: 'assessing',
  request: req({ type: 'choice', value: 'No' }),
  step: 'assessing',
  messages: [msg('assess-1', 'text', "Thanks, that's everything I need. Give me a moment to go through it all.", 'neutral', 'thinking')],
  expects: { kind: 'none' },
  hasResult: true,
  hasPaper: false,
})

const top3 = r.diagnosis.ranked.slice(0, 3)
const flags = r.diagnosis.flags
turn({
  key: 'diagnosis',
  request: req({ type: 'skip' }),
  step: 'diagnosis',
  messages: [
    msg('diag-headline', 'text', r.headline, 'warm', 'explaining', { on: 'headline' }),
    msg('diag-intro', 'text', `${count(top3.length)} things are holding your score back most. Here they are, worst first.`, 'neutral', 'explaining'),
    ...top3.map(f => msg(`diag-${f.id}`, 'reason', f.reason, emoteFor(f.rag), 'explaining', { on: 'factor', factorId: f.id })),
    ...(flags.length
      ? [msg('diag-flags', 'text', `${count(flags.length)} ${flags.length === 1 ? 'thing' : 'things'} in your spending stand out: ${flags.join(' and ')}.`, 'concerned', 'explaining', { on: 'flags' })]
      : []),
  ],
  expects: { kind: 'choice', chips: analysis.decline ? ['Tell me about the letter'] : ['What can I do?'] },
  hasResult: true,
  hasPaper: false,
})

const d = analysis.decline
if (!d) fail('Priya has no decoded decline; the decline step needs one')
turn({
  key: 'decline',
  request: req({ type: 'choice', value: 'Tell me about the letter' }),
  step: 'decline',
  messages: [
    msg(
      'decline-reasons',
      'decline',
      d.stated === 'No specific reason given'
        ? `About your ${d.lender} letter. It didn't give a reason, so I've worked out the most likely ones from your report.`
        : `About your ${d.lender} letter. It said: "${d.stated}". Here's what most likely sat behind it.`,
      'concerned',
      'explaining',
      { on: 'decline', part: 'reasons' },
    ),
    msg('decline-fix', 'text', `The one fix that matters most: ${lowerFirst(d.fix.title)}. ${d.fix.how}`, 'warm', 'explaining', { on: 'decline', part: 'fix' }),
    msg('decline-reapply', 'text', `Don't apply again before ${d.reapply.when}. ${d.reapply.how}`, 'warm', 'explaining', { on: 'decline', part: 'reapply' }),
    msg('decline-rights', 'text', `You have rights here too. The lender must name the agency it used, and you can see and correct your ${d.agency} report for free.`, 'warm', 'none', { on: 'decline', part: 'rights' }),
  ],
  expects: { kind: 'choice', chips: ['Got it'] },
  hasResult: true,
  hasPaper: false,
})

turn({
  key: 'paper',
  request: req({ type: 'choice', value: 'Got it' }),
  step: 'paper',
  messages: [msg('paper-1', 'paper', "Here's all of that on one sheet. Tap it to read it, or take a copy with you.", 'pleased', 'slide-paper', { on: 'paper' })],
  expects: { kind: 'choice', chips: ['Make me a plan'] },
  hasResult: true,
  hasPaper: true,
})

turn({
  key: 'coach-choose',
  request: req({ type: 'choice', value: 'Make me a plan' }),
  step: 'coach',
  messages: [msg('coach-choose', 'text', "Right, let's make you a plan. You said 3 months. Shall we stick with that, or go for 6?", 'warm', 'coach')],
  expects: { kind: 'choice', chips: CHIPS.horizon },
  hasResult: true,
  hasPaper: true,
})

const planMessages = (plan: PlanId): AgentMessage[] => {
  const p = r.plans[plan]
  const end = p.projection.at(-1)
  if (!end) fail(`plan ${plan} has no projection`)
  const ladder = r.ladder
  const months = plan === '3m' ? 3 : 6
  return [
    msg(`plan-${plan}-intro`, 'text', `Here's your ${months}-month plan: ${p.steps.length} steps, week by week. Tap any step to see why it's there.`, 'warm', 'coach'),
    ...p.steps.map((s, i) =>
      msg(`plan-${plan}-step-${i}`, 'step', `${E.fmtDate(s.date)}: ${s.title}.`, 'neutral', 'explaining', { on: 'step', plan, stepIndex: i }),
    ),
    msg(
      `plan-${plan}-projection`,
      'projection',
      `If you stick to it, your ${r.bureau} score could be ${end.low} to ${end.high} by ${E.fmtMonth(end.date)}. That's an estimate, not a promise.`,
      'pleased',
      'explaining',
      { on: 'projection', plan },
    ),
    ...(ladder
      ? [
          msg(
            `plan-${plan}-ladder`,
            'ladder',
            ladder.entry && ladder.applyFrom
              ? `When you're ready for a new card, start with the ${ladder.entry.name}, from ${E.fmtMonth(ladder.applyFrom)}. Check with QuickCheck first: it won't leave a mark.`
              : ladder.reason,
            'warm',
            'explaining',
            { on: 'ladder' },
          ),
        ]
      : []),
    msg(`plan-${plan}-whatif`, 'text', 'Now ask me anything that starts with "what if". For example: what if I pay £300 a month?', 'warm', 'coach'),
  ]
}

for (const plan of ['3m', '6m'] as const) {
  turn({
    key: `coach-plan-${plan}`,
    request: req({ type: 'choice', value: plan === '3m' ? '3 months' : '6 months' }),
    step: 'coach',
    messages: planMessages(plan),
    expects: expectsWhatIf,
    hasResult: true,
    hasPaper: true,
  })
}

// Free-text what-if in the chat (113 turns the text into changes with Claude; here we know them).
const whatIfText = 'What if I pay £300 a month?'
const whatIfChanges: Change[] = [{ lever: 'paydown', value: 300 }]
const wi: WhatIfRun = { id: 'wi-1', text: whatIfText, changes: whatIfChanges, output: E.whatIf(priya, whatIfChanges) }
const whatIfMessage = (id: string, lead: string, run: WhatIfRun) => {
  const { before: b, after: a, delta } = run.output
  const end = r.plans['3m'].projection.at(-1)
  const by = end ? E.fmtMonth(end.date) : 'the end of the plan'
  const up = delta.m3.high > 0 || delta.m3.low > 0
  const under30 = run.output.because.under30
  const tail = under30?.after ? ` You'd get under 30% by ${under30.after}.` : ''
  // No change or a drop means the lever is already in the baseline plan (engine behaviour, see 112 RESULT):
  // say so instead of showing a lower number.
  return msg(
    id,
    'whatif',
    up
      ? `${lead}: by ${by} your score could be ${a.m3.low} to ${a.m3.high}, up from ${b.m3.low} to ${b.m3.high}. An estimate.${tail}`
      : `${lead}: that's already part of your plan, so your estimate stays at ${b.m3.low} to ${b.m3.high} by ${by}.`,
    up ? 'pleased' : 'neutral',
    'explaining',
    { on: 'whatif', whatIfId: run.id },
  )
}
turn({
  key: 'coach-whatif',
  request: req({ type: 'text', value: whatIfText }),
  step: 'coach',
  messages: [whatIfMessage('whatif-1', 'Paying £300 extra a month', wi)],
  expects: expectsWhatIf,
  hasResult: true,
  hasPaper: true,
  whatIf: wi,
})

// ---------- build, validate, write ----------
const problems: string[] = []
const toResponse = (t: Turn): TurnResponse =>
  ({
    sessionId: SESSION,
    step: t.step,
    messages: t.messages,
    expects: t.expects,
    result: t.hasResult ? analysis : null,
    paperUrl: t.hasPaper ? paperUrl : null,
    ...(t.whatIf ? { whatIf: t.whatIf } : {}),
  }) satisfies TurnResponse

function checkMessages(where: string, messages: AgentMessage[], result: EngineResult | null, whatIfs: Record<string, WhatIfRun>, paper: string | null) {
  for (const m of messages) {
    const words = m.text.trim().split(/\s+/).length
    if (words > MAX_WORDS) problems.push(`${where} ${m.id}: ${words} words (max ${MAX_WORDS}): ${m.text}`)
    if (/\b(color|favor|realize|organize|center|program)\b/i.test(m.text)) problems.push(`${where} ${m.id}: American spelling: ${m.text}`)
    if (m.ref && !resolveRef(m.ref, result, { whatIfs, paperUrl: paper })) problems.push(`${where} ${m.id}: ref ${JSON.stringify(m.ref)} does not resolve`)
  }
}

const responses = turns.map(t => {
  const response = toResponse(t)
  const parsed = TurnResponse.safeParse(response)
  if (!parsed.success) problems.push(`${t.key}: not a TurnResponse:\n${parsed.error.message}`)
  checkMessages(t.key, response.messages, response.result, t.whatIf ? { [t.whatIf.id]: t.whatIf } : {}, response.paperUrl)
  return { turn: t, response }
})

// Letter handed over in the middle of the questions: one acknowledgement, step and expects unchanged.
const q2 = turns.find(t => t.key === 'questions-2')!
const letterAck: TurnResponse = {
  sessionId: SESSION,
  step: 'questions',
  messages: [msg('ack-letter-file', 'text', `Thanks, that's a letter from ${lender}. I'll go through it after your results.`, 'warm', 'receive-document')],
  expects: q2.expects,
  result: null,
  paperUrl: null,
}
const letterAckRequest = req({ type: 'file', fileKind: 'letter', fileId: 'up-letter-1' })
if (!TurnResponse.safeParse(letterAck).success) problems.push('letter-ack: not a TurnResponse')
checkMessages('letter-ack', letterAck.messages, null, {}, null)

// Sliders sheet: POST /api/whatif with changes.
const sliderChanges: Change[] = [{ lever: 'paydown', value: 400 }, { lever: 'stop', what: 'bnpl' }]
const sliderRequest = WhatIfRequest.parse({ sessionId: SESSION, changes: sliderChanges })
const sliderRun: WhatIfRun = { id: 'wi-2', text: null, changes: sliderChanges, output: E.whatIf(priya, sliderChanges) }
const whatIfResponse: WhatIfResponse = {
  sessionId: SESSION,
  messages: [whatIfMessage('whatif-2', 'Paying £400 a month and stopping buy now, pay later', sliderRun)],
  whatIf: sliderRun,
}
if (!WhatIfResponse.safeParse(whatIfResponse).success) problems.push('whatif: not a WhatIfResponse')
checkMessages('whatif', whatIfResponse.messages, analysis, { [sliderRun.id]: sliderRun }, null)

// Upload: Alex's report file through the engine's parser.
const alexReport = CreditReport.parse(readJson('mock-credit-report.json'))
const upload: UploadResult = {
  ok: true,
  fileId: 'up-report-1',
  fileKind: 'credit_report',
  fileName: 'experian-report.json',
  findings: E.parseReport(alexReport).found.report,
  error: null,
}
const uploadError: UploadResult = {
  ok: false,
  fileId: null,
  fileKind: 'credit_report',
  fileName: 'holiday-photo.jpg',
  findings: [],
  error: "I couldn't read that one. Is it your credit report? You can try the sample instead.",
}
for (const u of [upload, uploadError]) if (!UploadResult.safeParse(u).success) problems.push(`upload ${u.fileName}: not an UploadResult`)

const personas = PersonasResponse.parse(indexed.map(({ id, name, blurb }) => ({ id, name, blurb })))

if (problems.length) fail(`${problems.length} problem(s):\n- ${problems.join('\n- ')}`)

// Write. JSON files for people and tests; bundle.ts (result stored once) for mockTurn.
rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, 'turns'), { recursive: true })
const write = (file: string, data: unknown) => writeFileSync(join(OUT, file), JSON.stringify(data, null, 2) + '\n')

const walk: Array<{ file: string; request: TurnRequest }> = []
responses.forEach(({ turn: t, response }, i) => {
  const file = `turns/${String(i + 1).padStart(2, '0')}-${t.key}.json`
  write(file, response)
  walk.push({ file, request: t.request })
})
write('turns/letter-ack.json', letterAck)
write('walk.json', { note: 'The request that produced each turn example, in order. Priya, all three samples, 3-month plan.', walk, letterAck: { file: 'turns/letter-ack.json', request: letterAckRequest } })
write('whatif.json', { request: sliderRequest, response: whatIfResponse })
write('upload.json', { request: { multipart: { file: '<experian-report.json>', fileKind: 'credit_report', sessionId: SESSION } }, response: upload, errorResponse: uploadError })
write('personas.json', personas)
write('engine-result-priya.json', analysis)

const strip = (res: TurnResponse) => ({ ...res, result: null })
const bundle = {
  sessionId: SESSION,
  result: analysis,
  turns: Object.fromEntries(responses.map(({ turn: t, response }) => [t.key, { hasResult: t.hasResult, response: strip(response) }])),
  letterAck,
  whatIfResponse,
  upload,
  uploadError,
  personas,
}
writeFileSync(
  join(OUT, 'bundle.ts'),
  `// GENERATED by scripts/make-examples.ts from the real engine on Priya. Do not edit; re-run the script.\n` +
    `// mock-conversation.ts validates this with zod on first use.\n` +
    `export const bundle: unknown = ${JSON.stringify(bundle)}\n`,
)

for (const { turn: t, response } of responses) console.log(`${t.key.padEnd(14)} step=${response.step.padEnd(10)} ${response.messages.length} messages`)
console.log(`letter-ack     step=questions  ${letterAck.messages.length} message (step unchanged)`)
console.log(`whatif         ${whatIfResponse.messages.length} message, after 3m ${sliderRun.output.after.m3.low}-${sliderRun.output.after.m3.high}`)
console.log(`upload         ${upload.findings.length} findings; personas ${personas.map(p => p.id).join(', ')}`)
console.log(`OK: ${responses.length + 1} turn examples written to app/shared/examples/, all valid, all refs resolve`)

function fail(message: string): never {
  console.error(`make-examples FAILED: ${message}`)
  process.exit(1)
}
