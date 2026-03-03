/**
 * @jest-environment node
 */

/**
 * Plaid Income Service Unit Tests
 *
 * Tests for income verification, paystubs, tax forms, and bank income via Plaid SDK.
 */

// Environment variables
process.env.PLAID_CLIENT_ID = "test-client-id";
process.env.PLAID_SECRET = "test-secret";
process.env.PLAID_ENV = "sandbox";

// Plaid SDK mocks
const mockIncomeVerificationCreate = jest.fn();
const mockIncomeVerificationPaystubsGet = jest.fn();
const mockIncomeVerificationTaxformsGet = jest.fn();
const mockCreditBankIncomeGet = jest.fn();
const mockCreditBankIncomeRefresh = jest.fn();

jest.mock("@/lib/financial/plaid-client", () => ({
  getPlaidClient: () => ({
    incomeVerificationCreate: mockIncomeVerificationCreate,
    incomeVerificationPaystubsGet: mockIncomeVerificationPaystubsGet,
    incomeVerificationTaxformsGet: mockIncomeVerificationTaxformsGet,
    creditBankIncomeGet: mockCreditBankIncomeGet,
    creditBankIncomeRefresh: mockCreditBankIncomeRefresh,
  }),
}));

import { plaidIncomeService } from "../plaid-income-service";

// ==========================================================================
// Mock Data
// ==========================================================================

const mockCreateResponse = {
  data: {
    income_verification_id: "iv-123",
    request_id: "req-create-1",
  },
};

const mockPaystubsResponse = {
  data: {
    paystubs: [
      {
        employer: {
          name: "Acme Corp",
          address: {
            city: "San Francisco",
            region: "CA",
            postal_code: "94105",
            country: "US",
          },
        },
        employee: {
          name: "Jane Doe",
          address: {
            city: "Oakland",
            region: "CA",
            postal_code: "94612",
          },
        },
        pay_period_details: {
          start_date: "2026-01-01",
          end_date: "2026-01-15",
          pay_date: "2026-01-20",
        },
        net_pay: {
          current_amount: 3500,
          ytd_amount: 2800,
          iso_currency_code: "USD",
        },
        doc_id: "doc-ps-1",
      },
      {
        employer: {
          name: "Beta Inc",
          address: {},
        },
        employee: {
          name: null,
          address: {},
        },
        pay_period_details: {
          start_date: null,
          end_date: null,
          pay_date: null,
        },
        net_pay: {
          current_amount: null,
          ytd_amount: null,
          iso_currency_code: null,
        },
        doc_id: null,
      },
    ],
    document_metadata: [
      { name: "paystub_jan.pdf", status: "PAYSTUB" },
    ],
    request_id: "req-paystubs-1",
  },
};

const mockTaxformsResponse = {
  data: {
    taxforms: [
      {
        document_type: "W-2",
        doc_id: "doc-tf-1",
        w2: {
          employer: {
            name: "Acme Corp",
          },
          employer_id_number: "12-3456789",
          employee: {
            name: "Jane Doe",
            address: {
              city: "Oakland",
              region: "CA",
              postal_code: "94612",
            },
          },
          tax_year: "2025",
          wages_tips_other_comp: 85000,
          federal_income_tax_withheld: 17000,
          social_security_wages: 85000,
          social_security_tax_withheld: 5270,
          medicare_wages_and_tips: 85000,
          medicare_tax_withheld: 1232.5,
          state_and_local_wages: [
            {
              state: "CA",
              state_income_tax: 4250,
              state_wages_tips: 85000,
            },
          ],
        },
      },
      {
        document_type: "W-2",
        doc_id: null,
        w2: null,
      },
    ],
    document_metadata: [
      { name: "w2_2025.pdf", status: "TAX_FORM" },
    ],
    request_id: "req-taxforms-1",
  },
};

