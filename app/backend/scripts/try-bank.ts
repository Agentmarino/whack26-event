// Read a bank CSV the way POST /api/upload does: pnpm --filter backend exec tsx scripts/try-bank.ts [file.csv]
import { readFileSync } from 'node:fs'
import { parseBankCsv, readBank } from '../src/bank.ts'
const file = process.argv[2] ?? new URL('../data/samples/priya-bank.csv', import.meta.url).pathname
const p = parseBankCsv(readFileSync(file, 'utf8'))
if (!p.ok) throw new Error(p.why)
const r = await readBank(p.txns)
console.log(JSON.stringify(r.bank), 'netIncome', r.netIncome, r.sortedBy)
for (const f of r.findings) console.log(' ', f.label, '|', f.value)
