// Federal Integration Service - NSLDS and FSA API Integration
import axios, { AxiosInstance } from 'axios';
import type { FederalProgramApplication } from '@/types/student-loan';

type UnknownRecord = Record<string, unknown>;

interface NSLDSDataResponse {
  success: boolean;
  data?: UnknownRecord;
  loans: UnknownRecord[];
  total_debt: number;
  error?: string;
}

type ApplicationSubmissionResult =
  | {
      success: true;
      application_id: string;
      status: 'submitted';
      estimated_processing_time?: string;
      monthly_payment?: number;
      new_loan_id?: string;
      estimated_completion?: string;
    }
  | {
      success: false;
      error: string;
    };

interface FreshStartEligibility {
  eligible: boolean;
  reasons: string[];
  next_steps: string[];
}

interface RehabilitationEligibility {
  eligible: boolean;
  required_payments: number;
  minimum_payment: number;
  estimated_timeline: string;
}

interface DischargeEligibility {
  eligible_discharges: string[];
  requirements: UnknownRecord;
  documentation_needed: string[];
}

interface ApplicationStatusResponse {
  status: string;
  last_updated: string;
  next_steps: string[];
  estimated_completion: string | null;
}

/**
 * Federal Integration Service
 *
 * Handles integration with federal student loan systems including:
 * - National Student Loan Data System (NSLDS)
 * - Federal Student Aid (FSA) systems
 * - Department of Education APIs
 */
export class FederalIntegrationService {
  private nslds_client: AxiosInstance;
  private fsa_client: AxiosInstance;
  private api_key: string;

