// JSON schemas for every Claude call that must return JSON, sent as structured output
// (output_config.format, type json_schema), so the reply is always parseable JSON in this shape.
// The zod checks, the number checker and the template fallback stay as they were: a schema
// guarantees the shape, not the content.
//
// Structured-output rules (platform.claude.com/docs/en/build-with-claude/structured-outputs):
// every object has additionalProperties: false; no min/max/minLength/maxLength; no dynamic keys;
// at most 24 optional properties and 16 union-typed properties in one request.
// `schemaProblems()` checks these, and test/schemas.test.ts runs it on every schema below.

type Json = Record<string, unknown>

const str = { type: 'string' } as const
const num = { type: 'number' } as const
const bool = { type: 'boolean' } as const
const strOrNull = { type: ['string', 'null'] } as const
const arr = (items: Json) => ({ type: 'array', items })
const en = (values: readonly string[]) => ({ type: 'string', enum: [...values] })

/** An object schema. Keys in `optional` may be left out; every other key is required. */
function obj(properties: Record<string, Json>, optional: string[] = []): Json {
  return { type: 'object', properties, required: Object.keys(properties).filter(k => !optional.includes(k)), additionalProperties: false }
}

/** wording.ts: the agent's words for the headline, each reason and each plan step. */
export const WORDING = obj({ items: arr(obj({ id: str, text: str })) })

/** whatif.ts: a what-if question turned into the engine's levers. */
export const WHATIF = obj(
  {
    changes: arr({
      anyOf: [
        obj({ lever: { const: 'paydown' }, value: num }),
        obj({ lever: { const: 'stop' }, what: en(['bnpl', 'gambling', 'payday']) }),
        obj({ lever: { const: 'electoralRoll' }, value: bool }),
        obj({ lever: { const: 'removeAssociates' } }),
        obj({ lever: { const: 'clearCard' }, card: str }, ['card']),
        obj({ lever: { const: 'rentReporting' }, value: bool }),
      ],
    }),
    reason: str,
  },
  ['reason'],
)

/** questions.ts: a goal in the person's own words → one of the engine's goals. */
export const GOAL = obj({ goal: en(['card', 'mortgage', 'build']) })

/** bank.ts: payee names the keywords don't know → categories. A list, because structured output has no maps. */
export const bankPayees = (categories: readonly string[]) => obj({ categories: arr(obj({ payee: str, category: en(categories) })) })

/** ingest.ts: a bank statement PDF or photo → its rows. */
export const BANK_ROWS = obj({ rows: arr(obj({ date: str, description: str, amount: num })) })

/** ingest.ts: a decline letter → who, what, when, which agency, the reasons it states. */
export const LETTER = obj({
  lender: str,
  product: strOrNull,
  date: strOrNull,
  // An enum can't share a type array with null (the API answers 400): a nullable enum is anyOf.
  cra: { anyOf: [en(['Experian', 'Equifax', 'TransUnion']), { type: 'null' }] },
  reasons: arr(str),
})

/** ingest.ts: a credit report PDF or photo → credit-coach-report/v1 (the engine's parseReport input). Fields not shown are left out. */
export const REPORT = obj({
  format: { const: 'credit-coach-report/v1' },
  provider: en(['Experian', 'Equifax', 'TransUnion']),
  reportDate: str,
  score: obj({ value: num, scaleMax: num, band: str }, ['band']),
  personal: obj({ name: str, dateOfBirth: str, declaredIncome: num, residentialStatus: en(['rent', 'own', 'family']) }, ['dateOfBirth', 'declaredIncome', 'residentialStatus']),
  addresses: arr(obj({ address: str, from: str, to: str, current: bool }, ['from', 'to'])),
  electoralRoll: arr(obj({ address: str, registered: bool })),
  accounts: arr(
    obj(
      {
        type: en(['credit_card', 'loan', 'mortgage', 'current_account', 'current_account_overdraft', 'communications', 'utility', 'other']),
        lender: str,
        opened: str,
        status: en(['open', 'closed', 'settled']),
        limit: num,
        balance: num,
        apr: num,
        monthlyPayment: num,
        directDebit: bool,
        paymentPattern: en(['minimum', 'full', 'fixed']),
        paymentHistory: arr(obj({ month: str, status: str })),
      },
      ['opened', 'limit', 'balance', 'apr', 'monthlyPayment', 'directDebit', 'paymentPattern', 'paymentHistory'],
    ),
  ),
  searches: arr(obj({ date: str, organisation: str, purpose: str, type: en(['hard', 'soft']) }, ['purpose'])),
  publicRecords: arr(obj({ type: en(['CCJ', 'IVA', 'bankruptcy']), date: str, amount: num })),
  defaults: arr(obj({ lender: str, date: str, amount: num })),
  financialAssociates: arr(obj({ name: str, reason: str, stillLinked: bool }, ['reason'])),
})

const UNSUPPORTED = ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'minLength', 'maxLength', 'pattern', 'maxItems', 'patternProperties', 'propertyNames']

/** Everything in a schema that breaks the structured-output rules. Empty = fine to send. */
export function schemaProblems(schema: Json): string[] {
  const problems: string[] = []
  let optional = 0
  let unions = 0
  const walk = (s: Json, at: string) => {
    for (const k of UNSUPPORTED) if (k in s) problems.push(`${at}: "${k}" is not supported`)
    if ('anyOf' in s || Array.isArray(s.type)) unions++
    if (Array.isArray(s.type) && 'enum' in s) problems.push(`${at}: an enum with a type array is rejected; use anyOf`)
    if (s.type === 'object') {
      if (s.additionalProperties !== false) problems.push(`${at}: additionalProperties must be false`)
      const props = (s.properties ?? {}) as Record<string, Json>
      if (!Object.keys(props).length) problems.push(`${at}: an object needs properties (no maps)`)
      const required = (s.required ?? []) as string[]
      for (const r of required) if (!(r in props)) problems.push(`${at}: required "${r}" is not a property`)
      optional += Object.keys(props).filter(k => !required.includes(k)).length
      for (const [k, v] of Object.entries(props)) walk(v, `${at}.${k}`)
    }
    if (s.type === 'array' && s.items) walk(s.items as Json, `${at}[]`)
    if (Array.isArray(s.anyOf)) (s.anyOf as Json[]).forEach((v, i) => walk(v, `${at}|${i}`))
  }
  walk(schema, '$')
  if (optional > 24) problems.push(`${optional} optional properties (at most 24)`)
  if (unions > 16) problems.push(`${unions} union-typed properties (at most 16)`)
  return problems
}
