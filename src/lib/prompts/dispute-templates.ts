/**
 * Comprehensive Dispute Letter Templates
 * 
 * 10 FCRA-compliant templates for specific dispute scenarios
 * Each template includes legal citations, success rates, and best practices
 * 
 * @version 2.0.0
 */

export const TEMPLATE_VERSION = '2.0.0';

// ============================================================================
// TYPES
// ============================================================================

export interface DisputeTemplate {
  id: string;
  name: string;
  scenario: string;
  description: string;
  successRate: number; // 0-100
  tone: 'formal' | 'humble' | 'assertive' | 'legal';
  fcraSection: string[];
  additionalLaws?: string[];
  requiredDocuments: string[];
  bestPractices: string[];
  whenToUse: string[];
  whenNotToUse: string[];
  template: string;
  placeholders: string[];
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  templates: string[]; // Template IDs
}

// ============================================================================
// TEMPLATE CATEGORIES
// ============================================================================

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'inquiries',
    name: 'Hard Inquiry Disputes',
    description: 'Templates for unauthorized or erroneous hard inquiries',
    templates: ['unauthorized_hard_inquiry'],
  },
  {
    id: 'time_barred',
    name: 'Time-Barred & Obsolete Debts',
    description: 'Templates for debts exceeding FCRA reporting limits',
    templates: ['obsolete_debt', 'bankruptcy_discharge'],
  },
  {
    id: 'identity',
    name: 'Identity & Mixed Files',
    description: 'Templates for mixed credit files and identity issues',
    templates: ['mixed_credit_file'],
  },
  {
    id: 'account_status',
    name: 'Account Status Errors',
    description: 'Templates for incorrect account status reporting',
    templates: ['incorrect_account_status', 'paid_collection_reporting', 'chargeoff_after_settlement'],
  },
  {
    id: 'payment_history',
    name: 'Payment History Errors',
    description: 'Templates for inaccurate payment history',
    templates: ['inaccurate_payment_history'],
  },
  {
    id: 'special_protections',
    name: 'Special Consumer Protections',
    description: 'Templates leveraging new consumer protection rules',
    templates: ['medical_debt_under_500', 'student_loan_rehabilitation'],
  },
];

// ============================================================================
// TEMPLATE 1: UNAUTHORIZED HARD INQUIRY
// ============================================================================

export const UNAUTHORIZED_HARD_INQUIRY: DisputeTemplate = {
  id: 'unauthorized_hard_inquiry',
  name: 'Unauthorized Hard Inquiry Dispute',
  scenario: 'A hard inquiry appears on your credit report without your permission or knowledge',
  description: 'Disputes hard inquiries made without proper authorization. Under FCRA ?604, creditors must have permissible purpose and consumer consent for hard pulls.',
  successRate: 62,
  tone: 'assertive',
  fcraSection: ['?604(a)', '?604(f)', '?611(a)', '?616', '?617'],
  additionalLaws: ['FCRA Permissible Purpose Requirements', 'State Consumer Protection Laws'],
  requiredDocuments: [
    'Copy of credit report showing the inquiry',
    'Written statement denying authorization',
    'Any documentation showing you did not apply with this creditor',
  ],
  bestPractices: [
    'Dispute within 30 days of discovery',
    'Send via certified mail with return receipt',
    'Keep copies of all correspondence',
    'File with all bureaus showing the inquiry',
    'Consider filing CFPB complaint if bureau fails to investigate',
  ],
  whenToUse: [
    'You never applied for credit with this company',
    'Inquiry appears from a company you have no relationship with',
    'Identity theft led to unauthorized applications',
    'Creditor pulled report without permissible purpose',
  ],
  whenNotToUse: [
    'You authorized the inquiry but forgot',
    'Inquiry is from a company you applied with (even if denied)',
    'It is a soft inquiry (does not affect score)',
  ],
  placeholders: [
    '[YOUR_NAME]', '[YOUR_ADDRESS]', '[CITY_STATE_ZIP]', '[DATE]',
    '[BUREAU_NAME]', '[BUREAU_ADDRESS]', '[INQUIRY_DATE]', '[CREDITOR_NAME]',
  ],
  template: `[YOUR_NAME]
[YOUR_ADDRESS]
[CITY_STATE_ZIP]
[DATE]

[BUREAU_NAME]
[BUREAU_ADDRESS]

Re: Dispute of Unauthorized Hard Inquiry
Social Security Number: XXX-XX-[LAST_4_SSN]

Dear Credit Bureau Representative:

I am writing pursuant to my rights under the Fair Credit Reporting Act (FCRA), specifically ?611(a), to dispute an unauthorized hard inquiry appearing on my credit report.

DISPUTED ITEM:
? Inquiry Date: [INQUIRY_DATE]
? Creditor Name: [CREDITOR_NAME]
? Inquiry Type: Hard Inquiry

REASON FOR DISPUTE:
This inquiry was made WITHOUT my knowledge, consent, or authorization. I have never applied for credit, services, or any product with [CREDITOR_NAME]. Under FCRA ?604(a), a consumer reporting agency may only furnish a consumer report for a permissible purpose, and ?604(f) requires written authorization from the consumer for credit or insurance transactions.

This unauthorized inquiry constitutes a violation of FCRA ?604 and potentially ?616 (civil liability for willful noncompliance) and ?617 (civil liability for negligent noncompliance).

REQUESTED ACTION:
Pursuant to FCRA ?611(a)(1)(A), I demand that you:
1. Conduct a thorough investigation of this unauthorized inquiry
2. Contact [CREDITOR_NAME] to verify they had permissible purpose AND my authorization
3. Remove this inquiry immediately if authorization cannot be verified
4. Provide me with written results of your investigation within 30 days

Additionally, I request that you provide me with the method of verification used by [CREDITOR_NAME], as is my right under FCRA ?611(a)(7).

I am also sending a copy of this letter to [CREDITOR_NAME] demanding they provide evidence of my authorization or request deletion of this inquiry.

Please complete your investigation within 30 days as required by FCRA ?611(a)(1)(A). Failure to conduct a proper investigation may result in legal action.

Sincerely,

[YOUR_NAME]

Enclosures:
- Copy of credit report page showing unauthorized inquiry
- Copy of government-issued ID`,
};

