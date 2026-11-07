// Settings from the repo-root .env (never printed). Read once at start-up.

import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const BACKEND_DIR = join(here, '..')
export const REPO_ROOT = join(BACKEND_DIR, '..', '..')
export const DATA_DIR = join(BACKEND_DIR, 'data')

const envFile = join(REPO_ROOT, '.env')
// Node's own .env reader (Node 20.12+). Values already in the environment win, so tests and
// `DEMO_OFFLINE=true pnpm dev` can override the file.
if (existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile)
  } catch {
    // A malformed .env should not stop the demo; Claude calls just fall back to templates.
  }
}

const flag = (v: string | undefined, dflt: boolean) => (v === undefined || v === '' ? dflt : /^(1|true|yes|on)$/i.test(v))

export const config = {
  port: Number(process.env.PORT || 8000),
  host: process.env.HOST || '0.0.0.0',
  /** One line to change the model. */
  model: process.env.LLM_MODEL || 'claude-sonnet-5-5',
  /** true = no network calls at all: the cache, then templates. */
  get offline() {
    return flag(process.env.DEMO_OFFLINE, false)
  },
  /** What to fall back to when Claude fails twice. Only `template` exists. */
  aiFallback: process.env.AI_FALLBACK || 'template',
  get hasKey() {
    return Boolean(process.env.ANTHROPIC_API_KEY)
  },
}
