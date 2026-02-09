/**
 * LandingAI Provider
 *
 * Uses LandingAI's document understanding API for tax document extraction.
 * Specializes in form understanding and structured data extraction.
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

interface LandingAIResponse {
  predictions: {
    label: string;
    confidence: number;
    text?: string;
    bounding_box?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }[];
  extracted_text?: string;
  document_type?: string;
  fields?: Record<
    string,
    {
      value: string | number;
      confidence: number;
      location?: { x: number; y: number; width: number; height: number };
    }
  >;
  error?: string;
}

export class LandingAIProvider extends BaseOCRProvider {
  private apiKey: string | null = null;
  private endpoint: string;

  constructor(config: OCRProviderConfig) {
    super({ ...config, provider: 'landing_ai' });
    this.endpoint = config.endpoint || 'https://api.landing.ai/v1/document';
  }

  private getApiKey(): string {
    if (!this.apiKey) {
      this.apiKey = this.config.apiKey || process.env.LANDING_AI_API_KEY || '';
      if (!this.apiKey) {
        throw new Error('LandingAI API key not configured');
      }
    }
    return this.apiKey;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const apiKey = this.config.apiKey || process.env.LANDING_AI_API_KEY;
      return !!apiKey;
    } catch {
      return false;
    }
  }

  async classifyDocument(input: DocumentInput): Promise<ClassificationResult> {
    const apiKey = this.getApiKey();

    try {
      const response = await fetch(`${this.endpoint}/classify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: input.base64Image,
          mime_type: input.mimeType,
          document_types: [
            'w2',
            '1099_div',
            '1099_int',
            '1099_b',
            '1099_nec',
            '1099_misc',
            '1099_r',
            '1098',
            '1098_e',
            'charitable_receipt',
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`LandingAI API error: ${response.status}`);
      }

      const data: LandingAIResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Map LandingAI document type to our types
      const documentType = this.mapDocumentType(
        data.document_type || 'unknown'
      );
      const confidence = data.predictions?.[0]?.confidence || 0.5;

      // Extract tax year from predictions
      const yearPrediction = data.predictions?.find(
        (p) => p.label === 'tax_year'
      );
      const taxYear = yearPrediction
        ? parseInt(String(yearPrediction.text))
        : undefined;

      return {
        documentType,
        confidence,
        taxYear,
        reasoning: `LandingAI classified as ${documentType}`,
      };
    } catch (error) {
      // Fallback to basic classification
      return {
        documentType: 'unknown',
        confidence: 0,
        reasoning:
          error instanceof Error ? error.message : 'Classification failed',
      };
    }
  }

  async extractFields(
    input: DocumentInput,
    documentType: TaxDocumentType
  ): Promise<ProviderExtractionResult> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();

    try {
      const response = await fetch(`${this.endpoint}/extract`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: input.base64Image,
          mime_type: input.mimeType,
          document_type: documentType,
          extract_fields: this.getFieldsForDocumentType(documentType),
        }),
      });

      if (!response.ok) {
        throw new Error(`LandingAI API error: ${response.status}`);
      }

      const data: LandingAIResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Convert LandingAI fields to our format
      const fields: Record<string, unknown> = {};
      const fieldConfidences: FieldConfidence[] = [];

      if (data.fields) {
        for (const [fieldName, fieldData] of Object.entries(data.fields)) {
          const normalizedName = this.normalizeFieldName(fieldName);
          fields[normalizedName] = fieldData.value;

          fieldConfidences.push({
            fieldName: normalizedName,
            value: fieldData.value,
            confidence: fieldData.confidence,
            source: 'landing_ai',
            boundingBox: fieldData.location,
          });
        }
      }

      // Also extract from predictions
      if (data.predictions) {
        for (const prediction of data.predictions) {
          const normalizedName = this.normalizeFieldName(prediction.label);
          if (!fields[normalizedName] && prediction.text) {
            fields[normalizedName] = this.parseValue(prediction.text);
            fieldConfidences.push({
              fieldName: normalizedName,
              value: fields[normalizedName],
              confidence: prediction.confidence,
              source: 'landing_ai',
              boundingBox: prediction.bounding_box,
            });
          }
        }
      }

      const validFields = fieldConfidences.filter((f) => f.value !== null);
      const overallConfidence =
        validFields.length > 0
          ? validFields.reduce((sum, f) => sum + f.confidence, 0) /
            validFields.length
          : 0;

      return {
        provider: 'landing_ai',
        success: true,
        documentType,
        documentTypeConfidence: overallConfidence,
        fields,
        fieldConfidences,
        rawText: data.extracted_text,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        provider: 'landing_ai',
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

  private mapDocumentType(landingType: string): TaxDocumentType {
    const typeMap: Record<string, TaxDocumentType> = {
      w2: 'w2',
      form_w2: 'w2',
      '1099-div': '1099_div',
      '1099_div': '1099_div',
      form_1099_div: '1099_div',
      '1099-int': '1099_int',
      '1099_int': '1099_int',
      '1099-b': '1099_b',
      '1099_b': '1099_b',
      '1099-nec': '1099_nec',
      '1099_nec': '1099_nec',
      '1099-misc': '1099_misc',
      '1099_misc': '1099_misc',
      '1099-r': '1099_r',
      '1099_r': '1099_r',
      '1098': '1098',
      form_1098: '1098',
      '1098-e': '1098_e',
      '1098_e': '1098_e',
      charitable_receipt: 'charitable_receipt',
      donation_receipt: 'charitable_receipt',
    };

    return typeMap[landingType.toLowerCase()] || 'unknown';
  }

  private getFieldsForDocumentType(documentType: TaxDocumentType): string[] {
    const fieldMap: Record<TaxDocumentType, string[]> = {
      w2: [
        'employer_ein',
        'employer_name',
        'employer_address',
        'employee_ssn',
        'employee_name',
        'employee_address',
        'wages_tips_other_comp',
        'federal_income_tax_withheld',
        'social_security_wages',
        'social_security_tax_withheld',
        'medicare_wages_and_tips',
        'medicare_tax_withheld',
        'box_12_codes',
        'retirement_plan',
        'state_wages',
        'state_income_tax',
        'state_code',
        'tax_year',
      ],
      '1099_div': [
        'payer_name',
        'ordinary_dividends',
        'qualified_dividends',
        'total_capital_gain_distributions',
        'federal_income_tax_withheld',
        'foreign_tax_paid',
        'tax_year',
      ],
      '1099_int': [
        'payer_name',
        'interest_income',
        'federal_income_tax_withheld',
        'tax_exempt_interest',
        'tax_year',
      ],
      '1099_b': [
        'payer_name',
        'total_proceeds',
        'total_cost_basis',
        'total_gain_loss',
        'federal_income_tax_withheld',
        'tax_year',
      ],
      '1099_nec': [
        'payer_name',
        'nonemployee_compensation',
        'federal_income_tax_withheld',
        'tax_year',
      ],
      '1099_misc': [
        'payer_name',
        'rents',
        'royalties',
        'other_income',
        'federal_income_tax_withheld',
        'tax_year',
      ],
      '1099_r': [
        'payer_name',
        'gross_distribution',
        'taxable_amount',
        'federal_income_tax_withheld',
        'distribution_codes',
        'tax_year',
      ],
      '1099_g': ['payer_name', 'unemployment_compensation', 'tax_year'],
      '1099_ssa': ['total_benefits_paid', 'net_benefits', 'tax_year'],
      k1: ['partnership_name', 'ordinary_income', 'tax_year'],
      '1098': [
        'lender_name',
        'mortgage_interest_received',
        'outstanding_mortgage_principal',
        'mortgage_insurance_premiums',
        'points_paid_on_purchase',
        'property_address',
        'tax_year',
      ],
      '1098_e': ['lender_name', 'student_loan_interest_received', 'tax_year'],
      '1098_t': [
        'institution_name',
        'payments_received',
        'scholarships_grants',
        'tax_year',
      ],
      '5498': [
        'issuer_name',
        'ira_contributions',
        'rollover_contributions',
        'tax_year',
      ],
      charitable_receipt: [
        'organization_name',
        'organization_ein',
        'donor_name',
        'donation_date',
        'donation_amount',
        'donation_type',
        'goods_services_provided',
        'goods_services_value',
        'tax_year',
      ],
      medical_receipt: [
        'provider_name',
        'amount_paid',
        'service_date',
        'tax_year',
      ],
      property_tax: [
        'taxing_authority',
        'property_address',
        'tax_amount',
        'tax_year',
      ],
      business_expense: [
        'vendor_name',
        'amount',
        'expense_date',
        'category',
        'tax_year',
      ],
      unknown: [],
    };

    return fieldMap[documentType] || [];
  }

  private normalizeFieldName(fieldName: string): string {
    // Convert snake_case to camelCase
    return fieldName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private parseValue(text: string): unknown {
    // Try to parse as number
    const cleanedNumber = text.replace(/[$,]/g, '');
    const asNumber = parseFloat(cleanedNumber);
    if (!isNaN(asNumber) && cleanedNumber.match(/^-?\d+\.?\d*$/)) {
      return asNumber;
    }

    // Try to parse as boolean
    if (text.toLowerCase() === 'yes' || text.toLowerCase() === 'true') {
      return true;
    }
    if (text.toLowerCase() === 'no' || text.toLowerCase() === 'false') {
      return false;
    }

    // Return as string
    return text.trim();
  }
}