const mockBankIncomeResponse = {
  data: {
    bank_income: [
      {
        items: [
          {
            item_id: "item-bi-1",
            institution_id: "ins-123",
            institution_name: "Chase",
            last_updated_time: "2026-02-28T12:00:00Z",
            bank_income_sources: [
              {
                income_source_id: "src-1",
                income_description: "PAYROLL ACME CORP",
                income_category: "SALARY",
                account_id: "acc-bi-1",
                start_date: "2025-03-01",
                end_date: "2026-02-28",
                pay_frequency: "BIWEEKLY",
                total_amount: 102000,
                transaction_count: 26,
              },
              {
                income_source_id: "src-2",
                income_description: "SIDE GIG LLC",
                income_category: "OTHER",
                account_id: "acc-bi-1",
                start_date: "2025-06-01",
                end_date: "2026-02-28",
                pay_frequency: "MONTHLY",
                total_amount: 12000,
                transaction_count: 9,
              },
            ],
          },
        ],
      },
    ],
    request_id: "req-bi-1",
  },
};

const mockRefreshResponse = {
  data: {
    request_id: "req-refresh-1",
  },
};

// ==========================================================================
// TESTS
// ==========================================================================

describe("PlaidIncomeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // createIncomeVerification
  // ========================================================================
  describe("createIncomeVerification", () => {
    it("should call incomeVerificationCreate with webhook", async () => {
      mockIncomeVerificationCreate.mockResolvedValue(mockCreateResponse);

      await plaidIncomeService.createIncomeVerification(
        "https://example.com/webhook",
      );

      expect(mockIncomeVerificationCreate).toHaveBeenCalledTimes(1);
      expect(mockIncomeVerificationCreate).toHaveBeenCalledWith({
        webhook: "https://example.com/webhook",
        precheck_id: undefined,
        options: undefined,
      });
    });

    it("should return income verification ID and request ID", async () => {
      mockIncomeVerificationCreate.mockResolvedValue(mockCreateResponse);

      const result = await plaidIncomeService.createIncomeVerification(
        "https://example.com/webhook",
      );

      expect(result.incomeVerificationId).toBe("iv-123");
      expect(result.requestId).toBe("req-create-1");
    });

    it("should pass optional access tokens and precheck ID", async () => {
      mockIncomeVerificationCreate.mockResolvedValue(mockCreateResponse);

      await plaidIncomeService.createIncomeVerification(
        "https://example.com/webhook",
        {
          accessTokens: ["token-1", "token-2"],
          precheckId: "pc-123",
        },
      );

      expect(mockIncomeVerificationCreate).toHaveBeenCalledWith({
        webhook: "https://example.com/webhook",
        precheck_id: "pc-123",
        options: { access_tokens: ["token-1", "token-2"] },
      });
    });

    it("should throw when webhook is empty", async () => {
      await expect(
        plaidIncomeService.createIncomeVerification(""),
      ).rejects.toThrow("Webhook URL is required");
      expect(mockIncomeVerificationCreate).not.toHaveBeenCalled();
    });

    it("should throw when SDK call rejects", async () => {
      mockIncomeVerificationCreate.mockRejectedValue(
        new Error("PRODUCT_NOT_READY"),
      );

      await expect(
        plaidIncomeService.createIncomeVerification(
          "https://example.com/webhook",
        ),
      ).rejects.toThrow("PRODUCT_NOT_READY");
    });

    it("should extract Plaid API error details", async () => {
      const plaidError = new Error("Plaid API Error");
      (plaidError as unknown as Record<string, unknown>).response = {
        status: 400,
        data: {
          error_type: "INVALID_INPUT",
          error_code: "INVALID_FIELD",
          error_message: "webhook is not a valid URL",
        },
      };
      mockIncomeVerificationCreate.mockRejectedValue(plaidError);

      await expect(
        plaidIncomeService.createIncomeVerification("not-a-url"),
      ).rejects.toThrow("INVALID_INPUT");
    });
  });

  // ========================================================================
  // getPaystubs
  // ========================================================================
  describe("getPaystubs", () => {
    it("should call incomeVerificationPaystubsGet with access token", async () => {
      mockIncomeVerificationPaystubsGet.mockResolvedValue(
        mockPaystubsResponse,
      );

      await plaidIncomeService.getPaystubs("access-token-abc");

      expect(mockIncomeVerificationPaystubsGet).toHaveBeenCalledTimes(1);
      expect(mockIncomeVerificationPaystubsGet).toHaveBeenCalledWith({
        access_token: "access-token-abc",
      });
    });

    it("should return mapped paystubs", async () => {
      mockIncomeVerificationPaystubsGet.mockResolvedValue(
        mockPaystubsResponse,
      );

      const result = await plaidIncomeService.getPaystubs("access-token-abc");

      expect(result.paystubs).toHaveLength(2);
      const p1 = result.paystubs[0];
      expect(p1.employer.name).toBe("Acme Corp");
      expect(p1.employer.addressCity).toBe("San Francisco");
      expect(p1.employer.addressRegion).toBe("CA");
      expect(p1.employer.addressPostalCode).toBe("94105");
      expect(p1.employer.addressCountry).toBe("US");
      expect(p1.employee.name).toBe("Jane Doe");
      expect(p1.employee.addressCity).toBe("Oakland");
      expect(p1.payPeriodStartDate).toBe("2026-01-01");
      expect(p1.payPeriodEndDate).toBe("2026-01-15");
      expect(p1.payDate).toBe("2026-01-20");
      expect(p1.earnings.subtotalAmount).toBe(3500);
      expect(p1.earnings.totalAmount).toBe(2800);
      expect(p1.earnings.currency).toBe("USD");
      expect(p1.documentId).toBe("doc-ps-1");
    });

    it("should handle null fields in paystubs", async () => {
      mockIncomeVerificationPaystubsGet.mockResolvedValue(
        mockPaystubsResponse,
      );

      const result = await plaidIncomeService.getPaystubs("access-token-abc");

      const p2 = result.paystubs[1];
      expect(p2.employee.name).toBeNull();
      expect(p2.payPeriodStartDate).toBeNull();
      expect(p2.payPeriodEndDate).toBeNull();
      expect(p2.payDate).toBeNull();
      expect(p2.earnings.subtotalAmount).toBeNull();
      expect(p2.earnings.totalAmount).toBeNull();
      expect(p2.earnings.currency).toBeNull();
      expect(p2.documentId).toBeNull();
    });

    it("should return document metadata", async () => {
      mockIncomeVerificationPaystubsGet.mockResolvedValue(
        mockPaystubsResponse,
      );

      const result = await plaidIncomeService.getPaystubs("access-token-abc");

      expect(result.documentMetadata).toHaveLength(1);
      expect(result.documentMetadata[0].name).toBe("paystub_jan.pdf");
      expect(result.documentMetadata[0].documentType).toBe("PAYSTUB");
    });

    it("should return requestId", async () => {
      mockIncomeVerificationPaystubsGet.mockResolvedValue(
        mockPaystubsResponse,
      );

      const result = await plaidIncomeService.getPaystubs("access-token-abc");

      expect(result.requestId).toBe("req-paystubs-1");
    });

    it("should handle empty paystubs", async () => {
      const emptyResponse = {
        data: {
          paystubs: [],
          document_metadata: [],
          request_id: "req-empty",
        },
      };
      mockIncomeVerificationPaystubsGet.mockResolvedValue(emptyResponse);

      const result = await plaidIncomeService.getPaystubs("access-token-abc");

      expect(result.paystubs).toEqual([]);
      expect(result.documentMetadata).toEqual([]);
    });

    it("should throw when access token is empty", async () => {
      await expect(plaidIncomeService.getPaystubs("")).rejects.toThrow(
        "Access token is required",
      );
      expect(mockIncomeVerificationPaystubsGet).not.toHaveBeenCalled();
    });

    it("should throw when SDK call rejects", async () => {
      mockIncomeVerificationPaystubsGet.mockRejectedValue(
        new Error("PRODUCT_NOT_READY"),
      );

      await expect(
        plaidIncomeService.getPaystubs("access-token-abc"),
      ).rejects.toThrow("PRODUCT_NOT_READY");
    });

    it("should propagate rate limit errors", async () => {
      const rateLimitError = new Error("Rate limit");
      (rateLimitError as unknown as Record<string, unknown>).response = {
        status: 429,
        data: {
          error_type: "RATE_LIMIT_EXCEEDED",
          error_code: "RATE_LIMIT",
          error_message: "Too many requests",
        },
      };
      mockIncomeVerificationPaystubsGet.mockRejectedValue(rateLimitError);

      await expect(
        plaidIncomeService.getPaystubs("access-token-abc"),
      ).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });
  });

  // ========================================================================
  // getTaxForms
  // ========================================================================
  describe("getTaxForms", () => {
    it("should call incomeVerificationTaxformsGet with access token", async () => {
      mockIncomeVerificationTaxformsGet.mockResolvedValue(
        mockTaxformsResponse,
      );

      await plaidIncomeService.getTaxForms("access-token-abc");

      expect(mockIncomeVerificationTaxformsGet).toHaveBeenCalledTimes(1);
      expect(mockIncomeVerificationTaxformsGet).toHaveBeenCalledWith({
        access_token: "access-token-abc",
      });
    });

    it("should return mapped tax forms with W-2 data", async () => {
      mockIncomeVerificationTaxformsGet.mockResolvedValue(
        mockTaxformsResponse,
      );

      const result = await plaidIncomeService.getTaxForms("access-token-abc");

      expect(result.taxforms).toHaveLength(2);
      const tf1 = result.taxforms[0];
      expect(tf1.documentType).toBe("W-2");
      expect(tf1.documentId).toBe("doc-tf-1");
      expect(tf1.w2).not.toBeNull();
      expect(tf1.w2?.employer?.name).toBe("Acme Corp");
      expect(tf1.w2?.employer?.ein).toBe("12-3456789");
      expect(tf1.w2?.employee?.name).toBe("Jane Doe");
      expect(tf1.w2?.taxYear).toBe("2025");
      expect(tf1.w2?.wagesTipsCompensation).toBe(85000);
      expect(tf1.w2?.federalIncomeTaxWithheld).toBe(17000);
      expect(tf1.w2?.socialSecurityWages).toBe(85000);
      expect(tf1.w2?.socialSecurityTaxWithheld).toBe(5270);
      expect(tf1.w2?.medicareWagesAndTips).toBe(85000);
      expect(tf1.w2?.medicareTaxWithheld).toBe(1232.5);
    });

    it("should return state tax info from W-2", async () => {
      mockIncomeVerificationTaxformsGet.mockResolvedValue(
        mockTaxformsResponse,
      );

      const result = await plaidIncomeService.getTaxForms("access-token-abc");

      const stateTax = result.taxforms[0].w2?.stateTaxInfos;
      expect(stateTax).toHaveLength(1);
      expect(stateTax?.[0].state).toBe("CA");
      expect(stateTax?.[0].stateIncomeTax).toBe(4250);
      expect(stateTax?.[0].stateWages).toBe(85000);
    });

    it("should handle null W-2 data", async () => {
      mockIncomeVerificationTaxformsGet.mockResolvedValue(
        mockTaxformsResponse,
      );

      const result = await plaidIncomeService.getTaxForms("access-token-abc");

      const tf2 = result.taxforms[1];
      expect(tf2.documentId).toBeNull();
      expect(tf2.w2).toBeNull();
    });

    it("should return document metadata", async () => {
      mockIncomeVerificationTaxformsGet.mockResolvedValue(
        mockTaxformsResponse,
      );

      const result = await plaidIncomeService.getTaxForms("access-token-abc");

      expect(result.documentMetadata).toHaveLength(1);
      expect(result.documentMetadata[0].name).toBe("w2_2025.pdf");
      expect(result.documentMetadata[0].documentType).toBe("TAX_FORM");
    });

    it("should handle empty tax forms", async () => {
      const emptyResponse = {
        data: {
          taxforms: [],
          document_metadata: [],
          request_id: "req-empty-tf",
        },
      };
      mockIncomeVerificationTaxformsGet.mockResolvedValue(emptyResponse);

      const result = await plaidIncomeService.getTaxForms("access-token-abc");

      expect(result.taxforms).toEqual([]);
      expect(result.documentMetadata).toEqual([]);
    });

    it("should throw when access token is empty", async () => {
      await expect(plaidIncomeService.getTaxForms("")).rejects.toThrow(
        "Access token is required",
      );
      expect(mockIncomeVerificationTaxformsGet).not.toHaveBeenCalled();
    });

    it("should handle 401 unauthorized errors", async () => {
      const authError = new Error("Unauthorized");
      (authError as unknown as Record<string, unknown>).response = {
        status: 401,
        data: {
          error_type: "INVALID_INPUT",
          error_code: "INVALID_ACCESS_TOKEN",
          error_message: "The access token is invalid",
        },
      };
      mockIncomeVerificationTaxformsGet.mockRejectedValue(authError);

      await expect(
        plaidIncomeService.getTaxForms("bad-token"),
      ).rejects.toThrow("INVALID_ACCESS_TOKEN");
    });

    it("should throw when SDK call rejects with generic error", async () => {
      mockIncomeVerificationTaxformsGet.mockRejectedValue(
        new Error("NETWORK_ERROR"),
      );

      await expect(
        plaidIncomeService.getTaxForms("access-token-abc"),
      ).rejects.toThrow("NETWORK_ERROR");
    });
  });

  // ========================================================================
  // getBankIncome
  // ========================================================================
  describe("getBankIncome", () => {
    it("should call creditBankIncomeGet with user token", async () => {
      mockCreditBankIncomeGet.mockResolvedValue(mockBankIncomeResponse);

      await plaidIncomeService.getBankIncome("user-token-abc");

      expect(mockCreditBankIncomeGet).toHaveBeenCalledTimes(1);
      expect(mockCreditBankIncomeGet).toHaveBeenCalledWith({
        user_token: "user-token-abc",
      });
    });

    it("should return mapped bank income items", async () => {
      mockCreditBankIncomeGet.mockResolvedValue(mockBankIncomeResponse);

      const result = await plaidIncomeService.getBankIncome("user-token-abc");

      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.itemId).toBe("item-bi-1");
      expect(item.institutionId).toBe("ins-123");
      expect(item.institutionName).toBe("Chase");
      expect(item.lastUpdatedTime).toBe("2026-02-28T12:00:00Z");
    });

    it("should return income sources for each item", async () => {
      mockCreditBankIncomeGet.mockResolvedValue(mockBankIncomeResponse);

      const result = await plaidIncomeService.getBankIncome("user-token-abc");

      const sources = result.items[0].incomeSources;
      expect(sources).toHaveLength(2);

      expect(sources[0].incomeSourceId).toBe("src-1");
      expect(sources[0].incomeDescription).toBe("PAYROLL ACME CORP");
      expect(sources[0].incomeCategory).toBe("SALARY");
      expect(sources[0].payFrequency).toBe("BIWEEKLY");
      expect(sources[0].totalAmount).toBe(102000);
      expect(sources[0].transactionCount).toBe(26);
      expect(sources[0].currency).toBeNull();

      expect(sources[1].incomeSourceId).toBe("src-2");
      expect(sources[1].incomeDescription).toBe("SIDE GIG LLC");
      expect(sources[1].incomeCategory).toBe("OTHER");
      expect(sources[1].payFrequency).toBe("MONTHLY");
      expect(sources[1].totalAmount).toBe(12000);
    });

    it("should return request ID", async () => {
      mockCreditBankIncomeGet.mockResolvedValue(mockBankIncomeResponse);

      const result = await plaidIncomeService.getBankIncome("user-token-abc");

      expect(result.requestId).toBe("req-bi-1");
    });

    it("should handle empty bank income reports", async () => {
      const emptyResponse = {
        data: {
          bank_income: [],
          request_id: "req-empty-bi",
        },
      };
      mockCreditBankIncomeGet.mockResolvedValue(emptyResponse);

      const result = await plaidIncomeService.getBankIncome("user-token-abc");

      expect(result.items).toEqual([]);
    });

    it("should handle bank income with no items", async () => {
      const noItemsResponse = {
        data: {
          bank_income: [{ items: [] }],
          request_id: "req-no-items",
        },
      };
      mockCreditBankIncomeGet.mockResolvedValue(noItemsResponse);

      const result = await plaidIncomeService.getBankIncome("user-token-abc");

      expect(result.items).toEqual([]);
    });

    it("should handle bank income items with no income sources", async () => {
      const noSourcesResponse = {
        data: {
          bank_income: [
            {
              items: [
                {
                  item_id: "item-1",
                  institution_id: null,
                  institution_name: null,
                  last_updated_time: null,
                  bank_income_sources: [],
                },
              ],
            },
          ],
          request_id: "req-no-sources",
        },
      };
      mockCreditBankIncomeGet.mockResolvedValue(noSourcesResponse);

      const result = await plaidIncomeService.getBankIncome("user-token-abc");

      expect(result.items).toHaveLength(1);
      expect(result.items[0].incomeSources).toEqual([]);
      expect(result.items[0].institutionId).toBeNull();
      expect(result.items[0].institutionName).toBeNull();
    });

    it("should throw when user token is empty", async () => {
      await expect(plaidIncomeService.getBankIncome("")).rejects.toThrow(
        "User token is required",
      );
      expect(mockCreditBankIncomeGet).not.toHaveBeenCalled();
    });

    it("should handle 404 not found errors", async () => {
      const notFoundError = new Error("Not found");
      (notFoundError as unknown as Record<string, unknown>).response = {
        status: 404,
        data: {
          error_type: "INVALID_RESULT",
          error_code: "NO_ACCOUNTS",
          error_message: "No bank income data found",
        },
      };
      mockCreditBankIncomeGet.mockRejectedValue(notFoundError);

      await expect(
        plaidIncomeService.getBankIncome("user-token-abc"),
      ).rejects.toThrow("NO_ACCOUNTS");
    });

    it("should handle 500 server errors", async () => {
      const serverError = new Error("Server error");
      (serverError as unknown as Record<string, unknown>).response = {
        status: 500,
        data: {
          error_type: "API_ERROR",
          error_code: "INTERNAL_SERVER_ERROR",
          error_message: "An internal server error occurred",
        },
      };
      mockCreditBankIncomeGet.mockRejectedValue(serverError);

      await expect(
        plaidIncomeService.getBankIncome("user-token-abc"),
      ).rejects.toThrow("INTERNAL_SERVER_ERROR");
    });
  });

  // ========================================================================
  // refreshBankIncome
  // ========================================================================
  describe("refreshBankIncome", () => {
    it("should call creditBankIncomeRefresh with user token", async () => {
      mockCreditBankIncomeRefresh.mockResolvedValue(mockRefreshResponse);

      await plaidIncomeService.refreshBankIncome("user-token-abc");

      expect(mockCreditBankIncomeRefresh).toHaveBeenCalledTimes(1);
      expect(mockCreditBankIncomeRefresh).toHaveBeenCalledWith({
        user_token: "user-token-abc",
        options: undefined,
      });
    });

    it("should return request ID", async () => {
      mockCreditBankIncomeRefresh.mockResolvedValue(mockRefreshResponse);

      const result =
        await plaidIncomeService.refreshBankIncome("user-token-abc");

      expect(result.requestId).toBe("req-refresh-1");
    });

    it("should pass days_requested option", async () => {
      mockCreditBankIncomeRefresh.mockResolvedValue(mockRefreshResponse);

      await plaidIncomeService.refreshBankIncome("user-token-abc", 90);

      expect(mockCreditBankIncomeRefresh).toHaveBeenCalledWith({
        user_token: "user-token-abc",
        options: { days_requested: 90 },
      });
    });

    it("should throw when user token is empty", async () => {
      await expect(plaidIncomeService.refreshBankIncome("")).rejects.toThrow(
        "User token is required",
      );
      expect(mockCreditBankIncomeRefresh).not.toHaveBeenCalled();
    });

    it("should throw when SDK call rejects", async () => {
      mockCreditBankIncomeRefresh.mockRejectedValue(
        new Error("PRODUCT_NOT_READY"),
      );

      await expect(
        plaidIncomeService.refreshBankIncome("user-token-abc"),
      ).rejects.toThrow("PRODUCT_NOT_READY");
    });

    it("should propagate rate limit errors", async () => {
      const rateLimitError = new Error("Rate limit");
      (rateLimitError as unknown as Record<string, unknown>).response = {
        status: 429,
        data: {
          error_type: "RATE_LIMIT_EXCEEDED",
          error_code: "RATE_LIMIT",
          error_message: "Too many requests",
        },
      };
      mockCreditBankIncomeRefresh.mockRejectedValue(rateLimitError);

      await expect(
        plaidIncomeService.refreshBankIncome("user-token-abc"),
      ).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });
  });

  // ========================================================================
  // Module Exports
  // ========================================================================
  describe("Module Exports", () => {
    it("should export plaidIncomeService as a singleton", () => {
      expect(plaidIncomeService).toBeDefined();
      expect(typeof plaidIncomeService.createIncomeVerification).toBe(
        "function",
      );
      expect(typeof plaidIncomeService.getPaystubs).toBe("function");
      expect(typeof plaidIncomeService.getTaxForms).toBe("function");
      expect(typeof plaidIncomeService.getBankIncome).toBe("function");
      expect(typeof plaidIncomeService.refreshBankIncome).toBe("function");
    });

    it("should export default as the same singleton", () => {
      const defaultExport = require("../plaid-income-service").default;
      expect(defaultExport).toBe(plaidIncomeService);
    });
  });
});
