// Regenerates app/shared/examples/ by driving the REAL backend (app/backend, template wording, offline)
// through each 115 branch on its persona, then validates every response against the zod schemas,
// checks every message (40 words, British spelling, refs resolve, ids unique per session) and writes
// the bundle mockTurn replays. Exits 1 on any problem.
//
//   pnpm --filter shared exec tsx scripts/make-examples.ts
//
// declined: Priya with her letter · report: Priya · prepare: Priya aiming for the Classic · new: Mei Lin.
// Each branch walk runs from `start` to the plan, then both plans and two what-ifs.

process.env.DEMO_OFFLINE = 'true' // never call Claude here; what-ifs use the keyword reader

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as E from '../../backend/engine/index.ts'
import { buildApp } from '../../backend/src/app.ts'
import { templateWording } from '../../backend/src/messages.ts'
import { CreditReport, EngineResult, PersonasResponse, TurnResponse, UploadResult, WhatIfResponse, resolveRef } from '../contract.ts'
import type { AgentMessage, Branch, Persona, Profile, TurnInput, WhatIfRun } from '../contract.ts'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, '..', 'examples')
const DATA = join(here, '..', '..', 'backend', 'data', 'personas')
const MAX_WORDS = 40
const readJson = <T>(file: string): T => JSON.parse(readFileSync(join(DATA, file), 'utf8')) as T
const problems: string[] = []

// ---------- every sample input fits the schema, and two engine branches the samples never reach ----------
const indexed = readJson<Array<Persona & { file: string }>>('index.json')
for (const file of ['priya.json', 'sam.json', 'dan.json', 'mock-credit-report.json', 'mock-report-mei.json']) {
  const check = EngineResult.safeParse(E.analyse(readJson<Profile | CreditReport>(file)))
  if (!check.success) fail(`engine output for ${file} does not match EngineResult:\n${check.error.message}`)
}
const edgeCases: Array<[string, Profile | CreditReport]> = [
  ['balance-transfer branch', { age: 30, grossIncome: 30000, cards: [{ name: 'Old card', limit: 5000, balance: 1000, apr: 34.9, hasDD: true, openedYears: 4 }], loans: [{ name: 'Car finance', monthly: 150, openedYears: 3 }], searches: [], electoralRoll: true }],
  ['letter without agency', (() => {
    const rep = readJson<CreditReport & { declineLetters: Array<{ text: string }> }>('mock-credit-report.json')
    rep.declineLetters = rep.declineLetters.map(l => ({ ...l, text: 'We are unable to offer you a card at this time.' }))
    return rep
  })()],
]
for (const [label, input] of edgeCases) {
  const check = EngineResult.safeParse(E.analyse(input))
  if (!check.success) fail(`engine output for ${label} does not match EngineResult:\n${check.error.message}`)
}

// ---------- the backend ----------
const app = await buildApp({ wording: templateWording })

type Rec = { request: { sessionId: string | null; input: TurnInput }; response: TurnResponse }

/** One conversation: every response is checked as it comes in. */
function session(label: string) {
  let sessionId: string | null = null
  const ids = new Set<string>()
  const whatIfs: Record<string, WhatIfRun> = {}
  const send = async (input: TurnInput): Promise<Rec> => {
    const request = { sessionId, input }
    const res = await app.inject({ method: 'POST', url: '/api/turn', payload: request })
    if (res.statusCode !== 200) fail(`${label}: ${JSON.stringify(input)} → HTTP ${res.statusCode} ${res.body}`)
    const parsed = TurnResponse.safeParse(res.json())
    if (!parsed.success) fail(`${label}: ${JSON.stringify(input)} → not a TurnResponse:\n${parsed.error.message}`)
    const response = parsed.data
    sessionId = response.sessionId
    if (response.whatIf) whatIfs[response.whatIf.id] = response.whatIf
    check(`${label} ${response.step}`, response.messages, response.result, whatIfs, response.paperUrl, ids)
    return { request, response }
  }
  return { send, get sessionId() { return sessionId! }, whatIfs, ids }
}

