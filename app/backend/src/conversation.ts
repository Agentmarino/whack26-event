// POST /api/turn: the step machine in app/shared/conversation.md.
// 115: intro (Cap's card) → opening (pick a branch) → the branch's stages → goals → data questions →
// assessing → diagnosis → decline? → paper → coach…  Each branch is a list of stages (BRANCH_STAGES).
// A letter is accepted at any step: one acknowledgement, step and expects unchanged (at `opening` it
// picks the declined branch).

import { paperUrlFor } from 'shared'
import type { AgentMessage, Branch, Expects, PlanId, Step, TurnInput, TurnRequest, TurnResponse, WhatIfRun } from 'shared'
import { templateWording, type Wording } from './messages.ts'
import * as E from '../engine/index.ts'
import { analyseProfile, declineFor, surplusOf } from './analysis.ts'
import { HttpError } from './errors.ts'
import { isPersona, sample, type Sample } from './personas.ts'
import { answer, dataQueue, formQueue, goalFor, goalsQueue, productFrom, question } from './questions.ts'
import { getSession, newSession, type Session, type Stage } from './session.ts'
import * as T from './templates.ts'
import { getUpload, type Piece } from './uploads.ts'
import { whatIfFromText } from './whatif.ts'

type Reply = { step: Step; drafts: T.Draft[]; expects: Expects; whatIf?: WhatIfRun | null }

/** What each branch does after `opening`, in order (conversation.md, "Branches"). */
export const BRANCH_STAGES: Record<Branch, Stage[]> = {
  declined: ['letter', 'report', 'bank', 'form', 'early', 'goals', 'data', 'assess'],
  report: ['report', 'bank', 'form', 'data', 'goals', 'assess'],
  prepare: ['product', 'report', 'bank', 'form', 'early', 'goals', 'data', 'assess'],
  new: ['newqs', 'report', 'bank', 'form', 'early', 'goals', 'data', 'assess'],
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
  const messages = await wording.word(s, reply.drafts)
  if (wording.prewarm && s.result) {
    // Start Claude on what comes next while the person reads this: the diagnosis after `assessing`,
    // both plans once the diagnosis is out, and the declined branch's first steps while the decline shows.
    if (reply.step === 'assessing') wording.prewarm(s, T.diagnosis(s.result))
    if (reply.step === 'diagnosis') for (const plan of [s.horizon, s.horizon === '3m' ? '6m' : '3m'] as const) wording.prewarm(s, T.planMessages(s.result, plan))
    if (reply.step === 'decline' && s.stage === 'early') wording.prewarm(s, T.improve(s.result))
  }
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
    branch: s.branch,
  }
}

const isFile = (i: TurnInput): i is Extract<TurnInput, { type: 'file' | 'sample' }> => i.type === 'file' || i.type === 'sample'
const textOf = (i: TurnInput): string | null => (i.type === 'choice' || i.type === 'text' ? i.value : null)
const stay = (s: Session, drafts: T.Draft[]): Reply => ({ step: s.step, drafts, expects: s.lastExpects })

/** The opening chip (or words) → a branch. */
export function branchFrom(t: string): Branch | null {
  const exact = (Object.entries(T.OPENING) as Array<[Branch, string]>).find(([, chip]) => chip.toLowerCase() === t.trim().toLowerCase())
  if (exact) return exact[0]
  const s = t.toLowerCase()
  if (/declin|turned down|refus|reject|said no/.test(s)) return 'declined'
  if (/new to|new here|student|never had|no credit|from abroad|moved to the uk/.test(s)) return 'new'
  if (/ready|prepar|before i apply|thinking of applying|want to apply/.test(s)) return 'prepare'
  if (/report|score|check/.test(s)) return 'report'
  return null
}

