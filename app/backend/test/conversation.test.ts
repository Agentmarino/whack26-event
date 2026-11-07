// Block 1: the conversation on the personas, through the real HTTP routes (fastify.inject).

import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PersonasResponse, TurnResponse, WhatIfResponse, resolveRef } from 'shared'
import type { TurnInput, WhatIfRun } from 'shared'
import { buildApp } from '../src/app.ts'
import { templateWording } from '../src/messages.ts'
import { MAX_WORDS, wordCount } from '../src/templates.ts'

let app: FastifyInstance
beforeAll(async () => {
  app = await buildApp({ wording: templateWording })
})
afterAll(async () => {
  await app.close()
})

/** A conversation driver: every response is checked against the contract and every ref must resolve. */
function chat() {
  let sessionId: string | null = null
  const whatIfs: Record<string, WhatIfRun> = {}
  const steps: string[] = []
  const ids = new Set<string>()
  const send = async (input: TurnInput, settings?: { plainEnglish: boolean }) => {
    const res = await app.inject({ method: 'POST', url: '/api/turn', payload: { sessionId, input, ...(settings ? { settings } : {}) } })
    expect(res.statusCode, res.body).toBe(200)
    const body = TurnResponse.parse(res.json())
    sessionId = body.sessionId
    steps.push(body.step)
    if (body.whatIf) whatIfs[body.whatIf.id] = body.whatIf
    for (const m of body.messages) {
      expect(ids.has(m.id), `duplicate message id ${m.id}`).toBe(false)
      ids.add(m.id)
      expect(wordCount(m.text), `${m.id}: ${m.text}`).toBeLessThanOrEqual(MAX_WORDS)
      if (m.ref) expect(resolveRef(m.ref, body.result, { whatIfs, paperUrl: body.paperUrl }), `${m.id} ref ${JSON.stringify(m.ref)}`).not.toBeNull()
    }
    return body
  }
  return { send, steps, get sessionId() { return sessionId! }, whatIfs }
}

describe('routes', () => {
  it('health and personas', async () => {
    expect((await app.inject('/api/health')).json()).toEqual({ ok: true })
    const personas = PersonasResponse.parse((await app.inject('/api/personas')).json())
    expect(personas.map(p => p.id)).toEqual(['priya', 'mei', 'alex'])
  })

  it('errors are {error: string}', async () => {
    for (const res of [
      await app.inject({ method: 'POST', url: '/api/turn', payload: { nope: 1 } }),
      await app.inject({ method: 'POST', url: '/api/turn', payload: { sessionId: 'missing', input: { type: 'skip' } } }),
      await app.inject('/api/nothing-here'),
      await app.inject('/api/paper/missing.pdf'),
    ]) {
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
      expect(typeof res.json().error).toBe('string')
    }
  })
})

const OPEN = {
  declined: "I've been declined already",
  report: "I've got a credit report I want help with",
  prepare: 'I want to get ready before I apply',
  new: "I'm new to credit or new to the UK",
} as const

/** 115: Cap's card, then the opening chip for a branch. Returns the branch's first response. */
async function begin(c: ReturnType<typeof chat>, branch: keyof typeof OPEN) {
  const intro = await c.send({ type: 'start' })
  expect(intro.step).toBe('intro')
  const opening = await c.send({ type: 'choice', value: 'Nice to meet you, Cap!' })
  expect(opening.step).toBe('opening')
  expect(opening.expects.chips).toEqual(Object.values(OPEN))
  const first = await c.send({ type: 'choice', value: OPEN[branch] })
  expect(first.branch).toBe(branch)
  return first
}

/** Answer every question and goals turn with its first chip (or typed text). */
async function answerAll(c: ReturnType<typeof chat>, r: TurnResponse, typed = ['31', 'about 28k']) {
  while (r.step === 'questions' || r.step === 'goals')
    r = await c.send(r.expects.chips?.length ? { type: 'choice', value: r.expects.chips[0]! } : { type: 'text', value: typed.shift() ?? 'yes' })
  return r
}

