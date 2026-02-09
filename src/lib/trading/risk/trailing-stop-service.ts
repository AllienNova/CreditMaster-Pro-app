/**
 * Trailing Stop Service
 * 
 * Comprehensive trailing stop loss system with 5 strategies:
 * 1. Percentage - Fixed % below highest price
 * 2. ATR-Based - Dynamic based on Average True Range
 * 3. Chandelier Exit - ATR from highest high
 * 4. Parabolic SAR - Accelerating stop
 * 5. Volatility - Based on price volatility
 */

import { createClient } from '@/lib/supabase/server';
import { marketDataService } from '@/lib/investments/market-data-service';
import { AssetType, TimeInterval } from '@/lib/investments/types/market-data.types';

// Type for historical bar data
interface BarData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
}

// ============================================================================
// TYPES
// ============================================================================

export type TrailingStopType = 'percentage' | 'atr' | 'chandelier' | 'parabolic_sar' | 'volatility';

export interface TrailingStopConfig {
  type: TrailingStopType;
  
  // Percentage type
  percentageDistance?: number;
  
  // ATR type
  atrPeriod?: number;
  atrMultiplier?: number;
  
  // Chandelier type
  chandelierPeriod?: number;
  chandelierMultiplier?: number;
  
  // Parabolic SAR type
  sarAcceleration?: number;
  sarMaxAcceleration?: number;
  
  // Volatility type
  volatilityPeriod?: number;
  volatilityMultiplier?: number;
  
  // Activation settings
  activationPrice?: number;
  lockInProfitPercent?: number;
  stepSize?: number;
  onlyTrailUp: boolean;
  useHighLow: boolean;
  
  // Time-based tightening
  timeBasedTightening?: {
    enabled: boolean;
    startAfterMinutes: number;
    tighteningRate: number;
  };
}

export interface TrailingStop {
  id: string;
  userId: string;
  symbol: string;
  positionId: string;
  side: 'long' | 'short';
  config: TrailingStopConfig;
  
  // Tracking
  entryPrice: number;
  currentStopPrice: number;
  highestPrice: number;
  lowestPrice: number;
  activated: boolean;
  
