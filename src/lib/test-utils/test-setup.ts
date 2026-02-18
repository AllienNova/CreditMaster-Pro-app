/**
 * Test Setup Utilities
 *
 * Provides utilities for setting up real API tests with actual database connections
 */

import { createClient } from "@supabase/supabase-js";
import type { JsonRecord } from "@/types/student-loan";
import type {
  Bureau as CreditBureau,
  DisputeStatus as CreditDisputeStatus,
} from "@/lib/credit-repair/db/types";

// Test database configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// For demo purposes, we'll skip real Supabase if credentials are missing
const USE_REAL_SUPABASE = SUPABASE_URL && SUPABASE_SERVICE_KEY;

// Create Supabase client with service role key (bypasses RLS)
// Only create if credentials are available
export const supabaseAdmin = USE_REAL_SUPABASE
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

type SerializableBody = JsonRecord | JsonRecord[] | string | undefined;

interface AuthenticatedRequestOptions {
  method?: string;
  body?: SerializableBody;
  token: string;
}

interface DisputeInsertPayload extends JsonRecord {
  user_id: string;
  bureau: CreditBureau;
  item_type: string;
  item_description: string;
  reason: string;
  status: CreditDisputeStatus;
}

interface CreditCardInsertPayload extends JsonRecord {
  user_id: string;
  name: string;
  credit_limit: number;
  current_balance: number;
  utilization: number;
}

interface GoodwillLetterInsertPayload extends JsonRecord {
  user_id: string;
  creditor_name: string;
  account_number: string;
  issue_description: string;
  status: string;
}

interface NegotiationInsertPayload extends JsonRecord {
  user_id: string;
  creditor_name: string;
  account_number: string;
  original_amount: number;
  target_amount: number;
  status: string;
}

interface CreditReportInsertPayload extends JsonRecord {
  user_id: string;
  bureau: string;
  report_date: string;
  file_url: string;
}

/**
 * Test user credentials
 */
export const TEST_USER = {
  email: "test@fynvita.com",
  password: "TestPassword123!",
  name: "Test User",
};

/**
 * Create a test user and return JWT token
 */
export async function createTestUser(): Promise<{
  userId: string;
  token: string;
}> {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not initialized");
  }

  // Check if user already exists
  const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
  const testUser = existingUser?.users.find((u) => u.email === TEST_USER.email);

  let userId: string;

  if (testUser) {
    userId = testUser.id;
  } else {
    // Create new test user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true,
      user_metadata: {
        name: TEST_USER.name,
      },
    });

    if (error || !data.user) {
      throw new Error(`Failed to create test user: ${error?.message}`);
    }

    userId = data.user.id;
  }

  // Sign in to get JWT token
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not initialized");
  }

  const { data: signInData, error: signInError } =
    await supabaseAdmin.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

  if (signInError || !signInData.session) {
    throw new Error(`Failed to sign in test user: ${signInError?.message}`);
  }

  return {
    userId,
    token: signInData.session.access_token,
  };
}

/**
 * Clean up all test data for a user
 */
export async function cleanupTestData(userId: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not initialized");
  }

  // Delete in reverse order of dependencies
  await supabaseAdmin
    .from("credit_card_utilization_history")
    .delete()
    .eq("user_id", userId);
  await supabaseAdmin.from("credit_cards").delete().eq("user_id", userId);
  await supabaseAdmin.from("goodwill_letters").delete().eq("user_id", userId);
  await supabaseAdmin.from("negotiations").delete().eq("user_id", userId);
  await supabaseAdmin.from("credit_reports").delete().eq("user_id", userId);
  await supabaseAdmin.from("disputes").delete().eq("user_id", userId);
  await supabaseAdmin.from("credit_scores").delete().eq("user_id", userId);
}

/**
 * Delete test user
 */
export async function deleteTestUser(userId: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not initialized");
  }

  await cleanupTestData(userId);
  await supabaseAdmin.auth.admin.deleteUser(userId);
}

