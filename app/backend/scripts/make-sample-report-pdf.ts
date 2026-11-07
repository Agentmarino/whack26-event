// Makes data/samples/sample-credit-report.pdf from Alex's mock report JSON, to test (and demo) Claude
// reading a PDF report. Clearly marked as a made-up sample, not a real agency document.
//   pnpm --filter backend exec tsx scripts/make-sample-report-pdf.ts

import { readFileSync, writeFileSync } from 'node:fs'
import PDFDocument from 'pdfkit'

type Acc = { lender: string; type: string; opened: string; status: string; limit?: number; balance?: number; apr?: number; monthlyPayment?: number; directDebit?: boolean; paymentPattern?: string; paymentHistory?: Array<{ month: string; status: string }> }
const j = JSON.parse(readFileSync(new URL('../data/personas/mock-credit-report.json', import.meta.url), 'utf8'))
const out = new URL('../data/samples/sample-credit-report.pdf', import.meta.url).pathname

const doc = new PDFDocument({ size: 'A4', margin: 48 })
const chunks: Buffer[] = []
doc.on('data', (c: Buffer) => chunks.push(c))
doc.on('end', () => {
  writeFileSync(out, Buffer.concat(chunks))
  console.log(`wrote ${out}`)
})
const h = (t: string) => doc.moveDown(0.6).font('Helvetica-Bold').fontSize(12).text(t).moveDown(0.2).font('Helvetica').fontSize(9.5)
const line = (t: string) => doc.text(t.replace(/−/g, '-'))

doc.font('Helvetica').fontSize(8).fillColor('#a00').text('SAMPLE REPORT MADE UP FOR THE WHACK 26 DEMO. NOT A REAL CREDIT REPORT.').fillColor('#000')
doc.moveDown(0.5).font('Helvetica-Bold').fontSize(18).text(`${j.provider} credit report`)
doc.font('Helvetica').fontSize(10).text(`Report date: ${j.reportDate}`)
h('Your score')
line(`${j.score.value} out of ${j.score.scaleMax} (${j.score.band})`)
h('Personal details')
line(`Name: ${j.personal.name}`)
line(`Date of birth: ${j.personal.dateOfBirth}`)
line(`Declared income: £${j.personal.declaredIncome.toLocaleString('en-GB')} a year`)
line(`Residential status: ${j.personal.residentialStatus}`)
h('Addresses')
for (const a of j.addresses) line(`${a.address}: from ${a.from}${a.to ? ` to ${a.to}` : ' (current)'}`)
h('Electoral roll')
for (const e of j.electoralRoll) line(`${e.address}: ${e.registered ? 'registered' : 'not registered'}`)
h('Accounts')
for (const a of j.accounts as Acc[]) {
  doc.font('Helvetica-Bold').text(`${a.lender} (${a.type.replace(/_/g, ' ')})`).font('Helvetica')
  line(
    [
      `Opened ${a.opened}, ${a.status}`,
      a.limit != null ? `limit £${a.limit.toLocaleString('en-GB')}` : null,
      a.balance != null ? `balance £${a.balance.toLocaleString('en-GB')}` : null,
      a.apr != null ? `APR ${a.apr}%` : null,
      a.monthlyPayment != null ? `£${a.monthlyPayment} a month` : null,
      a.directDebit != null ? `Direct Debit: ${a.directDebit ? 'yes' : 'no'}` : null,
      a.paymentPattern ? `pays: ${a.paymentPattern}` : null,
    ]
      .filter(Boolean)
      .join(', '),
  )
  if (a.paymentHistory?.length) line(`Payment history: ${a.paymentHistory.map(p => `${p.month} ${p.status === 'OK' ? 'OK' : `${p.status} late`}`).join(', ')}`)
}
h('Searches')
for (const s of j.searches) line(`${s.date}: ${s.organisation}, ${s.purpose} (${s.type} search)`)
h('Public records and defaults')
line(j.publicRecords.length || j.defaults.length ? 'See below' : 'None')
h('Financial associates')
for (const a of j.financialAssociates) line(`${a.name}: ${a.reason}${a.stillLinked ? ' (still linked)' : ''}`)
doc.end()