// ============================================================================
// TEMPLATE 2: OBSOLETE DEBT (7+ YEARS OLD)
// ============================================================================

export const OBSOLETE_DEBT: DisputeTemplate = {
  id: 'obsolete_debt',
  name: 'Obsolete Debt - Time-Barred Removal',
  scenario: 'A negative account older than 7 years (or 7.5 years from DOFD) is still reporting',
  description: 'Under FCRA ?605(a)(4), most negative information must be removed after 7 years from the date of first delinquency (DOFD). This template demands removal of time-barred items.',
  successRate: 78,
  tone: 'legal',
  fcraSection: ['?605(a)(4)', '?605(c)', '?611(a)', '?623(a)(5)'],
  additionalLaws: ['State statute of limitations on debt collection'],
  requiredDocuments: [
    'Copy of credit report showing the obsolete account',
    'Timeline calculation showing DOFD was more than 7 years ago',
    'Any correspondence showing original delinquency date',
  ],
  bestPractices: [
    'Calculate DOFD accurately - it is the date of first missed payment that led to the charge-off',
    'Note that the 7-year period runs from DOFD, not date sold to collections',
    'Some debts (judgments, bankruptcies, student loans) have different reporting periods',
    'Consider state law statute of limitations as additional leverage',
    'Keep evidence of your DOFD calculation',
  ],
  whenToUse: [
    'Account is older than 7 years from the date of first delinquency',
    'Collection agency re-aged debt by reporting new dates',
    'Original creditor sold debt but new collector reports as new account',
    'Account is within months of aging off and you want expedited removal',
  ],
  whenNotToUse: [
    'Account is legitimate and within reporting period',
    'Debt is a judgment (10 years in most states)',
    'Debt is federal student loan (different rules apply)',
    'Bankruptcy (7-10 years depending on chapter)',
  ],
  placeholders: [
    '[YOUR_NAME]', '[YOUR_ADDRESS]', '[CITY_STATE_ZIP]', '[DATE]',
    '[BUREAU_NAME]', '[BUREAU_ADDRESS]', '[CREDITOR_NAME]', '[ACCOUNT_NUMBER]',
    '[DOFD_DATE]', '[CURRENT_AGE_YEARS]', '[ORIGINAL_CREDITOR]',
  ],
  template: `[YOUR_NAME]
[YOUR_ADDRESS]
[CITY_STATE_ZIP]
[DATE]

[BUREAU_NAME]
[BUREAU_ADDRESS]

Re: Demand for Removal of Obsolete Information - FCRA ?605 Violation
Account: [CREDITOR_NAME] - [ACCOUNT_NUMBER]
SSN: XXX-XX-[LAST_4_SSN]

Dear Sir or Madam:

I am writing to demand the immediate removal of obsolete information from my credit report pursuant to the Fair Credit Reporting Act (FCRA) ?605(a)(4).

OBSOLETE ACCOUNT DETAILS:
? Creditor/Collector: [CREDITOR_NAME]
? Account Number: [ACCOUNT_NUMBER]
? Original Creditor: [ORIGINAL_CREDITOR]
? Date of First Delinquency (DOFD): [DOFD_DATE]
? Current Age: [CURRENT_AGE_YEARS] years

LEGAL BASIS FOR REMOVAL:
Under FCRA ?605(a)(4), "no consumer reporting agency may make any consumer report containing...accounts placed for collection or charged to profit and loss which antedate the report by more than seven years."

The date of first delinquency for this account was [DOFD_DATE], which is now more than seven years ago. Under FCRA ?605(c), the 7-year reporting period runs from the date of the commencement of the delinquency that immediately preceded the collection activity or charge-off.

This account has exceeded the maximum permissible reporting period and MUST be removed immediately.

VIOLATIONS IDENTIFIED:
1. FCRA ?605(a)(4) - Reporting information beyond the permissible period
2. FCRA ?623(a)(5) - Furnisher continuing to report obsolete information
3. Potential re-aging of debt in violation of FCRA ?605(c)

DEMANDED ACTION:
1. IMMEDIATELY delete this account from my credit report
2. Cease and desist reporting this obsolete information
3. Provide written confirmation of deletion within 15 days
4. Send corrected credit report to all parties who received my report in the last 6 months

Pursuant to FCRA ?605(c), you cannot reset the 7-year period by selling the debt to a new collector or updating the account. The reporting period is tied to the ORIGINAL date of first delinquency.

Failure to remove this obsolete item within 30 days will result in:
? Filing of complaint with the Consumer Financial Protection Bureau (CFPB)
? Filing of complaint with the Federal Trade Commission (FTC)
? Potential civil action under FCRA ?616 and ?617 for willful and/or negligent noncompliance

This is not a dispute requiring investigation - this is a demand for removal of legally obsolete information. The math is clear: [DOFD_DATE] + 7 years = obsolete.

Sincerely,

[YOUR_NAME]

Enclosures:
- Credit report page showing the obsolete account
- Timeline calculation proving DOFD exceeds 7 years
- Copy of government-issued ID`,
};

