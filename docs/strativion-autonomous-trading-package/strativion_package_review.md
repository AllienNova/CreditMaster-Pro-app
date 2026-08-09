# Strativion Autonomous Trading Package — Principal-Level Production Readiness Review

**Package:** `strativion-laws-package` v2.1.0 (claims maturity: `enterprise_reusable`)
**Scope of review:** The entire unpacked archive `strativion-autonomous-trading-package.zip`, read as a machine-consumable control plane for real autonomous trading systems, not as a book, textbook, or generic docs folder.
**Reviewer posture:** External principal-level; adversarial-helpful; treat all ambiguity, drift, and missing controls as live defects.

---

## 1. Executive Verdict

**Verdict: Not ready for production as a canonical, machine-consumable control plane. Conditionally ready as an internal reference/knowledge library for supervised (human-in-the-loop) use only, after a focused normalization pass.**

The package presents a serious, thoughtful architecture: a clear binding precedence, a reasonable mode model (manual / supervised / autonomous), a well-structured set of policy YAMLs, and a coherent multi-agent decomposition. For a v2.1.0 internal package it is above average in organization. However, as a *machine-consumable* control plane for autonomous trading, it has enough concrete defects to cause real financial, operational, and governance harm if consumed as-is — and it markets itself as "enterprise_reusable," which sets a bar it does not clear. The most severe problems are not theoretical: there are numeric disagreements on hard-risk limits between files that each claim to be binding; a root-level `CLAUDE.md` that contradicts the canonical directory layout and the migration map; a migration map with broken double paths; machine-actionable YAMLs with zero formal schema validation; canonical workflow files that still carry textbook attribution and discretionary human language; and agent-context files that embed numeric constants divergent from the canonical policies they claim to be subordinate to. A short, disciplined fix pass (estimated 2–4 engineer-weeks) can close most P0/P1 gaps and get this to a defensible baseline.

---

## 2. Findings

Findings are listed in descending severity. Every finding has: **Title**, **Why it matters**, **File path(s)**, **Recommendation**.

### P0 — Must fix before any autonomous consumer is allowed to bind

#### P0-1. Hard risk thresholds disagree across files that each claim to be binding
**Why it matters.** Three files encode crisis-mode portfolio heat with *different* numbers, and three files encode the daily loss cap with *different* numbers. An agent or engine wiring to one of them will execute a different policy than one wiring to another, under the same claimed regime. This is the single most dangerous kind of defect in a control plane.

Concrete disagreements:

| Threshold | `canonical/policy/policy.runtime.yaml` | `canonical/policy/policy.risk.yaml` | `contexts/knowledge/context.guide.crisis-playbook.md` | `contexts/agent-contexts/context.agent.risk.md` |
|---|---|---|---|---|
| Crisis portfolio heat max | `crisis_heat_max_pct: 0.01` (1%) | `portfolio_heat.crisis: …` (separate ladder) | "Set portfolio heat maximum to **3%**" | "Portfolio heat … **1% crisis**" |
| Shock portfolio heat max | `shock_heat_max_pct: 0.02` (2%) | separate shock ladder | not explicit | "2% shock" |
| Daily loss halt | `daily_halt_pct: 0.02` (2%) | `daily_halt: 0.02` (2%) | "Set daily loss limit to **1.5%** (from normal 3%)" | "Daily loss limit not yet reached (< **2%**)" |
| Normal daily loss | 2% (implicit) | 2% | "normal **3%**" | "< 2%" |
| Max drawdown halt (system) | `absolute_system_halt_pct: 0.15` | `absolute_system_halt: 0.15` | (not encoded) | "20%+: FULL HALT" (context.agent.risk.md line 30) |
| Max drawdown (full halt) | `live_trading_halt_pct: 0.20` | — | — | 20% in risk-agent context, but 15% in system policy |

The risk-agent context even contradicts itself: it says "Risk per trade <= 1% of equity (<= 0.5% in shock/crisis)" while earlier quoting "0.5% max risk in shock/crisis" — that's consistent, but the drawdown ladder (`20%+: FULL HALT`) conflicts with runtime's `absolute_system_halt_pct: 0.15`.

**File paths:**
- `canonical/policy/policy.runtime.yaml` (lines ~29–48)
- `canonical/policy/policy.risk.yaml` (lines ~22–62)
- `canonical/policy/policy.system.yaml` (lines ~16, 19–20)
- `contexts/knowledge/context.guide.crisis-playbook.md` (lines ~19, 26)
- `contexts/agent-contexts/context.agent.risk.md` (lines ~26–30, 51, 58–63)

**Recommendation.** Pick one source of truth for every numeric risk limit — `canonical/policy/policy.runtime.yaml` is already declared top-priority in `CONSUMER-CONTRACT.md`, so use it. Then (a) delete every numeric constant from `contexts/` files and replace with *references* to the runtime key (`policy.runtime.yaml#runtime_risk.crisis_heat_max_pct`), and (b) add a CI check that fails if any context or knowledge file contains a percentage literal not sourced via reference. This is the highest-leverage single fix in the package.

---

#### P0-2. Root-level `CLAUDE.md` describes a directory tree that does not exist in this package
**Why it matters.** `CLAUDE.md` is 399 lines, authoritative-looking, and is the first file any Claude Code / agent consumer will read. It documents a layout (`config/`, `rules/`, `knowledge/`, `examples/`, `implementations/python-formulas/` at root, and `implementations/pctt/engine/`) that is a mix of the *old* pre-migration structure and the *new* structure. More than half of the paths it references — including `config/master-config.yaml`, `config/risk-limits.yaml`, `rules/the-30-laws.yaml`, `rules/entry-setups.yaml`, `knowledge/law-01-market-inertia.md`, `examples/sample-trades.yaml` — **do not exist in this package**. It also references `implementations/python-formulas/` at the implementations root (which *does* exist) but then says the file layout has `examples/` at root (which does not exist at root; it is `reference/examples/`).

