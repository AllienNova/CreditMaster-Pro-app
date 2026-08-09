/**
 * mapWebInquiry — web -> mobile credit-inquiry adapter (PARITY-P2).
 *
 * The real web route (GET /api/credit-repair/inquiries, withAuth) returns
 * inquiries shaped by src/lib/credit-repair/db/inquiries-db-service.ts:
 * `creditorName`, `inquiryType` (hard | soft), `inquiryDate` (ISO string), an
 * optional `bureau` embedded from the parent credit report, and `isDisputed`.
 * The mobile screen speaks `creditor`, `inquiryDate`, an optional `bureau`, and a
 * derived `removable` flag. These tests pin the field map, the FCRA 24-month
 * removability rule on both sides of the boundary, the hard-vs-soft gate, the
 * bureau/type normalization, and prove getInquiries never fabricates on failure
 * or on a non-array payload — and that the whole batch is measured against one
 * clock (the array index is never passed as `now`).
 */

// Stub the module's side-effecting client import so creditRepair.ts loads in
// isolation, while still driving api.get for the getInquiries wrapper tests.
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import {
  mapWebInquiry,
  creditRepairApi,
  type CreditInquiry,
  type WebCreditInquiry,
} from "../creditRepair";

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

// A Date built from local components round-trips through toISOString() to the
// same instant, so `new Date(iso).getDate()` (local) inside the adapter returns
// the same day — making the boundary tests timezone-independent.
function isoLocal(year: number, monthIndex: number, day: number): string {
  return new Date(year, monthIndex, day).toISOString();
}

const base: WebCreditInquiry = {
  id: "i1",
  inquiryDate: "2020-01-01T00:00:00.000Z",
};

describe("mapWebInquiry — field map", () => {
  it("maps creditorName -> creditor and preserves id + inquiryDate", () => {
    const m = mapWebInquiry({
      ...base,
      creditorName: "Chase Bank",
      inquiryType: "hard",
      inquiryDate: "2024-11-15T00:00:00.000Z",
      bureau: "experian",
    });
    expect(m.id).toBe("i1");
    expect(m.creditor).toBe("Chase Bank");
    expect(m.inquiryDate).toBe("2024-11-15T00:00:00.000Z");
    expect(m.inquiryType).toBe("hard");
    expect(m.bureau).toBe("experian");
  });

  it("defaults an absent creditorName to an empty string rather than a made-up name", () => {
    expect(mapWebInquiry({ ...base }).creditor).toBe("");
    expect(
      mapWebInquiry({ ...base, creditorName: "Capital One" }).creditor,
    ).toBe("Capital One");
  });

  it("defaults an absent inquiryDate to an empty string", () => {
    expect(mapWebInquiry({ id: "i1" }).inquiryDate).toBe("");
  });
});

describe("mapWebInquiry — bureau normalization", () => {
  it("passes each recognized bureau through unchanged", () => {
    expect(mapWebInquiry({ ...base, bureau: "experian" }).bureau).toBe(
      "experian",
    );
    expect(mapWebInquiry({ ...base, bureau: "equifax" }).bureau).toBe(
      "equifax",
    );
    expect(mapWebInquiry({ ...base, bureau: "transunion" }).bureau).toBe(
      "transunion",
    );
  });

  it("omits an absent or unknown bureau rather than fabricating one", () => {
    expect(mapWebInquiry({ ...base }).bureau).toBeUndefined();
    expect(
      mapWebInquiry({ ...base, bureau: "not-a-bureau" }).bureau,
    ).toBeUndefined();
    // Inherited object keys must not resolve to a truthy non-bureau value.
    expect(
      mapWebInquiry({ ...base, bureau: "constructor" }).bureau,
    ).toBeUndefined();
  });
});

describe("mapWebInquiry — inquiry-type normalization", () => {
  it("keeps 'hard' and treats anything else (including unknown) as 'soft'", () => {
    expect(mapWebInquiry({ ...base, inquiryType: "hard" }).inquiryType).toBe(
      "hard",
    );
    expect(mapWebInquiry({ ...base, inquiryType: "soft" }).inquiryType).toBe(
      "soft",
    );
    expect(
      mapWebInquiry({ ...base, inquiryType: "weird" }).inquiryType,
    ).toBe("soft");
    expect(mapWebInquiry({ ...base, inquiryType: undefined }).inquiryType).toBe(
      "soft",
    );
  });
});

