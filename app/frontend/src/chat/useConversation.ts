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
  entries: Entry[]
  /** Messages from the last response not shown yet. */
  queue: AgentMessage[]
  /** The agent message in the dialogue box (typing or typed). null while waiting or after a reply. */
  currentKey: string | null
  pending: Pending | null
  error: string | null
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
  entries: [],
  queue: [],
  currentKey: null,
  pending: null,
  error: null,
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
  | { type: 'error'; message: string }
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
      return { ...s, pending: null, error: a.message }
    case 'release':
      return { ...s, pending: null }
    case 'turn': {
      const r = a.response
      const whatIfs = r.whatIf ? { ...s.whatIfs, [r.whatIf.id]: r.whatIf } : s.whatIfs
      return showNext({
        ...s,
        sessionId: r.sessionId,
        step: r.step,
        expects: r.expects,
        result: r.result ?? s.result,
        paperUrl: r.paperUrl ?? s.paperUrl,
        whatIfs,
        queue: [...s.queue, ...r.messages],
        pending: null,
        error: null,
        hasLetter: s.hasLetter || !!a.letter,
        personaId: a.personaId ?? s.personaId,
        plan: planFrom(r.messages, s.plan),
      })
    }
    case 'whatif': {
      const r = a.response
      return showNext({
        ...s,
        whatIfs: { ...s.whatIfs, [r.whatIf.id]: r.whatIf },
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

  const turn = useCallback(
    async (input: TurnInput, extra: { letter?: boolean; personaId?: string } = {}) => {
      const run = async () => {
        dispatch({ type: 'pending', pending: { kind: 'turn', label: 'The agent is thinking' } })
        try {
          const response = await api.turn({
            sessionId: stateRef.current.sessionId,
            input,
            settings: { plainEnglish: optsRef.current.plainEnglish },
          })
          retryRef.current = null
          dispatch({ type: 'turn', response, ...extra })
        } catch (e) {
          retryRef.current = run
          if (!(e instanceof ApiFailure)) console.error(e)
          else if (e.detail) console.info('[api]', e.detail)
          dispatch({ type: 'error', message: e instanceof ApiFailure ? e.message : "Something went wrong on my side. Let's try that again." })
        }
      }
      await run()
    },
    [api],
  )

  const start = useCallback(() => {
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

  const upload = useCallback(
    async (file: File, fileKind: FileKind) => {
      const run = async () => {
        dispatch({ type: 'pending', pending: { kind: 'upload', label: `The agent is reading ${file.name}` } })
        try {
          const up = await api.upload(file, fileKind, stateRef.current.sessionId)
          if (!up.ok || !up.fileId) {
            dispatch({ type: 'release' })
            dispatch({ type: 'notice', text: up.error ?? "I couldn't read that one. You can try the sample instead." })
            retryRef.current = null
            return false
          }
          dispatch({ type: 'you', text: `Handed over ${file.name} (${KIND_WORD[fileKind]})`, findings: up.findings })
          await turn({ type: 'file', fileKind, fileId: up.fileId }, { letter: fileKind === 'letter' })
          return true
        } catch (e) {
          retryRef.current = async () => void (await run())
          dispatch({ type: 'error', message: e instanceof ApiFailure ? e.message : "I couldn't take that file just now. Try again?" })
          return false
        }
      }
      return run()
    },
    [api, turn],
  )

  const whatIf = useCallback(
    async (req: Omit<WhatIfRequest, 'sessionId'>, label: string) => {
      const sessionId = stateRef.current.sessionId
      if (!sessionId) return
      dispatch({ type: 'you', text: label })
      const run = async () => {
        dispatch({ type: 'pending', pending: { kind: 'whatif', label: 'The agent is working it out' } })
        try {
          const response = await api.whatIf({ sessionId, ...req } as WhatIfRequest)
          retryRef.current = null
          dispatch({ type: 'whatif', response })
        } catch (e) {
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

  return { state, current, start, choose, skip, sample, upload, whatIf, retry, advance, showAll }
}

export type Conversation = ReturnType<typeof useConversation>
