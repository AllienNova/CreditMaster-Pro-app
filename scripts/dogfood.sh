#!/usr/bin/env bash
# Dogfood one endpoint against a REAL local Supabase, as two real users.
#
# WHY THIS IS A SCRIPT AND NOT A CHECKLIST. It used to be prose in
# docs/specs/remediation-plan.md, and the critic's verdict was blunt: $TOKEN,
# $APP and $SERVICE_KEY were defined nowhere, step 1 returned a user object
# rather than an access token, and the cross-user probe needed a second user
# that never got created. A recipe an engineer cannot paste is a recipe that
# gets skipped — which is exactly the failure mode the recipe existed to stop.
#
# WHAT IT PROVES, that the 16,599-test suite cannot. Every test here mocks the
# Supabase client, so no missing GRANT, absent table, RLS policy or dead session
# can fail one. All four defects in docs/specs/smoke-test-report.md §3 passed a
# fully green suite. This talks to a real Postgres as a real user.
#
#   ./scripts/dogfood.sh /api/financial/budgets
#   ./scripts/dogfood.sh /api/notifications --port 3001
#
# Exit 0 only if: authenticated request succeeds, an unauthenticated one is
# rejected, and user B cannot read user A's resource.

set -uo pipefail

ROUTE="${1:-}"
if [[ -z "$ROUTE" ]]; then
  echo "usage: $0 <route-path> [--port N]   e.g. $0 /api/financial/budgets" >&2
  exit 2
fi
shift || true

PORT=3000
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

APP="http://localhost:${PORT}"
SUPABASE_URL="http://127.0.0.1:54321"
DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

fail() { echo "FAIL: $*" >&2; exit 1; }
note() { printf '\n=== %s\n' "$*"; }

# ---------------------------------------------------------------------------
# 0. Preconditions. The port check is not paranoia: :3000 was held by an
#    unrelated Docker container serving a LibreChat panel, and the first smoke
#    run read ITS 404s as Fynvita's.
# ---------------------------------------------------------------------------
note "0. preconditions"
command -v jq >/dev/null || fail "jq not installed (brew install jq)"
curl -sf "${SUPABASE_URL}/rest/v1/" -o /dev/null \
  || fail "local Supabase not up on ${SUPABASE_URL} — run: npx supabase start"

OWNER="$(curl -s "${APP}/api/health" | jq -r '.status? // empty')"
[[ -n "$OWNER" ]] || fail "nothing answering /api/health on ${APP}. Start the dev
  server (npm run dev) and confirm the port it BOUND to, which is not always
  ${PORT}. Check what else holds it:  lsof -i :${PORT}"

SERVICE_KEY="$(npx supabase status -o json 2>/dev/null | jq -r '.SERVICE_ROLE_KEY // empty')"
ANON_KEY="$(npx supabase status -o json 2>/dev/null | jq -r '.ANON_KEY // empty')"
[[ -n "$SERVICE_KEY" && -n "$ANON_KEY" ]] || fail "could not read keys from 'npx supabase status -o json'"

# The app must verify tokens against the SAME Supabase that minted them, and the
# service-role key must match too. Two distinct failures, both observed:
#   URL mismatch  -> unknown JWKS `kid` -> 401 on every request, indistinguishable
#                    from a broken auth guard.
#   svc mismatch  -> a HOSTED service-role JWT presented to the LOCAL Supabase ->
#                    HTTP 500 "No suitable key or wrong key type" from inside the
#                    handler, which looks nothing like a config problem.
#
# These are WARNINGS, not preconditions, and that distinction was earned. The
# first version read .env.local and refused outright — but the remediation it
# printed said to start the dev server with INLINE env vars, which leaves
# .env.local untouched. So following the printed instruction still failed the
# check that printed it. A file on disk is not evidence of what a running
# process loaded; env vars, .env.development.local and shell exports all
# override it.
#
# So: warn here, and if step 2 actually fails, name these as the likely cause
# (see diagnose_auth_failure). Observed behaviour decides; the file only hints.
read_env() {
  grep -sh "^$1=" .env.local .env 2>/dev/null | head -1 | cut -d= -f2- \
    | tr -d '"'"'"' \r'
}
APP_SUPABASE_URL="$(read_env NEXT_PUBLIC_SUPABASE_URL)"
APP_SVC="$(read_env SUPABASE_SERVICE_ROLE_KEY)"
ENV_HINT=""

if [[ -n "$APP_SUPABASE_URL" && "$APP_SUPABASE_URL" != "$SUPABASE_URL" ]]; then
  ENV_HINT+="  .env.local NEXT_PUBLIC_SUPABASE_URL = ${APP_SUPABASE_URL}
    (this script mints tokens at ${SUPABASE_URL})
"
  echo "  WARN: .env.local points at ${APP_SUPABASE_URL}, not ${SUPABASE_URL}."
  echo "        Fine if the dev server was started with inline overrides."
fi
if [[ -n "$APP_SVC" && "$APP_SVC" != "$SERVICE_KEY" ]]; then
  ENV_HINT+="  .env.local SUPABASE_SERVICE_ROLE_KEY is not the local one
"
  echo "  WARN: .env.local SUPABASE_SERVICE_ROLE_KEY is not the local key."
fi
[[ -z "$ENV_HINT" ]] && echo "  env: all three local values match"

diagnose_auth_failure() {
  echo ""
  echo "  LIKELY CAUSE — the app is not talking to the Supabase that minted this token."
  if [[ -n "$ENV_HINT" ]]; then
    echo "$ENV_HINT"
  else
    echo "  .env.local looks correct, so check what the RUNNING process actually"
    echo "  loaded: inline vars, exported shell vars, and .env.development.local"
    echo "  all override it."
  fi
  echo "  Start the dev server with ALL THREE local values, e.g.:"
  echo ""
  echo "    NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL} \\"
  echo "    NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon> \\"
  echo "    SUPABASE_SERVICE_ROLE_KEY=<local service role> npm run dev"
  echo ""
  echo "  Read them with:  npx supabase status -o json | jq"
}

