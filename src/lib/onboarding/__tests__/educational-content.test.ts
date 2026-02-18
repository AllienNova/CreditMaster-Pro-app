/**
 * Educational Content Tests
 *
 * Validates the structure, completeness, and data integrity of
 * all educational content used in onboarding tooltips.
 */

import { educationalContent, EducationalContent } from '../educational-content';

describe('educationalContent', () => {
  // -------------------------------------------------------------------------
  // Structural validation
  // -------------------------------------------------------------------------

  it('is a non-empty Record', () => {
    expect(typeof educationalContent).toBe('object');
    expect(Object.keys(educationalContent).length).toBeGreaterThan(0);
  });

  it('every entry has a title and content', () => {
    Object.entries(educationalContent).forEach(([key, entry]) => {
      expect(entry.title).toBeDefined();
      expect(typeof entry.title).toBe('string');
      expect(entry.title.length).toBeGreaterThan(0);

      expect(entry.content).toBeDefined();
      expect(typeof entry.content).toBe('string');
      expect(entry.content.length).toBeGreaterThan(0);
    });
  });

  it('learnMoreUrl is either undefined or a non-empty string when present', () => {
    Object.entries(educationalContent).forEach(([key, entry]) => {
      if (entry.learnMoreUrl !== undefined) {
        expect(typeof entry.learnMoreUrl).toBe('string');
        expect(entry.learnMoreUrl.length).toBeGreaterThan(0);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Content completeness — verify all expected keys exist
  // -------------------------------------------------------------------------

  const expectedKeys = [
    // Profile step
    'ssn',
    'dateOfBirth',
    'address',
    // Goals step
    'creditScore',
    'scoreRanges',
    'timeframe',
    // Connect step
    'bureauConnection',
    'bankConnection',
    'plaidSecurity',
    // General
    'dataPrivacy',
    'creditUtilization',
    'paymentHistory',
    'hardInquiries',
    'disputeProcess',
    'goodwillLetters',
    'creditMix',
    'accountAge',
  ];

  it.each(expectedKeys)('contains the "%s" entry', (key) => {
    expect(educationalContent[key]).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Specific entry validations
  // -------------------------------------------------------------------------

  it('ssn entry has a security-related learnMoreUrl', () => {
    expect(educationalContent.ssn.learnMoreUrl).toBe('/security');
  });

  it('plaidSecurity entry links to external Plaid safety page', () => {
    expect(educationalContent.plaidSecurity.learnMoreUrl).toBe('https://plaid.com/safety');
  });

  it('creditScore entry mentions the 300-850 range', () => {
    expect(educationalContent.creditScore.content).toMatch(/300/);
    expect(educationalContent.creditScore.content).toMatch(/850/);
  });

  it('paymentHistory entry mentions 35% factor', () => {
    expect(educationalContent.paymentHistory.content).toMatch(/35%/);
  });

  it('creditUtilization entry mentions 30% threshold', () => {
    expect(educationalContent.creditUtilization.content).toMatch(/30%/);
  });

  it('hardInquiries entry mentions 2 years duration', () => {
    expect(educationalContent.hardInquiries.content).toMatch(/2 years/);
  });

  it('disputeProcess entry mentions 30 days investigation', () => {
    expect(educationalContent.disputeProcess.content).toMatch(/30 days/);
  });

  it('creditMix entry mentions 10% factor', () => {
    expect(educationalContent.creditMix.content).toMatch(/10%/);
  });

  it('accountAge entry mentions 15% factor', () => {
    expect(educationalContent.accountAge.content).toMatch(/15%/);
  });

  // -------------------------------------------------------------------------
  // Type guard test
  // -------------------------------------------------------------------------

  it('every entry conforms to EducationalContent interface', () => {
    Object.values(educationalContent).forEach((entry: EducationalContent) => {
      // This test primarily validates the TypeScript type is exported correctly
      expect(entry).toHaveProperty('title');
      expect(entry).toHaveProperty('content');
    });
  });

  // -------------------------------------------------------------------------
  // No duplicate titles
  // -------------------------------------------------------------------------

  it('has no duplicate titles', () => {
    const titles = Object.values(educationalContent).map((e) => e.title);
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });
});