/**
 * Make authenticated API request
 */
export async function makeAuthenticatedRequest(
  path: string,
  options: AuthenticatedRequestOptions,
): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${baseUrl}${path}`;
  const serializedBody =
    typeof options.body === "string"
      ? options.body
      : options.body
        ? JSON.stringify(options.body)
        : undefined;

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.token}`,
    },
    body: serializedBody,
  });

  return response;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
  } = {},
): Promise<void> {
  const timeout = options.timeout || 5000;
  const interval = options.interval || 100;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error("Timeout waiting for condition");
}

/**
 * Measure execution time
 */
export async function measureTime<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * Create test dispute
 */
export async function createTestDispute(
  userId: string,
  overrides: Partial<DisputeInsertPayload> = {},
): Promise<JsonRecord> {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not initialized");
  }

  const payload: DisputeInsertPayload = {
    user_id: userId,
    bureau: "experian",
    item_type: "late_payment",
    item_description: "Test late payment",
    reason: "not_mine",
    status: "draft",
  };

  const { data, error } = await supabaseAdmin
    .from("disputes")
    .insert({
      ...payload,
      ...overrides,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test dispute: ${error.message}`);
  }

  return data;
}

/**
 * Create test credit card
 */
export async function createTestCreditCard(
  userId: string,
  overrides: Partial<CreditCardInsertPayload> = {},
): Promise<JsonRecord> {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not initialized");
  }

  const payload: CreditCardInsertPayload = {
    user_id: userId,
    name: "Test Card",
    credit_limit: 5000,
    current_balance: 1000,
    utilization: 20,
  };

  const { data, error } = await supabaseAdmin
    .from("credit_cards")
    .insert({
      ...payload,
      ...overrides,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test credit card: ${error.message}`);
  }

  return data;
}

/**
 * Create test goodwill letter
 */
export async function createTestGoodwillLetter(
  userId: string,
  overrides: Partial<GoodwillLetterInsertPayload> = {},
): Promise<JsonRecord> {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not initialized");
  }

  const payload: GoodwillLetterInsertPayload = {
    user_id: userId,
    creditor_name: "Test Creditor",
    account_number: "1234567890",
    issue_description: "Test issue",
    status: "draft",
  };

  const { data, error } = await supabaseAdmin
    .from("goodwill_letters")
    .insert({
      ...payload,
      ...overrides,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test goodwill letter: ${error.message}`);
  }

  return data;
}

/**
 * Create test negotiation
 */
export async function createTestNegotiation(
  userId: string,
  overrides: Partial<NegotiationInsertPayload> = {},
): Promise<JsonRecord> {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not initialized");
  }

  const payload: NegotiationInsertPayload = {
    user_id: userId,
    creditor_name: "Test Creditor",
    account_number: "1234567890",
    original_amount: 5000,
    target_amount: 2500,
    status: "draft",
  };

  const { data, error } = await supabaseAdmin
    .from("negotiations")
    .insert({
      ...payload,
      ...overrides,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test negotiation: ${error.message}`);
  }

  return data;
}

/**
 * Create test credit report
 */
export async function createTestCreditReport(
  userId: string,
  overrides: Partial<CreditReportInsertPayload> = {},
): Promise<JsonRecord> {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not initialized");
  }

  const payload: CreditReportInsertPayload = {
    user_id: userId,
    bureau: "experian",
    report_date: new Date().toISOString(),
    file_url: "https://example.com/report.pdf",
  };

  const { data, error } = await supabaseAdmin
    .from("credit_reports")
    .insert({
      ...payload,
      ...overrides,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test credit report: ${error.message}`);
  }

  return data;
}

/**
 * Setup test environment
 */
export async function setupTestEnvironment() {
  const { userId, token } = await createTestUser();
  await cleanupTestData(userId);
  return { userId, token };
}

/**
 * Teardown test environment
 */
export async function teardownTestEnvironment(userId: string) {
  await cleanupTestData(userId);
}
