/**
 * Crypto Wallet Sync Service
 *
 * Track cryptocurrency holdings across multiple wallets and exchanges:
 * - Wallet connection and balance tracking
 * - Exchange API integration
 * - Portfolio analytics
 * - Price tracking and alerts
 * - Tax lot tracking for gains/losses
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type WalletType = 'hot' | 'cold' | 'exchange' | 'defi';
export type NetworkType =
  | 'bitcoin'
  | 'ethereum'
  | 'solana'
  | 'polygon'
  | 'avalanche'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'bnb';

export type ExchangeType =
  | 'coinbase'
  | 'binance'
  | 'kraken'
  | 'gemini'
  | 'crypto_com'
  | 'robinhood'
  | 'other';

export interface CryptoWallet {
  id: string;
  userId: string;
  name: string;
  type: WalletType;

  // Wallet details
  address?: string;
  network?: NetworkType;
  exchange?: ExchangeType;

  // Connection
  isConnected: boolean;
  lastSync?: Date;
  syncError?: string;

  // Holdings
  holdings: CryptoHolding[];
  totalValueUsd: number;

  // Metadata
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CryptoHolding {
  id: string;
  walletId: string;
  symbol: string;
  name: string;

  // Balance
  quantity: number;
  valueUsd: number;
  priceUsd: number;

  // Cost basis
  costBasis?: number;
  unrealizedGainLoss?: number;
  unrealizedGainLossPercent?: number;

  // Token details
  contractAddress?: string;
  network?: NetworkType;
  decimals?: number;
  logoUrl?: string;

  lastUpdated: Date;
}

export interface CryptoTransaction {
  id: string;
  userId: string;
  walletId: string;

  // Transaction details
  type:
    | 'buy'
    | 'sell'
    | 'transfer_in'
    | 'transfer_out'
    | 'swap'
    | 'stake'
    | 'unstake'
    | 'reward';
  symbol: string;
  quantity: number;
  priceUsd: number;
  totalUsd: number;
  fee?: number;
  feeSymbol?: string;

  // For swaps
  toSymbol?: string;
  toQuantity?: number;

  // Tax
  costBasis?: number;
  gainLoss?: number;
  holdingPeriod?: 'short' | 'long';

  // Blockchain
  txHash?: string;
  blockNumber?: number;
  network?: NetworkType;

  timestamp: Date;
  notes?: string;
}

export interface CryptoPortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercent: number;
  realizedGainLoss: number;

  // Breakdown
  holdingsByAsset: AssetAllocation[];
  holdingsByNetwork: NetworkAllocation[];
  holdingsByWalletType: WalletTypeAllocation[];

  // Top holdings
  topHoldings: CryptoHolding[];

  // Stats
  totalWallets: number;
  totalAssets: number;
  lastSync: Date;
}

export interface AssetAllocation {
  symbol: string;
  name: string;
  quantity: number;
  valueUsd: number;
  percentage: number;
  priceChange24h?: number;
}

export interface NetworkAllocation {
  network: NetworkType;
  valueUsd: number;
  percentage: number;
  assetCount: number;
}

export interface WalletTypeAllocation {
  type: WalletType;
  valueUsd: number;
  percentage: number;
  walletCount: number;
}

export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  condition: 'above' | 'below';
  targetPrice: number;
  currentPrice: number;
  isTriggered: boolean;
  triggeredAt?: Date;
  createdAt: Date;
}

// ============================================================================
// MOCK PRICE DATA
// ============================================================================

const MOCK_PRICES: Record<
  string,
  { price: number; change24h: number; name: string; logo: string }
> = {
  BTC: { price: 97500, change24h: 2.5, name: 'Bitcoin', logo: '₿' },
  ETH: { price: 3250, change24h: 1.8, name: 'Ethereum', logo: 'Ξ' },
  SOL: { price: 185, change24h: 5.2, name: 'Solana', logo: '◎' },
  MATIC: { price: 0.85, change24h: -1.2, name: 'Polygon', logo: '⬡' },
  AVAX: { price: 38, change24h: 3.1, name: 'Avalanche', logo: '' },
  LINK: { price: 22, change24h: 0.8, name: 'Chainlink', logo: '⬡' },
  UNI: { price: 12.5, change24h: -0.5, name: 'Uniswap', logo: '' },
  AAVE: { price: 285, change24h: 1.2, name: 'Aave', logo: '' },
  ARB: { price: 1.15, change24h: 2.8, name: 'Arbitrum', logo: '' },
  OP: { price: 2.45, change24h: 1.5, name: 'Optimism', logo: '' },
};

// ============================================================================
// SERVICE
// ============================================================================

export class CryptoWalletService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // WALLET MANAGEMENT
  // ==========================================================================

  async addWallet(
    wallet: Omit<
      CryptoWallet,
      'id' | 'holdings' | 'totalValueUsd' | 'createdAt' | 'updatedAt'
    >
  ): Promise<CryptoWallet> {
    const now = new Date();
    const newWallet: CryptoWallet = {
      ...wallet,
      id: crypto.randomUUID(),
      holdings: [],
      totalValueUsd: 0,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from('crypto_wallets')
      .insert(this.walletToDb(newWallet))
      .select()
      .single();

    if (error) throw error;
    return this.walletFromDb(data);
  }

  async updateWallet(
    walletId: string,
    updates: Partial<CryptoWallet>
  ): Promise<CryptoWallet> {
    const { data, error } = await this.supabase
      .from('crypto_wallets')
      .update({
        ...this.walletToDb(updates),
        updated_at: new Date().toISOString(),
      })
      .eq('id', walletId)
      .select()
      .single();

    if (error) throw error;
    return this.walletFromDb(data);
  }

  async getWallet(walletId: string): Promise<CryptoWallet | null> {
    const { data } = await this.supabase
      .from('crypto_wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (!data) return null;

    const wallet = this.walletFromDb(data);
    wallet.holdings = await this.getWalletHoldings(walletId);
    wallet.totalValueUsd = wallet.holdings.reduce(
      (sum, h) => sum + h.valueUsd,
      0
    );
    return wallet;
  }

  async getUserWallets(userId: string): Promise<CryptoWallet[]> {
    const { data, error } = await this.supabase
      .from('crypto_wallets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const wallets = (data || []).map(this.walletFromDb);

    // Load holdings for each wallet
    for (const wallet of wallets) {
      wallet.holdings = await this.getWalletHoldings(wallet.id);
      wallet.totalValueUsd = wallet.holdings.reduce(
        (sum, h) => sum + h.valueUsd,
        0
      );
    }

    return wallets;
  }

  async deleteWallet(walletId: string): Promise<void> {
    await this.supabase
      .from('crypto_holdings')
      .delete()
      .eq('wallet_id', walletId);
    await this.supabase.from('crypto_wallets').delete().eq('id', walletId);
  }

  // ==========================================================================
  // HOLDINGS
  // ==========================================================================

  async addHolding(
    holding: Omit<CryptoHolding, 'id' | 'lastUpdated'>
  ): Promise<CryptoHolding> {
    const newHolding = {
      ...holding,
      id: crypto.randomUUID(),
      lastUpdated: new Date(),
    };

    const { data, error } = await this.supabase
      .from('crypto_holdings')
      .insert(this.holdingToDb(newHolding))
      .select()
      .single();

    if (error) throw error;
    return this.holdingFromDb(data);
  }

  async updateHolding(
    holdingId: string,
    updates: Partial<CryptoHolding>
  ): Promise<CryptoHolding> {
    const { data, error } = await this.supabase
      .from('crypto_holdings')
      .update({
        ...this.holdingToDb(updates),
        last_updated: new Date().toISOString(),
      })
      .eq('id', holdingId)
      .select()
      .single();

    if (error) throw error;
    return this.holdingFromDb(data);
  }

  async getWalletHoldings(walletId: string): Promise<CryptoHolding[]> {
    const { data, error } = await this.supabase
      .from('crypto_holdings')
      .select('*')
      .eq('wallet_id', walletId)
      .order('value_usd', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.holdingFromDb);
  }

  // ==========================================================================
  // SYNC & PRICES
  // ==========================================================================

  async syncWallet(walletId: string): Promise<CryptoWallet> {
    const wallet = await this.getWallet(walletId);
    if (!wallet) throw new Error('Wallet not found');

    // In production, this would call blockchain APIs or exchange APIs
    // For now, just update prices for existing holdings
    for (const holding of wallet.holdings) {
      const priceData = MOCK_PRICES[holding.symbol];
      if (priceData) {
        const newValue = holding.quantity * priceData.price;
        await this.updateHolding(holding.id, {
          priceUsd: priceData.price,
          valueUsd: newValue,
          unrealizedGainLoss: holding.costBasis
            ? newValue - holding.costBasis
            : undefined,
          unrealizedGainLossPercent: holding.costBasis
            ? ((newValue - holding.costBasis) / holding.costBasis) * 100
            : undefined,
        });
      }
    }

    await this.updateWallet(walletId, {
      lastSync: new Date(),
      syncError: undefined,
    });

    return (await this.getWallet(walletId))!;
  }

  async getPrice(
    symbol: string
  ): Promise<{ price: number; change24h: number } | null> {
    const priceData = MOCK_PRICES[symbol.toUpperCase()];
    if (!priceData) return null;
    return { price: priceData.price, change24h: priceData.change24h };
  }

  async getPrices(
    symbols: string[]
  ): Promise<Record<string, { price: number; change24h: number }>> {
    const result: Record<string, { price: number; change24h: number }> = {};
    for (const symbol of symbols) {
      const price = await this.getPrice(symbol);
      if (price) result[symbol.toUpperCase()] = price;
    }
    return result;
  }

  // ==========================================================================
  // PORTFOLIO ANALYTICS
  // ==========================================================================

  async getPortfolioSummary(userId: string): Promise<CryptoPortfolioSummary> {
    const wallets = await this.getUserWallets(userId);

    let totalValue = 0;
    let totalCostBasis = 0;
    const assetMap = new Map<string, AssetAllocation>();
    const networkMap = new Map<
      NetworkType,
      { value: number; assets: Set<string> }
    >();
    const walletTypeMap = new Map<
      WalletType,
      { value: number; count: number }
    >();
    const allHoldings: CryptoHolding[] = [];

    for (const wallet of wallets) {
      const walletValue = wallet.totalValueUsd;
      totalValue += walletValue;

      // Track wallet type allocation
      const typeData = walletTypeMap.get(wallet.type) || { value: 0, count: 0 };
      typeData.value += walletValue;
      typeData.count++;
      walletTypeMap.set(wallet.type, typeData);

      for (const holding of wallet.holdings) {
        allHoldings.push(holding);
        totalCostBasis += holding.costBasis || 0;

        // Track asset allocation
        const existing = assetMap.get(holding.symbol);
        if (existing) {
          existing.quantity += holding.quantity;
          existing.valueUsd += holding.valueUsd;
        } else {
          const priceData = MOCK_PRICES[holding.symbol];
          assetMap.set(holding.symbol, {
            symbol: holding.symbol,
            name: holding.name,
            quantity: holding.quantity,
            valueUsd: holding.valueUsd,
            percentage: 0,
            priceChange24h: priceData?.change24h,
          });
        }

        // Track network allocation
        if (holding.network) {
          const networkData = networkMap.get(holding.network) || {
            value: 0,
            assets: new Set(),
          };
          networkData.value += holding.valueUsd;
          networkData.assets.add(holding.symbol);
          networkMap.set(holding.network, networkData);
        }
      }
    }

    // Calculate percentages
    const holdingsByAsset = Array.from(assetMap.values())
      .map((a) => ({
        ...a,
        percentage: totalValue > 0 ? (a.valueUsd / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.valueUsd - a.valueUsd);

    const holdingsByNetwork: NetworkAllocation[] = Array.from(
      networkMap.entries()
    )
      .map(([network, data]) => ({
        network,
        valueUsd: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        assetCount: data.assets.size,
      }))
      .sort((a, b) => b.valueUsd - a.valueUsd);

    const holdingsByWalletType: WalletTypeAllocation[] = Array.from(
      walletTypeMap.entries()
    )
      .map(([type, data]) => ({
        type,
        valueUsd: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        walletCount: data.count,
      }))
      .sort((a, b) => b.valueUsd - a.valueUsd);

    // Top holdings
    const topHoldings = allHoldings
      .sort((a, b) => b.valueUsd - a.valueUsd)
      .slice(0, 10);

    const unrealizedGainLoss = totalValue - totalCostBasis;

    return {
      totalValue,
      totalCostBasis,
      unrealizedGainLoss,
      unrealizedGainLossPercent:
        totalCostBasis > 0 ? (unrealizedGainLoss / totalCostBasis) * 100 : 0,
      realizedGainLoss: 0, // Would need transaction history
      holdingsByAsset,
      holdingsByNetwork,
      holdingsByWalletType,
      topHoldings,
      totalWallets: wallets.length,
      totalAssets: assetMap.size,
      lastSync: new Date(),
    };
  }

  // ==========================================================================
  // PRICE ALERTS
  // ==========================================================================

  async createPriceAlert(
    alert: Omit<PriceAlert, 'id' | 'isTriggered' | 'triggeredAt' | 'createdAt'>
  ): Promise<PriceAlert> {
    const newAlert: PriceAlert = {
      ...alert,
      id: crypto.randomUUID(),
      isTriggered: false,
      createdAt: new Date(),
    };

    const { data, error } = await this.supabase
      .from('crypto_price_alerts')
      .insert({
        id: newAlert.id,
        user_id: newAlert.userId,
        symbol: newAlert.symbol,
        condition: newAlert.condition,
        target_price: newAlert.targetPrice,
        current_price: newAlert.currentPrice,
        is_triggered: newAlert.isTriggered,
        created_at: newAlert.createdAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return this.alertFromDb(data);
  }

  async getUserAlerts(userId: string): Promise<PriceAlert[]> {
    const { data, error } = await this.supabase
      .from('crypto_price_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_triggered', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.alertFromDb);
  }

  async deleteAlert(alertId: string): Promise<void> {
    await this.supabase.from('crypto_price_alerts').delete().eq('id', alertId);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private walletToDb(wallet: Partial<CryptoWallet>): Record<string, unknown> {
    return {
      id: wallet.id,
      user_id: wallet.userId,
      name: wallet.name,
      type: wallet.type,
      address: wallet.address,
      network: wallet.network,
      exchange: wallet.exchange,
      is_connected: wallet.isConnected,
      last_sync: wallet.lastSync?.toISOString(),
      sync_error: wallet.syncError,
      total_value_usd: wallet.totalValueUsd,
      notes: wallet.notes,
      created_at: wallet.createdAt?.toISOString(),
      updated_at: wallet.updatedAt?.toISOString(),
    };
  }

  private walletFromDb(data: Record<string, unknown>): CryptoWallet {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      name: data.name as string,
      type: data.type as WalletType,
      address: data.address as string | undefined,
      network: data.network as NetworkType | undefined,
      exchange: data.exchange as ExchangeType | undefined,
      isConnected: data.is_connected as boolean,
      lastSync: data.last_sync ? new Date(data.last_sync as string) : undefined,
      syncError: data.sync_error as string | undefined,
      holdings: [],
      totalValueUsd: data.total_value_usd as number,
      notes: data.notes as string | undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }

  private holdingToDb(
    holding: Partial<CryptoHolding>
  ): Record<string, unknown> {
    return {
      id: holding.id,
      wallet_id: holding.walletId,
      symbol: holding.symbol,
      name: holding.name,
      quantity: holding.quantity,
      value_usd: holding.valueUsd,
      price_usd: holding.priceUsd,
      cost_basis: holding.costBasis,
      unrealized_gain_loss: holding.unrealizedGainLoss,
      unrealized_gain_loss_percent: holding.unrealizedGainLossPercent,
      contract_address: holding.contractAddress,
      network: holding.network,
      decimals: holding.decimals,
      logo_url: holding.logoUrl,
      last_updated: holding.lastUpdated?.toISOString(),
    };
  }

  private holdingFromDb(data: Record<string, unknown>): CryptoHolding {
    return {
      id: data.id as string,
      walletId: data.wallet_id as string,
      symbol: data.symbol as string,
      name: data.name as string,
      quantity: data.quantity as number,
      valueUsd: data.value_usd as number,
      priceUsd: data.price_usd as number,
      costBasis: data.cost_basis as number | undefined,
      unrealizedGainLoss: data.unrealized_gain_loss as number | undefined,
      unrealizedGainLossPercent: data.unrealized_gain_loss_percent as
        | number
        | undefined,
      contractAddress: data.contract_address as string | undefined,
      network: data.network as NetworkType | undefined,
      decimals: data.decimals as number | undefined,
      logoUrl: data.logo_url as string | undefined,
      lastUpdated: new Date(data.last_updated as string),
    };
  }

  private alertFromDb(data: Record<string, unknown>): PriceAlert {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      symbol: data.symbol as string,
      condition: data.condition as 'above' | 'below',
      targetPrice: data.target_price as number,
      currentPrice: data.current_price as number,
      isTriggered: data.is_triggered as boolean,
      triggeredAt: data.triggered_at
        ? new Date(data.triggered_at as string)
        : undefined,
      createdAt: new Date(data.created_at as string),
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let cryptoWalletServiceInstance: CryptoWalletService | null = null;

export function getCryptoWalletService(): CryptoWalletService {
  if (!cryptoWalletServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    cryptoWalletServiceInstance = new CryptoWalletService(
      supabaseUrl,
      supabaseKey
    );
  }
  return cryptoWalletServiceInstance;
}
