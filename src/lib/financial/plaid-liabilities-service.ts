/**
 * Plaid Liabilities Service
 *
 * Handles credit card, student loan, and mortgage liabilities via the Plaid SDK.
 */

import { getPlaidClient } from "@/lib/financial/plaid-client";

// Types

export interface PlaidCreditLiability {
  accountId: string | null;
  isOverdue: boolean | null;
  lastPaymentAmount: number | null;
  lastPaymentDate: string | null;
  lastStatementIssueDate: string | null;
  lastStatementBalance: number | null;
  minimumPaymentAmount: number | null;
  nextPaymentDueDate: string | null;
  aprs: Array<{
    aprPercentage: number;
    aprType: string;
    balanceSubjectToApr: number | null;
    interestChargeAmount: number | null;
  }>;
}

export interface PlaidStudentLoan {
  accountId: string | null;
  accountNumber: string | null;
  disbursementDates: string[] | null;
  expectedPayoffDate: string | null;
  guarantor: string | null;
  interestRatePercentage: number;
  isOverdue: boolean | null;
  lastPaymentAmount: number | null;
  lastPaymentDate: string | null;
  lastStatementBalance: number | null;
  lastStatementIssueDate: string | null;
  loanName: string | null;
  minimumPaymentAmount: number | null;
  nextPaymentDueDate: string | null;
  originationDate: string | null;
  originationPrincipalAmount: number | null;
  outstandingInterestAmount: number | null;
  paymentReferenceNumber: string | null;
}

export interface PlaidMortgage {
  accountId: string;
  accountNumber: string | null;
  currentLateFee: number | null;
  escrowBalance: number | null;
  hasPmi: boolean | null;
  hasPrepaymentPenalty: boolean | null;
  lastPaymentAmount: number | null;
  lastPaymentDate: string | null;
  loanTypeDescription: string | null;
  loanTerm: string | null;
  maturityDate: string | null;
  nextMonthlyPayment: number | null;
  nextPaymentDueDate: string | null;
  originationDate: string | null;
  originationPrincipalAmount: number | null;
  pastDueAmount: number | null;
  ytdInterestPaid: number | null;
  ytdPrincipalPaid: number | null;
}

export interface PlaidLiabilitiesResult {
  credit: PlaidCreditLiability[];
  student: PlaidStudentLoan[];
  mortgage: PlaidMortgage[];
}

/**
 * Plaid Liabilities Service Class
 */
