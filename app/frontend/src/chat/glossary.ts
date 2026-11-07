// Credit terms that get a tap-to-explain line. Plain words, British spelling, no numbers that the
// engine should own (the 30% guide is the same one the engine's own reasons quote).
export interface Term {
  id: string
  word: string
  match: RegExp
  explain: string
}

export const TERMS: Term[] = [
  {
    id: 'utilisation',
    word: 'utilisation',
    match: /utili[sz]ation|of your (?:card )?limits?|of their limits/i,
    explain:
      "How much of your credit card limits you're using. £300 spent on a £1,000 limit is 30%. Lenders like to see under 30%.",
  },
  {
    id: 'hard-search',
    word: 'hard search',
    match: /hard searche?s?/i,
    explain:
      'A mark left on your file when you apply for credit. Other lenders can see it. Several close together can look like you need money fast. They fade after a year.',
  },
  {
    id: 'soft-search',
    word: 'soft search',
    match: /soft search|quickcheck/i,
    explain:
      "A quick look at your file, like Capital One QuickCheck. Only you can see it, so it can't affect your score.",
  },
  {
    id: 'electoral-roll',
    word: 'electoral roll',
    match: /electoral roll|register to vote/i,
    explain:
      'The list of people registered to vote at an address. Lenders use it to check who you are and where you live. Registering is free at gov.uk/register-to-vote.',
  },
  {
    id: 'ccj',
    word: 'CCJ',
    match: /\bCCJs?\b|county court judg(e)?ments?/i,
    explain:
      'A County Court Judgment: a court order to pay back a debt. It stays on your file for six years, unless you pay it in full within a month.',
  },
  {
    id: 'thin-file',
    word: 'thin file',
    match: /thin[- ]file|very little (?:uk )?credit history|very little of it/i,
    explain: "A credit file with very little history, so lenders have little to go on. It isn't the same as bad credit.",
  },
]

/** The terms that appear in any of the texts, in glossary order. */
export function termsIn(...texts: (string | null | undefined)[]): Term[] {
  const all = texts.filter(Boolean).join(' \n ')
  return TERMS.filter((t) => t.match.test(all))
}
