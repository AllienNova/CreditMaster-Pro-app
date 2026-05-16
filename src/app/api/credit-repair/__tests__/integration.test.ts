/**
 * Integration Tests for Credit Repair API
 *
 * Tests complete user flows across multiple endpoints:
 * - Complete dispute lifecycle
 * - Credit card management flow
 * - Goodwill letter flow
 * - Pay-for-delete negotiation flow
 * - Credit report upload and analysis
 */

import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing modules that use them
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/credit-repair/db", () => ({
  db: {
    disputes: {
      getDisputesByUser: jest.fn(),
      getDispute: jest.fn(),
      createDispute: jest.fn(),
      updateDispute: jest.fn(),
      deleteDispute: jest.fn(),
      getDisputeStats: jest.fn(),
      getDisputesByStatus: jest.fn(),
      getDisputesByBureau: jest.fn(),
    },
    creditCards: {
      getCreditCardsByUser: jest.fn(),
      getCreditCard: jest.fn(),
      createCreditCard: jest.fn(),
      updateCreditCard: jest.fn(),
      deleteCreditCard: jest.fn(),
      calculateTotalUtilization: jest.fn(),
    },
    goodwill: {
      getGoodwillLetter: jest.fn(),
      createGoodwillLetter: jest.fn(),
      updateGoodwillLetter: jest.fn(),
    },
    negotiations: {
      getNegotiation: jest.fn(),
      createNegotiation: jest.fn(),
      updateNegotiation: jest.fn(),
    },
    creditReports: {
      createCreditReport: jest.fn(),
    },
    creditRepair: {
      createAction: jest.fn(),
      getActions: jest.fn(),
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
  disputeService: {
    generateDisputeLetter: jest.fn(),
  },
  negotiationService: {
    generateGoodwillLetter: jest.fn(),
    generateNegotiationScript: jest.fn(),
    calculateSettlement: jest.fn(),
  },
}));
jest.mock("@/lib/security/audit-logging");

// Import after mocks are set up
import { GET as getDisputes, POST as createDispute } from "../disputes/route";
import {
  GET as getDispute,
  PUT as updateDispute,
  DELETE as deleteDispute,
} from "../disputes/[id]/route";
import { GET as getCards, POST as createCard } from "../cards/route";
import { PUT as updateCard, DELETE as deleteCard } from "../cards/[id]/route";
import { POST as createGoodwill } from "../goodwill/route";
import { PUT as updateGoodwill } from "../goodwill/[id]/route";
import { POST as createNegotiation } from "../negotiate/route";
import { PUT as updateNegotiation } from "../negotiate/[id]/route";
import { POST as uploadReport } from "../reports/route";
import { GET as getQuickWins } from "../quick-wins/route";
import { POST as calculateImpact } from "../impact/route";

import { jwtValidation } from "@/lib/auth/jwt-validation";
import { db } from "@/lib/credit-repair/db";
import {
  creditRepairService,
  disputeService,
  negotiationService,
} from "@/lib/credit-repair";
import { auditLogger } from "@/lib/security/audit-logging";

interface MockRequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
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

