// Render a persona's summary PDF without the server: pnpm --filter backend exec tsx scripts/make-paper.ts priya 3m out.pdf
import { writeFileSync } from 'node:fs'
import { analyseProfile } from '../src/analysis.ts'
import { sample } from '../src/personas.ts'
import { paperModel, renderPaper } from '../src/paper.ts'
const [id = 'priya', plan = '3m', out = 'paper.pdf'] = process.argv.slice(2)
const s = sample(id)
if (!s) throw new Error(`no persona ${id}`)
const res = analyseProfile({ ...s.report, ...(s.bank ? { bank: s.bank } : {}), ...(s.decline ? { decline: s.decline } : {}) }, s.findings)
const pdf = await renderPaper(paperModel(res, plan === '6m' ? '6m' : '3m'))
writeFileSync(out, pdf)
const pages = (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length
console.log(`${out}: ${pdf.length} bytes, ${pages} page(s)`)
