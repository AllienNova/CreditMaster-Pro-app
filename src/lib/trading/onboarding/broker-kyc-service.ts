/**
 * Broker KYC Service
 *
 * Unified Know-Your-Customer flow across multiple brokers.
 * Collects a single KYC profile and maps it to broker-specific
 * formats, submitting applications in parallel.
 *
 * State is managed via in-memory Maps (production would persist to Supabase).
 */

import type { SupportedBroker } from "@/lib/trading/brokers/broker-interface";

// ============================================================================
// TYPES
// ============================================================================

export interface KycAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export type EmploymentStatus =
  | "employed"
  | "self_employed"
  | "unemployed"
  | "retired"
  | "student";

export type InvestmentExperience =
  | "none"
  | "limited"
  | "moderate"
  | "extensive";

export type InvestmentObjective =
  | "growth"
  | "income"
  | "speculation"
  | "preservation";

export type RiskTolerance = "low" | "moderate" | "high";

export interface KycProfile {
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date (YYYY-MM-DD)
  ssn: string; // Last 4 or full, encrypted at rest
  address: KycAddress;
  phone: string;
  email: string;
  employmentStatus: EmploymentStatus;
  annualIncome: number;
  netWorth: number;
  investmentExperience: InvestmentExperience;
  investmentObjective: InvestmentObjective;
  riskTolerance: RiskTolerance;
  liquidNetWorth: number;
  taxId?: string;
  citizenshipCountry: string;
}

export type KycStatusValue =
  | "pending"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "action_required";

export interface KycStatus {
  userId: string;
  broker: SupportedBroker;
  status: KycStatusValue;
  submittedAt?: Date;
  reviewedAt?: Date;
  rejectionReason?: string;
  requiredActions?: string[];
  expiresAt?: Date;
}

export interface KycSubmissionResult {
  broker: SupportedBroker;
  applicationId: string;
  status: KycStatusValue;
  estimatedReviewTime?: string;
}

export interface KycValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_EMPLOYMENT_STATUSES: ReadonlySet<EmploymentStatus> = new Set([
  "employed",
  "self_employed",
  "unemployed",
  "retired",
  "student",
]);

const VALID_INVESTMENT_EXPERIENCES: ReadonlySet<InvestmentExperience> = new Set([
  "none",
  "limited",
  "moderate",
  "extensive",
]);

const VALID_INVESTMENT_OBJECTIVES: ReadonlySet<InvestmentObjective> = new Set([
  "growth",
  "income",
  "speculation",
  "preservation",
]);

const VALID_RISK_TOLERANCES: ReadonlySet<RiskTolerance> = new Set([
  "low",
  "moderate",
  "high",
]);

/** Minimum age (years) to open a brokerage account */
const MIN_AGE_YEARS = 18;

/** Maximum reasonable age */
const MAX_AGE_YEARS = 120;

/** ISO date pattern: YYYY-MM-DD */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Phone: digits, spaces, dashes, parens, optional leading + */
const PHONE_REGEX = /^\+?[\d\s()-]{7,20}$/;

/** Email: basic validation */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** SSN: 4 digits or 9 digits (with optional dashes) */
const SSN_REGEX = /^(\d{4}|\d{3}-?\d{2}-?\d{4})$/;

/** Estimated review times per broker */
const REVIEW_TIMES: Readonly<Record<string, string>> = {
  alpaca: "1-3 business days",
  interactive_brokers: "3-5 business days",
  schwab: "5-7 business days",
  drivewealth: "1-2 business days",
  paper: "instant",
};

// ============================================================================
// BROKER KYC SERVICE
// ============================================================================

export class BrokerKycService {
  /** userId -> KycProfile */
  private readonly profiles: Map<string, KycProfile> = new Map();

  /** `${userId}:${broker}` -> KycStatus */
  private readonly statuses: Map<string, KycStatus> = new Map();