An autonomous agent coached by this file will spend cycles chasing ghosts, or worse, will infer that files named in `CLAUDE.md` but not present are deliverables it needs to generate — leading to unsafe fabrication.

**File paths:**
- `CLAUDE.md` lines 62–128 ("Directory Structure"), lines 76–97, lines 98–109, lines 329–347 ("Key File Locations").

**Recommendation.** `CLAUDE.md` must be one of:
1. **Rewritten** so every path it names is verifiable with `ls`, with a CI check that runs exactly that.
2. **Deleted** and replaced with a short pointer to `README.md` + `governance/CONSUMER-CONTRACT.md`.

It should not sit at the root as-is. If it is preserved, it must explicitly state that it is a *development* instruction file for one specific implementation track (PCTT engine) and not a layout authority for the package.

---

#### P0-3. Migration map contains broken double paths that will mislead any consumer performing the migration
**Why it matters.** `governance/MIGRATION-MAP.md` literally maps old paths to *invalid* new paths:

```
- contexts/knowledge/              -> contexts/contexts/knowledge/      (does not exist)
- implementations/python-formulas/ -> implementations/python-implementations/python-formulas/  (does not exist)
- reference/market-playbooks/      -> reference/reference/market-playbooks/  (does not exist)
```

The actual tree has `contexts/knowledge/`, `implementations/python-formulas/`, and `reference/market-playbooks/` — no doubled segments. A consumer that naively applies the migration map will hard-fail or (worse) create those directories and start writing into them, forking the tree.

**File paths:**
- `governance/MIGRATION-MAP.md` lines 12, 13, 16.

**Recommendation.** Fix the three double-path entries to match the actual tree, add a CI test that walks every "new" path in MIGRATION-MAP and asserts it exists on disk, and version-bump the migration-map doc. Also document what "Consumer Update Rule" should do when the target path is missing (fail loudly, not silently create).

---

#### P0-4. No JSON Schema / OpenAPI / formal validation for any canonical YAML
**Why it matters.** The package is explicitly positioned as "machine-consumable" and the consumer contract says consumers bind to `canonical/policy/*.yaml`. Yet there is:

- No `schemas/` directory.
- No `*.schema.json` or `*.schema.yaml` anywhere (`find … -name "*.schema.*" -o -name "schemas" -type d` returns nothing).
- No Pydantic, no Zod, no OpenAPI component anywhere in the canonical layer.
- `governance/VALIDATION-RULES.md` contains only human-language "should" checks, not machine rules.

This means a consumer cannot verify structurally that `policy.runtime.yaml` hasn't been mutated into an unsafe shape. A typo like `crisis_heat_max_pct: 1.0` (instead of `0.01`) is not structurally rejected; no required-field contract is enforced; no value-range invariants are checked; no cross-file invariants (e.g., `shock_heat_max_pct > crisis_heat_max_pct`) are expressible.

**File paths:**
- All of `canonical/policy/*.yaml`
- All of `canonical/laws/*.yaml`
- All of `canonical/workflows/*.yaml`
- `governance/VALIDATION-RULES.md`

**Recommendation.** Ship JSON Schemas (one per canonical YAML) under `canonical/schemas/`. Each must include required fields, value ranges, enum constraints, and cross-field invariants expressed via `allOf`/`oneOf`. Ship a reference validator (Python and/or TypeScript) under `tooling/validate/`. Make `package-manifest.yaml` record the content hash and schema version for every canonical file. Gate CI and package publish on schema pass.

---

#### P0-5. Agent-context files embed hard numeric constants that drift from canonical policy
**Why it matters.** Every agent-context file opens with a "Canonical Authority" section declaring itself subordinate to canonical YAMLs. The files then immediately hard-code specific numbers that diverge from those YAMLs:

- `context.agent.risk.md` (line 22): "Hard limits: **1% max risk per trade** in autonomous runtime, **6% max portfolio heat**, and **0.5% max risk** in shock/crisis." These are restated as numeric literals. If `policy.runtime.yaml` is later tightened to 0.5% base and 4% heat (a totally reasonable response to incidents), this file silently lies to every LLM that consumes it.
- `context.agent.risk.md` (lines 26–30) encodes an entire drawdown ladder (`0–5% normal; 5–10% 0.75x; 10–15% 0.50x; 15–20% 0.25x; 20%+ FULL HALT`) that is nominally the same as `policy.sizing.yaml`'s ladder but is not linked to it. If the policy shifts, this drifts.
- `context.agent.execution.md` hard-codes session-timing rules ("10:00-12:00 ET best," "avoid 11:30-13:30 ET") that are correctly mirrored in `policy.execution.yaml` — but once again as prose literals, with no tie-back mechanism.
- `context.agent.regime.md` encodes threshold values ("ADX(14) > 25 AND rising," "Hurst > 0.55") as "Representative" and says "see `policy.regimes.yaml` for exact threshold values." But the file calls these representative *and then* claims them in the 60-second checklist as operational, blurring the line.
- `context.agent.risk.md` crisis triggers (VIX > 30, S&P drop > 3%, spreads > 3x) are restated literals.

An LLM consumer of any one of these files will internalize the prose numbers as ground truth and will not always re-consult the subordinate canonical file.

**File paths:**
- `contexts/agent-contexts/context.agent.execution.md`
- `contexts/agent-contexts/context.agent.risk.md`
- `contexts/agent-contexts/context.agent.signal.md`
- `contexts/agent-contexts/context.agent.regime.md`
- `contexts/agent-contexts/context.agent.journal.md`
- `contexts/agent-contexts/context.agent.meta.md`

