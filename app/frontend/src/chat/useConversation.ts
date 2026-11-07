// The conversation: one request, one response, then the person taps through the messages.
// State is the contract's TurnResponse fields plus what the frontend keeps (history, queue, what-ifs).
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import type {
  AgentMessage, EngineResult, Expects, FileKind, Finding, Persona, PlanId, Step, TurnInput, TurnResponse, WhatIfRequest,
  WhatIfResponse, WhatIfRun,
} from 'shared'
import { ApiFailure, type Api } from '../api/client'

export type Entry =
  | { type: 'agent'; key: string; msg: AgentMessage }
  | { type: 'you'; key: string; text: string; findings?: Finding[] }
  | { type: 'notice'; key: string; text: string }

export type Pending = { kind: 'turn' | 'upload' | 'whatif'; label: string }

export interface ConvState {
  sessionId: string | null
  step: Step | null
  expects: Expects | null
  result: EngineResult | null
  paperUrl: string | null
  whatIfs: Record<string, WhatIfRun>
  /** The plan each what-if was answered for (cards keep quoting it if the person switches plan later). */
  whatIfPlans: Record<string, PlanId>
  entries: Entry[]
  /** Messages from the last response not shown yet. */
  queue: AgentMessage[]
  /** The agent message in the dialogue box (typing or typed). null while waiting or after a reply. */
  currentKey: string | null
  pending: Pending | null
  error: string | null
  /** The server no longer knows the session (it restarted): offer "Start again", not "Try again". */
  sessionGone: boolean
  personaId: string | null
  hasLetter: boolean
  plan: PlanId
  /** Bumps on restart so entry keys stay unique. */
  run: number
}

const initial: ConvState = {
  sessionId: null,
  step: null,
  expects: null,
  result: null,
  paperUrl: null,
  whatIfs: {},
  whatIfPlans: {},
  entries: [],
  queue: [],
  currentKey: null,
  pending: null,
  error: null,
  sessionGone: false,
  personaId: null,
  hasLetter: false,
  plan: '3m',
  run: 0,
}

type Action =
  | { type: 'restart' }
  | { type: 'you'; text: string; findings?: Finding[] }
  | { type: 'notice'; text: string }
  | { type: 'pending'; pending: Pending }
  | { type: 'error'; message: string; sessionGone?: boolean }
  | { type: 'turn'; response: TurnResponse; letter?: boolean; personaId?: string }
  | { type: 'whatif'; response: WhatIfResponse }
  | { type: 'advance' }
  | { type: 'showAll' }
  | { type: 'release' }

let seq = 0
const key = (run: number, id: string) => `${run}:${id}:${++seq}`

function planFrom(messages: AgentMessage[], fallback: PlanId): PlanId {
  for (const m of messages) if (m.ref && (m.ref.on === 'step' || m.ref.on === 'projection')) return m.ref.plan
  return fallback
}

/** Show the next queued message as the current one. */
function showNext(s: ConvState): ConvState {
  const [next, ...rest] = s.queue
  if (!next) return s
  const k = key(s.run, next.id)
  return { ...s, queue: rest, entries: [...s.entries, { type: 'agent', key: k, msg: next }], currentKey: k }
}

