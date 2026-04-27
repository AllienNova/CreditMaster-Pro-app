---
paths:
  - "security/**/*.py"
  - "compliance/**/*.py"
  - "auth/**/*.py"
---

# Security and Compliance Rules (Strativion PCTT Platform)

## 9-Layer Injection Defense (SSOT-SEC-01)
All 9 layers must be maintained in any security code change. Removing or weakening any layer requires explicit SSOT amendment.
1. **Input sanitization**: Strip control characters, normalize Unicode, reject null bytes.
2. **Schema validation**: Validate all inputs against Pydantic models before processing.
3. **Content filtering**: Block known prompt injection patterns, SQL injection, XSS payloads.
4. **Tool permission ACL**: Every tool invocation checks agent permissions against the SSOT-SEC-02 matrix.
5. **Rate limiting**: Per-agent and per-tool rate limits enforced at the middleware layer.
6. **Output validation**: Validate all outputs against expected schemas before returning to callers.
7. **Audit logging**: Every security-relevant action logged with timestamp, agent, action, and outcome.
8. **Anomaly detection**: Flag unusual patterns (burst requests, permission boundary probing, off-hours activity).
9. **Circuit breaker**: Disable compromised agents or tools automatically after repeated violations.

## HARD Compliance Gates (No Override, No Exception)
- **PDT compliance (FINRA Rule 4210)**: 4 day trades in a rolling 5-business-day window triggers a hard block on new day trades. Account must have $25,000+ equity to be exempt.
- **Wash sale detection (26 USC Section 1091)**: 61-day window (30 days before, sale date, 30 days after) for substantially identical securities. Disallowed loss adjustment applied automatically.
- **Concentration limits**: Maximum 25% of portfolio value in any single position. Block new buys that would exceed this threshold.
- These gates are enforced at the code level. No configuration flag can disable them. No agent can bypass them.

## Prop Firm Rules
- Configurable per-firm rule sets loaded from `config/prop-firms/` YAML files.
- Supported constraints: max daily loss, max total drawdown, profit targets, maximum position size, restricted instruments.
- Prop firm rules are additive to base compliance rules, never a replacement.

## Secrets Management
- NO secrets in code. All API keys, tokens, and passwords in environment variables or `.env` files.
- `.env` files MUST be in `.gitignore`. Verify before every commit.
- Use `pydantic-settings` to load and validate environment configuration at startup.
- Log a startup warning if any required secret is missing. Do not fall back to defaults for secrets.

## External API Rate Limits
- IBKR: 50 requests per second maximum.
- Alpaca: 200 requests per minute maximum.
- Polygon: 5 requests per second (free tier), 100 requests per second (paid tier).
- Rate limiters use token bucket algorithm. Configure per-provider in `config/rate_limits.yaml`.

## Prompt and Input Sanitization
- Strip all control characters (U+0000 through U+001F, U+007F through U+009F) from user and agent inputs.
- Maximum input length: 10,000 characters for agent prompts, 1,000 characters for search queries.
- Validate inputs against known injection patterns. Maintain pattern list in `security/injection_patterns.py`.
- Sanitize before logging. Never log raw unsanitized input.

## Permission Escalation
- Three modes: MANUAL, SUPERVISED, AUTONOMOUS.
- Escalation path: MANUAL to SUPERVISED to AUTONOMOUS. Each step requires explicit user approval.
- De-escalation (AUTONOMOUS to SUPERVISED, SUPERVISED to MANUAL) can happen automatically on compliance violations.
- Mode transitions logged to the audit database with the user who authorized the change.

## Margin Monitoring
- Real-time margin utilization tracking on every position change.
- Alert thresholds: WARNING at 75%, THROTTLE at 85% (reduce position sizes by 50%), HALT at 95% (no new positions).
- Margin data refreshed every 5 seconds during market hours.

## Audit Database
- All compliance decisions logged to a dedicated SQLite audit database (separate from main PostgreSQL).
- Audit records include: timestamp, agent_name, rule_name, decision (ALLOW/BLOCK), full context payload, correlation_id.
- Audit database retained for 7 years minimum for regulatory review.
- Audit writes are synchronous and must not fail silently. If audit write fails, the trade action is blocked.
