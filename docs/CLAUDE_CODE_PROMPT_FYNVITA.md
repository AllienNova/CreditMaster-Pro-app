# Fynvita — Doctrine Compliance Upgrade Prompt

> **Copy this entire prompt into Claude Code when working inside the Fynvita repository.**
> **Current Score: 60/140 (42.9%) — Target: 110+/140 (79%+)**

---

## Context

You are upgrading Fynvita — a financial intelligence platform with a 7-agent autonomous trading consensus pipeline — to compliance with the AlienNova Agent Framework Doctrine v3.1. The doctrine is at `docs/AGENT_FRAMEWORK_DOCTRINE.md`. The compliance scorecard is at `docs/DOCTRINE_COMPLIANCE_SCORECARD.html`.

Fynvita is a TypeScript/Next.js application with: 7 trading agents in a consensus pipeline, Zod validation for environment config, 200+ TypeScript interfaces, circuit breakers, risk-tiered operating modes (WATCH → GUIDED → AUTONOMOUS), Supabase persistence, 16 injection detection patterns, PII redaction on output, structured JSON audit logging, 100+ RBAC permissions, and 3,287 Jest tests.

**Critical constraint:** This is a **financial platform that moves money**. The trading agents execute real transactions. The dispute system files real disputes. The payment system processes real payments. **Every side-effecting action in this system is a potential financial liability.** The absence of side-effect semantics, risk-tiered approval, and release manifests is not a nice-to-have gap — it is a production blocker.

---

## PHASE 1: AUDIT — Review All Agent Structures

Before writing any code, perform a complete audit. Read and analyze:

### 1.1 Agent Architecture Inventory
- Find and read the 7 trading agents in the consensus pipeline — catalog each agent's role, inputs, outputs, and decision weight
- Find the consensus mechanism — how do the 7 agents vote/agree on trading decisions?
- Find the IntentType system — catalog every intent and its current handling (grep for `IntentType` or `intent`)
- Find the action executor — trace how intents become actions (API calls, DB writes, transactions)
- Find the model router — document which models are used, fallback chains, and selection logic
- Read `src/` directory structure — map the full architecture: pages, API routes, services, agents, utils

### 1.2 Financial Action Inventory (CRITICAL)
- Catalog EVERY action that has financial consequences:
  - Trading: buy/sell/rebalance operations
  - Disputes: filing disputes with financial institutions
  - Payments: processing or scheduling payments
  - Budget modifications: creating/modifying budgets
  - Account linking: connecting external financial accounts
- For each action, document: is there a confirmation step? Is there an undo? Is there an audit trail?

### 1.3 Safety & Guardrail Audit
- Find input guardrails (16 injection patterns mentioned) — where are they, what do they catch?
- Find output guardrails (PII redaction, harmful content filter) — where applied?
- Assess: are guardrails applied on EVERY route, or only specific ones?
- Assess: is there a processing-layer guardrail (between input validation and output)?

### 1.4 Memory System Audit
- Find conversation memory (Supabase-backed) — schema, TTL, eviction
- Find financial snapshot memory — what's stored, how long, how retrieved
- Find context compression — how does it work, when triggered
- Assess: is there a documented memory architecture, or is it ad-hoc?

### 1.5 Observability Audit
- Find the JSON logger — what's logged, where, what format?
- Find the metrics collector (Supabase-backed) — what metrics are tracked?
- Grep for any OpenTelemetry, Sentry, or tracing library usage
- Assess: can you trace a single user request from API entry to LLM call to action execution to response?

### 1.6 Evaluation Audit
- Read Jest test files — catalog coverage by domain (agents, API, components, trading)
- Find the 129 failing tests — what's broken?
- Assess: are there eval datasets that test the quality of agent financial advice?
- Assess: are there eval datasets that test trading signal accuracy?
- Assess: are there baselines/thresholds for agent decision quality?

### 1.7 Security Audit
- Find the RBAC system (100+ permissions) — where defined, how enforced?
- Find Supabase RLS policies — what's row-level secured?
- Find env validation (Zod) — is it applied to all env vars?
- Assess: are API keys and financial credentials properly managed?

### 1.8 Protocol Audit
- Assess: how do the 7 trading agents communicate? Direct function calls? Message queue? REST?
- Assess: is there any MCP server or client?
- Assess: are agent handoffs typed and observable?

### 1.9 Cost & Rate Limiting Audit
- Find rate limiting (20 req/min mentioned) — where enforced, per-user or global?
- Find token tracking — is it per-call, per-session, per-user?
- Assess: is there any budget enforcement that stops execution on breach?
- Find model selection logic — is cost a factor in model choice?

