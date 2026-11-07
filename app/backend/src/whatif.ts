// What-ifs: free text → the engine's levers (Claude, validated with ClaudeChange; a keyword reader
// when Claude is off or unsure) → engine whatIf() → a `whatif` message quoting the chosen plan.
// Claude never computes: a paydown amount must be a number the person actually said.

import { ClaudeChange } from 'shared'
import type { Change, Profile, WhatIfRun } from 'shared'
import { z } from 'zod'
import * as E from '../engine/index.ts'
import { askClaude, jsonIn, log, remember } from './claude.ts'
import type { Session } from './session.ts'
import * as T from './templates.ts'

export const LEVERS = ['paydown', 'stop', 'electoralRoll', 'removeAssociates', 'clearCard', 'rentReporting'] as const

const SYSTEM = `You turn a person's "what if" question about their UK credit into the levers of a credit engine.
Only these levers exist (JSON):
- {"lever":"paydown","value":<pounds per month extra off credit cards>}  only an amount the person said
- {"lever":"stop","what":"bnpl"|"gambling"|"payday"}  stop buy now pay later (Klarna, Clearpay...), gambling, or payday loans
- {"lever":"electoralRoll","value":true}  register to vote / get on the electoral roll (false = come off it)
- {"lever":"removeAssociates"}  break a financial link to someone else (an ex, a flatmate)
- {"lever":"clearCard","card":"<card name>"}  clear one card in full (omit "card" for all cards)
- {"lever":"rentReporting","value":true}  get rent reported to the credit agencies
Reply with JSON only, no prose: {"changes":[...]}. Several levers are fine.
If nothing fits, reply {"changes":[],"reason":"<a few words>"}. Never invent an amount; never use any other lever.`

const Reply = z.object({ changes: z.array(z.unknown()), reason: z.string().optional() })

type FromText = { changes: Change[]; from: 'claude' | 'cache' | 'keywords' } | { unknown: true; why: string }

const WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
}
const WORD_RUN = /\b((?:(?:a|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|grand|and)(?:[\s-]+|$))+)/g

/** Numbers the person wrote, in pounds: "300", "£1,200", "1.2k", "two hundred", "a grand". */
export function amountsIn(text: string): number[] {
  const out: number[] = []
  for (const m of text.replace(/,/g, '').matchAll(/£?\s*(\d+(?:\.\d+)?)\s*(k\b|grand)?/gi)) {
    const n = Number(m[1]) * (m[2] ? 1000 : 1)
    if (Number.isFinite(n)) out.push(n)
  }
  for (const m of text.toLowerCase().matchAll(WORD_RUN)) {
    let total = 0
    let cur = 0
    let scaled = false
    for (const w of m[1]!.split(/[\s-]+/)) {
      if (WORDS[w] !== undefined) {
        cur += WORDS[w]!
      } else if (w === 'hundred') {
        cur = (cur || 1) * 100
        scaled = true
      } else if (w === 'thousand' || w === 'grand') {
        total += (cur || 1) * 1000
        cur = 0
        scaled = true
      }
    }
    total += cur
    // "a" or "and" alone is not an amount; small bare words ("three months") are not pounds either.
    if (total >= 10 && (scaled || total >= 20)) out.push(total)
  }
  return out
}

/** Validate Claude's levers: known levers only, a paydown amount the person said, card names that exist. */
export function checkClaudeChanges(raw: unknown[], text: string, profile: Profile): { ok: true; changes: Change[] } | { ok: false; why: string } {
  const changes: Change[] = []
  const said = amountsIn(text)
  const cards = (profile.cards ?? []).map(c => c.name)
  for (const item of raw) {
    const lever = (item as { lever?: unknown })?.lever
    if (typeof lever !== 'string' || !(LEVERS as readonly string[]).includes(lever)) return { ok: false, why: `unknown lever ${JSON.stringify(lever)}` }
    const parsed = ClaudeChange.safeParse(item)
    if (!parsed.success) return { ok: false, why: `bad ${lever}: ${parsed.error.issues[0]?.message ?? 'invalid'}` }
    const c = parsed.data
    if (c.lever === 'paydown' && !said.includes(c.value)) return { ok: false, why: `paydown ${c.value} is not a number the person said` }
    if (c.lever === 'clearCard' && c.card && !cards.includes(c.card)) {
      const match = cards.find(n => n.toLowerCase() === c.card!.toLowerCase())
      if (!match) return { ok: false, why: `no card called ${c.card}` }
      c.card = match
    }
    changes.push(c)
  }
  return changes.length ? { ok: true, changes } : { ok: false, why: 'no levers' }
}

