// POST /api/turn: the step machine in app/shared/conversation.md.
// greet → ask_report → ask_bank → ask_letter → questions… → assessing → diagnosis → decline? → paper → coach…
// A letter is accepted at any step: one acknowledgement, step and expects unchanged.

import { paperUrlFor } from 'shared'
import type { AgentMessage, Expects, PlanId, Step, TurnInput, TurnRequest, TurnResponse, WhatIfRun } from 'shared'
import * as E from '../engine/index.ts'
import { analyseProfile, declineFor, surplusOf } from './analysis.ts'
import { HttpError } from './errors.ts'
import { isPersona, sample, type Sample } from './personas.ts'
import { answer, buildQueue, question } from './questions.ts'
import { getSession, messageId, newSession, type Session } from './session.ts'
import * as T from './templates.ts'
import { getUpload, type Piece } from './uploads.ts'
import { whatIfFromText } from './whatif.ts'

type Reply = { step: Step; drafts: T.Draft[]; expects: Expects; whatIf?: WhatIfRun | null }

/** Hook for block 3: Claude rewords the drafts that carry an `item`. Templates by default. */
export type Wording = (s: Session, drafts: T.Draft[]) => Promise<AgentMessage[]>

export const templateWording: Wording = async (s, drafts) => drafts.map(d => toMessage(s, d, 'template'))

export function toMessage(s: Session, d: T.Draft, writtenBy: 'template' | 'claude', text = d.text): AgentMessage {
  return {
    id: messageId(s, d.base),
    kind: d.kind,
    text,
    emote: d.emote,
    gesture: d.gesture,
    ...(d.ref ? { ref: d.ref } : {}),
    writtenBy,
  }
}

export async function handleTurn(req: TurnRequest, wording: Wording = templateWording): Promise<TurnResponse> {
  const input = req.input
  let s: Session
  if (input.type === 'start') {
    s = newSession()
  } else {
    if (!req.sessionId) throw new HttpError(400, 'No conversation yet. Send {type: "start"} first.')
    const found = getSession(req.sessionId)
    if (!found) throw new HttpError(404, "I can't find that conversation (the server may have restarted). Please start again.")
    s = found
  }
  if (req.settings) s.plainEnglish = req.settings.plainEnglish

  const reply = await step(s, input)
  s.step = reply.step
  s.lastExpects = reply.expects
  const messages = await wording(s, reply.drafts)
  return respond(s, messages, reply.expects, reply.whatIf ?? null)
}

export function respond(s: Session, messages: AgentMessage[], expects: Expects, whatIf: WhatIfRun | null): TurnResponse {
  return {
    sessionId: s.id,
    step: s.step,
    messages,
    expects,
    result: s.result,
    paperUrl: s.paperReady ? paperUrlFor(s.id) : null,
    ...(whatIf ? { whatIf } : {}),
  }
}

const isFile = (i: TurnInput): i is Extract<TurnInput, { type: 'file' | 'sample' }> => i.type === 'file' || i.type === 'sample'
const textOf = (i: TurnInput): string | null => (i.type === 'choice' || i.type === 'text' ? i.value : null)
const stay = (s: Session, drafts: T.Draft[]): Reply => ({ step: s.step, drafts, expects: s.lastExpects })

