// The Fastify app: every route from app/shared/contract.ts (ROUTES). Every error body is {error: string}.

import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'
import { TurnRequest, WhatIfRequest } from 'shared'
import type { WhatIfResponse } from 'shared'
import { handleTurn } from './conversation.ts'
import { toMessage, type Wording } from './messages.ts'
import { claudeWording } from './wording.ts'
import { HttpError } from './errors.ts'
import { personas } from './personas.ts'
import { getSession } from './session.ts'
import { whatIfFromChanges, whatIfFromText } from './whatif.ts'

/** Origins allowed to call the API: the Vite dev server on localhost and on any private LAN address (the phone). */
const ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[\w-]+\.local)(:\d+)?$/

export type AppOptions = { wording?: Wording; logger?: boolean }

export async function buildApp(opts: AppOptions = {}): Promise<FastifyInstance> {
  const wording = opts.wording ?? claudeWording
  const app = Fastify({ logger: opts.logger ?? false, bodyLimit: 12 * 1024 * 1024 })

  await app.register(cors, { origin: (origin, cb) => cb(null, !origin || ORIGIN.test(origin)) })

  app.setErrorHandler((err, _req, reply) => {
    const e = err as { statusCode?: number; message?: string }
    const status = err instanceof HttpError ? err.status : e.statusCode && e.statusCode >= 400 ? e.statusCode : 500
    if (status >= 500) app.log.error(err)
    reply.status(status).send({ error: status >= 500 ? 'Something went wrong on our side. Please try again.' : (e.message ?? 'Bad request') })
  })
  app.setNotFoundHandler((req, reply) => reply.status(404).send({ error: `No route ${req.method} ${req.url}` }))

  const parse = <T>(schema: { safeParse(x: unknown): { success: true; data: T } | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } } }, body: unknown): T => {
    const r = schema.safeParse(body)
    if (!r.success) {
      const i = r.error.issues[0]
      throw new HttpError(400, `Invalid request${i ? `: ${i.path.join('.') || 'body'} ${i.message}` : ''}`)
    }
    return r.data
  }

  app.get('/api/health', async () => ({ ok: true }))

  app.get('/api/personas', async () => personas())

  app.post('/api/turn', async req => handleTurn(parse(TurnRequest, req.body), wording))

  app.post('/api/whatif', async (req): Promise<WhatIfResponse> => {
    const body = parse(WhatIfRequest, req.body)
    const s = getSession(body.sessionId)
    if (!s) throw new HttpError(404, "I can't find that conversation (the server may have restarted). Please start again.")
    if (!s.result) throw new HttpError(409, "Let's finish your check first, then you can try what-ifs.")
    const out = body.changes ? whatIfFromChanges(s, body.changes) : await whatIfFromText(s, body.text!)
    if (!out.ok) throw new HttpError(422, out.draft.text)
    return { sessionId: s.id, messages: [toMessage(s, out.draft, 'template')], whatIf: out.run }
  })

  app.post('/api/upload', async () => {
    throw new HttpError(501, 'Uploads are not ready yet. Please use a sample for now.')
  })

  app.get<{ Params: { file: string } }>('/api/paper/:file', async req => {
    const id = req.params.file.replace(/\.pdf$/, '')
    const s = getSession(id)
    if (!s || !s.paperReady) throw new HttpError(404, 'Summary not ready yet')
    throw new HttpError(404, 'Summary not ready yet')
  })

  return app
}