  constructor() {
    this.api_key = process.env.FEDERAL_API_KEY || 'demo-key';

    // Initialize NSLDS client
    this.nslds_client = axios.create({
      baseURL: 'https://nslds.ed.gov/api/v1',
      headers: {
        'Authorization': `Bearer ${this.api_key}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Initialize FSA client
    this.fsa_client = axios.create({
      baseURL: 'https://studentaid.gov/api/v1',
      headers: {
        'Authorization': `Bearer ${this.api_key}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Retrieve student loan data from NSLDS
   */
  async retrieveNSLDSData(ssn: string): Promise<NSLDSDataResponse> {
    try {
      const response = await this.nslds_client.get('/student-loans', {
        params: { ssn }
      });

      return {
        success: true,
        data: response.data,
        loans: response.data.loans || [],
        total_debt: response.data.total_debt || 0
      };
    } catch (error) {
      console.error('NSLDS API Error:', error);
      return {
        success: false,
        error: 'Failed to retrieve NSLDS data',
        loans: [],
        total_debt: 0
      };
    }
  }

  /**
   * Submit Fresh Start application
   */
  async submitFreshStartApplication(
    application: FederalProgramApplication
  ): Promise<ApplicationSubmissionResult> {
    try {
      const response = await this.fsa_client.post('/fresh-start/apply', {
        ssn: application.personalInfo.ssn,
        first_name: application.personalInfo.firstName,
        last_name: application.personalInfo.lastName,
        date_of_birth: application.personalInfo.dateOfBirth,
        email: application.personalInfo.email,
        phone: application.personalInfo.phone
      });

      return {
        success: true,
        application_id: response.data.application_id,
        status: 'submitted',
        estimated_processing_time: '30-60 days'
      };
    } catch (error) {
      console.error('Fresh Start Application Error:', error);
      return {
        success: false,
        error: 'Failed to submit Fresh Start application'
      };
    }
  }

  /**
   * Submit rehabilitation application
   */
  async submitRehabilitationApplication(
    application: FederalProgramApplication
  ): Promise<ApplicationSubmissionResult> {
    try {
      const response = await this.fsa_client.post('/rehabilitation/apply', {
        ssn: application.personalInfo.ssn,
        loan_ids: application.loanIds,
        monthly_payment: application.financialInfo?.annualIncome ? Math.max(5, application.financialInfo.annualIncome * 0.15 / 12) : 5,
        income_documentation: application.additionalData?.income_documentation
      });

      return {
        success: true,
        application_id: response.data.application_id,
        status: 'submitted',
        monthly_payment: response.data.monthly_payment,
        estimated_completion: '9 months'
      };
    } catch (error) {
      console.error('Rehabilitation Application Error:', error);
      return {
        success: false,
        error: 'Failed to submit rehabilitation application'
      };
    }
  }

  /**
   * Submit consolidation application
   */
  async submitConsolidationApplication(
    application: FederalProgramApplication
  ): Promise<ApplicationSubmissionResult> {
    try {
      const response = await this.fsa_client.post('/consolidation/apply', {
        ssn: application.personalInfo.ssn,
        loan_ids: application.loanIds,
        repayment_plan: application.additionalData?.repayment_plan || 'standard',
        income_driven: application.additionalData?.income_driven || false
      });

      return {
        success: true,
        application_id: response.data.application_id,
        status: 'submitted',
        new_loan_id: response.data.new_loan_id,
        estimated_processing_time: '60-90 days'
      };
    } catch (error) {
      console.error('Consolidation Application Error:', error);
      return {
        success: false,
        error: 'Failed to submit consolidation application'
      };
    }
  }

  /**
   * Check Fresh Start eligibility
   */
  async checkFreshStartEligibility(ssn: string): Promise<FreshStartEligibility> {
    try {
      const response = await this.fsa_client.get('/fresh-start/eligibility', {
        params: { ssn }
      });

      return {
        eligible: response.data.eligible,
        reasons: response.data.reasons || [],
        next_steps: response.data.next_steps || []
      };
    } catch (error) {
      console.error('Fresh Start Eligibility Error:', error);
      return {
        eligible: false,
        reasons: ['Unable to verify eligibility'],
        next_steps: ['Contact servicer directly']
      };
    }
  }

  /**
   * Check rehabilitation eligibility
   */
  async checkRehabilitationEligibility(ssn: string): Promise<RehabilitationEligibility> {
    try {
      const response = await this.fsa_client.get('/rehabilitation/eligibility', {
        params: { ssn }
      });

      return {
        eligible: response.data.eligible,
        required_payments: response.data.required_payments || 9,
        minimum_payment: response.data.minimum_payment || 5,
        estimated_timeline: response.data.estimated_timeline || '9 months'
      };
    } catch (error) {
      console.error('Rehabilitation Eligibility Error:', error);
      return {
        eligible: false,
        required_payments: 9,
        minimum_payment: 5,
        estimated_timeline: '9 months'
      };
    }
  }

  /**
   * Check discharge eligibility
   */
  async checkDischargeEligibility(ssn: string): Promise<DischargeEligibility> {
    try {
      const response = await this.fsa_client.get('/discharge/eligibility', {
        params: { ssn }
      });

      return {
        eligible_discharges: response.data.eligible_discharges || [],
        requirements: response.data.requirements || {},
        documentation_needed: response.data.documentation_needed || []
      };
    } catch (error) {
      console.error('Discharge Eligibility Error:', error);
      return {
        eligible_discharges: [],
        requirements: {},
        documentation_needed: []
      };
    }
  }

  /**
   * Track application status
   */
  async trackApplicationStatus(applicationId: string): Promise<ApplicationStatusResponse> {
    try {
      const response = await this.fsa_client.get(`/applications/${applicationId}/status`);

      return {
        status: response.data.status,
        last_updated: response.data.last_updated,
        next_steps: response.data.next_steps || [],
        estimated_completion: response.data.estimated_completion
      };
    } catch (error) {
      console.error('Application Status Error:', error);
      return {
        status: 'unknown',
        last_updated: new Date().toISOString(),
        next_steps: ['Contact servicer for status update'],
        estimated_completion: null
      };
    }
  }
}

// Export singleton instance
export const federalIntegrationService = new FederalIntegrationService();
export default federalIntegrationService;
