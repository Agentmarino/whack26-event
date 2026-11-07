// What-ifs: free text → the engine's levers (Claude, validated with ClaudeChange; a keyword reader
// when Claude is off or unsure) → engine whatIf() → a `whatif` message quoting the chosen plan.
// Claude never computes: a paydown amount must be a number the person actually said.

import { ClaudeChange, EngineWhatIf } from 'shared'
import type { Change, Profile, WhatIfRun } from 'shared'
import { z } from 'zod'
import * as E from '../engine/index.ts'
import { askClaude, jsonIn, log, remember } from './claude.ts'
import { WHATIF } from './schemas.ts'
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
Coming off, being removed from, leaving or not being on the electoral roll is {"lever":"electoralRoll","value":false}.
Money that arrives (winning the lottery, a bet, an inheritance, a bonus, a pay rise) is not a lever: nothing fits.
"stop" is only for someone who says they'd stop or cut out that spending.
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

// Money arriving is not something the engine models. "What if I win the lottery" used to read as
// "stop gambling" (114 review). Windfall words are removed before looking for an action, so "a pay rise" is not "pay".
const WINDFALL = /\b(win|wins|won|winning|winnings|lottery|lotto|jackpot|premium bonds?|inherit\w*|inheritance|windfall|bonus|pay ?rise|payrise|promotion|gift(ed)?)\b/g
const ACTION = /\b(pay|paid|paying|put|putting|clear\w*|stop\w*|quit\w*|give up|gave up|cut\w*|regist\w*|report\w*|break|remov\w*|cancel\w*)\b/
/** Lower case with straight apostrophes (iPhone keyboards type ’). */
const norm = (text: string) => text.toLowerCase().replace(/[\u2018\u2019]/g, "'")

/** True when the question is only about money arriving ("what if I win the lottery"), with nothing done with it. */
export function windfallOnly(text: string): boolean {
  const t = norm(text)
  if (!t.match(WINDFALL)) return false
  return !ACTION.test(t.replace(WINDFALL, ' '))
}

// Stop levers need the person to say they'd stop: "what if I play the lottery" is not "stop gambling".
const STOPPING = /\b(stop\w*|quit\w*|give up|giving up|gave up|cut(ting)? (out|back|down)|no more|without|didn'?t|don'?t|do not|did not|never|cancel\w*|ban\w*|block\w*|self-?exclu\w*|less|fewer|ditch\w*)\b/

// The electoral roll, read per clause so "remove my ex and register to vote" still registers.
const ROLL = /electoral|\b(the|voting) roll\b|\bregist\w* to vote\b|\bvot(e|es|ing)\b/
const OFF_ROLL =
  /\b(come|comes|coming|came|get|gets|got|getting|go|goes|going|went|taken?|took|kicked|drop(s|ped|ping)?|fall(s|en|ing)?|fell)\s+(me\s+)?off\b|\boff (of )?the (electoral )?(roll|register)\b|\bremov(e|es|ed|ing|al)\b|\b(de|un)-?regist\w*|\b(leave|leaves|leaving|left)\b|\bno longer\b|\bstop(ped|ping)? (being|voting)\b/
const NOT_ON = /\b(wasn'?t|weren'?t|isn'?t|aren'?t|was not|were not|am not|not|never)\s+(on|registered)\b/
const REGISTERING = /(?<!(de|un)-?)\bregist(er|ers|ering|ration)\b|\b(get|getting|got|go|going|put me|sign(ed)? up|join(ed)?)\s+on\b/

/** Which way the electoral roll goes in this text: true = register, false = come off, null = not about the roll. */
export function rollDirection(text: string): boolean | null {
  const t = norm(text)
  const clauses = t.split(/\band\b|,|;|\bthen\b|\bplus\b|\balso\b/).filter(c => ROLL.test(c))
  if (!clauses.length) return null
  if (clauses.some(c => OFF_ROLL.test(c))) return false
  // "what if I wasn't on the roll" is coming off; "I'm not on the roll, what if I register" is registering.
  if (clauses.some(c => NOT_ON.test(c)) && !REGISTERING.test(t)) return false
  return true
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
    // Claude sometimes reads "remove me from the roll" as registering: the words decide the direction.
    if (c.lever === 'electoralRoll' && rollDirection(text) === false) c.value = false
    changes.push(c)
  }
  return changes.length ? { ok: true, changes } : { ok: false, why: 'no levers' }
}

