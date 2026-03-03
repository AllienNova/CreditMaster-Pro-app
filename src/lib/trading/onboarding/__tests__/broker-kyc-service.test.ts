/**
 * Broker KYC Service Tests
 *
 * Tests for unified KYC profile validation, multi-broker submission,
 * broker-specific format mapping, and status management.
 */

import { BrokerKycService } from "../broker-kyc-service";
import type { KycProfile } from "../broker-kyc-service";
import type { SupportedBroker } from "@/lib/trading/brokers/broker-interface";

// ============================================================================
// HELPERS
// ============================================================================

function createValidProfile(overrides?: Partial<KycProfile>): KycProfile {
  return {
    userId: "user-001",
    firstName: "Jane",
    lastName: "Doe",
    dateOfBirth: "1990-06-15",
    ssn: "1234",
    address: {
      street: "123 Main St",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "US",
    },
    phone: "+1-555-123-4567",
    email: "jane.doe@example.com",
    employmentStatus: "employed",
    annualIncome: 85000,
    netWorth: 200000,
    investmentExperience: "moderate",
    investmentObjective: "growth",
    riskTolerance: "moderate",
    liquidNetWorth: 75000,
    citizenshipCountry: "US",
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("BrokerKycService", () => {
  let service: BrokerKycService;

  beforeEach(() => {
    service = new BrokerKycService();
  });

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  describe("validateKycProfile", () => {
    it("should accept a fully valid profile", () => {
      const result = service.validateKycProfile(createValidProfile());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject missing required string fields", () => {
      const profile = createValidProfile({
        userId: "",
        firstName: "",
        lastName: "",
        citizenshipCountry: "",
      });
      const result = service.validateKycProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("userId is required");
      expect(result.errors).toContain("firstName is required");
      expect(result.errors).toContain("lastName is required");
      expect(result.errors).toContain("citizenshipCountry is required");
    });

    it("should reject invalid date of birth format", () => {
      const profile = createValidProfile({ dateOfBirth: "06/15/1990" });
      const result = service.validateKycProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "dateOfBirth must be in ISO format (YYYY-MM-DD)",
      );
    });

    it("should reject under-18 applicants", () => {
      const recentYear = new Date().getFullYear() - 10;
      const profile = createValidProfile({
        dateOfBirth: `${recentYear}-01-01`,
      });
      const result = service.validateKycProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Must be at least 18 years old");
    });

    it("should reject unreasonably old dates of birth", () => {
      const profile = createValidProfile({ dateOfBirth: "1880-01-01" });
      const result = service.validateKycProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "dateOfBirth appears invalid (age exceeds 120)",
      );
    });

    it("should reject invalid SSN formats", () => {
      const profile = createValidProfile({ ssn: "12" });
      const result = service.validateKycProfile(profile);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("ssn")),
      ).toBe(true);
    });

    it("should accept 4-digit and full SSN formats", () => {
      const fourDigit = service.validateKycProfile(
        createValidProfile({ ssn: "1234" }),
      );
      expect(fourDigit.valid).toBe(true);

      const fullDash = service.validateKycProfile(
        createValidProfile({ ssn: "123-45-6789" }),
      );
      expect(fullDash.valid).toBe(true);

      const fullNoDash = service.validateKycProfile(
        createValidProfile({ ssn: "123456789" }),
      );
      expect(fullNoDash.valid).toBe(true);
    });

    it("should reject missing address fields", () => {
      const profile = createValidProfile({
        address: {
          street: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
        },
      });
      const result = service.validateKycProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("address.street is required");
      expect(result.errors).toContain("address.city is required");
      expect(result.errors).toContain("address.state is required");
      expect(result.errors).toContain("address.postalCode is required");
      expect(result.errors).toContain("address.country is required");
    });

    it("should reject invalid phone format", () => {
      const profile = createValidProfile({ phone: "abc" });
      const result = service.validateKycProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("phone format is invalid");
    });

    it("should reject invalid email format", () => {
      const profile = createValidProfile({ email: "not-an-email" });
      const result = service.validateKycProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("email format is invalid");
    });

    it("should reject invalid enum values", () => {
      const profile = createValidProfile({
        employmentStatus: "freelance" as "employed",
        investmentExperience: "expert" as "extensive",
        investmentObjective: "gambling" as "speculation",
        riskTolerance: "extreme" as "high",
      });
      const result = service.validateKycProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });

    it("should reject negative numeric fields", () => {
      const profile = createValidProfile({
        annualIncome: -1,
        netWorth: -100,
        liquidNetWorth: -50,
      });
      const result = service.validateKycProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "annualIncome must be a non-negative number",
      );
      expect(result.errors).toContain(
        "netWorth must be a non-negative number",
      );
      expect(result.errors).toContain(
        "liquidNetWorth must be a non-negative number",
      );
    });

    it("should reject liquidNetWorth exceeding netWorth", () => {
      const profile = createValidProfile({
        netWorth: 100000,
        liquidNetWorth: 200000,
      });
      const result = service.validateKycProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "liquidNetWorth cannot exceed netWorth",
      );
    });

    it("should accept zero values for numeric fields", () => {
      const profile = createValidProfile({
        annualIncome: 0,
        netWorth: 0,
        liquidNetWorth: 0,
      });
      const result = service.validateKycProfile(profile);
      expect(result.valid).toBe(true);
    });
  });

  // ==========================================================================
  // SUBMISSION
  // ==========================================================================

  describe("submitKyc", () => {
    it("should submit to a single broker and return submitted status", async () => {
      const results = await service.submitKyc(createValidProfile(), [
        "alpaca",
      ]);
      expect(results).toHaveLength(1);
      expect(results[0].broker).toBe("alpaca");
      expect(results[0].status).toBe("submitted");
      expect(results[0].applicationId).toBeTruthy();
      expect(results[0].estimatedReviewTime).toBe("1-3 business days");
    });

    it("should submit to multiple brokers in parallel", async () => {
      const brokers: SupportedBroker[] = [
        "alpaca",
        "interactive_brokers",
        "schwab",
      ];
      const results = await service.submitKyc(
        createValidProfile(),
        brokers,
      );
      expect(results).toHaveLength(3);
      for (const result of results) {
        expect(result.status).toBe("submitted");
        expect(result.applicationId).toBeTruthy();
      }
    });

    it("should instantly approve paper broker KYC", async () => {
      const results = await service.submitKyc(createValidProfile(), [
        "paper",
      ]);
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("approved");
      expect(results[0].estimatedReviewTime).toBe("instant");
    });

    it("should throw if no brokers are specified", async () => {
      await expect(
        service.submitKyc(createValidProfile(), []),
      ).rejects.toThrow("At least one broker must be specified");
    });

    it("should throw if the profile is invalid", async () => {
      const invalidProfile = createValidProfile({ email: "bad" });
      await expect(
        service.submitKyc(invalidProfile, ["alpaca"]),
      ).rejects.toThrow("KYC profile validation failed");
    });

    it("should store the profile after successful submission", async () => {
      const profile = createValidProfile();
      await service.submitKyc(profile, ["alpaca"]);

      const stored = service.getProfile(profile.userId);
      expect(stored).not.toBeNull();
      expect(stored?.firstName).toBe("Jane");
    });

    it("should submit to paper and real brokers simultaneously", async () => {
      const results = await service.submitKyc(createValidProfile(), [
        "paper",
        "alpaca",
        "drivewealth",
      ]);
      expect(results).toHaveLength(3);

      const paperResult = results.find((r) => r.broker === "paper");
      expect(paperResult?.status).toBe("approved");

      const alpacaResult = results.find((r) => r.broker === "alpaca");
      expect(alpacaResult?.status).toBe("submitted");
    });
  });

  // ==========================================================================
  // STATUS RETRIEVAL
  // ==========================================================================

  describe("getKycStatus / getAllKycStatuses", () => {
    it("should return null for non-existent submission", () => {
      const status = service.getKycStatus("unknown-user", "alpaca");
      expect(status).toBeNull();
    });

    it("should return the status after submission", async () => {
      await service.submitKyc(createValidProfile(), ["alpaca"]);
      const status = service.getKycStatus("user-001", "alpaca");
      expect(status).not.toBeNull();
      expect(status?.status).toBe("submitted");
      expect(status?.broker).toBe("alpaca");
      expect(status?.submittedAt).toBeInstanceOf(Date);
    });

    it("should return all statuses for a user", async () => {
      await service.submitKyc(createValidProfile(), [
        "alpaca",
        "drivewealth",
        "paper",
      ]);
      const statuses = service.getAllKycStatuses("user-001");
      expect(statuses).toHaveLength(3);

      const brokers = statuses.map((s) => s.broker);
      expect(brokers).toContain("alpaca");
      expect(brokers).toContain("drivewealth");
      expect(brokers).toContain("paper");
    });

    it("should return empty array for user with no submissions", () => {
      const statuses = service.getAllKycStatuses("unknown-user");
      expect(statuses).toHaveLength(0);
    });
  });

  // ==========================================================================
  // PROFILE MANAGEMENT
  // ==========================================================================

  describe("updateKycProfile", () => {
    it("should throw if no profile exists", () => {
      expect(() =>
        service.updateKycProfile("unknown", { firstName: "Updated" }),
      ).toThrow('No KYC profile found for user "unknown"');
    });

    it("should update scalar fields", async () => {
      await service.submitKyc(createValidProfile(), ["paper"]);
      const updated = service.updateKycProfile("user-001", {
        firstName: "Janet",
        annualIncome: 120000,
      });
      expect(updated.firstName).toBe("Janet");
      expect(updated.annualIncome).toBe(120000);
      expect(updated.lastName).toBe("Doe"); // unchanged
    });

    it("should deep merge address fields", async () => {
      await service.submitKyc(createValidProfile(), ["paper"]);
      const updated = service.updateKycProfile("user-001", {
        address: { street: "456 Oak Ave", city: "Boston", state: "MA", postalCode: "02101", country: "US" },
      });
      expect(updated.address.street).toBe("456 Oak Ave");
      expect(updated.address.city).toBe("Boston");
    });

    it("should not allow userId to be changed", async () => {
      await service.submitKyc(createValidProfile(), ["paper"]);
      const updated = service.updateKycProfile("user-001", {
        userId: "hacker",
      } as Partial<KycProfile>);
      expect(updated.userId).toBe("user-001");
    });
  });

  // ==========================================================================
  // BROKER FORMAT MAPPING
  // ==========================================================================

  describe("mapProfileToBrokerFormat", () => {
    const profile = createValidProfile();

    it("should map to Alpaca format with contact, identity, disclosures, agreements", () => {
      const mapped = service.mapProfileToBrokerFormat(profile, "alpaca");
      expect(mapped).toHaveProperty("contact");
      expect(mapped).toHaveProperty("identity");
      expect(mapped).toHaveProperty("disclosures");
      expect(mapped).toHaveProperty("agreements");

      const contact = mapped.contact as Record<string, unknown>;
      expect(contact.email_address).toBe(profile.email);

      const identity = mapped.identity as Record<string, unknown>;
      expect(identity.given_name).toBe(profile.firstName);
    });

    it("should map to Interactive Brokers format", () => {
      const mapped = service.mapProfileToBrokerFormat(
        profile,
        "interactive_brokers",
      );
      expect(mapped).toHaveProperty("applicant");
      expect(mapped).toHaveProperty("address");
      expect(mapped).toHaveProperty("financial");
      expect(mapped).toHaveProperty("investment");

      const applicant = mapped.applicant as Record<string, unknown>;
      expect(applicant.first_name).toBe(profile.firstName);
    });

    it("should map to Schwab format with ranges for income/networth", () => {
      const mapped = service.mapProfileToBrokerFormat(profile, "schwab");
      expect(mapped).toHaveProperty("personalInfo");
      expect(mapped).toHaveProperty("mailingAddress");
      expect(mapped).toHaveProperty("financialProfile");
      expect(mapped).toHaveProperty("investmentProfile");

      const financial = mapped.financialProfile as Record<string, unknown>;
      expect(typeof financial.annualIncomeRange).toBe("string");
    });

    it("should map to DriveWealth document-based format", () => {
      const mapped = service.mapProfileToBrokerFormat(profile, "drivewealth");
      expect(mapped).toHaveProperty("userType");
      expect(mapped).toHaveProperty("documents");
      expect(mapped.userType).toBe("INDIVIDUAL_TRADER");

      const documents = mapped.documents as Array<Record<string, unknown>>;
      expect(documents.length).toBeGreaterThanOrEqual(5);
    });

    it("should map to Paper format with minimal fields", () => {
      const mapped = service.mapProfileToBrokerFormat(profile, "paper");
      expect(mapped).toHaveProperty("userId");
      expect(mapped).toHaveProperty("accountType");
      expect(mapped.accountType).toBe("paper");
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe("edge cases", () => {
    it("should handle profile with optional taxId", async () => {
      const profile = createValidProfile({ taxId: "98-7654321" });
      const results = await service.submitKyc(profile, ["alpaca"]);
      expect(results[0].status).toBe("submitted");

      const mapped = service.mapProfileToBrokerFormat(profile, "alpaca");
      const identity = mapped.identity as Record<string, unknown>;
      expect(identity.tax_id).toBe("98-7654321");
    });

    it("should generate unique application IDs per broker", async () => {
      const results = await service.submitKyc(createValidProfile(), [
        "alpaca",
        "drivewealth",
      ]);
      const ids = results.map((r) => r.applicationId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("should not return the profile reference (immutability)", async () => {
      await service.submitKyc(createValidProfile(), ["paper"]);
      const profile1 = service.getProfile("user-001");
      const profile2 = service.getProfile("user-001");
      expect(profile1).not.toBe(profile2); // different object references
      expect(profile1).toEqual(profile2); // same content
    });
  });
});