**Recommendation.** Every numeric constant in agent-context files must be replaced with a template reference (e.g., `{{ policy.runtime.runtime_risk.crisis_heat_max_pct }}`) that is filled at load time by a single rendering pipeline, OR the numbers must be stripped entirely and replaced with "See `canonical/policy/policy.runtime.yaml#…`." Prose-paraphrased numbers are a drift hazard. Ship a lint rule that fails any commit adding a raw percent literal inside `contexts/**`.

---

#### P0-6. `Law 27: Emotional Gravity` language in agent contexts is operationally unsafe for autonomous consumers
**Why it matters.** `law.automation-map.yaml` correctly classifies Law 27 as `human_supervisory` (emotional state is not machine-measurable). But `context.agent.journal.md` lines 45–52 then asks the Journal Agent — an autonomous LLM agent — to detect "Disposition effect … Revenge trading … Overtrading … Tilt detection … Monday/Friday bias." Line 53 tries to paper this over with "In autonomous systems, these checks are interpreted as governance and supervision signals rather than literal self-reported emotions," but the preceding detection rules are written in first-person trader language ("revenge trading," "tilt," "abandoned rules") with no operational remapping. An LLM will attempt to implement what it reads.

Worse, `workflow.entry-setups.yaml` and `workflow.exit-rules.yaml` (flagged in the prior reading) still contain discretionary phrases like "Write answers down. Commit." and references to "hope trade" — artifacts of the book source that do not belong in a canonical workflow consumed by autonomous agents.

**File paths:**
- `contexts/agent-contexts/context.agent.journal.md` lines 45–53
- `canonical/workflows/workflow.entry-setups.yaml` (the "9:50 AM Decision Protocol" section)
- `canonical/workflows/workflow.exit-rules.yaml` (narrative exit language)
- `contexts/knowledge/context.law.22-invalidation.md` line 16: `NEVER: Move your stop further from entry to avoid being stopped out. This is the "hope trade" and it leads to catastrophic losses` — this is fine in knowledge, but the phrase bleeds into workflows.

**Recommendation.** Rewrite the Journal Agent's Law 27 section in purely operational terms: replace "revenge trading" with "N trades in T minutes after a stop-loss → throttle and require supervisory ack"; replace "tilt" with "M consecutive losses OR rolling R-multiple below threshold → force `supervised` mode." Remove from canonical workflows any sentence that presupposes a human reader (write-downs, commitments, personal discipline language) and move that content to `reference/` or `contexts/knowledge/` where it will not be bound.

---

#### P0-7. Canonical workflows reference book provenance and contain strategy-specific discretionary material
**Why it matters.** A canonical file is a binding control artifact. Consumers must be able to rely on it without importing the author's narrative. Two canonical workflow files carry textbook artifacts:

- `workflow.entry-setups.yaml` contains the line **"Source: The 30 Indisputable Laws of Trading by Kimal Honour Djam"** and references "Ch.31 (Weekly and Monthly Rhythm)" and similar chapter-number attributions.
- `policy.seasonality.yaml` similarly references "Source: Ch.31."
- `workflow.entry-setups.yaml` is 508 lines of prose-heavy, strategy-specific material (morning protocols, specific clock-time windows for a single US-equities day-trader profile) that is neither reusable across instruments nor appropriate for a canonical layer.
- `workflow.exit-rules.yaml` is 456 lines in the same shape.
- Specific win rates like "0.58 on trend days" appear without sample sizes, confidence intervals, backtest methodology, or provenance — an autonomous consumer could ingest these as ground truth.

**File paths:**
- `canonical/workflows/workflow.entry-setups.yaml`
- `canonical/workflows/workflow.exit-rules.yaml`
- `canonical/policy/policy.seasonality.yaml`

**Recommendation.**
1. **Downgrade both workflow files from `canonical/` to `reference/playbooks/` or `implementations/pctt/playbooks/`.** They are strategy-specific, not reusable.
2. Replace them in `canonical/workflows/` with a minimal, instrument-agnostic entry-admission and exit-admission contract: required fields, hard gates, and rejection rules. Leave timing specifics to instrument-class playbooks.
3. Strip every book citation, chapter reference, and author attribution from the canonical layer. Move attribution to `PACKAGE-STATUS.md` and `README.md` only.
4. Every win-rate number in any canonical file must be tagged with `sample_size`, `ci_95`, and `source_backtest_id` or be deleted.

---

#### P0-8. `README.md` contains embedded Windows-local URLs that are broken for every non-local consumer
**Why it matters.** The README hyperlinks to paths like `D:\dev\projects\strativion-tasklet\docs\…` — these resolve only on the author's development machine. Any consumer — internal CI, CD pipeline, downstream agent, external partner — will see dead links. For a package that claims `enterprise_reusable` maturity, this is disqualifying surface polish that betrays the claim.

**File paths:** `README.md` (top-level).

**Recommendation.** Strip all `D:\…` URLs. Replace with relative paths within the package (`./governance/CONSUMER-CONTRACT.md`) or with placeholders (`<TBD: public docs URL>`). Gate CI on a link-check.

---

### P1 — Fix in the same release cycle as P0

#### P1-1. Binding precedence does not include a total ordering / conflict-resolution algorithm
**Why it matters.** `CONSUMER-CONTRACT.md` gives an ordered list (runtime → modes → automation-map → rest of policy → rest of workflows → contexts → reference → implementations), which is good. But it does not specify: (a) what happens when two files at the *same* tier disagree (e.g., `policy.risk.yaml` and `policy.sizing.yaml` both have drawdown-scaling ladders — which wins?); (b) what happens when a consumer reads the package at version N but a referenced file was added in N+1 (forward compatibility); (c) what "binding" actually means operationally — is a consumer allowed to add stricter local overrides? Only looser? In which layers?

**File paths:** `governance/CONSUMER-CONTRACT.md`.

