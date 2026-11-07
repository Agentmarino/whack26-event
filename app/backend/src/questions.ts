// The questions step (conversation.md): the engine's form fields the data has not answered,
// goal and horizon always, then up to 2 questions built from the data. Chips and typed text count the same.

import { Goal } from 'shared'
import type { Bureau, Expects, Profile } from 'shared'
import { z } from 'zod'
import { askClaude, jsonIn, remember } from './claude.ts'
import { GOAL } from './schemas.ts'
import { CARD_NAME, CARD_SHORT, CHIPS, type Draft, fit } from './templates.ts'
import type { Product, QuestionKey, Session } from './session.ts'
import * as E from '../engine/index.ts'

type Answer = { ok: true } | { ok: false; retry: Draft }

const ask = (base: string, text: string): Draft => ({ base, kind: 'text', text: fit(text), emote: 'neutral', gesture: 'asking' })
const retry = (base: string, text: string): Answer => ({ ok: false, retry: ask(`${base}-again`, text) })

/** The engine's form fields the data has not answered (115: asked before a branch's first engine run). */
export function formQueue(s: Session): QuestionKey[] {
  const p = s.profile
  const q: QuestionKey[] = []
  if (p.age == null) q.push('age')
  if (p.grossIncome == null) q.push('income')
  if (p.housing == null) q.push('housing')
  if (p.bureau == null) q.push('bureau')
  return q
}

/** The goals step (115): what they aim for, then the time frame. */
export const goalsQueue = (): QuestionKey[] => ['goal', 'horizon']

/** Data questions, only where the answer changes the plan. At most 2. */
export function dataQueue(s: Session): QuestionKey[] {
  const p = s.profile
  const data: QuestionKey[] = []
  if (p.electoralRoll === false && p.canRegisterToVote !== false) data.push('roll')
  const i = (p.cards ?? []).findIndex(c => c.minOnly && !c.hasDD)
  if (i >= 0) {
    data.push('dd')
    s.ddCard = i
  }
  return data.slice(0, 2)
}

// ---------- 115: chips for the branch questions and the goals step ----------

export const CHIPS115 = {
  declinedBy: ['Capital One', 'Another lender'],
  declinedFor: ['A Classic card', 'A Balance Transfer card', 'A 0% Purchase card', 'Another credit card', 'A loan or car finance', 'A phone contract', 'A mortgage'],
  product: ['Capital One Classic', 'Capital One Balance Transfer', 'Capital One 0% Purchase', 'Car finance', 'A mortgage', 'Something else'],
  newWhy: ["I'm new to the UK", "I'm a student", "I've never had credit"],
  ukTime: ['Under 6 months', '6 to 12 months', 'Over a year'],
  bankAge: ['No UK account yet', 'Under 6 months', '6 months or more'],
  goal: ['A target score', 'A specific card', 'Car finance', 'A mortgage', 'Something else'],
  goalCard: [CARD_NAME.classic, CARD_NAME.bt, CARD_NAME.purchase],
}

const isCardId = (id: string | undefined): id is 'classic' | 'bt' | 'purchase' => id === 'classic' || id === 'bt' || id === 'purchase'

/** A card named in a chip or in words ("the Balance Transfer card", "Capital One Classic"). */
export function cardIn(t: string): 'classic' | 'bt' | 'purchase' | null {
  const s = t.toLowerCase()
  if (/balance ?transfer|\bbt\b/.test(s)) return 'bt'
  if (/0%|zero per ?cent|purchase/.test(s)) return 'purchase'
  if (/classic|credit ?builder/.test(s)) return 'classic'
  return null
}

/** The product chips (declined for / prepare) → what the engine and the goals step need. */
export function productFrom(t: string): Product {
  const card = cardIn(t)
  if (card) return { id: card, label: CARD_SHORT[card] }
  const s = t.toLowerCase()
  if (/mortgage|house|home/.test(s)) return { id: 'mortgage', label: 'A mortgage' }
  if (/car/.test(s)) return { id: 'car', label: 'Car finance' }
  if (/loan/.test(s)) return { id: 'loan', label: 'A loan' }
  if (/phone|contract|mobile/.test(s)) return { id: 'phone', label: 'A phone contract' }
  if (/card/.test(s)) return { id: 'card', label: 'Credit card' }
  return { id: 'other', label: 'Other credit' }
}

