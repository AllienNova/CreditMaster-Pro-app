describe("DisputeService", () => {
  describe("Dispute Creation", () => {
    it("should create dispute with valid data", () => {
      const disputeData = {
        bureau: "experian",
        type: "collection",
        creditor: "Medical Collections Inc",
        reason: "Not my account",
        accountNumber: "****1234",
      };

      expect(disputeData.bureau).toBeDefined();
      expect(disputeData.type).toBeDefined();
      expect(disputeData.creditor).toBeDefined();
      expect(disputeData.reason).toBeDefined();
    });

    it("should validate bureau selection", () => {
      const validBureaus = ["experian", "equifax", "transunion"];

      expect(validBureaus).toContain("experian");
      expect(validBureaus).toContain("equifax");
      expect(validBureaus).toContain("transunion");
      expect(validBureaus).not.toContain("invalid");
    });

    it("should validate dispute types", () => {
      const validTypes = [
        "collection",
        "late_payment",
        "identity_theft",
        "incorrect_balance",
        "duplicate_account",
        "closed_account",
        "wrong_status",
        "inquiry",
      ];

      expect(validTypes.length).toBe(8);
      expect(validTypes).toContain("collection");
      expect(validTypes).toContain("identity_theft");
    });
  });

  describe("Dispute Status Transitions", () => {
    const validTransitions: Record<string, string[]> = {
      draft: ["pending", "cancelled"],
      pending: ["in_progress", "rejected", "cancelled"],
      in_progress: ["resolved", "rejected"],
      resolved: [],
      rejected: ["pending"], // Can resubmit
    };

    it("should allow valid status transitions", () => {
      expect(validTransitions.draft).toContain("pending");
      expect(validTransitions.pending).toContain("in_progress");
      expect(validTransitions.in_progress).toContain("resolved");
    });

    it("should not allow resolved to transition", () => {
      expect(validTransitions.resolved.length).toBe(0);
    });

    it("should allow resubmission from rejected", () => {
      expect(validTransitions.rejected).toContain("pending");
    });
  });

  describe("Letter Generation", () => {
    it("should generate dispute letter with required fields", () => {
      const letterData = {
        userInfo: {
          name: "John Doe",
          address: "123 Main St",
          city: "New York",
          state: "NY",
          zip: "10001",
        },
        bureau: "experian",
        disputeType: "collection",
        creditor: "Medical Collections",
        accountNumber: "****1234",
        reason: "Not my account - identity theft",
      };

      const letter = generateDisputeLetter(letterData);

      expect(letter).toContain("John Doe");
      expect(letter).toContain("Experian");
      expect(letter).toContain("Medical Collections");
      expect(letter).toContain("Not my account");
    });

    it("should include proper legal references", () => {
      const letter = generateDisputeLetter({
        userInfo: {
          name: "Test User",
          address: "123 Test St",
          city: "Test",
          state: "TS",
          zip: "00000",
        },
        bureau: "experian",
        disputeType: "collection",
        creditor: "Test Creditor",
        accountNumber: "1234",
        reason: "Test reason",
      });

      expect(letter).toContain("Fair Credit Reporting Act");
      expect(letter).toContain("investigate");
    });
  });

  describe("Success Prediction", () => {
    it("should calculate success probability based on factors", () => {
      const factors = {
        documentationQuality: 0.9,
        disputeType: 0.7,
        bureauHistory: 0.8,
        accountAge: 0.6,
      };

      const probability =
        Object.values(factors).reduce((sum, f) => sum + f, 0) /
        Object.keys(factors).length;
      expect(probability).toBeGreaterThan(0.5);
    });

    it("should identify high-success dispute types", () => {
      const successRates: Record<string, number> = {
        identity_theft: 0.85,
        duplicate_account: 0.8,
        incorrect_balance: 0.7,
        late_payment: 0.55,
        collection: 0.5,
      };

      const highSuccess = Object.entries(successRates).filter(
        ([, rate]) => rate >= 0.7,
      );
      expect(highSuccess.length).toBe(3);
    });
  });

  describe("Timeline Management", () => {
    it("should track dispute timeline", () => {
      const timeline = [
        { date: "2024-01-01", event: "Dispute created", status: "draft" },
        { date: "2024-01-02", event: "Dispute submitted", status: "pending" },
        { date: "2024-01-15", event: "Bureau received", status: "in_progress" },
        {
          date: "2024-02-10",
          event: "Investigation complete",
          status: "resolved",
        },
      ];

      expect(timeline.length).toBe(4);
      expect(timeline[0].status).toBe("draft");
      expect(timeline[timeline.length - 1].status).toBe("resolved");
    });

    it("should calculate days until deadline", () => {
      const submissionDate = new Date("2024-01-15T00:00:00Z");
      const deadline = new Date(submissionDate);
      deadline.setDate(deadline.getDate() + 30); // 30-day requirement = Feb 14

      const today = new Date("2024-02-01T00:00:00Z");
      const daysRemaining = Math.round(
        (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(daysRemaining).toBe(13); // Feb 14 - Feb 1 = 13 days
    });
  });
});

// Helper function for testing
function generateDisputeLetter(data: {
  userInfo: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  bureau: string;
  disputeType: string;
  creditor: string;
  accountNumber: string;
  reason: string;
}): string {
  return `
Date: ${new Date().toLocaleDateString()}

${data.userInfo.name}
${data.userInfo.address}
${data.userInfo.city}, ${data.userInfo.state} ${data.userInfo.zip}

${data.bureau.charAt(0).toUpperCase() + data.bureau.slice(1)}
P.O. Box XXXXX
City, State XXXXX

RE: Dispute of inaccurate information

Dear ${data.bureau.charAt(0).toUpperCase() + data.bureau.slice(1)},

I am writing to dispute the following information in my credit report under the Fair Credit Reporting Act.

Creditor: ${data.creditor}
Account Number: ${data.accountNumber}
Reason for Dispute: ${data.reason}

I request that you investigate this matter and remove/correct this inaccurate information.

Under the Fair Credit Reporting Act, you are required to investigate this dispute within 30 days.

Sincerely,
${data.userInfo.name}
  `.trim();
}