function reducer(s: ConvState, a: Action): ConvState {
  switch (a.type) {
    case 'restart':
      return { ...initial, run: s.run + 1 }
    case 'you':
      return { ...s, currentKey: null, entries: [...s.entries, { type: 'you', key: key(s.run, 'you'), text: a.text, findings: a.findings }] }
    case 'notice':
      return { ...s, entries: [...s.entries, { type: 'notice', key: key(s.run, 'notice'), text: a.text }] }
    case 'pending':
      return { ...s, pending: a.pending, error: null, currentKey: null }
    case 'error':
      return { ...s, pending: null, error: a.message, sessionGone: !!a.sessionGone }
    case 'release':
      return { ...s, pending: null }
    case 'turn': {
      const r = a.response
      const whatIfs = r.whatIf ? { ...s.whatIfs, [r.whatIf.id]: r.whatIf } : s.whatIfs
      const plan = planFrom(r.messages, s.plan)
      const whatIfPlans = r.whatIf ? { ...s.whatIfPlans, [r.whatIf.id]: plan } : s.whatIfPlans
      return showNext({
        ...s,
        sessionId: r.sessionId,
        step: r.step,
        expects: r.expects,
        result: r.result ?? s.result,
        paperUrl: r.paperUrl ?? s.paperUrl,
        whatIfs,
        whatIfPlans,
        queue: [...s.queue, ...r.messages],
        pending: null,
        error: null,
        hasLetter: s.hasLetter || !!a.letter,
        personaId: a.personaId ?? s.personaId,
        plan,
      })
    }
    case 'whatif': {
      const r = a.response
      return showNext({
        ...s,
        whatIfs: { ...s.whatIfs, [r.whatIf.id]: r.whatIf },
        whatIfPlans: { ...s.whatIfPlans, [r.whatIf.id]: s.plan },
        queue: [...s.queue, ...r.messages],
        pending: null,
        error: null,
      })
    }
    case 'advance':
      return showNext(s)
    case 'showAll': {
      let next = s
      while (next.queue.length) next = showNext(next)
      return next
    }
  }
}

const KIND_WORD: Record<FileKind, string> = { credit_report: 'credit report', bank: 'bank statement', letter: 'decline letter' }
export const kindWord = (k: FileKind) => KIND_WORD[k]

