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

describe('Priya, start to coach', () => {
  it('walks every step with valid messages', async () => {
    const c = chat()
    const greet = await c.send({ type: 'start' })
    expect(greet.step).toBe('greet')
    expect(greet.expects.chips).toEqual(["Let's start"])

    const askReport = await c.send({ type: 'choice', value: "Let's start" })
    expect(askReport.expects).toMatchObject({ kind: 'file', fileKinds: ['credit_report'], optional: true })

    const askBank = await c.send({ type: 'sample', fileKind: 'credit_report', personaId: 'priya' })
    expect(askBank.messages[0]!.text).toBe("Thanks, Priya. I've got your Experian report. Your score there is 700 out of 999.")

    const askLetter = await c.send({ type: 'sample', fileKind: 'bank' })
    expect(askLetter.messages[0]!.text).toMatch(/about £\d+ a month left over/)

    const goal = await c.send({ type: 'sample', fileKind: 'letter' })
    expect(goal.step).toBe('questions')
    expect(goal.messages.map(m => m.text)).toEqual([
      "Thanks, that's your Capital One letter. I'll go through it once I've seen everything.",
      'What are you hoping to get? Pick one, or tell me in your own words.',
    ])
    expect(goal.expects.kind).toBe('text')

    const horizon = await c.send({ type: 'choice', value: 'A credit card' })
    expect(horizon.expects.chips).toEqual(['3 months', '6 months'])
    const roll = await c.send({ type: 'choice', value: '3 months' })
    expect(roll.messages[0]!.text).toMatch(/electoral roll/)
    const dd = await c.send({ type: 'choice', value: 'Yes, I can' })
    expect(dd.messages[0]!.text).toMatch(/Barclaycard.*Direct Debit/)

    const assessing = await c.send({ type: 'choice', value: 'No' })
    expect(assessing.step).toBe('assessing')
    expect(assessing.expects.kind).toBe('none')
    expect(assessing.result).not.toBeNull()

    const diagnosis = await c.send({ type: 'skip' })
    expect(diagnosis.step).toBe('diagnosis')
    const reasons = diagnosis.messages.filter(m => m.kind === 'reason')
    expect(reasons).toHaveLength(3)
    for (const m of reasons) expect(resolveRef(m.ref, diagnosis.result)?.on).toBe('factor')
    expect(diagnosis.expects.chips).toEqual(['Tell me about the letter'])

    const decline = await c.send({ type: 'choice', value: 'Tell me about the letter' })
    expect(decline.step).toBe('decline')
    expect(decline.messages.map(m => m.ref)).toEqual([
      { on: 'decline', part: 'reasons' },
      { on: 'decline', part: 'fix' },
      { on: 'decline', part: 'reapply' },
      { on: 'decline', part: 'rights' },
    ])
    expect(decline.paperUrl).toBeNull()

    const paper = await c.send({ type: 'choice', value: 'Got it' })
    expect(paper.step).toBe('paper')
    expect(paper.paperUrl).toBe(`/api/paper/${c.sessionId}.pdf`)

    const choose = await c.send({ type: 'choice', value: 'Make me a plan' })
    expect(choose.step).toBe('coach')
    expect(choose.messages[0]!.text).toMatch(/You said 3 months/)

    const plan = await c.send({ type: 'choice', value: '3 months' })
    const kinds = plan.messages.map(m => m.kind)
    expect(kinds.filter(k => k === 'step')).toHaveLength(plan.result!.result.plans['3m'].steps.length)
    expect(kinds).toContain('projection')
    expect(kinds).toContain('ladder')
    expect(plan.expects.kind).toBe('text')

    const wi = await c.send({ type: 'text', value: 'What if I pay £300 a month?' })
    expect(wi.step).toBe('coach')
    expect(wi.messages[0]!.kind).toBe('whatif')
    expect(wi.whatIf?.changes).toEqual([{ lever: 'paydown', value: 300 }])
    expect(wi.messages[0]!.text).toMatch(/up from \d+ to \d+/)

    const chip = await c.send({ type: 'choice', value: 'What if I stop buy now, pay later?' })
    expect(chip.whatIf?.changes).toEqual([{ lever: 'stop', what: 'bnpl' }])
    expect(chip.messages[0]!.text).toMatch(/stays at/)

    const nonsense = await c.send({ type: 'text', value: 'What if I buy a horse?' })
    expect(nonsense.step).toBe('coach')
    expect(nonsense.messages[0]!.kind).toBe('text')
    expect(nonsense.whatIf).toBeUndefined()

    expect(c.steps).toEqual([
      'greet', 'ask_report', 'ask_bank', 'ask_letter',
      'questions', 'questions', 'questions', 'questions',
      'assessing', 'diagnosis', 'decline', 'paper',
      'coach', 'coach', 'coach', 'coach', 'coach',
    ])
  })

  it('a letter during the questions: one ack, step unchanged, decline after diagnosis', async () => {
    const c = chat()
    await c.send({ type: 'start' })
    await c.send({ type: 'choice', value: "Let's start" })
    await c.send({ type: 'sample', fileKind: 'credit_report', personaId: 'priya' })
    await c.send({ type: 'sample', fileKind: 'bank' })
    const q1 = await c.send({ type: 'skip' }) // no letter at ask_letter
    expect(q1.step).toBe('questions')
    const ack = await c.send({ type: 'sample', fileKind: 'letter' })
    expect(ack.step).toBe('questions')
    expect(ack.messages).toHaveLength(1)
    expect(ack.messages[0]!.text).toBe("Thanks, that's a letter from Capital One. I'll go through it after your results.")
    expect(ack.expects).toEqual(q1.expects)
    // The goal question is still waiting.
    const horizon = await c.send({ type: 'choice', value: 'A credit card' })
    expect(horizon.messages[0]!.text).toMatch(/how soon/)
    await c.send({ type: 'choice', value: '6 months' })
    await c.send({ type: 'choice', value: 'Yes, I can' })
    await c.send({ type: 'choice', value: 'Not sure' })
    const diagnosis = await c.send({ type: 'skip' })
    expect(diagnosis.step).toBe('diagnosis')
    expect(diagnosis.expects.chips).toEqual(['Tell me about the letter'])
    const decline = await c.send({ type: 'choice', value: 'Tell me about the letter' })
    expect(decline.step).toBe('decline')
    expect(decline.result?.decline?.lender).toBe('Capital One')
  })

  it('no letter: diagnosis goes straight to the paper', async () => {
    const c = chat()
    await c.send({ type: 'start' })
    await c.send({ type: 'choice', value: "Let's start" })
    await c.send({ type: 'sample', fileKind: 'credit_report', personaId: 'priya' })
    await c.send({ type: 'skip' })
    await c.send({ type: 'skip' })
    let r = await c.send({ type: 'text', value: 'I want to buy a car' })
    while (r.step === 'questions') r = await c.send({ type: 'choice', value: r.expects.chips?.[0] ?? 'skip' })
    expect(r.step).toBe('assessing')
    expect(r.result?.decline).toBeNull()
    const diagnosis = await c.send({ type: 'skip' })
    expect(diagnosis.expects.chips).toEqual(['What can I do?'])
    const paper = await c.send({ type: 'choice', value: 'What can I do?' })
    expect(paper.step).toBe('paper')
  })
})

