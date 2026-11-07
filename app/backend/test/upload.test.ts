// Block 3: POST /api/upload, then the file used in a turn. Offline: no Claude, so PDFs and photos fail kindly.

import { readFileSync } from 'node:fs'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TurnResponse, UploadResult } from 'shared'
import type { TurnInput } from 'shared'
import { buildApp } from '../src/app.ts'
import { readLetterText, tidyLetter, toDecline } from '../src/ingest.ts'
import { templateWording } from '../src/messages.ts'

const data = (p: string) => readFileSync(new URL(`../data/${p}`, import.meta.url))

let app: FastifyInstance
beforeAll(async () => {
  app = await buildApp({ wording: templateWording })
})
afterAll(async () => {
  await app.close()
})

function multipart(fields: Record<string, string>, file?: { name: string; type: string; body: Buffer }) {
  const boundary = '----113test' + Math.random().toString(16).slice(2)
  const parts: Buffer[] = []
  for (const [k, v] of Object.entries(fields)) parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`))
  if (file)
    parts.push(
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.name}"\r\nContent-Type: ${file.type}\r\n\r\n`),
      file.body,
      Buffer.from('\r\n'),
    )
  parts.push(Buffer.from(`--${boundary}--\r\n`))
  return { payload: Buffer.concat(parts), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } }
}

async function upload(fileKind: string, file?: { name: string; type: string; body: Buffer }, extra: Record<string, string> = {}) {
  const res = await app.inject({ method: 'POST', url: '/api/upload', ...multipart({ fileKind, sessionId: '', ...extra }, file) })
  return { status: res.statusCode, body: res.json() }
}

async function turn(sessionId: string | null, input: TurnInput) {
  const res = await app.inject({ method: 'POST', url: '/api/turn', payload: { sessionId, input } })
  expect(res.statusCode, res.body).toBe(200)
  return TurnResponse.parse(res.json())
}

