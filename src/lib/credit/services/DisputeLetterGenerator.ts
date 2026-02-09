/**
 * AI Dispute Letter Generator Service
 *
 * Generates professional credit dispute letters using AI for:
 * - Inaccurate information disputes
 * - Identity theft disputes
 * - Outdated information disputes
 * - Goodwill letters
 *
 * Complies with FCRA requirements and best practices.
 */

import { AIMLService } from '@/lib/aiml-service';

// ============================================================================
// TYPES
// ============================================================================

export type DisputeReason =
  | 'inaccurate_balance'
  | 'inaccurate_payment_history'
  | 'account_not_mine'
  | 'identity_theft'
  | 'outdated_information'
  | 'duplicate_account'
  | 'paid_collection'
  | 'unauthorized_inquiry'
  | 'incorrect_personal_info'
  | 'goodwill_adjustment';

export type CreditBureau = 'experian' | 'equifax' | 'transunion';

export interface DisputeItem {
  creditorName: string;
  accountNumber: string;
  disputeReason: DisputeReason;
  currentValue?: string;
  correctValue?: string;
  additionalDetails?: string;
}

export interface DisputeLetterRequest {
  bureau: CreditBureau;
  userInfo: {
    fullName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    ssn?: string; // Last 4 digits only
    dateOfBirth?: string;
  };
  disputeItems: DisputeItem[];
  includeDocumentation?: boolean;
  tone?: 'formal' | 'firm' | 'friendly';
}

export interface GeneratedLetter {
  id: string;
  bureau: CreditBureau;
  letterContent: string;
  letterHtml: string;
  summary: string;
  recommendedDocuments: string[];
  mailingAddress: string;
  createdAt: Date;
  estimatedResponseDays: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BUREAU_ADDRESSES: Record<
  CreditBureau,
  { name: string; address: string }
> = {
  experian: {
    name: 'Experian',
    address: 'P.O. Box 4500\nAllen, TX 75013',
  },
  equifax: {
    name: 'Equifax Information Services LLC',
    address: 'P.O. Box 740256\nAtlanta, GA 30374',
  },
  transunion: {
    name: 'TransUnion Consumer Solutions',
    address: 'P.O. Box 2000\nChester, PA 19016',
  },
};

const DISPUTE_REASON_DESCRIPTIONS: Record<DisputeReason, string> = {
  inaccurate_balance: 'The reported balance is incorrect',
  inaccurate_payment_history: 'The payment history contains errors',
  account_not_mine: 'This account does not belong to me',
  identity_theft: 'This account was opened fraudulently due to identity theft',
  outdated_information: 'This information is outdated and should be removed',
  duplicate_account: 'This account is reported multiple times',
  paid_collection: 'This collection has been paid but is not reflected',
  unauthorized_inquiry: 'This inquiry was not authorized by me',
  incorrect_personal_info: 'My personal information is incorrect',
  goodwill_adjustment: 'Request for goodwill adjustment of late payment',
};

const RECOMMENDED_DOCUMENTS: Record<DisputeReason, string[]> = {
  inaccurate_balance: ['Recent account statement', 'Payment receipts'],
  inaccurate_payment_history: [
    'Bank statements showing payments',
    'Cancelled checks',
  ],
  account_not_mine: [
    'Government-issued ID',
    'Utility bill for address verification',
  ],
  identity_theft: [
    'FTC Identity Theft Report',
    'Police report',
    'Government-issued ID',
  ],
  outdated_information: ['Documentation showing correct dates'],
  duplicate_account: ['Credit report highlighting duplicates'],
  paid_collection: ['Paid in full letter', 'Payment receipt', 'Bank statement'],
  unauthorized_inquiry: ['Statement denying authorization'],
  incorrect_personal_info: [
    'Government-issued ID',
    'Social Security card',
    'Utility bill',
  ],
  goodwill_adjustment: [
    'Payment history showing good standing',
    'Explanation letter',
  ],
};

// ============================================================================
// DISPUTE LETTER GENERATOR CLASS
// ============================================================================

export class DisputeLetterGenerator {
  /**
   * Generate a dispute letter using AI
   */
  async generateLetter(
    request: DisputeLetterRequest
  ): Promise<GeneratedLetter> {
    const bureauInfo = BUREAU_ADDRESSES[request.bureau];
    const tone = request.tone || 'formal';

    // Build dispute items description
    const disputeItemsText = request.disputeItems
      .map((item, index) => {
        const reasonDesc = DISPUTE_REASON_DESCRIPTIONS[item.disputeReason];
        let text = `${index + 1}. Creditor: ${item.creditorName}\n`;
        text += `   Account Number: ${this.maskAccountNumber(item.accountNumber)}\n`;
        text += `   Issue: ${reasonDesc}\n`;
        if (item.currentValue)
          text += `   Currently Reported: ${item.currentValue}\n`;
        if (item.correctValue)
          text += `   Correct Value: ${item.correctValue}\n`;
        if (item.additionalDetails)
          text += `   Details: ${item.additionalDetails}\n`;
        return text;
      })
      .join('\n');

    // Generate letter content using AI
    const prompt = this.buildPrompt(
      request,
      bureauInfo,
      disputeItemsText,
      tone
    );
    const letterContent = await this.callAI(prompt);

    // Generate HTML version
    const letterHtml = this.convertToHtml(letterContent);

    // Collect recommended documents
    const recommendedDocuments = this.getRecommendedDocuments(
      request.disputeItems
    );

    return {
      id: crypto.randomUUID(),
      bureau: request.bureau,
      letterContent,
      letterHtml,
      summary: this.generateSummary(request),
      recommendedDocuments,
      mailingAddress: `${bureauInfo.name}\n${bureauInfo.address}`,
      createdAt: new Date(),
      estimatedResponseDays: 30,
    };
  }

