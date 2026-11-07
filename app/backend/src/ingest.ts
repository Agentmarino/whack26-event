// POST /api/upload: a file → an engine piece, kept by fileId for the next turn.
//   credit_report: engine JSON (credit-coach-report/v1 or a Profile), or a PDF/photo read by Claude into credit-coach-report/v1
//   bank: a CSV (keywords, Claude only for unknown payees), or a PDF/photo whose rows Claude lists
//   letter: text, PDF or photo → {lender, product, date, cra, reasons} (Claude; a pattern reader for text when offline)
// Everything Claude returns is validated with zod and the engine's own parser. On failure the person gets
// "I couldn't read that..." and the reason goes to the log.

import type Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'node:crypto'
import { CreditReport, EngineResult, Profile } from 'shared'
import type { FileKind, Finding, UploadResult } from 'shared'
import { z } from 'zod'
import * as E from '../engine/index.ts'
import { isoDate, parseBankCsv, readBank, type Txn } from './bank.ts'
import { analyseProfile } from './analysis.ts'
import { askClaude, jsonIn, log, remember } from './claude.ts'
import { BANK_ROWS, LETTER, REPORT } from './schemas.ts'
import { config } from './config.ts'
import type { Sample } from './personas.ts'
import { putUpload, type Piece } from './uploads.ts'

export type Upload = { fileName: string; mime: string; data: Buffer | null; text: string | null }

type Kind = 'pdf' | 'image' | 'json' | 'csv' | 'text' | 'heic' | 'binary'

const SORRY: Record<FileKind, string> = {
  credit_report: "I couldn't read that one. Is it your credit report? You can try the sample instead.",
  bank: "I couldn't read that statement. A CSV export from your banking app works best, or try the sample.",
  letter: "I couldn't read that letter. You can paste its text, try a clearer photo, or use the sample.",
}