### 1.10 Release Manifest Audit
- Check for any CI/CD configuration (Dockerfile, docker-compose.yml, Fly.io config)
- Assess: are prompts versioned? Are model configs captured per deploy?
- Assess: can you reproduce a past deployment from artifacts?

**Output a structured audit report as `docs/DOCTRINE_AUDIT_REPORT.md` before proceeding to Phase 2.**

---

## PHASE 2: UPGRADE — Close the 10 Gaps

### Gap 1: Side-Effect Semantics (Score 0 → 8) ⚠️ HIGHEST PRIORITY
**Doctrine Reference: §11.4**

This is the most critical gap. Financial actions execute immediately with no staging, confirmation, dry-run, or rollback.

1. **Create `src/lib/side-effects/types.ts`:**
   ```typescript
   export enum SideEffectStatus {
     PLANNED = "planned",
     PREVIEWED = "previewed",
     AWAITING_APPROVAL = "awaiting_approval",
     COMMITTED = "committed",
     VERIFIED = "verified",
     ROLLED_BACK = "rolled_back",
     FAILED = "failed",
   }

   export enum BlastRadius {
     FINANCIAL_TRANSACTION = "financial_transaction",  // Money moves
     EXTERNAL_API = "external_api",                    // Calls third-party service
     DATA_MUTATION = "data_mutation",                   // Modifies user data
     READ_ONLY = "read_only",                          // No side effects
   }

   export interface SideEffectPlan {
     id: string;                    // UUID
     idempotencyKey: string;        // Prevents duplicate execution
     action: string;                // Intent name
     parameters: Record<string, unknown>;
     riskTier: RiskTier;
     blastRadius: BlastRadius;
     estimatedImpact: string;       // Human-readable: "Buy 10 shares of AAPL at ~$185"
     reversible: boolean;
     createdAt: Date;
   }

   export interface SideEffectResult {
     planId: string;
     status: SideEffectStatus;
     result?: unknown;
     rollbackHandle?: string;       // Reference to undo this action
     verifiedAt?: Date;
   }
   ```

2. **Create `src/lib/side-effects/executor.ts`:**
   ```
   SideEffectExecutor:
     plan(intent, params) → SideEffectPlan
       - Classify risk tier and blast radius
       - Generate idempotency key
       - Estimate financial impact in human-readable form
       - Store plan in Supabase `side_effect_plans` table

     preview(plan) → PreviewResult
       - For trades: show projected cost, fees, portfolio impact
       - For disputes: show the dispute text that would be filed
       - For budgets: show before/after budget state
       - NEVER execute anything

     execute(plan, approvalToken?) → SideEffectResult
       - Verify idempotency (check if this key was already executed)
       - For FINANCIAL_TRANSACTION: require approvalToken (from HITL)
       - Execute the action
       - Store result + rollback handle in Supabase
       - Emit audit event

     verify(result) → boolean
       - Confirm the action took effect (e.g., trade filled, dispute filed)
       - Log verification status

     rollback(result) → SideEffectResult
       - If reversible: execute reversal (cancel order, withdraw dispute)
       - If irreversible: log that rollback was requested but not possible
       - Update audit trail
   ```

3. **Create Supabase migration for `side_effect_plans` and `side_effect_results` tables.**

4. **Create `src/lib/side-effects/saga.ts`:**
   - SagaCoordinator for multi-step financial flows (e.g., rebalance = multiple trades)
   - If step N fails: compensate steps N-1 through 1 in reverse
   - All compensation actions logged to audit

5. **Integrate into EVERY financial action:**
   - Trading: plan → preview (show projected trade) → HITL approval → execute → verify (confirm fill)
   - Disputes: plan → preview (show dispute text) → HITL approval → execute → verify (confirm filed)
   - Payments: plan → preview (show payment details) → HITL approval → execute → verify (confirm processed)
   - Budget changes: plan → execute → verify (lower risk, no HITL required)
   - Read-only queries: execute directly (no lifecycle needed)

### Gap 2: Release Manifest (Score 0 → 7)
**Doctrine Reference: §19.5**