  /**
   * Generate letters for all three bureaus
   */
  async generateAllBureauLetters(
    request: Omit<DisputeLetterRequest, 'bureau'>
  ): Promise<GeneratedLetter[]> {
    const bureaus: CreditBureau[] = ['experian', 'equifax', 'transunion'];

    const letters = await Promise.all(
      bureaus.map((bureau) => this.generateLetter({ ...request, bureau }))
    );

    return letters;
  }

  /**
   * Generate a goodwill letter
   */
  async generateGoodwillLetter(
    creditorName: string,
    accountNumber: string,
    userInfo: DisputeLetterRequest['userInfo'],
    explanation: string
  ): Promise<string> {
    const prompt = `Generate a professional goodwill letter to ${creditorName} requesting removal of a late payment from credit reports.

Customer Information:
- Name: ${userInfo.fullName}
- Account: ${this.maskAccountNumber(accountNumber)}

Customer's Explanation:
${explanation}

Requirements:
1. Be polite, respectful, and appreciative
2. Acknowledge the late payment occurred
3. Explain the circumstances briefly
4. Highlight the customer's otherwise good payment history
5. Request a goodwill adjustment as a one-time courtesy
6. Express commitment to maintaining good standing
7. Keep the letter under 400 words
8. Include appropriate date and signature line

Generate only the letter content, nothing else.`;

    return this.callAI(prompt);
  }

