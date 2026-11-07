// Quick check of the Claude what-if reader: pnpm --filter backend exec tsx scripts/try-whatif.ts "what if ..."
import { readFileSync } from 'node:fs'
import { changesFromText } from '../src/whatif.ts'
import { config } from '../src/config.ts'
const priya = JSON.parse(readFileSync(new URL('../data/personas/priya.json', import.meta.url), 'utf8'))
console.log(`model ${config.model}, offline ${config.offline}, key ${config.hasKey ? 'set' : 'missing'}`)
for (const text of process.argv.slice(2)) console.log(JSON.stringify(text), '->', JSON.stringify(await changesFromText(text, priya)))
