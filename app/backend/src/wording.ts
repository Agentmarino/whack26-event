// Claude wording for the headline, each reason and each plan step, in the agent's voice.
// Per item: the cache, else one batched Claude call, the checker (numbers, style), one retry with the
// problems listed, then the template. Each message is tagged `claude` or `template`.
// Good outputs are cached per item (session-free key), so DEMO_OFFLINE=true replays them.

import type { AgentMessage, EngineResult } from 'shared'
import { z } from 'zod'
import * as E from '../engine/index.ts'
import { askClaude, jsonIn, log } from './claude.ts'
import { WORDING } from './schemas.ts'
import { cacheGet, cacheKey, cacheSet } from './cache.ts'
import { checkNumbers, checkStyle } from './checker.ts'
import { config } from './config.ts'
import { toMessage, type Wording } from './messages.ts'
import type { Session } from './session.ts'
import type { ClaudeItem, Draft } from './templates.ts'

/** How long a turn waits for Claude before it answers with templates (the call carries on and fills the cache). */
const TURN_BUDGET_MS = Number(process.env.WORDING_BUDGET_MS || 12_000)

type Item = { id: string; template: string; facts: string; key: string }

const SYSTEM = (plain: boolean) => `You are the friendly credit agent at the Capital One desk in a game-like app that helps people in the UK understand and fix their credit.
Rewrite each message below in your own voice: warm, calm, plain words, talking to the person as "you", British spelling.
Rules:
- One idea per message, at most 35 words.
- Use ONLY numbers, amounts, percentages, counts and dates that appear in that item's facts, written the same way. Never add, round, convert or calculate a number. If unsure, leave numbers out.
- Do not promise a score, an approval or a lending decision.
- Keep the meaning of the template. No greetings, no emoji, no markdown.
${plain ? '- Plain English: write for a reading age of about 9. Short words, short sentences. Explain any credit term in a few words (for example "utilisation, how much of your card limit you use").\n' : ''}Reply with JSON only: {"items":[{"id":"<id>","text":"<message>"}]} with one entry per item, same ids.`

const Reply = z.object({ items: z.array(z.object({ id: z.string(), text: z.string() })) })

/** The engine data an item's text may draw its numbers from. */
export function factsFor(item: ClaudeItem, res: EngineResult): string | null {
  const r = res.result
  switch (item.what) {
    case 'headline': {
      const top = r.diagnosis.ranked.slice(0, 3).map(f => `${f.label}: ${f.reason} (${f.because.dataPoint})`)
      // The engine's headline names its factors without counting them ("your utilisation and identity &
      // stability"); Claude often says "two things". Give the count as a fact so the checker can verify it.
      const named = r.diagnosis.ranked.filter(f => r.headline.toLowerCase().includes(f.label.toLowerCase())).length
      return [
        `Headline: ${r.headline}`,
        ...(named > 1 ? [`Factors named in the headline: ${named}`] : []),
        `Score: ${r.profile.score} out of ${r.scaleMax} (${r.bureau})`,
        ...top,
      ].join('\n')
    }
    case 'reason': {
      const f = r.diagnosis.ranked.find(x => x.id === item.factorId)
      return f ? `${f.label} (${f.rag}): ${f.reason}\nData: ${f.because.dataPoint}` : null
    }
    case 'step': {
      const s = r.plans[item.plan].steps[item.stepIndex]
      return s ? `Date: ${E.fmtDate(s.date)}\nStep: ${s.title}\nHow: ${s.instruction}\nYou'll know it worked: ${s.check}\nData: ${s.because.dataPoint}` : null
    }
  }
}

/** Problems with one worded text, against its facts (and the template, which comes from the same data). */
export const problemsWith = (text: string, item: Pick<Item, 'facts' | 'template'>) => [
  ...checkStyle(text),
  ...checkNumbers(text, `${item.facts}\n${item.template}`),
]

const inFlight = new Map<string, Promise<string | null>>()

