/**
 * @jest-environment node
 */

/**
 * Plaid Liabilities Service Unit Tests
 *
 * Tests for credit card, student loan, and mortgage liability retrieval via Plaid SDK.
 */

// Environment variables
process.env.PLAID_CLIENT_ID = "test-client-id";
process.env.PLAID_SECRET = "test-secret";
process.env.PLAID_ENV = "sandbox";

// Plaid SDK mocks
const mockLiabilitiesGet = jest.fn();

jest.mock("@/lib/financial/plaid-client", () => ({
  getPlaidClient: () => ({
    liabilitiesGet: mockLiabilitiesGet,
  }),
}));

import {
  plaidLiabilitiesService,
  PlaidCreditLiability,
  PlaidStudentLoan,
  PlaidMortgage,
} from "../plaid-liabilities-service";

// ==========================================================================
// Mock Data
// ==========================================================================

const mockLiabilitiesResponse = {
  data: {
    accounts: [
      {
        account_id: "acc-credit-1",
        name: "Chase Sapphire",
        type: "credit",
      },
      {
        account_id: "acc-student-1",
        name: "Federal Student Loan",
        type: "loan",
      },
      {
        account_id: "acc-mortgage-1",
        name: "Home Mortgage",
        type: "loan",
      },
    ],
    item: { item_id: "item-123" },
    liabilities: {
      credit: [
        {
          account_id: "acc-credit-1",
          is_overdue: false,
          last_payment_amount: 500,
          last_payment_date: "2026-02-15",
          last_statement_issue_date: "2026-02-01",
          last_statement_balance: 2500,
          minimum_payment_amount: 50,
          next_payment_due_date: "2026-03-01",
          aprs: [
            {
              apr_percentage: 18.99,
              apr_type: "purchase_apr",
              balance_subject_to_apr: 2500,
              interest_charge_amount: 39.56,
            },
            {
              apr_percentage: 24.99,
              apr_type: "cash_advance_apr",
              balance_subject_to_apr: null,
              interest_charge_amount: null,
            },
          ],
        },
      ],
      student: [
        {
          account_id: "acc-student-1",
          account_number: "STUD-12345",
          disbursement_dates: ["2020-08-15", "2021-01-15"],
          expected_payoff_date: "2035-08-15",
          guarantor: "US Department of Education",
          interest_rate_percentage: 4.5,
          is_overdue: false,
          last_payment_amount: 250,
          last_payment_date: "2026-02-01",
          last_statement_balance: 35000,
          last_statement_issue_date: "2026-01-15",
          loan_name: "Federal Direct Unsubsidized",
          loan_status: { type: "repayment", end_date: null },
          minimum_payment_amount: 200,
          next_payment_due_date: "2026-03-01",
          origination_date: "2020-08-01",
          origination_principal_amount: 50000,
          outstanding_interest_amount: 1200,
          payment_reference_number: "REF-12345",
        },
      ],
      mortgage: [
        {
          account_id: "acc-mortgage-1",
          account_number: "MTG-98765",
          current_late_fee: null,
          escrow_balance: 8500,
          has_pmi: true,
          has_prepayment_penalty: false,
          interest_rate: {
            percentage: 3.25,
            type: "fixed",
          },
          last_payment_amount: 2100,
          last_payment_date: "2026-02-01",
          loan_type_description: "conventional",
          loan_term: "30 year",
          maturity_date: "2054-02-01",
          next_monthly_payment: 2100,
          next_payment_due_date: "2026-03-01",
          origination_date: "2024-02-01",
          origination_principal_amount: 450000,
          past_due_amount: null,
          property_address: {
            city: "San Francisco",
            region: "CA",
            postal_code: "94105",
            country: "US",
            street: "123 Main St",
          },
          ytd_interest_paid: 2400,
          ytd_principal_paid: 1800,
        },
      ],
    },
    request_id: "req-123",
  },
};

// ==========================================================================
// TESTS
// ==========================================================================