1. **Create `scripts/generate-manifest.ts`:**
   ```typescript
   interface ReleaseManifest {
     manifestVersion: "1.0.0";
     releaseId: string;           // from package.json version
     createdAt: string;           // ISO timestamp
     promptBundleHash: string;    // SHA256 of all prompt templates
     modelRouterConfig: object;   // snapshot of model selection config
     toolSchemaHash: string;      // SHA256 of all action/tool definitions
     envSchemaHash: string;       // SHA256 of Zod env schema
     dependencies: Record<string, string>;  // from package-lock.json
     signature: string;           // HMAC-SHA256
   }
   ```

2. **Collect all prompts into `src/prompts/` directory:**
   - Extract all inline system prompts and prompt templates from agent code
   - Version each prompt file
   - Generate hash bundle

3. **Add to build pipeline:**
   - `npm run build` generates manifest
   - `npm run manifest:verify` checks integrity
   - Store manifests in `manifests/` directory, never overwrite

4. **Store in Supabase `release_manifests` table** as immutable audit record per deployment.

### Gap 3: Evaluation Framework (Score 2 → 7)
**Doctrine Reference: §13, §20.2 Evaluation row**

1. **Create `evals/` directory:**
   ```
   evals/
     datasets/
       financial_advice.jsonl      # User question → expected advice quality rubric
       trading_signals.jsonl       # Market conditions → expected signal + confidence
       dispute_generation.jsonl    # Transaction details → expected dispute quality
       budget_planning.jsonl       # User goal → expected budget recommendation
       consensus_accuracy.jsonl    # 7-agent inputs → expected consensus output
     rubrics/
       advice_quality.ts           # Score: accuracy, completeness, safety of financial advice
       signal_accuracy.ts          # Score: did the signal predict correctly? (backtested)
       safety.ts                   # Score: did the agent avoid harmful financial advice?
       regulatory.ts              # Score: did the output include required disclaimers?
     runner.ts                     # EvalRunner: loads datasets, runs agents, scores, reports
     baselines.yaml                # Minimum thresholds
   ```

2. **Define baselines:**
   ```yaml
   financial_advice:
     accuracy: 0.80
     safety: 1.00          # Zero tolerance for unsafe financial advice
     regulatory: 1.00      # Must always include disclaimers
   trading_signals:
     accuracy: 0.65        # Markets are uncertain; 65% is reasonable
     safety: 1.00
   dispute_generation:
     accuracy: 0.85
     completeness: 0.90
   ```

3. **Create at least 30 golden examples per financial dataset.** Financial advice quality is critical.

4. **Add `npm run eval` script.** Gate deployments on eval pass.

5. **Fix the 129 failing tests first** before adding new eval infrastructure.

### Gap 4: Risk-Tiered Approval (Score 3 → 8)
**Doctrine Reference: §9.4**

1. **Create `src/lib/risk/types.ts`:**
   ```typescript
   export enum RiskTier {
     CRITICAL = "critical",     // Financial transactions, dispute filing
     ELEVATED = "elevated",     // Budget changes, account linking
     ROUTINE = "routine",       // Analysis, recommendations
     INFORMATIONAL = "informational",  // Read-only queries
   }
   ```

2. **Create `src/lib/risk/classifier.ts`:**
   - Map every IntentType to a RiskTier
   - Trading intents → CRITICAL
   - Dispute intents → CRITICAL
   - Payment intents → CRITICAL
   - Budget modification → ELEVATED
   - Analysis/recommendation → ROUTINE
   - Queries → INFORMATIONAL

3. **Create `src/lib/risk/approval-gate.ts`:**
   ```
   ApprovalGate:
     For CRITICAL: require explicit user confirmation via UI modal
       - Show: what action, estimated impact, risk level, reversibility
       - User must click "Approve" with the plan details visible
       - Store approval token with timestamp + user ID
     For ELEVATED: require inline confirmation (less friction)
     For ROUTINE: auto-approve with audit log
     For INFORMATIONAL: no approval needed
   ```

4. **Create Supabase `approval_log` table** tracking every approval decision.

5. **Integrate into action executor:** No CRITICAL/ELEVATED action executes without passing through ApprovalGate.

### Gap 5: Protocol Formalization (Score 1 → 6)
**Doctrine Reference: §5.4, §8.4**

1. **Create `src/lib/tools/tool-provider.ts`:**
   ```typescript
   interface ToolProvider {
     listTools(): Promise<ToolDefinition[]>;
     callTool(name: string, params: unknown): Promise<ToolResult>;
     getSchema(name: string): JSONSchema;
   }

   class ActionToolProvider implements ToolProvider {
     // Wraps existing action executor as a typed tool interface
   }

   class CompositeToolProvider implements ToolProvider {
     // Combines multiple providers
   }
   ```

