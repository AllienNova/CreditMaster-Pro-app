/**
 * Mock Credit Report Generator
 *
 * Generates realistic mock credit reports for development and testing.
 * This allows us to build and test the credit bureau integration without
 * needing actual API access during development.
 */

import {
  MockCreditReportOptions,
  ParsedCreditReport,
  PersonalInfo,
  CreditAccount,
  CreditInquiry,
  PublicRecord,
  AccountType,
  PaymentStatus,
  InquiryType,
  PublicRecordType,
} from "@/types/credit-bureau";

/**
 * Generate a mock credit report
 */
export function generateMockCreditReport(
  options: MockCreditReportOptions,
): ParsedCreditReport {
  const {
    creditScore = randomScore(),
    accountCount = randomInt(5, 15),
    inquiryCount = randomInt(0, 5),
    publicRecordCount = 0,
    includeNegativeItems = false,
  } = options;

  return {
    personalInfo: generatePersonalInfo(),
    creditScore,
    scoreFactors: generateScoreFactors(creditScore),
    accounts: generateAccounts(accountCount, includeNegativeItems),
    inquiries: generateInquiries(inquiryCount),
    publicRecords: generatePublicRecords(publicRecordCount),
  };
}

/**
 * Generate personal information
 */
function generatePersonalInfo(): PersonalInfo {
  const firstNames = ["John", "Jane", "Michael", "Sarah", "David", "Emily"];
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
  ];

  return {
    firstName: randomChoice(firstNames),
    lastName: randomChoice(lastNames),
    middleName: randomChoice(["A", "B", "C", "D", "E"]),
    dateOfBirth: new Date(
      1980 + randomInt(0, 30),
      randomInt(0, 11),
      randomInt(1, 28),
    ),
    ssn: `***-**-${randomInt(1000, 9999)}`, // Last 4 digits only
    addresses: [
      {
        street: `${randomInt(100, 9999)} Main St`,
        city: randomChoice([
          "New York",
          "Los Angeles",
          "Chicago",
          "Houston",
          "Phoenix",
        ]),
        state: randomChoice(["NY", "CA", "IL", "TX", "AZ"]),
        zipCode: `${randomInt(10000, 99999)}`,
        type: "current",
        reportedDate: new Date(),
      },
    ],
    employers: [
      {
        name: randomChoice([
          "Tech Corp",
          "Finance Inc",
          "Healthcare LLC",
          "Retail Co",
        ]),
        position: randomChoice([
          "Manager",
          "Engineer",
          "Analyst",
          "Specialist",
        ]),
        startDate: new Date(2020, 0, 1),
      },
    ],
  };
}

/**
 * Generate score factors
 */
function generateScoreFactors(score: number): string[] {
  const factors: string[] = [];

  if (score < 650) {
    factors.push("High credit utilization");
    factors.push("Recent late payments");
    factors.push("Too many recent inquiries");
  } else if (score < 700) {
    factors.push("Limited credit history");
    factors.push("High balance on revolving accounts");
  } else if (score < 750) {
    factors.push("Short credit history");
    factors.push("Few accounts");
  } else {
    factors.push("Excellent payment history");
    factors.push("Low credit utilization");
    factors.push("Long credit history");
  }

  return factors;
}

/**
 * Generate credit accounts
 */
function generateAccounts(
  count: number,
  includeNegativeItems: boolean,
): Omit<
  CreditAccount,
  "id" | "reportId" | "userId" | "createdAt" | "updatedAt"
>[] {
  const accounts: Omit<
    CreditAccount,
    "id" | "reportId" | "userId" | "createdAt" | "updatedAt"
  >[] = [];

  const accountTypes: AccountType[] = [
    "credit_card",
    "mortgage",
    "auto_loan",
    "student_loan",
    "personal_loan",
  ];

  const creditors = [
    "Chase Bank",
    "Bank of America",
    "Wells Fargo",
    "Citibank",
    "Capital One",
    "Discover",
    "American Express",
    "US Bank",
  ];

  for (let i = 0; i < count; i++) {
    const accountType = randomChoice(accountTypes);
    const balance = randomInt(0, 50000);
    const creditLimit =
      accountType === "credit_card" ? randomInt(balance, 100000) : undefined;
    const openedDate = new Date(2015 + randomInt(0, 8), randomInt(0, 11), 1);

    let paymentStatus: PaymentStatus = "current";
    if (includeNegativeItems && Math.random() < 0.3) {
      paymentStatus = randomChoice<PaymentStatus>([
        "late_30",
        "late_60",
        "late_90",
        "charge_off",
      ]);
    }

    accounts.push({
      accountType,
      accountNumber: `****${randomInt(1000, 9999)}`,
      creditorName: randomChoice(creditors),
      balance,
      creditLimit,
      paymentStatus,
      openedDate,
      lastPaymentDate: new Date(),
      paymentHistory: generatePaymentHistory(24, paymentStatus),
      isDisputed: false,
    });
  }

  return accounts;
}

