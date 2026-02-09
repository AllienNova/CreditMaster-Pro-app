/**
 * Google Vision Provider
 *
 * Uses Google Cloud Vision API for document OCR.
 * Excellent for text extraction and structured data.
 */

import {
  BaseOCRProvider,
  DocumentInput,
  ClassificationResult,
} from './base-provider';
import type {
  TaxDocumentType,
  ProviderExtractionResult,
  FieldConfidence,
  OCRProviderConfig,
} from '../types';

interface GoogleVisionResponse {
  responses: {
    fullTextAnnotation?: {
      text: string;
      pages: unknown[];
    };
    textAnnotations?: {
      description: string;
      boundingPoly: {
        vertices: { x: number; y: number }[];
      };
    }[];
    error?: {
      code: number;
      message: string;
    };
  }[];
}

export class GoogleVisionProvider extends BaseOCRProvider {
  private apiKey: string | null = null;

  constructor(config: OCRProviderConfig) {
    super({ ...config, provider: 'google_vision' });
  }

  private getApiKey(): string {
    if (!this.apiKey) {
      this.apiKey =
        this.config.apiKey || process.env.GOOGLE_VISION_API_KEY || '';
      if (!this.apiKey) {
        throw new Error('Google Vision API key not configured');
      }
    }
    return this.apiKey;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const apiKey = this.config.apiKey || process.env.GOOGLE_VISION_API_KEY;
      return !!apiKey;
    } catch {
      return false;
    }
  }

  async classifyDocument(input: DocumentInput): Promise<ClassificationResult> {
    // First, extract text using Vision API
    const rawText = await this.extractRawText(input);

    // Classify based on text content
    return this.classifyFromText(rawText);
  }

  private async extractRawText(input: DocumentInput): Promise<string> {
    const apiKey = this.getApiKey();
    const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

    const requestBody = {
      requests: [
        {
          image: {
            content: input.base64Image,
          },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        },
      ],
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.status}`);
    }

    const data: GoogleVisionResponse = await response.json();

    if (data.responses[0]?.error) {
      throw new Error(data.responses[0].error.message);
    }

    return data.responses[0]?.fullTextAnnotation?.text || '';
  }

  private classifyFromText(text: string): ClassificationResult {
    const upperText = text.toUpperCase();

    // Document type detection patterns
    const patterns: {
      type: TaxDocumentType;
      patterns: RegExp[];
      weight: number;
    }[] = [
      {
        type: 'w2',
        patterns: [/FORM\s*W-?2/, /WAGE AND TAX STATEMENT/, /BOX\s*1.*WAGES/],
        weight: 0.95,
      },
      {
        type: '1099_div',
        patterns: [/FORM\s*1099-DIV/, /DIVIDENDS AND DISTRIBUTIONS/],
        weight: 0.95,
      },
      {
        type: '1099_int',
        patterns: [/FORM\s*1099-INT/, /INTEREST INCOME/],
        weight: 0.95,
      },
      {
        type: '1099_b',
        patterns: [/FORM\s*1099-B/, /PROCEEDS FROM BROKER/, /BARTER EXCHANGE/],
        weight: 0.95,
      },
      {
        type: '1099_nec',
        patterns: [/FORM\s*1099-NEC/, /NONEMPLOYEE COMPENSATION/],
        weight: 0.95,
      },
      {
        type: '1099_misc',
        patterns: [/FORM\s*1099-MISC/, /MISCELLANEOUS INCOME/],
        weight: 0.95,
      },
      {
        type: '1099_r',
        patterns: [/FORM\s*1099-R/, /DISTRIBUTIONS FROM PENSIONS/],
        weight: 0.95,
      },
      {
        type: '1098',
        patterns: [/FORM\s*1098(?!-)/, /MORTGAGE INTEREST STATEMENT/],
        weight: 0.95,
      },
      {
        type: '1098_e',
        patterns: [/FORM\s*1098-E/, /STUDENT LOAN INTEREST/],
        weight: 0.95,
      },
      {
        type: 'charitable_receipt',
        patterns: [
          /DONATION RECEIPT/,
          /CHARITABLE CONTRIBUTION/,
          /501\(C\)\(3\)/,
          /TAX DEDUCTIBLE/,
        ],
        weight: 0.85,
      },
    ];

    let bestMatch: { type: TaxDocumentType; confidence: number } = {
      type: 'unknown',
      confidence: 0,
    };

    for (const { type, patterns: typePatterns, weight } of patterns) {
      let matchCount = 0;
      for (const pattern of typePatterns) {
        if (pattern.test(upperText)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const confidence = (matchCount / typePatterns.length) * weight;
        if (confidence > bestMatch.confidence) {
          bestMatch = { type, confidence };
        }
      }
    }

    // Extract tax year
    const yearMatch = text.match(
      /(?:TAX YEAR|CALENDAR YEAR|FOR\s+)?20[0-9]{2}/
    );
    const taxYear = yearMatch
      ? parseInt(yearMatch[0].replace(/\D/g, ''))
      : undefined;

    return {
      documentType: bestMatch.type,
      confidence: bestMatch.confidence,
      taxYear,
      reasoning: `Matched ${bestMatch.type} based on text patterns`,
    };
  }

  async extractFields(
    input: DocumentInput,
    documentType: TaxDocumentType
  ): Promise<ProviderExtractionResult> {
    const startTime = Date.now();

    try {
      const rawText = await this.extractRawText(input);
      const fields = this.parseFieldsFromText(rawText, documentType);

      const fieldConfidences: FieldConfidence[] = Object.entries(fields).map(
        ([fieldName, value]) => ({
          fieldName,
          value,
          confidence: this.calculateFieldConfidence(fieldName, value),
          source: 'google_vision' as const,
        })
      );

      const validFields = fieldConfidences.filter((f) => f.value !== null);
      const overallConfidence =
        validFields.length > 0
          ? validFields.reduce((sum, f) => sum + f.confidence, 0) /
            validFields.length
          : 0;

      return {
        provider: 'google_vision',
        success: true,
        documentType,
        documentTypeConfidence: overallConfidence,
        fields,
        fieldConfidences,
        rawText,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        provider: 'google_vision',
        success: false,
        documentType,
        documentTypeConfidence: 0,
        fields: {},
        fieldConfidences: [],
        processingTimeMs: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private parseFieldsFromText(
    text: string,
    documentType: TaxDocumentType
  ): Record<string, unknown> {
    const fields: Record<string, unknown> = {};

    // Common patterns
    const moneyPattern = /\$?([\d,]+\.?\d*)/;
    const ssnPattern = /(\d{3}[-\s]?\d{2}[-\s]?\d{4})/;
    const einPattern = /(\d{2}[-\s]?\d{7})/;

    switch (documentType) {
      case 'w2':
        fields.employerEIN = this.extractPattern(
          text,
          /EMPLOYER.*?ID.*?NUMBER.*?(\d{2}-\d{7})/i
        );
        fields.employerName = this.extractAfterLabel(
          text,
          /EMPLOYER'?S?\s*NAME/i
        );
        fields.employeeName = this.extractAfterLabel(
          text,
          /EMPLOYEE'?S?\s*NAME/i
        );
        fields.wagesTipsOtherComp = this.extractMoney(
          text,
          /BOX\s*1\D*(\$?[\d,]+\.?\d*)/i
        );
        fields.federalIncomeTaxWithheld = this.extractMoney(
          text,
          /BOX\s*2\D*(\$?[\d,]+\.?\d*)/i
        );
        fields.socialSecurityWages = this.extractMoney(
          text,
          /BOX\s*3\D*(\$?[\d,]+\.?\d*)/i
        );
        fields.socialSecurityTaxWithheld = this.extractMoney(
          text,
          /BOX\s*4\D*(\$?[\d,]+\.?\d*)/i
        );
        fields.medicareWagesAndTips = this.extractMoney(
          text,
          /BOX\s*5\D*(\$?[\d,]+\.?\d*)/i
        );
        fields.medicareTaxWithheld = this.extractMoney(
          text,
          /BOX\s*6\D*(\$?[\d,]+\.?\d*)/i
        );
        fields.stateWages = this.extractMoney(
          text,
          /BOX\s*16\D*(\$?[\d,]+\.?\d*)/i
        );
        fields.stateIncomeTax = this.extractMoney(
          text,
          /BOX\s*17\D*(\$?[\d,]+\.?\d*)/i
        );
        fields.stateCode = this.extractPattern(text, /STATE\s*([A-Z]{2})/i);
        break;

      case '1099_div':
        fields.payerName = this.extractAfterLabel(text, /PAYER'?S?\s*NAME/i);
        fields.ordinaryDividends = this.extractMoney(
          text,
          /(?:BOX\s*)?1A?\D*ORDINARY\s*DIVIDENDS?\D*(\$?[\d,]+\.?\d*)/i
        );
        fields.qualifiedDividends = this.extractMoney(
          text,
          /(?:BOX\s*)?1B?\D*QUALIFIED\s*DIVIDENDS?\D*(\$?[\d,]+\.?\d*)/i
        );
        fields.totalCapitalGainDistributions = this.extractMoney(
          text,
          /(?:BOX\s*)?2A?\D*CAPITAL\s*GAIN\D*(\$?[\d,]+\.?\d*)/i
        );
        fields.federalIncomeTaxWithheld = this.extractMoney(
          text,
          /(?:BOX\s*)?4\D*FEDERAL.*?TAX.*?WITHHELD\D*(\$?[\d,]+\.?\d*)/i
        );
        break;

      case '1099_int':
        fields.payerName = this.extractAfterLabel(text, /PAYER'?S?\s*NAME/i);
        fields.interestIncome = this.extractMoney(
          text,
          /(?:BOX\s*)?1\D*INTEREST\s*INCOME\D*(\$?[\d,]+\.?\d*)/i
        );
        fields.federalIncomeTaxWithheld = this.extractMoney(
          text,
          /(?:BOX\s*)?4\D*FEDERAL.*?TAX.*?WITHHELD\D*(\$?[\d,]+\.?\d*)/i
        );
        fields.taxExemptInterest = this.extractMoney(
          text,
          /(?:BOX\s*)?8\D*TAX.?EXEMPT\D*(\$?[\d,]+\.?\d*)/i
        );
        break;

      case '1099_nec':
        fields.payerName = this.extractAfterLabel(text, /PAYER'?S?\s*NAME/i);
        fields.nonemployeeCompensation = this.extractMoney(
          text,
          /(?:BOX\s*)?1\D*NONEMPLOYEE\s*COMPENSATION\D*(\$?[\d,]+\.?\d*)/i
        );
        fields.federalIncomeTaxWithheld = this.extractMoney(
          text,
          /(?:BOX\s*)?4\D*FEDERAL.*?TAX.*?WITHHELD\D*(\$?[\d,]+\.?\d*)/i
        );
        break;

      case '1098':
        fields.lenderName = this.extractAfterLabel(
          text,
          /(?:RECIPIENT|LENDER)'?S?\s*NAME/i
        );
        fields.mortgageInterestReceived = this.extractMoney(
          text,
          /(?:BOX\s*)?1\D*MORTGAGE\s*INTEREST\D*(\$?[\d,]+\.?\d*)/i
        );
        fields.outstandingMortgagePrincipal = this.extractMoney(
          text,
          /(?:BOX\s*)?2\D*OUTSTANDING.*?PRINCIPAL\D*(\$?[\d,]+\.?\d*)/i
        );
        fields.mortgageInsurancePremiums = this.extractMoney(
          text,
          /(?:BOX\s*)?5\D*MORTGAGE\s*INSURANCE\D*(\$?[\d,]+\.?\d*)/i
        );
        break;

      case 'charitable_receipt':
        fields.organizationName = this.extractAfterLabel(
          text,
          /(?:ORGANIZATION|CHARITY)\s*NAME/i
        );
        fields.donationAmount = this.extractFirstMoney(text);
        fields.donationDate = this.extractDate(text);
        break;

      default:
        // Generic extraction for unknown types
        const ssnMatch = text.match(ssnPattern);
        if (ssnMatch) fields.ssn = ssnMatch[1];
        const einMatch = text.match(einPattern);
        if (einMatch) fields.ein = einMatch[1];
        fields.amounts = this.extractAllMoney(text);
    }

    // Extract tax year for all types
    const yearMatch = text.match(/20[2-9]\d/);
    if (yearMatch) {
      fields.taxYear = parseInt(yearMatch[0]);
    }

    return fields;
  }

  private extractPattern(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match ? match[1] : null;
  }

  private extractAfterLabel(text: string, labelPattern: RegExp): string | null {
    const match = text.match(
      new RegExp(labelPattern.source + '\\s*[:\\n]?\\s*([^\\n]+)', 'i')
    );
    return match ? match[1].trim() : null;
  }

  private extractMoney(text: string, pattern: RegExp): number | null {
    const match = text.match(pattern);
    if (!match) return null;
    const numStr = match[1].replace(/[$,]/g, '');
    const num = parseFloat(numStr);
    return isNaN(num) ? null : num;
  }

  private extractFirstMoney(text: string): number | null {
    const match = text.match(/\$?([\d,]+\.?\d*)/);
    if (!match) return null;
    const numStr = match[1].replace(/,/g, '');
    const num = parseFloat(numStr);
    return isNaN(num) ? null : num;
  }

  private extractAllMoney(text: string): number[] {
    const matches = text.matchAll(/\$?([\d,]+\.\d{2})/g);
    return Array.from(matches)
      .map((m) => parseFloat(m[1].replace(/,/g, '')))
      .filter((n) => !isNaN(n));
  }

  private extractDate(text: string): string | null {
    // Try various date formats
    const patterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{4}-\d{2}-\d{2})/,
      /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  }
}
