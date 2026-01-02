/**
 * Portfolio Service
 *
 * Comprehensive service for managing investment portfolios, holdings, and transactions.
 * Integrates with Supabase for data persistence and market data service for real-time prices.
 */

import { getSupabase } from '../../supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  Portfolio,
  PortfolioCreateInput,
  PortfolioUpdateInput,
  Holding,
  HoldingCreateInput,
  HoldingUpdateInput,
  Transaction,
  TransactionCreateInput,
  PortfolioCreateSchema,
  PortfolioUpdateSchema,
  HoldingCreateSchema,
  HoldingUpdateSchema,
  TransactionCreateSchema,
  AssetType,
  TransactionType,
} from '../types/portfolio-db.types';

export class PortfolioService {
  private supabase: SupabaseClient;
  private userId: string;

  constructor(userId: string) {
    this.supabase = getSupabase();
    this.userId = userId;
  }

  // ============================================================================
  // PORTFOLIO CRUD OPERATIONS
  // ============================================================================

  /**
   * Get all portfolios for the current user
   */
  async getPortfolios(): Promise<Portfolio[]> {
    const { data, error } = await this.supabase
      .from('investment_portfolios')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch portfolios: ${error.message}`);
    }

    return data.map(this.mapPortfolioFromDB);
  }

  /**
   * Get a single portfolio by ID
   */
  async getPortfolio(portfolioId: string): Promise<Portfolio | null> {
    const { data, error } = await this.supabase
      .from('investment_portfolios')
      .select('*')
      .eq('id', portfolioId)
      .eq('user_id', this.userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch portfolio: ${error.message}`);
    }

    return this.mapPortfolioFromDB(data);
  }

  /**
   * Create a new portfolio
   */
  async createPortfolio(input: PortfolioCreateInput): Promise<Portfolio> {
    // Validate input
    const validated = PortfolioCreateSchema.parse(input);

    const { data, error } = await this.supabase
      .from('investment_portfolios')
      .insert({
        user_id: this.userId,
        name: validated.name,
        description: validated.description,
        portfolio_type: validated.portfolio_type,
        linked_account_id: validated.linked_account_id,
        risk_level: validated.risk_level,
        target_allocation: validated.target_allocation,
        rebalance_threshold: validated.rebalance_threshold,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create portfolio: ${error.message}`);
    }

    return this.mapPortfolioFromDB(data);
  }

  /**
   * Update an existing portfolio
   */
  async updatePortfolio(
    portfolioId: string,
    input: PortfolioUpdateInput
  ): Promise<Portfolio> {
    // Validate input
    const validated = PortfolioUpdateSchema.parse(input);

    const { data, error } = await this.supabase
      .from('investment_portfolios')
      .update({
        name: validated.name,
        description: validated.description,
        risk_level: validated.risk_level,
        target_allocation: validated.target_allocation,
        rebalance_threshold: validated.rebalance_threshold,
        last_updated_at: new Date().toISOString(),
      })
      .eq('id', portfolioId)
      .eq('user_id', this.userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update portfolio: ${error.message}`);
    }

    return this.mapPortfolioFromDB(data);
  }

  /**
   * Delete a portfolio and all its holdings/transactions
   */
  async deletePortfolio(portfolioId: string): Promise<void> {
    const { error } = await this.supabase
      .from('investment_portfolios')
      .delete()
      .eq('id', portfolioId)
      .eq('user_id', this.userId);

    if (error) {
      throw new Error(`Failed to delete portfolio: ${error.message}`);
    }
  }

  // ============================================================================
  // HOLDINGS CRUD OPERATIONS
  // ============================================================================

  /**
   * Get all holdings for a portfolio
   */
  async getHoldings(portfolioId: string): Promise<Holding[]> {
    const { data, error} = await this.supabase
      .from('investment_holdings')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('user_id', this.userId)
      .order('current_value', { ascending: false, nullsFirst: false });

    if (error) {
      throw new Error(`Failed to fetch holdings: ${error.message}`);
    }

    return data.map(this.mapHoldingFromDB);
  }

  /**
   * Get a single holding by ID
   */
  async getHolding(holdingId: string): Promise<Holding | null> {
    const { data, error } = await this.supabase
      .from('investment_holdings')
      .select('*')
      .eq('id', holdingId)
      .eq('user_id', this.userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch holding: ${error.message}`);
    }

    return this.mapHoldingFromDB(data);
  }

  /**
   * Create a new holding
   */
  async createHolding(input: HoldingCreateInput): Promise<Holding> {
    // Validate input
    const validated = HoldingCreateSchema.parse(input);

    const { data, error } = await this.supabase
      .from('investment_holdings')
      .insert({
        portfolio_id: validated.portfolio_id,
        user_id: this.userId,
        symbol: validated.symbol.toUpperCase(),
        name: validated.name,
        asset_type: validated.asset_type,
        quantity: validated.quantity,
        average_cost: validated.average_cost,
        sector: validated.sector,
        industry: validated.industry,
        country: validated.country || 'US',
        currency: validated.currency || 'USD',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create holding: ${error.message}`);
    }

    return this.mapHoldingFromDB(data);
  }

  /**
   * Update an existing holding
   */
  async updateHolding(
    holdingId: string,
    input: HoldingUpdateInput
  ): Promise<Holding> {
    // Validate input
    const validated = HoldingUpdateSchema.parse(input);

    const { data, error } = await this.supabase
      .from('investment_holdings')
      .update({
        quantity: validated.quantity,
        average_cost: validated.average_cost,
        current_price: validated.current_price,
        sector: validated.sector,
        industry: validated.industry,
        updated_at: new Date().toISOString(),
      })
      .eq('id', holdingId)
      .eq('user_id', this.userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update holding: ${error.message}`);
    }

    return this.mapHoldingFromDB(data);
  }

  /**
   * Delete a holding
   */
  async deleteHolding(holdingId: string): Promise<void> {
    const { error } = await this.supabase
      .from('investment_holdings')
      .delete()
      .eq('id', holdingId)
      .eq('user_id', this.userId);

    if (error) {
      throw new Error(`Failed to delete holding: ${error.message}`);
    }
  }

  // ============================================================================
  // TRANSACTION OPERATIONS
  // ============================================================================

  /**
   * Get all transactions for a portfolio
   */
  async getTransactions(portfolioId: string, limit = 100): Promise<Transaction[]> {
    const { data, error } = await this.supabase
      .from('investment_transactions')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('user_id', this.userId)
      .order('transaction_date', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return data.map(this.mapTransactionFromDB);
  }

  /**
   * Get transactions for a specific holding
   */
  async getHoldingTransactions(holdingId: string): Promise<Transaction[]> {
    const { data, error } = await this.supabase
      .from('investment_transactions')
      .select('*')
      .eq('holding_id', holdingId)
      .eq('user_id', this.userId)
      .order('transaction_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch holding transactions: ${error.message}`);
    }

    return data.map(this.mapTransactionFromDB);
  }

  /**
   * Create a new transaction
   */
  async createTransaction(input: TransactionCreateInput): Promise<Transaction> {
    // Validate input
    const validated = TransactionCreateSchema.parse(input);

    // Calculate total amount if not provided
    const totalAmount = validated.quantity * validated.price + (validated.fees || 0);

    const { data, error } = await this.supabase
      .from('investment_transactions')
      .insert({
        portfolio_id: validated.portfolio_id,
        holding_id: validated.holding_id,
        user_id: this.userId,
        transaction_type: validated.transaction_type,
        symbol: validated.symbol.toUpperCase(),
        quantity: validated.quantity,
        price: validated.price,
        total_amount: totalAmount,
        fees: validated.fees || 0,
        realized_gain_loss: validated.realized_gain_loss,
        notes: validated.notes,
        transaction_date: validated.transaction_date.toISOString(),
        settlement_date: validated.settlement_date?.toISOString(),
        external_id: validated.external_id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }

    // Update holding if this is a buy/sell transaction
    if (validated.holding_id && (validated.transaction_type === 'buy' || validated.transaction_type === 'sell')) {
      await this.updateHoldingFromTransaction(
        validated.holding_id,
        validated.transaction_type as TransactionType,
        validated.quantity,
        validated.price
      );
    }

    return this.mapTransactionFromDB(data);
  }

  /**
   * Update holding quantity and average cost based on transaction
   */
  private async updateHoldingFromTransaction(
    holdingId: string,
    transactionType: TransactionType,
    quantity: number,
    price: number
  ): Promise<void> {
    const holding = await this.getHolding(holdingId);
    if (!holding) return;

    let newQuantity = holding.quantity;
    let newAverageCost = holding.average_cost;

    if (transactionType === TransactionType.BUY) {
      // Calculate new average cost
      const totalCost = holding.quantity * holding.average_cost + quantity * price;
      newQuantity = holding.quantity + quantity;
      newAverageCost = totalCost / newQuantity;
    } else if (transactionType === TransactionType.SELL) {
      newQuantity = holding.quantity - quantity;
      // Average cost remains the same
    }

    await this.updateHolding(holdingId, {
      quantity: newQuantity,
      average_cost: newAverageCost,
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private mapPortfolioFromDB(data: any): Portfolio {
    return {
      ...data,
      last_rebalance_at: data.last_rebalance_at ? new Date(data.last_rebalance_at) : undefined,
      last_updated_at: new Date(data.last_updated_at),
      created_at: new Date(data.created_at),
    };
  }

  private mapHoldingFromDB(data: any): Holding {
    return {
      ...data,
      ex_dividend_date: data.ex_dividend_date ? new Date(data.ex_dividend_date) : undefined,
      last_price_update: data.last_price_update ? new Date(data.last_price_update) : undefined,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  private mapTransactionFromDB(data: any): Transaction {
    return {
      ...data,
      transaction_date: new Date(data.transaction_date),
      settlement_date: data.settlement_date ? new Date(data.settlement_date) : undefined,
      created_at: new Date(data.created_at),
    };
  }
}