function check(where: string, messages: AgentMessage[], result: EngineResult | null, whatIfs: Record<string, WhatIfRun>, paper: string | null, ids?: Set<string>) {
  for (const m of messages) {
    const words = m.text.trim().split(/\s+/).length
    if (words > MAX_WORDS) problems.push(`${where} ${m.id}: ${words} words (max ${MAX_WORDS}): ${m.text}`)
    if (/\b(color|favor|realize|organize|center|program)\b/i.test(m.text)) problems.push(`${where} ${m.id}: American spelling: ${m.text}`)
    if (m.ref && !resolveRef(m.ref, result, { whatIfs, paperUrl: paper })) problems.push(`${where} ${m.id}: ref ${JSON.stringify(m.ref)} does not resolve`)
    if (m.kind !== 'text' && m.kind !== 'card' && !m.ref) problems.push(`${where} ${m.id}: a ${m.kind} message needs a ref`)
    if (ids) {
      if (ids.has(m.id)) problems.push(`${where}: duplicate message id ${m.id}`)
      ids.add(m.id)
    }
  }
}

const choice = (value: string): TurnInput => ({ type: 'choice', value })
const OPENING: Record<Branch, string> = {
  declined: "I've been declined already",
  report: "I've got a credit report I want help with",
  prepare: 'I want to get ready before I apply',
  new: "I'm new to credit or new to the UK",
}

/** The scripted start of each branch; after it, every question gets its first chip, every upload is skipped. */
const SCRIPTS: Record<Branch, { persona: string; inputs: TurnInput[] }> = {
  declined: {
    persona: 'priya',
    inputs: [
      { type: 'sample', fileKind: 'letter', personaId: 'priya' },
      { type: 'sample', fileKind: 'credit_report' },
      { type: 'sample', fileKind: 'bank' },
      choice('What can I do?'),
      choice('The Balance Transfer card'),
      choice('3 months'),
      choice('Yes, I can'),
      choice('No'),
    ],
  },
  report: {
    persona: 'priya',
    inputs: [{ type: 'sample', fileKind: 'credit_report', personaId: 'priya' }, { type: 'sample', fileKind: 'bank' }, choice('Yes, I can'), choice('No'), choice('A specific card'), choice('Capital One Classic'), choice('3 months')],
  },
  prepare: {
    persona: 'priya',
    inputs: [choice('Capital One Classic'), { type: 'sample', fileKind: 'credit_report', personaId: 'priya' }, { type: 'sample', fileKind: 'bank' }, choice('The Classic card'), choice('3 months'), choice('Yes, I can'), choice('No')],
  },
  new: {
    persona: 'mei',
    inputs: [choice("I'm new to the UK"), choice('Under 6 months'), choice('Under 6 months'), { type: 'sample', fileKind: 'credit_report', personaId: 'mei' }, { type: 'skip' }],
  },
}

const isCoachChoose = (r: TurnResponse) => r.step === 'coach' && r.messages[0]?.id === 'coach-choose'

