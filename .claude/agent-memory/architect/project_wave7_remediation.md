---
name: Wave 7 Remediation Roadmap
description: Wave 7 remediation plan structure for the 33 CRITICAL findings — phases, task ID prefixes, gate criteria
type: project
---

Wave 7 (Remediation) was scoped on 2026-05-01 to address 33 CRITICAL findings clustered into 4 themes (auth/RBAC, webhook idempotency + tier mapping, money correctness, mock-data-as-production) plus compliance, mobile, and IDOR sweeps.

**Why:** Prior 125/125 DONE claim in MASTER-IMPLEMENTATION-PLAN.md was invalidated by live security review proving CRITICAL bypasses across 9 domains. CLAUDE.md and SSOT must be updated before further feature work.

**How to apply:** When asked about Wave 7 status, reference the 8 phases (PRE, AUTH, WBH, MNY, MOK, CMP, MOB, IDR) and ~60 tasks. Phase 0 (PRE-01..05) is the prereq gate — re-baseline + branch freeze + flags + lint guards must land first. Reference fix template is commit d64e8d5 (atomic Postgres RPC + UNIQUE constraint + REVOKE/GRANT). Phase exit gates are documented per phase. Total estimate: 4 weeks, parallelizable across SEC/BE/MOB/DEVOPS streams.

Verify before recommending any specific task ID exists — these were proposed, not yet committed to MASTER-IMPLEMENTATION-PLAN.md.