# ---------------------------------------------------------------------------
# 1. Two real users. Admin-create returns a USER OBJECT, never a token; the
#    password grant below is the step that actually yields one. Getting this
#    wrong is why the prose version could not be run.
# ---------------------------------------------------------------------------
note "1. create two users + mint real ES256 access tokens"
mkuser() {
  local email="$1"
  local out
  out="$(curl -s -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "apikey: ${SERVICE_KEY}" -H "authorization: Bearer ${SERVICE_KEY}" \
    -H "content-type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"dogfood-Pass123!\",\"email_confirm\":true}")"
  local id; id="$(echo "$out" | jq -r '.id // empty')"
  # A 500 here means SIGNUP IS BROKEN. That is the finding, not your setup —
  # it is exactly how the sync_user_email_to_profile search_path bug surfaced.
  [[ -n "$id" ]] || fail "admin-create failed for ${email}: ${out}"
  echo "$id"
}
token_for() {
  local email="$1" out
  out="$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
    -H "apikey: ${ANON_KEY}" -H "content-type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"dogfood-Pass123!\"}")"
  local t; t="$(echo "$out" | jq -r '.access_token // empty')"
  [[ -n "$t" ]] || fail "password grant failed for ${email}: ${out}"
  echo "$t"
}

STAMP="$$"
EMAIL_A="dogfood-a-${STAMP}@example.com"
EMAIL_B="dogfood-b-${STAMP}@example.com"
UID_A="$(mkuser "$EMAIL_A")"; UID_B="$(mkuser "$EMAIL_B")"
TOKEN_A="$(token_for "$EMAIL_A")"; TOKEN_B="$(token_for "$EMAIL_B")"
echo "  user A ${UID_A}"
echo "  user B ${UID_B}"
echo "  alg: $(echo "$TOKEN_A" | cut -d. -f1 | base64 -d 2>/dev/null | jq -r '.alg // "?"')"

# ---------------------------------------------------------------------------
# 2. Authenticated request. Assert on the BODY, not the status. 200 with an
#    empty array is the SIGNATURE of the session-less anon-client bug: success
#    shape, no payload, no error anywhere.
# ---------------------------------------------------------------------------
note "2. authenticated request as user A"
BODY_A="$(curl -s -w '\n%{http_code}' "${APP}${ROUTE}" -H "authorization: Bearer ${TOKEN_A}")"
CODE_A="$(echo "$BODY_A" | tail -1)"; PAYLOAD_A="$(echo "$BODY_A" | sed '$d')"
echo "  HTTP ${CODE_A}"
echo "  ${PAYLOAD_A}" | head -c 600; echo
if [[ ! "$CODE_A" =~ ^2 ]]; then
  # 401 (unknown kid) and 500 "No suitable key" are both env-mismatch
  # signatures, not application defects. Say so instead of just failing.
  if [[ "$CODE_A" == "401" ]] || echo "$PAYLOAD_A" | grep -q "No suitable key"; then
    diagnose_auth_failure
  fi
  fail "authenticated request returned ${CODE_A}"
fi

if echo "$PAYLOAD_A" | jq -e '(.data? // .notifications? // empty) | length == 0' >/dev/null 2>&1; then
  echo "  WARNING: empty collection. If you seeded a row for this user, that is"
  echo "  the anon-client failure mode, NOT an empty account. Seed and re-check"
  echo "  (step 3) before believing this endpoint works."
fi

# ---------------------------------------------------------------------------
# 3. Unauthenticated MUST be rejected.
# ---------------------------------------------------------------------------
note "3. unauthenticated request"
CODE_N="$(curl -s -o /dev/null -w '%{http_code}' "${APP}${ROUTE}")"
echo "  HTTP ${CODE_N}"
[[ "$CODE_N" == "401" || "$CODE_N" == "403" || "$CODE_N" == "307" ]] \
  || fail "unauthenticated request returned ${CODE_N}; expected 401/403/307"

# ---------------------------------------------------------------------------
# 4. Cross-user probe. Service role BYPASSES RLS, so .eq("user_id", ...) is the
#    only thing between users — FND-030 was precisely a dropped filter.
# ---------------------------------------------------------------------------
note "4. cross-user probe (user B reading user A's collection)"
BODY_B="$(curl -s "${APP}${ROUTE}" -H "authorization: Bearer ${TOKEN_B}")"
if echo "$BODY_B" | grep -qF "$UID_A"; then
  fail "user B's response contains user A's id (${UID_A}) — IDOR"
fi
echo "  no leakage of ${UID_A} into user B's response"

# ---------------------------------------------------------------------------
# 5. Postgres log. PostgREST turns plenty of permission-denied and 42P01 into
#    an empty result set, so a 200 does not mean the query worked.
# ---------------------------------------------------------------------------
note "5. postgres errors during this run"
CID="$(docker ps --filter 'name=supabase_db' --format '{{.ID}}' | head -1)"
if [[ -n "$CID" ]]; then
  docker logs --since 2m "$CID" 2>&1 \
    | grep -E "ERROR|permission denied|42P01|42501" | tail -15 \
    || echo "  none"
else
  echo "  supabase_db container not found; check manually: psql '${DB}'"
fi

note "PASS — ${ROUTE}"
echo "Still owed by hand, and NOT covered by this script:"
echo "  - seed a row for user A, re-run step 2, confirm it comes back"
echo "  - click the actual screen; screenshot to"
echo "    ~/.claude/screenshots/Fynvita/current/web/ ; capture console errors"