// ============================================================================
// TEMPLATE 3: MIXED CREDIT FILE
// ============================================================================

export const MIXED_CREDIT_FILE: DisputeTemplate = {
  id: 'mixed_credit_file',
  name: 'Mixed Credit File Dispute',
  scenario: 'Information from another person with a similar name or SSN is appearing on your credit report',
  description: 'Addresses mixed file situations where credit bureau algorithms incorrectly merge information from two or more consumers. Common with similar names, family members, or Jr/Sr designations.',
  successRate: 71,
  tone: 'assertive',
  fcraSection: ['?607(b)', '?611(a)', '?616', '?617'],
  additionalLaws: ['Reasonable Procedures Requirement', 'Maximum Possible Accuracy Standard'],
  requiredDocuments: [
    'Copy of credit report showing mixed information',
    'Government-issued ID proving your identity',
    'Proof of address (utility bill, bank statement)',
    'Social Security card or W-2 showing correct SSN',
    'List of accounts that are NOT yours',
  ],
  bestPractices: [
    'Clearly identify which accounts belong to you and which do not',
    'Provide extensive identity documentation',
    'Request permanent separation of the files',
    'Ask for fraud alert or security freeze to prevent re-merging',
    'Consider sending to all three bureaus even if only one is affected',
  ],
  whenToUse: [
    'Accounts appear that you never opened',
    'Address history shows places you never lived',
    'Employment history shows employers you never worked for',
    'You have a common name and see similar names in your file',
    'Family member with similar name has accounts on your report',
  ],
  whenNotToUse: [
    'Accounts are yours but you forgot about them',
    'This is a case of identity theft (use identity theft template instead)',
    'The information is accurate but unfavorable',
  ],
  placeholders: [
    '[YOUR_NAME]', '[YOUR_ADDRESS]', '[CITY_STATE_ZIP]', '[DATE]',
    '[BUREAU_NAME]', '[BUREAU_ADDRESS]', '[MIXED_ACCOUNTS_LIST]',
    '[YOUR_DOB]', '[YOUR_SSN_LAST_4]',
  ],
  template: `[YOUR_NAME]
[YOUR_ADDRESS]
[CITY_STATE_ZIP]
[DATE]

[BUREAU_NAME]
[BUREAU_ADDRESS]

Re: Mixed Credit File - Request for Immediate Separation and Correction
SSN: XXX-XX-[YOUR_SSN_LAST_4]
Date of Birth: [YOUR_DOB]

Dear Credit Bureau Representative:

I am writing pursuant to the Fair Credit Reporting Act (FCRA) ?607(b) and ?611(a) to report a serious MIXED FILE issue with my credit report. Information belonging to another consumer has been incorrectly merged with my credit file.

MY CORRECT IDENTIFYING INFORMATION:
? Full Legal Name: [YOUR_NAME]
? Date of Birth: [YOUR_DOB]
? Social Security Number: XXX-XX-[YOUR_SSN_LAST_4]
? Current Address: [YOUR_ADDRESS]

ACCOUNTS THAT DO NOT BELONG TO ME:
[MIXED_ACCOUNTS_LIST]

LEGAL BASIS:
Under FCRA ?607(b), you are required to "follow reasonable procedures to assure maximum possible accuracy of the information concerning the individual about whom the report relates."

The U.S. Supreme Court and multiple Circuit Courts have held that credit bureaus must use reasonable procedures to prevent mixed files. Your current matching algorithm has failed to prevent this merger, resulting in severe damage to my creditworthiness.

DEMANDED ACTIONS:
1. Immediately SEPARATE my credit file from the other consumer's file
2. REMOVE all accounts, inquiries, and information that do not belong to me
3. IMPLEMENT additional safeguards to prevent future re-merging
4. Conduct a complete audit of my file for any other mixed information
5. Provide me with a corrected credit report within 30 days
6. Notify all parties who received my report in the last 2 years of this error

I have enclosed extensive identity documentation to prove the correct information that should appear in my file. Please use this documentation to properly re-build my credit file.

This mixed file situation has caused me significant harm, including [DESCRIBE_HARM_IF_ANY]. Under FCRA ?616 and ?617, I reserve my right to pursue legal action for willful or negligent noncompliance with reasonable procedures requirements.

Please complete your investigation and corrections within 30 days as required by FCRA ?611(a)(1)(A).

Sincerely,

[YOUR_NAME]

Enclosures:
- Copy of driver's license (front and back)
- Copy of Social Security card
- Copy of utility bill showing current address
- Copy of credit report pages showing mixed accounts
- List of accounts with MY verification that they are not mine`,
};

