/** @jest-environment node */

/**
 * Behavioural tests for the admin health probes. Only the vendor SDK boundary
 * is mocked; the probe logic (env-gating, timeout, worst-status aggregation)
 * runs for real. The load-bearing honesty assertion is repeated per service:
 * an unconfigured dependency is `unknown` and its client is NEVER touched, so
 * it can never masquerade as `healthy`.
 */

const mockSupabaseSelect = jest.fn();
const mockSupabaseFrom = jest.fn();
jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: mockSupabaseFrom },
}));

const mockInstitutionsGet = jest.fn();
const mockGetPlaidClient = jest.fn();
jest.mock("@/lib/financial/plaid-client", () => ({
  getPlaidClient: mockGetPlaidClient,
}));
jest.mock("plaid", () => ({ CountryCode: { Us: "US" } }));

const mockStripeBalanceRetrieve = jest.fn();
const mockStripeCtor = jest.fn();
jest.mock("stripe", () => ({ __esModule: true, default: mockStripeCtor }));

const mockModelsList = jest.fn();
const mockOpenAICtor = jest.fn();
jest.mock("openai/shims/node", () => ({}));
jest.mock("openai", () => ({ __esModule: true, default: mockOpenAICtor }));

const mockS3Send = jest.fn();
const mockS3ClientCtor = jest.fn();
const mockHeadBucketCommand = jest.fn();
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: mockS3ClientCtor,
  HeadBucketCommand: mockHeadBucketCommand,
}));

const mockResendApiKeysList = jest.fn();
const mockResendCtor = jest.fn();
jest.mock("resend", () => ({ Resend: mockResendCtor }));

import {
  probeSupabase,
  probeStripe,
  probeAIML,
  probePlaid,
  probeS3,
  probeResend,
  probeAllServices,
} from "@/lib/monitoring/service-probes";

const ORIGINAL_ENV = process.env;

function configureAllEnv(): void {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "svc-key";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  process.env.AIML_API_KEY = "aiml-key";
  process.env.PLAID_CLIENT_ID = "plaid-id";
  process.env.PLAID_SECRET = "plaid-secret";
  process.env.AWS_ACCESS_KEY_ID = "aws-id";
  process.env.AWS_SECRET_ACCESS_KEY = "aws-secret";
  process.env.AWS_S3_BUCKET = "fynvita-docs";
  process.env.RESEND_API_KEY = "re_test_x";
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  configureAllEnv();

  // resetMocks:true wipes implementations before each test — re-establish them.
  mockSupabaseFrom.mockReturnValue({ select: mockSupabaseSelect });
  mockGetPlaidClient.mockReturnValue({ institutionsGet: mockInstitutionsGet });
  mockStripeCtor.mockImplementation(() => ({
    balance: { retrieve: mockStripeBalanceRetrieve },
  }));
  mockOpenAICtor.mockImplementation(() => ({
    models: { list: mockModelsList },
  }));
  mockS3ClientCtor.mockImplementation(() => ({ send: mockS3Send }));
  mockHeadBucketCommand.mockImplementation((input) => ({ input }));
  mockResendCtor.mockImplementation(() => ({
    apiKeys: { list: mockResendApiKeysList },
  }));

  // Default happy-path leaf resolutions; individual tests override.
  mockSupabaseSelect.mockResolvedValue({ error: null, count: 0 });
  mockStripeBalanceRetrieve.mockResolvedValue({ object: "balance" });
  mockModelsList.mockResolvedValue({ data: [] });
  mockInstitutionsGet.mockResolvedValue({ data: { institutions: [] } });
  mockS3Send.mockResolvedValue({});
  mockResendApiKeysList.mockResolvedValue({ data: [], error: null });
});

afterEach(() => {
  jest.useRealTimers();
  process.env = ORIGINAL_ENV;
});

describe("probeSupabase", () => {
  it("is unknown and never queries when unconfigured", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const result = await probeSupabase();
    expect(result).toEqual({
      service: "Supabase",
      status: "unknown",
      detail: "not configured",
    });
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("is healthy when the head query returns no error", async () => {
    const result = await probeSupabase();
    expect(result.status).toBe("healthy");
    expect(mockSupabaseFrom).toHaveBeenCalledWith("profiles");
  });

  it("is down when the query returns a Postgres error", async () => {
    mockSupabaseSelect.mockResolvedValue({ error: { message: "no relation" } });
    const result = await probeSupabase();
    expect(result).toEqual({
      service: "Supabase",
      status: "down",
      detail: "no relation",
    });
  });

  it("is down when the query rejects", async () => {
    mockSupabaseSelect.mockRejectedValue(new Error("conn refused"));
    const result = await probeSupabase();
    expect(result.status).toBe("down");
    expect(result.detail).toBe("conn refused");
  });
});

describe("probeStripe", () => {
  it("is unknown and never constructs a client when unconfigured", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const result = await probeStripe();
    expect(result.status).toBe("unknown");
    expect(mockStripeCtor).not.toHaveBeenCalled();
  });

  it("is healthy when balance.retrieve succeeds", async () => {
    const result = await probeStripe();
    expect(result.status).toBe("healthy");
    expect(mockStripeBalanceRetrieve).toHaveBeenCalledTimes(1);
  });

  it("is down when balance.retrieve rejects", async () => {
    mockStripeBalanceRetrieve.mockRejectedValue(new Error("Invalid API Key"));
    const result = await probeStripe();
    expect(result).toEqual({
      service: "Stripe",
      status: "down",
      detail: "Invalid API Key",
    });
  });
});

