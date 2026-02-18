/**
 * OpenAI Vision Provider
 *
 * Uses GPT-4 Vision (GPT-4o) for tax document OCR and field extraction.
 * Best for understanding document context and complex layouts.
 */

import "openai/shims/node";
import OpenAI from "openai";
import {
  BaseOCRProvider,
  DocumentInput,
  ClassificationResult,
} from "./base-provider";
import type {
  TaxDocumentType,
  ProviderExtractionResult,
  FieldConfidence,
  OCRProviderConfig,
  DOCUMENT_CLASSIFICATION_PROMPT,
  W2_EXTRACTION_PROMPT,
  FORM_1099_DIV_EXTRACTION_PROMPT,
  CHARITABLE_RECEIPT_EXTRACTION_PROMPT,
} from "../types";

const EXTRACTION_PROMPTS: Record<TaxDocumentType, string> = {
  w2: `Extract all fields from this W-2 tax form. Be precise with numbers.
Return JSON: {
  "employerEIN": "XX-XXXXXXX",
  "employerName": "string",
  "employerAddress": "string",
  "employeeSSN": "XXX-XX-XXXX (last 4 only if masked)",
  "employeeName": "string",
  "wagesTipsOtherComp": number,
  "federalIncomeTaxWithheld": number,
  "socialSecurityWages": number,
  "socialSecurityTaxWithheld": number,
  "medicareWagesAndTips": number,
  "medicareTaxWithheld": number,
  "box12Codes": [{"code": "string", "amount": number}],
  "retirementPlan": boolean,
  "stateWages": number,
  "stateIncomeTax": number,
  "stateCode": "XX",
  "taxYear": number
}`,
  "1099_div": `Extract 1099-DIV fields. Return JSON: {
  "payerName": "string",
  "ordinaryDividends": number,
  "qualifiedDividends": number,
  "totalCapitalGainDistributions": number,
  "federalIncomeTaxWithheld": number,
  "foreignTaxPaid": number,
  "taxYear": number
}`,
  "1099_int": `Extract 1099-INT fields. Return JSON: {
  "payerName": "string",
  "interestIncome": number,
  "federalIncomeTaxWithheld": number,
  "taxExemptInterest": number,
  "taxYear": number
}`,
  "1099_b": `Extract 1099-B fields. Return JSON: {
  "payerName": "string",
  "totalProceeds": number,
  "totalCostBasis": number,
  "totalGainLoss": number,
  "federalIncomeTaxWithheld": number,
  "taxYear": number
}`,
  "1099_misc": `Extract 1099-MISC fields. Return JSON: {
  "payerName": "string",
  "rents": number,
  "royalties": number,
  "otherIncome": number,
  "federalIncomeTaxWithheld": number,
  "taxYear": number
}`,
  "1099_nec": `Extract 1099-NEC fields. Return JSON: {
  "payerName": "string",
  "nonemployeeCompensation": number,
  "federalIncomeTaxWithheld": number,
  "taxYear": number
}`,
  "1099_r": `Extract 1099-R fields. Return JSON: {
  "payerName": "string",
  "grossDistribution": number,
  "taxableAmount": number,
  "federalIncomeTaxWithheld": number,
  "distributionCodes": ["string"],
  "taxYear": number
}`,
  "1099_g": `Extract 1099-G fields. Return JSON: {
  "payerName": "string",
  "unemploymentCompensation": number,
  "stateTaxRefund": number,
  "federalIncomeTaxWithheld": number,
  "taxYear": number
}`,
  "1099_ssa": `Extract SSA-1099 fields. Return JSON: {
  "totalBenefitsPaid": number,
  "benefitsRepaid": number,
  "netBenefits": number,
  "voluntaryWithholding": number,
  "taxYear": number
}`,
  k1: `Extract K-1 fields. Return JSON: {
  "partnershipName": "string",
  "partnershipEIN": "string",
  "ordinaryIncome": number,
  "interestIncome": number,
  "dividends": number,
  "capitalGains": number,
  "taxYear": number
}`,
  "1098": `Extract 1098 fields. Return JSON: {
  "lenderName": "string",
  "mortgageInterestReceived": number,
  "outstandingMortgagePrincipal": number,
  "mortgageInsurancePremiums": number,
  "pointsPaidOnPurchase": number,
  "propertyAddress": "string",
  "taxYear": number
}`,
  "1098_e": `Extract 1098-E fields. Return JSON: {
  "lenderName": "string",
  "studentLoanInterestReceived": number,
  "taxYear": number
}`,
  "1098_t": `Extract 1098-T fields. Return JSON: {
  "institutionName": "string",
  "paymentsReceived": number,
  "scholarshipsGrants": number,
  "taxYear": number
}`,
  "5498": `Extract 5498 fields. Return JSON: {
  "issuerName": "string",
  "iraContributions": number,
  "rolloverContributions": number,
  "rothIraConversion": number,
  "fairMarketValue": number,
  "taxYear": number
}`,
  charitable_receipt: `Extract charitable donation receipt. Return JSON: {
  "organizationName": "string",
  "organizationEIN": "string",
  "donorName": "string",
  "donationDate": "YYYY-MM-DD",
  "donationAmount": number,
  "donationType": "cash"|"property"|"stock"|"other",
  "goodsServicesProvided": boolean,
  "goodsServicesValue": number,
  "taxYear": number
}`,
  medical_receipt: `Extract medical expense receipt. Return JSON: {
  "providerName": "string",
  "patientName": "string",
  "serviceDate": "YYYY-MM-DD",
  "amountPaid": number,
  "serviceDescription": "string",
  "taxYear": number
}`,
  property_tax: `Extract property tax statement. Return JSON: {
  "taxingAuthority": "string",
  "propertyAddress": "string",
  "taxAmount": number,
  "taxYear": number,
  "parcelNumber": "string"
}`,
  business_expense: `Extract business expense receipt. Return JSON: {
  "vendorName": "string",
  "expenseDate": "YYYY-MM-DD",
  "amount": number,
  "category": "string",
  "description": "string",
  "taxYear": number
}`,
  unknown: `Attempt to extract any recognizable tax-related fields. Return JSON with any fields you can identify.`,
};

