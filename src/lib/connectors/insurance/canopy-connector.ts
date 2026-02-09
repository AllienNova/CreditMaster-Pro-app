/**
 * Canopy Connect Insurance Connector
 *
 * Integration with Canopy Connect for insurance data aggregation.
 * Provides unified access to user's insurance policies across carriers.
 */

import {
  BaseConnector,
  ConnectorConfig,
  HealthCheckResult,
  Region,
} from '../types';

// =============================================================================
// Configuration
// =============================================================================

interface CanopyConfig extends ConnectorConfig {
  clientId: string;
  clientSecret: string;
  webhookSecret?: string;
  sandbox?: boolean;
}

// =============================================================================
// Canopy Types
// =============================================================================

export type InsuranceType =
  | 'auto'
  | 'home'
  | 'renters'
  | 'life'
  | 'health'
  | 'umbrella'
  | 'pet'
  | 'travel'
  | 'other';

export type PolicyStatus = 'active' | 'pending' | 'cancelled' | 'expired' | 'lapsed';

export interface CanopySession {
  sessionId: string;
  userId: string;
  url: string;
  expiresAt: Date;
}

export interface PolicyHolder {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface InsurancePolicy {
  id: string;
  carrierId: string;
  carrierName: string;
  carrierLogo?: string;
  policyNumber: string;
  type: InsuranceType;
  status: PolicyStatus;
  effectiveDate: Date;
  expirationDate: Date;
  premium: {
    amount: number;
    frequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
    currency: string;
  };
  deductible?: number;
  coverageLimit?: number;
  policyHolder: PolicyHolder;
  additionalInsureds?: PolicyHolder[];
  coverages?: Coverage[];
  vehicles?: Vehicle[];
  properties?: Property[];
  createdAt: Date;
  updatedAt: Date;
  rawData?: Record<string, unknown>;
}

export interface Coverage {
  type: string;
  name: string;
  limit?: number;
  deductible?: number;
  premium?: number;
  description?: string;
}

export interface Vehicle {
  vin?: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  licensePlate?: string;
  state?: string;
  coverages?: Coverage[];
}

export interface Property {
  type: 'primary_residence' | 'rental' | 'vacation' | 'other';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  yearBuilt?: number;
  squareFeet?: number;
  constructionType?: string;
  roofType?: string;
  coverages?: Coverage[];
}

export interface InsuranceClaim {
  id: string;
  policyId: string;
  claimNumber: string;
  type: string;
  status: 'open' | 'closed' | 'pending' | 'denied';
  filedDate: Date;
  closedDate?: Date;
  amount?: number;
  amountPaid?: number;
  description?: string;
}

export interface InsuranceDocument {
  id: string;
  policyId: string;
  type: 'declarations_page' | 'policy_document' | 'id_card' | 'claim_document' | 'other';
  name: string;
  url: string;
  mimeType: string;
  size?: number;
  createdAt: Date;
}

export interface InsuranceScore {
  score: number;
  factors: Array<{
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }>;
  recommendations: string[];
}

// =============================================================================
// Unified Insurance Types (normalized)
// =============================================================================

export interface UnifiedInsurancePolicy {
  id: string;
  provider: 'canopy';
  providerId: string;
  carrierName: string;
  policyNumber: string;
  type: InsuranceType;
  status: PolicyStatus;
  premium: {
    amount: number;
    frequency: string;
    annualized: number;
  };
  coverage: {
    deductible?: number;
    limit?: number;
    details: Coverage[];
  };
  dates: {
    effective: Date;
    expiration: Date;
    daysUntilRenewal: number;
  };
  holder: {
    name: string;
    email?: string;
  };
  assets?: {
    vehicles?: Vehicle[];
    properties?: Property[];
  };
  lastSynced: Date;
}

// =============================================================================
// Canopy Connector
// =============================================================================

export class CanopyConnector extends BaseConnector<CanopyConfig> {
  readonly name = 'canopy';
  readonly type = 'insurance' as const;
  readonly supportedRegions: Region[] = ['US'];

