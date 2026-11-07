// Block 3: the number checker on Claude's wording.

import { describe, expect, it } from 'vitest'
import { checkNumbers, checkStyle } from '../src/checker.ts'
import { factsFor, problemsWith } from '../src/wording.ts'
import { analyseProfile } from '../src/analysis.ts'
import { sample } from '../src/personas.ts'

const facts = "Credit utilisation (red): You're using 79% of your £1,200 total limit (£950).\nData: £950 of £1,200 = 79%; 3 hard searches; apply from Jul 2027, 9 Nov 2026"

describe('checkNumbers', () => {
  it('passes numbers that are in the data', () => {
    expect(checkNumbers("You're using 79% of your £1,200 limit, that's £950. Three searches. Wait until July 2027.", facts)).toEqual([])
    expect(checkNumbers('On 9 Nov 2026, you may want to start.', facts)).toEqual([])
  })
  it('flags invented, rounded or converted numbers and dates', () => {
    expect(checkNumbers('You use about 80% of your limit.', facts)).toEqual(['80% is not in the data'])
    expect(checkNumbers('Pay £1,000 off.', facts)).toEqual(['£1,000 is not in the data'])
    expect(checkNumbers('That is £79 a month.', facts)).toEqual(['£79 is not in the data'])
    expect(checkNumbers('You have five searches.', facts)).toEqual(['the number 5 is not in the data'])
    expect(checkNumbers('Wait until 9 May 2027.', facts)).toEqual(['the month May is not in the data'])
  })
  it('reads numbers in words and short months (review 113)', () => {
    expect(checkNumbers('Pay sixty pounds a month.', facts)).toEqual(['the number 60 is not in the data'])
    expect(checkNumbers('Pay a thousand pounds off.', facts)).toEqual(['the number 1000 is not in the data'])
    expect(checkNumbers('About eighteen months of history.', facts)).toEqual(['the number 18 is not in the data'])
    expect(checkNumbers('Aim to finish by Feb.', facts)).toEqual(['the month Feb is not in the data'])
    expect(checkNumbers('twenty-five of them', facts)).toEqual(['the number 25 is not in the data'])
    expect(checkNumbers('You may want to start with one idea and three searches.', facts)).toEqual([])
  })
})

describe('checkStyle', () => {
  it('limits length and promises', () => {
    expect(checkStyle('word '.repeat(41))).toHaveLength(1)
    expect(checkStyle('We guarantee a better score.')).toEqual(['it promises an outcome'])
    expect(checkStyle('Your favorite color.')).toEqual(['American spelling'])
  })
})

describe('facts for each item', () => {
  const p = sample('priya')!
  const res = analyseProfile({ ...p.report, bank: p.bank!, decline: p.decline! }, null)
  it('every template passes its own checker', () => {
    const items = [
      { what: 'headline' as const },
      ...res.result.diagnosis.ranked.map(f => ({ what: 'reason' as const, factorId: f.id })),
      ...res.result.plans['6m'].steps.map((_, i) => ({ what: 'step' as const, plan: '6m' as const, stepIndex: i })),
    ]
    for (const item of items) {
      const f = factsFor(item, res)
      expect(f, JSON.stringify(item)).not.toBeNull()
      const template =
        item.what === 'headline' ? res.result.headline : item.what === 'reason' ? res.result.diagnosis.ranked.find(x => x.id === item.factorId)!.reason : res.result.plans['6m'].steps[item.stepIndex]!.title
      expect(checkNumbers(template, f!), template).toEqual([])
    }
  })
  it('"two things" in the headline is a fact when the headline names two factors (also when she cannot register)', () => {
    // Pre-caching every answer path: with "No, I can't" (register to vote) the facts had no 2, so
    // Claude's "Two things are holding you back" failed the checker twice and the headline fell back.
    for (const canRegisterToVote of [true, false]) {
      const r = analyseProfile({ ...p.report, canRegisterToVote, bank: p.bank!, decline: p.decline! }, null)
      const f = factsFor({ what: 'headline' }, r)!
      expect(f).toContain('Factors named in the headline: 2')
      const worded = "Two things are holding you back most: how much of your credit limit you're using, and how well lenders can confirm who you are."
      expect(problemsWith(worded, { facts: f, template: r.result.headline })).toEqual([])
    }
  })
  it('a worded step with a wrong amount fails', () => {
    const f = factsFor({ what: 'step', plan: '3m', stepIndex: 7 }, res)!
    expect(problemsWith('On 8 Dec 2026, pay £180 extra off your Barclaycard.', { facts: f, template: '' })).toEqual(['£180 is not in the data'])
  })
})

describe('goal in own words (keywords)', async () => {
  const { parseGoal } = await import('../src/questions.ts')
  it.each([
    ['A mortgage', 'mortgage'],
    ['I want to buy my first flat', 'mortgage'],
    ["I'd like to be able to rent a nicer flat", 'build'],
    ['A credit card', 'card'],
    ['Car finance', 'build'],
    ['Just build my credit', 'build'],
  ])('%s', (text, goal) => {
    expect(parseGoal(text).goal).toBe(goal)
  })
})
