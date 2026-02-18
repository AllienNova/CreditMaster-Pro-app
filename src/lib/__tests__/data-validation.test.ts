/**
 * @jest-environment node
 */
describe("Data Validation", () => {
  describe("Email Validation", () => {
    const validateEmail = (email: string) => {
      const trimmed = email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(trimmed);

      return {
        valid: isValid,
        normalized: isValid ? trimmed.toLowerCase() : null,
      };
    };

    it.each([
      ["user@example.com", true],
      ["user.name@example.com", true],
      ["user+tag@example.com", true],
      ["user@subdomain.example.com", true],
    ])("should validate %s as valid", (email, expected) => {
      expect(validateEmail(email).valid).toBe(expected);
    });

    it.each([
      ["invalid", false],
      ["@example.com", false],
      ["user@", false],
      ["user@.com", false],
      ["user example.com", false],
    ])("should validate %s as invalid", (email, expected) => {
      expect(validateEmail(email).valid).toBe(expected);
    });

    it("should normalize valid emails", () => {
      const result = validateEmail("  USER@EXAMPLE.COM  ");
      expect(result.normalized).toBe("user@example.com");
    });
  });

  describe("SSN Validation", () => {
    const validateSSN = (ssn: string) => {
      // Remove formatting
      const cleaned = ssn.replace(/[-\s]/g, "");

      if (!/^\d{9}$/.test(cleaned)) {
        return { valid: false, error: "Invalid format" };
      }

      // Check for invalid patterns
      if (cleaned.startsWith("000") || cleaned.startsWith("666")) {
        return { valid: false, error: "Invalid area number" };
      }

      if (cleaned.substring(3, 5) === "00") {
        return { valid: false, error: "Invalid group number" };
      }

      if (cleaned.substring(5) === "0000") {
        return { valid: false, error: "Invalid serial number" };
      }

      return {
        valid: true,
        masked: `***-**-${cleaned.substring(5)}`,
      };
    };

    it("should validate correct SSN", () => {
      const result = validateSSN("123-45-6789");
      expect(result.valid).toBe(true);
      expect(result.masked).toBe("***-**-6789");
    });

    it("should validate SSN without dashes", () => {
      const result = validateSSN("123456789");
      expect(result.valid).toBe(true);
    });

    it("should reject SSN starting with 000", () => {
      const result = validateSSN("000-12-3456");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid area number");
    });

    it("should reject SSN with 00 group", () => {
      const result = validateSSN("123-00-6789");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid group number");
    });
  });

  describe("Phone Validation", () => {
    const validatePhone = (phone: string) => {
      const cleaned = phone.replace(/[\s()-]/g, "");

      // US phone: 10 or 11 digits (with leading 1)
      if (!/^1?\d{10}$/.test(cleaned)) {
        return { valid: false, error: "Invalid phone number" };
      }

      const digits = cleaned.length === 11 ? cleaned.substring(1) : cleaned;

      return {
        valid: true,
        formatted: `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`,
        e164: `+1${digits}`,
      };
    };

    it("should validate 10-digit phone", () => {
      const result = validatePhone("5551234567");
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe("(555) 123-4567");
    });

    it("should validate formatted phone", () => {
      const result = validatePhone("(555) 123-4567");
      expect(result.valid).toBe(true);
    });

    it("should validate phone with country code", () => {
      const result = validatePhone("15551234567");
      expect(result.valid).toBe(true);
      expect(result.e164).toBe("+15551234567");
    });

    it("should reject invalid phone", () => {
      const result = validatePhone("12345");
      expect(result.valid).toBe(false);
    });
  });

  describe("Date Validation", () => {
    const validateDate = (dateStr: string, minAge?: number) => {
      const date = new Date(dateStr);

      if (isNaN(date.getTime())) {
        return { valid: false, error: "Invalid date" };
      }

      if (date > new Date()) {
        return { valid: false, error: "Date cannot be in future" };
      }

      if (minAge) {
        const today = new Date();
        const age = today.getFullYear() - date.getFullYear();
        if (age < minAge) {
          return {
            valid: false,
            error: `Must be at least ${minAge} years old`,
          };
        }
      }

      return {
        valid: true,
        formatted: date.toISOString().split("T")[0],
      };
    };

    it("should validate correct date", () => {
      const result = validateDate("1990-05-15");
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe("1990-05-15");
    });

    it("should reject future date", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result = validateDate(futureDate.toISOString());
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Date cannot be in future");
    });

    it("should check minimum age", () => {
      const recentDate = new Date();
      recentDate.setFullYear(recentDate.getFullYear() - 10);
      const result = validateDate(recentDate.toISOString(), 18);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Must be at least 18 years old");
    });
  });

  describe("Amount Validation", () => {
    const validateAmount = (
      amount: number | string,
      options?: { min?: number; max?: number },
    ) => {
      const num =
        typeof amount === "string"
          ? parseFloat(amount.replace(/[$,]/g, ""))
          : amount;

      if (isNaN(num)) {
        return { valid: false, error: "Invalid amount" };
      }

      if (options?.min !== undefined && num < options.min) {
        return {
          valid: false,
          error: `Amount must be at least ${options.min}`,
        };
      }

      if (options?.max !== undefined && num > options.max) {
        return { valid: false, error: `Amount cannot exceed ${options.max}` };
      }

      return {
        valid: true,
        cents: Math.round(num * 100),
        formatted: `$${num.toFixed(2)}`,
      };
    };

    it("should validate number amount", () => {
      const result = validateAmount(99.99);
      expect(result.valid).toBe(true);
      expect(result.cents).toBe(9999);
    });

    it("should validate string amount with currency symbol", () => {
      const result = validateAmount("$1,234.56");
      expect(result.valid).toBe(true);
      expect(result.cents).toBe(123456);
    });

    it("should enforce minimum", () => {
      const result = validateAmount(5, { min: 10 });
      expect(result.valid).toBe(false);
    });

    it("should enforce maximum", () => {
      const result = validateAmount(1000, { max: 500 });
      expect(result.valid).toBe(false);
    });
  });
});
