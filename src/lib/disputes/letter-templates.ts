/**
 * The dispute letter catalogue.
 *
 * Product content — the letters this app offers and the variables each one
 * needs — not user data. It lived as a module-local `const` inside
 * /api/disputes/templates/route.ts, which meant the detail route
 * /api/disputes/templates/[id] had no way to reach it without a second copy.
 * Two copies of a catalogue is the drift this codebase has been paying for
 * elsewhere, so it lives here once and both routes import it.
 *
 * ONE FIELD TO BE CAREFUL WITH. `successRate` is a hardcoded number on each
 * template — 65 for the goodwill letter, and so on. Nothing measures it.
 * `public.dispute_template_usage` exists with exactly the columns that would
 * (template_id, dispute_id, outcome) and is written by nothing, read by
 * nothing. The figure reaches users through this catalogue and through
 * /api/disputes/generate, presented as a fact about how often a letter works.
 * See docs/specs/security-findings.md SF-09. It is carried here unchanged
 * rather than quietly dropped, because removing it changes what an existing
 * screen shows and that is the owner's call — but nothing new should treat it
 * as measured.
 */

export interface DisputeTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  successRate: number;
  template: string;
  variables: string[];
}

export const DISPUTE_TEMPLATES: DisputeTemplate[] = [
  {
    id: "late-payment-goodwill",
    name: "Late Payment Goodwill Letter",
    category: "late_payment",
    description: "Request removal of late payment due to good payment history",
    successRate: 65,
    template: `Dear {{creditor_name}},

I am writing to request a goodwill adjustment to remove the late payment reported on my account ending in {{account_last4}} for {{late_date}}.

I have been a loyal customer for {{years_as_customer}} years and have otherwise maintained an excellent payment history. The late payment was due to {{reason}}, which was an isolated incident.

I would greatly appreciate if you would consider removing this late payment from my credit report as a gesture of goodwill. This would help me {{goal}}.

Thank you for your consideration.

Sincerely,
{{your_name}}`,
    variables: [
      "creditor_name",
      "account_last4",
      "late_date",
      "years_as_customer",
      "reason",
      "goal",
      "your_name",
    ],
  },
  {
    id: "debt-validation",
    name: "Debt Validation Letter",
    category: "collection",
    description: "Request proof that debt is valid and belongs to you",
    successRate: 45,
    template: `Dear {{collection_agency}},

I am writing in response to your communication regarding an alleged debt. Under the Fair Debt Collection Practices Act (FDCPA), I am requesting validation of this debt.

Please provide:
1. The original creditor name
2. The original account number
3. Proof that the debt belongs to me
4. Verification of the amount owed
5. Proof you are licensed to collect in my state

Until this debt is validated, please cease all collection activities and do not report to credit bureaus.

Sincerely,
{{your_name}}
{{your_address}}`,
    variables: ["collection_agency", "your_name", "your_address"],
  },
  {
    id: "pay-for-delete",
    name: "Pay for Delete Agreement",
    category: "collection",
    description: "Negotiate removal of collection in exchange for payment",
    successRate: 55,
    template: `Dear {{collection_agency}},

I am writing regarding the account {{account_reference}} with a balance of {{balance}}.

I am willing to pay {{offer_amount}} to settle this debt in full, contingent upon your agreement to:
1. Remove all references to this account from all credit bureaus
2. Mark the account as "Paid in Full" or deleted entirely
3. Provide written confirmation of this agreement before payment

Please respond in writing within 30 days if you agree to these terms.

Sincerely,
{{your_name}}`,
    variables: [
      "collection_agency",
      "account_reference",
      "balance",
      "offer_amount",
      "your_name",
    ],
  },
  {
    id: "inquiry-dispute",
    name: "Unauthorized Inquiry Dispute",
    category: "inquiry",
    description: "Dispute hard inquiry you did not authorize",
    successRate: 70,
    template: `To Whom It May Concern,

I am disputing the following hard inquiry on my credit report:

Company: {{company_name}}
Date: {{inquiry_date}}

I did not authorize this inquiry and request its immediate removal from my credit file. Under the Fair Credit Reporting Act, inquiries must be made with permissible purpose and consumer consent.

Please investigate and remove this unauthorized inquiry within 30 days.

Sincerely,
{{your_name}}
SSN: XXX-XX-{{ssn_last4}}`,
    variables: ["company_name", "inquiry_date", "your_name", "ssn_last4"],
  },
  {
    id: "not-my-account",
    name: "Account Not Mine Dispute",
    category: "fraud",
    description: "Dispute account that does not belong to you",
    successRate: 80,
    template: `Dear {{bureau_name}},

I am disputing the following account which does not belong to me:

Account Name: {{account_name}}
Account Number: {{account_number}}
Reported Balance: {{balance}}

This account is the result of identity theft / mixed file / error. I have never opened or authorized this account.

Please investigate and remove this account from my credit report within 30 days as required by the FCRA.

Sincerely,
{{your_name}}`,
    variables: [
      "bureau_name",
      "account_name",
      "account_number",
      "balance",
      "your_name",
    ],
  },
];

/** One template by id, or undefined. */
export function findDisputeTemplate(id: string): DisputeTemplate | undefined {
  return DISPUTE_TEMPLATES.find((t) => t.id === id);
}