describe('other personas and no data', () => {
  for (const personaId of ['mei', 'alex']) {
    it(`${personaId}: report sample already holds bank data and a letter`, async () => {
      const c = chat()
      await c.send({ type: 'start' })
      await c.send({ type: 'choice', value: "Let's start" })
      const bank = await c.send({ type: 'sample', fileKind: 'credit_report', personaId })
      expect(bank.messages[1]!.text).toMatch(/already has three months of bank data/)
      const letter = await c.send({ type: 'skip' })
      expect(letter.messages.map(m => m.text).join(' ')).toMatch(/already has the letter/)
      let r = await c.send({ type: 'skip' })
      while (r.step === 'questions') r = await c.send({ type: 'choice', value: r.expects.chips?.[0] ?? 'A credit card' })
      expect(r.step).toBe('assessing')
      expect(r.result?.findings).not.toBeNull()
      const d = await c.send({ type: 'skip' })
      expect(d.messages.filter(m => m.kind === 'reason')).toHaveLength(3)
      const dec = await c.send({ type: 'choice', value: d.expects.chips![0]! })
      expect(dec.step).toBe('decline')
      await c.send({ type: 'choice', value: 'Got it' })
      await c.send({ type: 'choice', value: 'Make me a plan' })
      const plan = await c.send({ type: 'choice', value: '6 months' })
      expect(plan.messages.some(m => m.kind === 'projection')).toBe(true)
      for (const chipText of plan.expects.chips ?? []) {
        const w = await c.send({ type: 'choice', value: chipText })
        expect(w.messages[0]!.kind, chipText).toBe('whatif')
      }
    })
  }

  it('everything skipped: the form questions are asked and the engine still runs', async () => {
    const c = chat()
    await c.send({ type: 'start' })
    await c.send({ type: 'choice', value: "Let's start" })
    await c.send({ type: 'skip' })
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
    await c.send({ type: 'choice', value: 'A mortgage' })
    await c.send({ type: 'choice', value: '6 months' })
    const assessing = await c.send({ type: 'choice', value: 'Equifax' })
    expect(assessing.step).toBe('assessing')
    expect(assessing.result?.profile).toMatchObject({ age: 31, grossIncome: 28000, housing: 'family', goal: 'mortgage', bureau: 'equifax' })
    expect(c.steps.filter(s => s === 'questions')).toHaveLength(7)
  })
})

describe('POST /api/whatif', () => {
  it('text and sliders', async () => {
    const c = chat()
    await c.send({ type: 'start' })
    await c.send({ type: 'choice', value: "Let's start" })
    await c.send({ type: 'sample', fileKind: 'credit_report', personaId: 'priya' })
    await c.send({ type: 'sample', fileKind: 'bank' })
    let r = await c.send({ type: 'sample', fileKind: 'letter' })
    while (r.step === 'questions') r = await c.send({ type: 'choice', value: r.expects.chips?.[0] ?? 'A credit card' })

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
    // "lottery" reads as gambling; a truly unknown one is rejected with a friendly message.
    expect([200, 422]).toContain(bad.statusCode)
    const unknown = await app.inject({ method: 'POST', url: '/api/whatif', payload: { sessionId: c.sessionId, text: 'what if I move to Spain' } })
    expect(unknown.statusCode).toBe(422)
    expect(unknown.json().error).toMatch(/I can only test/)
  })

  it('unsafe or impossible slider changes are refused, worse changes say so (review 113)', async () => {
    const c = chat()
    await c.send({ type: 'start' })
    await c.send({ type: 'choice', value: "Let's start" })
    await c.send({ type: 'sample', fileKind: 'credit_report', personaId: 'priya' })
    await c.send({ type: 'sample', fileKind: 'bank' })
    let r = await c.send({ type: 'skip' })
    while (r.step === 'questions') r = await c.send({ type: 'choice', value: r.expects.chips?.[0] ?? 'A credit card' })
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