class PlaidLiabilitiesService {
  /**
   * Get all liabilities for an access token
   */
  async getLiabilities(accessToken: string): Promise<PlaidLiabilitiesResult> {
    if (!accessToken) {
      throw new Error("Access token is required");
    }

    try {
      const client = getPlaidClient();
      const response = await client.liabilitiesGet({
        access_token: accessToken,
      });

      const liabilities = response.data.liabilities;

      const credit: PlaidCreditLiability[] = (liabilities.credit ?? []).map(
        (c) => this.mapCreditLiability(c),
      );

      const student: PlaidStudentLoan[] = (liabilities.student ?? []).map(
        (s) => this.mapStudentLoan(s),
      );

      const mortgage: PlaidMortgage[] = (liabilities.mortgage ?? []).map(
        (m) => this.mapMortgage(m),
      );

      return { credit, student, mortgage };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get only credit card liabilities
   */
  async getCreditCardLiabilities(
    accessToken: string,
  ): Promise<PlaidCreditLiability[]> {
    const result = await this.getLiabilities(accessToken);
    return result.credit;
  }

  /**
   * Get only student loan liabilities
   */
  async getStudentLoanLiabilities(
    accessToken: string,
  ): Promise<PlaidStudentLoan[]> {
    const result = await this.getLiabilities(accessToken);
    return result.student;
  }

  /**
   * Get only mortgage liabilities
   */
  async getMortgageLiabilities(
    accessToken: string,
  ): Promise<PlaidMortgage[]> {
    const result = await this.getLiabilities(accessToken);
    return result.mortgage;
  }

  /**
   * Map Plaid SDK CreditCardLiability to our interface
   */
  private mapCreditLiability(c: {
    account_id: string | null;
    is_overdue: boolean | null;
    last_payment_amount: number | null;
    last_payment_date: string | null;
    last_statement_issue_date: string | null;
    last_statement_balance: number | null;
    minimum_payment_amount: number | null;
    next_payment_due_date: string | null;
    aprs: Array<{
      apr_percentage: number;
      apr_type: string;
      balance_subject_to_apr: number | null;
      interest_charge_amount: number | null;
    }>;
  }): PlaidCreditLiability {
    return {
      accountId: c.account_id,
      isOverdue: c.is_overdue,
      lastPaymentAmount: c.last_payment_amount,
      lastPaymentDate: c.last_payment_date,
      lastStatementIssueDate: c.last_statement_issue_date,
      lastStatementBalance: c.last_statement_balance,
      minimumPaymentAmount: c.minimum_payment_amount,
      nextPaymentDueDate: c.next_payment_due_date,
      aprs: (c.aprs ?? []).map((apr) => ({
        aprPercentage: apr.apr_percentage,
        aprType: apr.apr_type,
        balanceSubjectToApr: apr.balance_subject_to_apr,
        interestChargeAmount: apr.interest_charge_amount,
      })),
    };
  }

  /**
   * Map Plaid SDK StudentLoan to our interface
   */
  private mapStudentLoan(s: {
    account_id: string | null;
    account_number: string | null;
    disbursement_dates: string[] | null;
    expected_payoff_date: string | null;
    guarantor: string | null;
    interest_rate_percentage: number;
    is_overdue: boolean | null;
    last_payment_amount: number | null;
    last_payment_date: string | null;
    last_statement_balance?: number | null;
    last_statement_issue_date: string | null;
    loan_name: string | null;
    minimum_payment_amount: number | null;
    next_payment_due_date: string | null;
    origination_date: string | null;
    origination_principal_amount: number | null;
    outstanding_interest_amount: number | null;
    payment_reference_number: string | null;
  }): PlaidStudentLoan {
    return {
      accountId: s.account_id,
      accountNumber: s.account_number,
      disbursementDates: s.disbursement_dates,
      expectedPayoffDate: s.expected_payoff_date,
      guarantor: s.guarantor,
      interestRatePercentage: s.interest_rate_percentage,
      isOverdue: s.is_overdue,
      lastPaymentAmount: s.last_payment_amount,
      lastPaymentDate: s.last_payment_date,
      lastStatementBalance: s.last_statement_balance ?? null,
      lastStatementIssueDate: s.last_statement_issue_date,
      loanName: s.loan_name,
      minimumPaymentAmount: s.minimum_payment_amount,
      nextPaymentDueDate: s.next_payment_due_date,
      originationDate: s.origination_date,
      originationPrincipalAmount: s.origination_principal_amount,
      outstandingInterestAmount: s.outstanding_interest_amount,
      paymentReferenceNumber: s.payment_reference_number,
    };
  }

  /**
   * Map Plaid SDK MortgageLiability to our interface
   */
  private mapMortgage(m: {
    account_id: string;
    account_number: string | null;
    current_late_fee: number | null;
    escrow_balance: number | null;
    has_pmi: boolean | null;
    has_prepayment_penalty: boolean | null;
    last_payment_amount: number | null;
    last_payment_date: string | null;
    loan_type_description: string | null;
    loan_term: string | null;
    maturity_date: string | null;
    next_monthly_payment: number | null;
    next_payment_due_date: string | null;
    origination_date: string | null;
    origination_principal_amount: number | null;
    past_due_amount: number | null;
    ytd_interest_paid: number | null;
    ytd_principal_paid: number | null;
  }): PlaidMortgage {
    return {
      accountId: m.account_id,
      accountNumber: m.account_number,
      currentLateFee: m.current_late_fee,
      escrowBalance: m.escrow_balance,
      hasPmi: m.has_pmi,
      hasPrepaymentPenalty: m.has_prepayment_penalty,
      lastPaymentAmount: m.last_payment_amount,
      lastPaymentDate: m.last_payment_date,
      loanTypeDescription: m.loan_type_description,
      loanTerm: m.loan_term,
      maturityDate: m.maturity_date,
      nextMonthlyPayment: m.next_monthly_payment,
      nextPaymentDueDate: m.next_payment_due_date,
      originationDate: m.origination_date,
      originationPrincipalAmount: m.origination_principal_amount,
      pastDueAmount: m.past_due_amount,
      ytdInterestPaid: m.ytd_interest_paid,
      ytdPrincipalPaid: m.ytd_principal_paid,
    };
  }
}

// Export singleton instance
export const plaidLiabilitiesService = new PlaidLiabilitiesService();
export default plaidLiabilitiesService;