async function step(s: Session, input: TurnInput): Promise<Reply> {
  if (input.type === 'start') return { step: 'intro', drafts: T.intro(), expects: T.introExpects }

  // A file at `opening` picks the branch it belongs to and counts as that branch's upload.
  if (s.step === 'opening' && isFile(input)) return openWithFile(s, input)
  // A file of a kind this step does not ask for: a letter at any step, or a report/bank out of order.
  if (isFile(input) && !fitsStep(s.step, input.fileKind)) return outOfOrder(s, input)

  switch (s.step) {
    case 'greet':
    case 'intro':
      return { step: 'opening', drafts: T.opening(), expects: T.openingExpects }

    case 'opening': {
      const b = branchFrom(textOf(input) ?? '')
      if (!b) return stay(s, [T.openingAgain()])
      s.branch = b
      s.stages = [...BRANCH_STAGES[b]]
      return next(s, [T.branchAck(b)])
    }

    case 'ask_letter': {
      if (isFile(input)) {
        const got = piece(s, input)
        if ('error' in got) return stay(s, [got.error])
        applyPiece(s, got)
        return next(s, [T.ackLetter(s.profile.decline?.lender ?? 'the lender')])
      }
      if (input.type !== 'skip') return stay(s, [T.nudgeFile('letter')])
      // No letter: who said no and for what stand in for it.
      s.stages.unshift('whoWhat')
      return next(s, [])
    }

    case 'ask_report': {
      if (input.type === 'skip') return next(s, [])
      if (!isFile(input)) return stay(s, [T.nudgeFile('report')])
      const got = piece(s, input)
      if ('error' in got) return stay(s, [got.error])
      applyPiece(s, got)
      const p = s.profile
      const bureau = p.bureau ?? 'experian'
      return next(s, [T.ackReport(p.name, T.BUREAU_NAME[bureau] ?? 'Experian', p.score, E.SCALE[bureau] ?? 999)])
    }

    case 'ask_bank': {
      if (isFile(input)) {
        const got = piece(s, input)
        if ('error' in got) return stay(s, [got.error])
        applyPiece(s, got)
      } else if (input.type !== 'skip') return stay(s, [T.nudgeFile('bank')])
      // Thank them with one number from the bank data (also when it came inside the report sample).
      const drafts: T.Draft[] = []
      if (s.has.bank && (input.type !== 'skip' || s.bundled.bank)) drafts.push(T.ackBank(surplusOf(s.profile)))
      return next(s, drafts)
    }

    case 'questions':
    case 'goals': {
      const key = s.current
      if (!key) return next(s, [])
      const value = textOf(input)
      if (value === null && input.type !== 'skip') return stay(s, [question(s, key).draft])
      const a = await answer(s, key, value)
      if (!a.ok) return stay(s, [a.retry])
      return nextQuestion(s, [])
    }

    case 'assessing':
      return { step: 'diagnosis', drafts: T.diagnosis(s.result!), expects: T.diagnosisExpects(s.result!, s.declineShown) }

    case 'diagnosis':
      if (s.result?.decline && !s.declineShown) {
        s.declineShown = true
        return { step: 'decline', drafts: T.decline(s.result.decline, s.has.letter), expects: T.declineExpects }
      }
      return toPaper(s)

    case 'decline':
      // The declined branch's early read: after the explanation, the first steps, then the goals.
      if (s.stage === 'early') return next(s, T.improve(s.result!))
      return toPaper(s)

    case 'paper':
      s.plan = null
      return { step: 'coach', drafts: [T.coachChoose(s.horizon)], expects: T.coachChooseExpects }

    case 'coach':
      return coach(s, input)
  }
}

// ---------- 115: stages ----------

/** Move to the next stage and say what it asks (stages with nothing to ask move straight on). */
function next(s: Session, drafts: T.Draft[]): Reply {
  const stage = s.stages.shift()
  if (!stage) return finalRun(s, drafts)
  s.stage = stage
  return enter(s, stage, drafts)
}

function enter(s: Session, stage: Stage, drafts: T.Draft[]): Reply {
  switch (stage) {
    case 'letter':
      if (s.has.letter) return next(s, drafts)
      return { step: 'ask_letter', drafts: [...drafts, T.askLetterDeclined()], expects: T.askLetterExpects }
    case 'whoWhat':
      return startQueue(s, ['declinedBy', 'declinedFor'], drafts)
    case 'product':
      return startQueue(s, ['product'], drafts)
    case 'newqs':
      return startQueue(s, ['newWhy', 'bankAge'], drafts)
    case 'report':
      if (s.has.report) return next(s, drafts)
      return { step: 'ask_report', drafts: [...drafts, T.askReportFor(s.branch)], expects: T.askReportExpects }
    case 'bank':
      if (s.has.bank && !s.bundled.bank) return next(s, drafts)
      return { step: 'ask_bank', drafts: [...drafts, T.askBank(s.bundled.bank)], expects: T.askBankExpects }
    case 'form':
      return startQueue(s, formQueue(s), drafts)
    case 'data':
      return startQueue(s, dataQueue(s), drafts)
    case 'goals':
      return startQueue(s, goalsQueue(), drafts)
    case 'early':
      return early(s, drafts)
    case 'assess':
      return finalRun(s, drafts)
  }
}