/** The keyword reader: used when Claude is off, fails, or is unsure. */
export function keywordChanges(text: string, profile: Profile): Change[] {
  if (windfallOnly(text)) return []
  const t = norm(text)
  const out: Change[] = []
  const cards = (profile.cards ?? []).map(c => c.name)
  const named = cards.find(n => t.includes(n.toLowerCase()))
  const clearing = /\b(clear(ed|ing)?|(pay|paid|paying) (it |them |my \w+ )?off)\b/.test(t)
  // A monthly amount: prefer a £ figure, else the largest number; skip durations ("in 3 months") and the rent itself.
  const pounds = [...t.replace(/,/g, '').matchAll(/£\s?(\d+(?:\.\d+)?)\s*(k\b)?/g)].map(m => Number(m[1]) * (m[2] ? 1000 : 1))
  const durations = new Set([...t.replace(/,/g, '').matchAll(/(\d+)\s*(day|week|month|year)s?\b/g)].map(m => Number(m[1])))
  const rentAmounts = new Set([...t.replace(/,/g, '').matchAll(/rent\D{0,12}(\d+)|(\d+)\D{0,6}rent/g)].map(m => Number(m[1] ?? m[2])))
  const amounts = (pounds.length ? pounds : amountsIn(t).filter(n => !durations.has(n)))
    .filter(n => n > 0 && !rentAmounts.has(n))
    .sort((a, b) => b - a)
  // An amount means a monthly paydown ("pay £300 a month", "300 extra"), unless it is about rent.
  if (amounts.length) out.push({ lever: 'paydown', value: amounts[0]! })
  else if (clearing && (named || /card|balance|debt/.test(t))) out.push(named ? { lever: 'clearCard', card: named } : { lever: 'clearCard' })
  const stopping = STOPPING.test(t)
  if (stopping && /bnpl|buy now|pay later|klarna|clearpay|laybuy|paypal (in|pay) 3/.test(t)) out.push({ lever: 'stop', what: 'bnpl' })
  if (stopping && /gambl|betting|\bbets?\b|bet365|casino|lottery|scratch|bookies/.test(t)) out.push({ lever: 'stop', what: 'gambling' })
  if (stopping && /payday/.test(t)) out.push({ lever: 'stop', what: 'payday' })
  const roll = rollDirection(t)
  if (roll !== null) out.push({ lever: 'electoralRoll', value: roll })
  if (/associate|financial link|\bex\b|ex-partner|joint account|disassociat/.test(t)) out.push({ lever: 'removeAssociates' })
  if (/rent/.test(t) && /report|credit ?ladder|count|track/.test(t)) out.push({ lever: 'rentReporting', value: true })
  return out
}

export async function changesFromText(text: string, profile: Profile): Promise<FromText> {
  if (windfallOnly(text)) return { unknown: true, why: 'money arriving is not a lever' }
  const cards = (profile.cards ?? []).map(c => c.name)
  const content = `The person's cards: ${cards.length ? cards.join(', ') : 'none'}.\nTheir question: ${text.trim()}`
  const call = { purpose: 'whatif', system: SYSTEM, content, maxTokens: 1024 /* room for thinking as well as the JSON */, keyInput: { text: text.trim().toLowerCase(), cards }, schema: WHATIF }
  const reply = await askClaude(call)
  if (reply) {
    const parsed = Reply.safeParse(jsonIn(reply.text))
    // Claude saying nothing fits is an answer, not doubt: don't let the keyword reader guess instead.
    if (parsed.success && parsed.data.changes.length === 0) return { unknown: true, why: parsed.data.reason ?? 'nothing fits' }
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
/** `set` writes any profile path: never let it reach the object prototype. */
const UNSAFE_PATH = /(^|\.)(__proto__|constructor|prototype)(\.|$)/

/** Run the engine and keep the run on the session, by id. null when the changes or the engine's answer don't fit the contract. */
export function runWhatIf(s: Session, changes: Change[], text: string | null): WhatIfRun | null {
  const res = s.result
  if (!res) throw new Error('runWhatIf before the analysis')
  if (changes.some(c => c.lever === 'set' && UNSAFE_PATH.test(c.path))) return null
  let output
  try {
    output = EngineWhatIf.safeParse(E.whatIf(structuredClone(res.profile), changes))
    // Taking something away (off the roll, no rent reporting) is never shown as a gain. The engine treats
    // these as no change; if it ever says otherwise, answer with no change at all.
    if (output.success && changes.every(T.isRemoval) && T.rises(output.data)) {
      log('whatif', 'a removal came back as a rise: answered as no change')
      output = EngineWhatIf.safeParse(E.whatIf(structuredClone(res.profile), []))
    }
  } catch (err) {
    log('whatif', `engine: ${err instanceof Error ? err.message : err}`)
    return null
  }
  if (!output.success) {
    log('whatif', `engine answer does not fit the contract: ${output.error.issues[0]?.path.join('.')} ${output.error.issues[0]?.message}`)
    return null
  }
  s.whatIfCount += 1
  const run: WhatIfRun = { id: `wi-${s.whatIfCount}`, text, changes, output: output.data }
  s.whatIfs[run.id] = run
  return run
}

export type WhatIfOut = { ok: true; run: WhatIfRun; draft: T.Draft } | { ok: false; draft: T.Draft }

export async function whatIfFromText(s: Session, text: string): Promise<WhatIfOut> {
  const res = s.result!
  const got = await changesFromText(text, res.profile)
  if ('unknown' in got) return { ok: false, draft: T.whatIfUnknown() }
  const run = runWhatIf(s, got.changes, text)
  if (!run) return { ok: false, draft: T.whatIfUnknown() }
  return { ok: true, run, draft: T.whatIfMessage(res, run, s.plan ?? s.horizon) }
}

export function whatIfFromChanges(s: Session, changes: Change[]): WhatIfOut {
  const res = s.result!
  const run = runWhatIf(s, changes, null)
  if (!run) return { ok: false, draft: T.whatIfFailed() }
  return { ok: true, run, draft: T.whatIfMessage(res, run, s.plan ?? s.horizon) }
}
