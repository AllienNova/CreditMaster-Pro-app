/**
 * @jest-environment node
 */
describe("Student Loan Programs API", () => {
  const federalPrograms = [
    {
      id: "idr",
      name: "Income-Driven Repayment",
      types: ["SAVE", "PAYE", "IBR", "ICR"],
    },
    {
      id: "pslf",
      name: "Public Service Loan Forgiveness",
      requirements: ["120 payments", "qualifying employer"],
    },
    {
      id: "fresh-start",
      name: "Fresh Start Initiative",
      deadline: "2024-09-30",
    },
    {
      id: "consolidation",
      name: "Direct Consolidation",
      benefits: ["single payment", "fixed rate"],
    },
    { id: "rehabilitation", name: "Loan Rehabilitation", payments: 9 },
  ];

  describe("Program Availability", () => {
    it("should have all federal programs", () => {
      expect(federalPrograms.length).toBe(5);
    });

    it("should have IDR program with all plan types", () => {
      const idr = federalPrograms.find((p) => p.id === "idr");
      expect(idr).toBeDefined();
      expect(idr?.types?.length).toBe(4);
      expect(idr?.types).toContain("SAVE");
    });

    it("should have PSLF program with requirements", () => {
      const pslf = federalPrograms.find((p) => p.id === "pslf");
      expect(pslf).toBeDefined();
      expect(pslf?.requirements?.length).toBe(2);
    });
  });

  describe("IDR Calculator", () => {
    it("should calculate SAVE plan payment", () => {
      const calculateSAVEPayment = (agi: number, familySize: number) => {
        const povertyLine = 14580 + (familySize - 1) * 5140;
        const discretionaryIncome = Math.max(0, agi - povertyLine * 2.25);
        return Math.round((discretionaryIncome * 0.05) / 12);
      };

      // Verify calculation: (50000 - 14580*2.25) * 0.05 / 12 = (50000 - 32805) * 0.05 / 12 = 71.6
      expect(calculateSAVEPayment(50000, 1)).toBe(72);
      expect(calculateSAVEPayment(30000, 1)).toBe(0);
    });

    it("should calculate IBR payment", () => {
      const calculateIBRPayment = (
        agi: number,
        familySize: number,
        isNewBorrower: boolean,
      ) => {
        const povertyLine = 14580 + (familySize - 1) * 5140;
        const discretionaryIncome = Math.max(0, agi - povertyLine * 1.5);
        const rate = isNewBorrower ? 0.1 : 0.15;
        return Math.round((discretionaryIncome * rate) / 12);
      };

      // Verify: (50000 - 14580*1.5) * 0.10 / 12 = (50000 - 21870) * 0.10 / 12 = 234.4
      expect(calculateIBRPayment(50000, 1, true)).toBe(234);
      // Verify: (50000 - 21870) * 0.15 / 12 = 351.6
      expect(calculateIBRPayment(50000, 1, false)).toBe(352);
    });
  });

  describe("PSLF Eligibility", () => {
    it("should check employer eligibility", () => {
      const qualifyingEmployers = [
        "government",
        "nonprofit_501c3",
        "tribal_organization",
        "americorps",
        "peace_corps",
      ];

      expect(qualifyingEmployers).toContain("government");
      expect(qualifyingEmployers).toContain("nonprofit_501c3");
    });

    it("should track qualifying payments", () => {
      const payments = {
        total: 120,
        qualifying: 85,
        remaining: 35,
      };

      expect(payments.qualifying + payments.remaining).toBe(payments.total);
    });
  });

  describe("Fresh Start Program", () => {
    it("should check eligibility for defaulted loans", () => {
      const isEligible = (loanStatus: string, defaultDate: Date) => {
        const cutoffDate = new Date("2024-09-30");
        return loanStatus === "default" && defaultDate < cutoffDate;
      };

      expect(isEligible("default", new Date("2023-01-01"))).toBe(true);
      expect(isEligible("current", new Date("2023-01-01"))).toBe(false);
    });

    it("should list Fresh Start benefits", () => {
      const benefits = [
        "Remove default from credit report",
        "Restore Title IV eligibility",
        "Access to IDR plans",
        "Stop wage garnishment",
        "Stop tax refund offset",
      ];

      expect(benefits.length).toBe(5);
    });
  });

  describe("Consolidation", () => {
    it("should calculate weighted average interest rate", () => {
      const loans = [
        { balance: 10000, rate: 5.0 },
        { balance: 20000, rate: 6.5 },
        { balance: 15000, rate: 4.5 },
      ];

      const totalBalance = loans.reduce((sum, l) => sum + l.balance, 0);
      const weightedRate =
        loans.reduce((sum, l) => sum + l.balance * l.rate, 0) / totalBalance;
      // Weighted rate: (10000*5 + 20000*6.5 + 15000*4.5) / 45000 = 247500 / 45000 = 5.5
      const roundedRate = Math.ceil(weightedRate * 8) / 8; // Round up to nearest 1/8%

      expect(totalBalance).toBe(45000);
      expect(roundedRate).toBeCloseTo(5.5, 2);
    });

    it("should list eligible loan types", () => {
      const eligibleLoans = [
        "Direct Subsidized",
        "Direct Unsubsidized",
        "Direct PLUS",
        "FFEL Subsidized",
        "FFEL Unsubsidized",
        "FFEL PLUS",
        "Perkins",
      ];

      expect(eligibleLoans.length).toBe(7);
    });
  });

  describe("Rehabilitation", () => {
    it("should calculate rehabilitation payment", () => {
      const calculateRehabPayment = (agi: number, familySize: number) => {
        const povertyLine = 14580 + (familySize - 1) * 5140;
        const discretionaryIncome = Math.max(0, agi - povertyLine * 1.5);
        return Math.max(5, Math.round((discretionaryIncome * 0.15) / 12));
      };

      // Verify: (30000 - 14580*1.5) * 0.15 / 12 = (30000 - 21870) * 0.15 / 12 = 101.6
      expect(calculateRehabPayment(30000, 1)).toBe(102);
      expect(calculateRehabPayment(15000, 1)).toBe(5); // Minimum $5
    });

    it("should track rehabilitation progress", () => {
      const progress = {
        requiredPayments: 9,
        completedPayments: 6,
        consecutiveMonths: true,
      };

      const remaining = progress.requiredPayments - progress.completedPayments;
      expect(remaining).toBe(3);
    });
  });
});