async function step(s: Session, input: TurnInput): Promise<Reply> {
  if (input.type === 'start') return { step: 'greet', drafts: T.greet(), expects: T.greetExpects }

  // A file of a kind this step does not ask for: a letter at any step, or a report/bank out of order.
  if (isFile(input) && !fitsStep(s.step, input.fileKind)) return outOfOrder(s, input)

  switch (s.step) {
    case 'greet':
      return { step: 'ask_report', drafts: [T.askReport()], expects: T.askReportExpects }

    case 'ask_report': {
      if (input.type === 'skip') return { step: 'ask_bank', drafts: [T.askBank(false)], expects: T.askBankExpects }
      if (!isFile(input)) return stay(s, [T.nudgeFile('report')])
      const got = piece(s, input)
      if ('error' in got) return stay(s, [got.error])
      applyPiece(s, got)
      const p = s.profile
      const bureau = p.bureau ?? 'experian'
      return {
        step: 'ask_bank',
        drafts: [T.ackReport(p.name, T.BUREAU_NAME[bureau] ?? 'Experian', p.score, E.SCALE[bureau] ?? 999), T.askBank(s.bundled.bank)],
        expects: T.askBankExpects,
      }
    }

    case 'ask_bank': {
      if (isFile(input)) {
        const got = piece(s, input)
        if ('error' in got) return stay(s, [got.error])
        applyPiece(s, got)
      } else if (input.type !== 'skip') return stay(s, [T.nudgeFile('bank')])
      const drafts: T.Draft[] = []
      // Thank them with one number from the bank data (also when it came inside the report sample).
      if (s.has.bank && (input.type !== 'skip' || s.bundled.bank)) drafts.push(T.ackBank(surplusOf(s.profile)))
      drafts.push(T.askLetter(s.bundled.letter ? (s.profile.decline?.lender ?? 'the lender') : null))
      return { step: 'ask_letter', drafts, expects: T.askLetterExpects }
    }

    case 'ask_letter': {
      const drafts: T.Draft[] = []
      if (isFile(input)) {
        const got = piece(s, input)
        if ('error' in got) return stay(s, [got.error])
        applyPiece(s, got)
        drafts.push(T.ackLetter(s.profile.decline?.lender ?? 'the lender'))
      } else if (input.type !== 'skip') return stay(s, [T.nudgeFile('letter')])
      return startQuestions(s, drafts)
    }

    case 'questions': {
      const key = s.current
      if (!key) return startQuestions(s, [])
      const value = textOf(input)
      if (value === null && input.type !== 'skip') return stay(s, [question(s, key).draft])
      const a = answer(s, key, value)
      if (!a.ok) return stay(s, [a.retry])
      return nextQuestion(s, [])
    }

    case 'assessing':
      return { step: 'diagnosis', drafts: T.diagnosis(s.result!), expects: T.diagnosisExpects(s.result!) }

    case 'diagnosis':
      if (s.result?.decline) return { step: 'decline', drafts: T.decline(s.result.decline), expects: T.declineExpects }
      return toPaper(s)

    case 'decline':
      return toPaper(s)

    case 'paper':
      s.plan = null
      return { step: 'coach', drafts: [T.coachChoose(s.horizon)], expects: T.coachChooseExpects }

    case 'coach':
      return coach(s, input)
  }
}

function toPaper(s: Session): Reply {
  s.paperReady = true
  return { step: 'paper', drafts: [T.paper()], expects: T.paperExpects }
}

// ---------- questions ----------

function startQuestions(s: Session, drafts: T.Draft[]): Reply {
  s.queue = buildQueue(s)
  s.current = null
  return nextQuestion(s, drafts)
}

function nextQuestion(s: Session, drafts: T.Draft[]): Reply {
  const key = s.queue.shift()
  if (!key) {
    s.current = null
    s.result = analyseProfile(s.profile, s.findings)
    return { step: 'assessing', drafts: [...drafts, T.assessing()], expects: { kind: 'none' } }
  }
  s.current = key
  const q = question(s, key)
  return { step: 'questions', drafts: [...drafts, q.draft], expects: q.expects }
}

// ---------- coach ----------

const planIn = (t: string): PlanId | null => (/\b6\b|six/i.test(t) ? '6m' : /\b3\b|three/i.test(t) ? '3m' : null)

async function coach(s: Session, input: TurnInput): Promise<Reply> {
  const res = s.result!
  const value = textOf(input)
  if (s.plan === null) {
    // Choosing the plan. Anything that is not 6 keeps the horizon they gave.
    const plan = (value && planIn(value)) || s.horizon
    s.plan = plan
    return { step: 'coach', drafts: T.planMessages(res, plan), expects: T.whatIfExpects(res) }
  }
  if (value === null) return stay(s, [T.whatIfUnknown()])
  // "3 months" / "6 months" on its own switches the plan.
  if (/^\s*(3|6|three|six)\s*months?\s*(plan)?\s*$/i.test(value)) {
    const plan = planIn(value)!
    s.plan = plan
    return { step: 'coach', drafts: T.planMessages(res, plan), expects: T.whatIfExpects(res) }
  }
  const out = await whatIfFromText(s, value)
  if (!out.ok) return { step: 'coach', drafts: [out.draft], expects: T.whatIfExpects(res) }
  return { step: 'coach', drafts: [out.draft], expects: T.whatIfExpects(res), whatIf: out.run }
}

