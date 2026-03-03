/**
 * @jest-environment node
 */

import {
  escapeHtml,
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeSSN,
  sanitizeNumber,
  sanitizeUrl,
  sanitizeObject,
} from "../sanitize";

// ═══════════════════════════════════════════════════════════════════════════════
//  escapeHtml
// ═══════════════════════════════════════════════════════════════════════════════
describe("Sanitize — escapeHtml", () => {
  it("should escape ampersand", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("should escape less-than", () => {
    expect(escapeHtml("<tag>")).toBe("&lt;tag&gt;");
  });

  it("should escape greater-than", () => {
    expect(escapeHtml("a > b")).toBe("a &gt; b");
  });

  it("should escape double quotes", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("should escape single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#x27;s");
  });

  it("should escape forward slashes", () => {
    expect(escapeHtml("a/b")).toBe("a&#x2F;b");
  });

  it("should escape backticks", () => {
    expect(escapeHtml("`code`")).toBe("&#x60;code&#x60;");
  });

  it("should escape equals signs", () => {
    expect(escapeHtml("a=b")).toBe("a&#x3D;b");
  });

  it("should handle empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("should handle string with no special chars", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("should escape multiple special chars in one string", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  sanitizeString
// ═══════════════════════════════════════════════════════════════════════════════
describe("Sanitize — sanitizeString", () => {
  it("should trim whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
  });

  it("should remove null bytes", () => {
    expect(sanitizeString("hello\0world")).toBe("helloworld");
  });

  it("should remove control characters", () => {
    expect(sanitizeString("hello\x01\x02world")).toBe("helloworld");
  });

  it("should preserve newlines when allowNewlines is true", () => {
    const result = sanitizeString("hello\nworld", { allowNewlines: true });
    expect(result).toContain("\n");
  });

  it("should remove newlines when allowNewlines is not set", () => {
    const result = sanitizeString("hello\nworld");
    expect(result).not.toContain("\n");
  });

  it("should escape HTML by default", () => {
    const result = sanitizeString("<b>bold</b>");
    expect(result).toContain("&lt;");
    expect(result).not.toContain("<b>");
  });

  it("should not escape HTML when allowHtml is true", () => {
    const result = sanitizeString("<b>bold</b>", { allowHtml: true });
    expect(result).toContain("<b>");
  });

  it("should enforce maxLength", () => {
    const result = sanitizeString("1234567890", { maxLength: 5 });
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("should handle empty string", () => {
    expect(sanitizeString("")).toBe("");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  sanitizeEmail
// ═══════════════════════════════════════════════════════════════════════════════
describe("Sanitize — sanitizeEmail", () => {
  it("should accept valid email", () => {
    expect(sanitizeEmail("user@example.com")).toBe("user@example.com");
  });

  it("should lowercase email", () => {
    expect(sanitizeEmail("User@Example.COM")).toBe("user@example.com");
  });

  it("should trim whitespace", () => {
    expect(sanitizeEmail("  user@example.com  ")).toBe("user@example.com");
  });

  it("should reject email without @", () => {
    expect(sanitizeEmail("userexample.com")).toBeNull();
  });

  it("should reject email without domain", () => {
    expect(sanitizeEmail("user@")).toBeNull();
  });

  it("should reject email with double dots", () => {
    expect(sanitizeEmail("user..name@example.com")).toBeNull();
  });

  it("should reject email starting with dot", () => {
    expect(sanitizeEmail(".user@example.com")).toBeNull();
  });

  it("should reject email with dot before @", () => {
    expect(sanitizeEmail("user.@example.com")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  sanitizePhone
// ═══════════════════════════════════════════════════════════════════════════════
describe("Sanitize — sanitizePhone", () => {
  it("should accept 10-digit phone", () => {
    expect(sanitizePhone("5551234567")).toBe("5551234567");
  });

  it("should strip formatting", () => {
    expect(sanitizePhone("(555) 123-4567")).toBe("5551234567");
  });

  it("should accept 11-digit with leading 1", () => {
    expect(sanitizePhone("15551234567")).toBe("5551234567");
  });

  it("should accept formatted 11-digit", () => {
    expect(sanitizePhone("1-555-123-4567")).toBe("5551234567");
  });

  it("should reject too few digits", () => {
    expect(sanitizePhone("12345")).toBeNull();
  });

  it("should reject too many digits", () => {
    expect(sanitizePhone("123456789012")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  sanitizeSSN
// ═══════════════════════════════════════════════════════════════════════════════
describe("Sanitize — sanitizeSSN", () => {
  it("should accept valid 9-digit SSN", () => {
    expect(sanitizeSSN("123456789")).toBe("123456789");
  });

  it("should strip dashes", () => {
    expect(sanitizeSSN("123-45-6789")).toBe("123456789");
  });

  it("should reject SSN starting with 000", () => {
    expect(sanitizeSSN("000-12-3456")).toBeNull();
  });

  it("should reject SSN starting with 666", () => {
    expect(sanitizeSSN("666-12-3456")).toBeNull();
  });

  it("should reject SSN starting with 9", () => {
    expect(sanitizeSSN("900-12-3456")).toBeNull();
  });

  it("should reject SSN with wrong length", () => {
    expect(sanitizeSSN("12345")).toBeNull();
    expect(sanitizeSSN("1234567890")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  sanitizeNumber
// ═══════════════════════════════════════════════════════════════════════════════
describe("Sanitize — sanitizeNumber", () => {
  it("should parse numeric string", () => {
    expect(sanitizeNumber("42")).toBe(42);
  });

  it("should accept number input directly", () => {
    expect(sanitizeNumber(42)).toBe(42);
  });

  it("should strip non-numeric characters", () => {
    expect(sanitizeNumber("$1,234.56")).toBe(1234.56);
  });

  it("should return null for non-numeric string", () => {
    expect(sanitizeNumber("abc")).toBeNull();
  });

  it("should enforce min constraint", () => {
    expect(sanitizeNumber(5, { min: 10 })).toBeNull();
  });

  it("should enforce max constraint", () => {
    expect(sanitizeNumber(100, { max: 50 })).toBeNull();
  });

  it("should round to specified decimals", () => {
    expect(sanitizeNumber(3.14159, { decimals: 2 })).toBe(3.14);
  });

  it("should accept value within range", () => {
    expect(sanitizeNumber(25, { min: 0, max: 100 })).toBe(25);
  });

  it("should handle NaN", () => {
    expect(sanitizeNumber(NaN)).toBeNull();
  });

  it("should handle negative numbers", () => {
    expect(sanitizeNumber("-42")).toBe(-42);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  sanitizeUrl
// ═══════════════════════════════════════════════════════════════════════════════
describe("Sanitize — sanitizeUrl", () => {
  it("should accept valid https URL", () => {
    const result = sanitizeUrl("https://example.com/path");
    expect(result).toBe("https://example.com/path");
  });

  it("should accept valid http URL", () => {
    const result = sanitizeUrl("http://example.com");
    expect(result).toBe("http://example.com/");
  });

  it("should reject javascript: protocol", () => {
    expect(sanitizeUrl("javascript:void(0)")).toBeNull();
  });

  it("should reject ftp: protocol", () => {
    expect(sanitizeUrl("ftp://example.com")).toBeNull();
  });

  it("should reject invalid URL", () => {
    expect(sanitizeUrl("not a url")).toBeNull();
  });

  it("should reject data: protocol", () => {
    expect(sanitizeUrl("data:text/html,<h1>hi</h1>")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  sanitizeObject
// ═══════════════════════════════════════════════════════════════════════════════
describe("Sanitize — sanitizeObject", () => {
  it("should sanitize string values", () => {
    const result = sanitizeObject({ name: "<script>alert('xss')</script>" });
    expect(result.name).not.toContain("<script>");
    expect(result.name).toContain("&lt;");
  });

  it("should preserve non-string values", () => {
    const result = sanitizeObject({ count: 42, active: true });
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
  });

  it("should recursively sanitize nested objects", () => {
    const result = sanitizeObject({
      user: { name: "<b>John</b>" },
    });
    expect((result.user as Record<string, unknown>).name).toContain("&lt;");
  });

  it("should sanitize arrays of strings", () => {
    const result = sanitizeObject({
      tags: ["<script>bad</script>", "good"],
    });
    const tags = result.tags as string[];
    expect(tags[0]).not.toContain("<script>");
    expect(tags[1]).toBe("good");
  });

  it("should sanitize arrays of objects", () => {
    const result = sanitizeObject({
      items: [{ value: "<b>test</b>" }],
    });
    const items = result.items as Array<Record<string, unknown>>;
    expect(items[0].value).toContain("&lt;");
  });

  it("should handle null values in objects", () => {
    const result = sanitizeObject({ value: null as unknown });
    expect(result.value).toBeNull();
  });

  it("should preserve number values in arrays", () => {
    const result = sanitizeObject({ nums: [1, 2, 3] });
    expect(result.nums).toEqual([1, 2, 3]);
  });
});