describe("mapWebInquiry — removable derivation (FCRA 24-month rule)", () => {
  // Fixed clock: local 2026-01-15.
  const now = new Date(2026, 0, 15);

  it("marks a hard inquiry removable at exactly 24 months (on the boundary)", () => {
    const m = mapWebInquiry(
      { ...base, inquiryType: "hard", inquiryDate: isoLocal(2024, 0, 15) },
      now,
    );
    expect(m.removable).toBe(true);
  });

  it("does NOT mark a hard inquiry removable just under 24 months (below the boundary)", () => {
    // One day younger than exactly 24 months -> 23 whole months elapsed.
    const m = mapWebInquiry(
      { ...base, inquiryType: "hard", inquiryDate: isoLocal(2024, 0, 16) },
      now,
    );
    expect(m.removable).toBe(false);
  });

  it("marks a clearly-old hard inquiry removable (well past the boundary)", () => {
    const m = mapWebInquiry(
      { ...base, inquiryType: "hard", inquiryDate: isoLocal(2023, 11, 15) },
      now,
    );
    expect(m.removable).toBe(true);
  });

  it("never marks a soft inquiry removable, even when it is old (hard-vs-soft gate)", () => {
    const m = mapWebInquiry(
      { ...base, inquiryType: "soft", inquiryDate: isoLocal(2010, 0, 1) },
      now,
    );
    expect(m.removable).toBe(false);
  });

  it("does not mark a recent hard inquiry removable", () => {
    const m = mapWebInquiry(
      { ...base, inquiryType: "hard", inquiryDate: isoLocal(2025, 11, 1) },
      now,
    );
    expect(m.removable).toBe(false);
  });

  it("treats an absent or unparseable date as not removable rather than guessing", () => {
    expect(
      mapWebInquiry({ id: "i1", inquiryType: "hard" }, now).removable,
    ).toBe(false);
    expect(
      mapWebInquiry(
        { ...base, inquiryType: "hard", inquiryDate: "not-a-date" },
        now,
      ).removable,
    ).toBe(false);
  });

  it("does not mark a future-dated hard inquiry removable", () => {
    const m = mapWebInquiry(
      { ...base, inquiryType: "hard", inquiryDate: isoLocal(2030, 0, 1) },
      now,
    );
    expect(m.removable).toBe(false);
  });
});

describe("creditRepairApi.getInquiries", () => {
  it("adapts the web inquiries array onto the mobile CreditInquiry shape with derived removable", async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 15));
    const oldHard = isoLocal(2023, 0, 15); // ~36 months -> removable
    const oldSoft = isoLocal(2010, 0, 1); // old but soft -> not removable
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        inquiries: [
          {
            id: "i1",
            creditorName: "Chase Bank",
            inquiryType: "hard",
            inquiryDate: oldHard,
            bureau: "experian",
            isDisputed: false,
          },
          {
            id: "i2",
            creditorName: "SoftCheck Co",
            inquiryType: "soft",
            inquiryDate: oldSoft,
            bureau: "equifax",
          },
        ],
        stats: { total: 2, hard: 1, soft: 1, disputed: 0 },
        pagination: { limit: 50, offset: 0, total: 2 },
      },
    });

    const res = await creditRepairApi.getInquiries();

    expect(mockApiGet).toHaveBeenCalledWith("/credit-repair/inquiries");
    expect(res.success).toBe(true);
    expect(res.data?.inquiries).toEqual<CreditInquiry[]>([
      {
        id: "i1",
        creditor: "Chase Bank",
        inquiryDate: oldHard,
        inquiryType: "hard",
        bureau: "experian",
        removable: true,
      },
      {
        id: "i2",
        creditor: "SoftCheck Co",
        inquiryDate: oldSoft,
        inquiryType: "soft",
        bureau: "equifax",
        removable: false,
      },
    ]);
  });

  it("measures the whole batch against one clock (the array index is not passed as `now`)", async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 15));
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        inquiries: [
          {
            id: "i1",
            creditorName: "Old Hard",
            inquiryType: "hard",
            inquiryDate: isoLocal(2020, 0, 1),
          },
          // A recent hard inquiry at index 1: if the array index (1 -> Date(1),
          // i.e. 1970) were wrongly passed as `now`, its age would be enormous
          // and it would be falsely removable. It must instead be measured
          // against the real clock and stay NOT removable.
          {
            id: "i2",
            creditorName: "Recent Hard",
            inquiryType: "hard",
            inquiryDate: isoLocal(2025, 11, 1),
          },
        ],
      },
    });

    const res = await creditRepairApi.getInquiries();
    const byId = Object.fromEntries(
      (res.data?.inquiries ?? []).map((i) => [i.id, i]),
    );
    expect(byId.i1.removable).toBe(true);
    expect(byId.i2.removable).toBe(false);
  });

  it("returns an empty list when the payload inquiries are not an array", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: { stats: {} } });
    const res = await creditRepairApi.getInquiries();
    expect(res.success).toBe(true);
    expect(res.data?.inquiries).toEqual([]);
  });

  it("passes a failed request through without fabricating data", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });

    const res = await creditRepairApi.getInquiries();

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Unauthorized");
  });
});