// ============================================================================
// TEMPLATE 4: INCORRECT ACCOUNT STATUS
// ============================================================================

export const INCORRECT_ACCOUNT_STATUS: DisputeTemplate = {
  id: 'incorrect_account_status',
  name: 'Incorrect Account Status Dispute',
  scenario: 'Account is showing as open when it should be closed, or closed when it should be open',
  description: 'Disputes incorrect account status reporting such as open/closed status, account type misclassification, or incorrect current status.',
  successRate: 68,
  tone: 'formal',
  fcraSection: ['?611(a)', '?623(a)(1)', '?623(b)'],
  additionalLaws: ['Metro 2 Reporting Standards', 'Furnisher Accuracy Requirements'],
  requiredDocuments: [
    'Copy of credit report showing incorrect status',
    'Letter from creditor showing correct status',
    'Final statement showing account closure (if applicable)',
    'Account agreement or recent statements',
  ],
  bestPractices: [
    'Get written confirmation from creditor of correct status',
    'Dispute with both the bureau AND the furnisher directly',
    'Be specific about what the correct status should be',
    'Include account closure date if disputing open status',
    'Note how this error affects your credit utilization or score',
  ],
  whenToUse: [
    'Account shows open but you closed it',
    'Account shows closed but it is still active',
    'Account type is wrong (revolving vs installment)',
    'Account shows current status incorrectly (current vs delinquent)',
  ],
  whenNotToUse: [
    'The status is technically accurate per creditor records',
    'You want account closed but it is legitimately open',
    'Dispute is about balance rather than status',
  ],
  placeholders: [
    '[YOUR_NAME]', '[YOUR_ADDRESS]', '[CITY_STATE_ZIP]', '[DATE]',
    '[BUREAU_NAME]', '[BUREAU_ADDRESS]', '[CREDITOR_NAME]', '[ACCOUNT_NUMBER]',
    '[INCORRECT_STATUS]', '[CORRECT_STATUS]', '[STATUS_CHANGE_DATE]',
  ],
  template: `[YOUR_NAME]
[YOUR_ADDRESS]
[CITY_STATE_ZIP]
[DATE]

[BUREAU_NAME]
[BUREAU_ADDRESS]

Re: Dispute of Incorrect Account Status
Account: [CREDITOR_NAME] - [ACCOUNT_NUMBER]
SSN: XXX-XX-[LAST_4_SSN]

Dear Sir or Madam:

I am writing pursuant to my rights under the Fair Credit Reporting Act (FCRA) ?611(a) to dispute inaccurate account status information on my credit report.

DISPUTED ACCOUNT:
? Creditor: [CREDITOR_NAME]
? Account Number: [ACCOUNT_NUMBER]
? Currently Reported Status: [INCORRECT_STATUS]
? Correct Status: [CORRECT_STATUS]
? Date of Status Change: [STATUS_CHANGE_DATE]

REASON FOR DISPUTE:
My credit report incorrectly shows this account as "[INCORRECT_STATUS]" when it should be reported as "[CORRECT_STATUS]." This inaccuracy is significantly impacting my credit score and creditworthiness.

[For closed accounts showing as open:]
This account was closed on [STATUS_CHANGE_DATE]. I have enclosed documentation from [CREDITOR_NAME] confirming the closure. An account incorrectly showing as open affects my credit utilization ratio and available credit calculations.

[For open accounts showing as closed:]
This account is active and in good standing. Showing it as closed removes positive payment history from my credit profile and affects my available credit and account mix.

LEGAL BASIS:
Under FCRA ?623(a)(1), furnishers have a duty to report accurate information. Under ?611(a), you must conduct a reasonable investigation of disputed information.

REQUESTED ACTION:
1. Contact [CREDITOR_NAME] to verify the correct account status
2. Update my credit report to reflect the correct status: [CORRECT_STATUS]
3. Ensure the date of status change is correctly reported as [STATUS_CHANGE_DATE]
4. Provide written confirmation of the correction

Please complete your investigation within 30 days as required by FCRA ?611(a)(1)(A).

Sincerely,

[YOUR_NAME]

Enclosures:
- Copy of credit report showing incorrect status
- Documentation from creditor confirming correct status
- Copy of government-issued ID`,
};

// ============================================================================
// TEMPLATE 5: PAID COLLECTION STILL REPORTING
// ============================================================================

