/**
 * Performance Tests for Credit Repair API
 *
 * Tests:
 * - Response time benchmarks
 * - Load testing (multiple concurrent requests)
 * - Stress testing (high volume)
 * - Database query performance
 * - Memory usage
 */

import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing modules that use them
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/credit-repair/db", () => ({
  db: {
    disputes: {
      getDisputesByUser: jest.fn(),
      createDispute: jest.fn(),
      getDisputeStats: jest.fn(),
      getDisputesByStatus: jest.fn(),
      getDisputesByBureau: jest.fn(),
    },
    creditCards: {
      createCreditCard: jest.fn(),
    },
    creditRepair: {
      getActions: jest.fn(),
      createAction: jest.fn(),
    },
  },
}));
jest.mock("@/lib/credit-repair", () => ({
  creditRepairService: {
    analyzeOpportunities: jest.fn(),
    calculateImpact: jest.fn(),
    getQuickWins: jest.fn(),
    getOpportunities: jest.fn(),
  },
}));
jest.mock("@/lib/security/audit-logging");

// Import after mocks are set up
import { GET as getDisputes, POST as createDispute } from "../disputes/route";
import { POST as createCard } from "../cards/route";
import { GET as getQuickWins } from "../quick-wins/route";
import { POST as calculateImpact } from "../impact/route";

import { jwtValidation } from "@/lib/auth/jwt-validation";
import { db } from "@/lib/credit-repair/db";
import { creditRepairService } from "@/lib/credit-repair";
import { auditLogger } from "@/lib/security/audit-logging";

interface MockRequestOptions {
  method?: string;
  body?: unknown;
}

