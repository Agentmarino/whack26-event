// The data layer. One interface, two implementations:
//   mock: mockTurn() and friends from app/shared (VITE_USE_MOCK=true, the default)
//   live: the 113 backend on /api through the Vite proxy (VITE_USE_MOCK=false)
// URL overrides for the phone: ?mock=error forces the error state, ?mock=uploadfail makes uploads fail,
// ?mock=off uses the backend, ?mock=on the mock, whatever the env says.
import {
  PersonasResponse, TurnResponse, UploadResult, WhatIfResponse,
  type FileKind, type Persona, type TurnRequest, type WhatIfRequest,
} from 'shared'
import { initialMockState, mockPersonas, mockTurn, mockUpload, mockWhatIf, type MockState } from 'shared/mock-conversation'

export interface Api {
  mode: 'mock' | 'live'
  turn(req: TurnRequest): Promise<TurnResponse>
  upload(file: File, fileKind: FileKind, sessionId: string | null): Promise<UploadResult>
  /** A pasted letter: the upload route's `text` field instead of a file (113 contract note). */
  uploadText(text: string, fileKind: FileKind, sessionId: string | null): Promise<UploadResult>
  whatIf(req: WhatIfRequest): Promise<WhatIfResponse>
  personas(): Promise<Persona[]>
  /** The summary PDF as a blob, or null when it is not ready (404 or no backend). */
  paper(url: string): Promise<Blob | null>
}

/** A failure the person can read. `detail` goes to the console only. */
export class ApiFailure extends Error {
  readonly detail?: unknown
  /** HTTP status, when the server answered. 404 on /api/turn = the session is gone (start again). */
  readonly status?: number
  constructor(message: string, detail?: unknown, status?: number) {
    super(message)
    this.detail = detail
    this.status = status
  }
}

const FRIENDLY = "I couldn't reach the desk just now. Check your connection and try again."

const param = () => new URLSearchParams(window.location.search).get('mock')

export function mockFromEnv(): boolean {
  const p = param()
  if (p === 'off' || p === 'false' || p === '0') return false
  if (p === 'on' || p === 'true' || p === '1' || p === 'error' || p === 'uploadfail') return true
  return import.meta.env.VITE_USE_MOCK !== 'false'
}

// ---------- mock ----------
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function createMockApi(opts: { latencyMs?: number } = {}): Api {
  let state: MockState = initialMockState
  const forceError = param() === 'error'
  const uploadFail = param() === 'uploadfail'
  const latency = opts.latencyMs ?? 450
  // A restart bumps the generation; a slower call from before it must not move the mock state on.
  let generation = 0
  const fail = () => {
    throw new ApiFailure(FRIENDLY, 'mock=error')
  }
  return {
    mode: 'mock',
    async turn(req) {
      const gen = req.input.type === 'start' ? ++generation : generation
      // The analysis turn takes a little longer, so the thinking pose has time to show.
      await wait(state.last?.step === 'assessing' ? latency * 3 : latency)
      if (forceError) fail()
      if (gen !== generation) throw new ApiFailure('That answer was for the earlier conversation.', 'stale')
      const out = mockTurn(state, req)
      state = out.state
      return out.response
    },
    async upload(file, fileKind) {
      await wait(latency * 2)
      if (forceError) fail()
      return mockUpload(fileKind, file.name, { fail: uploadFail })
    },
    async uploadText(_text, fileKind) {
      await wait(latency * 2)
      if (forceError) fail()
      return mockUpload(fileKind, 'pasted-letter.txt', { fail: uploadFail })
    },
    async whatIf(req) {
      await wait(latency)
      if (forceError) fail()
      const out = mockWhatIf(state, req)
      state = out.state
      return out.response
    },
    async personas() {
      await wait(latency / 3)
      if (forceError) fail()
      return mockPersonas()
    },
    async paper() {
      await wait(latency / 3)
      return null // no PDF without the backend
    },
  }
}

// ---------- live ----------
type Schema<T> = { safeParse(v: unknown): { success: true; data: T } | { success: false; error: unknown } }

/** Validate against the contract. On a mismatch, warn and use the data as it came (the cards render defensively). */
function check<T>(schema: Schema<T>, data: unknown, what: string): T {
  const r = schema.safeParse(data)
  if (r.success) return r.data
  console.warn(`[api] ${what} does not match the contract`, r.error)
  return data as T
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(path, init)
  } catch (e) {
    throw new ApiFailure(FRIENDLY, e)
  }
  let body: unknown = null
  const text = await res.text()
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  if (!res.ok) {
    const msg = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' ? body.error : null
    throw new ApiFailure(res.status >= 500 || !msg ? FRIENDLY : msg, { status: res.status, body: msg ?? text.slice(0, 200) }, res.status)
  }
  return body
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

export function createLiveApi(base = ''): Api {
  return {
    mode: 'live',
    async turn(req) {
      return check(TurnResponse, await request(`${base}/api/turn`, json(req)), 'POST /api/turn')
    },
    async upload(file, fileKind, sessionId) {
      const form = new FormData()
      form.append('fileKind', fileKind)
      form.append('sessionId', sessionId ?? '')
      form.append('file', file, file.name)
      return check(UploadResult, await request(`${base}/api/upload`, { method: 'POST', body: form }), 'POST /api/upload')
    },
    async uploadText(text, fileKind, sessionId) {
      const form = new FormData()
      form.append('fileKind', fileKind)
      form.append('sessionId', sessionId ?? '')
      form.append('text', text)
      return check(UploadResult, await request(`${base}/api/upload`, { method: 'POST', body: form }), 'POST /api/upload')
    },
    async whatIf(req) {
      return check(WhatIfResponse, await request(`${base}/api/whatif`, json(req)), 'POST /api/whatif')
    },
    async personas() {
      return check(PersonasResponse, await request(`${base}/api/personas`), 'GET /api/personas')
    },
    async paper(url) {
      try {
        const res = await fetch(url)
        if (!res.ok) return null
        const type = res.headers.get('content-type') ?? ''
        if (!type.includes('pdf')) return null
        return await res.blob()
      } catch {
        return null
      }
    },
  }
}

export const createApi = (mock: boolean): Api => (mock ? createMockApi() : createLiveApi())
