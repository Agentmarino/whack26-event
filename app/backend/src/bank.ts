// Bank statements → the engine's Profile.bank. A CSV is read here; a PDF or photo is first turned
// into transaction rows by Claude (ingest.ts). Payees are sorted by keywords first; Claude is asked
// only about the payees the keywords do not know. Amounts are summed here, never by Claude.

import type { Finding, Profile } from 'shared'
import { z } from 'zod'
import * as E from '../engine/index.ts'
import { askClaude, jsonIn, log, remember } from './claude.ts'

export type Txn = { date: string; description: string; amount: number; type?: string; balance?: number }

export const CATEGORIES = [
  'income', 'rent', 'council_tax', 'utility', 'phone', 'broadband', 'subscription', 'bnpl', 'gambling', 'payday',
  'groceries', 'transport', 'eating_out', 'savings', 'debt_payment', 'transfer', 'fee', 'other',
] as const
export type Category = (typeof CATEGORIES)[number]

const RULES: Array<[Category, RegExp]> = [
  ['income', /salary|wages|payroll|\bpay\b.*\bltd\b|hmrc|student finance|\bslc\b|universal credit|\bdwp\b|pension/],
  ['rent', /\brent\b|lettings?\b|letting agent|landlord|estates? agent/],
  ['council_tax', /council|ctax|council tax/],
  ['utility', /octopus|british gas|\bedf\b|e\.?on\b|\bovo\b|bulb|scottish power|so energy|water|thames|severn trent|anglian|energy|electric|\bgas\b/],
  ['phone', /\bee\b|\bo2\b|vodafone|\bthree\b|giffgaff|tesco mobile|sky mobile|lebara|voxi|smarty|id mobile|lyca/],
  ['broadband', /\bbt\b|virgin media|\bsky\b|talktalk|plusnet|hyperoptic|community fibre|broadband/],
  ['subscription', /netflix|spotify|disney|amazon prime|prime video|apple\.com|icloud|youtube|now tv|\bgym\b|puregym|the gym|xbox|playstation|audible|deliveroo plus|patreon|dazn/],
  ['bnpl', /klarna|clearpay|laybuy|paypal pay in 3|pay in 3|zilch|afterpay|\bpaypal credit\b/],
  ['gambling', /bet365|betfair|paddy ?power|william hill|ladbrokes|\bcoral\b|sky ?bet|betfred|casino|lottery|\b888\b|pokerstars|betway|unibet/],
  ['payday', /lending stream|mr lender|quickquid|wonga|payday|cashfloat|polar credit|drafty|moneyboat|fernovo/],
  ['groceries', /tesco|sainsbury|asda|\baldi\b|\blidl\b|morrisons|waitrose|co-?op|m&s food|iceland|ocado|farmfoods|spar\b/],
  ['transport', /\btfl\b|trainline|\buber\b(?!.*eats)|\bbolt\b|national rail|stagecoach|arriva|\bbus\b|\btrain\b|shell|\bbp\b|esso|petrol|parking|first bus|railcard|national express/],
  ['eating_out', /deliveroo|just eat|uber ?eats|mcdonald|greggs|\bpret\b|costa|starbucks|nando|\bkfc\b|pizza|restaurant|\bcafe\b|caf[eé]|coffee|\bpub\b|\bbar\b|takeaway/],
  ['savings', /savings|\bisa\b|moneybox|\bplum\b|\bchip\b|premium bonds|ns&i/],
  ['debt_payment', /barclaycard|capital one|vanquis|\baqua\b|amex|american express|\bmbna\b|credit card|card payment|\bloan\b|zopa|\bnewday\b/],
  ['fee', /late (payment )?fee|unpaid item|returned (item|payment)|overdraft (fee|charge|interest)|\bcharge\b/],
  ['transfer', /transfer to|tfr|to savings|from savings|\bpot\b/],
]

/** Keyword category, or null when the keywords do not know the payee. */
export function categorise(description: string): Category | null {
  const d = description.toLowerCase()
  for (const [cat, re] of RULES) if (re.test(d)) return cat
  return null
}

