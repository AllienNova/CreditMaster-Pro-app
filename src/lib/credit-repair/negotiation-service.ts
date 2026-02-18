/**
 * Negotiation Service
 *
 * Handles goodwill letters and pay-for-delete negotiations
 * Uses AI to generate personalized negotiation letters
 */

import type { LetterGenerationResponse } from "./types";

interface NegotiationUserInfo {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  email?: string;
}

/**
 * Negotiation Service Class
 */
class NegotiationService {
  /**
   * Generate goodwill letter for late payment removal
   */
  async generateGoodwillLetter(
    accountId: string,
    creditorName: string,
    latePaymentDate: Date,
    reason: string,
    userInfo: NegotiationUserInfo,
  ): Promise<LetterGenerationResponse> {
    try {
      // Create personalized goodwill letter using AI
      const prompt = `
Generate a professional goodwill letter to request removal of a late payment.

Creditor: ${creditorName}
Late Payment Date: ${latePaymentDate.toLocaleDateString()}
Reason for Late Payment: ${reason}
Customer Name: ${userInfo.name}
Account History: Generally positive (assume customer has been a good customer)

The letter should:
1. Be professional and respectful
2. Acknowledge the late payment
3. Explain the reason (without making excuses)
4. Emphasize the customer's otherwise positive history
5. Request removal as a courtesy
6. Express commitment to future on-time payments

Tone: Professional but warm, humble but confident
Length: 1 page maximum
      `.trim();

      // Generate letter using AI (would use aiOrchestrator in production)
      const letter = await this.generateLetterWithAI(prompt);

      // Generate tips
      const tips = [
        "Send to the creditor, not the credit bureaus",
        "Be honest and sincere in your explanation",
        "Emphasize your positive payment history",
        "Follow up after 2-3 weeks if no response",
        "Be prepared for rejection - success rate is ~60%",
        "Consider calling after sending the letter",
      ];

      // Calculate follow-up date (21 days from now)
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + 21);

      return {
        letter,
        subject: `Request for Goodwill Adjustment - Account ${accountId}`,
        tips,
        followUpDate,
      };
    } catch (error) {
      // NegotiationService error: Error generating goodwill letter
      throw error;
    }
  }

  /**
   * Generate negotiation script for pay-for-delete
   */
  async generateNegotiationScript(
    collectionId: string,
    collectionAgency: string,
    originalCreditor: string,
    originalBalance: number,
    currentBalance: number,
    userInfo: NegotiationUserInfo,
  ): Promise<{
    phoneScript: string;
    emailScript: string;
    letterScript: string;
  }> {
    try {
      // Calculate settlement offer (30-50% of balance)
      const settlementOffer = Math.round(currentBalance * 0.4); // 40% offer
      const settlementPercentage = 40;

      // Generate phone script
      const phoneScript = `
PHONE NEGOTIATION SCRIPT FOR PAY-FOR-DELETE

IMPORTANT: Record the call (if legal in your state) or take detailed notes.

Opening:
"Hello, my name is ${userInfo.name}. I'm calling about account number ${collectionId} with ${collectionAgency}. I'd like to discuss settling this account."

Wait for response, then:

"I understand the current balance is $${currentBalance.toFixed(2)}. I'm prepared to settle this account today, but I need something in return."

Pause for response.

The Ask:
"I'm willing to pay $${settlementOffer.toFixed(2)} (${settlementPercentage}% of the balance) if you agree to delete this account from my credit reports entirely. This is called a pay-for-delete agreement."

If they say they can't do that:
"I understand that's your policy, but I'm only interested in settling if the account will be removed from my credit reports. Otherwise, I'll need to consider other options."

If they agree:
"Great! I need this agreement in writing before I make any payment. Can you email or mail me a letter on company letterhead stating that upon receipt of $${settlementOffer.toFixed(2)}, you will delete this account from all three credit bureaus?"

NEVER pay before getting written agreement!

If they counter-offer:
"I appreciate the counter-offer, but $${settlementOffer.toFixed(2)} is my maximum budget. Can you work with that amount if I pay today?"

Closing:
"Once I receive the written agreement, I'll send payment via [certified check/money order]. Please confirm the mailing address."

REMEMBER:
- Be polite but firm
- Never admit the debt is yours
- Never give bank account information
- Get everything in writing
- Don't pay until you have written agreement
      `.trim();

      // Generate email script
      const emailScript = `
Subject: Settlement Offer for Account ${collectionId}

Dear ${collectionAgency} Collections Department,

I am writing regarding account number ${collectionId}, which was originally with ${originalCreditor}.

I understand the current balance is $${currentBalance.toFixed(2)}. I am experiencing financial hardship and am unable to pay the full amount. However, I am prepared to settle this account.

I am offering to pay $${settlementOffer.toFixed(2)} (${settlementPercentage}% of the balance) as payment in full, with the following conditions:

1. Upon receipt of payment, ${collectionAgency} will delete this account from all three credit bureaus (Experian, Equifax, and TransUnion)
2. ${collectionAgency} will provide written confirmation of this agreement before payment is made
3. ${collectionAgency} will not sell or transfer this debt to another agency
4. This settlement will be reported as "paid in full" or deleted entirely

If you agree to these terms, please send me a written agreement on company letterhead to:

${userInfo.address || "[Your Address]"}

Or email to: ${userInfo.email}

Once I receive the written agreement, I will send payment via certified check within 5 business days.

Please respond within 7 days to confirm acceptance of this offer.

Sincerely,
${userInfo.name}
      `.trim();

      // Generate formal letter
      const letterScript = `
${userInfo.name}
${userInfo.address || "[Your Address]"}
${userInfo.city || "[City]"}, ${userInfo.state || "[State]"} ${userInfo.zip || "[ZIP]"}

${new Date().toLocaleDateString()}

${collectionAgency}
[Collection Agency Address]

RE: Account Number ${collectionId}
    Original Creditor: ${originalCreditor}

Dear Sir or Madam,

I am writing to propose a settlement for the above-referenced account, which currently has a balance of $${currentBalance.toFixed(2)}.

Due to financial hardship, I am unable to pay the full balance. However, I am prepared to offer $${settlementOffer.toFixed(2)} (${settlementPercentage}% of the current balance) as payment in full settlement of this account.

This offer is contingent upon the following conditions:

1. DELETION FROM CREDIT REPORTS: Upon receipt of payment, ${collectionAgency} agrees to request deletion of this account from all three major credit bureaus (Experian, Equifax, and TransUnion). This is commonly known as a "pay-for-delete" agreement.

2. WRITTEN CONFIRMATION: ${collectionAgency} will provide written confirmation of this agreement on company letterhead before any payment is made.

3. NO FURTHER COLLECTION: ${collectionAgency} agrees not to sell, transfer, or assign this debt to any other party.

4. PAYMENT METHOD: Payment will be made via certified check or money order within 5 business days of receiving written confirmation of this agreement.

5. FINAL SETTLEMENT: This payment represents full and final settlement of this account, and ${collectionAgency} agrees to report this account as "paid in full" or delete it entirely.

Please respond to this offer within 14 days. If I do not receive a response, I will assume this offer has been declined and will explore other options.

You may respond by mail to the address above or by email to ${userInfo.email}.

I look forward to resolving this matter amicably.

Sincerely,

${userInfo.name}
      `.trim();

      return {
        phoneScript,
        emailScript,
        letterScript,
      };
    } catch (error) {
      // NegotiationService error: Error generating negotiation script
      throw error;
    }
  }

  /**
   * Calculate settlement amount (30-50% of balance)
   */
  calculateSettlement(
    currentBalance: number,
    percentage: number = 40,
  ): {
    settlementAmount: number;
    percentage: number;
    savings: number;
  } {
    const settlementAmount = Math.round(currentBalance * (percentage / 100));
    const savings = currentBalance - settlementAmount;

    return {
      settlementAmount,
      percentage,
      savings,
    };
  }

  /**
   * Generate pay-for-delete agreement template
   */
  async generatePayForDeleteAgreement(
    collectionAgency: string,
    accountNumber: string,
    settlementAmount: number,
    userInfo: NegotiationUserInfo,
  ): Promise<string> {
    const agreement = `
PAY-FOR-DELETE AGREEMENT

This Agreement is entered into on ${new Date().toLocaleDateString()} between:

CREDITOR: ${collectionAgency}
DEBTOR: ${userInfo.name}

ACCOUNT INFORMATION:
Account Number: ${accountNumber}
Settlement Amount: $${settlementAmount.toFixed(2)}

TERMS AND CONDITIONS:

1. PAYMENT: Debtor agrees to pay Creditor the sum of $${settlementAmount.toFixed(2)} as full and final settlement of the above-referenced account.

2. DELETION FROM CREDIT REPORTS: Upon receipt of payment, Creditor agrees to:
   a) Request deletion of this account from all three major credit bureaus (Experian, Equifax, and TransUnion)
   b) Provide written confirmation of deletion requests within 10 business days
   c) Not report this account to any credit bureau in the future

3. PAYMENT METHOD: Payment will be made via [certified check/money order] within 5 business days of both parties signing this agreement.

4. FINAL SETTLEMENT: This payment represents full and final settlement of this account. Creditor agrees to:
   a) Not pursue any further collection action
   b) Not sell or transfer this debt
   c) Provide a "paid in full" letter upon receipt of payment

5. NO ADMISSION: This agreement does not constitute an admission of liability by Debtor.

6. BINDING AGREEMENT: This agreement is binding upon both parties and their successors.

CREDITOR SIGNATURE:

_________________________________
${collectionAgency} Representative
Date: _____________

DEBTOR SIGNATURE:

_________________________________
${userInfo.name}
Date: _____________

IMPORTANT: Do not sign or pay until the creditor signs first!
    `.trim();

    return agreement;
  }

  /**
   * Generate debt validation letter (FDCPA-compliant)
   */
  async generateValidationLetter(
    collectionAgency: string,
    accountNumber: string,
    userInfo: NegotiationUserInfo,
  ): Promise<LetterGenerationResponse> {
    const letter = `
${userInfo.name}
${userInfo.address || "[Your Address]"}
${userInfo.city || "[City]"}, ${userInfo.state || "[State]"} ${userInfo.zip || "[ZIP]"}

${new Date().toLocaleDateString()}

${collectionAgency}
[Collection Agency Address]

RE: Account Number ${accountNumber}

Dear Sir or Madam,

This letter is sent pursuant to the Fair Debt Collection Practices Act (FDCPA), 15 USC 1692g.

I am requesting validation of the debt you claim I owe. Under the FDCPA, you are required to provide me with the following information:

1. The amount of the debt
2. The name of the original creditor
3. Proof that you are licensed to collect debts in my state
4. Verification that the debt is within the statute of limitations
5. A copy of the original signed contract or agreement
6. Proof that you own this debt or have been assigned this debt
7. A complete account history showing all charges, payments, and fees

Until you provide this validation, you must:
- Cease all collection activities
- Not report this debt to any credit bureau
- Not contact me except to confirm receipt of this letter or provide the requested validation

Please note that this is NOT a refusal to pay, but a request for validation as allowed under the FDCPA.

Please send all correspondence to the address above. Do not contact me by phone.

Sincerely,

${userInfo.name}

IMPORTANT: Send via certified mail with return receipt requested.
    `.trim();

    const tips = [
      "Send within 30 days of first contact from collector",
      "Send via certified mail with return receipt",
      "Keep copies of everything",
      "Collector must stop collection until they validate",
      "If they can't validate, they must delete from credit reports",
      "This is your legal right under FDCPA",
    ];

    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 30);

    return {
      letter,
      subject: `Debt Validation Request - Account ${accountNumber}`,
      tips,
      followUpDate,
    };
  }

  // Private helper methods

  private async generateLetterWithAI(prompt: string): Promise<string> {
    void prompt;
    // In production, would use aiOrchestrator
    // For now, return a template
    return `[AI-generated letter would appear here based on the prompt]`;
  }
}

// Export singleton instance
export const negotiationService = new NegotiationService();
export default negotiationService;
