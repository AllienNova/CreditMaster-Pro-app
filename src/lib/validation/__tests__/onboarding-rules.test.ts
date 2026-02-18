/**
 * Onboarding Validation Rules Tests
 *
 * Tests formatters, patterns, and validation rule configurations
 * for phone, SSN, ZIP code, currency, email, name, and all step rules.
 */

import {
  formatters,
  patterns,
  profileValidationRules,
  goalsValidationRules,
  connectValidationRules,
} from "../onboarding-rules";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

describe("formatters", () => {
  describe("phone", () => {
    it("returns digits only for 1-3 digits", () => {
      expect(formatters.phone("1")).toBe("1");
      expect(formatters.phone("12")).toBe("12");
      expect(formatters.phone("123")).toBe("123");
    });

    it("formats 4-6 digits as (XXX) XXX", () => {
      expect(formatters.phone("1234")).toBe("(123) 4");
      expect(formatters.phone("12345")).toBe("(123) 45");
      expect(formatters.phone("123456")).toBe("(123) 456");
    });

    it("formats 7-10 digits as (XXX) XXX-XXXX", () => {
      expect(formatters.phone("1234567")).toBe("(123) 456-7");
      expect(formatters.phone("1234567890")).toBe("(123) 456-7890");
    });

    it("strips non-digit characters before formatting", () => {
      expect(formatters.phone("(123) 456-7890")).toBe("(123) 456-7890");
      expect(formatters.phone("123-456-7890")).toBe("(123) 456-7890");
      expect(formatters.phone("abc123def456ghi7890")).toBe("(123) 456-7890");
    });

    it("truncates digits beyond 10", () => {
      expect(formatters.phone("12345678901")).toBe("(123) 456-7890");
    });

    it("handles empty string", () => {
      expect(formatters.phone("")).toBe("");
    });
  });

  describe("ssn", () => {
    it("returns digits only for 1-3 digits", () => {
      expect(formatters.ssn("1")).toBe("1");
      expect(formatters.ssn("12")).toBe("12");
      expect(formatters.ssn("123")).toBe("123");
    });

    it("formats 4-5 digits as XXX-XX", () => {
      expect(formatters.ssn("1234")).toBe("123-4");
      expect(formatters.ssn("12345")).toBe("123-45");
    });

    it("formats 6-9 digits as XXX-XX-XXXX", () => {
      expect(formatters.ssn("123456")).toBe("123-45-6");
      expect(formatters.ssn("123456789")).toBe("123-45-6789");
    });

    it("strips non-digit characters", () => {
      expect(formatters.ssn("123-45-6789")).toBe("123-45-6789");
      expect(formatters.ssn("abc123456789")).toBe("123-45-6789");
    });

    it("truncates digits beyond 9", () => {
      expect(formatters.ssn("1234567890")).toBe("123-45-6789");
    });

    it("handles empty string", () => {
      expect(formatters.ssn("")).toBe("");
    });
  });

  describe("zipCode", () => {
    it("returns digits only for 1-5 digits", () => {
      expect(formatters.zipCode("1")).toBe("1");
      expect(formatters.zipCode("12345")).toBe("12345");
    });

    it("formats 6+ digits as XXXXX-XXXX", () => {
      expect(formatters.zipCode("123456")).toBe("12345-6");
      expect(formatters.zipCode("123456789")).toBe("12345-6789");
    });

    it("strips non-digit characters", () => {
      expect(formatters.zipCode("12345-6789")).toBe("12345-6789");
    });

    it("truncates to max 9 digits", () => {
      expect(formatters.zipCode("1234567890")).toBe("12345-6789");
    });

    it("handles empty string", () => {
      expect(formatters.zipCode("")).toBe("");
    });
  });

  describe("currency", () => {
    it("strips non-numeric/non-dot characters", () => {
      expect(formatters.currency("$1,234.56")).toBe("1234.56");
      expect(formatters.currency("abc")).toBe("");
    });

    it("keeps a single decimal point", () => {
      expect(formatters.currency("123.45")).toBe("123.45");
    });

    it("collapses multiple decimal points", () => {
      expect(formatters.currency("12.34.56")).toBe("12.3456");
    });

    it("handles empty string", () => {
      expect(formatters.currency("")).toBe("");
    });

    it("handles integer-only values", () => {
      expect(formatters.currency("500")).toBe("500");
    });
  });
});

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