export function useConversation(api: Api, opts: { plainEnglish: boolean; personas: Persona[] }) {
  const [state, dispatch] = useReducer(reducer, initial)
  const stateRef = useRef(state)
  stateRef.current = state
  const optsRef = useRef(opts)
  optsRef.current = opts
  /** The last request that failed, for "Try again". */
  const retryRef = useRef<(() => Promise<void>) | null>(null)
  /** Bumped on every (re)start, synchronously: a reply to a request from before a restart is dropped. */
  const runRef = useRef(0)

  const turn = useCallback(
    async (input: TurnInput, extra: { letter?: boolean; personaId?: string } = {}) => {
      const run = async () => {
        const myRun = runRef.current
        dispatch({ type: 'pending', pending: { kind: 'turn', label: 'The agent is thinking' } })
        try {
          const response = await api.turn({
            sessionId: input.type === 'start' ? null : stateRef.current.sessionId,
            input,
            settings: { plainEnglish: optsRef.current.plainEnglish },
          })
          if (runRef.current !== myRun) return
          retryRef.current = null
          dispatch({ type: 'turn', response, ...extra })
        } catch (e) {
          if (runRef.current !== myRun) return
          retryRef.current = run
          if (!(e instanceof ApiFailure)) console.error(e)
          else if (e.detail) console.info('[api]', e.detail)
          if (e instanceof ApiFailure && e.status === 404 && input.type !== 'start') {
            dispatch({ type: 'error', message: 'The desk lost our conversation (it restarted). Shall we start again?', sessionGone: true })
            return
          }
          dispatch({ type: 'error', message: e instanceof ApiFailure ? e.message : "Something went wrong on my side. Let's try that again." })
        }
      }
      await run()
    },
    [api],
  )

  const start = useCallback(() => {
    runRef.current += 1
    retryRef.current = null
    dispatch({ type: 'restart' })
    void turn({ type: 'start' })
  }, [turn])

  const choose = useCallback(
    (value: string, how: 'choice' | 'text' = 'choice') => {
      dispatch({ type: 'you', text: value })
      void turn(how === 'choice' ? { type: 'choice', value } : { type: 'text', value })
    },
    [turn],
  )

  const skip = useCallback(
    (label?: string) => {
      if (label) dispatch({ type: 'you', text: label })
      void turn({ type: 'skip' })
    },
    [turn],
  )

  const personaName = (id: string | null) => optsRef.current.personas.find((p) => p.id === id)?.name ?? 'the'

  const sample = useCallback(
    (fileKind: FileKind, personaId?: string) => {
      const id = personaId ?? stateRef.current.personaId ?? undefined
      const who = personaName(id ?? null)
      dispatch({ type: 'you', text: `Use ${who === 'the' ? 'the' : `${who}'s`} sample ${KIND_WORD[fileKind]}` })
      void turn({ type: 'sample', fileKind, ...(id ? { personaId: id } : {}) }, { letter: fileKind === 'letter', personaId: id })
    },
    [turn],
  )

  const handOver = useCallback(
    async (what: { file: File } | { text: string }, fileKind: FileKind) => {
      const name = 'file' in what ? what.file.name : 'your pasted letter'
      const run = async (): Promise<boolean> => {
        const myRun = runRef.current
        dispatch({ type: 'pending', pending: { kind: 'upload', label: `The agent is reading ${name}` } })
        try {
          const sessionId = stateRef.current.sessionId
          const up = 'file' in what ? await api.upload(what.file, fileKind, sessionId) : await api.uploadText(what.text, fileKind, sessionId)
          if (runRef.current !== myRun) return false
          if (!up.ok || !up.fileId) {
            dispatch({ type: 'release' })
            dispatch({ type: 'notice', text: up.error ?? "I couldn't read that one. You can try the sample instead." })
            retryRef.current = null
            return false
          }
          dispatch({ type: 'you', text: 'file' in what ? `Handed over ${name} (${KIND_WORD[fileKind]})` : `Pasted the ${KIND_WORD[fileKind]}`, findings: up.findings })
          await turn({ type: 'file', fileKind, fileId: up.fileId }, { letter: fileKind === 'letter' })
          return true
        } catch (e) {
          if (runRef.current !== myRun) return false
          // The server refused this file (too big, wrong type, ...): say why and keep Upload / Use a sample.
          if (e instanceof ApiFailure && e.status && e.status >= 400 && e.status < 500) {
            retryRef.current = null
            dispatch({ type: 'release' })
            dispatch({ type: 'notice', text: e.message })
            return false
          }
          retryRef.current = async () => void (await run())
          dispatch({ type: 'error', message: e instanceof ApiFailure ? e.message : "I couldn't take that just now. Try again?" })
          return false
        }
      }
      return run()
    },
    [api, turn],
  )
  const upload = useCallback((file: File, fileKind: FileKind) => handOver({ file }, fileKind), [handOver])
  const pasteText = useCallback((text: string, fileKind: FileKind) => handOver({ text }, fileKind), [handOver])

  const whatIf = useCallback(
    async (req: Omit<WhatIfRequest, 'sessionId'>, label: string) => {
      const sessionId = stateRef.current.sessionId
      if (!sessionId) return
      dispatch({ type: 'you', text: label })
      const run = async () => {
        const myRun = runRef.current
        dispatch({ type: 'pending', pending: { kind: 'whatif', label: 'The agent is working it out' } })
        try {
          const response = await api.whatIf({ sessionId, ...req } as WhatIfRequest)
          if (runRef.current !== myRun) return
          retryRef.current = null
          dispatch({ type: 'whatif', response })
        } catch (e) {
          if (runRef.current !== myRun) return
          if (e instanceof ApiFailure && e.status === 404) {
            retryRef.current = null
            dispatch({ type: 'error', message: 'The desk lost our conversation (it restarted). Shall we start again?', sessionGone: true })
            return
          }
          // 409 (not checked yet) and 422 (no lever in those words) carry a friendly sentence: say it, carry on.
          if (e instanceof ApiFailure && (e.status === 409 || e.status === 422)) {
            retryRef.current = null
            dispatch({ type: 'release' })
            dispatch({ type: 'notice', text: e.message })
            return
          }
          retryRef.current = run
          dispatch({ type: 'error', message: e instanceof ApiFailure ? e.message : "I couldn't work that one out. Try again?" })
        }
      }
      await run()
    },
    [api],
  )

  const retry = useCallback(() => {
    const r = retryRef.current
    if (r) void r()
    else if (!stateRef.current.sessionId) start()
  }, [start])

  const advance = useCallback(() => dispatch({ type: 'advance' }), [])
  const showAll = useCallback(() => dispatch({ type: 'showAll' }), [])

  // Start once on mount.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    start()
  }, [start])

  const current = useMemo(() => {
    const e = state.entries.find((x) => x.key === state.currentKey)
    return e && e.type === 'agent' ? e : null
  }, [state.entries, state.currentKey])

  return { state, current, start, choose, skip, sample, upload, pasteText, whatIf, retry, advance, showAll }
}

export type Conversation = ReturnType<typeof useConversation>