export class OpenAIVisionProvider extends BaseOCRProvider {
  private client: OpenAI | null = null;

  constructor(config: OCRProviderConfig) {
    super({ ...config, provider: "openai_vision" });
  }

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OpenAI API key not configured");
      }
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY;
      return !!apiKey;
    } catch {
      return false;
    }
  }

  async classifyDocument(input: DocumentInput): Promise<ClassificationResult> {
    const client = this.getClient();

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content:
            "You are a tax document classification expert. Analyze the document image and identify its type.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Classify this tax document. Respond in JSON:
{
  "documentType": "w2"|"1099_div"|"1099_int"|"1099_b"|"1099_misc"|"1099_nec"|"1099_r"|"1098"|"1098_e"|"charitable_receipt"|"unknown",
  "taxYear": number or null,
  "confidence": 0-1,
  "reasoning": "brief explanation"
}`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${input.mimeType};base64,${input.base64Image}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "";
    const parsed = this.parseJsonFromResponse(content);

    return {
      documentType: (parsed.documentType as TaxDocumentType) || "unknown",
      confidence: (parsed.confidence as number) || 0.5,
      taxYear: parsed.taxYear as number | undefined,
      reasoning: parsed.reasoning as string | undefined,
    };
  }

  async extractFields(
    input: DocumentInput,
    documentType: TaxDocumentType,
  ): Promise<ProviderExtractionResult> {
    const startTime = Date.now();
    const client = this.getClient();

    try {
      const extractionPrompt =
        EXTRACTION_PROMPTS[documentType] || EXTRACTION_PROMPTS.unknown;

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content: `You are a tax document OCR expert. Extract all visible fields accurately. 
For numbers, remove commas and convert to numeric values.
For dates, use YYYY-MM-DD format.
If a field is not visible or unclear, use null.
Always return valid JSON.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: extractionPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${input.mimeType};base64,${input.base64Image}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
      });

      const content = response.choices[0]?.message?.content || "";
      const fields = this.parseJsonFromResponse(content);

      // Calculate field confidences
      const fieldConfidences: FieldConfidence[] = Object.entries(fields).map(
        ([fieldName, value]) => ({
          fieldName,
          value,
          confidence: this.calculateFieldConfidence(fieldName, value),
          source: "openai_vision" as const,
        }),
      );

      // Calculate overall confidence
      const validFields = fieldConfidences.filter((f) => f.value !== null);
      const overallConfidence =
        validFields.length > 0
          ? validFields.reduce((sum, f) => sum + f.confidence, 0) /
            validFields.length
          : 0;

      return {
        provider: "openai_vision",
        success: true,
        documentType,
        documentTypeConfidence: overallConfidence,
        fields,
        fieldConfidences,
        processingTimeMs: Date.now() - startTime,
        metadata: {
          model: "gpt-4o",
          tokensUsed: response.usage?.total_tokens,
        },
      };
    } catch (error) {
      return {
        provider: "openai_vision",
        success: false,
        documentType,
        documentTypeConfidence: 0,
        fields: {},
        fieldConfidences: [],
        processingTimeMs: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