describe("patterns", () => {
  describe("email", () => {
    it("matches valid emails", () => {
      expect(patterns.email.test("user@example.com")).toBe(true);
      expect(patterns.email.test("a@b.co")).toBe(true);
    });

    it("rejects invalid emails", () => {
      expect(patterns.email.test("no-at-sign")).toBe(false);
      expect(patterns.email.test("@missing-local.com")).toBe(false);
      expect(patterns.email.test("spaces in@email.com")).toBe(false);
    });
  });

  describe("phone", () => {
    it("matches valid phone formats", () => {
      expect(patterns.phone.test("(123) 456-7890")).toBe(true);
      expect(patterns.phone.test("123-456-7890")).toBe(true);
      expect(patterns.phone.test("123.456.7890")).toBe(true);
      expect(patterns.phone.test("1234567890")).toBe(true);
    });

    it("rejects invalid phone numbers", () => {
      expect(patterns.phone.test("123")).toBe(false);
      expect(patterns.phone.test("abcdefghij")).toBe(false);
    });
  });

  describe("ssn", () => {
    it("matches formatted SSN", () => {
      expect(patterns.ssn.test("123-45-6789")).toBe(true);
    });

    it("rejects unformatted or invalid SSN", () => {
      expect(patterns.ssn.test("123456789")).toBe(false);
      expect(patterns.ssn.test("12-345-6789")).toBe(false);
    });
  });

  describe("zipCode", () => {
    it("matches 5-digit ZIP", () => {
      expect(patterns.zipCode.test("12345")).toBe(true);
    });

    it("matches ZIP+4 format", () => {
      expect(patterns.zipCode.test("12345-6789")).toBe(true);
    });

    it("rejects invalid ZIP", () => {
      expect(patterns.zipCode.test("1234")).toBe(false);
      expect(patterns.zipCode.test("123456")).toBe(false);
      expect(patterns.zipCode.test("abcde")).toBe(false);
    });
  });

  describe("name", () => {
    it("matches valid names", () => {
      expect(patterns.name.test("John")).toBe(true);
      expect(patterns.name.test("O'Brien")).toBe(true);
      expect(patterns.name.test("Mary-Jane")).toBe(true);
      expect(patterns.name.test("Van Der Berg")).toBe(true);
    });

    it("rejects names with numbers or special characters", () => {
      expect(patterns.name.test("John123")).toBe(false);
      expect(patterns.name.test("user@name")).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Profile Validation Rules
// ---------------------------------------------------------------------------

describe("profileValidationRules", () => {
  it("has all expected fields", () => {
    const expectedFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "dateOfBirth",
      "ssn",
      "address",
      "city",
      "state",
      "zipCode",
    ];
    expectedFields.forEach((field) => {
      expect(profileValidationRules[field]).toBeDefined();
    });
  });

  it("requires firstName with name pattern and length constraints", () => {
    const rule = profileValidationRules.firstName;
    expect(rule.required).toBe(true);
    expect(rule.minLength).toBe(2);
    expect(rule.maxLength).toBe(50);
    expect(rule.pattern).toBe(patterns.name);
  });

  it("requires phone with auto-formatting", () => {
    const rule = profileValidationRules.phone;
    expect(rule.required).toBe(true);
    expect(rule.format).toBe(formatters.phone);
  });

  describe("dateOfBirth custom validator", () => {
    const customValidator = profileValidationRules.dateOfBirth.custom!;

    it("accepts age 18-120", () => {
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
      expect(
        customValidator(eighteenYearsAgo.toISOString().split("T")[0]),
      ).toBe(true);
    });

    it("rejects age below 18", () => {
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      expect(customValidator(fiveYearsAgo.toISOString().split("T")[0])).toBe(
        false,
      );
    });

    it("rejects age above 120", () => {
      const tooOld = new Date();
      tooOld.setFullYear(tooOld.getFullYear() - 130);
      expect(customValidator(tooOld.toISOString().split("T")[0])).toBe(false);
    });

    it("rejects non-string values", () => {
      expect(customValidator(123)).toBe(false);
      expect(customValidator(null)).toBe(false);
    });
  });

  it("requires ssn with auto-formatting", () => {
    const rule = profileValidationRules.ssn;
    expect(rule.required).toBe(true);
    expect(rule.format).toBe(formatters.ssn);
    expect(rule.pattern).toBe(patterns.ssn);
  });

  it("requires state as 2-letter uppercase", () => {
    const rule = profileValidationRules.state;
    expect(rule.required).toBe(true);
    expect(rule.pattern!.test("CA")).toBe(true);
    expect(rule.pattern!.test("ca")).toBe(false);
    expect(rule.pattern!.test("CAL")).toBe(false);
  });

  it("requires zipCode with auto-formatting", () => {
    const rule = profileValidationRules.zipCode;
    expect(rule.required).toBe(true);
    expect(rule.format).toBe(formatters.zipCode);
  });
});

// ---------------------------------------------------------------------------
// Goals Validation Rules
// ---------------------------------------------------------------------------

describe("goalsValidationRules", () => {
  it("has expected fields", () => {
    expect(goalsValidationRules.selectedGoals).toBeDefined();
    expect(goalsValidationRules.targetScore).toBeDefined();
    expect(goalsValidationRules.timeframe).toBeDefined();
  });

  describe("selectedGoals custom validator", () => {
    const customValidator = goalsValidationRules.selectedGoals.custom!;

    it("accepts non-empty array", () => {
      expect(customValidator(["buy_home"])).toBe(true);
    });

    it("rejects empty array", () => {
      expect(customValidator([])).toBe(false);
    });

    it("rejects non-array", () => {
      expect(customValidator("not-array")).toBe(false);
      expect(customValidator(null)).toBe(false);
    });
  });

  it("validates targetScore range 300-850", () => {
    const rule = goalsValidationRules.targetScore;
    expect(rule.required).toBe(false);
    expect(rule.min).toBe(300);
    expect(rule.max).toBe(850);
  });

  describe("timeframe custom validator", () => {
    const customValidator = goalsValidationRules.timeframe.custom!;

    it("accepts valid timeframes", () => {
      expect(customValidator("3_months")).toBe(true);
      expect(customValidator("6_months")).toBe(true);
      expect(customValidator("12_months")).toBe(true);
      expect(customValidator("24_months")).toBe(true);
    });

    it("rejects invalid timeframes", () => {
      expect(customValidator("1_month")).toBe(false);
      expect(customValidator("")).toBe(false);
      expect(customValidator(123)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Connect Validation Rules
// ---------------------------------------------------------------------------

describe("connectValidationRules", () => {
  it("has expected fields", () => {
    expect(connectValidationRules.bureauConsent).toBeDefined();
    expect(connectValidationRules.bankConsent).toBeDefined();
  });

  describe("bureauConsent custom validator", () => {
    const customValidator = connectValidationRules.bureauConsent.custom!;

    it("accepts true", () => {
      expect(customValidator(true)).toBe(true);
    });

    it("rejects false", () => {
      expect(customValidator(false)).toBe(false);
    });

    it("rejects non-boolean values", () => {
      expect(customValidator("true")).toBe(false);
      expect(customValidator(1)).toBe(false);
    });
  });

  describe("bankConsent custom validator", () => {
    const customValidator = connectValidationRules.bankConsent.custom!;

    it("accepts boolean values", () => {
      expect(customValidator(true)).toBe(true);
      expect(customValidator(false)).toBe(true);
    });

    it("rejects non-boolean values", () => {
      expect(customValidator("true")).toBe(false);
      expect(customValidator(null)).toBe(false);
    });
  });

  it("bureauConsent is required", () => {
    expect(connectValidationRules.bureauConsent.required).toBe(true);
  });

  it("bankConsent is optional", () => {
    expect(connectValidationRules.bankConsent.required).toBe(false);
  });
});