  private baseUrl: string;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: CanopyConfig) {
    super(config);
    this.baseUrl = config.sandbox
      ? 'https://sandbox.usecanopy.com/api/v1'
      : 'https://api.usecanopy.com/api/v1';
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  async initialize(): Promise<void> {
    await this.authenticate();
  }

  async disconnect(): Promise<void> {
    this.accessToken = undefined;
    this.tokenExpiry = undefined;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const start = Date.now();
      await this.authenticate();
      const latencyMs = Date.now() - start;

      return {
        success: true,
        latencyMs,
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: 0,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  // ===========================================================================
  // Authentication
  // ===========================================================================

  private async authenticate(): Promise<void> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return;
    }

    const response = await fetch(`${this.baseUrl}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`Canopy authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.authenticate();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Canopy API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // ===========================================================================
  // Link Session
  // ===========================================================================

  /**
   * Create a link session for user to connect insurance accounts
   */
  async createLinkSession(
    userId: string,
    options?: {
      insuranceTypes?: InsuranceType[];
      carriers?: string[];
      redirectUri?: string;
      webhookUrl?: string;
    }
  ): Promise<CanopySession> {
    const response = await this.request<{
      session_id: string;
      url: string;
      expires_at: string;
    }>('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        insurance_types: options?.insuranceTypes,
        carriers: options?.carriers,
        redirect_uri: options?.redirectUri,
        webhook_url: options?.webhookUrl,
      }),
    });

    return {
      sessionId: response.session_id,
      userId,
      url: response.url,
      expiresAt: new Date(response.expires_at),
    };
  }

  /**
   * Get session status
   */
  async getSessionStatus(
    sessionId: string
  ): Promise<{
    status: 'pending' | 'completed' | 'failed' | 'expired';
    policiesCount?: number;
    error?: string;
  }> {
    const response = await this.request<{
      status: string;
      policies_count?: number;
      error?: string;
    }>(`/sessions/${sessionId}`);

    return {
      status: response.status as 'pending' | 'completed' | 'failed' | 'expired',
      policiesCount: response.policies_count,
      error: response.error,
    };
  }

  // ===========================================================================
  // Policy Data
  // ===========================================================================

  /**
   * Get all policies for a user
   */
  async getPolicies(userId: string): Promise<InsurancePolicy[]> {
    const response = await this.request<{ policies: Record<string, unknown>[] }>(
      `/users/${userId}/policies`
    );

    return (response.policies || []).map(this.mapPolicy);
  }

  /**
   * Get a specific policy
   */
  async getPolicy(userId: string, policyId: string): Promise<InsurancePolicy | null> {
    try {
      const response = await this.request<{ policy: Record<string, unknown> }>(
        `/users/${userId}/policies/${policyId}`
      );
      return this.mapPolicy(response.policy);
    } catch {
      return null;
    }
  }

  /**
   * Get policies by type
   */
  async getPoliciesByType(userId: string, type: InsuranceType): Promise<InsurancePolicy[]> {
    const allPolicies = await this.getPolicies(userId);
    return allPolicies.filter(p => p.type === type);
  }

  /**
   * Get active policies
   */
  async getActivePolicies(userId: string): Promise<InsurancePolicy[]> {
    const allPolicies = await this.getPolicies(userId);
    return allPolicies.filter(p => p.status === 'active');
  }

  /**
   * Refresh policy data from carrier
   */
  async refreshPolicy(userId: string, policyId: string): Promise<InsurancePolicy> {
    const response = await this.request<{ policy: Record<string, unknown> }>(
      `/users/${userId}/policies/${policyId}/refresh`,
      { method: 'POST' }
    );

    return this.mapPolicy(response.policy);
  }

  // ===========================================================================
  // Claims
  // ===========================================================================

  /**
   * Get claims for a policy
   */
  async getClaims(userId: string, policyId: string): Promise<InsuranceClaim[]> {
    const response = await this.request<{ claims: Record<string, unknown>[] }>(
      `/users/${userId}/policies/${policyId}/claims`
    );

    return (response.claims || []).map(this.mapClaim);
  }

