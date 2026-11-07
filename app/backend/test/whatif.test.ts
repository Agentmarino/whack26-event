// Block 2: free-text what-ifs → engine levers. Claude's output is checked; the keyword reader is the fallback.

import { describe, expect, it } from 'vitest'
import type { Profile } from 'shared'
import { amountsIn, checkClaudeChanges, keywordChanges } from '../src/whatif.ts'

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