**Recommendation.** Add an explicit conflict-resolution section: (1) Within a tier, the lexicographically-first file by canonical filename wins, OR (preferred) each numeric key must exist in at most one canonical file and others must reference it. (2) Consumers may narrow (make stricter) any runtime limit but must never widen it; document an `override_policy.yaml` format consumers can carry locally. (3) Define version-pinning semantics and the behavior when a pinned version is older than the reader's code.

---

#### P1-2. Heat and drawdown ladders are duplicated across `policy.sizing.yaml`, `policy.runtime.yaml`, and `policy.risk.yaml`
**Why it matters.** Three files each carry an overlapping drawdown-scaling / heat ladder. Even if they currently agree numerically, any future edit has three places to touch and three ways to drift.

**File paths:**
- `canonical/policy/policy.sizing.yaml` (drawdown_scaling section)
- `canonical/policy/policy.runtime.yaml` (runtime_risk section)
- `canonical/policy/policy.risk.yaml` (portfolio_heat, drawdown sections)

**Recommendation.** Pick one canonical home per concept: `policy.risk.yaml` owns portfolio heat, `policy.sizing.yaml` owns the drawdown size-multiplier ladder, `policy.runtime.yaml` owns halts. Delete the duplicates from the other files and add a schema test that fails if any key appears in more than one canonical file.

---

#### P1-3. `policy.system.yaml` key names overlap semantically with `policy.runtime.yaml` but differ syntactically — drift hazard
**Why it matters.** `policy.system.yaml` has `max_drawdown_halt: 0.15`; `policy.runtime.yaml` has `absolute_system_halt_pct: 0.15`. Same number, different name. Consumers reading one and writing against the other will not collide structurally but will collide semantically if either value is changed.

**File paths:**
- `canonical/policy/policy.system.yaml` (lines 16–24)
- `canonical/policy/policy.runtime.yaml` (lines 42–48)

**Recommendation.** Either merge `policy.system.yaml` into `policy.runtime.yaml` (the two clearly overlap in purpose) or make one strictly a derived view of the other with explicit field aliasing. Standardize the suffix `_pct` everywhere.

---