/** From `assessing` to the plan, through whatever the branch shows on the way. */
async function toPlan(c: ReturnType<typeof chat>, r: TurnResponse) {
  expect(r.step).toBe('assessing')
  r = await c.send({ type: 'skip' })
  expect(r.step).toBe('diagnosis')
  expect(r.messages.filter(m => m.kind === 'reason')).toHaveLength(3)
  for (let i = 0; r.step !== 'coach' && i < 5; i++) r = await c.send({ type: 'choice', value: r.expects.chips![0]! })
  expect(r.step).toBe('coach')
  r = await c.send({ type: 'choice', value: '3 months' })
  expect(r.messages.some(m => m.kind === 'projection')).toBe(true)
  return r
}

describe('115: intro and opening', () => {
  it("Cap slides his card, then asks where to start", async () => {
    const c = chat()
    const intro = await c.send({ type: 'start' })
    expect(intro.step).toBe('intro')
    expect(intro.branch).toBeNull()
    expect(intro.messages.map(m => [m.kind, m.gesture, m.text])).toEqual([
      ['text', 'slide-card', "Hi, nice to meet you. My name's Cap, here's my card."],
      ['card', 'none', 'Cap, Credit Coach. Here to make your credit make sense.'],
    ])
    expect(intro.messages[1]!.ref).toBeUndefined()
    expect(intro.expects).toEqual({ kind: 'choice', chips: ['Nice to meet you, Cap!'] })
    const opening = await c.send({ type: 'choice', value: 'Nice to meet you, Cap!' })
    expect(opening.messages.at(-1)!.text).toBe("I understand you're here to make your credit better. Where should we start?")
    const again = await c.send({ type: 'text', value: 'banana' })
    expect(again.step).toBe('opening')
    expect(again.messages[0]!.text).toMatch(/Which of these is closest/)
    const words = await c.send({ type: 'text', value: 'I got turned down for a card' })
    expect(words.branch).toBe('declined')
  })

  it('a letter dropped at the opening picks the declined branch', async () => {
    const c = chat()
    await c.send({ type: 'start' })
    await c.send({ type: 'choice', value: 'Nice to meet you, Cap!' })
    const r = await c.send({ type: 'sample', fileKind: 'letter', personaId: 'priya' })
    expect(r.branch).toBe('declined')
    expect(r.step).toBe('ask_report')
    expect(r.messages.map(m => m.text)).toContain("Thanks, that's your Capital One letter. I'll go through it once I've seen everything.")
  })
})