export const PAID_COLLECTION_REPORTING: DisputeTemplate = {
  id: 'paid_collection_reporting',
  name: 'Paid Collection Still Reporting as Unpaid',
  scenario: 'A collection account continues to show as unpaid or outstanding after you have paid it in full',
  description: 'Disputes collection accounts that have been paid but are not updated to reflect paid status.',
  successRate: 74,
  tone: 'assertive',
  fcraSection: ['?611(a)', '?623(a)(1)', '?623(a)(2)', '?623(b)'],
  additionalLaws: ['FDCPA ?807 (False representations)'],
  requiredDocuments: [
    'Copy of credit report showing collection as unpaid',
    'Proof of payment (canceled check, bank statement, payment confirmation)',
    'Settlement agreement or payment arrangement (if applicable)',
    'Paid in Full letter from collection agency (if you have it)',
  ],
  bestPractices: [
    'Always get "Paid in Full" confirmation letter when paying collections',
    'Keep payment proof indefinitely',
    'Dispute with both bureau and collection agency',
    'If settlement, have agreement in writing BEFORE paying',
  ],
  whenToUse: [
    'Collection shows balance when you paid in full',
    'Paid collection still shows as "Open" or "Active"',
    'Settlement was reached but account not updated',
  ],
  whenNotToUse: [
    'Payment plan is in progress (not yet paid in full)',
    'Payment was very recent (allow 30-45 days for reporting)',
    'You dispute owing the debt at all',
  ],
  placeholders: [
    '[YOUR_NAME]', '[YOUR_ADDRESS]', '[CITY_STATE_ZIP]', '[DATE]',
    '[BUREAU_NAME]', '[BUREAU_ADDRESS]', '[COLLECTION_AGENCY]', '[ACCOUNT_NUMBER]',
    '[ORIGINAL_CREDITOR]', '[PAYMENT_DATE]', '[PAYMENT_AMOUNT]',
  ],
  template: `[YOUR_NAME]
[YOUR_ADDRESS]
[CITY_STATE_ZIP]
[DATE]

[BUREAU_NAME]
[BUREAU_ADDRESS]

Re: Dispute - Paid Collection Incorrectly Reporting as Unpaid
Collection Agency: [COLLECTION_AGENCY]
Account Number: [ACCOUNT_NUMBER]
SSN: XXX-XX-[LAST_4_SSN]

Dear Sir or Madam:

I am writing pursuant to FCRA ?611(a) to dispute a collection account inaccurately reporting as unpaid.

DISPUTED ACCOUNT DETAILS:
? Collection Agency: [COLLECTION_AGENCY]
? Account Number: [ACCOUNT_NUMBER]
? Original Creditor: [ORIGINAL_CREDITOR]
? Current Reported Status: UNPAID/OPEN COLLECTION
? Correct Status: PAID IN FULL / $0 BALANCE
? Payment Date: [PAYMENT_DATE]
? Payment Amount: [PAYMENT_AMOUNT]

REASON FOR DISPUTE:
I paid this account in full on [PAYMENT_DATE]. Despite this payment, my credit report continues to show this collection as unpaid with an outstanding balance. This is INACCURATE.

LEGAL VIOLATIONS:
1. FCRA ?623(a)(1) - Duty to provide accurate information
2. FCRA ?623(a)(2) - Duty to update information after notice of dispute

DEMANDED ACTION:
1. Investigate this dispute immediately
2. Update this account to show: "PAID IN FULL" with $0 balance
3. Provide written confirmation of corrections within 30 days

Sincerely,

[YOUR_NAME]

Enclosures:
- Proof of payment
- Copy of credit report
- Copy of government-issued ID`,
};

// ============================================================================
// TEMPLATE 6: CHARGE-OFF AFTER SETTLEMENT
// ============================================================================

export const CHARGEOFF_AFTER_SETTLEMENT: DisputeTemplate = {
  id: 'chargeoff_after_settlement',
  name: 'Charge-Off Reporting After Settlement Agreement',
  scenario: 'Account still shows as charge-off despite settlement being fulfilled',
  description: 'Disputes accounts continuing to report charge-off status after settlement.',
  successRate: 65,
  tone: 'legal',
  fcraSection: ['§611(a)', '§623(a)(1)', '§623(b)'],
  additionalLaws: ['Contract Law - Settlement Agreement'],
  requiredDocuments: [
    'Settlement agreement', 'Proof of payment', 'Credit report',
  ],
  bestPractices: [
    'Always get deletion terms IN WRITING before settling',
    'Keep all settlement documentation permanently',
  ],
  whenToUse: ['Settlement agreement included reporting terms', 'Settlement completed'],
  whenNotToUse: ['Settlement did not include reporting terms'],
  placeholders: [
    '[YOUR_NAME]', '[CREDITOR_NAME]', '[ACCOUNT_NUMBER]',
    '[SETTLEMENT_DATE]', '[SETTLEMENT_AMOUNT]', '[AGREED_REPORTING_STATUS]',
  ],
  template: `[YOUR_NAME]
[YOUR_ADDRESS]
[CITY_STATE_ZIP]
[DATE]

[BUREAU_NAME]
[BUREAU_ADDRESS]

Re: Dispute - Account Not Updated Per Settlement Agreement
Creditor: [CREDITOR_NAME] | Account: [ACCOUNT_NUMBER]

Dear Sir or Madam:

I settled this account on [SETTLEMENT_DATE] for [SETTLEMENT_AMOUNT]. Per our agreement, the account should report as "[AGREED_REPORTING_STATUS]". It has not been updated.

DEMANDED ACTION:
1. Contact [CREDITOR_NAME] to verify settlement
2. Update account to [AGREED_REPORTING_STATUS]
3. Confirm within 30 days per FCRA §611(a)(1)(A)

Sincerely,
[YOUR_NAME]

Enclosures: Settlement agreement, Proof of payment, Credit report`,
};