/**
 * Generate payment history
 */
function generatePaymentHistory(
  months: number,
  currentStatus: PaymentStatus,
): { month: string; status: PaymentStatus; amount?: number }[] {
  const history: { month: string; status: PaymentStatus; amount?: number }[] =
    [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    let status: PaymentStatus = "current";
    if (currentStatus !== "current" && i < 3) {
      status = currentStatus;
    } else if (Math.random() < 0.05) {
      status = "late_30";
    }

    history.push({
      month,
      status,
      amount: randomInt(50, 500),
    });
  }

  return history.reverse();
}

/**
 * Generate credit inquiries
 */
function generateInquiries(
  count: number,
): Omit<CreditInquiry, "id" | "reportId" | "userId" | "createdAt">[] {
  const inquiries: Omit<
    CreditInquiry,
    "id" | "reportId" | "userId" | "createdAt"
  >[] = [];

  const creditors = [
    "Chase Bank",
    "Capital One",
    "Discover",
    "American Express",
    "Wells Fargo",
    "Auto Dealer",
    "Mortgage Lender",
  ];

  for (let i = 0; i < count; i++) {
    const inquiryDate = new Date();
    inquiryDate.setMonth(inquiryDate.getMonth() - randomInt(0, 24));

    inquiries.push({
      inquiryType: randomChoice<InquiryType>(["hard", "soft"]),
      creditorName: randomChoice(creditors),
      inquiryDate,
      isDisputed: false,
    });
  }

  return inquiries;
}

/**
 * Generate public records
 */
function generatePublicRecords(
  count: number,
): Omit<PublicRecord, "id" | "reportId" | "userId" | "createdAt">[] {
  const records: Omit<
    PublicRecord,
    "id" | "reportId" | "userId" | "createdAt"
  >[] = [];

  const recordTypes: PublicRecordType[] = [
    "bankruptcy",
    "judgment",
    "tax_lien",
    "foreclosure",
  ];

  for (let i = 0; i < count; i++) {
    const filingDate = new Date();
    filingDate.setFullYear(filingDate.getFullYear() - randomInt(1, 7));

    records.push({
      recordType: randomChoice(recordTypes),
      filingDate,
      status: randomChoice(["filed", "discharged", "satisfied", "pending"]),
      amount: randomInt(5000, 100000),
      courtName: `${randomChoice(["County", "District", "Superior"])} Court`,
      caseNumber: `${randomInt(2020, 2024)}-${randomInt(1000, 9999)}`,
      isDisputed: false,
    });
  }

  return records;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Generate random credit score
 */
function randomScore(): number {
  // Weighted towards good scores
  const rand = Math.random();
  if (rand < 0.1) return randomInt(300, 550); // Poor
  if (rand < 0.3) return randomInt(550, 650); // Fair
  if (rand < 0.6) return randomInt(650, 700); // Good
  if (rand < 0.85) return randomInt(700, 750); // Very Good
  return randomInt(750, 850); // Excellent
}

/**
 * Generate random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Choose random element from array
 */
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate sample credit reports for all 3 bureaus
 */
export function generateSampleReports(): {
  experian: ParsedCreditReport;
  equifax: ParsedCreditReport;
  transunion: ParsedCreditReport;
} {
  return {
    experian: generateMockCreditReport({
      bureau: "experian",
      creditScore: 720,
      accountCount: 10,
      inquiryCount: 3,
      publicRecordCount: 0,
      includeNegativeItems: false,
    }),
    equifax: generateMockCreditReport({
      bureau: "equifax",
      creditScore: 715,
      accountCount: 9,
      inquiryCount: 2,
      publicRecordCount: 0,
      includeNegativeItems: false,
    }),
    transunion: generateMockCreditReport({
      bureau: "transunion",
      creditScore: 725,
      accountCount: 11,
      inquiryCount: 4,
      publicRecordCount: 0,
      includeNegativeItems: false,
    }),
  };
}
