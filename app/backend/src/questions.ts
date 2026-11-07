// The questions step (conversation.md): the engine's form fields the data has not answered,
// goal and horizon always, then up to 2 questions built from the data. Chips and typed text count the same.

import { Goal } from 'shared'
import type { Bureau, Expects, Profile } from 'shared'
import { z } from 'zod'
import { askClaude, jsonIn, remember } from './claude.ts'
import { CHIPS, type Draft, fit } from './templates.ts'
import type { QuestionKey, Session } from './session.ts'

type Answer = { ok: true } | { ok: false; retry: Draft }

const ask = (base: string, text: string): Draft => ({ base, kind: 'text', text: fit(text), emote: 'neutral', gesture: 'asking' })
const retry = (base: string, text: string): Answer => ({ ok: false, retry: ask(`${base}-again`, text) })

/** Which questions to ask, in order. Built once when the questions start. */
export function buildQueue(s: Session): QuestionKey[] {
  const p = s.profile
  const q: QuestionKey[] = []
  if (p.age == null) q.push('age')
  if (p.grossIncome == null) q.push('income')
  if (p.housing == null) q.push('housing')
  q.push('goal', 'horizon')
  if (p.bureau == null) q.push('bureau')
  // Data questions, only where the answer changes the plan. At most 2.
  const data: QuestionKey[] = []
  if (p.electoralRoll === false && p.canRegisterToVote !== false) data.push('roll')
  const i = (p.cards ?? []).findIndex(c => c.minOnly && !c.hasDD)
  if (i >= 0) {
    data.push('dd')
    s.ddCard = i
  }
  return [...q, ...data.slice(0, 2)]
}

export function question(s: Session, key: QuestionKey): { draft: Draft; expects: Expects } {
  const voice = { allowVoice: true }
  switch (key) {
    case 'age':
      return { draft: ask('q-age', 'How old are you?'), expects: { kind: 'text', placeholder: 'For example 23', ...voice } }
    case 'income':
      return {
        draft: ask('q-income', 'Roughly what do you earn a year, before tax? A rough number is fine.'),
        expects: { kind: 'text', placeholder: 'For example £24,000', ...voice },
      }
    case 'housing':
      return { draft: ask('q-housing', 'Do you rent, own, or live with family?'), expects: { kind: 'choice', chips: CHIPS.housing } }
    case 'goal':
      return {
        draft: ask('q-goal', 'What are you hoping to get? Pick one, or tell me in your own words.'),
        expects: { kind: 'text', chips: CHIPS.goal, placeholder: 'Or type your own', ...voice },
      }
    case 'horizon':
      return { draft: ask('q-horizon', 'And how soon? I can plan for the next 3 months or the next 6.'), expects: { kind: 'choice', chips: CHIPS.horizon } }
    case 'bureau':
      return { draft: ask('q-bureau', 'Which agency is your report from?'), expects: { kind: 'choice', chips: CHIPS.bureau } }
    case 'roll':
      return {
        draft: ask('q-roll', "Your report says you're not on the electoral roll at your current address. Can you register to vote there?"),
        expects: { kind: 'choice', chips: CHIPS.canRegister },
      }
    case 'dd': {
      const card = s.ddCard != null ? s.profile.cards?.[s.ddCard] : undefined
      return {
        draft: ask('q-dd', `You pay the minimum on your ${card?.name ?? 'card'} each month. Is that set up as a Direct Debit?`),
        expects: { kind: 'choice', chips: CHIPS.yesNo },
      }
    }
  }
}

// ---------- answers ----------

const num = (t: string): number | null => {
  const m = t.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : null
}

export function parseAge(t: string): number | null {
  const n = num(t)
  return n != null && n >= 16 && n <= 100 ? Math.round(n) : null
}

/** "24000", "£24,000", "24k", "24 grand", "1,680 a month", "24" (thousands). Yearly, before tax. */
export function parseIncome(t: string): number | null {
  const s = t.toLowerCase()
  if (/\b(nothing|none|zero|no income)\b/.test(s)) return 0
  let n = num(s)
  if (n == null || n < 0) return null
  if (/\d\s*k\b|grand|thousand/.test(s)) n *= 1000
  if (/week|weekly|\bpw\b/.test(s)) n *= 52
  else if (/month|monthly|pcm|\bpm\b/.test(s)) n *= 12
  else if (n > 0 && n < 200) n *= 1000 // "24" = £24k
  return n <= 1_000_000 ? Math.round(n) : null
}