  /**
   * Get all claims for a user
   */
  async getAllClaims(userId: string): Promise<InsuranceClaim[]> {
    const policies = await this.getPolicies(userId);
    const allClaims: InsuranceClaim[] = [];

    for (const policy of policies) {
      const claims = await this.getClaims(userId, policy.id);
      allClaims.push(...claims);
    }

    return allClaims;
  }

  // ===========================================================================
  // Documents
  // ===========================================================================

  /**
   * Get documents for a policy
   */
  async getDocuments(userId: string, policyId: string): Promise<InsuranceDocument[]> {
    const response = await this.request<{ documents: Record<string, unknown>[] }>(
      `/users/${userId}/policies/${policyId}/documents`
    );

    return (response.documents || []).map(this.mapDocument);
  }

  /**
   * Download a document
   */
  async downloadDocument(
    userId: string,
    policyId: string,
    documentId: string
  ): Promise<{ url: string; expiresAt: Date }> {
    const response = await this.request<{
      download_url: string;
      expires_at: string;
    }>(`/users/${userId}/policies/${policyId}/documents/${documentId}/download`);

    return {
      url: response.download_url,
      expiresAt: new Date(response.expires_at),
    };
  }

  // ===========================================================================
  // Insurance Score & Analysis
  // ===========================================================================

