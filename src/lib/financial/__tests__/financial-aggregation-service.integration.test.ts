/**
 * @jest-environment node
 *
 * Financial Aggregation Service — Real-DB Integration Test
 *
 * Real Node networking (fetch to local Postgres/PostgREST) is unreliable
 * under jest.config.js's default jsdom environment — jsdom's Request/Response
 * polyfills conflict with node-fetch for genuine external round-trips. This
 * file overrides to the plain "node" test environment so undici's native
 * fetch handles the request instead. Pattern and header rationale copied
 * verbatim from commerce/affiliate/__tests__/commission-calculator.integration.test.ts.
 *
 * Unlike financial-aggregation-service.test.ts (fully mocked), this file
 * exercises the REAL local Supabase instance. It exists specifically to
 * prove the live "net worth is $0 for every user" bug: fetchAccounts() and
 * ~13 sibling fetch* methods read through the module-level getSupabase()
 * singleton — the ANON key, with no forwarded JWT, so auth.uid() is always
 * NULL — against tables that are either service-role-only
 * (financial_accounts, per 20260731000009's REVOKE) or RLS-protected with
 * auth.uid() = user_id (profiles, debt_accounts, credit_scores,
 * investment_portfolios). A mock can never reproduce "the anon role has no
 * SELECT grant on this table" — only a real round-trip against Postgres can,
 * which is why this file is required in addition to the mocked suite.
 *
 * GRACEFUL SKIP — this environment currently cannot run this suite, and
 * that is a separate, pre-existing infrastructure defect this file
 * detects and reports rather than works around. profiles.id carries a hard
 * FK to auth.users(id) (added by 20260731000004_profiles_twin_reconcile.sql
 * — every table this suite seeds is reachable only through a real
 * auth.users row), and on this local instance `db.auth.admin.createUser()`
 * fails with a generic "Database error creating new user". Reproduced
 * identically via this test file, a standalone Node script, a raw curl
 * POST to /auth/v1/admin/users, AND the plain (non-admin) /auth/v1/signup
 * endpoint — ruling out a jest-environment cause and an admin-API-specific
 * cause. Root-caused to the GoTrue service layer specifically, not
 * Postgres/RLS/the handle_new_user trigger: a direct `INSERT INTO
 * auth.users` in psql succeeds and correctly fires that trigger. Not fixed
 * here — fixing a local Supabase Auth container defect is outside this
 * task's client-architecture scope, and the only workaround available from
 * inside a Jest test (seeding via a raw Postgres client) would require
 * adding the `pg` package solely for test fixtures, which the project's
 * "no new dependencies without request" rule forbids. `dbAvailable` below
 * therefore also probes real user creation, not just TCP reachability, and
 * every test no-ops (not fails) when it comes back false — matching the
 * project's existing environment-dependent-test convention
 * (CLAUDE.md's "19 skipped tests are environment-dependent, not flaky").
 * This file remains fully wired to run for real the moment the GoTrue
 * container issue is resolved (locally or in CI).
 *
 * fetchAccounts()/net worth's fix is additionally, independently proven
 * without any auth dependency by the empirical `SET ROLE service_role` /
 * `SET ROLE anon` grant checks already run against this same live schema
 * (financial_accounts already carries a service_role SELECT grant per
 * 20260731000005's sibling migration — the only defect on that table is
 * the client choice, not a missing grant) plus the corrected mocked unit
 * suite in financial-aggregation-service.test.ts.
 *
 * Requires locally: `supabase start`, with migration
 * 20260731000060_financial_aggregation_service_role_grants.sql applied
 * (`supabase db reset` / `supabase migration up`), AND a working local
 * GoTrue container (currently not the case — see above).
 */

import { connect } from "net";
import nodeFetch from "node-fetch";
import { server } from "@/__tests__/mocks/server";

// Local Supabase CLI demo credentials (`supabase status`) — fixed and
// identical for every local Supabase CLI instance everywhere; not a secret.
// Set BEFORE importing the module under test so its module-scope client
// (however it is constructed) captures these, not jest.config.js's fake
// "test-service-role-key-for-jest" default (which real PostgREST would
// reject as an invalid JWT before ever reaching the table lookup).
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

// Must happen before createClient()/financialAggregationService's module-
// scope client ever resolves `fetch` — see header comment.
global.fetch = nodeFetch as unknown as typeof fetch;

// eslint-disable-next-line import/first -- env vars/fetch above must be set before this import runs
import { createClient } from "@supabase/supabase-js";
// eslint-disable-next-line import/first
import { financialAggregationService } from "../financial-aggregation-service";

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