/** The keyword reader: used when Claude is off, fails, or is unsure. */
export function keywordChanges(text: string, profile: Profile): Change[] {
  const t = text.toLowerCase()
  const out: Change[] = []
  const cards = (profile.cards ?? []).map(c => c.name)
  const named = cards.find(n => t.includes(n.toLowerCase()))
  const clearing = /\b(clear(ed|ing)?|(pay|paid|paying) (it |them |my \w+ )?off)\b/.test(t)
  const amounts = amountsIn(t).filter(n => n > 0)
  // An amount means a monthly paydown ("pay £300 a month", "300 extra"), unless it is about rent.
  if (amounts.length && !/\brent\b/.test(t)) out.push({ lever: 'paydown', value: amounts[0]! })
  else if (clearing && (named || /card|balance|debt/.test(t))) out.push(named ? { lever: 'clearCard', card: named } : { lever: 'clearCard' })
  if (/bnpl|buy now|pay later|klarna|clearpay|laybuy|paypal (in|pay) 3/.test(t)) out.push({ lever: 'stop', what: 'bnpl' })
  if (/gambl|betting|\bbet\b|bet365|casino|lottery|scratch/.test(t)) out.push({ lever: 'stop', what: 'gambling' })
  if (/payday/.test(t)) out.push({ lever: 'stop', what: 'payday' })
  if (/electoral|register(ed)? to vote|voting|\bvote\b/.test(t)) out.push({ lever: 'electoralRoll', value: !/come off|remove me|unregister|leave/.test(t) })
  if (/associate|financial link|\bex\b|ex-partner|joint account|disassociat/.test(t)) out.push({ lever: 'removeAssociates' })
  if (/rent/.test(t) && /report|credit ?ladder|count|track/.test(t)) out.push({ lever: 'rentReporting', value: true })
  return out
}

export async function changesFromText(text: string, profile: Profile): Promise<FromText> {
  const cards = (profile.cards ?? []).map(c => c.name)
  const content = `The person's cards: ${cards.length ? cards.join(', ') : 'none'}.\nTheir question: ${text.trim()}`
  const call = { purpose: 'whatif', system: SYSTEM, content, maxTokens: 300, keyInput: { text: text.trim().toLowerCase(), cards } }
  const reply = await askClaude(call)
  if (reply) {
    const parsed = Reply.safeParse(jsonIn(reply.text))
    if (parsed.success) {
      const checked = checkClaudeChanges(parsed.data.changes, text, profile)
      if (checked.ok) {
        if (reply.from === 'claude') remember(call, reply.text)
        return { changes: checked.changes, from: reply.from }
      }
      log('whatif', `rejected: ${checked.why}`)
    } else log('whatif', 'reply was not {changes: []}')
  }
  const kw = keywordChanges(text, profile)
  return kw.length ? { changes: kw, from: 'keywords' } : { unknown: true, why: 'nothing matched' }
}

/** Run the engine and keep the run on the session, by id. */
export function runWhatIf(s: Session, changes: Change[], text: string | null): WhatIfRun {
  const res = s.result
  if (!res) throw new Error('runWhatIf before the analysis')
  s.whatIfCount += 1
  const run: WhatIfRun = { id: `wi-${s.whatIfCount}`, text, changes, output: E.whatIf(structuredClone(res.profile), changes) }
  s.whatIfs[run.id] = run
  return run
}

export type WhatIfOut = { ok: true; run: WhatIfRun; draft: T.Draft } | { ok: false; draft: T.Draft }

export async function whatIfFromText(s: Session, text: string): Promise<WhatIfOut> {
  const res = s.result!
  const got = await changesFromText(text, res.profile)
  if ('unknown' in got) return { ok: false, draft: T.whatIfUnknown() }
  const run = runWhatIf(s, got.changes, text)
  return { ok: true, run, draft: T.whatIfMessage(res, run, s.plan ?? s.horizon) }
}

export function whatIfFromChanges(s: Session, changes: Change[]): WhatIfOut {
  const res = s.result!
  const run = runWhatIf(s, changes, null)
  return { ok: true, run, draft: T.whatIfMessage(res, run, s.plan ?? s.horizon) }
}
