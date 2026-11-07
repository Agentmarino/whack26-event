// GET /api/paper/:sessionId.pdf: the one- to two-page summary the agent slides across the desk.
// Built from the engine result only (engine strings, engine numbers), never from Claude's wording,
// so every number on the sheet is the engine's. paperModel() is the content; renderPaper() lays it out.

import PDFDocument from 'pdfkit'
import type { EngineResult, PlanId } from 'shared'
import * as E from '../engine/index.ts'

export type PaperModel = {
  name: string | null
  date: string
  score: { value: number; scaleMax: number; bureau: string }
  headline: string
  reasons: Array<{ label: string; health: string; reason: string; evidence: string }>
  flags: string[]
  plan: { id: PlanId; months: number; steps: Array<{ date: string; title: string; instruction: string }> }
  projections: Array<{ plan: PlanId; low: number; high: number; by: string; chosen: boolean }>
  riskLine: number
  ladder: { entry: string | null; applyFrom: string | null; reason: string; putOnCard: string | null; checklist: Array<{ label: string; when: string; ok: boolean }> } | null
  decline: { lender: string; product: string | null; reasons: Array<{ likelihood: string; title: string; evidence: string }>; fix: string; reapply: string; rights: string[] } | null
}

const HEALTH: Record<string, string> = { red: 'Needs work', amber: 'Getting there', green: 'Good' }

export function paperModel(res: EngineResult, plan: PlanId): PaperModel {
  const r = res.result
  const p = r.plans[plan]
  const end = (id: PlanId) => r.plans[id].projection.at(-1)
  const ladder = r.ladder
  const d = res.decline
  return {
    name: r.profile.name && r.profile.name !== 'You' ? r.profile.name : null,
    date: E.fmtDate(new Date()),
    score: { value: r.profile.score ?? 0, scaleMax: r.scaleMax, bureau: r.bureau },
    headline: r.headline,
    reasons: r.diagnosis.ranked.slice(0, 3).map(f => ({ label: f.label, health: HEALTH[f.rag] ?? f.rag, reason: f.reason, evidence: f.because.dataPoint })),
    flags: r.diagnosis.flags,
    plan: { id: plan, months: plan === '3m' ? 3 : 6, steps: p.steps.map(s => ({ date: E.fmtDate(s.date), title: s.title, instruction: s.instruction })) },
    projections: (['3m', '6m'] as const).flatMap(id => {
      const e = end(id)
      return e ? [{ plan: id, low: e.low, high: e.high, by: e.date, chosen: id === plan }] : []
    }),
    riskLine: r.riskLine,
    ladder: ladder
      ? {
          entry: ladder.entry?.name ?? null,
          applyFrom: ladder.applyFrom ? E.fmtMonth(ladder.applyFrom) : null,
          reason: ladder.reason,
          putOnCard: ladder.tx?.chosen.length
            ? `${ladder.tx.chosen.map(x => `${x.name} ${E.gbp2(x.amount)}`).join(', ')}: ${E.gbp2(ladder.tx.total)} a month`
            : null,
          checklist: ladder.graduation.map(g => ({ label: g.label, when: g.when, ok: g.ok })),
        }
      : null,
    decline: d
      ? {
          lender: d.lender,
          product: d.product ?? null,
          reasons: d.reasons.map(x => ({ likelihood: x.likelihood, title: x.title, evidence: x.evidence })),
          fix: `${d.fix.title}. ${d.fix.how}`,
          reapply: `Not before ${d.reapply.when}. ${d.reapply.how}`,
          rights: d.rights,
        }
      : null,
  }
}

/** The standard PDF fonts only cover Windows-1252: swap the few characters the engine uses outside it. */
const safe = (t: string) =>
  t
    .replace(/[−–—]/g, '-')
    .replace(/→/g, '->')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/·/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7e -ÿ‘’“”€•]/g, '')

const INK = '#1b1f2a'
const SOFT = '#5a6070'
const RULE = '#c9ccd3'
const ACCENT = '#a3252b'