/** The branch's first read, on a first engine run with a goal guessed from what they asked about. */
function early(s: Session, drafts: T.Draft[]): Reply {
  const goal = s.profile.goal ?? (s.product ? goalFor(s.product) : 'build')
  s.result = analyseProfile({ ...s.profile, goal }, s.findings)
  const res = s.result
  if (s.branch === 'declined' && res.decline) {
    s.declineShown = true
    return { step: 'decline', drafts: [...drafts, ...T.decline(res.decline, s.has.letter)], expects: { kind: 'choice', chips: ['What can I do?'] } }
  }
  if (s.branch === 'prepare' && s.product) return next(s, [...drafts, ...T.readiness(res, s.product)])
  if (s.branch === 'new') return next(s, [...drafts, ...T.buildStart(res)])
  return next(s, drafts)
}

/** The final engine run, with everything they told us. */
function finalRun(s: Session, drafts: T.Draft[]): Reply {
  s.stage = 'assess'
  s.current = null
  s.result = analyseProfile(s.profile, s.findings)
  return { step: 'assessing', drafts: [...drafts, T.assessing(goalPhrase(s))], expects: { kind: 'none' } }
}

/** What the plan works towards, in words, for the assessing line. null = the classic wording. */
function goalPhrase(s: Session): string | null {
  if (!s.branch) return null
  if (s.targetCard) return `the ${s.targetCard.replace(/^Capital One /, '')} card`
  if (s.targetScore) return `a score of ${s.targetScore}`
  if (s.goalWords) return s.goalWords
  return s.profile.goal === 'mortgage' ? 'a mortgage' : s.profile.goal === 'card' ? 'a new card' : 'a stronger credit file'
}

/** The step a question belongs to: the goals step's own questions show as `goals`. */
const GOAL_KEYS = new Set(['goal', 'goalCard', 'goalScore', 'goalOwn', 'horizon'])

function startQueue(s: Session, keys: Session['queue'], drafts: T.Draft[]): Reply {
  s.queue = [...keys]
  s.current = null
  return nextQuestion(s, drafts)
}

function nextQuestion(s: Session, drafts: T.Draft[]): Reply {
  const key = s.queue.shift()
  if (!key) {
    s.current = null
    return next(s, drafts)
  }
  s.current = key
  const q = question(s, key)
  return { step: GOAL_KEYS.has(key) ? 'goals' : 'questions', drafts: [...drafts, q.draft], expects: q.expects }
}

/** A file handed over at `opening`: a letter picks the declined branch, a report or statement the report branch. */
function openWithFile(s: Session, input: Extract<TurnInput, { type: 'file' | 'sample' }>): Reply {
  const got = piece(s, input)
  if ('error' in got) return stay(s, [got.error])
  const b: Branch = got.fileKind === 'letter' ? 'declined' : 'report'
  s.branch = b
  s.stages = [...BRANCH_STAGES[b]]
  applyPiece(s, got)
  const drafts = [T.branchAck(b)]
  if (got.fileKind === 'letter') drafts.push(T.ackLetter(s.profile.decline?.lender ?? 'the lender'))
  else drafts.push(T.ackLateFile(got.fileKind === 'credit_report' ? 'report' : 'bank', false))
  return next(s, drafts)
}

function toPaper(s: Session): Reply {
  s.paperReady = true
  return { step: 'paper', drafts: [T.paper()], expects: T.paperExpects }
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
    // A real statement's take-home pay, unless the report already gave one.
    if (p.netIncome && s.profile.netIncome == null) s.profile.netIncome = p.netIncome
    if (p.findings.length) (s.findings ??= emptyFindings()).bank = p.findings
  } else {
    s.profile.decline = p.decline
    s.has.letter = true
    // 115: what they were declined for leads the goals step's chips ("The Balance Transfer card").
    s.product ??= productFrom(p.decline.product ?? (p.decline.productId === 'bt' ? 'balance transfer' : p.decline.productId === 'purchase' ? '0% purchase' : 'classic'))
    if (p.findings.length) (s.findings ??= emptyFindings()).letter = p.findings
  }
}

function applyReport(s: Session, r: Sample) {
  // Keep a bank statement or letter that was handed over earlier; the report's own copies come next.
  const { bank, decline } = s.profile
  // 115: answers given before the report (the product they want, new to the UK...) go back on top.
  s.profile = { ...r.report, ...s.answers, ...(bank ? { bank } : {}), ...(decline ? { decline } : {}) }
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