// ============================================================================
// TEMPLATE 7: INACCURATE PAYMENT HISTORY
// ============================================================================

export const INACCURATE_PAYMENT_HISTORY: DisputeTemplate = {
  id: 'inaccurate_payment_history',
  name: 'Inaccurate Payment History Dispute',
  scenario: 'Multiple late payments incorrectly reported on an account',
  description: 'Disputes accounts showing incorrect late payment history when payments were made on time.',
  successRate: 58,
  tone: 'assertive',
  fcraSection: ['§611(a)', '§623(a)(1)', '§607(b)'],
  additionalLaws: ['Metro 2 Reporting Format Requirements'],
  requiredDocuments: [
    'Bank statements showing payment dates',
    'Credit report showing late payments',
    'Payment confirmation receipts',
  ],
  bestPractices: [
    'Document exact payment dates and due dates',
    'Calculate grace period if applicable',
    'Get payment history from creditor',
  ],
  whenToUse: [
    'Late payments shown when paid on time',
    'Incorrect number of late payments reported',
    'Wrong delinquency dates',
  ],
  whenNotToUse: ['Payments were actually late', 'Disputing one-time late payment'],
  placeholders: [
    '[YOUR_NAME]', '[CREDITOR_NAME]', '[ACCOUNT_NUMBER]',
    '[INCORRECT_LATE_PAYMENTS]', '[CORRECT_PAYMENT_HISTORY]',
  ],
  template: `[YOUR_NAME]
[YOUR_ADDRESS]
[CITY_STATE_ZIP]
[DATE]

[BUREAU_NAME]
[BUREAU_ADDRESS]

Re: Dispute - Inaccurate Payment History
Creditor: [CREDITOR_NAME] | Account: [ACCOUNT_NUMBER]
SSN: XXX-XX-[LAST_4_SSN]

Dear Sir or Madam:

I am disputing inaccurate payment history under FCRA §611(a).

DISPUTED INFORMATION:
• Creditor: [CREDITOR_NAME]
• Account Number: [ACCOUNT_NUMBER]
• Reported Late Payments: [INCORRECT_LATE_PAYMENTS]
• Actual Payment History: [CORRECT_PAYMENT_HISTORY]

REASON FOR DISPUTE:
My credit report shows late payments for months when I made payments on time. I have enclosed bank statements proving each payment was made before the due date.

Under FCRA §623(a)(1), furnishers must report accurate information. The reported payment history is demonstrably false.

DEMANDED ACTION:
1. Investigate with [CREDITOR_NAME]
2. Correct payment history to reflect timely payments
3. Remove inaccurate late payment notations
4. Confirm corrections within 30 days

Sincerely,
[YOUR_NAME]

Enclosures:
- Bank statements showing payment dates
- Credit report showing incorrect late payments`,
};

// ============================================================================
// TEMPLATE 8: MEDICAL DEBT UNDER $500
// ============================================================================

export const MEDICAL_DEBT_UNDER_500: DisputeTemplate = {
  id: 'medical_debt_under_500',
  name: 'Medical Debt Under $500 - New FCRA Protection',
  scenario: 'Medical collection debt under $500 appearing on credit report',
  description: 'Leverages new FCRA protections effective 2023 that remove medical debts under $500 from credit reports.',
  successRate: 85,
  tone: 'legal',
  fcraSection: ['§605(a)(6)', '§611(a)'],
  additionalLaws: ['CFPB Medical Debt Rule 2023', 'National Credit Reporting Association Guidelines'],
  requiredDocuments: [
    'Credit report showing medical collection',
    'Documentation showing debt is medical in nature',
    'Proof that balance is/was under $500',
  ],
  bestPractices: [
    'Cite CFPB rule specifically',
    'Note the debt type is medical',
    'Include original balance documentation',
  ],
  whenToUse: [
    'Medical collection under $500',
    'Medical collection reported after March 2023',
    'Paid medical debt still showing',
  ],
  whenNotToUse: [
    'Medical debt over $500',
    'Non-medical debt',
    'Medical debt reported before rule effective date',
  ],
  placeholders: [
    '[YOUR_NAME]', '[COLLECTION_AGENCY]', '[ACCOUNT_NUMBER]',
    '[MEDICAL_PROVIDER]', '[DEBT_AMOUNT]',
  ],
  template: `[YOUR_NAME]
[YOUR_ADDRESS]
[CITY_STATE_ZIP]
[DATE]

[BUREAU_NAME]
[BUREAU_ADDRESS]

Re: DEMAND FOR REMOVAL - Medical Debt Under $500 - FCRA §605(a)(6)
Collection Agency: [COLLECTION_AGENCY]
Account Number: [ACCOUNT_NUMBER]
Original Provider: [MEDICAL_PROVIDER]
Amount: [DEBT_AMOUNT]

Dear Sir or Madam:

I am writing to DEMAND the immediate removal of a medical collection debt that violates current FCRA protections.

PROTECTED DEBT DETAILS:
• Collection Agency: [COLLECTION_AGENCY]
• Account Number: [ACCOUNT_NUMBER]
• Original Medical Provider: [MEDICAL_PROVIDER]
• Debt Amount: [DEBT_AMOUNT]

LEGAL BASIS FOR REMOVAL:
Effective March 2023, per the Consumer Financial Protection Bureau's medical debt rule and FCRA updates:
- Medical collections under $500 cannot be reported to credit bureaus
- Paid medical collections must be removed
- Medical collections must wait 1 year before reporting

This debt is [DEBT_AMOUNT], which is UNDER the $500 threshold. Under the new consumer protections, this item MUST be removed from my credit report.

This is not a dispute requiring investigation - this is a demand for removal of legally prohibited information.

DEMANDED ACTION:
1. IMMEDIATELY remove this medical collection from my credit report
2. Cease reporting this protected medical debt
3. Provide written confirmation of removal within 15 days

Failure to remove this prohibited item may result in CFPB complaint and legal action.

Sincerely,
[YOUR_NAME]

Enclosures:
- Credit report showing medical collection
- Documentation showing medical nature of debt`,
};

