import { billDetectionService } from "../bill-detection-service";
import type {
  Bill,
  BillPayment,
  BillCreateInput,
  BillUpdateInput,
  BillPaymentInput,
} from "../types/bill.types";

// Mock Supabase — define inside factory to avoid TDZ with jest.mock hoisting
jest.mock("@/lib/supabase/client", () => {
  const _client = { from: jest.fn() };
  return { getSupabase: () => _client };
});

import { getSupabase } from "@/lib/supabase/client";
const supabase = getSupabase() as any;

describe("BillDetectionService", () => {
  const mockUserId = "user-123";
  const mockBillId = "bill-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // BILL CRUD OPERATIONS
  // ==========================================================================

  describe("getBillsByUser", () => {
    it("should fetch all bills for a user", async () => {
      const mockBills = [
        {
          id: "bill-1",
          user_id: mockUserId,
          merchant_name: "Netflix",
          category: "streaming",
          amount: "15.99",
          frequency: "monthly",
          next_due_date: "2025-02-15T00:00:00Z",
          status: "active",
          is_auto_pay: true,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockBills, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await billDetectionService.getBillsByUser(mockUserId);

      expect(supabase.from).toHaveBeenCalledWith("bills");
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", mockUserId);
      expect(result).toHaveLength(1);
      expect(result[0].merchantName).toBe("Netflix");
      expect(result[0].amount).toBe(15.99);
    });

    it("should filter by active status", async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve({ data: [], error: null })),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await billDetectionService.getBillsByUser(mockUserId, {
        activeOnly: true,
      });

      expect(mockQuery.eq).toHaveBeenCalledWith("status", "active");
    });

    it("should filter by category", async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve({ data: [], error: null })),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await billDetectionService.getBillsByUser(mockUserId, {
        category: "streaming",
      });

      expect(mockQuery.eq).toHaveBeenCalledWith("category", "streaming");
    });

    it("should handle database errors", async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest
          .fn()
          .mockResolvedValue({ data: null, error: { message: "DB error" } }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await expect(
        billDetectionService.getBillsByUser(mockUserId),
      ).rejects.toThrow("Failed to fetch bills: DB error");
    });
  });

  describe("getBillById", () => {
    it("should fetch a single bill", async () => {
      const mockBill = {
        id: mockBillId,
        user_id: mockUserId,
        merchant_name: "Spotify",
        category: "streaming",
        amount: "9.99",
        frequency: "monthly",
        next_due_date: "2025-02-10T00:00:00Z",
        status: "active",
        is_auto_pay: false,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBill, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await billDetectionService.getBillById(
        mockBillId,
        mockUserId,
      );

      expect(result).not.toBeNull();
      expect(result?.merchantName).toBe("Spotify");
      expect(result?.amount).toBe(9.99);
    });

    it("should return null if bill not found", async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await billDetectionService.getBillById(
        mockBillId,
        mockUserId,
      );

      expect(result).toBeNull();
    });
  });

  describe("createBill", () => {
    it("should create a new bill", async () => {
      const input: BillCreateInput = {
        merchantName: "Electric Company",
        category: "utilities",
        amount: 120.5,
        frequency: "monthly",
        nextDueDate: new Date("2025-02-20"),
        isAutoPay: true,
      };

      const mockCreatedBill = {
        id: "new-bill-123",
        user_id: mockUserId,
        merchant_name: input.merchantName,
        category: input.category,
        amount: input.amount.toString(),
        frequency: input.frequency,
        next_due_date: input.nextDueDate.toISOString(),
        status: "active",
        is_auto_pay: input.isAutoPay,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: mockCreatedBill, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await billDetectionService.createBill(mockUserId, input);

      expect(supabase.from).toHaveBeenCalledWith("bills");
      expect(result.merchantName).toBe(input.merchantName);
      expect(result.amount).toBe(input.amount);
      expect(result.isAutoPay).toBe(true);
    });

    it("should handle creation errors", async () => {
      const input: BillCreateInput = {
        merchantName: "Test",
        category: "other",
        amount: 50,
        frequency: "monthly",
        nextDueDate: new Date(),
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Insert failed" },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await expect(
        billDetectionService.createBill(mockUserId, input),
      ).rejects.toThrow("Failed to create bill: Insert failed");
    });
  });

  describe("updateBill", () => {
    it("should update a bill", async () => {
      const input: BillUpdateInput = {
        amount: 130.0,
        status: "paused",
      };

      const mockUpdatedBill = {
        id: mockBillId,
        user_id: mockUserId,
        merchant_name: "Electric Company",
        category: "utilities",
        amount: "130.00",
        frequency: "monthly",
        next_due_date: "2025-02-20T00:00:00Z",
        status: "paused",
        is_auto_pay: true,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: new Date().toISOString(),
      };

      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: mockUpdatedBill, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await billDetectionService.updateBill(
        mockBillId,
        mockUserId,
        input,
      );

      expect(result.amount).toBe(130.0);
      expect(result.status).toBe("paused");
    });
  });

  describe("deleteBill", () => {
    it("should delete a bill", async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve({ error: null })),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await billDetectionService.deleteBill(mockBillId, mockUserId);

      expect(supabase.from).toHaveBeenCalledWith("bills");
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith("id", mockBillId);
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", mockUserId);
    });

    it("should handle deletion errors", async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) =>
          resolve({ error: { message: "Delete failed" } }),
        ),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await expect(
        billDetectionService.deleteBill(mockBillId, mockUserId),
      ).rejects.toThrow("Failed to delete bill: Delete failed");
    });
  });

  // ==========================================================================
  // BILL PAYMENTS
  // ==========================================================================

  describe("recordPayment", () => {
    it("should record a bill payment", async () => {
      const mockBill = {
        id: mockBillId,
        user_id: mockUserId,
        merchant_name: "Netflix",
        category: "streaming",
        amount: "15.99",
        frequency: "monthly",
        next_due_date: "2025-02-15T00:00:00Z",
        status: "active",
        is_auto_pay: true,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      const paymentInput: BillPaymentInput = {
        billId: mockBillId,
        amount: 15.99,
        paidDate: new Date("2025-02-14"),
      };

      const mockPayment = {
        id: "payment-123",
        bill_id: mockBillId,
        user_id: mockUserId,
        amount: "15.99",
        paid_date: paymentInput.paidDate.toISOString(),
        due_date: mockBill.next_due_date,
        is_late: false,
        created_at: new Date().toISOString(),
      };

      // Mock getBillById
      const getBillQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBill, error: null }),
      };

      // Mock payment insert
      const insertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPayment, error: null }),
      };

      // Mock bill update
      const updateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBill, error: null }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(getBillQuery) // getBillById
        .mockReturnValueOnce(insertQuery) // insert payment
        .mockReturnValueOnce(updateQuery); // update bill

      const result = await billDetectionService.recordPayment(
        mockUserId,
        paymentInput,
      );

      expect(result.amount).toBe(15.99);
      expect(result.isLate).toBe(false);
    });
  });

  describe("getBillSummary", () => {
    it("should generate bill summary", async () => {
      const mockBills = [
        {
          id: "bill-1",
          user_id: mockUserId,
          merchant_name: "Netflix",
          category: "streaming",
          amount: "15.99",
          frequency: "monthly",
          next_due_date: new Date(
            Date.now() + 10 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 10 days from now
          status: "active",
          is_auto_pay: true,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "bill-2",
          user_id: mockUserId,
          merchant_name: "Electric",
          category: "utilities",
          amount: "120.00",
          frequency: "monthly",
          next_due_date: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 5 days ago (overdue)
          status: "active",
          is_auto_pay: false,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve({ data: mockBills, error: null })),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await billDetectionService.getBillSummary(mockUserId);

      expect(result.totalMonthlyBills).toBeGreaterThan(0);
      expect(result.upcomingBills).toHaveLength(1);
      expect(result.overdueBills).toHaveLength(1);
      expect(result.billsByCategory.streaming).toBe(15.99);
      expect(result.billsByCategory.utilities).toBe(120.0);
    });
  });
});
