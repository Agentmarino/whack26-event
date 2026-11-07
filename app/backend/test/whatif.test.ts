// Block 2: free-text what-ifs → engine levers. Claude's output is checked; the keyword reader is the fallback.

import { describe, expect, it } from 'vitest'
import type { Profile } from 'shared'
import { amountsIn, checkClaudeChanges, keywordChanges, rollDirection, windfallOnly } from '../src/whatif.ts'

const priya: Profile = {
  cards: [{ name: 'Barclaycard', limit: 1200, balance: 950, apr: 29.9 }],
  bank: { bnpl: 40 },
}

describe('Claude lever checker', () => {
  it('accepts known levers', () => {
    expect(checkClaudeChanges([{ lever: 'paydown', value: 300 }], 'what if I pay 300 a month', priya)).toEqual({
      ok: true,
      changes: [{ lever: 'paydown', value: 300 }],
    })
    expect(checkClaudeChanges([{ lever: 'clearCard', card: 'barclaycard' }], 'clear my barclaycard', priya)).toEqual({
      ok: true,
      changes: [{ lever: 'clearCard', card: 'Barclaycard' }],
    })
  })

  it('rejects unknown levers, `set`, invented amounts and unknown cards', () => {
    expect(checkClaudeChanges([{ lever: 'winLottery' }], 'what if I win', priya).ok).toBe(false)
    expect(checkClaudeChanges([{ lever: 'set', path: 'score', value: 999 }], 'what if my score was 999', priya).ok).toBe(false)
    expect(checkClaudeChanges([{ lever: 'paydown', value: 250 }], 'what if I pay a bit more', priya).ok).toBe(false)
    expect(checkClaudeChanges([{ lever: 'clearCard', card: 'Amex' }], 'clear my amex', priya).ok).toBe(false)
    expect(checkClaudeChanges([], 'what if I move to Spain', priya).ok).toBe(false)
  })

  it('the words decide the roll direction, whatever Claude says (114 review)', () => {
    expect(checkClaudeChanges([{ lever: 'electoralRoll', value: true }], 'what if I remove myself from the electoral roll', priya)).toEqual({
      ok: true,
      changes: [{ lever: 'electoralRoll', value: false }],
    })
    expect(rollDirection('what if I register to vote')).toBe(true)
    expect(rollDirection('what if I pay 300')).toBeNull()
    expect(checkClaudeChanges([{ lever: 'electoralRoll', value: true }], 'what if I opt out of the electoral roll', priya)).toEqual({
      ok: true,
      changes: [{ lever: 'electoralRoll', value: false }],
    })
  })

  it('windfalls are not levers (114 review)', () => {
    expect(windfallOnly('what if I win the lottery')).toBe(true)
    expect(windfallOnly('what if I get a pay rise')).toBe(true)
    expect(windfallOnly('what if I inherit £5k')).toBe(true)
    expect(windfallOnly('what if I win the lottery and pay off my card')).toBe(false)
    expect(windfallOnly('what if I pay 300 a month')).toBe(false)
    expect(windfallOnly("what if I won't gamble any more")).toBe(false)
    expect(windfallOnly('what if I never play the lottery again')).toBe(false)
  })
})

describe('keyword reader', () => {
  it.each([
    ['What if I pay £300 a month?', [{ lever: 'paydown', value: 300 }]],
    ['what if I pay 300 a month extra', [{ lever: 'paydown', value: 300 }]],
    ['what if I put two hundred quid on it', [{ lever: 'paydown', value: 200 }]],
    ['What if I stop buy now, pay later?', [{ lever: 'stop', what: 'bnpl' }]],
    ['what if I cleared my barclaycard and stopped klarna', [{ lever: 'clearCard', card: 'Barclaycard' }, { lever: 'stop', what: 'bnpl' }]],
    ['What if I register to vote?', [{ lever: 'electoralRoll', value: true }]],
    ['What if I report my rent?', [{ lever: 'rentReporting', value: true }]],
    ['what if I move to Spain', []],
    // Review 113: durations are not amounts; a rent figure is not a paydown; the rent lever doesn't hide a paydown.
    ['what if in 3 months I pay 200 extra', [{ lever: 'paydown', value: 200 }]],
    ['what if I pay 300 extra and report my rent', [{ lever: 'paydown', value: 300 }, { lever: 'rentReporting', value: true }]],
    ['what if my £650 rent was reported', [{ lever: 'rentReporting', value: true }]],
    // 114 review: money arriving is not a lever; "lottery" alone is not "stop gambling".
    ['what if I win the lottery', []],
    ['What if I won £5,000 on the lottery?', []],
    ['what if I play the lottery', []],
    ['what if I quit the lottery and scratchcards', [{ lever: 'stop', what: 'gambling' }]],
    ['what if I win the lottery and clear my barclaycard', [{ lever: 'clearCard', card: 'Barclaycard' }]],
    // 114 review: every way of coming off the roll reads as coming off it.
    ['what if I come off the electoral roll', [{ lever: 'electoralRoll', value: false }]],
    ['what if I remove myself from the electoral roll', [{ lever: 'electoralRoll', value: false }]],
    ['what if I got taken off the electoral roll', [{ lever: 'electoralRoll', value: false }]],
    ["what if I wasn't on the electoral roll", [{ lever: 'electoralRoll', value: false }]],
    ['what if I deregister from voting', [{ lever: 'electoralRoll', value: false }]],
    ["I'm not on the electoral roll, what if I register to vote?", [{ lever: 'electoralRoll', value: true }]],
    ['what if I remove my ex and register to vote', [{ lever: 'electoralRoll', value: true }, { lever: 'removeAssociates' }]],
    // Reviewer pass 2026-11-07: stop phrasings are not windfalls ("won't" is not "won").
    ["what if I won't gamble any more", [{ lever: 'stop', what: 'gambling' }]],
    ["what if I won’t use Klarna any more", [{ lever: 'stop', what: 'bnpl' }]],
    ['what if I never play the lottery again', [{ lever: 'stop', what: 'gambling' }]],
    ['what if I spent less on the lottery', [{ lever: 'stop', what: 'gambling' }]],
    ['what if I close my Klarna', [{ lever: 'stop', what: 'bnpl' }]],
    // ...the noun "electoral register" and opting out are coming off; the question after "what if" decides.
    ["what if I wasn't on the electoral register", [{ lever: 'electoralRoll', value: false }]],
    ["what if I'm not on the electoral register any more", [{ lever: 'electoralRoll', value: false }]],
    ['what if I opt out of the electoral roll', [{ lever: 'electoralRoll', value: false }]],
    ['what if I cancel my electoral registration', [{ lever: 'electoralRoll', value: false }]],
    ['what if I delete myself from the electoral roll', [{ lever: 'electoralRoll', value: false }]],
    ['I came off the roll when I moved, what if I get back on', [{ lever: 'electoralRoll', value: true }]],
    ['what if I register to vote but leave my ex', [{ lever: 'electoralRoll', value: true }, { lever: 'removeAssociates' }]],
    ['what if I register to vote when I leave uni', [{ lever: 'electoralRoll', value: true }]],
    ['what if I stop reporting my rent', [{ lever: 'rentReporting', value: false }]],
  ])('%s', (text, changes) => {
    expect(keywordChanges(text, priya)).toEqual(changes)
  })

  it('reads amounts in digits and words', () => {
    expect(amountsIn('£1,200')).toEqual([1200])
    expect(amountsIn('a grand')).toEqual([1000])
    expect(amountsIn('two hundred and fifty')).toEqual([250])
    expect(amountsIn('three months')).toEqual([])
  })
})
