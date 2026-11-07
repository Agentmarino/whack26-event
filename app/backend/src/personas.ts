// The sample files behind "Use a sample" (data/personas/index.json): priya, mei, alex.
// Priya is an engine Profile split into three pieces (report, bank, letter). Mei and Alex are
// credit-coach-report/v1 files that already hold bank data and a decline letter.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CreditReport, Persona, Profile } from 'shared'
import type { Finding } from 'shared'
import * as E from '../engine/index.ts'
import { DATA_DIR } from './config.ts'

type IndexRow = Persona & { file: string; format: 'profile' | 'credit-coach-report/v1'; note?: string }

const DIR = join(DATA_DIR, 'personas')
const readJson = (file: string): unknown => JSON.parse(readFileSync(join(DIR, file), 'utf8'))

const index = readJson('index.json') as IndexRow[]

export const personas = (): Persona[] => index.map(({ id, name, blurb }) => ({ id, name, blurb }))
export const isPersona = (id: string) => index.some(p => p.id === id)

export type Findings = { report: Finding[]; bank: Finding[]; letter: Finding[] }

/** One persona, cut into the three pieces the samples hand over. */
export type Sample = {
  id: string
  /** The report part: everything except bank and decline. */
  report: Profile
  bank: Profile['bank'] | null
  decline: Profile['decline'] | null
  /** Engine findings when the sample is a report file (Mei, Alex); null for Priya (a Profile). */
  findings: Findings | null
  /** The report file itself already holds bank data and a letter ("Your sample already has that"). */
  bundled: { bank: boolean; letter: boolean }
}

const cache = new Map<string, Sample>()

export function sample(id: string): Sample | null {
  const hit = cache.get(id)
  if (hit) return structuredClone(hit)
  const row = index.find(p => p.id === id)
  if (!row) return null
  const raw = readJson(row.file)
  let s: Sample
  if (row.format === 'profile') {
    const p = Profile.parse(raw)
    const { bank, decline, ...report } = p
    s = { id, report, bank: bank ?? null, decline: decline ?? null, findings: null, bundled: { bank: false, letter: false } }
  } else {
    const report = CreditReport.parse(raw)
    const { profile, found } = E.parseReport(report)
    const { bank, decline, ...rest } = profile
    const hasBank = Boolean((raw as { bankData?: unknown }).bankData)
    s = {
      id,
      report: rest,
      bank: hasBank ? (bank ?? null) : null,
      decline: decline ?? null,
      findings: found,
      bundled: { bank: hasBank, letter: Boolean(decline) },
    }
  }
  cache.set(id, s)
  return structuredClone(s)
}