  /** `${userId}:${broker}` -> applicationId */
  private readonly applications: Map<string, string> = new Map();

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Validate a KYC profile for completeness and format correctness.
   * Returns a list of errors (empty means valid).
   */
  validateKycProfile(profile: KycProfile): KycValidationResult {
    const errors: string[] = [];

    // Required string fields
    if (!profile.userId?.trim()) errors.push("userId is required");
    if (!profile.firstName?.trim()) errors.push("firstName is required");
    if (!profile.lastName?.trim()) errors.push("lastName is required");
    if (!profile.citizenshipCountry?.trim())
      errors.push("citizenshipCountry is required");

    // Date of birth
    if (!profile.dateOfBirth) {
      errors.push("dateOfBirth is required");
    } else if (!ISO_DATE_REGEX.test(profile.dateOfBirth)) {
      errors.push("dateOfBirth must be in ISO format (YYYY-MM-DD)");
    } else {
      const dob = new Date(profile.dateOfBirth);
      if (isNaN(dob.getTime())) {
        errors.push("dateOfBirth is not a valid date");
      } else {
        const age = this.calculateAge(dob);
        if (age < MIN_AGE_YEARS) {
          errors.push(`Must be at least ${MIN_AGE_YEARS} years old`);
        }
        if (age > MAX_AGE_YEARS) {
          errors.push("dateOfBirth appears invalid (age exceeds 120)");
        }
      }
    }

    // SSN
    if (!profile.ssn) {
      errors.push("ssn is required");
    } else if (!SSN_REGEX.test(profile.ssn)) {
      errors.push(
        "ssn must be 4 digits (last four) or full format (XXX-XX-XXXX)",
      );
    }

    // Address
    if (!profile.address) {
      errors.push("address is required");
    } else {
      if (!profile.address.street?.trim())
        errors.push("address.street is required");
      if (!profile.address.city?.trim())
        errors.push("address.city is required");
      if (!profile.address.state?.trim())
        errors.push("address.state is required");
      if (!profile.address.postalCode?.trim())
        errors.push("address.postalCode is required");
      if (!profile.address.country?.trim())
        errors.push("address.country is required");
    }

    // Contact
    if (!profile.phone) {
      errors.push("phone is required");
    } else if (!PHONE_REGEX.test(profile.phone)) {
      errors.push("phone format is invalid");
    }

    if (!profile.email) {
      errors.push("email is required");
    } else if (!EMAIL_REGEX.test(profile.email)) {
      errors.push("email format is invalid");
    }

    // Enums
    if (
      !profile.employmentStatus ||
      !VALID_EMPLOYMENT_STATUSES.has(profile.employmentStatus)
    ) {
      errors.push(
        `employmentStatus must be one of: ${[...VALID_EMPLOYMENT_STATUSES].join(", ")}`,
      );
    }

    if (
      !profile.investmentExperience ||
      !VALID_INVESTMENT_EXPERIENCES.has(profile.investmentExperience)
    ) {
      errors.push(
        `investmentExperience must be one of: ${[...VALID_INVESTMENT_EXPERIENCES].join(", ")}`,
      );
    }

    if (
      !profile.investmentObjective ||
      !VALID_INVESTMENT_OBJECTIVES.has(profile.investmentObjective)
    ) {
      errors.push(
        `investmentObjective must be one of: ${[...VALID_INVESTMENT_OBJECTIVES].join(", ")}`,
      );
    }

    if (
      !profile.riskTolerance ||
      !VALID_RISK_TOLERANCES.has(profile.riskTolerance)
    ) {
      errors.push(
        `riskTolerance must be one of: ${[...VALID_RISK_TOLERANCES].join(", ")}`,
      );
    }

    // Numeric fields
    if (typeof profile.annualIncome !== "number" || profile.annualIncome < 0) {
      errors.push("annualIncome must be a non-negative number");
    }
    if (typeof profile.netWorth !== "number" || profile.netWorth < 0) {
      errors.push("netWorth must be a non-negative number");
    }
    if (
      typeof profile.liquidNetWorth !== "number" ||
      profile.liquidNetWorth < 0
    ) {
      errors.push("liquidNetWorth must be a non-negative number");
    }
    if (
      typeof profile.liquidNetWorth === "number" &&
      typeof profile.netWorth === "number" &&
      profile.liquidNetWorth > profile.netWorth
    ) {
      errors.push("liquidNetWorth cannot exceed netWorth");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Submit KYC to one or more brokers in parallel.
   * Validates the profile first; rejects if invalid.
   * Stores the profile and per-broker statuses internally.
   */
  async submitKyc(
    profile: KycProfile,
    brokers: SupportedBroker[],
  ): Promise<KycSubmissionResult[]> {
    if (brokers.length === 0) {
      throw new Error("At least one broker must be specified");
    }

    const validation = this.validateKycProfile(profile);
    if (!validation.valid) {
      throw new Error(
        `KYC profile validation failed: ${validation.errors.join("; ")}`,
      );
    }

    // Store the profile
    this.profiles.set(profile.userId, { ...profile });

    // Submit to each broker in parallel
    const results = await Promise.allSettled(
      brokers.map((broker) => this.submitToBroker(profile, broker)),
    );

    const submissions: KycSubmissionResult[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const broker = brokers[i];

      if (result.status === "fulfilled") {
        submissions.push(result.value);
      } else {
        // Record the failure as a status
        const key = `${profile.userId}:${broker}`;
        this.statuses.set(key, {
          userId: profile.userId,
          broker,
          status: "rejected",
          rejectionReason:
            result.reason instanceof Error
              ? result.reason.message
              : "Submission failed",
        });

        submissions.push({
          broker,
          applicationId: "",
          status: "rejected",
          estimatedReviewTime: undefined,
        });
      }
    }

    return submissions;
  }

  /**
   * Get the KYC status for a specific user and broker.
   * Returns null if no submission exists.
   */
  getKycStatus(userId: string, broker: SupportedBroker): KycStatus | null {
    return this.statuses.get(`${userId}:${broker}`) ?? null;
  }

  /**
   * Get KYC statuses for a user across all brokers that have been submitted.
   */
  getAllKycStatuses(userId: string): KycStatus[] {
    const result: KycStatus[] = [];
    for (const [key, status] of this.statuses) {
      if (key.startsWith(`${userId}:`)) {
        result.push({ ...status });
      }
    }
    return result;
  }

  /**
   * Update a stored KYC profile with partial changes.
   * Throws if no profile exists for the user.
   */
  updateKycProfile(
    userId: string,
    updates: Partial<KycProfile>,
  ): KycProfile {
    const existing = this.profiles.get(userId);
    if (!existing) {
      throw new Error(`No KYC profile found for user "${userId}"`);
    }

    const updated: KycProfile = {
      ...existing,
      ...updates,
      // Deep merge address if both exist
      address:
        updates.address
          ? { ...existing.address, ...updates.address }
          : existing.address,
      // userId cannot be changed
      userId: existing.userId,
    };

    this.profiles.set(userId, updated);
    return { ...updated };
  }

  /**
   * Map a unified KYC profile to a broker-specific format.
   * Each broker expects different field names and structures.
   */
  mapProfileToBrokerFormat(
    profile: KycProfile,
    broker: SupportedBroker,
  ): Record<string, unknown> {
    switch (broker) {
      case "alpaca":
        return this.mapToAlpacaFormat(profile);
      case "interactive_brokers":
        return this.mapToIBFormat(profile);
      case "schwab":
        return this.mapToSchwabFormat(profile);
      case "drivewealth":
        return this.mapToDriveWealthFormat(profile);
      case "paper":
        return this.mapToPaperFormat(profile);
      default: {
        // Exhaustive check
        const _exhaustive: never = broker;
        throw new Error(`Unsupported broker: ${_exhaustive}`);
      }
    }
  }

  /**
   * Get the stored KYC profile for a user.
   * Returns null if no profile exists.
   */
  getProfile(userId: string): KycProfile | null {
    const profile = this.profiles.get(userId);
    return profile ? { ...profile } : null;
  }

  // ==========================================================================
  // PRIVATE — SUBMISSION
  // ==========================================================================

  private async submitToBroker(
    profile: KycProfile,
    broker: SupportedBroker,
  ): Promise<KycSubmissionResult> {
    const key = `${profile.userId}:${broker}`;

    // Paper broker is instant-approved
    if (broker === "paper") {
      const applicationId = this.generateApplicationId(broker);
      this.applications.set(key, applicationId);
      this.statuses.set(key, {
        userId: profile.userId,
        broker,
        status: "approved",
        submittedAt: new Date(),
        reviewedAt: new Date(),
      });
      return {
        broker,
        applicationId,
        status: "approved",
        estimatedReviewTime: REVIEW_TIMES[broker],
      };
    }

    // Simulate async broker API call
    const _brokerPayload = this.mapProfileToBrokerFormat(profile, broker);
    const applicationId = this.generateApplicationId(broker);
    this.applications.set(key, applicationId);

    this.statuses.set(key, {
      userId: profile.userId,
      broker,
      status: "submitted",
      submittedAt: new Date(),
    });

    return {
      broker,
      applicationId,
      status: "submitted",
      estimatedReviewTime: REVIEW_TIMES[broker],
    };
  }

  // ==========================================================================
  // PRIVATE — BROKER FORMAT MAPPERS
  // ==========================================================================

  private mapToAlpacaFormat(profile: KycProfile): Record<string, unknown> {
    return {
      contact: {
        email_address: profile.email,
        phone_number: profile.phone,
        street_address: [profile.address.street],
        city: profile.address.city,
        state: profile.address.state,
        postal_code: profile.address.postalCode,
        country: profile.address.country,
      },
      identity: {
        given_name: profile.firstName,
        family_name: profile.lastName,
        date_of_birth: profile.dateOfBirth,
        tax_id: profile.taxId ?? profile.ssn,
        tax_id_type: "USA_SSN",
        country_of_citizenship: profile.citizenshipCountry,
        country_of_tax_residence: profile.address.country,
      },
      disclosures: {
        is_control_person: false,
        is_affiliated_exchange_or_finra: false,
        is_politically_exposed: false,
        immediate_family_exposed: false,
      },
      agreements: [
        { agreement: "margin_agreement", signed_at: new Date().toISOString() },
        {
          agreement: "customer_agreement",
          signed_at: new Date().toISOString(),
        },
        { agreement: "account_agreement", signed_at: new Date().toISOString() },
      ],
    };
  }

  private mapToIBFormat(profile: KycProfile): Record<string, unknown> {
    return {
      applicant: {
        first_name: profile.firstName,
        last_name: profile.lastName,
        date_of_birth: profile.dateOfBirth,
        ssn: profile.ssn,
        email: profile.email,
        phone: profile.phone,
        citizenship: profile.citizenshipCountry,
      },
      address: {
        line1: profile.address.street,
        city: profile.address.city,
        state: profile.address.state,
        zip: profile.address.postalCode,
        country: profile.address.country,
      },
      financial: {
        annual_income: profile.annualIncome,
        net_worth: profile.netWorth,
        liquid_net_worth: profile.liquidNetWorth,
        employment_status: profile.employmentStatus,
      },
      investment: {
        experience: profile.investmentExperience,
        objective: profile.investmentObjective,
        risk_tolerance: profile.riskTolerance,
      },
    };
  }

  private mapToSchwabFormat(profile: KycProfile): Record<string, unknown> {
    return {
      personalInfo: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        dateOfBirth: profile.dateOfBirth,
        socialSecurityNumber: profile.ssn,
        emailAddress: profile.email,
        phoneNumber: profile.phone,
        citizenship: profile.citizenshipCountry,
      },
      mailingAddress: {
        addressLine1: profile.address.street,
        city: profile.address.city,
        stateProvince: profile.address.state,
        postalCode: profile.address.postalCode,
        country: profile.address.country,
      },
      financialProfile: {
        employmentStatus: profile.employmentStatus,
        annualIncomeRange: this.incomeToRange(profile.annualIncome),
        totalNetWorth: this.netWorthToRange(profile.netWorth),
        liquidNetWorth: this.netWorthToRange(profile.liquidNetWorth),
      },
      investmentProfile: {
        investmentExperience: profile.investmentExperience,
        investmentObjective: profile.investmentObjective,
        riskTolerance: profile.riskTolerance,
      },
    };
  }

  private mapToDriveWealthFormat(
    profile: KycProfile,
  ): Record<string, unknown> {
    return {
      userType: "INDIVIDUAL_TRADER",
      documents: [
        {
          type: "BASIC_INFO",
          data: {
            firstName: profile.firstName,
            lastName: profile.lastName,
            country: profile.citizenshipCountry,
            phone: profile.phone,
            emailAddress: profile.email,
            language: "en_US",
          },
        },
        {
          type: "IDENTIFICATION_INFO",
          data: {
            value: profile.ssn,
            type: "SSN",
            citizenship: profile.citizenshipCountry,
            usTaxPayer: profile.citizenshipCountry === "US",
          },
        },
        {
          type: "PERSONAL_INFO",
          data: {
            dateOfBirth: profile.dateOfBirth,
            politicallyExposedNames: [],
          },
        },
        {
          type: "ADDRESS_INFO",
          data: {
            street1: profile.address.street,
            city: profile.address.city,
            province: profile.address.state,
            postalCode: profile.address.postalCode,
            country: profile.address.country,
          },
        },
        {
          type: "EMPLOYMENT_INFO",
          data: {
            status: profile.employmentStatus.toUpperCase(),
            company: "",
          },
        },
        {
          type: "INVESTOR_PROFILE_INFO",
          data: {
            investmentExperience: profile.investmentExperience.toUpperCase(),
            investmentObjectives: profile.investmentObjective.toUpperCase(),
            annualIncome: profile.annualIncome,
            networthTotal: profile.netWorth,
            networthLiquid: profile.liquidNetWorth,
            riskTolerance: profile.riskTolerance.toUpperCase(),
          },
        },
      ],
    };
  }

  private mapToPaperFormat(profile: KycProfile): Record<string, unknown> {
    return {
      userId: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      accountType: "paper",
    };
  }

  // ==========================================================================
  // PRIVATE — HELPERS
  // ==========================================================================

  private calculateAge(dob: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dob.getDate())
    ) {
      age--;
    }
    return age;
  }

  private generateApplicationId(broker: SupportedBroker): string {
    const prefix = broker.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
  }

  private incomeToRange(income: number): string {
    if (income < 25_000) return "UNDER_25K";
    if (income < 50_000) return "25K_50K";
    if (income < 100_000) return "50K_100K";
    if (income < 200_000) return "100K_200K";
    return "OVER_200K";
  }

  private netWorthToRange(netWorth: number): string {
    if (netWorth < 50_000) return "UNDER_50K";
    if (netWorth < 100_000) return "50K_100K";
    if (netWorth < 250_000) return "100K_250K";
    if (netWorth < 500_000) return "250K_500K";
    if (netWorth < 1_000_000) return "500K_1M";
    return "OVER_1M";
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

const brokerKycService = new BrokerKycService();
export default brokerKycService;