describe('POST /api/upload', () => {
  it('a credit report JSON, a bank CSV and a letter, then the whole conversation on them', async () => {
    const rep = await upload('credit_report', { name: 'experian.json', type: 'application/json', body: data('personas/mock-credit-report.json') })
    expect(rep.status).toBe(200)
    const r = UploadResult.parse(rep.body)
    expect(r.ok).toBe(true)
    expect(r.findings.find(f => f.label === 'Score')?.value).toMatch(/682/)

    const csv = UploadResult.parse((await upload('bank', { name: 'priya-bank.csv', type: 'text/csv', body: data('samples/priya-bank.csv') })).body)
    expect(csv.ok).toBe(true)
    expect(csv.findings.map(f => f.label)).toEqual(expect.arrayContaining(['Income', 'Rent', 'Bills', 'Buy now, pay later']))

    const letter = UploadResult.parse((await upload('letter', { name: 'letter.txt', type: 'text/plain', body: data('samples/capital-one-letter.txt') })).body)
    expect(letter.ok).toBe(true)
    expect(letter.findings[0]?.value).toBe('Capital One, Balance Transfer credit card, 6 Oct 2026')

    let s = await turn(null, { type: 'start' })
    s = await turn(s.sessionId, { type: 'choice', value: 'Nice to meet you, Cap!' })
    s = await turn(s.sessionId, { type: 'choice', value: "I've got a credit report I want help with" })
    s = await turn(s.sessionId, { type: 'file', fileKind: 'credit_report', fileId: r.fileId! })
    expect(s.step).toBe('ask_bank')
    expect(s.messages[0]!.text).toMatch(/^Thanks, Alex\. I've got your Experian report\. Your score there is 682 out of 999\./)
    s = await turn(s.sessionId, { type: 'file', fileKind: 'bank', fileId: csv.fileId! })
    // 115, report branch: the bank statement leads to the questions (no letter step; a letter is welcome at any step).
    expect(['questions', 'goals']).toContain(s.step)
    expect(s.messages[0]!.text).toMatch(/a month left over|short each month/)
    const asking = s.step
    s = await turn(s.sessionId, { type: 'file', fileKind: 'letter', fileId: letter.fileId! })
    expect(s.step).toBe(asking)
    while (s.step === 'questions' || s.step === 'goals') s = await turn(s.sessionId, { type: 'choice', value: s.expects.chips?.[0] ?? 'A credit card' })
    expect(s.result?.profile.bank?.rent).toBe(650) // the uploaded statement, not the report's own bank data
    expect(s.result?.decline?.lender).toBe('Capital One')
  })

  it('a report the engine cannot use is refused kindly (review 113)', async () => {
    const report = JSON.parse(data('personas/mock-credit-report.json').toString('utf8'))
    for (const field of ['limit', 'balance', 'opened']) {
      const broken = structuredClone(report)
      delete broken.accounts[0][field]
      const u = UploadResult.parse((await upload('credit_report', { name: `no-${field}.json`, type: 'application/json', body: Buffer.from(JSON.stringify(broken)) })).body)
      expect(u.ok, field).toBe(false)
      expect(u.error).toMatch(/couldn't read that one/)
    }
  })

  it('a pasted letter in the text field', async () => {
    const res = await upload('letter', undefined, { text: 'Vodafone. We are sorry, we cannot offer you a pay monthly contract. This decision used Experian data. 23/09/2026' })
    const u = UploadResult.parse(res.body)
    expect(u.ok).toBe(true)
    expect(u.findings[0]!.value).toMatch(/^Vodafone/)
  })

  it('friendly errors, reason in the log', async () => {
    const pdf = UploadResult.parse((await upload('credit_report', { name: 'report.pdf', type: 'application/pdf', body: Buffer.from('%PDF-1.4 not really a pdf') })).body)
    expect(pdf).toMatchObject({ ok: false, fileId: null, error: "I couldn't read that one. Is it your credit report? You can try the sample instead." })
    const junk = UploadResult.parse((await upload('credit_report', { name: 'notes.json', type: 'application/json', body: Buffer.from('{"hello": "world"}') })).body)
    expect(junk.ok).toBe(false)
    const badCsv = UploadResult.parse((await upload('bank', { name: 'x.csv', type: 'text/csv', body: Buffer.from('a,b\n1,2\n') })).body)
    expect(badCsv.ok).toBe(false)
    const heic = UploadResult.parse((await upload('letter', { name: 'IMG_1.HEIC', type: 'image/heic', body: Buffer.from('\0\0\0\x18ftypheic\0\0\0\0') })).body)
    expect(heic.error).toMatch(/screenshot/)
    const none = await upload('letter')
    expect(none.status).toBe(400)
    expect(typeof none.body.error).toBe('string')
  })

  it('an unknown fileId in a turn is a friendly message, step unchanged', async () => {
    let s = await turn(null, { type: 'start' })
    s = await turn(s.sessionId, { type: 'choice', value: 'Nice to meet you, Cap!' })
    s = await turn(s.sessionId, { type: 'choice', value: "I've got a credit report I want help with" })
    const again = await turn(s.sessionId, { type: 'file', fileKind: 'credit_report', fileId: 'up-nope' })
    expect(again.step).toBe('ask_report')
    expect(again.messages[0]!.text).toMatch(/couldn't find that file/)
  })
})

describe('letter reading tidy-up', () => {
  it('drops the lender from the product: the finding already names it', () => {
    const l = { lender: 'Capital One', product: 'Capital One Balance Transfer credit card', date: '2026-10-06', cra: 'Experian' as const, reasons: [] }
    expect(tidyLetter(l).product).toBe('Balance Transfer credit card')
    expect(tidyLetter({ ...l, product: "Capital One's Classic card" }).product).toBe('Classic card')
    expect(tidyLetter({ ...l, product: 'Balance Transfer credit card' }).product).toBe('Balance Transfer credit card')
    expect(tidyLetter({ ...l, product: 'Capital One' }).product).toBe('Capital One')
    expect(tidyLetter({ ...l, product: null }).product).toBeNull()
  })
})

describe('letter pattern reader (offline)', () => {
  it('reads the sample letter', () => {
    const l = readLetterText(data('samples/capital-one-letter.txt').toString('utf8'))
    expect(l).toEqual({ lender: 'Capital One', product: 'Balance Transfer credit card', date: '2026-10-06', cra: 'Experian', reasons: [] })
    expect(toDecline(l!)).toMatchObject({ lender: 'Capital One', productId: 'bt', agency: 'Experian', statedReason: null })
  })
})