  /**
   * Get insurance score and recommendations
   */
  async getInsuranceScore(userId: string): Promise<InsuranceScore> {
    const policies = await this.getPolicies(userId);

    // Calculate score based on coverage
    let score = 50; // Base score
    const factors: InsuranceScore['factors'] = [];
    const recommendations: string[] = [];

    // Check for essential coverages
    const hasAuto = policies.some(p => p.type === 'auto' && p.status === 'active');
    const hasHome = policies.some(
      p => (p.type === 'home' || p.type === 'renters') && p.status === 'active'
    );
    const hasLife = policies.some(p => p.type === 'life' && p.status === 'active');
    const hasUmbrella = policies.some(p => p.type === 'umbrella' && p.status === 'active');

    if (hasAuto) {
      score += 15;
      factors.push({
        name: 'Auto Insurance',
        impact: 'positive',
        description: 'You have active auto insurance coverage',
      });
    } else {
      factors.push({
        name: 'Auto Insurance',
        impact: 'negative',
        description: 'No auto insurance detected',
      });
      recommendations.push('Consider adding auto insurance if you own or drive a vehicle');
    }

    if (hasHome) {
      score += 15;
      factors.push({
        name: 'Property Insurance',
        impact: 'positive',
        description: 'You have active home or renters insurance',
      });
    } else {
      factors.push({
        name: 'Property Insurance',
        impact: 'negative',
        description: 'No home or renters insurance detected',
      });
      recommendations.push('Consider home or renters insurance to protect your belongings');
    }

    if (hasLife) {
      score += 10;
      factors.push({
        name: 'Life Insurance',
        impact: 'positive',
        description: 'You have life insurance coverage',
      });
    } else {
      factors.push({
        name: 'Life Insurance',
        impact: 'neutral',
        description: 'No life insurance detected',
      });
      recommendations.push('Consider life insurance to protect your family\'s financial future');
    }

    if (hasUmbrella) {
      score += 10;
      factors.push({
        name: 'Umbrella Insurance',
        impact: 'positive',
        description: 'You have umbrella liability coverage',
      });
    }

    // Check for expiring policies
    const expiringPolicies = policies.filter(p => {
      const daysUntil = Math.floor(
        (p.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil <= 30 && daysUntil > 0;
    });

    if (expiringPolicies.length > 0) {
      score -= 5;
      factors.push({
        name: 'Policy Renewals',
        impact: 'negative',
        description: `${expiringPolicies.length} policy(s) expiring within 30 days`,
      });
      recommendations.push('Review and renew your expiring policies to maintain continuous coverage');
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      factors,
      recommendations,
    };
  }

  /**
   * Get coverage gaps analysis
   */
  async getCoverageGaps(userId: string): Promise<{
    gaps: Array<{
      type: InsuranceType;
      severity: 'high' | 'medium' | 'low';
      description: string;
      recommendation: string;
    }>;
    totalAnnualPremium: number;
    coverageSummary: Record<InsuranceType, boolean>;
  }> {
    const policies = await this.getActivePolicies(userId);
    const gaps: Array<{
      type: InsuranceType;
      severity: 'high' | 'medium' | 'low';
      description: string;
      recommendation: string;
    }> = [];

    const coverageSummary: Record<InsuranceType, boolean> = {
      auto: false,
      home: false,
      renters: false,
      life: false,
      health: false,
      umbrella: false,
      pet: false,
      travel: false,
      other: false,
    };

    let totalAnnualPremium = 0;

    // Mark covered types and calculate premium
    for (const policy of policies) {
      coverageSummary[policy.type] = true;
      const annualPremium = this.calculateAnnualPremium(
        policy.premium.amount,
        policy.premium.frequency
      );
      totalAnnualPremium += annualPremium;
    }

    // Check for common gaps
    if (!coverageSummary.auto) {
      gaps.push({
        type: 'auto',
        severity: 'high',
        description: 'No auto insurance coverage found',
        recommendation: 'Auto insurance is legally required in most states',
      });
    }

    if (!coverageSummary.home && !coverageSummary.renters) {
      gaps.push({
        type: 'home',
        severity: 'medium',
        description: 'No property coverage found',
        recommendation: 'Protect your home or belongings with property insurance',
      });
    }

    if (!coverageSummary.umbrella && totalAnnualPremium > 3000) {
      gaps.push({
        type: 'umbrella',
        severity: 'low',
        description: 'No umbrella liability coverage',
        recommendation: 'Consider umbrella insurance for additional liability protection',
      });
    }

    return {
      gaps,
      totalAnnualPremium,
      coverageSummary,
    };
  }

  // ===========================================================================
  // Unified Data Access
  // ===========================================================================

  /**
   * Get all policies in unified format
   */
  async getUnifiedPolicies(userId: string): Promise<UnifiedInsurancePolicy[]> {
    const policies = await this.getPolicies(userId);

    return policies.map(policy => {
      const daysUntilRenewal = Math.floor(
        (policy.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: `canopy_${policy.id}`,
        provider: 'canopy' as const,
        providerId: policy.id,
        carrierName: policy.carrierName,
        policyNumber: policy.policyNumber,
        type: policy.type,
        status: policy.status,
        premium: {
          amount: policy.premium.amount,
          frequency: policy.premium.frequency,
          annualized: this.calculateAnnualPremium(
            policy.premium.amount,
            policy.premium.frequency
          ),
        },
        coverage: {
          deductible: policy.deductible,
          limit: policy.coverageLimit,
          details: policy.coverages || [],
        },
        dates: {
          effective: policy.effectiveDate,
          expiration: policy.expirationDate,
          daysUntilRenewal: Math.max(0, daysUntilRenewal),
        },
        holder: {
          name: `${policy.policyHolder.firstName} ${policy.policyHolder.lastName}`,
          email: policy.policyHolder.email,
        },
        assets: {
          vehicles: policy.vehicles,
          properties: policy.properties,
        },
        lastSynced: policy.updatedAt,
      };
    });
  }

  // ===========================================================================
  // Webhooks
  // ===========================================================================

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(payload: string): {
    type: 'policy.created' | 'policy.updated' | 'policy.deleted' | 'session.completed';
    userId: string;
    policyId?: string;
    data: Record<string, unknown>;
  } {
    const event = JSON.parse(payload);
    return {
      type: event.type,
      userId: event.user_id,
      policyId: event.policy_id,
      data: event.data,
    };
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private calculateAnnualPremium(amount: number, frequency: string): number {
    switch (frequency) {
      case 'monthly':
        return amount * 12;
      case 'quarterly':
        return amount * 4;
      case 'semi-annual':
        return amount * 2;
      case 'annual':
        return amount;
      default:
        return amount * 12;
    }
  }

  private mapPolicy(data: Record<string, unknown>): InsurancePolicy {
    return {
      id: data.id as string,
      carrierId: data.carrier_id as string,
      carrierName: data.carrier_name as string,
      carrierLogo: data.carrier_logo as string | undefined,
      policyNumber: data.policy_number as string,
      type: data.type as InsuranceType,
      status: data.status as PolicyStatus,
      effectiveDate: new Date(data.effective_date as string),
      expirationDate: new Date(data.expiration_date as string),
      premium: {
        amount: (data.premium as Record<string, unknown>)?.amount as number,
        frequency: (data.premium as Record<string, unknown>)?.frequency as 'monthly' | 'quarterly' | 'semi-annual' | 'annual',
        currency: (data.premium as Record<string, unknown>)?.currency as string || 'USD',
      },
      deductible: data.deductible as number | undefined,
      coverageLimit: data.coverage_limit as number | undefined,
      policyHolder: {
        firstName: (data.policy_holder as Record<string, unknown>)?.first_name as string,
        lastName: (data.policy_holder as Record<string, unknown>)?.last_name as string,
        email: (data.policy_holder as Record<string, unknown>)?.email as string | undefined,
        phone: (data.policy_holder as Record<string, unknown>)?.phone as string | undefined,
        dateOfBirth: (data.policy_holder as Record<string, unknown>)?.date_of_birth as string | undefined,
        address: (data.policy_holder as Record<string, unknown>)?.address as PolicyHolder['address'] | undefined,
      },
      additionalInsureds: data.additional_insureds as PolicyHolder[] | undefined,
      coverages: data.coverages as Coverage[] | undefined,
      vehicles: data.vehicles as Vehicle[] | undefined,
      properties: data.properties as Property[] | undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
      rawData: data,
    };
  }

  private mapClaim(data: Record<string, unknown>): InsuranceClaim {
    return {
      id: data.id as string,
      policyId: data.policy_id as string,
      claimNumber: data.claim_number as string,
      type: data.type as string,
      status: data.status as InsuranceClaim['status'],
      filedDate: new Date(data.filed_date as string),
      closedDate: data.closed_date ? new Date(data.closed_date as string) : undefined,
      amount: data.amount as number | undefined,
      amountPaid: data.amount_paid as number | undefined,
      description: data.description as string | undefined,
    };
  }

  private mapDocument(data: Record<string, unknown>): InsuranceDocument {
    return {
      id: data.id as string,
      policyId: data.policy_id as string,
      type: data.type as InsuranceDocument['type'],
      name: data.name as string,
      url: data.url as string,
      mimeType: data.mime_type as string,
      size: data.size as number | undefined,
      createdAt: new Date(data.created_at as string),
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createCanopyConnector(config?: Partial<CanopyConfig>): CanopyConnector {
  return new CanopyConnector({
    name: 'canopy',
    provider: 'canopy',
    version: '1.0.0',
    priority: 20,
    regions: ['US'],
    capabilities: ['policy_import', 'coverage_analysis', 'claims'],
    rateLimits: {
      requestsPerMinute: 60,
      requestsPerHour: 600,
    },
    retry: {
      maxRetries: 3,
      baseDelayMs: 500,
      maxDelayMs: 10000,
      exponentialBase: 2,
    },
    cache: {
      enabled: true,
      defaultTTLSeconds: 300,
    },
    healthCheckInterval: 60000,
    timeout: 30000,
    enabled: true,
    clientId: config?.clientId || process.env.CANOPY_CLIENT_ID || '',
    clientSecret: config?.clientSecret || process.env.CANOPY_CLIENT_SECRET || '',
    webhookSecret: config?.webhookSecret || process.env.CANOPY_WEBHOOK_SECRET,
    sandbox: config?.sandbox ?? process.env.NODE_ENV !== 'production',
  });
}