describe("PlaidLiabilitiesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // getLiabilities
  // ========================================================================
  describe("getLiabilities", () => {
    it("should call liabilitiesGet with the access token", async () => {
      mockLiabilitiesGet.mockResolvedValue(mockLiabilitiesResponse);

      await plaidLiabilitiesService.getLiabilities("access-token-abc");

      expect(mockLiabilitiesGet).toHaveBeenCalledTimes(1);
      expect(mockLiabilitiesGet).toHaveBeenCalledWith({
        access_token: "access-token-abc",
      });
    });

    it("should return mapped credit liabilities", async () => {
      mockLiabilitiesGet.mockResolvedValue(mockLiabilitiesResponse);

      const result = await plaidLiabilitiesService.getLiabilities("access-token-abc");

      expect(result.credit).toHaveLength(1);
      const c: PlaidCreditLiability = result.credit[0];
      expect(c.accountId).toBe("acc-credit-1");
      expect(c.isOverdue).toBe(false);
      expect(c.lastPaymentAmount).toBe(500);
      expect(c.lastPaymentDate).toBe("2026-02-15");
      expect(c.lastStatementIssueDate).toBe("2026-02-01");
      expect(c.lastStatementBalance).toBe(2500);
      expect(c.minimumPaymentAmount).toBe(50);
      expect(c.nextPaymentDueDate).toBe("2026-03-01");
    });

    it("should map credit APRs correctly", async () => {
      mockLiabilitiesGet.mockResolvedValue(mockLiabilitiesResponse);

      const result = await plaidLiabilitiesService.getLiabilities("access-token-abc");

      const aprs = result.credit[0].aprs;
      expect(aprs).toHaveLength(2);
      expect(aprs[0].aprPercentage).toBe(18.99);
      expect(aprs[0].aprType).toBe("purchase_apr");
      expect(aprs[0].balanceSubjectToApr).toBe(2500);
      expect(aprs[0].interestChargeAmount).toBe(39.56);
      expect(aprs[1].aprPercentage).toBe(24.99);
      expect(aprs[1].balanceSubjectToApr).toBeNull();
      expect(aprs[1].interestChargeAmount).toBeNull();
    });

    it("should return mapped student loan liabilities", async () => {
      mockLiabilitiesGet.mockResolvedValue(mockLiabilitiesResponse);

      const result = await plaidLiabilitiesService.getLiabilities("access-token-abc");

      expect(result.student).toHaveLength(1);
      const s: PlaidStudentLoan = result.student[0];
      expect(s.accountId).toBe("acc-student-1");
      expect(s.accountNumber).toBe("STUD-12345");
      expect(s.disbursementDates).toEqual(["2020-08-15", "2021-01-15"]);
      expect(s.expectedPayoffDate).toBe("2035-08-15");
      expect(s.guarantor).toBe("US Department of Education");
      expect(s.interestRatePercentage).toBe(4.5);
      expect(s.isOverdue).toBe(false);
      expect(s.lastPaymentAmount).toBe(250);
      expect(s.lastPaymentDate).toBe("2026-02-01");
      expect(s.lastStatementBalance).toBe(35000);
      expect(s.lastStatementIssueDate).toBe("2026-01-15");
      expect(s.loanName).toBe("Federal Direct Unsubsidized");
      expect(s.minimumPaymentAmount).toBe(200);
      expect(s.nextPaymentDueDate).toBe("2026-03-01");
      expect(s.originationDate).toBe("2020-08-01");
      expect(s.originationPrincipalAmount).toBe(50000);
      expect(s.outstandingInterestAmount).toBe(1200);
      expect(s.paymentReferenceNumber).toBe("REF-12345");
    });

    it("should return mapped mortgage liabilities", async () => {
      mockLiabilitiesGet.mockResolvedValue(mockLiabilitiesResponse);

      const result = await plaidLiabilitiesService.getLiabilities("access-token-abc");

      expect(result.mortgage).toHaveLength(1);
      const m: PlaidMortgage = result.mortgage[0];
      expect(m.accountId).toBe("acc-mortgage-1");
      expect(m.accountNumber).toBe("MTG-98765");
      expect(m.currentLateFee).toBeNull();
      expect(m.escrowBalance).toBe(8500);
      expect(m.hasPmi).toBe(true);
      expect(m.hasPrepaymentPenalty).toBe(false);
      expect(m.lastPaymentAmount).toBe(2100);
      expect(m.lastPaymentDate).toBe("2026-02-01");
      expect(m.loanTypeDescription).toBe("conventional");
      expect(m.loanTerm).toBe("30 year");
      expect(m.maturityDate).toBe("2054-02-01");
      expect(m.nextMonthlyPayment).toBe(2100);
      expect(m.nextPaymentDueDate).toBe("2026-03-01");
      expect(m.originationDate).toBe("2024-02-01");
      expect(m.originationPrincipalAmount).toBe(450000);
      expect(m.pastDueAmount).toBeNull();
      expect(m.ytdInterestPaid).toBe(2400);
      expect(m.ytdPrincipalPaid).toBe(1800);
    });

    it("should handle null credit array", async () => {
      const response = {
        data: {
          ...mockLiabilitiesResponse.data,
          liabilities: {
            credit: null,
            student: [],
            mortgage: [],
          },
        },
      };
      mockLiabilitiesGet.mockResolvedValue(response);

      const result = await plaidLiabilitiesService.getLiabilities("access-token-abc");

      expect(result.credit).toEqual([]);
    });

    it("should handle null student array", async () => {
      const response = {
        data: {
          ...mockLiabilitiesResponse.data,
          liabilities: {
            credit: [],
            student: null,
            mortgage: [],
          },
        },
      };
      mockLiabilitiesGet.mockResolvedValue(response);

      const result = await plaidLiabilitiesService.getLiabilities("access-token-abc");

      expect(result.student).toEqual([]);
    });

    it("should handle null mortgage array", async () => {
      const response = {
        data: {
          ...mockLiabilitiesResponse.data,
          liabilities: {
            credit: [],
            student: [],
            mortgage: null,
          },
        },
      };
      mockLiabilitiesGet.mockResolvedValue(response);

      const result = await plaidLiabilitiesService.getLiabilities("access-token-abc");

      expect(result.mortgage).toEqual([]);
    });

    it("should handle all null liability arrays", async () => {
      const response = {
        data: {
          ...mockLiabilitiesResponse.data,
          liabilities: {
            credit: null,
            student: null,
            mortgage: null,
          },
        },
      };
      mockLiabilitiesGet.mockResolvedValue(response);

      const result = await plaidLiabilitiesService.getLiabilities("access-token-abc");

      expect(result.credit).toEqual([]);
      expect(result.student).toEqual([]);
      expect(result.mortgage).toEqual([]);
    });

    it("should throw when access token is empty", async () => {
      await expect(
        plaidLiabilitiesService.getLiabilities(""),
      ).rejects.toThrow("Access token is required");
      expect(mockLiabilitiesGet).not.toHaveBeenCalled();
    });

    it("should throw when SDK call rejects", async () => {
      mockLiabilitiesGet.mockRejectedValue(
        new Error("PRODUCT_NOT_READY"),
      );

      await expect(
        plaidLiabilitiesService.getLiabilities("access-token-abc"),
      ).rejects.toThrow("PRODUCT_NOT_READY");
    });

    it("should propagate Plaid API errors", async () => {
      const plaidError = new Error("INVALID_ACCESS_TOKEN");
      (plaidError as unknown as Record<string, unknown>).response = {
        status: 400,
        data: {
          error_type: "INVALID_INPUT",
          error_code: "INVALID_ACCESS_TOKEN",
        },
      };
      mockLiabilitiesGet.mockRejectedValue(plaidError);

      await expect(
        plaidLiabilitiesService.getLiabilities("bad-token"),
      ).rejects.toThrow("INVALID_ACCESS_TOKEN");
    });

    it("should handle empty APRs array", async () => {
      const response = {
        data: {
          ...mockLiabilitiesResponse.data,
          liabilities: {
            credit: [
              {
                account_id: "acc-1",
                is_overdue: null,
                last_payment_amount: null,
                last_payment_date: null,
                last_statement_issue_date: null,
                last_statement_balance: null,
                minimum_payment_amount: null,
                next_payment_due_date: null,
                aprs: [],
              },
            ],
            student: null,
            mortgage: null,
          },
        },
      };
      mockLiabilitiesGet.mockResolvedValue(response);

      const result = await plaidLiabilitiesService.getLiabilities("access-token-abc");

      expect(result.credit[0].aprs).toEqual([]);
    });

    it("should handle credit liability with all null fields", async () => {
      const response = {
        data: {
          ...mockLiabilitiesResponse.data,
          liabilities: {
            credit: [
              {
                account_id: null,
                is_overdue: null,
                last_payment_amount: null,
                last_payment_date: null,
                last_statement_issue_date: null,
                last_statement_balance: null,
                minimum_payment_amount: null,
                next_payment_due_date: null,
                aprs: [],
              },
            ],
            student: null,
            mortgage: null,
          },
        },
      };
      mockLiabilitiesGet.mockResolvedValue(response);

      const result = await plaidLiabilitiesService.getLiabilities("access-token-abc");

      const c = result.credit[0];
      expect(c.accountId).toBeNull();
      expect(c.isOverdue).toBeNull();
      expect(c.lastPaymentAmount).toBeNull();
      expect(c.lastPaymentDate).toBeNull();
      expect(c.lastStatementIssueDate).toBeNull();
      expect(c.lastStatementBalance).toBeNull();
      expect(c.minimumPaymentAmount).toBeNull();
      expect(c.nextPaymentDueDate).toBeNull();
    });

    it("should handle student loan with optional last_statement_balance", async () => {
      const response = {
        data: {
          ...mockLiabilitiesResponse.data,
          liabilities: {
            credit: null,
            student: [
              {
                account_id: "acc-1",
                account_number: null,
                disbursement_dates: null,
                expected_payoff_date: null,
                guarantor: null,
                interest_rate_percentage: 5.0,
                is_overdue: null,
                last_payment_amount: null,
                last_payment_date: null,
                last_statement_issue_date: null,
                loan_name: null,
                loan_status: { type: "deferment", end_date: null },
                minimum_payment_amount: null,
                next_payment_due_date: null,
                origination_date: null,
                origination_principal_amount: null,
                outstanding_interest_amount: null,
                payment_reference_number: null,
              },
            ],
            mortgage: null,
          },
        },
      };
      mockLiabilitiesGet.mockResolvedValue(response);

      const result = await plaidLiabilitiesService.getLiabilities("access-token-abc");

      const s = result.student[0];
      expect(s.lastStatementBalance).toBeNull();
      expect(s.accountNumber).toBeNull();
      expect(s.disbursementDates).toBeNull();
    });
  });

  // ========================================================================
  // getCreditCardLiabilities
  // ========================================================================
  describe("getCreditCardLiabilities", () => {
    it("should return only credit card liabilities", async () => {
      mockLiabilitiesGet.mockResolvedValue(mockLiabilitiesResponse);

      const credit = await plaidLiabilitiesService.getCreditCardLiabilities(
        "access-token-abc",
      );

      expect(credit).toHaveLength(1);
      expect(credit[0].accountId).toBe("acc-credit-1");
    });

    it("should call getLiabilities internally", async () => {
      mockLiabilitiesGet.mockResolvedValue(mockLiabilitiesResponse);

      await plaidLiabilitiesService.getCreditCardLiabilities("access-token-abc");

      expect(mockLiabilitiesGet).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no credit liabilities", async () => {
      const response = {
        data: {
          ...mockLiabilitiesResponse.data,
          liabilities: { credit: null, student: [], mortgage: [] },
        },
      };
      mockLiabilitiesGet.mockResolvedValue(response);

      const credit = await plaidLiabilitiesService.getCreditCardLiabilities(
        "access-token-abc",
      );

      expect(credit).toEqual([]);
    });
  });

  // ========================================================================
  // getStudentLoanLiabilities
  // ========================================================================
  describe("getStudentLoanLiabilities", () => {
    it("should return only student loan liabilities", async () => {
      mockLiabilitiesGet.mockResolvedValue(mockLiabilitiesResponse);

      const student = await plaidLiabilitiesService.getStudentLoanLiabilities(
        "access-token-abc",
      );

      expect(student).toHaveLength(1);
      expect(student[0].accountId).toBe("acc-student-1");
    });

    it("should call getLiabilities internally", async () => {
      mockLiabilitiesGet.mockResolvedValue(mockLiabilitiesResponse);

      await plaidLiabilitiesService.getStudentLoanLiabilities("access-token-abc");

      expect(mockLiabilitiesGet).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no student loans", async () => {
      const response = {
        data: {
          ...mockLiabilitiesResponse.data,
          liabilities: { credit: [], student: null, mortgage: [] },
        },
      };
      mockLiabilitiesGet.mockResolvedValue(response);

      const student = await plaidLiabilitiesService.getStudentLoanLiabilities(
        "access-token-abc",
      );

      expect(student).toEqual([]);
    });
  });

  // ========================================================================
  // getMortgageLiabilities
  // ========================================================================
  describe("getMortgageLiabilities", () => {
    it("should return only mortgage liabilities", async () => {
      mockLiabilitiesGet.mockResolvedValue(mockLiabilitiesResponse);

      const mortgage = await plaidLiabilitiesService.getMortgageLiabilities(
        "access-token-abc",
      );

      expect(mortgage).toHaveLength(1);
      expect(mortgage[0].accountId).toBe("acc-mortgage-1");
    });

    it("should call getLiabilities internally", async () => {
      mockLiabilitiesGet.mockResolvedValue(mockLiabilitiesResponse);

      await plaidLiabilitiesService.getMortgageLiabilities("access-token-abc");

      expect(mockLiabilitiesGet).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no mortgages", async () => {
      const response = {
        data: {
          ...mockLiabilitiesResponse.data,
          liabilities: { credit: [], student: [], mortgage: null },
        },
      };
      mockLiabilitiesGet.mockResolvedValue(response);

      const mortgage = await plaidLiabilitiesService.getMortgageLiabilities(
        "access-token-abc",
      );

      expect(mortgage).toEqual([]);
    });
  });

  // ========================================================================
  // Module Exports
  // ========================================================================
  describe("Module Exports", () => {
    it("should export plaidLiabilitiesService as a singleton", () => {
      expect(plaidLiabilitiesService).toBeDefined();
      expect(typeof plaidLiabilitiesService.getLiabilities).toBe("function");
      expect(typeof plaidLiabilitiesService.getCreditCardLiabilities).toBe("function");
      expect(typeof plaidLiabilitiesService.getStudentLoanLiabilities).toBe("function");
      expect(typeof plaidLiabilitiesService.getMortgageLiabilities).toBe("function");
    });

    it("should export default as the same singleton", () => {
      const defaultExport = require("../plaid-liabilities-service").default;
      expect(defaultExport).toBe(plaidLiabilitiesService);
    });
  });
});
