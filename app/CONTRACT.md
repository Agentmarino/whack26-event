# Contract: backend (113) and frontend (114)

Written by handoff 112 on 2026-11-07. Jag's credit engine is the brain; the pixel agent at the Capital One desk is the face.

**The source of truth is code, not this page:**
- `app/shared/contract.ts`: zod schemas and TypeScript types for everything that crosses the wire, plus `resolveRef()` and the route list
- `app/shared/conversation.md`: the step order and what the agent says and asks at each step
- `app/shared/examples/`: real backend responses for each 115 branch (`branches/<branch>.json`: requests and responses in order; declined, report and prepare on Priya, new on Mei Lin), made by `scripts/make-examples.ts`
- `app/shared/mock-conversation.ts`: `mockTurn(state, request)`, `mockWhatIf`, `mockUpload`, `mockPersonas` so 114 runs the whole chat with no backend

**Using it:** add `"shared": "workspace:*"` to your `package.json` dependencies (`pnpm add 'shared@workspace:*'`), then `import { TurnResponse, resolveRef } from 'shared'` and `import { mockTurn } from 'shared/mock-conversation'`. The package exports `.ts` source; Vite and tsx compile it.

**Watch out:** projection `date` is a display month ("Feb 2027"), not a date: never `new Date()` it (Safari returns Invalid Date); plot by `month`. A reason card has the because-trail (`because.dataPoint`, `rule`, `source`, `weightSource`) but no separate evidence list; `findings` is null for persona samples.

**113 owns `app/shared/`.** Changes go in a commit starting `CONTRACT:` plus a dated line under "Contract changes" in `handoffs/113-backend-conversation.md`. Never break a field 114 uses without adding the new one first.

## Ports and routes
Backend `http://localhost:8000`, frontend `http://localhost:5173` (Vite proxies `/api`). CORS for `http://localhost:5173` and the phone's LAN origin (`http://<Mac LAN IP>:5173`). Every error body is `{error: string}`.

| Route | Body | Returns |
|---|---|---|
| `GET /api/health` | | `{ok: true}` |
| `GET /api/personas` | | `Persona[]` (`{id, name, blurb}`: priya, mei, alex) |
| `POST /api/turn` | `TurnRequest {sessionId \| null, input, settings?: {plainEnglish}}` | `TurnResponse {sessionId, step, messages, expects, result, paperUrl, whatIf?}` |
| `POST /api/upload` | multipart: `file`, `fileKind` (`credit_report \| bank \| letter`), `sessionId`; or a `text` field instead of `file` (a pasted letter) | `UploadResult {ok, fileId, fileKind, fileName, findings, error}`; then send `{type: 'file', fileKind, fileId}` to `/api/turn`. A file it can't read is still HTTP 200 with `ok: false` and a friendly `error` to show |
| `POST /api/whatif` | `WhatIfRequest {sessionId, text?, changes?}` | `WhatIfResponse {sessionId, messages, whatIf}`. 409 `{error}` before the check is done; 422 `{error}` (a friendly sentence to show) when the text maps to no lever |
| `GET /api/paper/:sessionId.pdf` | | the summary PDF (404 `{error}` until the `paper` step) |

## The ideas in one screen
- **Steps** (115): `intro` (Cap's card) → `opening` (picks `branch`: declined, report, prepare, new) → the branch's steps (`ask_letter`, `ask_report`, `ask_bank`, `questions`, `decline`) → `goals...` → `questions...` → `assessing` → `diagnosis` → `decline`? → `paper` → `coach...`; see `shared/conversation.md`, "Branches". `greet` stays in the enum but is no longer sent. A `letter` is accepted at any step (one acknowledgement, step unchanged); at `opening` it picks the declined branch
- **115 additions**: `TurnResponse.branch` (null before `opening`), message kind `card` (no ref; text for screen readers), gesture `slide-card`. `result` can arrive before `assessing` (the declined, prepare and new branches run the engine once for their early read)
- **Messages** (`AgentMessage`): `{id, kind, text, emote, gesture, ref?, writtenBy?}`. `kind` is `text | reason | decline | step | projection | ladder | whatif | paper`. Cards render from `ref` into `result` (`resolveRef(ref, result, {whatIfs, paperUrl})`), never from numbers in the text
- **Expects**: `{kind: file | choice | text | none, fileKinds?, chips?, optional?, placeholder?, allowVoice?}`. `none` = send `{type: 'skip'}` after the messages
- **`result`** is the engine's `analyse()` output exactly: `{profile, findings, result, decline}`. Note the nesting: the factors are at `result.result.diagnosis.ranked`, the plans at `result.result.plans['3m' | '6m']`, the card ladder at `result.result.ladder`, the decoded decline at `result.decline`
- **Claude never computes a number.** The engine computes; Claude reads documents into the engine's input, writes wording (checked), and turns free-text what-ifs into the engine's `Change[]` levers

## Status codes (113)
- `POST /api/turn`: 400 when the body is not a `TurnRequest` or a non-`start` input has no `sessionId`; 404 when the session is unknown (the server restarted): start again with `{type: 'start'}`
- Every error body is `{error: string}`; 5xx bodies say "Something went wrong on our side. Please try again."

## Additions beyond the 112 spec
- `TurnResponse.whatIf` (optional): the `WhatIfRun` behind a `whatif` message on a coach turn
- `Ref` is a tagged union on `on` (`{on: 'factor', factorId}`, `{on: 'step', plan, stepIndex}`, ...) instead of loose keys
- `AgentMessage.writtenBy` (optional): `template` or `claude`, for 113's debug panel
- `UploadResult` shape: `{ok, fileId, fileKind, fileName, findings, error}`
- `ClaudeChange`: the `Change` levers without `set`, to validate Claude's what-if output

## Replaced
The Lender's Eyes contract from handoff 101 (Jordan's sample files, `POST /api/assess`, `POST /api/plan`, the Python/FastAPI backend) is **replaced** by this one. Handoffs 101 to 107 are superseded by 113 and 114.