describe("Credit Repair API - Integration Tests", () => {
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

    // Mock AI services
    (disputeService.generateDisputeLetter as jest.Mock).mockResolvedValue({
      letter: "AI-generated dispute letter",
      strategy: "basic_dispute",
    });
    (negotiationService.generateGoodwillLetter as jest.Mock).mockResolvedValue({
      letter: "AI-generated goodwill letter",
    });
    (
      negotiationService.generateNegotiationScript as jest.Mock
    ).mockResolvedValue({
      phoneScript: "Phone script",
      emailScript: "Email script",
      letterScript: "Letter script",
    });
    (negotiationService.calculateSettlement as jest.Mock).mockReturnValue({
      targetAmount: 2500,
      minAmount: 2000,
      maxAmount: 3000,
    });
    (creditRepairService.getQuickWins as jest.Mock).mockResolvedValue({
      opportunities: [
        { type: "pay_down_utilization", priority: "high", estimatedImpact: 50 },
        { type: "dispute_inaccuracy", priority: "high", estimatedImpact: 80 },
      ],
    });
  });

  describe("Complete Dispute Lifecycle", () => {
    it("should handle complete dispute flow: create → fetch → update → delete", async () => {
      const disputeId = "dispute-123";
      const newDispute = {
        bureau: "experian",
        itemType: "late_payment",
        itemDescription: "Late payment on credit card",
        creditorName: "Chase Bank",
        accountNumber: "****1234",
        balance: 5000,
        inaccuracyType: "not_mine",
        strategy: "basic_dispute",
        generateLetter: true,
      };

      const createdDispute = {
        id: disputeId,
        userId: mockUser.id,
        ...newDispute,
        status: "draft",
        letterContent: "AI-generated dispute letter",
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      // Step 1: Create dispute
      (db.disputes.createDispute as jest.Mock).mockResolvedValue(
        createdDispute,
      );

      const createRequest = createMockRequest(
        "http://localhost:3000/api/credit-repair/disputes",
        {
          method: "POST",
          body: newDispute,
        },
      );
      const createResponse = await createDispute(createRequest);
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(createData.success).toBe(true);
      expect(createData.data.id).toBe(disputeId);
      expect(createData.data.status).toBe("draft");

      // Step 2: Fetch all disputes
      (db.disputes.getDisputesByUser as jest.Mock).mockResolvedValue({
        disputes: [createdDispute],
        total: 1,
      });
      (db.disputes.getDisputeStats as jest.Mock).mockResolvedValue({
        total: 1,
        byStatus: { draft: 1 },
        byBureau: { experian: 1 },
      });

      const fetchRequest = createMockRequest(
        "http://localhost:3000/api/credit-repair/disputes",
      );
      const fetchResponse = await getDisputes(fetchRequest);
      const fetchData = await fetchResponse.json();

      expect(fetchResponse.status).toBe(200);
      expect(fetchData.success).toBe(true);
      expect(fetchData.data.disputes).toHaveLength(1);
      expect(fetchData.data.disputes[0].id).toBe(disputeId);

      // Step 3: Fetch single dispute
      (db.disputes.getDispute as jest.Mock).mockResolvedValue(createdDispute);

      const getRequest = createMockRequest(
        `http://localhost:3000/api/credit-repair/disputes/${disputeId}`,
      );
      const getResponse = await getDispute(getRequest);
      const getData = await getResponse.json();

      expect(getResponse.status).toBe(200);
      expect(getData.success).toBe(true);
      expect(getData.data.id).toBe(disputeId);

      // Step 4: Update dispute status
      const updatedDispute = { ...createdDispute, status: "sent", version: 2 };
      (db.disputes.getDispute as jest.Mock).mockResolvedValue(createdDispute);
      (db.disputes.updateDispute as jest.Mock).mockResolvedValue(
        updatedDispute,
      );

      const updateRequest = createMockRequest(
        `http://localhost:3000/api/credit-repair/disputes/${disputeId}`,
        {
          method: "PUT",
          body: { status: "sent", version: 1 },
        },
      );
      const updateResponse = await updateDispute(updateRequest);
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.success).toBe(true);
      expect(updateData.data.status).toBe("sent");
      expect(updateData.data.version).toBe(2);

      // Step 5: Delete dispute
      (db.disputes.getDispute as jest.Mock).mockResolvedValue(updatedDispute);
      (db.disputes.deleteDispute as jest.Mock).mockResolvedValue(true);

      const deleteRequest = createMockRequest(
        `http://localhost:3000/api/credit-repair/disputes/${disputeId}`,
        {
          method: "DELETE",
        },
      );
      const deleteResponse = await deleteDispute(deleteRequest);
      const deleteData = await deleteResponse.json();

      expect(deleteResponse.status).toBe(200);
      expect(deleteData.success).toBe(true);

      // Verify all operations were called
      expect(db.disputes.createDispute).toHaveBeenCalledTimes(1);
      expect(db.disputes.getDisputesByUser).toHaveBeenCalledTimes(1);
      expect(db.disputes.getDispute).toHaveBeenCalledTimes(1); // Only called in GET endpoint
      expect(db.disputes.updateDispute).toHaveBeenCalledTimes(1);
      expect(db.disputes.deleteDispute).toHaveBeenCalledTimes(1);
    });

    it("should handle optimistic locking conflict during update", async () => {
      const disputeId = "dispute-123";
      const dispute = {
        id: disputeId,
        userId: mockUser.id,
        bureau: "experian",
        status: "draft",
        version: 2, // Current version is 2
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.disputes.getDispute as jest.Mock).mockResolvedValue(dispute);
      (db.disputes.updateDispute as jest.Mock).mockRejectedValue(
        new Error(
          "Dispute has been modified by another process. Please refresh and try again.",
        ),
      );

      // Try to update with old version (1)
      const updateRequest = createMockRequest(
        `http://localhost:3000/api/credit-repair/disputes/${disputeId}`,
        {
          method: "PUT",
          body: { status: "sent", version: 1 }, // Old version
        },
      );
      const updateResponse = await updateDispute(updateRequest);
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(409);
      expect(updateData.error).toBe(
        "Dispute has been modified by another process. Please refresh and try again.",
      );
    });
  });

  describe("Credit Card Management Flow", () => {
    it("should handle complete card flow: create → update balance → recalculate utilization → delete", async () => {
      const cardId = "card-123";
      const newCard = {
        cardName: "Chase Sapphire",
        lastFourDigits: "1234",
        creditLimit: 10000,
        currentBalance: 3000,
        statementClosingDay: 15,
        paymentDueDay: 10,
      };

      const createdCard = {
        id: cardId,
        userId: mockUser.id,
        ...newCard,
        utilization: 30, // Auto-calculated
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      // Step 1: Create card
      (db.creditCards.createCreditCard as jest.Mock).mockResolvedValue(
        createdCard,
      );

      const createRequest = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards",
        {
          method: "POST",
          body: newCard,
        },
      );
      const createResponse = await createCard(createRequest);
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(createData.success).toBe(true);
      expect(createData.data.utilization).toBe(30);

      // Step 2: Update balance (pay down to $1000)
      const updatedCard = {
        ...createdCard,
        currentBalance: 1000,
        utilization: 10, // Auto-recalculated
        version: 2,
      };

      (db.creditCards.getCreditCard as jest.Mock).mockResolvedValue(
        createdCard,
      );
      (db.creditCards.updateCreditCard as jest.Mock).mockResolvedValue(
        updatedCard,
      );

      const updateRequest = createMockRequest(
        `http://localhost:3000/api/credit-repair/cards/${cardId}`,
        {
          method: "PUT",
          body: { currentBalance: 1000, version: 1 },
        },
      );
      const updateResponse = await updateCard(updateRequest);
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.success).toBe(true);
      expect(updateData.data.currentBalance).toBe(1000);
      expect(updateData.data.utilization).toBe(10);

      // Step 3: Fetch all cards
      (db.creditCards.getCreditCardsByUser as jest.Mock).mockResolvedValue([
        updatedCard,
      ]);
      (db.creditCards.calculateTotalUtilization as jest.Mock).mockResolvedValue(
        10,
      );

      const fetchRequest = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards",
      );
      const fetchResponse = await getCards(fetchRequest);
      const fetchData = await fetchResponse.json();

      expect(fetchResponse.status).toBe(200);
      expect(fetchData.success).toBe(true);
      expect(fetchData.data.cards).toHaveLength(1);
      expect(fetchData.data.cards[0].utilization).toBe(10);
      expect(fetchData.data.totalUtilization).toBe(10);

      // Step 4: Delete card
      (db.creditCards.getCreditCard as jest.Mock).mockResolvedValue(
        updatedCard,
      );
      (db.creditCards.deleteCreditCard as jest.Mock).mockResolvedValue(true);

      const deleteRequest = createMockRequest(
        `http://localhost:3000/api/credit-repair/cards/${cardId}`,
        {
          method: "DELETE",
        },
      );
      const deleteResponse = await deleteCard(deleteRequest);
      const deleteData = await deleteResponse.json();

      expect(deleteResponse.status).toBe(200);
      expect(deleteData.success).toBe(true);
    });
  });

  describe("Goodwill Letter Flow", () => {
    it("should handle complete goodwill flow: create with AI → track status → mark sent", async () => {
      const goodwillId = "goodwill-123";
      const newGoodwill = {
        accountId: "account-123",
        creditorName: "Chase Bank",
        latePaymentDate: "2024-01-15",
        reason: "Late payment due to medical emergency",
        accountNumber: "****1234",
        balance: 5000,
        generateLetter: true,
      };

      const createdGoodwill = {
        id: goodwillId,
        userId: mockUser.id,
        ...newGoodwill,
        status: "draft",
        letterContent: "AI-generated goodwill letter",
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      // Step 1: Create goodwill letter with AI generation
      (db.goodwill.createGoodwillLetter as jest.Mock).mockResolvedValue(
        createdGoodwill,
      );

      const createRequest = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill",
        {
          method: "POST",
          body: newGoodwill,
        },
      );
      const createResponse = await createGoodwill(createRequest);
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(createData.success).toBe(true);
      expect(createData.data.letterContent).toBe(
        "AI-generated goodwill letter",
      );

      // Step 2: Update status to sent
      const sentGoodwill = { ...createdGoodwill, status: "sent", version: 2 };
      (db.goodwill.getGoodwillLetter as jest.Mock).mockResolvedValue(
        createdGoodwill,
      );
      (db.goodwill.updateGoodwillLetter as jest.Mock).mockResolvedValue(
        sentGoodwill,
      );

      const updateRequest = createMockRequest(
        `http://localhost:3000/api/credit-repair/goodwill/${goodwillId}`,
        {
          method: "PUT",
          body: { status: "sent", version: 1 },
        },
      );
      const updateResponse = await updateGoodwill(updateRequest);
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.success).toBe(true);
      expect(updateData.data.status).toBe("sent");
    });
  });

  describe("Pay-for-Delete Negotiation Flow", () => {
    it("should handle complete negotiation flow: create → generate scripts → track offers → accept", async () => {
      const negotiationId = "negotiation-123";
      const newNegotiation = {
        collectionId: "collection-123",
        collectionAgency: "Collections Agency",
        originalCreditor: "Original Bank",
        accountNumber: "****5678",
        originalBalance: 5000,
        currentBalance: 5000,
        targetSettlement: 2500,
        generateScript: true,
      };

      const createdNegotiation = {
        id: negotiationId,
        userId: mockUser.id,
        ...newNegotiation,
        status: "draft",
        negotiationScript: "AI-generated negotiation script",
        settlementAmount: 2500, // Auto-calculated (50%)
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      // Step 1: Create negotiation with AI scripts
      (db.negotiations.createNegotiation as jest.Mock).mockResolvedValue(
        createdNegotiation,
      );

      const createRequest = createMockRequest(
        "http://localhost:3000/api/credit-repair/negotiate",
        {
          method: "POST",
          body: newNegotiation,
        },
      );
      const createResponse = await createNegotiation(createRequest);
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(createData.success).toBe(true);
      expect(createData.data.negotiation).toBeDefined();
      expect(createData.data.settlement).toBeDefined();

      // Step 2: Update with counter offer
      const updatedNegotiation = {
        ...createdNegotiation,
        status: "negotiating",
        settlementAmount: 3000,
        version: 2,
      };
      (db.negotiations.getNegotiation as jest.Mock).mockResolvedValue(
        createdNegotiation,
      );
      (db.negotiations.updateNegotiation as jest.Mock).mockResolvedValue(
        updatedNegotiation,
      );

      const updateRequest = createMockRequest(
        `http://localhost:3000/api/credit-repair/negotiate/${negotiationId}`,
        {
          method: "PUT",
          body: { status: "negotiating", settlementAmount: 3000, version: 1 },
        },
      );
      const updateResponse = await updateNegotiation(updateRequest);
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.success).toBe(true);
      expect(updateData.data.status).toBe("negotiating");
      expect(updateData.data.settlementAmount).toBe(3000);

      // Step 3: Mark as accepted
      const acceptedNegotiation = {
        ...updatedNegotiation,
        status: "accepted",
        version: 3,
      };
      (db.negotiations.getNegotiation as jest.Mock).mockResolvedValue(
        updatedNegotiation,
      );
      (db.negotiations.updateNegotiation as jest.Mock).mockResolvedValue(
        acceptedNegotiation,
      );

      const acceptRequest = createMockRequest(
        `http://localhost:3000/api/credit-repair/negotiate/${negotiationId}`,
        {
          method: "PUT",
          body: { status: "accepted", version: 2 },
        },
      );
      const acceptResponse = await updateNegotiation(acceptRequest);
      const acceptData = await acceptResponse.json();

      expect(acceptResponse.status).toBe(200);
      expect(acceptData.success).toBe(true);
      expect(acceptData.data.status).toBe("accepted");
    });
  });

  describe("Credit Report Upload and Analysis Flow", () => {
    it("should handle report upload → analysis → quick wins identification", async () => {
      const reportId = "report-123";
      const newReport = {
        bureau: "experian",
        score: 650,
        reportDate: "2025-01-15",
        reportData: { accounts: [], inquiries: [] },
      };

      const createdReport = {
        id: reportId,
        userId: mockUser.id,
        ...newReport,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Step 1: Upload credit report
      (db.creditReports.createCreditReport as jest.Mock).mockResolvedValue(
        createdReport,
      );

      const uploadRequest = createMockRequest(
        "http://localhost:3000/api/credit-repair/reports",
        {
          method: "POST",
          body: newReport,
        },
      );
      const uploadResponse = await uploadReport(uploadRequest);
      const uploadData = await uploadResponse.json();

      expect(uploadResponse.status).toBe(201);
      expect(uploadData.success).toBe(true);
      expect(uploadData.data.score).toBe(650);

      // Step 2: Get quick wins based on report
      const quickWinsList = [
        {
          id: "pay_down_utilization",
          title: "Pay Down Credit Card",
          description: "Reduce utilization",
          impact: 50,
          timeline: "30 days",
          successRate: 95,
          steps: [],
          cost: 0,
        },
        {
          id: "dispute_errors",
          title: "Dispute Errors",
          description: "Fix inaccuracies",
          impact: 80,
          timeline: "45 days",
          successRate: 85,
          steps: [],
          cost: 0,
        },
      ];
      (creditRepairService.getQuickWins as jest.Mock).mockResolvedValue(
        quickWinsList,
      );
      (db.creditRepair.getActions as jest.Mock).mockResolvedValue([]);
      (db.creditRepair.createAction as jest.Mock).mockResolvedValue({
        id: "action-1",
      });

      const quickWinsRequest = createMockRequest(
        "http://localhost:3000/api/credit-repair/quick-wins",
      );
      const quickWinsResponse = await getQuickWins(quickWinsRequest);
      const quickWinsData = await quickWinsResponse.json();

      expect(quickWinsResponse.status).toBe(200);
      expect(quickWinsData.success).toBe(true);
      expect(quickWinsData.data).toHaveLength(2);

      // Step 3: Calculate impact for specific action
      (creditRepairService.calculateImpact as jest.Mock).mockResolvedValue(50);

      const impactRequest = createMockRequest(
        "http://localhost:3000/api/credit-repair/impact",
        {
          method: "POST",
          body: { action: "pay_down_utilization", data: {} },
        },
      );
      const impactResponse = await calculateImpact(impactRequest);
      const impactData = await impactResponse.json();

      expect(impactResponse.status).toBe(200);
      expect(impactData.success).toBe(true);
      expect(impactData.data.estimatedImpact).toBe(50);
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle multiple simultaneous requests without conflicts", async () => {
      const card1 = {
        id: "card-1",
        userId: mockUser.id,
        cardName: "Card 1",
        creditLimit: 5000,
        currentBalance: 1000,
        utilization: 20,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const card2 = {
        id: "card-2",
        userId: mockUser.id,
        cardName: "Card 2",
        creditLimit: 10000,
        currentBalance: 3000,
        utilization: 30,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const card3 = {
        id: "card-3",
        userId: mockUser.id,
        cardName: "Card 3",
        creditLimit: 15000,
        currentBalance: 5000,
        utilization: 33,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.creditCards.createCreditCard as jest.Mock)
        .mockResolvedValueOnce(card1)
        .mockResolvedValueOnce(card2)
        .mockResolvedValueOnce(card3);

      // Create 3 cards simultaneously
      const requests = [
        createMockRequest("http://localhost:3000/api/credit-repair/cards", {
          method: "POST",
          body: { cardName: "Card 1", creditLimit: 5000, currentBalance: 1000 },
        }),
        createMockRequest("http://localhost:3000/api/credit-repair/cards", {
          method: "POST",
          body: {
            cardName: "Card 2",
            creditLimit: 10000,
            currentBalance: 3000,
          },
        }),
        createMockRequest("http://localhost:3000/api/credit-repair/cards", {
          method: "POST",
          body: {
            cardName: "Card 3",
            creditLimit: 15000,
            currentBalance: 5000,
          },
        }),
      ];

      const responses = await Promise.all(
        requests.map((req) => createCard(req)),
      );
      const data = await Promise.all(responses.map((res) => res.json()));

      // All requests should succeed
      expect(responses.every((res) => res.status === 201)).toBe(true);
      expect(data.every((d) => d.success === true)).toBe(true);
      expect(db.creditCards.createCreditCard).toHaveBeenCalledTimes(3);
    });

    it("should handle concurrent updates with optimistic locking", async () => {
      const disputeId = "dispute-123";
      const dispute = {
        id: disputeId,
        userId: mockUser.id,
        bureau: "experian",
        status: "draft",
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.disputes.getDispute as jest.Mock).mockResolvedValue(dispute);

      // Two concurrent updates with same version
      const request1 = createMockRequest(
        `http://localhost:3000/api/credit-repair/disputes/${disputeId}`,
        {
          method: "PUT",
          body: { status: "sent", version: 1 },
        },
      );
      const request2 = createMockRequest(
        `http://localhost:3000/api/credit-repair/disputes/${disputeId}`,
        {
          method: "PUT",
          body: { status: "under_review", version: 1 },
        },
      );

      // First update succeeds
      (db.disputes.updateDispute as jest.Mock).mockResolvedValueOnce({
        ...dispute,
        status: "sent",
        version: 2,
      });

      const response1 = await updateDispute(request1);
      const data1 = await response1.json();

      expect(response1.status).toBe(200);
      expect(data1.success).toBe(true);

      // Second update should fail due to version mismatch
      (db.disputes.updateDispute as jest.Mock).mockRejectedValueOnce(
        new Error(
          "Dispute has been modified by another process. Please refresh and try again.",
        ),
      );
      const response2 = await updateDispute(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(409);
      expect(data2.error).toContain("modified by another process");
    });
  });
});
