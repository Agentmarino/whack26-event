// The Fastify app: every route from app/shared/contract.ts (ROUTES). Every error body is {error: string}.

import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import Fastify, { type FastifyInstance } from 'fastify'
import { FileKind, TurnRequest, WhatIfRequest } from 'shared'
import type { UploadResult, WhatIfResponse } from 'shared'
import { handleTurn } from './conversation.ts'
import { toMessage, type Wording } from './messages.ts'
import { claudeWording } from './wording.ts'
import { HttpError } from './errors.ts'
import { ingest } from './ingest.ts'
import { paperModel, renderPaper } from './paper.ts'
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
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 10 } })

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

  // Multipart: `file`, `fileKind` (credit_report | bank | letter), `sessionId` (may be empty).
  // Also takes a `text` field instead of a file (a pasted letter). Fields may come before or after the file.
  app.post('/api/upload', async (req): Promise<UploadResult> => {
    if (!req.isMultipart()) throw new HttpError(400, 'Send multipart/form-data with fields file, fileKind and sessionId')
    let file: { fileName: string; mime: string; data: Buffer } | null = null
    const fields: Record<string, string> = {}
    for await (const part of req.parts()) {
      if (part.type === 'file') {
        const data = await part.toBuffer()
        if (part.file.truncated) throw new HttpError(413, 'That file is too big. The limit is 10 MB.')
        file = { fileName: part.filename || 'upload', mime: part.mimetype, data }
      } else fields[part.fieldname] = String(part.value ?? '')
    }
    const kind = FileKind.safeParse(fields.fileKind)
    if (!kind.success) throw new HttpError(400, 'fileKind must be credit_report, bank or letter')
    const text = fields.text?.trim() ? fields.text : null
    if (!file?.data.length && !text) throw new HttpError(400, 'No file in the upload')
    return ingest(kind.data, { fileName: file?.fileName ?? 'pasted text', mime: file?.mime ?? 'text/plain', data: file?.data.length ? file.data : null, text })
  })

  app.get<{ Params: { file: string } }>('/api/paper/:file', async (req, reply) => {
    const id = decodeURIComponent(req.params.file).replace(/\.pdf$/, '')
    const s = getSession(id)
    if (!s || !s.paperReady || !s.result) throw new HttpError(404, 'Summary not ready yet')
    const pdf = await renderPaper(paperModel(s.result, s.plan ?? s.horizon))
    return reply
      .type('application/pdf')
      .header('content-disposition', 'inline; filename="credit-check-summary.pdf"')
      .header('cache-control', 'no-store')
      .send(pdf)
  })

  return app
}