#### P1-4. Confluence scoring is underspecified and contradicts itself across files
**Why it matters.**
- `context.agent.signal.md` says signals must have `confluence_score: [3 | 4 | 5]` and that "only pass signals with 3+ independent confirmations."
- `context.agent.journal.md` records `confluence_score: [0-5]` — inconsistent domain.
- "Independence" of confirmations is critical (two overlapping momentum indicators is not 2 confirmations; it's 1). The signal context says "Do not use more than one indicator from the same category" but gives no enforceable definition.

A backtest or live signal pipeline that counts confluence differently from the journal will produce mis-tagged trades and invalid expectancy.

**File paths:**
- `contexts/agent-contexts/context.agent.signal.md` (lines ~55–66, 83)
- `contexts/agent-contexts/context.agent.journal.md` (line 67)
- (Likely) `contexts/knowledge/context.law.18-confirmation-confluence.md`

**Recommendation.** Move confluence definition to a single canonical artifact (`canonical/workflows/workflow.confluence.yaml` or add a `confluence:` block in `workflow.checklists.yaml`) with: (a) the closed list of category codes (trend, momentum, volume, structure, timeframe), (b) the deduplication rule expressed as a category set, (c) the exact integer domain (0–5 with rejection <3). Reference from both contexts.

---

#### P1-5. Regime thresholds mix "representative" and "exact"
**Why it matters.** `context.agent.regime.md` lists ADX/Hurst/autocorr thresholds as "Representative" then directs readers to `policy.regimes.yaml` for exact values. But in the same file, the PCTT regime section (lines 158–170) encodes *exact* values (`ER >= 0.40`, `ER <= 0.25`, `crossings < 5`, `crossings >= 8`) inline. This split will confuse both humans and agents: are PCTT thresholds exceptions that live here, or duplicates that will drift?

**File paths:**
- `contexts/agent-contexts/context.agent.regime.md`
- `canonical/policy/policy.regimes.yaml`
- `implementations/pctt/config/pctt-parameters.yaml`

**Recommendation.** All numeric thresholds — including PCTT-specific ones — must live in exactly one YAML under `canonical/` or `implementations/pctt/config/`, never in an agent context. Agent contexts should reference via key path.

---

#### P1-6. No explicit FIX reject handling, time-in-force semantics, or broker-error playbooks
**Why it matters.** The execution agent context has good intent (slippage tracking, spread monitoring, partial-fill rules) but is silent on real execution-layer failure modes:

- FIX rejects (reason codes 99, 11, 15, 203, etc.) — no policy for "reject with reason X" → retry, downgrade, abandon.
- Time-in-force handling (DAY, IOC, FOK, GTC, GTD) — no default and no instrument-class selection rule.
- Pre-open order behavior (queued vs. rejected vs. held).
- Duplicate-fill reconciliation beyond a handwave ("idempotent order submission" in one file with no implementation contract).
- Broker outage / partial connectivity — no circuit-breaker algorithm for the broker session itself (only for strategy failures).
- Options assignment edge cases — not addressed.
- Futures roll windows — no concrete threshold ("X days before expiry, suspend entries on the front month").
- Weekend crypto outages / maintenance windows — not addressed despite the crypto playbook existing.
- Clock skew thresholds are mentioned as a boolean (`reject_on_unknown_halt_status`) but not quantified ("skew > 100ms for N consecutive samples → halt").

An autonomous execution consumer will need all of these; in their absence, each consumer will invent its own, producing unsafe divergence.

**Recommendation.** Add `canonical/policy/policy.execution-errors.yaml` with: reject-code action table, TIF defaults by instrument class, clock-skew thresholds, roll-window rules, broker-session circuit breaker, duplicate-fill reconciliation protocol, and maintenance-window awareness for 24/7 venues.

---

#### P1-7. No canary / traffic-split / blue-green promotion semantics in `policy.governance.yaml`
**Why it matters.** The package repeatedly emphasizes Law 28 (Adaptation) and Law 19 (Edge Decay), and talks about research-to-live promotion. But `policy.governance.yaml` does not specify: percent-of-capital canary, shadow-mode traffic split, minimum parallel-run duration, roll-back trigger thresholds, or a kill-switch for a newly promoted strategy that underperforms its pre-promotion baseline. The meta-agent context asserts a `25% of normal sizing for first 5 sessions` post-restart rule but does not cover the more common case of promoting a new strategy into an already-running system.

**Recommendation.** Add an explicit promotion protocol: `shadow → canary (≤5% capital, N sessions) → restricted (≤25%, N sessions) → normal` with per-stage kill-switches and per-stage performance gates. Reference from `policy.runtime.yaml` so runtime enforces stage-appropriate limits.

---

#### P1-8. No incident taxonomy with explicit machine tags
**Why it matters.** `workflow.incidents.yaml` exists but reading it as an incident taxonomy shows free-text categories mixed with codes. For incidents to be machine-consumable (and post-trade review to correlate), they need an enumerated taxonomy (e.g., `INC_DATA_STALE_TIER1`, `INC_HALT_UNKNOWN`, `INC_SPREAD_BLOWOUT`, `INC_RISK_VETO`, `INC_BROKER_REJECT`, `INC_CORR_SPIKE`).

**Recommendation.** Enumerate all incident codes, give each a severity, an auto-action, and a supervisory-escalation requirement; pin them in a schema.

---

### P2 — Should fix; operationally material but not immediate safety

#### P2-1. 4x duplicated / parallel configuration systems across the package
There are effectively four parallel configuration trees, which is exactly why drift happens:

1. `canonical/policy/*.yaml` — the declared control plane
2. `implementations/pctt/config/*.yaml` — PCTT-specific overrides (`pctt-parameters.yaml`, `pctt-market-adaptations.yaml`)
3. `implementations/pctt/config/master-config.yaml`, `risk-limits.yaml`, etc. as referenced in `CLAUDE.md` (may or may not exist; CLAUDE.md is unreliable here)
4. In-prose numbers in every `contexts/agent-contexts/*.md` file

This is a known drift pattern in control-plane work and already has produced the P0-1 and P0-5 disagreements above.

**Recommendation.** Publish a single configuration dependency graph. Every implementation-layer config must either (a) be a pure delta over a canonical config (explicit "inherits_from" key), or (b) be tagged `non_binding`. No implementation config may introduce a key that is not either defined in canonical schema or explicitly allowed as an implementation-layer extension.

---

#### P2-2. Law catalog vs. `law.automation-map.yaml` — consistency is not automatically enforceable
Both files enumerate 30 laws with domain tags; they agree today, but nothing guarantees they will tomorrow.

**Recommendation.** Generate one from the other or cross-validate in CI. Add `law_id` as a primary key and fail if any law appears in one but not the other.

---

#### P2-3. Agent-context files are a mix of role specification and book-summary prose
Each agent context blends: (a) operational role definition (good, needed), (b) a paraphrase of 5–8 laws (duplicates `contexts/knowledge/context.law.*.md`), and (c) PCTT-specific appendix (sometimes lines 120+). The duplication guarantees drift with `contexts/knowledge/` and with the canonical layer.

**Recommendation.** Split each agent context into:
1. `contexts/agent-contexts/context.agent.<name>.role.md` — role, inputs, outputs, dependencies only.
2. `contexts/agent-contexts/context.agent.<name>.pctt.md` — PCTT-specific additions, so non-PCTT consumers can skip.
And delete the embedded law summaries — point to `contexts/knowledge/context.law.NN-*.md` instead.

---

#### P2-4. `reference/manuscript/` is raw book content
`reference/manuscript/` has 10 subdirectories (`front-matter`, `section-1-foundations`, `section-2-laws`, … `section-9-reference`) — the full manuscript of the underlying book. This is valuable context but its presence inside a package branded as an autonomous-trading control plane invites consumers to treat it as authoritative. An LLM reading this package top-down will find manuscript prose next to canonical YAMLs and will not always correctly rank them.

**Recommendation.** Either (a) pull the manuscript out of this package entirely and keep it in a separate `strativion-laws-knowledge` package with a clearly different purpose, or (b) keep it but add a `reference/README.md` that explicitly states: "Nothing under `reference/` is ever binding. No consumer should cite `reference/` in a production decision path. Manuscript content is narrative context only."

---

#### P2-5. `implementations/pctt/` lives inside the control-plane package
The PCTT implementation (~200 files including TypeScript engine, research papers, PNGs, SSOT batch files) is a whole separate product shipped inside what is marketed as a reusable control-plane package. A non-PCTT consumer (say, an agent system building on the laws but with its own signal engine) must nevertheless download and reason about the PCTT material.

**Recommendation.** Either publish two packages — `strativion-laws-core` (canonical + governance + contexts + reference minus manuscript) and `strativion-pctt` (implementation + PCTT engine + PCTT configs) — or keep one package but explicitly mark PCTT as optional with its own subpackage README declaring that it's one reference implementation, not the canonical one. Today the boundary is fuzzy.

---

#### P2-6. CLAUDE.md asserts invariants that do not exist in canonical policy
`CLAUDE.md` lines 304–317 list "10 System Invariants" (e.g., "Position size never exceeds Kelly fraction / 4," "Circuit breakers trip at 3 consecutive failures," "Hot memory syncs to warm within 100ms"). These are *implementation* invariants for the PCTT engine, but they are presented with the same authoritative tone as policy. Kelly/4 is stricter than anything in `policy.sizing.yaml`, which is fine — but it's asserted nowhere else, so it is not auditable from the canonical layer.

**Recommendation.** Either (a) promote these to canonical policy (with schema and CI) or (b) explicitly scope them as "PCTT engine invariants" with a clearly labeled section heading and path scope.

---

#### P2-7. Data-quality policy is thin on content
`policy.data-quality.yaml` (reviewed earlier) is right-shaped but shallow: it does not enumerate the concrete staleness thresholds per instrument class, the corroboration rules across feeds, or the behavior on feed-failover transitions. For autonomous consumers, data-quality is frequently the single biggest source of bad trades.

**Recommendation.** Expand to include per-instrument-class staleness thresholds (ms for futures, s for equities, s for FX, s for crypto), cross-feed disagreement thresholds, feed-failover behavior, NBBO-staleness behavior, and explicit reject-on-unknown rules for each.

---

#### P2-8. Coverage matrix is human-written, not generated
`governance/COVERAGE-MATRIX.md` is a written claim of what the package covers. It's a good document but it is not derived from the actual file tree or schemas — meaning it can drift.

**Recommendation.** Generate it at package-build time from schema metadata + canonical file inventory.

---

### P3 — Polish / minor

- **P3-1.** `PACKAGE-STATUS.md` claims maturity `enterprise_reusable`; given the P0 set above, this claim should be downgraded to `internal_alpha` or `v2.x_pre_production` until P0/P1 are cleared.
- **P3-2.** The `30 laws` framing is evocative but invites reader-trust beyond warranted; each "law" should carry a `testability` tag (falsifiable / heuristic / normative) so consumers can't treat heuristics as physics.
- **P3-3.** Timestamps in examples use inconsistent formats (`ISO 8601` mentioned, but some examples show bare ET strings). Normalize everything to ISO 8601 with timezone.
- **P3-4.** Several YAMLs mix trailing-space prose comments with live keys; run `yamllint` with strict mode.
- **P3-5.** Knowledge-law files (e.g., `context.law.22-invalidation.md`) cite "key numbers" like "4.7x realized vs. planned loss" and "35% premature stop-out reduction" with no sources. In a control-plane package, unsourced percentages are drift bait. Either source them or delete them.
- **P3-6.** `tooling/claude/skills/validate` directory exists but is not referenced anywhere in `CONSUMER-CONTRACT.md`; either wire it up to the package's CI story or remove it.

---

## 3. Coverage Gaps

Items the package should cover for an autonomous control plane but does not, or covers only thinly:

1. **Machine-validation schemas** for every canonical YAML (P0-4). This is the single biggest coverage gap.
2. **Execution failure taxonomy** — FIX reject codes, broker outages, session cuts, duplicate fills, TIF defaults, assignment handling (P1-6).
3. **Clock-skew quantification** — thresholds, not just a boolean reject.
4. **Pre-open and after-hours admission rules** — explicitly enumerated per instrument class.
5. **Futures roll-window thresholds** — "X sessions before expiry, block entries on the front month" with a concrete X per contract family.
6. **Options-specific admissions** — assignment risk near expiry, implied-volatility-crush windows around earnings/FOMC, max-pain proximity, pinning.
7. **Crypto-specific failure modes** — exchange maintenance, funding-rate surges, stablecoin de-peg events, chain outages, weekend/holiday thinness thresholds.
8. **Feed-disagreement arbitration** — when tier-1 and tier-2 feeds disagree by X bps for Y seconds, what happens?
9. **Borrow/locate and short-sale constraints** — mentioned once ("borrow-unknown short sales") in validation rules but not encoded in canonical policy.
10. **PDT / wash-sale / pattern-day-trader rules** — asserted in `CLAUDE.md` as hard gates but nowhere in canonical policy (grep returns zero hits in `canonical/` and `contexts/agent-contexts/`).
11. **Leverage and margin** — some mentions of `emergency_halt_above: 3.0` for leverage, but no base-state leverage policy per instrument class.
12. **Position-reconciliation cadence** — mentioned in the CLAUDE.md agent list (AG-11) but no canonical policy on reconciliation frequency, discrepancy thresholds, or resolution protocol.
13. **Kill-switch UI and operational handle** — the shutdown protocol exists but there is no documented operator interface (a single `kill_switch=true` YAML toggle? An HTTP endpoint? A signal to the meta agent?). This matters for real incidents.
14. **Secrets management and key rotation** — none; crisis playbook never mentions "rotate broker API keys" as a risk.
15. **Audit-log schema** — an `AuditEntry` is asserted by CLAUDE.md invariant #5 but not schematized in canonical.
16. **Promotion / canary / rollback protocol** (P1-7).
17. **Incident taxonomy with explicit machine codes** (P1-8).
18. **Jurisdiction / regulatory constraints** — all rules are effectively US-equities-flavored. No mention of MiFID II best-execution obligations, ASIC, SFC, etc. If this package is intended for non-US venues, there is a coverage hole; if it's US-only, that should be stated.
19. **Tax-lot and cost-basis policy** — relevant for US equities, absent.
20. **Stale-data auto-test harness** — `VALIDATION-RULES.md` asks consumers to test "stale quotes, inconsistent account state…" but ships no reference harness to do so.

---

## 4. Internal Consistency Check

Findings summarized as an explicit consistency audit:

| # | Assertion | Location A | Location B | Status |
|---|---|---|---|---|
| 1 | Crisis portfolio heat max | runtime: 1% | crisis-playbook: 3% | **INCONSISTENT (P0-1)** |
| 2 | Daily loss limit, normal | runtime: 2% | crisis-playbook: 3% | **INCONSISTENT (P0-1)** |
| 3 | Daily loss limit, crisis | runtime: 2% (unchanged) | crisis-playbook: 1.5% | **INCONSISTENT (P0-1)** |
| 4 | Drawdown full-halt level | system.yaml: 15% | risk-context: 20% | **INCONSISTENT (P0-1)** |
| 5 | `max_drawdown_halt` naming | system.yaml: `max_drawdown_halt` | runtime.yaml: `absolute_system_halt_pct` | **DRIFT RISK (P1-3)** |
| 6 | Risk per trade, normal | risk-context: 1% | runtime+sizing: 1% | Consistent |
| 7 | Risk per trade, crisis | risk-context: 0.5% | runtime+sizing: 0.5% | Consistent |
| 8 | Confluence score domain | signal-context: 3/4/5 | journal-context: 0–5 | **INCONSISTENT (P1-4)** |
| 9 | Directory layout | CLAUDE.md (400 lines) | Actual tree | **INCONSISTENT (P0-2)** |
| 10 | Migration target paths | MIGRATION-MAP.md | Actual tree | **INCONSISTENT (P0-3)** |
| 11 | Law catalog vs. automation-map | law.catalog.yaml | law.automation-map.yaml | Currently consistent but not enforced (P2-2) |
| 12 | Crisis triggers | risk-context (VIX>30, SPX>3%, corr>0.7, spreads>3x, CB) | crisis-playbook (same plus "two 3σ in 5 days") | **INCONSISTENT / INCOMPLETE** |
| 13 | Kelly / sizing constraint | CLAUDE.md invariant #2 (Kelly/4) | policy.sizing.yaml | **NOT CROSS-REFERENCED (P2-6)** |
| 14 | Regime state names | regime-context uses TRENDING/RANGING/TRANSITION/SHOCK/CRISIS | PCTT regime uses TRENDING/MEAN_REVERTING/CHOPPY/TRANSITION | Mapped in one direction only; reverse mapping unclear |
| 15 | Time-stop bars (PCTT) | pctt-parameters.yaml: — | pctt-market-adaptations.yaml: equities 15, forex 25 | OK |
| 16 | Book attribution in canonical | workflow.entry-setups.yaml cites "Ch.31", book author | Canonical should not | **INAPPROPRIATE (P0-7)** |

---

## 5. Consumer Safety Assessment

### 5a. Backend-only (pure machine, no LLM) consumer

**Safety level: UNSAFE as-is. Safe with a short fix pass.**

A pure-code consumer binding only to `canonical/policy/*.yaml` can safely ignore 80% of the package noise. But it will hit:

- **P0-1** numeric drift: if the code binds to `policy.risk.yaml` for heat and `policy.runtime.yaml` for daily halt, behavior is consistent-looking locally but disagrees with anything the LLM layer is doing.
- **P0-4** no schema: a YAML edit typo will silently propagate. For a machine consumer this is the worst class of bug.
- **P0-3** migration-map breakage: if the consumer is currently on a pre-2.1 tree and tries to migrate using MIGRATION-MAP.md, it will fail on three paths.
- **P1-3** semantic aliasing between `policy.system.yaml` and `policy.runtime.yaml`: code reading one but edits landing in the other will silently desynchronize.

With P0-1, P0-3, P0-4, and P1-2 closed, a backend-only consumer is in a defensible place. With the rest deferred, backend-only consumption is the *safest* of the three modes — which is saying something because it is still not production-ready.

### 5b. Agent-only (pure LLM, reading prose + YAMLs) consumer

**Safety level: UNSAFE. This is the highest-risk consumption mode.**

An LLM consumer is disproportionately exposed to:

- **P0-5** embedded numeric literals in agent contexts: an LLM will internalize the prose number and not re-consult the subordinate YAML on every decision.
- **P0-2** CLAUDE.md misdirection: the LLM will spend cycles reasoning about `config/master-config.yaml` and `rules/the-30-laws.yaml` — files that do not exist — and may fabricate.
- **P0-6** discretionary language ("hope trade," "Commit.," "Write answers down") — this is the kind of language that leaks into agent behavior. An agent should not have reasoning modes borrowed from a human trader's morning journal.
- **P0-7** canonical workflows carrying win-rate claims ("0.58 on trend days") without sample size will be cited by the LLM as ground truth.
- **P2-3** mixture of role spec + book summary + PCTT appendix in each context file bloats the prompt, invites cherry-picking, and makes it hard for the LLM to know which section is authoritative.
- The binding-precedence model works only if the LLM actually obeys it. Nothing in the prose tells the LLM what to do when `contexts/knowledge/context.guide.crisis-playbook.md` says "heat = 3%" and `canonical/policy/policy.runtime.yaml` says "heat = 1%" except a one-line meta instruction at the top of each context file. Under adversarial conditions (noisy context, long tool chains), that instruction is not robust.

Agent-only consumption should be **blocked by policy** until P0-5, P0-6, P0-7 are closed and a rendering pipeline strips numeric literals from contexts.

### 5c. Mixed (human-supervised agent) consumer

**Safety level: Marginally safe for supervised / paper-trading; not for autonomous capital.**

With a human reviewer between signal and execution, most P0 defects become tolerable — the human catches drifts. But:

- The human also has to read `CLAUDE.md` and will find it misleading.
- Crisis mode is the condition under which humans are least reliable, and crisis policy is where the numeric disagreements are worst.
- Emotional Gravity (Law 27) framing in agent contexts is least harmful in this mode (the human absorbs the role) but it also confuses the division of labor: the Journal Agent doesn't have emotions, the human does, and there is no explicit policy on how human tilt should feed back into machine state.

Recommended: run supervised/paper only, with heat limits clamped locally to the *strictest* of any value seen in the package (1% crisis, 1.5% daily halt, 4% elevated heat), until the canonical layer is reconciled.

---

## 6. Reusability Assessment

Claim under test: `enterprise_reusable` (per `PACKAGE-STATUS.md`).

**Verdict: Not met today. Achievable with the P0/P1 fixes.**

What prevents reusability now:

1. **Embedded strategy specificity in canonical.** Two of seven canonical workflows (entry-setups, exit-rules) are US-equities-day-trader-specific, with 508/456 lines of strategy prose (P0-7). An FX-only consumer or an options-only consumer must mentally strip these or risk binding to them. Canonical should carry only reusable admission/exit contracts; strategy-specific material belongs in `reference/` or `implementations/`.
2. **PCTT entanglement.** A third of the package is PCTT-specific. A consumer building a non-PCTT system must still reason about why `context.agent.regime.md` carries 40 lines of PCTT regime detection and why `CLAUDE.md` calls PCTT "the primary strategy engine." The canonical layer should be strategy-agnostic.
3. **Book-world artifacts.** Chapter citations, author attribution, and discretionary prose in canonical files (P0-7, P0-6) betray that the package was extracted from a book and has not been fully de-narrativized. Reusable packages cannot carry book provenance in their control surface.
4. **No version pinning / no content hashes.** Consumers have no way to pin to a known-good state. `PACKAGE-MANIFEST.yaml` exists but does not record content hashes per file.
5. **No machine schemas.** Without schemas, reusability is theoretical: every consumer's interpretation of the canonical YAML may differ (P0-4).
6. **Directory layout still carries migration smell.** Double paths in MIGRATION-MAP suggest a recent incomplete move; the `CLAUDE.md` / actual-tree mismatch points the same way. Reusable packages should feel settled.
7. **No per-instrument-class reusability tax.** The canonical layer treats US equities as default and bolts on playbooks for other classes. True reusability requires a symmetric instrument-class model at the top of the canonical layer.

What reusability *is* there: the mode model (manual / supervised / autonomous), the binding-precedence concept (if hardened), the law catalog (if de-narrativized), `policy.runtime.yaml` as a single runtime limits surface, and the agent decomposition (if the contexts are normalized).

---

## 7. Recommended Next Fixes (in implementation order)

This is the shortest defensible path to a production baseline. 2–4 engineer-weeks if prioritized.

1. **Single source of truth for every numeric risk limit.** Pick `policy.runtime.yaml` as the canonical home. Strip every percent literal from `contexts/**` and `canonical/workflows/workflow.entry-setups.yaml`, `workflow.exit-rules.yaml`. Replace with references. Reconcile the three crisis-heat / daily-loss / drawdown-halt values to one number each. (Closes P0-1, P0-5; large chunks of P1-2, P1-3.)
2. **JSON Schema for every canonical YAML + a CI validator.** Ship `canonical/schemas/` with required fields, value ranges, enums, and cross-file invariants. Gate package publish on schema pass. Write a reference validator in both Python and TypeScript under `tooling/validate/`. (Closes P0-4; unlocks CI enforcement of everything else.)
3. **Fix `MIGRATION-MAP.md` and add a "every listed path must exist" CI check.** Fix the three double-path entries; add a walker test. (Closes P0-3.)
4. **Replace or delete `CLAUDE.md`.** Either delete it or rewrite every path reference to match the real tree, then add the same path-existence CI check. If kept, scope it explicitly to "PCTT engine development instructions, not canonical layout." (Closes P0-2, P2-6.)
5. **Strip `README.md` of Windows-local URLs and add a link-checker.** (Closes P0-8.)
6. **Downgrade `workflow.entry-setups.yaml` and `workflow.exit-rules.yaml` from canonical.** Move to `reference/playbooks/pctt-day-trading/` or `implementations/pctt/playbooks/`. Replace canonical versions with minimal, instrument-agnostic entry/exit admission contracts. Strip all book citations from canonical. (Closes P0-7.)
7. **De-narrativize the Journal Agent's Law 27 section and remove discretionary prose from all canonical workflows.** Rewrite "revenge trading," "tilt," "hope trade" in purely operational terms with explicit machine triggers. (Closes P0-6.)
8. **Add a conflict-resolution algorithm to `CONSUMER-CONTRACT.md`.** Explicit within-tier tie-breaker, explicit override semantics, explicit version-pinning. (Closes P1-1.)
9. **Add `policy.execution-errors.yaml`** covering FIX rejects, TIF, duplicate fills, roll windows, crypto maintenance, broker-session circuit breaker, clock skew thresholds. (Closes P1-6 and several coverage gaps.)
10. **Add `policy.promotion.yaml`** with shadow → canary → restricted → normal stages, per-stage sizing caps, kill-switches, and baseline-regression gates. (Closes P1-7.)

---

## 8. Final Recommendation

**Proceed only after a short, focused fix pass.**

Specifically: do **not** proceed as-is with autonomous capital and do **not** label this v2.1.0 `enterprise_reusable`. The package is close to a defensible baseline but is not there today. The combination of P0-1 (numeric drift on hard limits), P0-2 (misleading root-level CLAUDE.md), P0-4 (no schemas), and P0-5/P0-6/P0-7 (agent-context and canonical-workflow prose drift) means that any autonomous consumer is fundamentally at risk, and any LLM consumer is at elevated risk.

Recommended sequence:

1. **Immediately:** Change `PACKAGE-STATUS.md` to `pre_production` or `v2.1.0_rc1`; stop any downstream binding to it at the `enterprise_reusable` tier.
2. **Within one engineering cycle (1–2 weeks):** Execute P0 fixes 1–5 in section 7 above. This is the minimum to be "Conditionally ready."
3. **Within the following cycle (2–4 weeks):** Execute P0 fix 6–7 and P1 fixes 8–10. This is "Strong baseline."
4. **Only after both cycles:** Re-label the package, permit autonomous consumers to bind, and allow external partners to integrate.

After the fix pass, re-review with the same adversarial frame: schema drift, prose drift, and duplication will try to grow back. The governance section should install the forcing functions (schema CI, path CI, percent-literal lint, hash-pinning, content-derived coverage matrix) that make drift cost more than fixing it.

The core architecture here is defensible and, once normalized, is a strong candidate for a reusable autonomous-trading policy package. It is not a production control plane today.

---

*Review author: External principal reviewer. Adversarial posture by request. All findings are file-specific and reproducible against the package as delivered.*