async function walkBranch(branch: Branch) {
  const c = session(branch)
  const intro = await c.send({ type: 'start' })
  const opening = await c.send(choice('Nice to meet you, Cap!'))
  const turns: Rec[] = [await c.send(choice(OPENING[branch]))]
  if (turns[0]!.response.branch !== branch) fail(`${branch}: the opening chip gave branch ${turns[0]!.response.branch}`)
  for (const input of SCRIPTS[branch].inputs) turns.push(await c.send(input))
  const typed = ['31', 'about 28k', 'yes']
  for (let i = 0; !isCoachChoose(turns.at(-1)!.response) && i < 30; i++) {
    const r = turns.at(-1)!.response
    const e = r.expects
    turns.push(await c.send(e.kind === 'file' || e.kind === 'none' ? { type: 'skip' } : e.chips?.length ? choice(e.chips[0]!) : { type: 'text', value: typed.shift() ?? 'yes' }))
  }
  if (!isCoachChoose(turns.at(-1)!.response)) fail(`${branch}: never reached the plan choice`)
  const plan3m = await c.send(choice('3 months'))
  const plan6m = await c.send(choice('6 months'))
  const paydown = await c.send(choice('What if I pay £300 a month?'))
  const chips = plan6m.response.expects.chips ?? []
  const bnpl = chips.includes('What if I stop buy now, pay later?') ? await c.send(choice('What if I stop buy now, pay later?')) : null
  for (const r of [paydown, bnpl]) if (r && r.response.messages[0]?.kind !== 'whatif') fail(`${branch}: a what-if chip did not give a what-if`)
  return { persona: SCRIPTS[branch].persona, intro, opening, turns, coach: { plan3m, plan6m, whatIfs: { paydown, bnpl } }, session: c }
}

const branches = {} as Record<Branch, Awaited<ReturnType<typeof walkBranch>>>
for (const b of ['declined', 'report', 'prepare', 'new'] as const) branches[b] = await walkBranch(b)

// A letter handed over in the middle of the questions (report branch): one acknowledgement, step unchanged.
const la = session('letter-ack')
await la.send({ type: 'start' })
await la.send(choice('Nice to meet you, Cap!'))
await la.send(choice(OPENING.report))
await la.send({ type: 'sample', fileKind: 'credit_report', personaId: 'priya' })
const beforeAck = await la.send({ type: 'sample', fileKind: 'bank' })
const letterAck = await la.send({ type: 'sample', fileKind: 'letter' })
if (letterAck.response.step !== beforeAck.response.step || letterAck.response.messages.length !== 1) problems.push('letter-ack: the step changed or more than one message')

// The sliders sheet: POST /api/whatif with changes, on the declined session.
const d = branches.declined.session
const slider = await app.inject({ method: 'POST', url: '/api/whatif', payload: { sessionId: d.sessionId, changes: [{ lever: 'paydown', value: 400 }, { lever: 'stop', what: 'bnpl' }] } })
const whatIfParsed = WhatIfResponse.safeParse(slider.json())
if (!whatIfParsed.success) fail(`whatif: not a WhatIfResponse:\n${whatIfParsed.error.message}`)
const whatIfResponse = whatIfParsed.data
const declinedFinal = branches.declined.coach.plan3m.response.result!
check('whatif', whatIfResponse.messages, declinedFinal, { [whatIfResponse.whatIf.id]: whatIfResponse.whatIf }, null)

// Upload: Alex's report file through the engine's parser (the shape POST /api/upload answers with).
const alexReport = CreditReport.parse(readJson('mock-credit-report.json'))
const upload: UploadResult = { ok: true, fileId: 'up-report-1', fileKind: 'credit_report', fileName: 'experian-report.json', findings: E.parseReport(alexReport).found.report, error: null }
const uploadError: UploadResult = { ok: false, fileId: null, fileKind: 'credit_report', fileName: 'holiday-photo.jpg', findings: [], error: "I couldn't read that one. Is it your credit report? You can try the sample instead." }
for (const u of [upload, uploadError]) if (!UploadResult.safeParse(u).success) problems.push(`upload ${u.fileName}: not an UploadResult`)
const personas = PersonasResponse.parse(indexed.map(({ id, name, blurb }) => ({ id, name, blurb })))

await app.close()
if (problems.length) fail(`${problems.length} problem(s):\n- ${problems.join('\n- ')}`)

// ---------- write ----------
// Results are big and repeat across turns: each is stored once by key; responses carry `resultKey`.
const results: Record<string, EngineResult> = {}
const keyOf = new Map<string, string>()
function store(rec: Rec) {
  const { result, ...rest } = rec.response
  let resultKey: string | null = null
  if (result) {
    const json = JSON.stringify(result)
    resultKey = keyOf.get(json) ?? `r${keyOf.size + 1}`
    if (!keyOf.has(json)) {
      keyOf.set(json, resultKey)
      results[resultKey] = result
    }
  }
  return { request: rec.request, resultKey, response: { ...rest, result: null } }
}
const strip = ({ request: _r, ...s }: ReturnType<typeof store>) => s

rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, 'branches'), { recursive: true })
const write = (file: string, data: unknown) => writeFileSync(join(OUT, file), JSON.stringify(data, null, 2) + '\n')

const bundleBranches = {} as Record<Branch, unknown>
for (const [b, w] of Object.entries(branches) as Array<[Branch, (typeof branches)[Branch]]>) {
  const turns = w.turns.map(store)
  const coach = { plan3m: store(w.coach.plan3m), plan6m: store(w.coach.plan6m), whatIfs: { paydown: store(w.coach.whatIfs.paydown), bnpl: w.coach.whatIfs.bnpl ? store(w.coach.whatIfs.bnpl) : null } }
  const used = new Set([...turns, coach.plan3m, coach.plan6m, coach.whatIfs.paydown, ...(coach.whatIfs.bnpl ? [coach.whatIfs.bnpl] : [])].map(t => t.resultKey).filter(Boolean) as string[])
  write(`branches/${b}.json`, {
    note: `115 ${b} branch on ${w.persona}: the request behind each turn and the real backend response (template wording). result is stored once under results, by resultKey.`,
    persona: w.persona,
    walk: turns,
    coach,
    results: Object.fromEntries([...used].map(k => [k, results[k]])),
  })
  bundleBranches[b] = { persona: w.persona, turns: turns.map(strip), coach: { plan3m: strip(coach.plan3m), plan6m: strip(coach.plan6m), whatIfs: { paydown: strip(coach.whatIfs.paydown), bnpl: coach.whatIfs.bnpl ? strip(coach.whatIfs.bnpl) : null } } }
}
const intro = store(branches.declined.intro)
const opening = store(branches.declined.opening)
write('intro.json', { start: intro, opening })
write('letter-ack.json', store(letterAck))
write('whatif.json', { request: { sessionId: 'example', changes: whatIfResponse.whatIf.changes }, response: whatIfResponse })
write('upload.json', { request: { multipart: { file: '<experian-report.json>', fileKind: 'credit_report', sessionId: 'example' } }, response: upload, errorResponse: uploadError })
write('personas.json', personas)
write('engine-result-priya.json', declinedFinal)
write('walk.json', {
  note: '115: each branch walk is in branches/<branch>.json (requests and responses in order). intro.json holds the first two turns, shared by every branch.',
  branches: Object.fromEntries(Object.entries(branches).map(([b, w]) => [b, { persona: w.persona, steps: w.turns.map(t => t.response.step) }])),
})

const bundle = {
  sessionId: 'example',
  results,
  intro: strip(intro),
  opening: strip(opening),
  branches: bundleBranches,
  letterAck: strip(store(letterAck)),
  whatIfResponse,
  upload,
  uploadError,
  personas,
}
writeFileSync(
  join(OUT, 'bundle.ts'),
  `// GENERATED by scripts/make-examples.ts from the real backend (template wording). Do not edit; re-run the script.\n` +
    `// mock-conversation.ts validates this with zod on first use.\n` +
    `export const bundle: unknown = ${JSON.stringify(bundle)}\n`,
)

for (const [b, w] of Object.entries(branches)) console.log(`${b.padEnd(9)} ${w.persona.padEnd(6)} ${w.turns.length} turns: ${w.turns.map(t => t.response.step).join(' → ')}`)
console.log(`results stored once: ${Object.keys(results).length}; letter ack, slider what-if, upload, personas`)
console.log('OK: every response valid, every ref resolves, every message 40 words or fewer, ids unique per session')

function fail(message: string): never {
  console.error(`make-examples FAILED: ${message}`)
  process.exit(1)
}