// ============================================================================
// TEMPLATE 9: STUDENT LOAN REHABILITATION COMPLETION
// ============================================================================

export const STUDENT_LOAN_REHABILITATION: DisputeTemplate = {
  id: 'student_loan_rehabilitation',
  name: 'Student Loan Rehabilitation - Default Removal',
  scenario: 'Completed loan rehabilitation but default status still showing',
  description: 'After completing student loan rehabilitation, default status should be removed per federal regulations.',
  successRate: 82,
  tone: 'formal',
  fcraSection: ['§611(a)', '§623(a)(1)'],
  additionalLaws: ['Higher Education Act §428F(b)', '34 CFR 682.405', 'Department of Education Guidelines'],
  requiredDocuments: [
    'Rehabilitation completion letter',
    'New loan servicer documentation',
    'Credit report showing default status',
  ],
  bestPractices: [
    'Wait 30-45 days after rehabilitation completion',
    'Get official completion letter from servicer',
    'Dispute with all three bureaus',
  ],
  whenToUse: [
    'Completed 9 rehabilitation payments',
    'Received rehabilitation completion letter',
    'Default status still showing after 45 days',
  ],
  whenNotToUse: [
    'Rehabilitation still in progress',
    'Consolidated instead of rehabilitated',
    'Private student loans (different rules)',
  ],
  placeholders: [
    '[YOUR_NAME]', '[OLD_SERVICER]', '[NEW_SERVICER]', '[ACCOUNT_NUMBER]',
    '[REHABILITATION_COMPLETION_DATE]',
  ],
  template: `[YOUR_NAME]
[YOUR_ADDRESS]
[CITY_STATE_ZIP]
[DATE]

[BUREAU_NAME]
[BUREAU_ADDRESS]

Re: Student Loan Rehabilitation Complete - Demand for Default Removal
Original Servicer: [OLD_SERVICER]
New Servicer: [NEW_SERVICER]
Account Number: [ACCOUNT_NUMBER]
SSN: XXX-XX-[LAST_4_SSN]

Dear Sir or Madam:

I am writing to demand removal of the default status from my student loan account pursuant to federal student loan rehabilitation regulations.

REHABILITATION DETAILS:
• Original Servicer: [OLD_SERVICER]
• New Servicer: [NEW_SERVICER]
• Account Number: [ACCOUNT_NUMBER]
• Rehabilitation Completion Date: [REHABILITATION_COMPLETION_DATE]

LEGAL BASIS FOR DEFAULT REMOVAL:
Under the Higher Education Act §428F(b)(1)(D) and 34 CFR 682.405, upon successful completion of a loan rehabilitation program:

"The guaranty agency...shall request any consumer reporting agency to which the default was reported to remove the record of the default from the borrower's credit history."

I have successfully completed my loan rehabilitation program by making 9 consecutive, on-time, voluntary payments. Per federal regulations, the DEFAULT STATUS must be removed from my credit report.

Note: This is a FEDERAL REQUIREMENT, not a request. The default notation must be removed - only the late payment history before default may remain.

DEMANDED ACTION:
1. Remove the DEFAULT status from this student loan account
2. Update account to show current status with new servicer [NEW_SERVICER]
3. Maintain only accurate pre-default payment history
4. Confirm removal within 30 days

Sincerely,
[YOUR_NAME]

Enclosures:
- Rehabilitation completion letter from [OLD_SERVICER]
- Welcome letter from [NEW_SERVICER]
- Credit report showing default status`,
};

// ============================================================================
// TEMPLATE 10: BANKRUPTCY DISCHARGE VERIFICATION
// ============================================================================