describe("probeAIML", () => {
  it("is unknown when AIML_API_KEY is empty", async () => {
    process.env.AIML_API_KEY = "   ";
    const result = await probeAIML();
    expect(result.status).toBe("unknown");
    expect(mockOpenAICtor).not.toHaveBeenCalled();
  });

  it("is healthy when models.list succeeds", async () => {
    const result = await probeAIML();
    expect(result.status).toBe("healthy");
    expect(mockModelsList).toHaveBeenCalledTimes(1);
  });

  it("is down when models.list rejects", async () => {
    mockModelsList.mockRejectedValue(new Error("401 Unauthorized"));
    const result = await probeAIML();
    expect(result.status).toBe("down");
    expect(result.detail).toBe("401 Unauthorized");
  });
});

describe("probePlaid", () => {
  it("is unknown when credentials are missing", async () => {
    delete process.env.PLAID_SECRET;
    const result = await probePlaid();
    expect(result.status).toBe("unknown");
    expect(mockGetPlaidClient).not.toHaveBeenCalled();
  });

  it("is healthy when institutionsGet succeeds", async () => {
    const result = await probePlaid();
    expect(result.status).toBe("healthy");
    expect(mockInstitutionsGet).toHaveBeenCalledWith({
      count: 1,
      offset: 0,
      country_codes: ["US"],
    });
  });

  it("is down when institutionsGet rejects", async () => {
    mockInstitutionsGet.mockRejectedValue(new Error("INVALID_API_KEYS"));
    const result = await probePlaid();
    expect(result.status).toBe("down");
    expect(result.detail).toBe("INVALID_API_KEYS");
  });
});

describe("probeS3", () => {
  it("is unknown when the bucket is not configured", async () => {
    delete process.env.AWS_S3_BUCKET;
    const result = await probeS3();
    expect(result.status).toBe("unknown");
    expect(mockS3ClientCtor).not.toHaveBeenCalled();
  });

  it("is healthy when HeadBucket succeeds", async () => {
    const result = await probeS3();
    expect(result.status).toBe("healthy");
    expect(mockHeadBucketCommand).toHaveBeenCalledWith({
      Bucket: "fynvita-docs",
    });
    expect(mockS3Send).toHaveBeenCalledTimes(1);
  });

  it("is down when HeadBucket rejects", async () => {
    mockS3Send.mockRejectedValue(new Error("NoSuchBucket"));
    const result = await probeS3();
    expect(result.status).toBe("down");
    expect(result.detail).toBe("NoSuchBucket");
  });
});

describe("probeResend", () => {
  it("is unknown when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const result = await probeResend();
    expect(result.status).toBe("unknown");
    expect(mockResendCtor).not.toHaveBeenCalled();
  });

  it("is healthy when apiKeys.list returns no error", async () => {
    const result = await probeResend();
    expect(result.status).toBe("healthy");
    expect(mockResendApiKeysList).toHaveBeenCalledTimes(1);
  });

  it("is down when apiKeys.list returns an error object", async () => {
    mockResendApiKeysList.mockResolvedValue({
      data: null,
      error: { message: "restricted key" },
    });
    const result = await probeResend();
    expect(result).toEqual({
      service: "Resend",
      status: "down",
      detail: "restricted key",
    });
  });

  it("is down when apiKeys.list rejects", async () => {
    mockResendApiKeysList.mockRejectedValue(new Error("network error"));
    const result = await probeResend();
    expect(result.status).toBe("down");
    expect(result.detail).toBe("network error");
  });
});

describe("probeAllServices — aggregation", () => {
  it("returns all six services and healthy overall when every probe passes", async () => {
    const report = await probeAllServices();
    expect(report.services).toHaveLength(6);
    expect(report.services.map((s) => s.service)).toEqual([
      "Supabase",
      "Stripe",
      "AIML",
      "Plaid",
      "S3",
      "Resend",
    ]);
    expect(report.status).toBe("healthy");
    expect(new Date(report.checkedAt).toISOString()).toBe(report.checkedAt);
  });

  it("is down overall when any single service is down", async () => {
    mockStripeBalanceRetrieve.mockRejectedValue(new Error("boom"));
    const report = await probeAllServices();
    expect(report.status).toBe("down");
  });

  it("is degraded overall when a service is unconfigured but none are down", async () => {
    delete process.env.AIML_API_KEY;
    const report = await probeAllServices();
    expect(report.status).toBe("degraded");
    expect(report.services.find((s) => s.service === "AIML")?.status).toBe(
      "unknown",
    );
  });

  it("prefers down over degraded when both are present", async () => {
    delete process.env.AIML_API_KEY; // → degraded contributor
    mockS3Send.mockRejectedValue(new Error("down")); // → down contributor
    const report = await probeAllServices();
    expect(report.status).toBe("down");
  });
});

describe("probe timeout", () => {
  it("reports down when a liveness call exceeds the timeout budget", async () => {
    jest.useFakeTimers();
    mockStripeBalanceRetrieve.mockReturnValue(new Promise(() => {})); // hangs
    const pending = probeStripe();
    await jest.advanceTimersByTimeAsync(3001);
    const result = await pending;
    expect(result.status).toBe("down");
    expect(result.detail).toMatch(/timed out/);
  });
});