export function sniff(u: Upload): { kind: Kind; mediaType?: string } {
  const b = u.data
  if (b && b.length > 4) {
    if (b.subarray(0, 4).toString('latin1') === '%PDF') return { kind: 'pdf' }
    if (b[0] === 0x89 && b.subarray(1, 4).toString('latin1') === 'PNG') return { kind: 'image', mediaType: 'image/png' }
    if (b[0] === 0xff && b[1] === 0xd8) return { kind: 'image', mediaType: 'image/jpeg' }
    if (b.subarray(0, 4).toString('latin1') === 'GIF8') return { kind: 'image', mediaType: 'image/gif' }
    if (b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return { kind: 'image', mediaType: 'image/webp' }
    if (/ftyp(heic|heix|mif1|hevc)/.test(b.subarray(4, 12).toString('latin1'))) return { kind: 'heic' }
  }
  const t = textOf(u)
  if (t === null) return { kind: 'binary' }
  const s = t.trim()
  if (/^[[{]/.test(s)) return { kind: 'json' }
  if (/\.csv$/i.test(u.fileName) || /text\/csv/.test(u.mime) || (/^[^\n]*date[^\n]*[,;\t][^\n]*\n/i.test(s) && s.split('\n').length > 2)) return { kind: 'csv' }
  return { kind: 'text' }
}

function textOf(u: Upload): string | null {
  if (u.text != null) return u.text
  if (!u.data) return null
  const t = u.data.toString('utf8')
  // Mostly printable = text.
  const bad = (t.match(/[\u0000-\u0008\u000e-\u001f�]/g) ?? []).length
  return bad > t.length / 50 ? null : t
}

const sha = (u: Upload) => createHash('sha256').update(u.data ?? u.text ?? '').digest('hex').slice(0, 32)

function documentBlock(u: Upload, kind: Kind, mediaType?: string): Anthropic.ContentBlockParam | null {
  if (!u.data) return null
  const data = u.data.toString('base64')
  if (kind === 'pdf') return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
  if (kind === 'image' && mediaType) return { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/png', data } }
  return null
}

const fail = (fileKind: FileKind, fileName: string, why: string, friendly = SORRY[fileKind]): UploadResult => {
  log(`upload:${fileKind}`, `${fileName}: ${why}`)
  return { ok: false, fileId: null, fileKind, fileName, findings: [], error: friendly }
}
const ok = (piece: Piece, fileName: string, findings: Finding[]): UploadResult => ({
  ok: true,
  fileId: putUpload(piece),
  fileKind: piece.fileKind,
  fileName,
  findings,
  error: null,
})

export async function ingest(fileKind: FileKind, u: Upload): Promise<UploadResult> {
  const { kind, mediaType } = sniff(u)
  if (kind === 'heic') return fail(fileKind, u.fileName, 'HEIC photo', "I can't open that photo format. Take a screenshot of it, or share it as a PDF, and try again.")
  if (kind === 'binary') return fail(fileKind, u.fileName, `unknown binary file (${u.mime})`)
  try {
    if (fileKind === 'credit_report') return await ingestReport(u, kind, mediaType)
    if (fileKind === 'bank') return await ingestBank(u, kind, mediaType)
    return await ingestLetter(u, kind, mediaType)
  } catch (err) {
    return fail(fileKind, u.fileName, err instanceof Error ? err.message : String(err))
  }
}

// ---------- credit report ----------

const REPORT_SCHEMA = `{
 "format": "credit-coach-report/v1",
 "provider": "Experian" | "Equifax" | "TransUnion",
 "reportDate": "YYYY-MM-DD",
 "score": {"value": <number>, "scaleMax": <999 Experian, 1000 Equifax, 710 TransUnion>, "band": "<word if shown>"},
 "personal": {"name": "<full name>", "dateOfBirth": "YYYY-MM-DD" (if shown), "declaredIncome": <yearly, if shown>, "residentialStatus": "rent"|"own"|"family" (if shown)},
 "addresses": [{"address": "...", "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" (omit if current), "current": true|false}],
 "electoralRoll": [{"address": "...", "registered": true|false}],
 "accounts": [{"type": "credit_card"|"loan"|"mortgage"|"current_account"|"current_account_overdraft"|"communications"|"utility"|"other",
   "lender": "...", "opened": "YYYY-MM-DD", "status": "open"|"closed"|"settled",
   "limit": <number>, "balance": <number>, "apr": <number if shown>, "monthlyPayment": <number, loans and contracts>,
   "directDebit": true|false (if shown), "paymentPattern": "minimum"|"full"|"fixed" (if shown),
   "paymentHistory": [{"month": "YYYY-MM", "status": "OK" or the number of payments late, e.g. "1"}]}],
 "searches": [{"date": "YYYY-MM-DD", "organisation": "...", "purpose": "...", "type": "hard"|"soft"}],
 "publicRecords": [{"type": "CCJ"|"IVA"|"bankruptcy", "date": "YYYY-MM-DD", "amount": <number>}],
 "defaults": [{"lender": "...", "date": "YYYY-MM-DD", "amount": <number>}],
 "financialAssociates": [{"name": "...", "reason": "...", "stillLinked": true|false}],
 "declineLetters": []
}`

/**
 * A report is only accepted if the engine can run on it and the result fits the contract: a card with
 * no limit or balance would otherwise give "NaN%" messages and responses that fail the zod schemas.
 */
function unusable(sample: Sample): string | null {
  const profile = Profile.safeParse(sample.report)
  if (!profile.success) return `profile: ${profile.error.issues[0]?.path.join('.')} ${profile.error.issues[0]?.message}`
  const merged = { ...sample.report, ...(sample.bank ? { bank: sample.bank } : {}), ...(sample.decline ? { decline: sample.decline } : {}) }
  let res
  try {
    res = analyseProfile(merged, sample.findings)
  } catch (err) {
    return `engine run: ${err instanceof Error ? err.message : err}`
  }
  const checked = EngineResult.safeParse(res)
  if (!checked.success) return `engine result: ${checked.error.issues[0]?.path.join('.')} ${checked.error.issues[0]?.message}`
  if (/\bNaN\b|undefined/.test(JSON.stringify(res.result.diagnosis))) return 'engine result has NaN or undefined in the diagnosis'
  return null
}

async function ingestReport(u: Upload, kind: Kind, mediaType?: string): Promise<UploadResult> {
  let json: unknown
  let via = 'json'
  if (kind === 'json') {
    try {
      json = JSON.parse(textOf(u)!)
    } catch (err) {
      return fail('credit_report', u.fileName, `bad JSON: ${err instanceof Error ? err.message : err}`)
    }
  } else if (kind === 'pdf' || kind === 'image') {
    const block = documentBlock(u, kind, mediaType)!
    const call = {
      purpose: 'read-report',
      system: `You read UK credit reports (Experian, Equifax, TransUnion, or apps like ClearScore and Credit Karma) into JSON.
Copy values exactly as printed. Never estimate or calculate a value; leave a field out if it is not shown, except that every credit card needs "limit", "balance" and "opened" (skip a card whose limit or balance is not shown).
Reply with JSON only, in this shape:\n${REPORT_SCHEMA}`,
      content: [block, { type: 'text' as const, text: 'Read this credit report into the JSON shape. JSON only.' }],
      maxTokens: 6000,
      keyInput: { file: sha(u) },
      timeoutMs: 120_000,
      schema: REPORT,
    }
    const reply = await askClaude(call)
    if (!reply) return fail('credit_report', u.fileName, config.offline || !config.hasKey ? 'needs Claude (offline or no key) and not in the cache' : 'Claude gave no reply')
    json = jsonIn(reply.text)
    via = reply.from
    const checked = CreditReport.safeParse(json)
    if (!checked.success) return fail('credit_report', u.fileName, `Claude's JSON is not a report: ${checked.error.issues[0]?.message}`)
    if (reply.from === 'claude') remember(call, reply.text)
  } else {
    return fail('credit_report', u.fileName, `a ${kind} file is not a credit report`)
  }

  const report = CreditReport.safeParse(json)
  if (report.success) {
    let parsed
    try {
      parsed = E.parseReport(report.data)
    } catch (err) {
      return fail('credit_report', u.fileName, `engine parseReport: ${err instanceof Error ? err.message : err}`)
    }
    const { bank, decline, ...rest } = parsed.profile
    const hasBank = Boolean((report.data as { bankData?: unknown }).bankData)
    const sample: Sample = {
      id: 'upload',
      report: rest,
      bank: hasBank ? (bank ?? null) : null,
      decline: decline ?? null,
      findings: parsed.found,
      bundled: { bank: hasBank, letter: Boolean(decline) },
    }
    const why = unusable(sample)
    if (why) return fail('credit_report', u.fileName, `read via ${via} but not usable: ${why}`)
    log('upload:credit_report', `${u.fileName}: read via ${via}, ${parsed.found.report.length} findings`)
    return ok({ fileKind: 'credit_report', report: sample }, u.fileName, [...parsed.found.report, ...parsed.found.bank, ...parsed.found.letter])
  }
  // An engine Profile (as in data/personas/priya.json).
  const profile = Profile.safeParse(json)
  if (profile.success && ['score', 'cards', 'age', 'grossIncome'].some(k => k in (json as object))) {
    const { bank, decline, ...rest } = profile.data
    const sample: Sample = { id: 'upload', report: rest, bank: bank ?? null, decline: decline ?? null, findings: null, bundled: { bank: Boolean(bank), letter: Boolean(decline) } }
    const why = unusable(sample)
    if (why) return fail('credit_report', u.fileName, `Profile JSON not usable: ${why}`)
    const findings: Finding[] = [
      ...(rest.score != null ? [{ label: 'Score', value: `${rest.score} (${rest.bureau ?? 'experian'})`, tone: 'neutral' as const }] : []),
      ...(rest.cards ?? []).map(c => ({ label: `${c.name} card`, value: `${E.gbp(c.balance)} of ${E.gbp(c.limit)}`, tone: (c.balance / c.limit > 0.5 ? 'bad' : c.balance / c.limit > 0.3 ? 'warn' : 'good') as Finding['tone'] })),
    ]
    return ok({ fileKind: 'credit_report', report: sample }, u.fileName, findings)
  }
  return fail('credit_report', u.fileName, `JSON is neither credit-coach-report/v1 nor a Profile: ${report.error.issues[0]?.path.join('.')} ${report.error.issues[0]?.message}`)
}

// ---------- bank statement ----------

const Rows = z.object({ rows: z.array(z.object({ date: z.string(), description: z.string(), amount: z.number() })) })

async function ingestBank(u: Upload, kind: Kind, mediaType?: string): Promise<UploadResult> {
  let txns: Txn[]
  if (kind === 'csv' || kind === 'text') {
    const csv = parseBankCsv(textOf(u)!)
    if (!csv.ok) return fail('bank', u.fileName, `CSV: ${csv.why}`)
    txns = csv.txns
  } else if (kind === 'pdf' || kind === 'image') {
    const call = {
      purpose: 'read-bank',
      system: `You read UK bank statements. List every transaction exactly as printed.
Reply with JSON only: {"rows": [{"date": "YYYY-MM-DD", "description": "<payee as printed>", "amount": <number, negative for money out, positive for money in>}]}.
Never add, merge or calculate rows.`,
      content: [documentBlock(u, kind, mediaType)!, { type: 'text' as const, text: 'List the transactions. JSON only.' }],
      maxTokens: 8000,
      keyInput: { file: sha(u) },
      timeoutMs: 120_000,
      schema: BANK_ROWS,
    }
    const reply = await askClaude(call)
    if (!reply) return fail('bank', u.fileName, config.offline || !config.hasKey ? 'needs Claude (offline or no key) and not in the cache' : 'Claude gave no reply')
    const rows = Rows.safeParse(jsonIn(reply.text))
    if (!rows.success) return fail('bank', u.fileName, `Claude's rows: ${rows.error.issues[0]?.message}`)
    txns = rows.data.rows.flatMap(r => {
      const date = isoDate(r.date)
      return date ? [{ date, description: r.description, amount: r.amount }] : []
    })
    if (!txns.length) return fail('bank', u.fileName, 'no dated rows')
    if (reply.from === 'claude') remember(call, reply.text)
  } else {
    return fail('bank', u.fileName, `a ${kind} file is not a bank statement`)
  }
  const read = await readBank(txns)
  log('upload:bank', `${u.fileName}: ${txns.length} rows over ${read.months} months; payees by keywords ${read.sortedBy.keywords}, Claude ${read.sortedBy.claude}, unknown ${read.sortedBy.unknown}`)
  return ok({ fileKind: 'bank', bank: read.bank, netIncome: read.netIncome, findings: read.findings }, u.fileName, read.findings)
}

// ---------- decline letter ----------

export const LetterRead = z.object({
  lender: z.string().min(1),
  product: z.string().nullable(),
  date: z.string().nullable(),
  cra: z.enum(['Experian', 'Equifax', 'TransUnion']).nullable(),
  reasons: z.array(z.string()),
})
export type LetterRead = z.infer<typeof LetterRead>

const LENDERS = [
  'Capital One', 'Barclaycard', 'Barclays', 'Vanquis', 'Aqua', 'NewDay', 'Marbles', 'Fluid', 'American Express', 'Amex', 'MBNA', 'HSBC', 'Lloyds',
  'Halifax', 'NatWest', 'Santander', 'Nationwide', 'Monzo', 'Starling', 'Zopa', 'Tesco Bank', "Sainsbury's Bank", 'Virgin Money', 'Virgin Media',
  'Vodafone', 'EE', 'O2', 'Three', 'Sky', 'Klarna', 'Tymit', 'Jaja', 'Ocean', 'Bip', '118 118 Money', 'Admiral', 'Novuna',
]

/** The pattern reader for a letter's text (offline, or when Claude fails). */
export function readLetterText(text: string): LetterRead | null {
  const lender = LENDERS.find(l => new RegExp(`\\b${l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text))
  if (!lender) return null
  const product =
    text.match(/(?:applying for|application for|apply for)\s+(?:a |an |the |your )?(?:capital one |[A-Z][a-z]+ )?([^.\n,]*?(?:card|loan|contract|mortgage|account|plan))/i)?.[1]?.trim() ?? null
  const dm = text.match(/\b(\d{1,2}(?:st|nd|rd|th)?\s+[A-Z][a-z]+\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/)
  const date = dm ? (isoDate(dm[1]!.replace(/(st|nd|rd|th)\b/, '')) ?? null) : null
  const cra = (text.match(/\b(Experian|Equifax|TransUnion)\b/i)?.[1] ?? null) as LetterRead['cra'] | null
  const reasons = (text.match(/[^.\n]*\b(because|due to|the reason|reasons?:)[^.\n]*\./gi) ?? []).map(s => s.trim()).slice(0, 3)
  return { lender, product, date, cra: cra ? ((cra[0]!.toUpperCase() + cra.slice(1).toLowerCase()).replace('Transunion', 'TransUnion') as LetterRead['cra']) : null, reasons }
}

const monthsSince = (iso: string | null): number => {
  if (!iso) return 1
  const d = new Date(`${iso}T00:00:00Z`)
  const now = new Date()
  return Math.max(0, (now.getUTCFullYear() - d.getUTCFullYear()) * 12 + (now.getUTCMonth() - d.getUTCMonth()) - (now.getUTCDate() < d.getUTCDate() ? 1 : 0))
}

/** "Capital One Balance Transfer credit card" from Capital One → "Balance Transfer credit card": the lender is shown already. */
export function tidyLetter(l: LetterRead): LetterRead {
  const lead = new RegExp(`^${l.lender.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:'s)?\\s+`, 'i')
  const product = l.product?.replace(lead, '').trim() || l.product
  return { ...l, product }
}

/** A read letter → the engine's Profile.decline (same product mapping as the engine's parseReport). */
export function toDecline(l: LetterRead): NonNullable<Profile['decline']> {
  const product = l.product ?? null
  const productId = product ? (/balance/i.test(product) ? 'bt' : /purchase|0%/i.test(product) ? 'purchase' : 'classic') : 'classic'
  return { lender: l.lender, productId, monthsAgo: monthsSince(l.date), product, agency: l.cra, statedReason: l.reasons.length ? l.reasons.join(' ') : null }
}

async function ingestLetter(u: Upload, kind: Kind, mediaType?: string): Promise<UploadResult> {
  const text = kind === 'text' || kind === 'csv' || kind === 'json' ? textOf(u) : null
  let read: LetterRead | null = null
  const block = text === null ? documentBlock(u, kind, mediaType) : null
  if (text === null && !block) return fail('letter', u.fileName, `a ${kind} file is not a letter`)
  const call = {
    purpose: 'read-letter',
    system: `You read UK credit decline letters (a lender saying no to a card, loan, phone contract or mortgage).
Reply with JSON only: {"lender": "<who sent it>", "product": "<what was applied for, without the lender's name, or null>", "date": "YYYY-MM-DD or null", "cra": "Experian"|"Equifax"|"TransUnion"|null (the credit reference agency named), "reasons": ["<each reason the letter actually states, quoted briefly>"]}.
If the letter gives no specific reason, "reasons" is []. Never guess a reason the letter does not state.`,
    content: text !== null ? `The letter:\n"""\n${text.slice(0, 8000)}\n"""` : [block!, { type: 'text' as const, text: 'Read this letter. JSON only.' }],
    maxTokens: 1500,
    keyInput: { file: sha(u) },
    timeoutMs: 60_000,
    schema: LETTER,
  }
  const reply = await askClaude(call)
  if (reply) {
    const parsed = LetterRead.safeParse(jsonIn(reply.text))
    // For text, the lender Claude names must be in the letter.
    if (parsed.success && (text === null || text.toLowerCase().includes(parsed.data.lender.toLowerCase()))) {
      read = tidyLetter(parsed.data)
      if (reply.from === 'claude') remember(call, reply.text)
    } else log('read-letter', parsed.success ? `lender ${parsed.data.lender} not in the text` : `bad JSON: ${parsed.error.issues[0]?.message}`)
  }
  if (!read && text !== null) read = readLetterText(text)
  if (!read) return fail('letter', u.fileName, text === null ? 'photo or PDF needs Claude (offline, no key, or no usable reply)' : 'no lender found in the text')
  const decline = toDecline(read)
  const findings: Finding[] = [
    { label: 'Declined by', value: [read.lender, read.product, read.date ? E.fmtDate(read.date) : null].filter(Boolean).join(', '), tone: 'bad' },
    { label: 'Reason given', value: read.reasons.length ? read.reasons.join(' ') : `None specific.${read.cra ? ` Used ${read.cra} data plus its own criteria.` : ''}`, tone: 'neutral' },
  ]
  log('upload:letter', `${u.fileName}: ${read.lender}, ${read.product ?? 'no product'}, ${read.date ?? 'no date'}, cra ${read.cra ?? 'none'}, ${read.reasons.length} reasons`)
  return ok({ fileKind: 'letter', decline, findings }, u.fileName, findings)
}