/** The engine goal a product points at. */
export const goalFor = (p: Product): 'card' | 'mortgage' | 'build' =>
  isCardId(p.id) || p.id === 'card' ? 'card' : p.id === 'mortgage' ? 'mortgage' : 'build'

/** Target score chips: the next three round fifties above today's score, within the scale. */
export function scoreChips(s: Session): string[] {
  const p = s.profile
  const max = E.SCALE[p.bureau ?? 'experian'] ?? 999
  const now = p.score ?? Math.round(max * 0.65)
  const first = Math.ceil((now + 1) / 50) * 50
  return [first, first + 50, first + 100].filter(n => n <= max).map(String)
}

/** Answers given before the report lands are kept aside and put back over it (applyReport). */
function keep<K extends keyof Profile>(s: Session, key: K, value: Profile[K]) {
  s.profile[key] = value
  s.answers[key] = value
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
    case 'declinedBy':
      return { draft: ask('q-declined-by', 'No problem. Who turned you down?'), expects: { kind: 'text', chips: CHIPS115.declinedBy, placeholder: 'Or type the lender', ...voice } }
    case 'declinedFor':
      return { draft: ask('q-declined-for', 'And what were you applying for?'), expects: { kind: 'choice', chips: CHIPS115.declinedFor } }
    case 'product':
      return { draft: ask('q-product', 'What would you like to apply for first?'), expects: { kind: 'choice', chips: CHIPS115.product } }
    case 'newWhy':
      return { draft: ask('q-new-why', 'Which of these fits you best?'), expects: { kind: 'choice', chips: CHIPS115.newWhy } }
    case 'ukTime':
      return { draft: ask('q-uk-time', 'How long have you been in the UK?'), expects: { kind: 'choice', chips: CHIPS115.ukTime } }
    case 'bankAge':
      return { draft: ask('q-bank-age', 'How long have you had a UK bank account?'), expects: { kind: 'choice', chips: CHIPS115.bankAge } }
    case 'goal': {
      // A card they were declined for, or want first, leads the chips.
      const card = s.product && isCardId(s.product.id) ? s.product.id : null
      const first = card ? [`The ${CARD_SHORT[card]}`] : []
      const text =
        s.branch === 'prepare' && s.product
          ? `You said ${card ? `the ${CARD_SHORT[card]}` : s.product.label.toLowerCase()} first. Is that still the goal, or something else?`
          : 'Now, what would you like to aim for? Pick one, or tell me in your own words.'
      return { draft: ask('q-goal', text), expects: { kind: 'text', chips: [...first, ...CHIPS115.goal], placeholder: 'Or type your own', ...voice } }
    }
    case 'goalCard':
      return { draft: ask('q-goal-card', 'Lovely. Which card?'), expects: { kind: 'choice', chips: CHIPS115.goalCard } }
    case 'goalScore': {
      const p = s.profile
      const now = p.score != null ? ` Your ${({ experian: 'Experian', equifax: 'Equifax', transunion: 'TransUnion' } as const)[p.bureau ?? 'experian']} score is ${p.score} today.` : ''
      return { draft: ask('q-goal-score', `What score would you like to reach?${now}`), expects: { kind: 'text', chips: scoreChips(s), placeholder: 'For example 800', ...voice } }
    }
    case 'goalOwn':
      return { draft: ask('q-goal-own', "Tell me in your own words what you're hoping for."), expects: { kind: 'text', placeholder: 'For example a car loan', ...voice } }
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
    maxTokens: 512,
    keyInput: text.trim().toLowerCase(),
    schema: GOAL,
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
    if (key === 'goal' || key === 'goalOwn') p.goal = s.product ? goalFor(s.product) : 'build'
    if (key === 'declinedBy') declineFrom(s, 'the lender', null)
    if (key === 'declinedFor') declineFrom(s, null, productFrom('a credit card'))
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
      // 115 chips first; anything else is the goal in their own words.
      if (/^a specific card$/i.test(value.trim())) return follow(s, 'goalCard')
      if (/^a target score$/i.test(value.trim())) return follow(s, 'goalScore')
      if (/^something else$/i.test(value.trim())) return follow(s, 'goalOwn')
      const card = /^(the )?(capital one )?(classic|balance transfer|0% purchase)( card)?$/i.test(value.trim()) ? cardIn(value) : null
      if (card) return targetCard(s, card)
      return ownGoal(s, value)
    }
    case 'goalOwn':
      return ownGoal(s, value)
    case 'goalCard': {
      const card = cardIn(value)
      if (!card) return retry('q-goal-card', 'Sorry, which one: the Classic, the Balance Transfer or the 0% Purchase card?')
      return targetCard(s, card)
    }
    case 'goalScore': {
      const n = num(value)
      const max = E.SCALE[p.bureau ?? 'experian'] ?? 999
      if (n == null || n < 100 || n > max) return retry('q-goal-score', `Sorry, I missed that. What score would you like, up to ${max}?`)
      s.targetScore = Math.round(n)
      p.goal = 'build'
      s.goalWords = `a score of ${Math.round(n)}`
      return { ok: true }
    }
    case 'declinedBy': {
      const t = value.trim()
      declineFrom(s, /capital ?one/i.test(t) ? 'Capital One' : /^another\b|^other\b|not sure|don'?t know/i.test(t) ? 'the lender' : t.slice(0, 40), null)
      return { ok: true }
    }
    case 'declinedFor':
      declineFrom(s, null, productFrom(value))
      return { ok: true }
    case 'product': {
      const pr = productFrom(value)
      s.product = pr
      keep(s, 'goal', goalFor(pr))
      s.goalWords = pr.id === 'car' ? 'car finance' : pr.id === 'loan' ? 'a loan' : null
      return { ok: true }
    }
    case 'newWhy': {
      const t = value.toLowerCase()
      if (/uk|abroad|moved|country|international/.test(t)) {
        keep(s, 'newToUK', true)
        s.queue.unshift('ukTime')
      }
      if (/student|uni|college/.test(t)) keep(s, 'student', true)
      return { ok: true }
    }
    case 'ukTime': {
      const t = value.toLowerCase()
      const months = /under|less|few/.test(t) ? 3 : /over|more|year/.test(t) && !/6 to 12|six to twelve/.test(t) ? 18 : 9
      keep(s, 'newToUK', true)
      keep(s, 'ukMonths', months)
      return { ok: true }
    }
    case 'bankAge': {
      // The engine waits for 6 months of UK banking when someone is new to the UK (it counts from ukMonths).
      const t = value.toLowerCase()
      const months = /no |not yet|none/.test(t) ? 0 : /under|less/.test(t) ? 3 : 6
      if (s.answers.newToUK) keep(s, 'ukMonths', Math.min(s.answers.ukMonths ?? months, months))
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

// ---------- 115 helpers ----------

/** Ask a follow-up next, before the rest of the queue. */
function follow(s: Session, key: QuestionKey): Answer {
  s.queue.unshift(key)
  return { ok: true }
}

function targetCard(s: Session, card: 'classic' | 'bt' | 'purchase'): Answer {
  s.profile.goal = 'card'
  s.targetCard = CARD_NAME[card]
  s.goalWords = null
  return { ok: true }
}

async function ownGoal(s: Session, value: string): Promise<Answer> {
  const g = parseGoal(value)
  s.profile.goal = g.matched === false ? ((await goalFromClaude(value)) ?? 'build') : g.goal
  s.goalWords = g.words
  const card = g.goal === 'card' ? cardIn(value) : null
  if (card) s.targetCard = CARD_NAME[card]
  return { ok: true }
}

/** The declined branch without the letter: who said no, and for what, become the engine's decline input. */
function declineFrom(s: Session, lender: string | null, product: Product | null) {
  const prev = s.profile.decline
  const pr = product ?? s.product
  if (product) s.product = product
  const decline = {
    lender: lender ?? prev?.lender ?? 'the lender',
    productId: pr && isCardId(pr.id) ? pr.id : 'classic',
    monthsAgo: 0,
    product: pr ? (isCardId(pr.id) ? CARD_SHORT[pr.id] : pr.label.replace(/^(A|An) /, '').toLowerCase()) : null,
    agency: null,
    statedReason: null,
  }
  keep(s, 'decline', decline)
}