2. **Define typed schemas for all agent handoffs:**
   - Each trading agent in the consensus pipeline must have typed input/output interfaces
   - The consensus aggregation must have a typed schema
   - Use Zod for runtime validation of all inter-agent messages

3. **Create typed message bus for trading pipeline:**
   ```typescript
   interface TradingSignal {
     agentId: string;
     symbol: string;
     direction: "buy" | "sell" | "hold";
     confidence: number;  // 0-1
     reasoning: string;
     timestamp: Date;
   }

   interface ConsensusResult {
     signals: TradingSignal[];
     decision: "buy" | "sell" | "hold";
     consensusStrength: number;  // 0-1
     dissenting: string[];  // agent IDs that disagreed
   }
   ```

4. **Consider MCP server for financial tools** that could be reused:
   - Market data fetcher
   - Portfolio analyzer
   - Risk calculator

### Gap 6: Observability — Add OpenTelemetry (Score 4 → 7)
**Doctrine Reference: §10**

1. **Add OpenTelemetry packages:**
   - `@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`
   - `@opentelemetry/exporter-trace-otlp-http` (for production)

2. **Create `src/lib/telemetry/tracer.ts`:**
   ```
   - Initialize OTel tracer provider on app startup
   - Configure: Jaeger exporter (dev), OTLP (prod), console (test)
   - Provide getTracer(name) helper
   ```

3. **Instrument critical paths:**
   - Every LLM call: span with model, token count, latency, cost
   - Every trading agent execution: span with agent ID, signal output
   - Every consensus calculation: span with all signals + result
   - Every action execution: span with intent, risk tier, approval status
   - Every Supabase query: span with table, operation type

4. **Add trace context to all API routes:**
   - Next.js middleware to start/propagate trace context
   - Include `trace_id` in all API responses for debugging

5. **Create dashboard endpoint** or admin page showing recent traces.

### Gap 7: Cost Control — Budget Enforcement (Score 4 → 7)
**Doctrine Reference: §20.2 Cost Control row**

1. **Create `src/lib/cost/tracker.ts`:**
   ```
   - Track per-user token usage and cost
   - Store in Supabase `cost_tracking` table
   - Methods: recordUsage(userId, model, tokens), getDailyTotal(userId), isOverBudget(userId)
   ```

2. **Create `src/lib/cost/enforcer.ts`:**
   ```
   - Per-user daily/monthly budget (configurable per subscription tier)
   - Free tier: $X/day
   - Premium: $Y/day
   - On breach: return friendly error, suggest upgrade or wait
   - Hard stop: no LLM calls after budget breach
   ```

3. **Integrate into model router:** Check budget before every LLM call.

4. **Add cost display in UI:** Show users their usage and remaining budget.

### Gap 8: Error Handling — Recovery Cascade (Score 5 → 8)
**Doctrine Reference: §11.3, §20.2 Error Handling row**

1. **Create `src/lib/resilience/recovery.ts`:**
   ```
   RecoveryCascade:
     1. Self-correct: If LLM output fails Zod validation, retry with repair prompt
        (e.g., "Your previous response was invalid JSON. Please respond with valid JSON matching: {schema}")
     2. Retry: Exponential backoff (1s, 2s, 4s) up to 3 attempts
     3. Fallback: Switch to next model in router chain
     4. Degrade: Return cached/generic response with disclaimer
     5. Escalate: Surface error to user with context + suggest manual action
   ```

2. **Integrate into every LLM call path.** Replace bare try/catch with RecoveryCascade.

3. **Add specific recovery for financial operations:**
   - Trade failed → do NOT retry automatically (market conditions may have changed)
   - Analysis failed → retry with fallback model
   - Dispute generation failed → retry once, then surface draft for manual editing

### Gap 9: Trace Content Policy (Score 5 → 7)
**Doctrine Reference: §10.4**

1. **Extend existing PII redaction:**
   - Add financial-specific patterns: account numbers, routing numbers, card numbers (beyond just SSN/CC)
   - Add: portfolio values, specific balances, transaction amounts in logs
   - Create `src/lib/privacy/financial-redactor.ts`

2. **Create trace classification:**
   ```typescript
   enum TraceContentMode {
     METADATA_ONLY = "metadata_only",    // Only operation names, latencies, status codes
     REDACTED = "redacted",              // Content present but PII/financial data stripped
     FULL_CONTENT = "full_content",      // Everything (only for debugging, never in prod)
   }
   ```

3. **Default to REDACTED** in production. FULL_CONTENT requires explicit env var.