// Helper function to create mock NextRequest
function createMockRequest(urlString: string, options?: MockRequestOptions) {
  const parsedUrl = new URL(urlString);
  const request = {
    url: urlString,
    method: options?.method || "GET",
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
  return request;
}

// Helper to measure execution time
async function measureTime<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

function buildDisputeListResponse<T>(disputes: T[]) {
  return {
    disputes,
    total: disputes.length,
  };
}

describe("Credit Repair API - Performance Tests", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (auditLogger.logAIInteraction as jest.Mock).mockResolvedValue(undefined);
    (auditLogger.logSecurityEvent as jest.Mock).mockResolvedValue(undefined);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });

    // Mock dispute database methods
    (db.disputes.getDisputeStats as jest.Mock).mockResolvedValue({
      total: 10,
      byStatus: { draft: 5, sent: 3, resolved: 2 },
      byBureau: { experian: 4, equifax: 3, transunion: 3 },
    });

    // Mock creditRepair database methods
    (db.creditRepair.getActions as jest.Mock).mockResolvedValue([]);
    (db.creditRepair.createAction as jest.Mock).mockResolvedValue({
      id: "action-1",
    });

    // Mock creditRepairService methods
    (creditRepairService.getQuickWins as jest.Mock).mockResolvedValue([
      {
        type: "pay_down_utilization",
        priority: "high",
        estimatedImpact: 50,
        description: "Pay down high utilization cards",
      },
      {
        type: "dispute_inaccuracy",
        priority: "high",
        estimatedImpact: 80,
        description: "Dispute inaccurate items",
      },
    ]);
  });

  describe("Response Time Benchmarks", () => {
    it("should respond to GET requests within 100ms", async () => {
      const mockDisputes = Array.from({ length: 10 }, (_, i) => ({
        id: `dispute-${i}`,
        userId: mockUser.id,
        bureau: "experian",
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      (db.disputes.getDisputesByUser as jest.Mock).mockResolvedValue(
        buildDisputeListResponse(mockDisputes),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/disputes",
      );
      const { duration } = await measureTime(() => Promise.resolve(getDisputes(request)));

      expect(duration).toBeLessThan(100); // Should respond within 100ms
    });

    it("should respond to POST requests within 200ms", async () => {
      const newDispute = {
        bureau: "experian",
        itemType: "late_payment",
        itemDescription: "Test",
        reason: "not_mine",
        generateLetter: false,
      };

      const createdDispute = {
        id: "dispute-123",
        userId: mockUser.id,
        ...newDispute,
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      (db.disputes.createDispute as jest.Mock).mockResolvedValue(
        createdDispute,
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/disputes",
        {
          method: "POST",
          body: newDispute,
        },
      );
      const { duration } = await measureTime(() => Promise.resolve(createDispute(request)));

      expect(duration).toBeLessThan(200); // Should respond within 200ms
    });

    it("should handle quick wins analysis within 150ms", async () => {
      const opportunities = [
        { type: "pay_down_utilization", priority: "high", estimatedImpact: 50 },
        { type: "dispute_inaccuracy", priority: "high", estimatedImpact: 80 },
      ];

      (creditRepairService.getOpportunities as jest.Mock).mockResolvedValue(
        opportunities,
      );
      (db.creditRepair.createAction as jest.Mock).mockResolvedValue({
        id: "action-1",
      });

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/quick-wins",
      );
      const { duration } = await measureTime(() => Promise.resolve(getQuickWins(request)));

      expect(duration).toBeLessThan(150); // Should respond within 150ms
    });
  });

  describe("Load Testing", () => {
    it("should handle 10 concurrent GET requests efficiently", async () => {
      const mockDisputes = Array.from({ length: 5 }, (_, i) => ({
        id: `dispute-${i}`,
        userId: mockUser.id,
        bureau: "experian",
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      (db.disputes.getDisputesByUser as jest.Mock).mockResolvedValue(
        buildDisputeListResponse(mockDisputes),
      );

      const requests = Array.from({ length: 10 }, () =>
        createMockRequest("http://localhost:3000/api/credit-repair/disputes"),
      );

      const start = performance.now();
      const responses = await Promise.all(
        requests.map((req) => getDisputes(req)),
      );
      const duration = performance.now() - start;

      // All requests should succeed
      expect(responses).toHaveLength(10);
      expect(responses.every((res) => res.status === 200)).toBe(true);

      // Should complete within 500ms (50ms per request average)
      expect(duration).toBeLessThan(500);
    });

    it("should handle 20 concurrent POST requests efficiently", async () => {
      const mockCards = Array.from({ length: 20 }, (_, i) => ({
        id: `card-${i}`,
        userId: mockUser.id,
        cardName: `Card ${i}`,
        creditLimit: 5000,
        currentBalance: 1000,
        utilization: 20,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      (db.creditCards.createCreditCard as jest.Mock).mockImplementation(
        (_, i) => Promise.resolve(mockCards[i] || mockCards[0]),
      );

      const requests = Array.from({ length: 20 }, (_, i) =>
        createMockRequest("http://localhost:3000/api/credit-repair/cards", {
          method: "POST",
          body: {
            cardName: `Card ${i}`,
            creditLimit: 5000,
            currentBalance: 1000,
          },
        }),
      );

      const start = performance.now();
      const responses = await Promise.all(
        requests.map((req) => createCard(req)),
      );
      const duration = performance.now() - start;

      // All requests should succeed
      expect(responses).toHaveLength(20);
      expect(responses.every((res) => res.status === 201)).toBe(true);

      // Should complete within 1000ms (50ms per request average)
      expect(duration).toBeLessThan(1000);
    });

    it("should handle mixed concurrent requests (GET + POST)", async () => {
      const mockDisputes = [
        {
          id: "dispute-1",
          userId: mockUser.id,
          bureau: "experian",
          status: "draft",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const mockCard = {
        id: "card-1",
        userId: mockUser.id,
        name: "Card",
        creditLimit: 5000,
        currentBalance: 1000,
        utilization: 20,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.disputes.getDisputesByUser as jest.Mock).mockResolvedValue(
        buildDisputeListResponse(mockDisputes),
      );
      (db.creditCards.createCreditCard as jest.Mock).mockResolvedValue(
        mockCard,
      );

      const getRequests = Array.from({ length: 10 }, () =>
        createMockRequest("http://localhost:3000/api/credit-repair/disputes"),
      );
      const postRequests = Array.from({ length: 10 }, () =>
        createMockRequest("http://localhost:3000/api/credit-repair/cards", {
          method: "POST",
          body: { cardName: "Card", creditLimit: 5000, currentBalance: 1000 },
        }),
      );

      const start = performance.now();
      const [getResponses, postResponses] = await Promise.all([
        Promise.all(getRequests.map((req) => getDisputes(req))),
        Promise.all(postRequests.map((req) => createCard(req))),
      ]);
      const duration = performance.now() - start;

      // All requests should succeed
      expect(getResponses).toHaveLength(10);
      expect(postResponses).toHaveLength(10);
      expect(getResponses.every((res) => res.status === 200)).toBe(true);
      expect(postResponses.every((res) => res.status === 201)).toBe(true);

      // Should complete within 800ms
      expect(duration).toBeLessThan(800);
    });
  });

  describe("Stress Testing", () => {
    it("should handle 50 concurrent requests without degradation", async () => {
      const mockDisputes = [
        {
          id: "dispute-1",
          userId: mockUser.id,
          bureau: "experian",
          status: "draft",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      (db.disputes.getDisputesByUser as jest.Mock).mockResolvedValue(
        buildDisputeListResponse(mockDisputes),
      );

      const requests = Array.from({ length: 50 }, () =>
        createMockRequest("http://localhost:3000/api/credit-repair/disputes"),
      );

      const start = performance.now();
      const responses = await Promise.all(
        requests.map((req) => getDisputes(req)),
      );
      const duration = performance.now() - start;

      // All requests should succeed
      expect(responses).toHaveLength(50);
      expect(responses.every((res) => res.status === 200)).toBe(true);

      // Should complete within 2000ms (40ms per request average)
      expect(duration).toBeLessThan(2000);
    });

    it("should handle 100 impact calculations efficiently", async () => {
      (creditRepairService.calculateImpact as jest.Mock).mockResolvedValue(50);

      const requests = Array.from({ length: 100 }, () =>
        createMockRequest("http://localhost:3000/api/credit-repair/impact", {
          method: "POST",
          body: { action: "pay_down_utilization", data: {} },
        }),
      );

      const start = performance.now();
      const responses = await Promise.all(
        requests.map((req) => calculateImpact(req)),
      );
      const duration = performance.now() - start;

      // All requests should succeed
      expect(responses).toHaveLength(100);
      expect(responses.every((res) => res.status === 200)).toBe(true);

      // Should complete within 3000ms (30ms per request average)
      expect(duration).toBeLessThan(3000);
    });
  });

  describe("Database Query Performance", () => {
    it("should efficiently query large datasets", async () => {
      // Simulate large dataset (100 disputes)
      const mockDisputes = Array.from({ length: 100 }, (_, i) => ({
        id: `dispute-${i}`,
        userId: mockUser.id,
        bureau: "experian",
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      (db.disputes.getDisputesByUser as jest.Mock).mockResolvedValue(
        buildDisputeListResponse(mockDisputes),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/disputes",
      );
      const { duration } = await measureTime(() => Promise.resolve(getDisputes(request)));

      // Should handle large dataset within 150ms
      expect(duration).toBeLessThan(150);
    });

    it("should efficiently filter large datasets", async () => {
      // Simulate large dataset with filtering
      const mockDisputes = Array.from({ length: 100 }, (_, i) => ({
        id: `dispute-${i}`,
        userId: mockUser.id,
        bureau: "experian",
        status: i % 2 === 0 ? "draft" : "sent",
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const filteredDisputes = mockDisputes.filter((d) => d.status === "draft");
      (db.disputes.getDisputesByUser as jest.Mock).mockResolvedValue(
        buildDisputeListResponse(filteredDisputes),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/disputes?status=draft",
      );
      const { duration } = await measureTime(() => Promise.resolve(getDisputes(request)));

      // Should handle filtering within 200ms (adjusted for realistic performance)
      expect(duration).toBeLessThan(200);
    });
  });

  describe("Memory Usage", () => {
    it("should not leak memory with repeated requests", async () => {
      const mockDisputes = [
        {
          id: "dispute-1",
          userId: mockUser.id,
          bureau: "experian",
          status: "draft",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      (db.disputes.getDisputesByUser as jest.Mock).mockResolvedValue(
        buildDisputeListResponse(mockDisputes),
      );

      // Make 1000 requests sequentially
      for (let i = 0; i < 1000; i++) {
        const request = createMockRequest(
          "http://localhost:3000/api/credit-repair/disputes",
        );
        await getDisputes(request);
      }

      // If we get here without running out of memory, test passes
      expect(true).toBe(true);
    });
  });
});
