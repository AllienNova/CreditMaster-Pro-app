/**
 * @jest-environment node
 */

/**
 * Manual Account Service Unit Tests
 *
 * Comprehensive tests for account CRUD, value history tracking,
 * net worth calculation, net worth history, and account templates.
 */

// ---------------------------------------------------------------------------
// Mock Setup — must come before imports
// ---------------------------------------------------------------------------

const mockFrom = jest.fn();
const mockCreateClient = jest.fn(() => ({
  from: mockFrom,
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

import { ManualAccountService } from "../manual-account-service";
import type { ManualAccount } from "../manual-account-service";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_URL = "https://test.supabase.co";
const TEST_KEY = "test-key";
const FIXED_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const NOW_ISO = "2026-02-23T12:00:00.000Z";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDbAccount(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: FIXED_UUID,
    user_id: "user-1",
    name: "My House",
    type: "real_estate",
    category: "asset",
    current_value: 350000,
    original_value: 300000,
    purchase_date: "2020-06-15T00:00:00.000Z",
    currency: "USD",
    details: { type: "real_estate", propertyType: "primary_residence" },
    value_history: [
      { date: "2020-06-15T00:00:00.000Z", value: 300000, source: "manual" },
      { date: NOW_ISO, value: 350000, source: "manual" },
    ],
    notes: "Primary residence",
    tags: ["property"],
    include_in_net_worth: true,
    is_active: true,
    last_updated: NOW_ISO,
    created_at: NOW_ISO,
    ...overrides,
  };
}

function makeAccountInput(
  overrides: Partial<Omit<ManualAccount, "id" | "createdAt" | "valueHistory">> = {},
): Omit<ManualAccount, "id" | "createdAt" | "valueHistory"> {
  return {
    userId: "user-1",
    name: "My House",
    type: "real_estate",
    category: "asset",
    currentValue: 350000,
    originalValue: 300000,
    purchaseDate: new Date("2020-06-15"),
    currency: "USD",
    details: { type: "real_estate", propertyType: "primary_residence" } as ManualAccount["details"],
    notes: "Primary residence",
    tags: ["property"],
    includeInNetWorth: true,
    isActive: true,
    lastUpdated: new Date(NOW_ISO),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ManualAccountService", () => {
  let service: ManualAccountService;

  beforeEach(() => {
    // Re-set mockCreateClient implementation (resetMocks strips it each test)
    mockCreateClient.mockReturnValue({
      from: mockFrom,
    } as any);
    service = new ManualAccountService(TEST_URL, TEST_KEY);
    jest.spyOn(crypto, "randomUUID").mockReturnValue(FIXED_UUID);
  });

  // =========================================================================
  // Constructor
  // =========================================================================

  describe("constructor", () => {
    it("calls createClient with the provided url and key", () => {
      expect(mockCreateClient).toHaveBeenCalledWith(TEST_URL, TEST_KEY);
    });
  });

  // =========================================================================
  // createAccount
  // =========================================================================

  describe("createAccount", () => {
    it("creates an account and returns the mapped result", async () => {
      const dbRow = makeDbAccount();
      const insertSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({ single: insertSingle }),
        }),
      });

      const result = await service.createAccount(makeAccountInput());

      expect(result.id).toBe(FIXED_UUID);
      expect(result.userId).toBe("user-1");
      expect(result.name).toBe("My House");
      expect(result.type).toBe("real_estate");
      expect(result.category).toBe("asset");
      expect(mockFrom).toHaveBeenCalledWith("manual_accounts");
    });

    it("initializes value history with current value", async () => {
      const dbRow = makeDbAccount({
        value_history: [{ date: NOW_ISO, value: 350000, source: "manual" }],
      });
      const insertSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({ single: insertSingle }),
        }),
      });

      const result = await service.createAccount(makeAccountInput());
      expect(result.valueHistory).toHaveLength(1);
      expect(result.valueHistory[0].value).toBe(350000);
      expect(result.valueHistory[0].source).toBe("manual");
    });

    it("assigns a crypto.randomUUID id", async () => {
      const dbRow = makeDbAccount();
      const insertSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({ single: insertSingle }),
        }),
      });

      const result = await service.createAccount(makeAccountInput());
      expect(result.id).toBe(FIXED_UUID);
    });

    it("throws when supabase returns an error", async () => {
      const insertSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      });
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({ single: insertSingle }),
        }),
      });

      await expect(service.createAccount(makeAccountInput())).rejects.toEqual({
        message: "Insert failed",
      });
    });
  });

  // =========================================================================
  // updateAccount
  // =========================================================================

  describe("updateAccount", () => {
    it("updates an account and returns the mapped result", async () => {
      const dbRow = makeDbAccount({ name: "Updated House" });
      const updateSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({ single: updateSingle }),
          }),
        }),
      });

      const result = await service.updateAccount(FIXED_UUID, { name: "Updated House" });
      expect(result.name).toBe("Updated House");
      expect(mockFrom).toHaveBeenCalledWith("manual_accounts");
    });

    it("throws when supabase returns an error", async () => {
      const updateSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Update failed" },
      });
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({ single: updateSingle }),
          }),
        }),
      });

      await expect(
        service.updateAccount(FIXED_UUID, { name: "fail" }),
      ).rejects.toEqual({ message: "Update failed" });
    });
  });

  // =========================================================================
  // updateValue
  // =========================================================================

  describe("updateValue", () => {
    it("appends to value history and updates current value", async () => {
      const existingAccount = makeDbAccount({
        value_history: [{ date: "2020-06-15T00:00:00.000Z", value: 300000, source: "manual" }],
      });
      const updatedAccount = makeDbAccount({
        current_value: 375000,
        value_history: [
          { date: "2020-06-15T00:00:00.000Z", value: 300000, source: "manual" },
          { date: NOW_ISO, value: 375000, source: "manual" },
        ],
      });

      // getAccount (select) then updateAccount (update)
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: existingAccount, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: updatedAccount, error: null }),
            }),
          }),
        }),
      });

      const result = await service.updateValue(FIXED_UUID, 375000);
      expect(result.currentValue).toBe(375000);
      expect(result.valueHistory).toHaveLength(2);
    });

    it("uses the provided source and notes", async () => {
      const existingAccount = makeDbAccount({
        value_history: [{ date: "2020-06-15T00:00:00.000Z", value: 300000, source: "manual" }],
      });
      const updatedAccount = makeDbAccount({
        current_value: 360000,
        value_history: [
          { date: "2020-06-15T00:00:00.000Z", value: 300000, source: "manual" },
          { date: NOW_ISO, value: 360000, source: "api", notes: "Zillow update" },
        ],
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: existingAccount, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: updatedAccount, error: null }),
            }),
          }),
        }),
      });

      const result = await service.updateValue(FIXED_UUID, 360000, "api", "Zillow update");
      expect(result.valueHistory[1].source).toBe("api");
      expect(result.valueHistory[1].notes).toBe("Zillow update");
    });

    it("defaults source to manual when not provided", async () => {
      const existingAccount = makeDbAccount({
        value_history: [{ date: NOW_ISO, value: 300000, source: "manual" }],
      });
      const updatedAccount = makeDbAccount({
        current_value: 310000,
        value_history: [
          { date: NOW_ISO, value: 300000, source: "manual" },
          { date: NOW_ISO, value: 310000, source: "manual" },
        ],
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: existingAccount, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: updatedAccount, error: null }),
            }),
          }),
        }),
      });

      const result = await service.updateValue(FIXED_UUID, 310000);
      expect(result.valueHistory[1].source).toBe("manual");
    });

    it("throws when account is not found", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      await expect(service.updateValue("nonexistent", 100)).rejects.toThrow(
        "Account not found",
      );
    });
  });

  // =========================================================================
  // deleteAccount
  // =========================================================================

  describe("deleteAccount", () => {
    it("deletes an account by id", async () => {
      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      await expect(service.deleteAccount(FIXED_UUID)).resolves.toBeUndefined();
      expect(mockFrom).toHaveBeenCalledWith("manual_accounts");
    });

    it("throws when supabase returns an error", async () => {
      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: { message: "Delete failed" } }),
        }),
      });

      await expect(service.deleteAccount(FIXED_UUID)).rejects.toEqual({
        message: "Delete failed",
      });
    });
  });

  // =========================================================================
  // getAccount
  // =========================================================================

  describe("getAccount", () => {
    it("returns a mapped account when found", async () => {
      const dbRow = makeDbAccount();
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: dbRow, error: null }),
          }),
        }),
      });

      const result = await service.getAccount(FIXED_UUID);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(FIXED_UUID);
      expect(result!.userId).toBe("user-1");
      expect(result!.currentValue).toBe(350000);
    });

    it("returns null when not found", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await service.getAccount("nonexistent");
      expect(result).toBeNull();
    });

    it("correctly maps value history dates", async () => {
      const dbRow = makeDbAccount({
        value_history: [
          { date: "2020-06-15T00:00:00.000Z", value: 300000, source: "manual" },
          { date: NOW_ISO, value: 350000, source: "api", notes: "Zillow" },
        ],
      });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: dbRow, error: null }),
          }),
        }),
      });

      const result = await service.getAccount(FIXED_UUID);
      expect(result!.valueHistory).toHaveLength(2);
      expect(result!.valueHistory[0].date).toBeInstanceOf(Date);
      expect(result!.valueHistory[1].notes).toBe("Zillow");
    });
  });

  // =========================================================================
  // getUserAccounts
  // =========================================================================

  describe("getUserAccounts", () => {
    it("returns all active accounts by default", async () => {
      const rows = [makeDbAccount(), makeDbAccount({ id: "acc-2", name: "Car" })];

      // Chain: .select("*").eq("user_id").order().eq("is_active") or directly resolves
      const eqActiveMock = jest.fn().mockResolvedValue({ data: rows, error: null });
      const orderMock = jest.fn().mockReturnValue({ eq: eqActiveMock });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock, eq: eqActiveMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      const result = await service.getUserAccounts("user-1");
      expect(result).toHaveLength(2);
    });

    it("includes inactive accounts when requested", async () => {
      const rows = [
        makeDbAccount(),
        makeDbAccount({ id: "acc-2", is_active: false }),
      ];

      const orderMock = jest.fn().mockResolvedValue({ data: rows, error: null });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      const result = await service.getUserAccounts("user-1", true);
      expect(result).toHaveLength(2);
    });

    it("throws on supabase error", async () => {
      const eqActiveMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });
      const orderMock = jest.fn().mockReturnValue({ eq: eqActiveMock });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      await expect(service.getUserAccounts("user-1")).rejects.toEqual({
        message: "Query failed",
      });
    });

    it("returns empty array when no accounts exist", async () => {
      const eqActiveMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const orderMock = jest.fn().mockReturnValue({ eq: eqActiveMock });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      const result = await service.getUserAccounts("user-1");
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // getAccountsByType
  // =========================================================================

  describe("getAccountsByType", () => {
    it("returns accounts filtered by type", async () => {
      const rows = [makeDbAccount({ type: "crypto" })];

      const eqActiveMock = jest.fn().mockResolvedValue({ data: rows, error: null });
      const eqTypeMock = jest.fn().mockReturnValue({ eq: eqActiveMock });
      const eqUserMock = jest.fn().mockReturnValue({ eq: eqTypeMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      const result = await service.getAccountsByType("user-1", "crypto");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("crypto");
    });

    it("throws on supabase error", async () => {
      const eqActiveMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Filter failed" },
      });
      const eqTypeMock = jest.fn().mockReturnValue({ eq: eqActiveMock });
      const eqUserMock = jest.fn().mockReturnValue({ eq: eqTypeMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      await expect(
        service.getAccountsByType("user-1", "crypto"),
      ).rejects.toEqual({ message: "Filter failed" });
    });

    it("returns empty array when no matching accounts", async () => {
      const eqActiveMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const eqTypeMock = jest.fn().mockReturnValue({ eq: eqActiveMock });
      const eqUserMock = jest.fn().mockReturnValue({ eq: eqTypeMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      const result = await service.getAccountsByType("user-1", "vehicle");
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // calculateNetWorth
  // =========================================================================

  describe("calculateNetWorth", () => {
    function setupNetWorthAccounts(rows: Record<string, unknown>[]) {
      const eqActiveMock = jest.fn().mockResolvedValue({ data: rows, error: null });
      const orderMock = jest.fn().mockReturnValue({ eq: eqActiveMock });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });
    }

    it("calculates net worth as assets minus liabilities", async () => {
      const rows = [
        makeDbAccount({ current_value: 350000, category: "asset", type: "real_estate", include_in_net_worth: true }),
        makeDbAccount({ id: "acc-2", current_value: 200000, category: "liability", type: "loan", include_in_net_worth: true }),
      ];
      setupNetWorthAccounts(rows);

      const result = await service.calculateNetWorth("user-1");
      expect(result.totalAssets).toBe(350000);
      expect(result.totalLiabilities).toBe(200000);
      expect(result.netWorth).toBe(150000);
    });

    it("groups values by account type", async () => {
      const rows = [
        makeDbAccount({ current_value: 350000, category: "asset", type: "real_estate", include_in_net_worth: true }),
        makeDbAccount({ id: "acc-2", current_value: 50000, category: "asset", type: "crypto", include_in_net_worth: true }),
      ];
      setupNetWorthAccounts(rows);

      const result = await service.calculateNetWorth("user-1");
      expect(result.byType.real_estate).toBe(350000);
      expect(result.byType.crypto).toBe(50000);
      expect(result.byType.vehicle).toBe(0);
    });

    it("excludes accounts not included in net worth", async () => {
      const rows = [
        makeDbAccount({ current_value: 350000, category: "asset", include_in_net_worth: true }),
        makeDbAccount({ id: "acc-2", current_value: 10000, category: "asset", include_in_net_worth: false }),
      ];
      setupNetWorthAccounts(rows);

      const result = await service.calculateNetWorth("user-1");
      expect(result.totalAssets).toBe(350000);
      expect(result.manualAccountsCount).toBe(1);
    });

    it("returns zero net worth when no accounts", async () => {
      setupNetWorthAccounts([]);

      const result = await service.calculateNetWorth("user-1");
      expect(result.netWorth).toBe(0);
      expect(result.totalAssets).toBe(0);
      expect(result.totalLiabilities).toBe(0);
      expect(result.manualAccountsCount).toBe(0);
    });

    it("handles all-liability scenario", async () => {
      const rows = [
        makeDbAccount({ current_value: 100000, category: "liability", type: "loan", include_in_net_worth: true }),
        makeDbAccount({ id: "acc-2", current_value: 25000, category: "liability", type: "other_liability", include_in_net_worth: true }),
      ];
      setupNetWorthAccounts(rows);

      const result = await service.calculateNetWorth("user-1");
      expect(result.totalAssets).toBe(0);
      expect(result.totalLiabilities).toBe(125000);
      expect(result.netWorth).toBe(-125000);
    });
  });

  // =========================================================================
  // getNetWorthHistory
  // =========================================================================

  describe("getNetWorthHistory", () => {
    it("returns history for the requested number of months", async () => {
      const rows = [
        makeDbAccount({
          current_value: 100000,
          category: "asset",
          include_in_net_worth: true,
          value_history: [
            { date: "2025-01-01T00:00:00.000Z", value: 80000, source: "manual" },
            { date: "2026-01-01T00:00:00.000Z", value: 100000, source: "manual" },
          ],
        }),
      ];

      const eqActiveMock = jest.fn().mockResolvedValue({ data: rows, error: null });
      const orderMock = jest.fn().mockReturnValue({ eq: eqActiveMock });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      const result = await service.getNetWorthHistory("user-1", 3);
      // 3 months back + current = 4 entries
      expect(result).toHaveLength(4);
      result.forEach((entry) => {
        expect(entry.date).toBeInstanceOf(Date);
        expect(typeof entry.netWorth).toBe("number");
      });
    });

    it("defaults to 12 months of history", async () => {
      const eqActiveMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const orderMock = jest.fn().mockReturnValue({ eq: eqActiveMock });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      const result = await service.getNetWorthHistory("user-1");
      // 12 months back + current = 13 entries
      expect(result).toHaveLength(13);
    });

    it("subtracts liability values from net worth", async () => {
      const rows = [
        makeDbAccount({
          current_value: 100000,
          category: "asset",
          include_in_net_worth: true,
          value_history: [{ date: "2020-01-01T00:00:00.000Z", value: 100000, source: "manual" }],
        }),
        makeDbAccount({
          id: "acc-2",
          current_value: 60000,
          category: "liability",
          include_in_net_worth: true,
          value_history: [{ date: "2020-01-01T00:00:00.000Z", value: 60000, source: "manual" }],
        }),
      ];

      const eqActiveMock = jest.fn().mockResolvedValue({ data: rows, error: null });
      const orderMock = jest.fn().mockReturnValue({ eq: eqActiveMock });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      const result = await service.getNetWorthHistory("user-1", 1);
      // Each entry should be 100000 - 60000 = 40000
      result.forEach((entry) => {
        expect(entry.netWorth).toBe(40000);
      });
    });

    it("excludes accounts not in net worth from history", async () => {
      const rows = [
        makeDbAccount({
          current_value: 100000,
          category: "asset",
          include_in_net_worth: false,
          value_history: [{ date: "2020-01-01T00:00:00.000Z", value: 100000, source: "manual" }],
        }),
      ];

      const eqActiveMock = jest.fn().mockResolvedValue({ data: rows, error: null });
      const orderMock = jest.fn().mockReturnValue({ eq: eqActiveMock });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      const result = await service.getNetWorthHistory("user-1", 1);
      result.forEach((entry) => {
        expect(entry.netWorth).toBe(0);
      });
    });
  });

  // =========================================================================
  // getAccountTemplate
  // =========================================================================

  describe("getAccountTemplate", () => {
    it("returns real_estate template with asset category", () => {
      const template = service.getAccountTemplate("real_estate");
      expect(template.type).toBe("real_estate");
      expect(template.category).toBe("asset");
      expect(template.currency).toBe("USD");
      expect(template.includeInNetWorth).toBe(true);
      expect(template.isActive).toBe(true);
    });

    it("returns vehicle template", () => {
      const template = service.getAccountTemplate("vehicle");
      expect(template.type).toBe("vehicle");
      expect(template.category).toBe("asset");
      expect(template.tags).toEqual(["vehicle"]);
    });

    it("returns crypto template with investment tag", () => {
      const template = service.getAccountTemplate("crypto");
      expect(template.type).toBe("crypto");
      expect(template.category).toBe("asset");
      expect(template.tags).toContain("crypto");
      expect(template.tags).toContain("investment");
    });

    it("returns cash template", () => {
      const template = service.getAccountTemplate("cash");
      expect(template.type).toBe("cash");
      expect(template.category).toBe("asset");
    });

    it("returns collectible template", () => {
      const template = service.getAccountTemplate("collectible");
      expect(template.type).toBe("collectible");
      expect(template.category).toBe("asset");
    });

    it("returns business template", () => {
      const template = service.getAccountTemplate("business");
      expect(template.type).toBe("business");
      expect(template.category).toBe("asset");
    });

    it("returns retirement template with investment tag", () => {
      const template = service.getAccountTemplate("retirement");
      expect(template.type).toBe("retirement");
      expect(template.tags).toContain("retirement");
      expect(template.tags).toContain("investment");
    });

    it("returns loan template with liability category", () => {
      const template = service.getAccountTemplate("loan");
      expect(template.type).toBe("loan");
      expect(template.category).toBe("liability");
      expect(template.tags).toContain("debt");
    });

    it("returns other_asset template", () => {
      const template = service.getAccountTemplate("other_asset");
      expect(template.type).toBe("other_asset");
      expect(template.category).toBe("asset");
    });

    it("returns other_liability template with liability category", () => {
      const template = service.getAccountTemplate("other_liability");
      expect(template.type).toBe("other_liability");
      expect(template.category).toBe("liability");
      expect(template.tags).toContain("debt");
    });
  });
});