/** "SPOTIFY P1A2B3" → "Spotify", "KLARNA*ASOS" → "Klarna Asos". */
export function payeeName(description: string): string {
  const words = description
    .replace(/[*#]/g, ' ')
    .replace(/\b(sq|pp|paypal|card \d+|\d{3,}|[a-z]\d[a-z\d]+)\b/gi, ' ')
    .replace(/\.(com|co\.uk)\b/gi, '')
    .replace(/\b(ltd|limited|plc|uk|gb|dd|s\/mkt|stores?)\b/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
  const small = new Set(['by', 'of', 'the', 'and', 'at', 'on'])
  const name = words
    .map((w, i) => (i > 0 && small.has(w.toLowerCase()) ? w.toLowerCase() : w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ')
  return name || description.trim()
}

// ---------- CSV ----------

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') q = false
      else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ',' || ch === ';' || ch === '\t') {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map(s => s.trim())
}

const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** 2026-08-01, 01/08/2026, 01/08/26, 1 Aug 2026 → 2026-08-01. UK order (day first). */
export function isoDate(s: string): string | null {
  const t = s.trim()
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2]!.padStart(2, '0')}-${m[3]!.padStart(2, '0')}`
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (m) return `${m[3]!.length === 2 ? `20${m[3]}` : m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`
  m = t.match(/^(\d{1,2})\s+([a-z]{3})[a-z]*\s+(\d{4})/i)
  if (m && MON.includes(m[2]!.toLowerCase())) return `${m[3]}-${String(MON.indexOf(m[2]!.toLowerCase()) + 1).padStart(2, '0')}-${m[1]!.padStart(2, '0')}`
  return null
}

const money = (s: string | undefined): number | null => {
  if (s == null) return null
  const t = s.replace(/[£,\s]/g, '').replace(/^\((.*)\)$/, '-$1')
  if (!t) return null
  const n = Number(t.replace(/(CR|DR)$/i, ''))
  return Number.isFinite(n) ? (/DR$/i.test(t) ? -Math.abs(n) : n) : null
}

/** Rows from a bank CSV (Monzo, Starling, Barclays, HSBC, Nationwide style headers). */
export function parseBankCsv(text: string): { ok: true; txns: Txn[] } | { ok: false; why: string } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim())
  const headerAt = lines.findIndex(l => /date/i.test(l) && /(amount|paid|money|debit|credit|value|out|in)/i.test(l))
  if (headerAt < 0) return { ok: false, why: 'no header row with a date and an amount column' }
  const head = splitCsvLine(lines[headerAt]!).map(h => h.toLowerCase())
  const col = (re: RegExp) => head.findIndex(h => re.test(h))
  const iDate = col(/date/)
  const iDesc = col(/description|payee|name|details|narrative|merchant|transaction$|memo|reference/)
  const iAmt = col(/^amount|^value|amount \(|amount$/)
  const iOut = col(/paid out|money out|debit|withdrawn|out$/)
  const iIn = col(/paid in|money in|credit|deposit|in$/)
  const iType = col(/^type|transaction type/)
  const iBal = col(/balance/)
  if (iDate < 0 || iDesc < 0 || (iAmt < 0 && iOut < 0 && iIn < 0)) return { ok: false, why: `columns not recognised: ${head.join(', ')}` }
  const txns: Txn[] = []
  for (const line of lines.slice(headerAt + 1)) {
    const c = splitCsvLine(line)
    const date = isoDate(c[iDate] ?? '')
    if (!date) continue
    let amount = iAmt >= 0 ? money(c[iAmt]) : null
    if (amount === null) {
      const out = iOut >= 0 ? money(c[iOut]) : null
      const inn = iIn >= 0 ? money(c[iIn]) : null
      amount = (inn ?? 0) - Math.abs(out ?? 0)
    }
    const description = (c[iDesc] ?? '').trim()
    if (!description) continue
    const bal = iBal >= 0 ? money(c[iBal]) : null
    txns.push({ date, description, amount, ...(iType >= 0 && c[iType] ? { type: c[iType] } : {}), ...(bal !== null ? { balance: bal } : {}) })
  }
  return txns.length ? { ok: true, txns } : { ok: false, why: 'no transaction rows' }
}

// ---------- categories → Profile.bank ----------

const ClaudeCats = z.object({ categories: z.record(z.string(), z.enum(CATEGORIES)) })

/** Ask Claude about the payees the keywords do not know. Only the names go out, never amounts. */
async function claudeCategories(unknown: string[]): Promise<Map<string, Category>> {
  const out = new Map<string, Category>()
  if (!unknown.length) return out
  const list = unknown.slice(0, 60)
  const call = {
    purpose: 'bank-payees',
    system: `You sort UK bank statement payees into categories. Categories: ${CATEGORIES.join(', ')}.
"bnpl" = buy now pay later (Klarna, Clearpay...), "payday" = payday or short-term loans, "debt_payment" = paying a credit card or loan, "other" = general shopping or anything else.
Reply with JSON only: {"categories": {"<payee exactly as given>": "<category>"}}.`,
    content: `Payees:\n${list.map(p => `- ${p}`).join('\n')}`,
    maxTokens: 60 + 25 * list.length,
    keyInput: list.slice().sort(),
  }
  const reply = await askClaude(call)
  const parsed = reply ? ClaudeCats.safeParse(jsonIn(reply.text)) : null
  if (parsed?.success) {
    for (const [k, v] of Object.entries(parsed.data.categories)) if (list.includes(k)) out.set(k, v)
    if (reply?.from === 'claude') remember(call, reply.text)
  } else if (reply) log('bank-payees', 'reply was not {categories: {...}}')
  return out
}

export type BankRead = {
  bank: NonNullable<Profile['bank']>
  netIncome: number | null
  findings: Finding[]
  months: number
  /** How each payee was sorted, for the log and the debug panel. */
  sortedBy: { keywords: number; claude: number; unknown: number }
}

export async function readBank(txns: Txn[]): Promise<BankRead> {
  const months = Math.max(1, new Set(txns.map(t => t.date.slice(0, 7))).size)
  const cats = new Map<string, Category | null>()
  for (const t of txns) if (!cats.has(t.description)) cats.set(t.description, categorise(t.description))
  const unknown = [...cats].filter(([, c]) => c === null).map(([d]) => d)
  const fromClaude = await claudeCategories(unknown)
  for (const [d, c] of fromClaude) cats.set(d, c)
  const sortedBy = { keywords: [...cats.values()].length - unknown.length, claude: fromClaude.size, unknown: unknown.length - fromClaude.size }

  const per = (n: number) => Math.round((n / months) * 100) / 100
  const total = (c: Category) => txns.filter(t => cats.get(t.description) === c).reduce((s, t) => s - t.amount, 0)
  const byPayee = (c: Category) => {
    const m = new Map<string, number>()
    for (const t of txns) if (cats.get(t.description) === c && t.amount < 0) m.set(payeeName(t.description), (m.get(payeeName(t.description)) ?? 0) - t.amount)
    return [...m].map(([name, sum]) => ({ name, amount: per(sum) }))
  }
  const incomeIn = txns.filter(t => cats.get(t.description) === 'income' && t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const rentRows = txns.filter(t => cats.get(t.description) === 'rent')
  const ninetyDaysAgo = (() => {
    const last = txns.map(t => t.date).sort().at(-1)!
    const d = new Date(`${last}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - 90)
    return d.toISOString().slice(0, 10)
  })()
  const recent = txns.filter(t => t.date >= ninetyDaysAgo)
  const overdraftDays = new Set(recent.filter(t => t.balance !== undefined && t.balance < 0).map(t => t.date)).size

  const bills = [...byPayee('utility'), ...byPayee('phone'), ...byPayee('broadband')]
  const bank: NonNullable<Profile['bank']> = {
    rent: per(total('rent')),
    rentByTransfer: !rentRows.some(t => /\bdd\b|direct debit/i.test(`${t.description} ${t.type ?? ''}`)),
    councilTax: per(total('council_tax')),
    bills,
    subscriptions: byPayee('subscription'),
    groceries: per(total('groceries')),
    transport: per(total('transport')),
    other: per(total('eating_out') + total('other')),
    bnpl: per(total('bnpl')),
    gambling: per(total('gambling')),
    payday: per(total('payday')),
    savings: per(total('savings')),
    cashAdvances: 0,
    lateFees3m: recent.filter(t => cats.get(t.description) === 'fee' && /late|unpaid|returned/i.test(t.description)).length,
    overdraftDays3m: overdraftDays,
    billsInOwnName: bills.some(b => b.amount > 0) || total('council_tax') > 0,
  }
  const netIncome = incomeIn > 0 ? Math.round(per(incomeIn)) : null

  // Findings, in the order parseReport shows them for a report's bank data.
  const findings: Finding[] = []
  const F = (label: string, value: string, tone: Finding['tone'] = 'neutral') => findings.push({ label, value, tone })
  F('Statement', `${txns.length} transactions over ${months} month${months === 1 ? '' : 's'}`)
  if (netIncome) F('Income', `${E.gbp(netIncome)}/month take-home`)
  if (bank.rent) F('Rent', `${E.gbp(bank.rent)}/month by ${bank.rentByTransfer ? 'bank transfer' : 'Direct Debit'}`)
  const billText = [bank.councilTax ? `Council Tax ${E.gbp(bank.councilTax)}` : null, ...bills.map(b => `${b.name} ${E.gbp(b.amount)}`)].filter(Boolean).join(' · ')
  if (billText) F('Bills', billText)
  if (bank.subscriptions?.length) F('Subscriptions', bank.subscriptions.map(s => `${s.name} ${E.gbp2(s.amount)}`).join(' · '))
  F('Everyday spending', `Groceries ${E.gbp(bank.groceries ?? 0)} · transport ${E.gbp(bank.transport ?? 0)} · other ${E.gbp(bank.other ?? 0)} a month`)
  if (bank.bnpl) F('Buy now, pay later', `${E.gbp(bank.bnpl)}/month`, 'warn')
  if (bank.gambling) F('Gambling', `${E.gbp(bank.gambling)}/month`, 'bad')
  if (bank.payday) F('Payday loans', `${E.gbp(bank.payday)}/month`, 'bad')
  if (bank.lateFees3m) F('Late fees', `${bank.lateFees3m} in 90 days`, 'bad')
  if (bank.overdraftDays3m) F('Overdraft', `${bank.overdraftDays3m} days overdrawn in 90 days`, 'warn')
  return { bank, netIncome, findings, months, sortedBy }
}
