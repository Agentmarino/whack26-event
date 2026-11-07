#!/usr/bin/env bash
# Handoff 113 verification 2-4 with curl against a running backend (default http://localhost:8000).
# 115: the main walk is the declined branch (Priya with her letter); the edge walk is the report branch.
#   bash app/backend/scripts/curl-walk.sh [base-url]
# Prints the step and message kinds of every turn, checks the diagnosis refs resolve in `result`,
# saves the paper PDF to $OUT (default: a temp file) and runs the letter-during-questions edge walk.
set -euo pipefail
BASE="${1:-http://localhost:8000}"
OUT="${OUT:-$(mktemp -t paper-113).pdf}"
SID=null

turn() { # $1 = input JSON
  local body
  body=$(jq -nc --argjson sid "$SID" --argjson input "$1" '{sessionId: $sid, input: $input, settings: {plainEnglish: ($ENV.PLAIN == "true")}}')
  RES=$(curl -sf -X POST "$BASE/api/turn" -H 'content-type: application/json' -d "$body")
  SID=$(jq -c '.sessionId' <<<"$RES")
  printf '%-11s %-56s | %s\n' "$(jq -r .step <<<"$RES")" "$(jq -c "$1" <<<null 2>/dev/null || echo "$1")" \
    "$(jq -r '[.messages[] | .kind + (if .writtenBy == "claude" then "*" else "" end)] | join(",")' <<<"$RES")"
}

first_chip() { turn "$(jq -c '{type: "choice", value: (.expects.chips[0] // "A credit card")}' <<<"$RES")"; }

echo "== main walk: declined branch, Priya with her letter (* = worded by Claude) =="
turn '{"type":"start"}'
turn '{"type":"choice","value":"Nice to meet you, Cap!"}'
turn '{"type":"choice","value":"I'"'"'ve been declined already"}'
turn '{"type":"sample","fileKind":"letter","personaId":"priya"}'
turn '{"type":"sample","fileKind":"credit_report"}'
turn '{"type":"sample","fileKind":"bank"}'
echo "early decline: $(jq -r '[.messages[] | select(.ref.on == "decline") | .ref.part] | join(",")' <<<"$RES")"
turn '{"type":"choice","value":"What can I do?"}'
while [ "$(jq -r .step <<<"$RES")" = questions ] || [ "$(jq -r .step <<<"$RES")" = goals ]; do first_chip; done
turn '{"type":"skip"}'
echo "diagnosis: $(jq '[.messages[] | select(.kind == "reason")] | length' <<<"$RES") reason messages; refs resolve in result:"
jq -r '. as $r | .messages[] | select(.kind == "reason") | .ref.factorId as $id
  | "  \($id) -> \(($r.result.result.diagnosis.ranked[] | select(.id == $id) | "\(.label), \(.rag)") // "MISSING")"' <<<"$RES"
turn "$(jq -c '{type: "choice", value: .expects.chips[0]}' <<<"$RES")"
PAPER=$(jq -r .paperUrl <<<"$RES")
code=$(curl -s -o "$OUT" -w '%{http_code}' "$BASE$PAPER")
echo "paper $PAPER -> HTTP $code, $(wc -c <"$OUT" | tr -d ' ') bytes, $(head -c 5 "$OUT" | tr -dc 'A-Za-z%-') saved to $OUT"
turn '{"type":"choice","value":"Make me a plan"}'
turn '{"type":"choice","value":"3 months"}'
turn '{"type":"text","value":"What if I pay £300 a month?"}'
echo "  $(jq -r '.messages[0].text' <<<"$RES")"

echo
echo "== edge walk: report branch, hand the letter over during the questions =="
SID=null
turn '{"type":"start"}'
turn '{"type":"choice","value":"Nice to meet you, Cap!"}'
turn '{"type":"choice","value":"I'"'"'ve got a credit report I want help with"}'
turn '{"type":"sample","fileKind":"credit_report","personaId":"priya"}'
turn '{"type":"sample","fileKind":"bank"}'
BEFORE=$(jq -c .expects <<<"$RES")
turn '{"type":"sample","fileKind":"letter"}'
echo "  ack: $(jq -r '.messages | length' <<<"$RES") message: $(jq -r '.messages[0].text' <<<"$RES")"
echo "  step still questions: $(jq -r .step <<<"$RES"); expects unchanged: $([ "$BEFORE" = "$(jq -c .expects <<<"$RES")" ] && echo yes || echo NO)"
while [ "$(jq -r .step <<<"$RES")" = questions ] || [ "$(jq -r .step <<<"$RES")" = goals ]; do first_chip; done
turn '{"type":"skip"}'
turn "$(jq -c '{type: "choice", value: .expects.chips[0]}' <<<"$RES")"
echo "  after diagnosis: step $(jq -r .step <<<"$RES"), lender $(jq -r .result.decline.lender <<<"$RES")"

echo
echo "== POST /api/whatif {text} =="
curl -sf -X POST "$BASE/api/whatif" -H 'content-type: application/json' \
  -d "$(jq -nc --argjson sid "$SID" '{sessionId: $sid, text: "what if I pay 300 a month extra"}')" |
  jq -c '{changes: .whatIf.changes, before3m: .whatIf.output.before.m3, after3m: .whatIf.output.after.m3, before6m: .whatIf.output.before.m6, after6m: .whatIf.output.after.m6, kind: .messages[0].kind, writtenBy: .messages[0].writtenBy, text: .messages[0].text}'