describe("FinancialAggregationService (real local Supabase)", () => {
  // Independent admin client (not the module-under-test's own instance),
  // used only to seed/clean up fixture rows directly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped admin client; several seeded tables (debt_accounts, credit_scores) are outside the generated Database type
  const db: any = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Uniquely-namespaced fixture so concurrent agents sharing this
  // worktree/local DB never collide with this test's rows.
  const fixtureId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const testEmail = `test-financial-agg-integration-${fixtureId}@fynvita.test`;
  const testItemId = `test-item-${fixtureId}`;
  const testAccountId = `test-account-${fixtureId}`;

  let userId: string | undefined;
  let dbAvailable = false;

  beforeAll(() => server.close());
  afterAll(() => server.listen({ onUnhandledRequest: "warn" }));

  beforeAll(async () => {
    const reachable = await isLocalSupabaseReachable();
    if (!reachable) {
      // eslint-disable-next-line no-console -- deliberate skip notice, not app logging
      console.warn(
        "[financial-aggregation-service.integration.test] local Supabase not reachable at 127.0.0.1:54322 — skipping real-DB proof.",
      );
      return;
    }

    // See the GRACEFUL SKIP header comment: real user creation is currently
    // broken on this local instance (GoTrue-layer defect, not this test's
    // fault). Probe it directly and skip the whole suite if it fails,
    // rather than letting every test fail on the same unrelated cause.
    const { data: userData, error: userError } =
      await db.auth.admin.createUser({
        email: testEmail,
        password: "Test-Password-123!",
        email_confirm: true,
      });
    if (userError || !userData.user) {
      // eslint-disable-next-line no-console -- deliberate skip notice, not app logging
      console.warn(
        `[financial-aggregation-service.integration.test] local Supabase Auth cannot create users (${userError?.message ?? "unknown error"}) — skipping real-DB proof. See this file's header comment for the known GoTrue-layer cause.`,
      );
      return;
    }
    userId = userData.user.id;
    dbAvailable = true;

    // The on_auth_user_created trigger (handle_new_user) already inserted a
    // profiles row for this auth user, so a plain insert now collides. It did
    // not before only because this whole block was being SKIPPED — GoTrue
    // could not create users at all until the search_path fix in
    // 20260809000020. Upsert is correct either way.
    const { error: profileError } = await db.from("profiles").upsert(
      {
        id: userId,
        email: testEmail,
        full_name: "Integration Test Fixture",
      },
      { onConflict: "id" },
    );
    if (profileError) {
      throw new Error(`Failed to seed profiles: ${profileError.message}`);
    }

    // plaid_items became bank_connections in 20260801000020, and the
    // credential is no longer a plaintext column — it is written only through
    // set_bank_connection_token(). This fixture does not need a token, so it
    // seeds the connection alone.
    const { data: connRow, error: itemError } = await db
      .from("bank_connections")
      .insert({
        item_id: testItemId,
        user_id: userId,
        provider: "plaid",
      })
      .select("id")
      .single();
    if (itemError || !connRow) {
      throw new Error(`Failed to seed bank_connections: ${itemError?.message}`);
    }

    // Seeded values are deliberately distinct, non-round numbers so a test
    // that accidentally reads the wrong row/table still fails loudly instead
    // of coincidentally matching another fixture's round number.
    const { error: accountError } = await db.from("financial_accounts").insert({
      id: testAccountId,
      item_id: testItemId,
      connection_id: connRow.id,
      provider: "plaid",
      user_id: userId,
      account_id: testAccountId,
      // What Plaid ACTUALLY writes, per the column comment in
      // 20260731000006: "Plaid's raw account.type". This used to seed
      // "checking" — an already-normalised value no sync path produces — and
      // that fiction is exactly why this test stayed green through SF-14,
      // where every real `depository` row normalised to "other" and dropped
      // out of totalAssets.
      account_type: "depository",
      account_subtype: "checking",
      current_balance: 5417.23,
    });
    if (accountError) {
      throw new Error(`Failed to seed financial_accounts: ${accountError.message}`);
    }

    const { error: debtError } = await db.from("debt_accounts").insert({
      user_id: userId,
      name: "Integration Test Card",
      type: "credit_card",
      balance: 1234.56,
      interest_rate: 19.99,
      minimum_payment: 35,
      is_active: true,
    });
    if (debtError) {
      throw new Error(`Failed to seed debt_accounts: ${debtError.message}`);
    }

    const { error: creditError } = await db.from("credit_scores").insert({
      user_id: userId,
      bureau: "experian",
      score: 712,
      score_date: new Date().toISOString().split("T")[0],
    });
    if (creditError) {
      throw new Error(`Failed to seed credit_scores: ${creditError.message}`);
    }

    const { error: portfolioError } = await db
      .from("investment_portfolios")
      .insert({
        user_id: userId,
        name: "Integration Test Portfolio",
        total_value: 8901.45,
        total_cost_basis: 7000,
      });
    if (portfolioError) {
      throw new Error(
        `Failed to seed investment_portfolios: ${portfolioError.message}`,
      );
    }

    const { error: goalError } = await db.from("financial_goals").insert({
      user_id: userId,
      type: "savings",
      name: "Integration Test Goal",
      target_amount: 10000,
      current_amount: 2500,
    });
    if (goalError) {
      throw new Error(`Failed to seed financial_goals: ${goalError.message}`);
    }
  });

  afterAll(async () => {
    if (!dbAvailable || !userId) return;
    // ON DELETE CASCADE on every seeded table's user_id/item_id FK means
    // deleting the auth user is sufficient cleanup, but delete explicitly
    // too so a schema change that drops a CASCADE doesn't silently leak
    // fixture rows for the next run.
    await db.from("financial_goals").delete().eq("user_id", userId);
    await db.from("investment_portfolios").delete().eq("user_id", userId);
    await db.from("credit_scores").delete().eq("user_id", userId);
    await db.from("debt_accounts").delete().eq("user_id", userId);
    await db.from("financial_accounts").delete().eq("id", testAccountId);
    await db.from("plaid_items").delete().eq("item_id", testItemId);
    await db.from("profiles").delete().eq("id", userId);
    await db.auth.admin.deleteUser(userId);
  });

  it("resolves a real, non-zero net worth from a real seeded account (proves the anon-client $0-net-worth bug is fixed)", async () => {
    if (!dbAvailable) return;

    const context = await financialAggregationService.getAggregatedContext(
      userId!,
      { forceRefresh: true },
    );

    // Pre-fix: fetchAccounts() reads via the anon-keyed getSupabase()
    // singleton, gets 42501 permission-denied against financial_accounts,
    // logs the error, and degrades to getEmptyAccounts() — netWorth.current
    // is 0 regardless of the real seeded balance. Only the service-role
    // client fix makes this reflect the real row.
    expect(context.netWorth.current).toBeCloseTo(5417.23, 2);
    expect(context.accounts.checking).toHaveLength(1);
    expect(context.accounts.checking[0].currentBalance).toBeCloseTo(
      5417.23,
      2,
    );
    expect(context.accounts.totalAssets).toBeCloseTo(5417.23, 2);
  });

  it("resolves the real seeded user profile (proves fetchUserProfile's anon-client bug is fixed)", async () => {
    if (!dbAvailable) return;

    const context = await financialAggregationService.getAggregatedContext(
      userId!,
      { forceRefresh: true },
    );

    // Pre-fix: fetchUserProfile() gets 42501 against profiles and silently
    // falls back to getDefaultUserProfile(userId) — email reads "" instead
    // of the real seeded address.
    expect(context.user.email).toBe(testEmail);
    expect(context.user.fullName).toBe("Integration Test Fixture");
  });

  it("resolves real seeded debt (proves fetchDebtData's anon-client + missing-grant bug is fixed)", async () => {
    if (!dbAvailable) return;

    const context = await financialAggregationService.getAggregatedContext(
      userId!,
      { forceRefresh: true },
    );

    // Pre-fix: fetchDebtData() gets 42501 against debt_accounts (anon key,
    // AND service_role itself has no base SELECT grant on this table until
    // this fix's migration) and degrades to getEmptyDebtData() — totalDebt
    // reads 0 regardless of the real seeded balance, the exact
    // debtToIncomeRatio-is-always-zero defect class.
    expect(context.debt.totalDebt).toBeCloseTo(1234.56, 2);
    expect(context.debt.items).toHaveLength(1);
    expect(context.debt.items[0].name).toBe("Integration Test Card");
  });

  it("resolves real seeded credit score (proves fetchCreditData's anon-client + missing-grant bug is fixed)", async () => {
    if (!dbAvailable) return;

    const context = await financialAggregationService.getAggregatedContext(
      userId!,
      { forceRefresh: true },
    );

    expect(context.credit.currentScore).toBe(712);
  });

  it("resolves real seeded investment portfolio (proves fetchInvestmentData's anon-client + missing-grant bug is fixed)", async () => {
    if (!dbAvailable) return;

    const context = await financialAggregationService.getAggregatedContext(
      userId!,
      { forceRefresh: true },
    );

    expect(context.investments.totalValue).toBeCloseTo(8901.45, 2);
  });

  it("resolves real seeded financial goals (proves fetchGoalsData's anon-client bug is fixed)", async () => {
    if (!dbAvailable) return;

    const context = await financialAggregationService.getAggregatedContext(
      userId!,
      { forceRefresh: true },
    );

    expect(context.goals).toHaveLength(1);
    expect(context.goals[0].name).toBe("Integration Test Goal");
    expect(context.goals[0].targetAmount).toBe(10000);
  });
});