export function renderPaper(m: PaperModel): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 44, bottom: 40, left: 50, right: 50 }, info: { Title: 'Your credit check', Author: 'Capital One desk (WHACK 26 demo)' } })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))))
  const W = doc.page.width - 100

  const text = (t: string, size: number, opts: PDFKit.Mixins.TextOptions & { font?: string; color?: string } = {}) => {
    const { font = 'Helvetica', color = INK, ...rest } = opts
    doc.font(font).fontSize(size).fillColor(color).text(safe(t), { width: W, lineGap: 1.5, ...rest })
  }
  const section = (title: string) => {
    if (doc.y > doc.page.height - 120) doc.addPage()
    doc.moveDown(0.7)
    const y = doc.y
    doc.moveTo(50, y).lineTo(50 + W, y).lineWidth(0.6).strokeColor(RULE).stroke()
    doc.moveDown(0.35)
    text(title.toUpperCase(), 8.5, { font: 'Helvetica-Bold', color: SOFT, characterSpacing: 0.8 })
    doc.moveDown(0.25)
  }
  const bullet = (lead: string, rest: string, size = 9.2) => {
    doc.font('Helvetica-Bold').fontSize(size).fillColor(INK).text(safe(lead), { width: W, continued: Boolean(rest), lineGap: 1.5 })
    if (rest) doc.font('Helvetica').fillColor(INK).text(safe(` ${rest}`), { lineGap: 1.5 })
    doc.moveDown(0.2)
  }

  // Header
  text('Your credit check', 20, { font: 'Helvetica-Bold' })
  text(`${m.name ? `${m.name}, ` : ''}${m.date}. From the Capital One desk.`, 9, { color: SOFT })
  doc.moveDown(0.5)
  text(`${m.score.value} out of ${m.score.scaleMax} (${m.score.bureau})`, 13, { font: 'Helvetica-Bold', color: ACCENT })
  doc.moveDown(0.15)
  text(m.headline, 10.5)

  section('What is holding your score back')
  for (const r of m.reasons) {
    bullet(`${r.label} (${r.health}).`, r.reason)
    text(`Evidence: ${r.evidence}`, 8.2, { color: SOFT })
    doc.moveDown(0.25)
  }
  if (m.flags.length) text(`In your spending: ${m.flags.join('; ')}.`, 9)

  if (m.decline) {
    section(`Your ${m.decline.lender} letter`)
    for (const r of m.decline.reasons) bullet(`${r.likelihood}: ${r.title}.`, r.evidence)
    bullet('The one fix:', m.decline.fix)
    bullet('Reapply:', m.decline.reapply)
  }

  section(`Your ${m.plan.months}-month plan`)
  for (const s of m.plan.steps) bullet(`${s.date}. ${s.title}.`, s.instruction, 8.8)

  section('Where it could take you (estimate)')
  for (const p of m.projections)
    bullet(`${p.plan === '3m' ? '3-month' : '6-month'} plan${p.chosen ? ' (yours)' : ''}:`, `${p.low} to ${p.high} by ${p.by}. An estimate, not a promise.`)
  text(`One missed payment could cost about ${Math.abs(m.riskLine)} points, so keep every Direct Debit in place.`, 9, { color: SOFT })

  if (m.ladder) {
    section('Your next card')
    if (m.ladder.entry) bullet(`${m.ladder.entry}${m.ladder.applyFrom ? `, from ${m.ladder.applyFrom}` : ''}.`, `${m.ladder.reason} Check with QuickCheck first: it is a soft search and leaves no mark.`)
    else text(m.ladder.reason, 9.2)
    if (m.ladder.putOnCard) bullet('Put on it:', m.ladder.putOnCard)
    if (m.ladder.checklist.length) {
      text('Before the next card:', 9.2, { font: 'Helvetica-Bold' })
      for (const g of m.ladder.checklist) text(`${g.ok ? '[x]' : '[ ]'} ${g.label}: ${g.when}`, 8.8)
    }
  }

  if (m.decline?.rights.length) {
    section('Your rights')
    for (const r of m.decline.rights) text(`- ${r}`, 8.8)
  }

  doc.moveDown(0.8)
  text('Estimates for a demo. Not financial advice and not a lending decision.', 8, { color: SOFT })
  doc.end()
  return done
}
