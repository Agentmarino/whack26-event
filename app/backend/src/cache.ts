// Good Claude outputs, kept in data/ai-cache.json so the demo runs offline (DEMO_OFFLINE=true).
// Key: a hash of the purpose and the input, never the session. Only outputs that passed their
// checks are written.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.ts'

type Entry = { purpose: string; text: string; at: string }

const FILE = process.env.AI_CACHE_FILE || join(DATA_DIR, 'ai-cache.json')
let entries: Record<string, Entry> | null = null

function load(): Record<string, Entry> {
  if (entries) return entries
  try {
    entries = existsSync(FILE) ? (JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, Entry>) : {}
  } catch {
    entries = {}
  }
  return entries
}

/** Stable JSON: sorted keys, so the same input always hashes the same. */
function stable(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(stable).join(',')}]`
  if (x && typeof x === 'object')
    return `{${Object.keys(x)
      .sort()
      .map(k => `${JSON.stringify(k)}:${stable((x as Record<string, unknown>)[k])}`)
      .join(',')}}`
  return JSON.stringify(x) ?? 'null'
}

export const cacheKey = (purpose: string, input: unknown) =>
  `${purpose}:${createHash('sha256').update(stable(input)).digest('hex').slice(0, 32)}`

export const cacheGet = (key: string): string | undefined => load()[key]?.text

export function cacheSet(key: string, purpose: string, text: string) {
  const all = load()
  if (all[key]?.text === text) return
  all[key] = { purpose, text, at: new Date().toISOString() }
  try {
    const tmp = `${FILE}.tmp`
    writeFileSync(tmp, JSON.stringify(all, null, 1) + '\n')
    renameSync(tmp, FILE)
  } catch (err) {
    console.warn(`[cache] could not write ${FILE}: ${err instanceof Error ? err.message : err}`)
  }
}

export const cacheSize = () => Object.keys(load()).length