export function parseHousing(t: string): string | null {
  const s = t.toLowerCase()
  if (/famil|parent|mum|dad|home with/.test(s)) return 'family'
  if (/rent|lodg|flat ?share|tenant/.test(s)) return 'rent'
  if (/own|mortgage|bought/.test(s)) return 'own'
  return null
}

/** Engine goal plus the person's words when the goal is not one of the engine's. `matched` false = a guess. */
export function parseGoal(t: string): { goal: Goal; words: string | null; matched?: false } {
  const s = t.toLowerCase()
  if (/\brent(ing|al)?\b|landlord|tenan/.test(s)) return { goal: 'build', words: 'renting a home' }
  if (/mortgage|\b(buy|buying|own)\b.*\b(house|home|flat|place|property)\b|first home|homeowner|property ladder/.test(s)) return { goal: 'mortgage', words: null }
  if (/\bcar\b|vehicle|motor/.test(s)) return { goal: 'build', words: 'car finance' }
  if (/card/.test(s)) return { goal: 'card', words: null }
  if (/build|improve|better|score|rating/.test(s)) return { goal: 'build', words: null }
  if (/loan/.test(s)) return { goal: 'build', words: 'a loan' }
  if (/phone|contract/.test(s)) return { goal: 'build', words: 'a phone contract' }
  return { goal: 'build', words: t.trim().slice(0, 60) || null, matched: false }
}

const GoalReply = z.object({ goal: Goal })

/** Own words the keywords don't know: Claude picks one of the engine's three goals, else `build`. */
async function goalFromClaude(text: string): Promise<Goal | null> {
  const call = {
    purpose: 'goal',
    system: 'A person says what they hope to get from improving their UK credit. Pick the closest engine goal: "card" (a credit card), "mortgage" (buying a home), or "build" (anything else, or just a better score). Reply with JSON only: {"goal": "card" | "mortgage" | "build"}.',
    content: text.trim().slice(0, 300),
    maxTokens: 30,
    keyInput: text.trim().toLowerCase(),
  }
  const reply = await askClaude(call)
  const parsed = reply ? GoalReply.safeParse(jsonIn(reply.text)) : null
  if (!parsed?.success) return null
  if (reply?.from === 'claude') remember(call, reply.text)
  return parsed.data.goal
}


export function parseBureau(t: string): Bureau {
  const s = t.toLowerCase()
  if (/equifax/.test(s)) return 'equifax'
  if (/trans ?union/.test(s)) return 'transunion'
  return 'experian'
}

/** Yes / no / not sure. */
export function parseYesNo(t: string): boolean | null {
  const s = t.toLowerCase().trim()
  if (/not sure|don'?t know|unsure|no idea|maybe/.test(s)) return null
  if (/^(no|nope|nah)\b|can'?t|cannot|isn'?t|not set|don'?t/.test(s)) return false
  if (/^(yes|yeah|yep|y|sure|ok)\b|i can|it is|already/.test(s)) return true
  return null
}

/** Apply one answer to the profile. `skip` takes the engine default. */
export async function answer(s: Session, key: QuestionKey, value: string | null): Promise<Answer> {
  const p: Profile = s.profile
  if (value === null) {
    if (key === 'goal') p.goal = 'build'
    return { ok: true }
  }
  switch (key) {
    case 'age': {
      const n = parseAge(value)
      if (n == null) return retry('q-age', "Sorry, I didn't catch that. How old are you? Just the number is fine.")
      p.age = n
      return { ok: true }
    }
    case 'income': {
      const n = parseIncome(value)
      if (n == null) return retry('q-income', 'Sorry, I missed that. Roughly what do you earn a year before tax? For example £24,000.')
      p.grossIncome = n
      return { ok: true }
    }
    case 'housing': {
      const h = parseHousing(value)
      if (!h) return retry('q-housing', 'Sorry, was that rent, own, or living with family?')
      p.housing = h
      return { ok: true }
    }
    case 'goal': {
      const g = parseGoal(value)
      p.goal = g.matched === false ? ((await goalFromClaude(value)) ?? 'build') : g.goal
      s.goalWords = g.words
      return { ok: true }
    }
    case 'horizon':
      s.horizon = /6|six/i.test(value) ? '6m' : '3m'
      return { ok: true }
    case 'bureau':
      p.bureau = parseBureau(value)
      return { ok: true }
    case 'roll': {
      const yes = parseYesNo(value)
      if (yes !== null) p.canRegisterToVote = yes
      return { ok: true }
    }
    case 'dd': {
      const yes = parseYesNo(value)
      const card = s.ddCard != null ? p.cards?.[s.ddCard] : undefined
      if (card && yes !== null) card.hasDD = yes
      return { ok: true }
    }
  }
}
