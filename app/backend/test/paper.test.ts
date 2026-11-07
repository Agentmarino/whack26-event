// Block 3: the paper. Its numbers come from the engine result; the PDF is one or two A4 pages.

import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TurnResponse } from 'shared'
import type { TurnInput } from 'shared'
import * as E from '../engine/index.ts'
import { analyseProfile } from '../src/analysis.ts'
import { buildApp } from '../src/app.ts'
import { templateWording } from '../src/messages.ts'
import { paperModel, renderPaper } from '../src/paper.ts'
import { sample } from '../src/personas.ts'

const pages = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length

describe('paper model', () => {
  for (const id of ['priya', 'mei', 'alex'])
    for (const plan of ['3m', '6m'] as const)
      it(`${id} ${plan}: numbers are the engine's, 1 or 2 pages`, async () => {
        const s = sample(id)!
        const res = analyseProfile({ ...s.report, ...(s.bank ? { bank: s.bank } : {}), ...(s.decline ? { decline: s.decline } : {}) }, s.findings)
        const r = res.result
        const m = paperModel(res, plan)
        expect(m.score).toEqual({ value: r.profile.score, scaleMax: r.scaleMax, bureau: r.bureau })
        expect(m.headline).toBe(r.headline)
        expect(m.reasons.map(x => x.reason)).toEqual(r.diagnosis.ranked.slice(0, 3).map(f => f.reason))
        expect(m.plan.steps.map(x => `${x.date} ${x.instruction}`)).toEqual(r.plans[plan].steps.map(st => `${E.fmtDate(st.date)} ${st.instruction}`))
        for (const p of m.projections) {
          const end = r.plans[p.plan].projection.at(-1)!
          expect([p.low, p.high, p.by]).toEqual([end.low, end.high, end.date])
        }
        expect(m.decline?.rights ?? null).toEqual(res.decline?.rights ?? null)
        const pdf = await renderPaper(m)
        expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
        expect(pages(pdf)).toBeGreaterThanOrEqual(1)
        expect(pages(pdf)).toBeLessThanOrEqual(2)
      })
})

describe('GET /api/paper/:sessionId.pdf', () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = await buildApp({ wording: templateWording })
  })
  afterAll(async () => {
    await app.close()
  })
  const turn = async (sessionId: string | null, input: TurnInput) =>
    TurnResponse.parse((await app.inject({ method: 'POST', url: '/api/turn', payload: { sessionId, input } })).json())

  it('404 {error} until the paper step, then a PDF', async () => {
    let s = await turn(null, { type: 'start' })
    s = await turn(s.sessionId, { type: 'choice', value: "Let's start" })
    s = await turn(s.sessionId, { type: 'sample', fileKind: 'credit_report', personaId: 'priya' })
    s = await turn(s.sessionId, { type: 'sample', fileKind: 'bank' })
    s = await turn(s.sessionId, { type: 'sample', fileKind: 'letter' })
    while (s.step === 'questions') s = await turn(s.sessionId, { type: 'choice', value: s.expects.chips?.[0] ?? 'A credit card' })
    const early = await app.inject(`/api/paper/${s.sessionId}.pdf`)
    expect(early.statusCode).toBe(404)
    expect(early.json()).toEqual({ error: 'Summary not ready yet' })
    s = await turn(s.sessionId, { type: 'skip' })
    s = await turn(s.sessionId, { type: 'choice', value: 'Tell me about the letter' })
    s = await turn(s.sessionId, { type: 'choice', value: 'Got it' })
    expect(s.step).toBe('paper')
    const res = await app.inject(s.paperUrl!)
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('application/pdf')
    expect(res.rawPayload.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pages(res.rawPayload)).toBeLessThanOrEqual(2)
  })
})
