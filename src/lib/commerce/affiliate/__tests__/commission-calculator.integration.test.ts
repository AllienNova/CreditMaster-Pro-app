/**
 * @jest-environment node
 *
 * Commission Calculator — Real-DB Integration Test
 *
 * Real Node networking (fetch to local Postgres/PostgREST) is unreliable
 * under jest.config.js's default jsdom environment — jsdom's Request/Response
 * polyfills conflict with node-fetch for genuine external round-trips. This
 * file overrides to the plain "node" test environment so undici's native
 * fetch handles the request instead.
 *
 * Unlike commission-calculator.test.ts (fully mocked), this file exercises
 * the REAL local Supabase instance. It exists specifically to prove the live
 * money bug: affiliate_partners/commission_rules had no migration, so every
 * lookup 404'd and calculateCommission() silently returned $0 instead of
 * failing. A mock can never reproduce "the table doesn't exist" — only a
 * real round-trip against Postgres can, which is why this test is required
 * in addition to the mocked suite.
 *
 * No-ops gracefully (does not fail the suite) when a local Supabase instance
 * is not reachable, matching the environment-dependent-test convention
 * already established by src/__tests__/integration/service-integration.test.ts
 * and CLAUDE.md's "19 skipped tests are environment-dependent, not flaky".
 * The reachability probe is a plain `net.connect` TCP check (no
 * child_process/shell-out) against the same port the team's own psql
 * commands use.
 *
 * Requires locally: `supabase start`, with migration
 * 20260731000005_affiliate_partners_commission_rules.sql applied
 * (`supabase db reset` / `supabase migration up`).
 *
 * MSW opt-out: the global MSW server (src/__tests__/mocks/server.ts) is
 * installed for every test file via setupTests.ts and intercepts all fetch
 * calls; its "warn and passthrough" path throws for genuine external
 * requests in this environment. close()/listen() around this suite is the
 * same opt-out already used by moneylion-client.test.ts for the same reason.
 *
 * global.fetch reassignment: setupTests.ts sets `global.fetch =
 * jest.fn(fetch as any)`. Even with the MSW server closed, calling through
 * that wrapper here resolves to `undefined` instead of a real Response
 * (postgrest-js's PostgrestBuilder.ts:131 then throws reading `res.status`
 * off undefined). Per the project's established msw-fetch-mock-pattern
 * memory ("don't cast the existing global.fetch; fully reassign it"), this
 * file reassigns global.fetch to a fresh node-fetch import before importing
 * supabase-js, so both this file's own client and commission-calculator.ts's
 * lazily-constructed client capture a clean implementation.
 */

import { connect } from "net";
import nodeFetch from "node-fetch";
import { server } from "@/__tests__/mocks/server";

// Local Supabase CLI demo credentials (`supabase status`) — fixed and
// identical for every local Supabase CLI instance everywhere; not a secret.
// Set BEFORE importing the module under test so its module-scope
// `const supabaseUrl/supabaseServiceKey` capture these, not jest.config.js's
// fake `test-service-role-key-for-jest` default (which real PostgREST would
// reject as an invalid JWT before ever reaching the table lookup).
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

// Must happen before createClient()/commissionCalculator's lazy client ever
// resolve `fetch` — see header comment.
global.fetch = nodeFetch as unknown as typeof fetch;

// eslint-disable-next-line import/first -- env vars/fetch above must be set before this import runs
import { createClient } from "@supabase/supabase-js";
// eslint-disable-next-line import/first
import { commissionCalculator } from "../commission-calculator";

/** Plain TCP reachability probe — no shell-out, no child_process. */
function isLocalSupabaseReachable(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: "127.0.0.1", port: 54322, timeout: 1500 });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

describe("CommissionCalculatorService (real local Supabase)", () => {
  // Independent client (not the module-under-test's own instance) used only
  // to seed/clean up fixture rows directly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped admin client, matches commission-calculator.ts's own untyped createClient()
  const db: any = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Uniquely-namespaced fixture so concurrent agents sharing this
  // worktree/local DB never collide with this test's rows.
  const fixtureName = `test-commission-calc-integration-${Date.now()}`;
  let seededPartnerId: string | undefined;
  let dbAvailable = false;

  beforeAll(() => server.close());
  afterAll(() => server.listen({ onUnhandledRequest: "warn" }));

  beforeAll(async () => {
    dbAvailable = await isLocalSupabaseReachable();
    if (!dbAvailable) {
      // eslint-disable-next-line no-console -- deliberate skip notice, not app logging
      console.warn(
        "[commission-calculator.integration.test] local Supabase not reachable at 127.0.0.1:54322 — skipping real-DB proof.",
      );
    }
  });

  afterEach(async () => {
    if (seededPartnerId) {
      await db.from("commission_rules").delete().eq("partner_id", seededPartnerId);
      await db.from("affiliate_partners").delete().eq("id", seededPartnerId);
      seededPartnerId = undefined;
    }
  });

  it("computes a correct non-zero commission for a real seeded partner+rule (proves the table-missing bug is fixed)", async () => {
    if (!dbAvailable) return;

    const { data: partner, error: partnerError } = await db
      .from("affiliate_partners")
      .insert({
        name: fixtureName,
        slug: fixtureName,
        type: "credit_card",
        commission_type: "cpa",
        commission_fixed: 42,
      })
      .select()
      .single();

    // Pre-migration this fails here: "Could not find the table
    // 'public.affiliate_partners' in the schema cache".
    expect(partnerError).toBeNull();
    expect(partner).toBeDefined();
    seededPartnerId = partner.id;

    const result = await commissionCalculator.calculateCommission(
      seededPartnerId!,
      "signup",
      100,
    );

    // Pre-fix (even once the table exists), calculateCommission returned 0
    // for any lookup error; only a correct fix returns the real CPA amount.
    expect(result).toBe(42);
  });

  it("computes a commission using a custom commission_rules override (revenue_share, not the partner's cpa default)", async () => {
    if (!dbAvailable) return;

    const { data: partner, error: partnerError } = await db
      .from("affiliate_partners")
      .insert({
        name: fixtureName,
        slug: `${fixtureName}-rule`,
        type: "credit_card",
        commission_type: "cpa",
        commission_fixed: 10,
      })
      .select()
      .single();

    expect(partnerError).toBeNull();
    seededPartnerId = partner.id;

    const { error: ruleError } = await db.from("commission_rules").insert({
      partner_id: seededPartnerId,
      conversion_type: "purchase",
      commission_type: "revenue_share",
      commission_rate: 15,
    });

    expect(ruleError).toBeNull();

    const result = await commissionCalculator.calculateCommission(
      seededPartnerId!,
      "purchase",
      200,
    );

    // Custom rule overrides the partner default: 200 * 15% = 30, not the
    // partner's flat $10 CPA.
    expect(result).toBe(30);
  });

  it("throws instead of silently returning $0 for a partner id that truly does not exist", async () => {
    if (!dbAvailable) return;

    await expect(
      commissionCalculator.calculateCommission(
        "00000000-0000-0000-0000-000000000000",
        "signup",
        100,
      ),
    ).rejects.toThrow(/partner/i);
  });
});
