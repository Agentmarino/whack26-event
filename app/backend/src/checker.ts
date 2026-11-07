// The number checker: every £ amount, %, count and date in Claude's text must appear in the engine
// data for that item. Claude words; the engine computes. Anything else is a problem we list back
// to Claude once, then we use the template.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const MONTH_RE = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/gi
const UNITS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
}
const SCALES: Record<string, number> = { hundred: 100, thousand: 1000, million: 1_000_000 }
const WORD_RUN = new RegExp(
  `\\b(?:(?:a|an)[\\s-]+(?=hundred|thousand|million|dozen|half))?(?:(?:${[...Object.keys(UNITS), ...Object.keys(SCALES), 'dozen', 'half', 'and'].join('|')})(?:[\\s-]+|\\b))+`,
  'gi',
)

/** Numbers written in words: "twenty-five" 25, "a thousand" 1000, "two hundred and fifty" 250, "a dozen" 12. "one" alone is prose, not a count. */
export function wordNumbers(text: string): number[] {
  const out: number[] = []
  for (const m of text.matchAll(WORD_RUN)) {
    const words = m[0].toLowerCase().split(/[\s-]+/).filter(w => w && w !== 'and')
    if (!words.length || (words.length === 1 && ['one', 'a', 'an', 'half'].includes(words[0]!))) continue
    let total = 0
    let cur = 0
    let any = false
    for (const w of words) {
      if (UNITS[w] !== undefined) (cur += UNITS[w]!), (any = true)
      else if (w === 'dozen') (cur = (cur || 1) * 12), (any = true)
      else if (w === 'hundred') (cur = (cur || 1) * 100), (any = true)
      else if (SCALES[w] !== undefined) (total += (cur || 1) * SCALES[w]!), (cur = 0), (any = true)
    }
    if (any) out.push(total + cur)
  }
  return out
}

export type Numbers = { money: Set<number>; percent: Set<number>; plain: Set<number>; months: Set<string> }

const num = (s: string) => Number(s.replace(/,/g, ''))

/** Every number in a text, by kind. */
export function numbersIn(text: string, opts: { words?: boolean } = {}): Numbers {
  const out: Numbers = { money: new Set(), percent: new Set(), plain: new Set(), months: new Set() }
  let rest = text.replace(/(\d[\d,]*(?:\.\d+)?)\s*k\b/gi, (_, d: string) => String(num(d) * 1000))
  rest = rest.replace(/£\s?(\d[\d,]*(?:\.\d+)?)/g, (_, n: string) => (out.money.add(num(n)), ' '))
  rest = rest.replace(/(\d[\d,]*(?:\.\d+)?)\s?%/g, (_, n: string) => (out.percent.add(num(n)), ' '))
  for (const m of rest.matchAll(/\d[\d,]*(?:\.\d+)?/g)) out.plain.add(num(m[0]))
  // Months only where they read as dates ("9 Nov 2026", "Feb 2027", "in February"), so "you may" is not a month.
  for (const m of text.matchAll(MONTH_RE)) {
    const word = m[1]!
    const at = m.index ?? 0
    const before = text.slice(Math.max(0, at - 6), at)
    const after = text.slice(at + word.length, at + word.length + 6)
    const lead = text.slice(Math.max(0, at - 8), at)
    const dated = /\d{1,2}(st|nd|rd|th)?\s+$/.test(before) || /^\s+\d{4}/.test(after) || /\b(by|in|from|until|till|before|since|after|of)\s+$/i.test(lead)
    const named = word.length > 3 && word[0] === word[0]!.toUpperCase() && !/^may$/i.test(word)
    if (dated || named) out.months.add(word.slice(0, 3).toLowerCase())
  }
  if (opts.words) for (const n of wordNumbers(text)) out.plain.add(n)
  return out
}

/**
 * Problems with Claude's text against the facts (the engine data for that item). Empty = fine.
 * £ must match a £ in the facts, % a %, other numbers (counts, days, years) any number in the facts,
 * month names a month in the facts.
 */
export function checkNumbers(text: string, facts: string): string[] {
  const said = numbersIn(text, { words: true })
  const known = numbersIn(facts, { words: true })
  const anyKnown = new Set([...known.money, ...known.percent, ...known.plain])
  const problems: string[] = []
  for (const n of said.money) if (!known.money.has(n)) problems.push(`£${n.toLocaleString('en-GB')} is not in the data`)
  for (const n of said.percent) if (!known.percent.has(n)) problems.push(`${n}% is not in the data`)
  for (const n of said.plain) if (!anyKnown.has(n)) problems.push(`the number ${n} is not in the data`)
  for (const m of said.months) if (!known.months.has(m)) problems.push(`the month ${m[0]!.toUpperCase()}${m.slice(1)} is not in the data`)
  return problems
}

/** Everything a worded message must also respect: length, no promises, British spelling. */
export function checkStyle(text: string, maxWords = 40): string[] {
  const problems: string[] = []
  const words = text.trim().split(/\s+/).filter(Boolean).length
  if (words > maxWords) problems.push(`${words} words, the limit is ${maxWords}`)
  if (/\bguarantee|\bwill definitely|\bpromise you\b|\bapproved for sure\b/i.test(text)) problems.push('it promises an outcome')
  if (/\b(color|favor|realize|organize|center|program|behavior|analyze)\b/i.test(text)) problems.push('American spelling')
  if (!text.trim()) problems.push('empty')
  return problems
}

export const monthIndex = (m: string) => MONTHS.indexOf(m.slice(0, 3).toLowerCase())