  // Status
  status: 'active' | 'triggered' | 'cancelled';
  triggeredAt?: Date;
  triggeredPrice?: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface TrailingStopParams {
  userId: string;
  symbol: string;
  positionId: string;
  side: 'long' | 'short';
  entryPrice: number;
  config: TrailingStopConfig;
}

// ============================================================================
// TRAILING STOP SERVICE
// ============================================================================

export class TrailingStopService {
  private activeStops: Map<string, TrailingStop> = new Map();
  private priceCache: Map<string, { price: number; high: number; low: number; timestamp: Date }> = new Map();

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  async createTrailingStop(params: TrailingStopParams): Promise<TrailingStop> {
    const currentPrice = await this.getCurrentPrice(params.symbol);
    
    const stop: TrailingStop = {
      id: crypto.randomUUID(),
      userId: params.userId,
      symbol: params.symbol,
      positionId: params.positionId,
      side: params.side,
      config: params.config,
      entryPrice: params.entryPrice,
      currentStopPrice: await this.calculateInitialStop(params, currentPrice),
      highestPrice: params.side === 'long' ? currentPrice : 0,
      lowestPrice: params.side === 'short' ? currentPrice : Infinity,
      activated: !params.config.activationPrice,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.activeStops.set(stop.id, stop);
    await this.persistStop(stop);

    return stop;
  }

  async updateTrailingStop(stopId: string, updates: Partial<TrailingStopConfig>): Promise<TrailingStop> {
    const stop = this.activeStops.get(stopId);
    if (!stop) throw new Error(`Trailing stop ${stopId} not found`);

    stop.config = { ...stop.config, ...updates };
    stop.updatedAt = new Date();

    await this.persistStop(stop);
    return stop;
  }

  async cancelTrailingStop(stopId: string): Promise<void> {
    const stop = this.activeStops.get(stopId);
    if (!stop) return;

    stop.status = 'cancelled';
    stop.updatedAt = new Date();
    
    this.activeStops.delete(stopId);
    await this.persistStop(stop);
  }

  async getActiveStops(userId: string): Promise<TrailingStop[]> {
    return Array.from(this.activeStops.values()).filter(s => s.userId === userId);
  }

  async getStopsBySymbol(symbol: string): Promise<TrailingStop[]> {
    return Array.from(this.activeStops.values()).filter(s => s.symbol === symbol);
  }

  // ============================================================================
  // PRICE PROCESSING
  // ============================================================================

  async processPrice(symbol: string, price: number, high?: number, low?: number): Promise<void> {
    const stopsForSymbol = await this.getStopsBySymbol(symbol);
    
    for (const stop of stopsForSymbol) {
      if (stop.status !== 'active') continue;
      await this.updateStopForPrice(stop, price, high, low);
    }
  }

  private async updateStopForPrice(
    stop: TrailingStop, 
    price: number, 
    high?: number, 
    low?: number
  ): Promise<void> {
    const effectiveHigh = stop.config.useHighLow && high ? high : price;
    const effectiveLow = stop.config.useHighLow && low ? low : price;

    // Check activation for long positions
    if (!stop.activated && stop.config.activationPrice) {
      if (stop.side === 'long' && price >= stop.config.activationPrice) {
        stop.activated = true;
        stop.highestPrice = effectiveHigh;
      } else if (stop.side === 'short' && price <= stop.config.activationPrice) {
        stop.activated = true;
        stop.lowestPrice = effectiveLow;
      } else {
        return;
      }
    }

    // Update tracking prices
    if (stop.side === 'long') {
      stop.highestPrice = Math.max(stop.highestPrice, effectiveHigh);
    } else {
      stop.lowestPrice = Math.min(stop.lowestPrice, effectiveLow);
    }

    // Calculate new stop price
    const newStopPrice = await this.calculateStopPrice(stop, price);

    // Apply step size filter
    if (stop.config.stepSize) {
      const diff = Math.abs(newStopPrice - stop.currentStopPrice);
      if (diff < stop.config.stepSize) return;
    }

    // Only trail in favorable direction
    if (stop.config.onlyTrailUp) {
      if (stop.side === 'long' && newStopPrice <= stop.currentStopPrice) return;
      if (stop.side === 'short' && newStopPrice >= stop.currentStopPrice) return;
    }

    // Update stop price
    stop.currentStopPrice = newStopPrice;
    stop.updatedAt = new Date();

    // Check lock-in profit
    if (stop.config.lockInProfitPercent) {
      const profitPercent = stop.side === 'long'
        ? ((price - stop.entryPrice) / stop.entryPrice) * 100
        : ((stop.entryPrice - price) / stop.entryPrice) * 100;

      if (profitPercent >= stop.config.lockInProfitPercent) {
        const breakeven = stop.entryPrice * (stop.side === 'long' ? 1.001 : 0.999);
        if (stop.side === 'long' && stop.currentStopPrice < breakeven) {
          stop.currentStopPrice = breakeven;
        } else if (stop.side === 'short' && stop.currentStopPrice > breakeven) {
          stop.currentStopPrice = breakeven;
        }
      }
    }

    // Apply time-based tightening
    if (stop.config.timeBasedTightening?.enabled) {
      stop.currentStopPrice = this.applyTimeTightening(stop, price);
    }

    // Check if stop is hit
    if (stop.side === 'long' && price <= stop.currentStopPrice) {
      await this.triggerStop(stop, price);
    } else if (stop.side === 'short' && price >= stop.currentStopPrice) {
      await this.triggerStop(stop, price);
    }

    await this.persistStop(stop);
  }

  // ============================================================================
  // STOP CALCULATION METHODS
  // ============================================================================

  private async calculateInitialStop(params: TrailingStopParams, currentPrice: number): Promise<number> {
    const { config, side, entryPrice } = params;

    switch (config.type) {
      case 'percentage':
        return side === 'long'
          ? currentPrice * (1 - (config.percentageDistance || 5) / 100)
          : currentPrice * (1 + (config.percentageDistance || 5) / 100);

      case 'atr':
        const atr = await this.getATR(params.symbol, config.atrPeriod || 14);
        return side === 'long'
          ? currentPrice - atr * (config.atrMultiplier || 2)
          : currentPrice + atr * (config.atrMultiplier || 2);

      case 'chandelier':
        const chandelierAtr = await this.getATR(params.symbol, config.chandelierPeriod || 22);
        return side === 'long'
          ? currentPrice - chandelierAtr * (config.chandelierMultiplier || 3)
          : currentPrice + chandelierAtr * (config.chandelierMultiplier || 3);

      case 'parabolic_sar':
        return this.calculateParabolicSAR(params.symbol, side, currentPrice, config);

      case 'volatility':
        const vol = await this.getVolatility(params.symbol, config.volatilityPeriod || 20);
        return side === 'long'
          ? currentPrice * (1 - vol * (config.volatilityMultiplier || 2))
          : currentPrice * (1 + vol * (config.volatilityMultiplier || 2));

      default:
        return side === 'long' ? entryPrice * 0.95 : entryPrice * 1.05;
    }
  }

  private async calculateStopPrice(stop: TrailingStop, currentPrice: number): Promise<number> {
    const { config, side, highestPrice, lowestPrice } = stop;

    switch (config.type) {
      case 'percentage':
        const pct = config.percentageDistance || 5;
        return side === 'long'
          ? highestPrice * (1 - pct / 100)
          : lowestPrice * (1 + pct / 100);

      case 'atr':
        const atr = await this.getATR(stop.symbol, config.atrPeriod || 14);
        return side === 'long'
          ? highestPrice - atr * (config.atrMultiplier || 2)
          : lowestPrice + atr * (config.atrMultiplier || 2);

      case 'chandelier':
        const chandelierAtr = await this.getATR(stop.symbol, config.chandelierPeriod || 22);
        const highestHigh = await this.getHighestHigh(stop.symbol, config.chandelierPeriod || 22);
        const lowestLow = await this.getLowestLow(stop.symbol, config.chandelierPeriod || 22);
        return side === 'long'
          ? highestHigh - chandelierAtr * (config.chandelierMultiplier || 3)
          : lowestLow + chandelierAtr * (config.chandelierMultiplier || 3);

      case 'parabolic_sar':
        return this.updateParabolicSAR(stop, currentPrice);

      case 'volatility':
        const vol = await this.getVolatility(stop.symbol, config.volatilityPeriod || 20);
        return side === 'long'
          ? highestPrice * (1 - vol * (config.volatilityMultiplier || 2))
          : lowestPrice * (1 + vol * (config.volatilityMultiplier || 2));

      default:
        return stop.currentStopPrice;
    }
  }

  private applyTimeTightening(stop: TrailingStop, currentPrice: number): number {
    const { timeBasedTightening } = stop.config;
    if (!timeBasedTightening?.enabled) return stop.currentStopPrice;

    const minutesActive = (Date.now() - stop.createdAt.getTime()) / 60000;
    if (minutesActive < timeBasedTightening.startAfterMinutes) return stop.currentStopPrice;

    const hoursActive = (minutesActive - timeBasedTightening.startAfterMinutes) / 60;
    const tighteningFactor = 1 - (hoursActive * timeBasedTightening.tighteningRate / 100);
    
    if (stop.side === 'long') {
      const distance = stop.highestPrice - stop.currentStopPrice;
      const tightenedDistance = distance * Math.max(0.1, tighteningFactor);
      return Math.max(stop.currentStopPrice, stop.highestPrice - tightenedDistance);
    } else {
      const distance = stop.currentStopPrice - stop.lowestPrice;
      const tightenedDistance = distance * Math.max(0.1, tighteningFactor);
      return Math.min(stop.currentStopPrice, stop.lowestPrice + tightenedDistance);
    }
  }

  // ============================================================================
  // PARABOLIC SAR
  // ============================================================================

  private sarState: Map<string, { af: number; ep: number; sar: number }> = new Map();

  private calculateParabolicSAR(
    symbol: string, 
    side: 'long' | 'short', 
    price: number, 
    config: TrailingStopConfig
  ): number {
    const af = config.sarAcceleration || 0.02;
    const maxAf = config.sarMaxAcceleration || 0.2;
    
    // Initialize SAR state
    const initialSar = side === 'long' ? price * 0.98 : price * 1.02;
    this.sarState.set(symbol, { af, ep: price, sar: initialSar });
    
    return initialSar;
  }

  private updateParabolicSAR(stop: TrailingStop, currentPrice: number): number {
    const state = this.sarState.get(stop.symbol);
    if (!state) return stop.currentStopPrice;

    const { af, ep, sar } = state;
    const maxAf = stop.config.sarMaxAcceleration || 0.2;
    const afStep = stop.config.sarAcceleration || 0.02;

    let newAf = af;
    let newEp = ep;
    let newSar = sar;

    if (stop.side === 'long') {
      // Update EP if new high
      if (currentPrice > ep) {
        newEp = currentPrice;
        newAf = Math.min(af + afStep, maxAf);
      }
      // Calculate new SAR
      newSar = sar + af * (ep - sar);
      // SAR can't be above the prior two lows (simplified)
      newSar = Math.min(newSar, stop.currentStopPrice);
    } else {
      // Update EP if new low
      if (currentPrice < ep) {
        newEp = currentPrice;
        newAf = Math.min(af + afStep, maxAf);
      }
      // Calculate new SAR
      newSar = sar - af * (sar - ep);
      // SAR can't be below the prior two highs (simplified)
      newSar = Math.max(newSar, stop.currentStopPrice);
    }

    this.sarState.set(stop.symbol, { af: newAf, ep: newEp, sar: newSar });
    return newSar;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getCurrentPrice(symbol: string): Promise<number> {
    const quote = await marketDataService.getQuote(symbol, AssetType.STOCK);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return 'price' in quote ? (quote as any).price : (quote as any).currentPrice;
  }

  private async getHistoricalBars(symbol: string, days: number): Promise<BarData[]> {
    const history = await marketDataService.getHistory(symbol, AssetType.STOCK, TimeInterval.ONE_DAY, days);
    return history.data.map((d: { timestamp: string | number | Date; open: number; high: number; low: number; close: number; volume: number }) => ({
      timestamp: new Date(d.timestamp),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));
  }

  private async getATR(symbol: string, period: number): Promise<number> {
    const bars = await this.getHistoricalBars(symbol, period + 1);
    if (bars.length < 2) return 0;

    let atrSum = 0;
    for (let i = 1; i < bars.length; i++) {
      const high = bars[i].high;
      const low = bars[i].low;
      const prevClose = bars[i - 1].close;
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      atrSum += tr;
    }

    return atrSum / period;
  }

  private async getVolatility(symbol: string, period: number): Promise<number> {
    const bars = await this.getHistoricalBars(symbol, period);
    if (bars.length < 2) return 0.02;

    const returns: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      returns.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private async getHighestHigh(symbol: string, period: number): Promise<number> {
    const bars = await this.getHistoricalBars(symbol, period);
    return Math.max(...bars.map((b: BarData) => b.high));
  }

  private async getLowestLow(symbol: string, period: number): Promise<number> {
    const bars = await this.getHistoricalBars(symbol, period);
    return Math.min(...bars.map((b: BarData) => b.low));
  }

  private async triggerStop(stop: TrailingStop, price: number): Promise<void> {
    stop.status = 'triggered';
    stop.triggeredAt = new Date();
    stop.triggeredPrice = price;
    stop.updatedAt = new Date();

    this.activeStops.delete(stop.id);
    await this.persistStop(stop);

    // Emit event for order execution
    this.emitStopTriggered(stop);
  }

  private emitStopTriggered(_stop: TrailingStop): void {
    // This would be connected to the order management system
    // TrailingStopService: Stop triggered
    void _stop;
  }

  private async persistStop(stop: TrailingStop): Promise<void> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('trailing_stops').upsert({
      id: stop.id,
      user_id: stop.userId,
      symbol: stop.symbol,
      position_id: stop.positionId,
      side: stop.side,
      config: stop.config,
      entry_price: stop.entryPrice,
      current_stop_price: stop.currentStopPrice,
      highest_price: stop.highestPrice,
      lowest_price: stop.lowestPrice,
      activated: stop.activated,
      status: stop.status,
      triggered_at: stop.triggeredAt?.toISOString(),
      triggered_price: stop.triggeredPrice,
      created_at: stop.createdAt.toISOString(),
      updated_at: stop.updatedAt.toISOString(),
    });
  }

  async loadActiveStops(userId: string): Promise<void> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('trailing_stops')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (data) {
      for (const row of data) {
        const stop: TrailingStop = {
          id: row.id,
          userId: row.user_id,
          symbol: row.symbol,
          positionId: row.position_id,
          side: row.side,
          config: row.config,
          entryPrice: row.entry_price,
          currentStopPrice: row.current_stop_price,
          highestPrice: row.highest_price,
          lowestPrice: row.lowest_price,
          activated: row.activated,
          status: row.status,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        };
        this.activeStops.set(stop.id, stop);
      }
    }
  }
}

// Export singleton
export const trailingStopService = new TrailingStopService();