  /**
   * Generate an identity theft dispute letter
   */
  async generateIdentityTheftLetter(
    request: DisputeLetterRequest,
    ftcReportNumber?: string,
    policeReportNumber?: string
  ): Promise<GeneratedLetter> {
    // Add identity theft specific details
    const enhancedRequest = {
      ...request,
      disputeItems: request.disputeItems.map((item) => ({
        ...item,
        additionalDetails: [
          item.additionalDetails,
          ftcReportNumber ? `FTC Report #: ${ftcReportNumber}` : null,
          policeReportNumber ? `Police Report #: ${policeReportNumber}` : null,
        ]
          .filter(Boolean)
          .join('. '),
      })),
    };

    return this.generateLetter(enhancedRequest);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private buildPrompt(
    request: DisputeLetterRequest,
    bureauInfo: { name: string; address: string },
    disputeItemsText: string,
    tone: 'formal' | 'firm' | 'friendly'
  ): string {
    const toneInstructions = {
      formal: 'Use a professional, formal tone throughout.',
      firm: 'Use a firm but professional tone. Be assertive about rights under FCRA.',
      friendly: 'Use a polite, friendly tone while still being professional.',
    };

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `Generate a credit dispute letter following this exact structure:

RECIPIENT:
${bureauInfo.name}
${bureauInfo.address}

SENDER:
${request.userInfo.fullName}
${request.userInfo.address}
${request.userInfo.city}, ${request.userInfo.state} ${request.userInfo.zipCode}

DATE: ${currentDate}

${request.userInfo.ssn ? `SSN (Last 4): XXX-XX-${request.userInfo.ssn}` : ''}
${request.userInfo.dateOfBirth ? `Date of Birth: ${request.userInfo.dateOfBirth}` : ''}

DISPUTE ITEMS:
${disputeItemsText}

REQUIREMENTS:
1. ${toneInstructions[tone]}
2. Reference the Fair Credit Reporting Act (FCRA) Section 611
3. Request investigation within 30 days as required by law
4. Request that the disputed items be verified, corrected, or deleted
5. Request written confirmation of any changes made
6. Include a clear subject line: "Credit Report Dispute - Request for Investigation"
7. Keep the letter professional and under 500 words
8. End with a proper signature block

Generate only the letter content in plain text format. Do not include any explanations or meta-text.`;
  }

  private async callAI(prompt: string): Promise<string> {
    try {
      const aiService = new AIMLService();
      const response = await aiService.chat(
        'anthropic/claude-4.5-sonnet',
        [
          {
            role: 'system',
            content:
              'You are an expert credit repair specialist who writes professional, effective dispute letters. Your letters are legally sound, reference relevant consumer protection laws, and are designed to maximize the chances of successful dispute resolution.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        {
          temperature: 0.3,
          max_tokens: 2000,
        }
      );

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      // DisputeLetterGenerator error: AI generation error
      throw new Error('Failed to generate dispute letter');
    }
  }

  private maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) return accountNumber;
    const lastFour = accountNumber.slice(-4);
    const masked = 'X'.repeat(accountNumber.length - 4);
    return masked + lastFour;
  }

  private convertToHtml(letterContent: string): string {
    // Convert plain text to HTML with proper formatting
    const lines = letterContent.split('\n');
    let html =
      '<div class="dispute-letter" style="font-family: Times New Roman, serif; font-size: 12pt; line-height: 1.5;">';

    for (const line of lines) {
      if (line.trim() === '') {
        html += '<br/>';
      } else if (line.startsWith('Subject:') || line.includes('DISPUTE')) {
        html += `<p style="font-weight: bold;">${line}</p>`;
      } else {
        html += `<p style="margin: 0;">${line}</p>`;
      }
    }

    html += '</div>';
    return html;
  }

  private getRecommendedDocuments(items: DisputeItem[]): string[] {
    const docs = new Set<string>();

    // Always recommend ID
    docs.add('Copy of government-issued photo ID');
    docs.add('Proof of current address (utility bill or bank statement)');

    // Add reason-specific documents
    for (const item of items) {
      const reasonDocs = RECOMMENDED_DOCUMENTS[item.disputeReason] || [];
      reasonDocs.forEach((doc) => docs.add(doc));
    }

    return Array.from(docs);
  }

  private generateSummary(request: DisputeLetterRequest): string {
    const itemCount = request.disputeItems.length;
    const reasons = [
      ...new Set(request.disputeItems.map((i) => i.disputeReason)),
    ];
    const bureauName = BUREAU_ADDRESSES[request.bureau].name;

    return `Dispute letter to ${bureauName} regarding ${itemCount} item(s): ${reasons.map((r) => DISPUTE_REASON_DESCRIPTIONS[r]).join(', ')}.`;
  }
}

// Export singleton instance
export const disputeLetterGenerator = new DisputeLetterGenerator();
