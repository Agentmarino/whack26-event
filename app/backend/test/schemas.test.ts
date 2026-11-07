// Every Claude call that must return JSON sends one of these schemas as structured output.
// The API rejects a schema that breaks its rules (a 400 would turn every call into a template),
// so each one is checked here against those rules.

import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '../src/bank.ts'
import { BANK_ROWS, GOAL, LETTER, REPORT, WHATIF, WORDING, bankPayees, schemaProblems } from '../src/schemas.ts'

describe('structured-output schemas', () => {
  it.each([
    ['wording', WORDING],
    ['whatif', WHATIF],
    ['goal', GOAL],
    ['bank-payees', bankPayees(CATEGORIES)],
    ['read-bank', BANK_ROWS],
    ['read-letter', LETTER],
    ['read-report', REPORT],
  ])('%s follows the structured-output rules', (_name, schema) => {
    expect(schemaProblems(schema)).toEqual([])
  })

  it('the checker catches what the API rejects', () => {
    expect(schemaProblems({ type: 'object', properties: { a: { type: 'string' } }, required: ['a'] })).toEqual(['$: additionalProperties must be false'])
    expect(schemaProblems({ type: 'object', properties: {}, additionalProperties: false })).toEqual(['$: an object needs properties (no maps)'])
    expect(schemaProblems({ type: 'object', properties: { n: { type: 'number', minimum: 0 } }, required: ['n'], additionalProperties: false })).toEqual([
      '$.n: "minimum" is not supported',
    ])
    // Seen live on 2026-11-07: "Enum value 'Experian' does not match declared type '['string', 'null']'"
    expect(schemaProblems({ type: ['string', 'null'], enum: ['a', null] })).toEqual(['$: an enum with a type array is rejected; use anyOf'])
    const many = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`f${i}`, { type: 'string' }]))
    expect(schemaProblems({ type: 'object', properties: many, required: [], additionalProperties: false })).toEqual(['25 optional properties (at most 24)'])
  })
})