describe('115: each branch from intro to coach', () => {
  it('declined, Priya with her letter: decline first, then the first steps, then goals, then the advice', async () => {
    const c = chat()
    const ask = await begin(c, 'declined')
    expect(ask.step).toBe('ask_letter')
    expect(ask.messages.map(m => m.id)).toEqual(['branch-ack', 'ask-letter'])
    const report = await c.send({ type: 'sample', fileKind: 'letter', personaId: 'priya' })
    expect(report.step).toBe('ask_report')
    expect(report.messages.at(-1)!.text).toMatch(/what the lender saw/)
    const bank = await c.send({ type: 'sample', fileKind: 'credit_report' })
    expect(bank.step).toBe('ask_bank')
    const decline = await c.send({ type: 'sample', fileKind: 'bank' })
    expect(decline.step).toBe('decline')
    expect(decline.result).not.toBeNull()
    expect(decline.messages.filter(m => m.ref?.on === 'decline').map(m => m.ref)).toEqual([
      { on: 'decline', part: 'reasons' },
      { on: 'decline', part: 'fix' },
      { on: 'decline', part: 'reapply' },
      { on: 'decline', part: 'rights' },
    ])
    expect(decline.expects.chips).toEqual(['What can I do?'])
    const goals = await c.send({ type: 'choice', value: 'What can I do?' })
    expect(goals.step).toBe('goals')
    const improve = goals.messages.filter(m => m.id.startsWith('improve-') && m.id !== 'improve-intro')
    expect(improve.length).toBeGreaterThanOrEqual(1)
    expect(improve.length).toBeLessThanOrEqual(3)
    for (const m of improve) expect(m.ref).toBeUndefined() // lines, not cards: the plan is run again after goals
    expect(goals.expects.chips?.[0]).toBe('The Balance Transfer card')
    const horizon = await c.send({ type: 'choice', value: 'The Balance Transfer card' })
    expect(horizon.expects.chips).toEqual(['3 months', '6 months'])
    let r = await c.send({ type: 'choice', value: '3 months' })
    r = await answerAll(c, r)
    expect(r.messages.at(-1)!.text).toMatch(/towards the Balance Transfer card/)
    expect(r.result?.profile.goal).toBe('card')
    r = await c.send({ type: 'skip' })
    expect(r.expects.chips).toEqual(['Sum it up for me']) // the decline was already explained
    expect(c.steps.filter(x => x === 'decline')).toHaveLength(1)
    r = await c.send({ type: 'choice', value: 'Sum it up for me' })
    expect(r.step).toBe('paper')
    expect(c.steps.slice(0, 7)).toEqual(['intro', 'opening', 'ask_letter', 'ask_report', 'ask_bank', 'decline', 'goals'])
  })

  it('declined without the letter: who and what for stand in for it', async () => {
    const c = chat()
    await begin(c, 'declined')
    const who = await c.send({ type: 'skip' })
    expect(who.step).toBe('questions')
    expect(who.expects.chips).toEqual(['Capital One', 'Another lender'])
    const what = await c.send({ type: 'choice', value: 'Capital One' })
    expect(what.expects.chips).toContain('A Balance Transfer card')
    await c.send({ type: 'choice', value: 'A Balance Transfer card' })
    await c.send({ type: 'sample', fileKind: 'credit_report', personaId: 'priya' })
    const decline = await c.send({ type: 'sample', fileKind: 'bank' })
    expect(decline.step).toBe('decline')
    expect(decline.messages.find(m => m.id === 'decline-reasons')!.text).toBe(
      "About your application to Capital One for the Balance Transfer card. Without the letter, here's what most likely sat behind the no.",
    )
    expect(decline.result?.decline?.lender).toBe('Capital One')
  })

  it('report, Priya: report, bank, the questions, then goals, then the advice; a letter at any step', async () => {
    const c = chat()
    const askReport = await begin(c, 'report')
    expect(askReport.step).toBe('ask_report')
    expect(askReport.expects).toMatchObject({ kind: 'file', fileKinds: ['credit_report'], optional: true })
    const askBank = await c.send({ type: 'sample', fileKind: 'credit_report', personaId: 'priya' })
    expect(askBank.messages[0]!.text).toBe("Thanks, Priya. I've got your Experian report. Your score there is 700 out of 999.")
    const roll = await c.send({ type: 'sample', fileKind: 'bank' })
    expect(roll.messages[0]!.text).toMatch(/about £\d+ a month left over/)
    expect(roll.messages.at(-1)!.text).toMatch(/electoral roll/)
    const ack = await c.send({ type: 'sample', fileKind: 'letter' })
    expect(ack.step).toBe('questions')
    expect(ack.messages).toHaveLength(1)
    expect(ack.messages[0]!.text).toBe("Thanks, that's a letter from Capital One. I'll go through it after your results.")
    expect(ack.expects).toEqual(roll.expects)
    const dd = await c.send({ type: 'choice', value: 'Yes, I can' })
    expect(dd.messages[0]!.text).toMatch(/Barclaycard.*Direct Debit/)
    const goal = await c.send({ type: 'choice', value: 'No' })
    expect(goal.step).toBe('goals')
    // Her letter (handed over mid-questions) was for the Balance Transfer card, so that chip leads.
    expect(goal.expects.chips).toEqual(['The Balance Transfer card', 'A target score', 'A specific card', 'Car finance', 'A mortgage', 'Something else'])
    const score = await c.send({ type: 'choice', value: 'A target score' })
    expect(score.messages[0]!.text).toBe('What score would you like to reach? Your Experian score is 700 today.')
    expect(score.expects.chips).toEqual(['750', '800', '850'])
    await c.send({ type: 'choice', value: '800' })
    const assessing = await c.send({ type: 'choice', value: '6 months' })
    expect(assessing.messages.at(-1)!.text).toMatch(/towards a score of 800/)
    let r = await c.send({ type: 'skip' })
    expect(r.expects.chips).toEqual(['Tell me about the letter'])
    r = await c.send({ type: 'choice', value: 'Tell me about the letter' })
    expect(r.step).toBe('decline')
    r = await c.send({ type: 'choice', value: 'Got it' })
    expect(r.step).toBe('paper')
    expect(r.paperUrl).toBe(`/api/paper/${c.sessionId}.pdf`)
    r = await c.send({ type: 'choice', value: 'Make me a plan' })
    expect(r.messages[0]!.text).toMatch(/You said 6 months/)
    const plan = await c.send({ type: 'choice', value: '3 months' })
    const kinds = plan.messages.map(m => m.kind)
    expect(kinds.filter(k => k === 'step')).toHaveLength(plan.result!.result.plans['3m'].steps.length)
    expect(kinds).toContain('projection')
    expect(kinds).toContain('ladder')
    const wi = await c.send({ type: 'text', value: 'What if I pay £300 a month?' })
    expect(wi.whatIf?.changes).toEqual([{ lever: 'paydown', value: 300 }])
    expect(c.steps).toEqual([
      'intro', 'opening', 'ask_report', 'ask_bank', 'questions', 'questions', 'questions',
      'goals', 'goals', 'goals', 'assessing', 'diagnosis', 'decline', 'paper', 'coach', 'coach', 'coach',
    ])
  })

  it('report with nothing handed over: the form questions are asked and the engine still runs', async () => {
    const c = chat()
    await begin(c, 'report')
    await c.send({ type: 'skip' })
    const age = await c.send({ type: 'skip' })
    expect(age.messages[0]!.text).toBe('How old are you?')
    const retry = await c.send({ type: 'text', value: 'old enough' })
    expect(retry.step).toBe('questions')
    expect(retry.messages[0]!.text).toMatch(/didn't catch that/)
    const income = await c.send({ type: 'text', value: "I'm 31" })
    expect(income.messages[0]!.text).toMatch(/earn a year/)
    await c.send({ type: 'text', value: 'about 28k' })
    await c.send({ type: 'choice', value: 'With family' })
    const goal = await c.send({ type: 'choice', value: 'Equifax' })
    expect(goal.step).toBe('goals')
    await c.send({ type: 'choice', value: 'A mortgage' })
    const assessing = await c.send({ type: 'choice', value: '6 months' })
    expect(assessing.step).toBe('assessing')
    expect(assessing.result?.profile).toMatchObject({ age: 31, grossIncome: 28000, housing: 'family', goal: 'mortgage', bureau: 'equifax' })
    expect(assessing.result?.decline).toBeNull()
    const diagnosis = await c.send({ type: 'skip' })
    expect(diagnosis.expects.chips).toEqual(['What can I do?'])
  })

  it('prepare, Priya aiming for the Classic: readiness against it, goals to confirm, then the advice', async () => {
    const c = chat()
    const product = await begin(c, 'prepare')
    expect(product.step).toBe('questions')
    expect(product.expects.chips?.slice(0, 3)).toEqual(['Capital One Classic', 'Capital One Balance Transfer', 'Capital One 0% Purchase'])
    const report = await c.send({ type: 'choice', value: 'Capital One Classic' })
    expect(report.step).toBe('ask_report')
    await c.send({ type: 'sample', fileKind: 'credit_report', personaId: 'priya' })
    const goals = await c.send({ type: 'sample', fileKind: 'bank' })
    expect(goals.step).toBe('goals')
    const ready = goals.messages.find(m => m.id === 'ready-card')!
    expect(ready.kind).toBe('ladder')
    expect(ready.text).toMatch(/^The Classic is a credit-builder card\. You could check it on QuickCheck from [A-Z][a-z]{2} \d{4}\./)
    expect(goals.messages.at(-1)!.text).toBe('You said the Classic card first. Is that still the goal, or something else?')
    expect(goals.expects.chips?.[0]).toBe('The Classic card')
    let r = await c.send({ type: 'choice', value: 'The Classic card' })
    r = await c.send({ type: 'choice', value: '3 months' })
    r = await answerAll(c, r)
    expect(r.messages.at(-1)!.text).toMatch(/towards the Classic card/)
    await toPlan(c, r)
  })

  it('prepare for the Balance Transfer card: the criteria met today and when they turn green', async () => {
    const c = chat()
    await begin(c, 'prepare')
    await c.send({ type: 'choice', value: 'Capital One Balance Transfer' })
    await c.send({ type: 'sample', fileKind: 'credit_report', personaId: 'priya' })
    const goals = await c.send({ type: 'sample', fileKind: 'bank' })
    const l = goals.result!.result.ladder!
    const met = l.graduation.filter(g => g.ok).length
    expect(goals.messages.find(m => m.id === 'ready-card')!.text).toBe(
      `Against the Balance Transfer card's published criteria, you meet ${met} of ${l.graduation.length} today. All of them should be green by ${l.graduateWhen}.`,
    )
  })

  it('new, Mei Lin: the build-from-zero questions, her sample, the first steps, then goals and the advice', async () => {
    const c = chat()
    const why = await begin(c, 'new')
    expect(why.expects.chips).toEqual(["I'm new to the UK", "I'm a student", "I've never had credit"])
    const uk = await c.send({ type: 'choice', value: "I'm new to the UK" })
    expect(uk.messages[0]!.text).toBe('How long have you been in the UK?')
    const bankAge = await c.send({ type: 'choice', value: 'Under 6 months' })
    expect(bankAge.messages[0]!.text).toBe('How long have you had a UK bank account?')
    const report = await c.send({ type: 'choice', value: 'Under 6 months' })
    expect(report.step).toBe('ask_report')
    expect(report.messages.at(-1)!.text).toMatch(/Even a short one helps/)
    const bank = await c.send({ type: 'sample', fileKind: 'credit_report', personaId: 'mei' })
    expect(bank.messages.map(m => m.text).join(' ')).toMatch(/already has three months of bank data/)
    let r = await c.send({ type: 'skip' })
    r = await answerAll(c, r.step === 'goals' ? r : r)
    const build = c.steps.includes('goals')
    expect(build).toBe(true)
    expect(r.step).toBe('assessing')
    expect(r.result?.profile).toMatchObject({ newToUK: true, ukMonths: 3 })
    r = await c.send({ type: 'skip' })
    for (let i = 0; r.step !== 'coach' && i < 5; i++) r = await c.send({ type: 'choice', value: r.expects.chips![0]! })
    expect(c.steps).toContain('decline') // her sample carries a letter
    r = await c.send({ type: 'choice', value: '3 months' })
    expect(r.messages.some(m => m.kind === 'projection')).toBe(true)
  })

  it('new: the first steps come before the goals question', async () => {
    const c = chat()
    await begin(c, 'new')
    await c.send({ type: 'choice', value: "I've never had credit" })
    await c.send({ type: 'choice', value: '6 months or more' })
    await c.send({ type: 'sample', fileKind: 'credit_report', personaId: 'mei' })
    let r = await c.send({ type: 'skip' })
    while (r.step === 'questions') r = await c.send({ type: 'choice', value: r.expects.chips?.[0] ?? 'skip' })
    expect(r.step).toBe('goals')
    const ids = r.messages.map(m => m.id)
    expect(ids.indexOf('build-intro')).toBeGreaterThanOrEqual(0)
    expect(ids.filter(x => /^build-\d+$/.test(x))).toHaveLength(3)
    expect(ids.indexOf('build-intro')).toBeLessThan(ids.indexOf('q-goal'))
    expect(ids.at(-1)).toBe('q-goal')
  })

  it('mei and alex in the report branch: their bundled letter still gets its decline step', async () => {
    for (const personaId of ['mei', 'alex']) {
      const c = chat()
      await begin(c, 'report')
      const bank = await c.send({ type: 'sample', fileKind: 'credit_report', personaId })
      expect(bank.messages[1]!.text).toMatch(/already has three months of bank data/)
      let r = await c.send({ type: 'skip' })
      r = await answerAll(c, r)
      expect(r.result?.findings).not.toBeNull()
      r = await c.send({ type: 'skip' })
      expect(r.expects.chips).toEqual(['Tell me about the letter'])
      const dec = await c.send({ type: 'choice', value: 'Tell me about the letter' })
      expect(dec.step).toBe('decline')
      await c.send({ type: 'choice', value: 'Got it' })
      await c.send({ type: 'choice', value: 'Make me a plan' })
      const plan = await c.send({ type: 'choice', value: '6 months' })
      for (const chipText of plan.expects.chips ?? []) {
        const w = await c.send({ type: 'choice', value: chipText })
        expect(w.messages[0]!.kind, chipText).toBe('whatif')
      }
    }
  })
})

describe('POST /api/whatif', () => {
  it('text and sliders', async () => {
    const c = chat()
    await c.send({ type: 'start' })
    await c.send({ type: 'choice', value: 'Nice to meet you, Cap!' })
    await c.send({ type: 'choice', value: "I've got a credit report I want help with" })
    await c.send({ type: 'sample', fileKind: 'credit_report', personaId: 'priya' })
    await c.send({ type: 'sample', fileKind: 'bank' })
    let r = await c.send({ type: 'sample', fileKind: 'letter' })
    while (r.step === 'questions' || r.step === 'goals') r = await c.send({ type: 'choice', value: r.expects.chips?.[0] ?? 'A credit card' })

    const text = await app.inject({ method: 'POST', url: '/api/whatif', payload: { sessionId: c.sessionId, text: 'what if I pay 300 a month extra' } })
    expect(text.statusCode, text.body).toBe(200)
    const t = WhatIfResponse.parse(text.json())
    expect(t.whatIf.changes).toEqual([{ lever: 'paydown', value: 300 }])
    expect(t.messages[0]!.kind).toBe('whatif')
    expect(t.whatIf.output.before.m3.low).toBeLessThan(t.whatIf.output.after.m3.low)

    const sliders = await app.inject({
      method: 'POST',
      url: '/api/whatif',
      payload: { sessionId: c.sessionId, changes: [{ lever: 'paydown', value: 400 }, { lever: 'stop', what: 'bnpl' }] },
    })
    const s = WhatIfResponse.parse(sliders.json())
    expect(s.whatIf.text).toBeNull()
    expect(s.whatIf.id).not.toBe(t.whatIf.id)

    const bad = await app.inject({ method: 'POST', url: '/api/whatif', payload: { sessionId: c.sessionId, text: 'what if I win the lottery jackpot' } })
    expect(bad.statusCode).toBe(422)
    const unknown = await app.inject({ method: 'POST', url: '/api/whatif', payload: { sessionId: c.sessionId, text: 'what if I move to Spain' } })
    expect(unknown.statusCode).toBe(422)
    expect(unknown.json().error).toMatch(/I can model these:/)
  })

  /** A session with its result: a persona's samples, or no files at all (every question answered). */
  async function checkedSession(personaId: string | null) {
    const c = chat()
    await c.send({ type: 'start' })
    await c.send({ type: 'choice', value: 'Nice to meet you, Cap!' })
    await c.send({ type: 'choice', value: "I've got a credit report I want help with" })
    if (personaId) {
      await c.send({ type: 'sample', fileKind: 'credit_report', personaId })
      await c.send(personaId === 'priya' ? { type: 'sample', fileKind: 'bank' } : { type: 'skip' })
    } else {
      await c.send({ type: 'skip' })
      await c.send({ type: 'skip' })
    }
    const typed = ['31', 'about 28k']
    let r = await c.send({ type: 'skip' })
    while (r.step === 'questions' || r.step === 'goals')
      r = await c.send(r.expects.chips?.length ? { type: 'choice', value: r.expects.chips[0]! } : { type: 'text', value: typed.shift() ?? 'yes' })
    expect(r.step).toBe('assessing')
    return { c, r }
  }

  it('"what if I win the lottery" is not "stop gambling": the agent says what it can model (114 review)', async () => {
    for (const who of ['priya', 'mei', 'alex', null]) {
      const { c } = await checkedSession(who)
      for (const text of ['what if I win the lottery', 'What if I won £5,000 on the lottery?', 'what if I get a pay rise']) {
        const res = await app.inject({ method: 'POST', url: '/api/whatif', payload: { sessionId: c.sessionId, text } })
        expect(res.statusCode, `${who}: ${text}: ${res.body}`).toBe(422)
        expect(res.json().error).toMatch(/^I can't test that one\. I can model these: /)
      }
    }
    // In the chat: a friendly text with the what-if chips, not a what-if card.
    const { c } = await checkedSession('priya')
    let r = await c.send({ type: 'skip' })
    for (let i = 0; r.step !== 'coach' && i < 6; i++) r = await c.send({ type: 'choice', value: r.expects.chips?.[0] ?? 'Make me a plan' })
    r = await c.send({ type: 'choice', value: '3 months' })
    expect(r.messages.some(m => m.kind === 'projection')).toBe(true)
    const lottery = await c.send({ type: 'text', value: 'what if I win the lottery' })
    expect(lottery.step).toBe('coach')
    expect(lottery.whatIf ?? null).toBeNull()
    expect(lottery.messages).toHaveLength(1)
    expect(lottery.messages[0]!.kind).toBe('text')
    expect(lottery.messages[0]!.text).toMatch(/I can model these: paying more off your cards/)
    expect(lottery.expects.chips?.length).toBeGreaterThan(0)
    // Saying you'd stop still works.
    const stop = await c.send({ type: 'text', value: 'what if I stop gambling and the lottery' })
    expect(stop.whatIf?.changes).toEqual([{ lever: 'stop', what: 'gambling' }])
  })

  it('the line after the headline gives no count, so it cannot contradict a worded "two things" (reviewer pass)', async () => {
    const { c } = await checkedSession('priya')
    const d = await c.send({ type: 'skip' })
    const intro = d.messages.find(m => m.id.includes('intro'))
    expect(intro?.text).toBe("Here's what's holding your score back, worst first.")
  })

  it('coming off the electoral roll never shows a rise, for any persona or no data (114 review)', async () => {
    const asks = [
      'what if I come off the electoral roll',
      'what if I remove myself from the electoral roll',
      "what if I wasn't on the electoral roll",
      'what if I deregister from voting',
      "what if I wasn't on the electoral register",
      'what if I opt out of the electoral roll',
    ]
    for (const who of ['priya', 'mei', 'alex', null]) {
      const { c } = await checkedSession(who)
      const bodies: Record<string, unknown>[] = [
        ...asks.map(text => ({ text })),
        { changes: [{ lever: 'electoralRoll', value: false }] },
        // Reviewer pass: a slider `set` of the roll showed a rise with no data. It is the roll lever now.
        { changes: [{ lever: 'set', path: 'electoralRoll', value: false }] },
      ]
      for (const body of bodies) {
        const label = `${who}: ${JSON.stringify(body)}`
        const res = await app.inject({ method: 'POST', url: '/api/whatif', payload: { sessionId: c.sessionId, ...body } })
        expect(res.statusCode, `${label}: ${res.body}`).toBe(200)
        const w = WhatIfResponse.parse(res.json())
        expect(w.whatIf.changes, label).toEqual([{ lever: 'electoralRoll', value: false }])
        for (const k of ['m3', 'm6'] as const) {
          expect(w.whatIf.output.delta[k].low, label).toBeLessThanOrEqual(0)
          expect(w.whatIf.output.delta[k].high, label).toBeLessThanOrEqual(0)
        }
        expect(w.messages[0]!.text, label).toMatch(/^Coming off the electoral roll won't raise your score/)
        expect(w.messages[0]!.text, label).not.toMatch(/up from|already gets you there|Registering/)
      }
    }
    // Next to a real gain, the rise is the paydown's and the roll is named as left out.
    const { c } = await checkedSession('priya')
    const both = await app.inject({ method: 'POST', url: '/api/whatif', payload: { sessionId: c.sessionId, text: 'what if I pay 400 a month and come off the electoral roll' } })
    const w = WhatIfResponse.parse(both.json())
    const alone = WhatIfResponse.parse(
      (await app.inject({ method: 'POST', url: '/api/whatif', payload: { sessionId: c.sessionId, changes: [{ lever: 'paydown', value: 400 }] } })).json(),
    )
    expect(w.whatIf.output.after).toEqual(alone.whatIf.output.after)
    expect(w.messages[0]!.text).toMatch(/^Paying £400 extra a month: .* up from .* I left out coming off the electoral roll: it won't help\.$/)
  })

  it('unsafe or impossible slider changes are refused, worse changes say so (review 113)', async () => {
    const c = chat()
    await c.send({ type: 'start' })
    await c.send({ type: 'choice', value: 'Nice to meet you, Cap!' })
    await c.send({ type: 'choice', value: "I've got a credit report I want help with" })
    await c.send({ type: 'sample', fileKind: 'credit_report', personaId: 'priya' })
    await c.send({ type: 'sample', fileKind: 'bank' })
    let r = await c.send({ type: 'skip' })
    while (r.step === 'questions' || r.step === 'goals') r = await c.send({ type: 'choice', value: r.expects.chips?.[0] ?? 'A credit card' })
    const proto = await app.inject({ method: 'POST', url: '/api/whatif', payload: { sessionId: c.sessionId, changes: [{ lever: 'set', path: '__proto__.polluted', value: 1 }] } })
    expect(proto.statusCode).toBe(422)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    const nonsense = await app.inject({ method: 'POST', url: '/api/whatif', payload: { sessionId: c.sessionId, changes: [{ lever: 'set', path: 'score', value: 'abc' }] } })
    expect(nonsense.statusCode).toBe(422)
    expect(typeof nonsense.json().error).toBe('string')
    const off = await app.inject({ method: 'POST', url: '/api/whatif', payload: { sessionId: c.sessionId, changes: [{ lever: 'electoralRoll', value: false }, { lever: 'rentReporting', value: false }] } })
    const o = WhatIfResponse.parse(off.json())
    if (o.whatIf.output.delta.m3.high < 0) expect(o.messages[0]!.text).toMatch(/would drop to/)
    else expect(o.messages[0]!.text).not.toMatch(/already gets you there/)
  })

  it('before the check: 409', async () => {
    const c = chat()
    await c.send({ type: 'start' })
    const res = await app.inject({ method: 'POST', url: '/api/whatif', payload: { sessionId: c.sessionId, text: 'pay 300' } })
    expect(res.statusCode).toBe(409)
    expect(typeof res.json().error).toBe('string')
  })
})
