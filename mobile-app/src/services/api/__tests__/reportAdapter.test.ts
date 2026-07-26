/**
 * mapWebCreditReport — web -> mobile credit-report detail adapter (M1-2 / FR-202).
 *
 * The real web route (GET /api/credit-repair/reports/[id], withAuth) returns a
 * credit report shaped by src/lib/credit-repair/db/credit-reports-db-service.ts:
 * `bureau`, `score`, a `reportDate` Date (an ISO string over HTTP), and four
 * structured JSONB arrays (`accounts`, `inquiries`, `collections`,
 * `publicRecords`) that the report POST does not yet populate — they are always
 * empty until the M2-4 slice. The mobile Report Detail screen renders the header
 * (bureau, score, date) and an honest count per structured section. These tests
 * pin the field map, prove a missing/invalid score becomes undefined (never a
 * fabricated 0), prove an unknown bureau is dropped rather than invented, prove
 * empty/absent arrays count as 0 (not fabricated rows), prove a populated array is
 * counted from its real length, and prove getReport fetches the right path and
 * never fabricates on failure or on an empty body.
 */

// Stub the module's side-effecting client import so creditRepair.ts loads in
// isolation, while still driving api.get for the getReport wrapper tests.
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import {
  mapWebCreditReport,
  creditRepairApi,
  type CreditReportDetail,
  type WebCreditReport,
} from "../creditRepair";

beforeEach(() => {
  jest.clearAllMocks();
});

const base: WebCreditReport = {
  id: "r1",
  bureau: "equifax",
  score: 688,
  reportDate: "2026-02-10T00:00:00.000Z",
  reportData: {},
  accounts: [],
  inquiries: [],
  collections: [],
  publicRecords: [],
};

describe("mapWebCreditReport — header field map", () => {
  it("maps id, bureau, score and reportDate, and counts empty sections as 0", () => {
    expect(mapWebCreditReport(base)).toEqual<CreditReportDetail>({
      id: "r1",
      bureau: "equifax",
      score: 688,
      reportDate: "2026-02-10T00:00:00.000Z",
      accountsCount: 0,
      negativeItemsCount: 0,
      inquiriesCount: 0,
      publicRecordsCount: 0,
    });
  });

  it("passes each known bureau through unchanged", () => {
    expect(mapWebCreditReport({ ...base, bureau: "experian" }).bureau).toBe(
      "experian",
    );
    expect(mapWebCreditReport({ ...base, bureau: "transunion" }).bureau).toBe(
      "transunion",
    );
  });

  it("drops an unknown or absent bureau to undefined rather than inventing one", () => {
    expect(
      mapWebCreditReport({ ...base, bureau: "innovis" }).bureau,
    ).toBeUndefined();
    expect(
      mapWebCreditReport({ ...base, bureau: undefined }).bureau,
    ).toBeUndefined();
  });

  it("preserves the reportDate ISO string; an absent date becomes an empty string", () => {
    expect(
      mapWebCreditReport({ ...base, reportDate: "2025-12-01T00:00:00.000Z" })
        .reportDate,
    ).toBe("2025-12-01T00:00:00.000Z");
    expect(
      mapWebCreditReport({ ...base, reportDate: undefined }).reportDate,
    ).toBe("");
  });
});

describe("mapWebCreditReport — score is never coerced to 0", () => {
  it("drops a missing score to undefined (not a fabricated 0)", () => {
    expect(
      mapWebCreditReport({ ...base, score: undefined }).score,
    ).toBeUndefined();
  });

  it("drops a NaN or Infinity score to undefined", () => {
    expect(
      mapWebCreditReport({ ...base, score: Number.NaN }).score,
    ).toBeUndefined();
    expect(
      mapWebCreditReport({ ...base, score: Number.POSITIVE_INFINITY }).score,
    ).toBeUndefined();
  });

  it("passes a real finite score through unchanged", () => {
    expect(mapWebCreditReport({ ...base, score: 705 }).score).toBe(705);
  });
});

describe("mapWebCreditReport — sections count real entries, never fabricate rows", () => {
  it("counts each section from the real array length", () => {
    const m = mapWebCreditReport({
      ...base,
      accounts: [{}, {}, {}],
      collections: [{}],
      inquiries: [{}, {}],
      publicRecords: [{}],
    });
    expect(m.accountsCount).toBe(3);
    expect(m.negativeItemsCount).toBe(1); // sourced from collections
    expect(m.inquiriesCount).toBe(2);
    expect(m.publicRecordsCount).toBe(1);
  });

  it("treats absent or non-array structured fields as an empty section (count 0)", () => {
    const m = mapWebCreditReport({
      id: "r2",
      bureau: "experian",
      score: 700,
      reportDate: "2026-01-01T00:00:00.000Z",
    });
    expect(m.accountsCount).toBe(0);
    expect(m.negativeItemsCount).toBe(0);
    expect(m.inquiriesCount).toBe(0);
    expect(m.publicRecordsCount).toBe(0);
  });

  it("sources negative items from collections (there is no fabricated negativeItems field)", () => {
    const m = mapWebCreditReport({ ...base, collections: [{}, {}] });
    expect(m.negativeItemsCount).toBe(2);
  });
});

describe("creditRepairApi.getReport", () => {
  it("fetches the credit-report route by id and adapts the payload onto the mobile shape", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        id: "report-123",
        bureau: "equifax",
        score: 688,
        reportDate: "2026-02-10T00:00:00.000Z",
        reportData: {},
        accounts: [],
        inquiries: [],
        collections: [],
        publicRecords: [],
      },
    });

    const res = await creditRepairApi.getReport("report-123");

    expect(mockApiGet).toHaveBeenCalledWith(
      "/credit-repair/reports/report-123",
    );
    expect(res.success).toBe(true);
    expect(res.data?.report).toEqual<CreditReportDetail>({
      id: "report-123",
      bureau: "equifax",
      score: 688,
      reportDate: "2026-02-10T00:00:00.000Z",
      accountsCount: 0,
      negativeItemsCount: 0,
      inquiriesCount: 0,
      publicRecordsCount: 0,
    });
  });

  it("returns report: null when the request succeeds with no body (does not fabricate a report)", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: undefined });
    const res = await creditRepairApi.getReport("report-123");
    expect(res.success).toBe(true);
    expect(res.data?.report).toBeNull();
  });

  it("passes a failed request (e.g. 404 not found) straight through without fabricating data", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_404", message: "Credit report not found" },
    });

    const res = await creditRepairApi.getReport("missing-id");

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Credit report not found");
  });
});
