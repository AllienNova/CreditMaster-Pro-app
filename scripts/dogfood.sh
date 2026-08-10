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

# The app must verify tokens against the SAME Supabase that minted them.
# Learned the hard way on the first real run: .env.local pointed
# NEXT_PUBLIC_SUPABASE_URL at a hosted project while this script minted tokens
# locally, so the app fetched a JWKS with different keys, the `kid` was unknown,
# and every request 401'd. That looks identical to a broken auth guard. Checking
# it here turns a confusing false failure into one line of explanation.
APP_SUPABASE_URL="$(grep -sh '^NEXT_PUBLIC_SUPABASE_URL=' .env.local .env 2>/dev/null \
  | head -1 | cut -d= -f2- | tr -d '"'"'"' \r')"
if [[ -n "$APP_SUPABASE_URL" && "$APP_SUPABASE_URL" != "$SUPABASE_URL" ]]; then
  fail "ENV MISMATCH — the app verifies against ${APP_SUPABASE_URL} but this
  script mints tokens at ${SUPABASE_URL}. Different projects sign with different
  keys, so every request would 401 on an unknown JWKS 'kid' and look like an auth
  bug. Point NEXT_PUBLIC_SUPABASE_URL at ${SUPABASE_URL} for the dev server, e.g.

    NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL} \\
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key> npm run dev"
fi

# The SERVICE-ROLE key has to match too, and it is the easier one to forget:
# swapping only the URL and the anon key leaves a HOSTED service-role JWT being
# presented to the LOCAL Supabase, which cannot verify it. That surfaces as
# HTTP 500 "No suitable key or wrong key type" from inside the route handler —
# nothing like an auth problem, and it cost three restarts to spot.
APP_SVC="$(grep -sh '^SUPABASE_SERVICE_ROLE_KEY=' .env.local .env 2>/dev/null \
  | head -1 | cut -d= -f2- | tr -d '"'"'"' \r')"
if [[ -n "$APP_SVC" && "$APP_SVC" != "$SERVICE_KEY" ]]; then
  fail "ENV MISMATCH — SUPABASE_SERVICE_ROLE_KEY in .env.local is not the local
  one. A hosted service-role JWT sent to the local Supabase fails as
  500 'No suitable key or wrong key type' from inside the handler. Set all THREE
  to local values: URL, anon key, and service-role key."
fi

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
[[ "$CODE_A" =~ ^2 ]] || fail "authenticated request returned ${CODE_A}"

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