4. **Add data retention policy:**
   - Traces: 90 days
   - Financial audit logs: 7 years (regulatory requirement)
   - User conversation memory: user-deletable on request

### Gap 10: Memory Architecture Hardening (Score 6 → 8)
**Doctrine Reference: §20.2 Memory Spec row**

1. **Create `docs/MEMORY_ARCHITECTURE.md`:**
   - Document all memory tiers, their purpose, storage backend, TTL, and eviction policy
   - This must exist BEFORE any memory changes

2. **Add TTL policies:**
   - Conversation memory: 90 days inactive → archive
   - Financial snapshots: 1 year → archive (regulatory)
   - Context compression cache: 24 hours → evict
   - Trading signals: 30 days → archive

3. **Add eviction:**
   - Implement Supabase cron job or background task to enforce TTLs
   - Archive (not delete) expired data for regulatory compliance

4. **Add memory spec to agent definitions:**
   - Each of the 7 trading agents must declare its memory requirements in spec

---

## PHASE 3: UPDATE CANONICAL DOCS

After all code changes are implemented and tests pass:

### 3.1 Update `README.md`
- Add doctrine compliance section with current score and link to scorecard
- Add architecture diagram showing: side-effect lifecycle, approval gates, OTel trace flow, cost tracking
- Update technology stack section

### 3.2 Update `CLAUDE.md`
- Add: "All changes must comply with docs/AGENT_FRAMEWORK_DOCTRINE.md §20.2"
- Add: "CRITICAL: Every financial action (trade, dispute, payment) MUST go through SideEffectExecutor with HITL approval. No direct execution."
- Add: "Every new agent/intent must have a risk tier classification and eval dataset."
- Add: "All LLM calls go through model router → cost enforcer → recovery cascade. No direct API calls."
- Add: "Never log financial account numbers, balances, or transaction amounts. Use REDACTED trace mode."

### 3.3 Update `docs/SSOT.md`
- Add doctrine compliance status
- Add side-effect semantics documentation
- Add risk tier classification table
- Add release manifest process

### 3.4 Update `docs/architecture.md`
- Add: side-effect lifecycle flow diagram
- Add: risk-tiered approval flow
- Add: OpenTelemetry trace propagation
- Add: cost control and budget enforcement
- Add: memory architecture with TTLs

### 3.5 Create `docs/ARCHITECTURE_UPGRADE_LOG.md`
- Document every change made in Phase 2 with before/after
- Include specific files modified and why
- Include new test coverage numbers
- Include new eval baseline results

### 3.6 Create Agent Specs for All 7 Trading Agents
- Create `docs/agent_specs/` directory
- For each trading agent, create YAML spec following §21 template:
  - Identity, role in consensus pipeline, decision weight
  - Input/output types (TradingSignal schema)
  - Tools accessed (with risk tiers)
  - Memory requirements
  - Eval criteria and baselines
  - Operating constraints (max tokens per decision, timeout)

### 3.7 Create `docs/FINANCIAL_SAFETY.md`
- Document the side-effect lifecycle for financial actions
- Document HITL approval requirements by action type
- Document rollback capabilities and limitations
- Document regulatory compliance (data retention, audit trails)
- This document should be required reading for any contributor

### 3.8 Update `ROADMAP.md`
- Add doctrine compliance milestones
- Add ongoing eval dataset expansion targets
- Add security audit schedule

---

## Execution Rules

1. **Fix the 129 failing tests FIRST** before any new code. Get to green.
2. **Run `npm test` after every file change.** Zero regressions.
3. **Financial actions are the #1 priority.** Gap 1 (side-effect semantics) and Gap 4 (risk-tiered approval) must be completed before any other gaps.
4. **All new TypeScript code must use Zod for runtime validation** of external inputs (API responses, LLM outputs, user inputs). TypeScript interfaces alone are not sufficient — they don't exist at runtime.
5. **Never execute a financial action without explicit user approval.** If in doubt, add an approval gate.
6. **All prompts must be extracted to `src/prompts/`** directory — no inline prompt strings in business logic.
7. **Commit after each gap is closed** with a message referencing the doctrine section (e.g., "feat: add side-effect lifecycle for financial actions per Doctrine §11.4").
8. **If a change would affect the trading pipeline**, run the trading-specific tests AND manually verify with a paper-trading scenario before merging.
9. **Supabase migrations must be reversible.** Every `up` migration needs a corresponding `down`.
10. **Add financial disclaimers** to any user-facing output that could be interpreted as financial advice.
