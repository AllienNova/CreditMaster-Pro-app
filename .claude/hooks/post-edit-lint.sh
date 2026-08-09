#!/bin/bash
# Hook: Run the appropriate linter after Edit/Write events.
# Event: PostToolUse (Edit|Write)
# Non-blocking: reports lint output as additional context to Claude.
#
# Stack detection: picks the linter based on file extension.
# Skips silently if no linter is configured for that file type.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""' 2>/dev/null)

# No file path → nothing to lint.
[ -z "$FILE_PATH" ] && exit 0
[ ! -f "$FILE_PATH" ] && exit 0

LINT_CMD=""
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
    if [ -f "biome.json" ] || [ -f "biome.jsonc" ]; then
      LINT_CMD="npx --no biome check --reporter=summary --max-diagnostics=20"
    elif [ -f "next.config.js" ] || [ -f "next.config.mjs" ] || [ -f "next.config.ts" ]; then
      # Next.js projects: `next lint` handles both legacy .eslintrc and flat
      # config. Bare `npx eslint` fails on a legacy .eslintrc under ESLint 9+.
      LINT_CMD="npx --no next lint --file"
    elif [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ] || [ -f "eslint.config.mjs" ]; then
      LINT_CMD="npx --no eslint --max-warnings 0"
    fi
    ;;
  *.py)
    if command -v ruff >/dev/null 2>&1; then
      LINT_CMD="ruff check"
    fi
    ;;
  *.rs)
    LINT_CMD="cargo clippy --quiet"
    ;;
  *.go)
    if command -v golangci-lint >/dev/null 2>&1; then
      LINT_CMD="golangci-lint run"
    fi
    ;;
  *.dart)
    LINT_CMD="dart analyze"
    ;;
esac

[ -z "$LINT_CMD" ] && exit 0

LINT_OUTPUT=$($LINT_CMD "$FILE_PATH" 2>&1)
LINT_EXIT=$?

if [ $LINT_EXIT -ne 0 ]; then
  LINT_SHORT=$(echo "$LINT_OUTPUT" | head -25)
  jq -n --arg lint "$LINT_SHORT" --arg cmd "$LINT_CMD" '{
    "hookSpecificOutput": {
      "hookEventName": "PostToolUse",
      "additionalContext": ("Linter (" + $cmd + ") reported issues after edit. Fix before proceeding:\n" + $lint)
    }
  }'
fi

exit 0
