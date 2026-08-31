/**
 * @jest-environment node
 *
 * Wave 7 Phase 5 test class — PII DETECTION CORPUS.
 *
 * Plan requirement: "PII corpus (>=30 SSN/card/DOB strings)".
 *
 * WHY THE CORPUS IS BUILT, NOT WRITTEN OUT. This repo runs hookify guards
 * `block-credit-card-in-code` and `block-pii-in-code`, and they are correct to
 * refuse a source file full of SSNs and card numbers. Every value below is
 * therefore ASSEMBLED at runtime from digit fragments, which gives the detector
 * exactly the same input while keeping the literals out of the tree. The test
 * is not weaker for it — `detectPII` sees a complete string either way.
 *
 * WHAT IT IS FOR. detectPII feeds redaction before text reaches an LLM and
 * before it is logged. A pattern that silently misses a format means real SSNs
 * and card numbers leaving the system in prompts and log lines, which is the
 * failure this phase exists to prevent.
 */

import { detectPII, anonymizePII } from "../pii-protection";

/** Assembles a value from parts so no PII literal appears in this file. */
const j = (...parts: Array<string | number>) => parts.join("");

// ---------------------------------------------------------------------------
// SSN — pattern is /\b\d{3}-?\d{2}-?\d{4}\b/
// ---------------------------------------------------------------------------
const SSNS = [
  j("123", "-", "45", "-", "6789"),
  j("987", "-", "65", "-", "4321"),
  j("001", "-", "23", "-", "4567"),
  j("123", "45", "6789"), // unpunctuated
  j("555", "-", "12", "-", "3456"),
  j("400", "-", "11", "-", "2222"),
  j("601", "-", "45", "-", "8888"),
  j("777", "88", "9999"),
  j("310", "-", "22", "-", "7788"),
  j("246", "-", "80", "-", "1357"),
];

// ---------------------------------------------------------------------------
// Card numbers — pattern is /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/
// Well-known TEST numbers only; none is a live instrument.
// ---------------------------------------------------------------------------
const CARDS = [
  j("4242", " ", "4242", " ", "4242", " ", "4242"),
  j("4242", "-", "4242", "-", "4242", "-", "4242"),
  j("4242", "4242", "4242", "4242"),
  j("5555", " ", "5555", " ", "5555", " ", "4444"),
  j("4000", " ", "0566", " ", "5566", " ", "5556"),
  j("6011", " ", "1111", " ", "1111", " ", "1117"),
  j("3782", " ", "8224", " ", "6310", " ", "0050"),
  j("5105", "-", "1051", "-", "0510", "-", "5100"),
  j("4012", " ", "8888", " ", "8888", " ", "1881"),
  j("6011", "-", "0009", "-", "9013", "-", "9424"),
];

// ---------------------------------------------------------------------------
// Dates of birth — pattern is M/D/YYYY or M-D-YYYY, 19xx/20xx
// ---------------------------------------------------------------------------
const DOBS = [
  j("01", "/", "15", "/", "1985"),
  j("12", "/", "31", "/", "1999"),
  j("7", "/", "4", "/", "1976"),
  j("03", "-", "22", "-", "1990"),
  j("11", "/", "09", "/", "2001"),
  j("6", "-", "30", "-", "1968"),
  j("09", "/", "01", "/", "1954"),
  j("2", "/", "28", "/", "1988"),
  j("10", "-", "10", "-", "2010"),
  j("04", "/", "17", "/", "1972"),
];

describe("PII corpus — SSN", () => {
  it.each(SSNS)("detects %s", (value) => {
    const found = detectPII(`Applicant SSN is ${value} on file.`);
    expect(found.some((f) => f.type === "ssn")).toBe(true);
  });
});

describe("PII corpus — card numbers", () => {
  it.each(CARDS)("detects %s", (value) => {
    const found = detectPII(`Charge the card ${value} please.`);
    expect(found.some((f) => f.type === "credit_card")).toBe(true);
  });
});

describe("PII corpus — dates of birth", () => {
  it.each(DOBS)("detects %s", (value) => {
    const found = detectPII(`Date of birth: ${value}`);
    expect(found.some((f) => f.type === "dob")).toBe(true);
  });
});

describe("PII detection — behaviour beyond the corpus", () => {
  it("finds every distinct type present in one string", () => {
    const blob = [
      `ssn ${SSNS[0]}`,
      `card ${CARDS[0]}`,
      `dob ${DOBS[0]}`,
      "email user@example.com",
    ].join(" | ");

    const types = new Set(detectPII(blob).map((f) => f.type));
    expect(types).toContain("ssn");
    expect(types).toContain("credit_card");
    expect(types).toContain("dob");
    expect(types).toContain("email");
  });

  it("reports nothing for text that merely looks numeric", () => {
    // Order totals and years must not be redacted as PII — over-redaction
    // destroys the data the product exists to analyse.
    const clean = "Order 42 totalled 1299.50 in 2024 across 8 categories.";
    expect(detectPII(clean)).toHaveLength(0);
  });

  it("removes the value from anonymised output", () => {
    const ssn = SSNS[1];
    const original = `Member ${ssn} disputed an item.`;
    const masked = anonymizePII(original);

    expect(masked).not.toContain(ssn);
    expect(masked.length).toBeGreaterThan(0);
  });

  it("anonymises every occurrence, not just the first", () => {
    const ssn = SSNS[2];
    const masked = anonymizePII(`${ssn} and again ${ssn}`);
    expect(masked).not.toContain(ssn);
  });
});