/** Words for each item: cache, in-flight call, or one new batched call. null = use the template. */
async function wordItems(items: Item[], plain: boolean): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>()
  const todo: Item[] = []
  const waiting: Array<Promise<void>> = []
  for (const it of items) {
    const hit = cacheGet(it.key)
    // Cached text is checked again, so a stricter checker also covers older cache entries.
    if (hit !== undefined && !problemsWith(hit, it).length) out.set(it.id, hit)
    else if (inFlight.has(it.key)) waiting.push(inFlight.get(it.key)!.then(t => void out.set(it.id, t)))
    else todo.push(it)
  }
  if (todo.length && !config.offline && config.hasKey) {
    const batch = callBatch(todo, plain)
    for (const it of todo) {
      const p = batch.then(m => m.get(it.id) ?? null)
      inFlight.set(it.key, p)
      void p.finally(() => inFlight.delete(it.key))
      waiting.push(p.then(t => void out.set(it.id, t)))
    }
  } else for (const it of todo) out.set(it.id, null)
  await Promise.all(waiting)
  return out
}

/** One call for the batch, then one retry for the items that failed the checker. Caches what passes. */
async function callBatch(items: Item[], plain: boolean): Promise<Map<string, string | null>> {
  const good = new Map<string, string | null>()
  let pending = items
  let problems = new Map<string, string[]>()
  for (let attempt = 0; attempt < 2 && pending.length; attempt++) {
    const payload = pending.map(it => ({
      id: it.id,
      template: it.template,
      facts: it.facts,
      ...(problems.get(it.id) ? { problemsLastTime: problems.get(it.id) } : {}),
    }))
    const reply = await askClaude({
      purpose: 'wording',
      system: SYSTEM(plain),
      content: `${attempt ? 'Your last version broke the rules (see problemsLastTime). Fix those items.\n' : ''}Items:\n${JSON.stringify(payload, null, 1)}`,
      maxTokens: 2048 + 200 * pending.length, // room for the model's thinking as well as the JSON
      cache: false, // cached per item below, not per call
      schema: WORDING,
      timeoutMs: 30_000,
    })
    const parsed = reply ? Reply.safeParse(jsonIn(reply.text)) : null
    if (!parsed?.success) {
      log('wording', reply ? 'reply was not {items: [...]}' : 'no reply')
      continue
    }
    const byId = new Map(parsed.data.items.map(x => [x.id, x.text.trim()]))
    const next: Item[] = []
    problems = new Map()
    for (const it of pending) {
      const text = byId.get(it.id)
      const p = text ? problemsWith(text, it) : ['missing']
      if (text && !p.length) {
        good.set(it.id, text)
        cacheSet(it.key, 'wording', text)
      } else {
        problems.set(it.id, p)
        next.push(it)
      }
    }
    if (next.length) log('wording', `attempt ${attempt + 1}: ${next.length} item(s) failed the checker: ${next.map(it => `${it.id} (${problems.get(it.id)!.join('; ')})`).join(', ')}`)
    pending = next
  }
  for (const it of pending) good.set(it.id, null)
  return good
}

function itemsFor(s: Session, drafts: Draft[]): Item[] {
  const res = s.result
  if (!res) return []
  const items: Item[] = []
  for (const d of drafts) {
    if (!d.item) continue
    const facts = factsFor(d.item, res)
    if (!facts) continue
    items.push({ id: d.base, template: d.text, facts, key: cacheKey('wording', { plain: s.plainEnglish, template: d.text, facts }) })
  }
  return items
}

/** Claude where an item allows it, within the turn budget; templates otherwise. */
async function word(s: Session, drafts: Draft[]): Promise<AgentMessage[]> {
  const items = itemsFor(s, drafts)
  let words = new Map<string, string | null>()
  if (items.length) {
    const work = wordItems(items, s.plainEnglish)
    const timer = new Promise<'late'>(r => setTimeout(() => r('late'), TURN_BUDGET_MS).unref())
    const got = await Promise.race([work, timer])
    if (got === 'late') {
      log('wording', `over ${TURN_BUDGET_MS} ms, answering with templates (Claude carries on and fills the cache)`)
      // Whatever is already cached still counts.
      for (const it of items) words.set(it.id, cacheGet(it.key) ?? null)
    } else words = got
  }
  return drafts.map((d): AgentMessage => {
    const text = words.get(d.base)
    return text ? toMessage(s, d, 'claude', text) : toMessage(s, d, 'template')
  })
}

/** Start the wording for messages the person will see soon, so the turn finds it ready. Never throws. */
function prewarm(s: Session, drafts: Draft[]) {
  const items = itemsFor(s, drafts)
  if (!items.length || config.offline || !config.hasKey) return
  wordItems(items, s.plainEnglish).catch(err => log('wording', `prewarm: ${err instanceof Error ? err.message : err}`))
}

/** The Wording the server uses. */
export const claudeWording: Wording = { word, prewarm }