// ---------- files and samples ----------

/** Which upload each step asks for. */
function fitsStep(step: Step, kind: 'credit_report' | 'bank' | 'letter'): boolean {
  return (step === 'ask_report' && kind === 'credit_report') || (step === 'ask_bank' && kind === 'bank') || (step === 'ask_letter' && kind === 'letter')
}

type Got = Piece | { error: T.Draft }

/** Turn a `file` or `sample` input into an engine piece. */
function piece(s: Session, input: Extract<TurnInput, { type: 'file' | 'sample' }>): Got {
  if (input.type === 'file') {
    const p = getUpload(input.fileId, input.fileKind)
    return p ?? { error: { base: 'file-missing', kind: 'text', text: "I couldn't find that file. Try uploading it again, or use a sample.", emote: 'concerned', gesture: 'asking' } }
  }
  const asked = input.personaId
  if (asked && !isPersona(asked)) return { error: T.sampleMissing() }
  // The report names the persona; later samples use the same one.
  const id = input.fileKind === 'credit_report' ? (asked ?? s.personaId ?? 'priya') : (s.personaId ?? asked ?? 'priya')
  const sm = sample(id)
  if (!sm) return { error: T.sampleMissing() }
  if (input.fileKind === 'credit_report') {
    s.personaId = id
    return { fileKind: 'credit_report', report: sm }
  }
  s.personaId ??= id
  if (input.fileKind === 'bank') {
    if (!sm.bank) return { error: T.sampleMissing() }
    return { fileKind: 'bank', bank: sm.bank, findings: sm.findings?.bank ?? [] }
  }
  if (!sm.decline) return { error: T.sampleMissing() }
  return { fileKind: 'letter', decline: sm.decline, findings: sm.findings?.letter ?? [] }
}

const emptyFindings = () => ({ report: [], bank: [], letter: [] })

function applyPiece(s: Session, p: Piece) {
  if (p.fileKind === 'credit_report') applyReport(s, p.report)
  else if (p.fileKind === 'bank') {
    s.profile.bank = p.bank
    s.has.bank = true
    if (p.findings.length) (s.findings ??= emptyFindings()).bank = p.findings
  } else {
    s.profile.decline = p.decline
    s.has.letter = true
    if (p.findings.length) (s.findings ??= emptyFindings()).letter = p.findings
  }
}

function applyReport(s: Session, r: Sample) {
  // Keep a bank statement or letter that was handed over earlier; the report's own copies come next.
  const { bank, decline } = s.profile
  s.profile = { ...r.report, ...(bank ? { bank } : {}), ...(decline ? { decline } : {}) }
  s.has.report = true
  s.findings = r.findings ? structuredClone(r.findings) : s.findings
  s.bundled = { bank: false, letter: false }
  // Only a report FILE carries its own bank data and letter (Mei, Alex). Priya's come as separate samples.
  if (r.bundled.bank && r.bank && !bank) {
    s.profile.bank = r.bank
    s.has.bank = true
    s.bundled.bank = true
  }
  if (r.bundled.letter && r.decline && !decline) {
    s.profile.decline = r.decline
    s.has.letter = true
    s.bundled.letter = true
  }
}

/** A letter at any step, or a report/bank statement handed over at another step. Step unchanged. */
function outOfOrder(s: Session, input: Extract<TurnInput, { type: 'file' | 'sample' }>): Reply {
  const got = piece(s, input)
  if ('error' in got) return stay(s, [got.error])
  const after = s.result !== null
  if (got.fileKind === 'letter') {
    applyPiece(s, got)
    if (after) s.result = analyseProfile(s.profile, s.findings)
    const lender = (after ? s.result?.decline?.lender : declineFor(s.profile)?.lender) ?? got.decline.lender
    return stay(s, [T.ackLetterAnyStep(lender, after)])
  }
  if (after) return stay(s, [T.ackLateFile(got.fileKind === 'credit_report' ? 'report' : 'bank', true)])
  applyPiece(s, got)
  return stay(s, [T.ackLateFile(got.fileKind === 'credit_report' ? 'report' : 'bank', false)])
}