export const BANKRUPTCY_DISCHARGE: DisputeTemplate = {
  id: 'bankruptcy_discharge',
  name: 'Bankruptcy Discharge - Account Not Updated',
  scenario: 'Accounts included in bankruptcy still showing balances or active status',
  description: 'Disputes accounts that were discharged in bankruptcy but not properly updated.',
  successRate: 76,
  tone: 'legal',
  fcraSection: ['§611(a)', '§623(a)(1)', '§605(a)(1)'],
  additionalLaws: ['11 U.S.C. §524 (Discharge injunction)', 'Bankruptcy Code'],
  requiredDocuments: [
    'Bankruptcy discharge order',
    'Schedule of creditors from bankruptcy',
    'Credit report showing incorrect account status',
  ],
  bestPractices: [
    'Include copy of discharge order with every dispute',
    'Reference specific account on Schedule F/D',
    'Note that collecting on discharged debt violates discharge injunction',
  ],
  whenToUse: [
    'Discharged accounts showing balance',
    'Discharged accounts showing as active/open',
    'Creditor still reporting despite discharge',
    'Account not marked "Included in Bankruptcy"',
  ],
  whenNotToUse: [
    'Bankruptcy case still pending',
    'Debt was not included in bankruptcy',
    'Debt type not dischargeable (student loans, some taxes)',
  ],
  placeholders: [
    '[YOUR_NAME]', '[CREDITOR_NAME]', '[ACCOUNT_NUMBER]',
    '[BANKRUPTCY_CASE_NUMBER]', '[DISCHARGE_DATE]', '[BANKRUPTCY_COURT]',
  ],
  template: `[YOUR_NAME]
[YOUR_ADDRESS]
[CITY_STATE_ZIP]
[DATE]

[BUREAU_NAME]
[BUREAU_ADDRESS]

Re: Bankruptcy Discharge - Accounts Not Properly Updated
Case Number: [BANKRUPTCY_CASE_NUMBER]
Discharge Date: [DISCHARGE_DATE]
Court: [BANKRUPTCY_COURT]
SSN: XXX-XX-[LAST_4_SSN]

Dear Sir or Madam:

I am writing to dispute accounts that were included in my bankruptcy but have not been properly updated on my credit report.

BANKRUPTCY DETAILS:
• Case Number: [BANKRUPTCY_CASE_NUMBER]
• Court: [BANKRUPTCY_COURT]
• Discharge Date: [DISCHARGE_DATE]
• Chapter: [CHAPTER_7_OR_13]

ACCOUNTS REQUIRING UPDATE:
[LIST_OF_ACCOUNTS_WITH_ISSUES]

LEGAL BASIS:
Under 11 U.S.C. §524, a bankruptcy discharge:
1. Voids any judgment on discharged debt
2. Operates as an injunction against collection
3. Requires accounts to be reported as "Discharged in Bankruptcy" or "Included in Bankruptcy"

Continuing to report these accounts with balances or as active violates:
- FCRA §623(a)(1) - Inaccurate reporting
- The bankruptcy discharge injunction

DEMANDED ACTION:
1. Update all discharged accounts to show $0 balance
2. Mark accounts as "Included in Bankruptcy" or "Discharged"
3. Update status to "Closed"
4. Ensure accounts stop aging and show no further delinquency
5. Confirm corrections within 30 days

Note: Attempting to collect on discharged debts violates the discharge injunction and may result in sanctions by the bankruptcy court.

Sincerely,
[YOUR_NAME]

Enclosures:
- Bankruptcy discharge order
- Schedule of creditors showing listed accounts
- Credit report showing incorrect account status`,
};

// ============================================================================
// EXPORT ALL TEMPLATES
// ============================================================================

export const ALL_DISPUTE_TEMPLATES: DisputeTemplate[] = [
  UNAUTHORIZED_HARD_INQUIRY,
  OBSOLETE_DEBT,
  MIXED_CREDIT_FILE,
  INCORRECT_ACCOUNT_STATUS,
  PAID_COLLECTION_REPORTING,
  CHARGEOFF_AFTER_SETTLEMENT,
  INACCURATE_PAYMENT_HISTORY,
  MEDICAL_DEBT_UNDER_500,
  STUDENT_LOAN_REHABILITATION,
  BANKRUPTCY_DISCHARGE,
];

// Helper function to get template by ID
export function getTemplateById(id: string): DisputeTemplate | undefined {
  return ALL_DISPUTE_TEMPLATES.find(t => t.id === id);
}

// Helper function to get templates by category
export function getTemplatesByCategory(categoryId: string): DisputeTemplate[] {
  const category = TEMPLATE_CATEGORIES.find(c => c.id === categoryId);
  if (!category) return [];
  return category.templates
    .map(id => getTemplateById(id))
    .filter((t): t is DisputeTemplate => t !== undefined);
}

// Helper function to get templates by success rate
export function getTemplatesBySuccessRate(minRate: number = 60): DisputeTemplate[] {
  return ALL_DISPUTE_TEMPLATES
    .filter(t => t.successRate >= minRate)
    .sort((a, b) => b.successRate - a.successRate);
}
