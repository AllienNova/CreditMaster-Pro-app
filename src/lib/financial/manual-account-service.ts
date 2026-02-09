/**
 * Manual Account Entry Service
 *
 * Allows users to manually track assets and accounts not connected via Plaid:
 * - Real estate properties
 * - Vehicles
 * - Crypto wallets
 * - Cash holdings
 * - Collectibles and valuables
 * - Other investments
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type ManualAccountType =
  | 'real_estate'
  | 'vehicle'
  | 'crypto'
  | 'cash'
  | 'collectible'
  | 'business'
  | 'retirement'
  | 'loan'
  | 'other_asset'
  | 'other_liability';

export type AccountCategory = 'asset' | 'liability';

export interface ManualAccount {
  id: string;
  userId: string;
  name: string;
  type: ManualAccountType;
  category: AccountCategory;

  // Value tracking
  currentValue: number;
  originalValue?: number;
  purchaseDate?: Date;
  currency: string;

  // Details based on type
  details: AccountDetails;

  // Value history
  valueHistory: ValueHistoryEntry[];

  // Metadata
  notes?: string;
  tags: string[];
  includeInNetWorth: boolean;
  isActive: boolean;
  lastUpdated: Date;
  createdAt: Date;
}

export interface ValueHistoryEntry {
  date: Date;
  value: number;
  source: 'manual' | 'api' | 'estimate';
  notes?: string;
}

export type AccountDetails =
  | RealEstateDetails
  | VehicleDetails
  | CryptoDetails
  | CollectibleDetails
  | LoanDetails
  | GenericDetails;

export interface RealEstateDetails {
  type: 'real_estate';
  propertyType:
    | 'primary_residence'
    | 'rental'
    | 'vacation'
    | 'land'
    | 'commercial';
  address?: string;
  squareFeet?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  mortgageBalance?: number;
  monthlyRent?: number;
  annualTaxes?: number;
  annualInsurance?: number;
  zillowUrl?: string;
}

export interface VehicleDetails {
  type: 'vehicle';
  vehicleType: 'car' | 'truck' | 'motorcycle' | 'boat' | 'rv' | 'other';
  make: string;
  model: string;
  year: number;
  mileage?: number;
  vin?: string;
  loanBalance?: number;
  kbbUrl?: string;
}

export interface CryptoDetails {
  type: 'crypto';
  coin: string;
  symbol: string;
  quantity: number;
  walletAddress?: string;
  exchange?: string;
  stakingYield?: number;
}

export interface CollectibleDetails {
  type: 'collectible';
  category:
    | 'art'
    | 'jewelry'
    | 'watches'
    | 'wine'
    | 'coins'
    | 'cards'
    | 'memorabilia'
    | 'other';
  description: string;
  condition?: string;
  appraisalDate?: Date;
  appraisalValue?: number;
  insuranceValue?: number;
}

export interface LoanDetails {
  type: 'loan';
  loanType: 'personal' | 'student' | 'auto' | 'mortgage' | 'business' | 'other';
  lender: string;
  originalAmount: number;
  interestRate: number;
  monthlyPayment: number;
  remainingTerm?: number;
  payoffDate?: Date;
}

export interface GenericDetails {
  type: 'generic';
  description?: string;
  customFields?: Record<string, string | number>;
}

export interface NetWorthSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  byType: Record<ManualAccountType, number>;
  manualAccountsCount: number;
  linkedAccountsValue?: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export class ManualAccountService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // CRUD OPERATIONS
  // ==========================================================================

  async createAccount(
    account: Omit<ManualAccount, 'id' | 'createdAt' | 'valueHistory'>
  ): Promise<ManualAccount> {
    const now = new Date();
    const newAccount: ManualAccount = {
      ...account,
      id: crypto.randomUUID(),
      valueHistory: [
        {
          date: now,
          value: account.currentValue,
          source: 'manual',
        },
      ],
      createdAt: now,
    };

    const { data, error } = await this.supabase
      .from('manual_accounts')
      .insert(this.toDbFormat(newAccount))
      .select()
      .single();

    if (error) throw error;
    return this.fromDbFormat(data);
  }

  async updateAccount(
    accountId: string,
    updates: Partial<ManualAccount>
  ): Promise<ManualAccount> {
    const { data, error } = await this.supabase
      .from('manual_accounts')
      .update({
        ...this.toDbFormat(updates),
        last_updated: new Date().toISOString(),
      })
      .eq('id', accountId)
      .select()
      .single();

    if (error) throw error;
    return this.fromDbFormat(data);
  }

  async updateValue(
    accountId: string,
    newValue: number,
    source: 'manual' | 'api' | 'estimate' = 'manual',
    notes?: string
  ): Promise<ManualAccount> {
    const account = await this.getAccount(accountId);
    if (!account) throw new Error('Account not found');

    const newEntry: ValueHistoryEntry = {
      date: new Date(),
      value: newValue,
      source,
      notes,
    };

    const updatedHistory = [...account.valueHistory, newEntry];

    return this.updateAccount(accountId, {
      currentValue: newValue,
      valueHistory: updatedHistory,
    });
  }

  async deleteAccount(accountId: string): Promise<void> {
    const { error } = await this.supabase
      .from('manual_accounts')
      .delete()
      .eq('id', accountId);

    if (error) throw error;
  }

  async getAccount(accountId: string): Promise<ManualAccount | null> {
    const { data } = await this.supabase
      .from('manual_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    return data ? this.fromDbFormat(data) : null;
  }

  async getUserAccounts(
    userId: string,
    includeInactive = false
  ): Promise<ManualAccount[]> {
    let query = this.supabase
      .from('manual_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(this.fromDbFormat);
  }

  async getAccountsByType(
    userId: string,
    type: ManualAccountType
  ): Promise<ManualAccount[]> {
    const { data, error } = await this.supabase
      .from('manual_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .eq('is_active', true);

    if (error) throw error;
    return (data || []).map(this.fromDbFormat);
  }

  // ==========================================================================
  // NET WORTH
  // ==========================================================================

  async calculateNetWorth(userId: string): Promise<NetWorthSummary> {
    const accounts = await this.getUserAccounts(userId);
    const activeAccounts = accounts.filter((a) => a.includeInNetWorth);

    let totalAssets = 0;
    let totalLiabilities = 0;
    const byType: Record<ManualAccountType, number> = {
      real_estate: 0,
      vehicle: 0,
      crypto: 0,
      cash: 0,
      collectible: 0,
      business: 0,
      retirement: 0,
      loan: 0,
      other_asset: 0,
      other_liability: 0,
    };

    for (const account of activeAccounts) {
      byType[account.type] += account.currentValue;

      if (account.category === 'asset') {
        totalAssets += account.currentValue;
      } else {
        totalLiabilities += account.currentValue;
      }
    }

    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      byType,
      manualAccountsCount: activeAccounts.length,
    };
  }

  async getNetWorthHistory(
    userId: string,
    months: number = 12
  ): Promise<{ date: Date; netWorth: number }[]> {
    const accounts = await this.getUserAccounts(userId);
    const now = new Date();
    const history: { date: Date; netWorth: number }[] = [];

    for (let i = months; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      let netWorth = 0;

      for (const account of accounts) {
        if (!account.includeInNetWorth) continue;

        // Find the value closest to this date
        const relevantEntries = account.valueHistory
          .filter((h) => h.date <= date)
          .sort((a, b) => b.date.getTime() - a.date.getTime());

        const value = relevantEntries[0]?.value || 0;

        if (account.category === 'asset') {
          netWorth += value;
        } else {
          netWorth -= value;
        }
      }

      history.push({ date, netWorth });
    }

    return history;
  }

  // ==========================================================================
  // TEMPLATES
  // ==========================================================================

  getAccountTemplate(type: ManualAccountType): Partial<ManualAccount> {
    const templates: Record<ManualAccountType, Partial<ManualAccount>> = {
      real_estate: {
        type: 'real_estate',
        category: 'asset',
        currency: 'USD',
        includeInNetWorth: true,
        isActive: true,
        tags: ['property'],
        details: {
          type: 'real_estate',
          propertyType: 'primary_residence',
        } as RealEstateDetails,
      },
      vehicle: {
        type: 'vehicle',
        category: 'asset',
        currency: 'USD',
        includeInNetWorth: true,
        isActive: true,
        tags: ['vehicle'],
        details: {
          type: 'vehicle',
          vehicleType: 'car',
          make: '',
          model: '',
          year: new Date().getFullYear(),
        } as VehicleDetails,
      },
      crypto: {
        type: 'crypto',
        category: 'asset',
        currency: 'USD',
        includeInNetWorth: true,
        isActive: true,
        tags: ['crypto', 'investment'],
        details: {
          type: 'crypto',
          coin: '',
          symbol: '',
          quantity: 0,
        } as CryptoDetails,
      },
      cash: {
        type: 'cash',
        category: 'asset',
        currency: 'USD',
        includeInNetWorth: true,
        isActive: true,
        tags: ['cash'],
        details: { type: 'generic' } as GenericDetails,
      },
      collectible: {
        type: 'collectible',
        category: 'asset',
        currency: 'USD',
        includeInNetWorth: true,
        isActive: true,
        tags: ['collectible'],
        details: {
          type: 'collectible',
          category: 'other',
          description: '',
        } as CollectibleDetails,
      },
      business: {
        type: 'business',
        category: 'asset',
        currency: 'USD',
        includeInNetWorth: true,
        isActive: true,
        tags: ['business'],
        details: { type: 'generic' } as GenericDetails,
      },
      retirement: {
        type: 'retirement',
        category: 'asset',
        currency: 'USD',
        includeInNetWorth: true,
        isActive: true,
        tags: ['retirement', 'investment'],
        details: { type: 'generic' } as GenericDetails,
      },
      loan: {
        type: 'loan',
        category: 'liability',
        currency: 'USD',
        includeInNetWorth: true,
        isActive: true,
        tags: ['debt'],
        details: {
          type: 'loan',
          loanType: 'personal',
          lender: '',
          originalAmount: 0,
          interestRate: 0,
          monthlyPayment: 0,
        } as LoanDetails,
      },
      other_asset: {
        type: 'other_asset',
        category: 'asset',
        currency: 'USD',
        includeInNetWorth: true,
        isActive: true,
        tags: [],
        details: { type: 'generic' } as GenericDetails,
      },
      other_liability: {
        type: 'other_liability',
        category: 'liability',
        currency: 'USD',
        includeInNetWorth: true,
        isActive: true,
        tags: ['debt'],
        details: { type: 'generic' } as GenericDetails,
      },
    };

    return templates[type];
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private toDbFormat(account: Partial<ManualAccount>): Record<string, unknown> {
    return {
      id: account.id,
      user_id: account.userId,
      name: account.name,
      type: account.type,
      category: account.category,
      current_value: account.currentValue,
      original_value: account.originalValue,
      purchase_date: account.purchaseDate?.toISOString(),
      currency: account.currency,
      details: account.details,
      value_history: account.valueHistory?.map((h) => ({
        ...h,
        date: h.date.toISOString(),
      })),
      notes: account.notes,
      tags: account.tags,
      include_in_net_worth: account.includeInNetWorth,
      is_active: account.isActive,
      last_updated: account.lastUpdated?.toISOString(),
      created_at: account.createdAt?.toISOString(),
    };
  }

  private fromDbFormat(data: Record<string, unknown>): ManualAccount {
    const valueHistory = (
      (data.value_history as Array<Record<string, unknown>>) || []
    ).map((h) => ({
      date: new Date(h.date as string),
      value: h.value as number,
      source: h.source as 'manual' | 'api' | 'estimate',
      notes: h.notes as string | undefined,
    }));

    return {
      id: data.id as string,
      userId: data.user_id as string,
      name: data.name as string,
      type: data.type as ManualAccountType,
      category: data.category as AccountCategory,
      currentValue: data.current_value as number,
      originalValue: data.original_value as number | undefined,
      purchaseDate: data.purchase_date
        ? new Date(data.purchase_date as string)
        : undefined,
      currency: data.currency as string,
      details: data.details as AccountDetails,
      valueHistory,
      notes: data.notes as string | undefined,
      tags: (data.tags as string[]) || [],
      includeInNetWorth: data.include_in_net_worth as boolean,
      isActive: data.is_active as boolean,
      lastUpdated: new Date(data.last_updated as string),
      createdAt: new Date(data.created_at as string),
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let manualAccountServiceInstance: ManualAccountService | null = null;

export function getManualAccountService(): ManualAccountService {
  if (!manualAccountServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    manualAccountServiceInstance = new ManualAccountService(
      supabaseUrl,
      supabaseKey
    );
  }
  return manualAccountServiceInstance;
}
