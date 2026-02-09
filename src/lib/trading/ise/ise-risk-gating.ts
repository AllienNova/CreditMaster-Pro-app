/**
 * ISE Risk Gating Service
 * 
 * Integrates the Instrument Selection Engine with the trading risk manager.
 * Controls which instruments are allowed for new trades based on the active set.
 */

import type {
  RotationDecision,
  ActiveInstrumentSet,
  UserTier,
} from './types';
import { InstrumentRotationService } from './instrument-rotation';
import { InstrumentRankingService } from './instrument-ranking';

// ============================================================================
// TYPES
// ============================================================================

export interface TradeGateResult {
  allowed: boolean;
  reason: string;
  suggestions?: string[];
}

export interface GatingConfig {
  // Behavior
  blockNewTradesOutsideActiveSet: boolean;
  allowExistingPositionManagement: boolean;
  
  // Overrides
  allowManualOverride: boolean;
  requireConfirmationForOverride: boolean;
  
  // Logging
  logAllGatingDecisions: boolean;
}

export const DEFAULT_GATING_CONFIG: GatingConfig = {
  blockNewTradesOutsideActiveSet: true,
  allowExistingPositionManagement: true,
  allowManualOverride: true,
  requireConfirmationForOverride: true,
  logAllGatingDecisions: true,
};

export interface GatingDecision {
  symbol: string;
  action: 'new_entry' | 'scale_in' | 'exit' | 'stop_adjust';
  allowed: boolean;
  reason: string;
  timestamp: Date;
  overridden: boolean;
}

// ============================================================================
// ISE RISK GATING SERVICE
// ============================================================================

export class ISERiskGating {
  private rotationService: InstrumentRotationService;
  private rankingService: InstrumentRankingService;
  private config: GatingConfig;
  private decisionLog: GatingDecision[] = [];
  private manualOverrides: Set<string> = new Set();
  
  constructor(
    rotationService: InstrumentRotationService,
    rankingService: InstrumentRankingService,
    config: Partial<GatingConfig> = {}
  ) {
    this.rotationService = rotationService;
    this.rankingService = rankingService;
    this.config = { ...DEFAULT_GATING_CONFIG, ...config };
  }
  
  /**
   * Check if a new trade is allowed for a symbol
   */
  canOpenNewPosition(symbol: string): TradeGateResult {
    // Check manual override first
    if (this.manualOverrides.has(symbol)) {
      this.logDecision(symbol, 'new_entry', true, 'Manual override active', true);
      return { allowed: true, reason: 'Manual override active' };
    }
    
    // Check if in active set
    if (this.rotationService.isActive(symbol)) {
      this.logDecision(symbol, 'new_entry', true, 'Symbol in active trading set', false);
      return { allowed: true, reason: 'Symbol in active trading set' };
    }
    
    // Check if gating is enabled
    if (!this.config.blockNewTradesOutsideActiveSet) {
      this.logDecision(symbol, 'new_entry', true, 'Gating disabled', false);
      return { allowed: true, reason: 'Gating disabled - all symbols allowed' };
    }
    
    // Check cooldown
    if (this.rotationService.isInCooldown(symbol)) {
      const remaining = this.rotationService.getCooldownRemaining(symbol);
      const mins = Math.ceil(remaining / 60000);
      this.logDecision(symbol, 'new_entry', false, `In cooldown (${mins}min remaining)`, false);
      return {
        allowed: false,
        reason: `Symbol ${symbol} is in cooldown (${mins} minutes remaining)`,
        suggestions: this.getSuggestions(symbol),
      };
    }
    
    // Not in active set
    this.logDecision(symbol, 'new_entry', false, 'Not in active trading set', false);
    return {
      allowed: false,
      reason: `Symbol ${symbol} is not in the active trading set`,
      suggestions: this.getSuggestions(symbol),
    };
  }
  
  /**
   * Check if scaling into existing position is allowed
   */
  canScaleIn(symbol: string): TradeGateResult {
    // More permissive than new entry
    if (this.rotationService.isActive(symbol) || this.manualOverrides.has(symbol)) {
      this.logDecision(symbol, 'scale_in', true, 'Scale-in allowed', false);
      return { allowed: true, reason: 'Scale-in allowed for active symbol' };
    }
    
    // Allow scale-in for existing positions even if not active (configurable)
    if (this.config.allowExistingPositionManagement) {
      this.logDecision(symbol, 'scale_in', true, 'Existing position management allowed', false);
      return { 
        allowed: true, 
        reason: 'Scale-in allowed for existing positions (not recommended - consider exiting instead)' 
      };
    }
    
    this.logDecision(symbol, 'scale_in', false, 'Scale-in blocked for inactive symbol', false);
    return {
      allowed: false,
      reason: `Scale-in blocked - ${symbol} not in active set`,
      suggestions: ['Consider exiting position instead'],
    };
  }
  
  /**
   * Check if exit is allowed (usually always yes)
   */
  canExit(symbol: string): TradeGateResult {
    // Exits are always allowed - risk management takes priority
    this.logDecision(symbol, 'exit', true, 'Exits always allowed', false);
    return { allowed: true, reason: 'Exits are always allowed' };
  }
  
  /**
   * Check if stop adjustment is allowed
   */
  canAdjustStop(symbol: string): TradeGateResult {
    // Stop adjustments are always allowed for risk management
    this.logDecision(symbol, 'stop_adjust', true, 'Stop adjustments always allowed', false);
    return { allowed: true, reason: 'Stop adjustments always allowed' };
  }
  
  /**
   * Set manual override for a symbol
   */
  setManualOverride(symbol: string, enabled: boolean): void {
    if (enabled) {
      this.manualOverrides.add(symbol);
    } else {
      this.manualOverrides.delete(symbol);
    }
  }
  
  /**
   * Check if symbol has manual override
   */
  hasManualOverride(symbol: string): boolean {
    return this.manualOverrides.has(symbol);
  }
  
  /**
   * Get all manual overrides
   */
  getManualOverrides(): string[] {
    return [...this.manualOverrides];
  }
  
  /**
   * Clear all manual overrides
   */
  clearManualOverrides(): void {
    this.manualOverrides.clear();
  }
  
  /**
   * Get suggested alternatives when a trade is blocked
   */
  private getSuggestions(blockedSymbol: string): string[] {
    const suggestions: string[] = [];
    const activeSymbols = this.rotationService.getActiveSymbols();
    
    if (activeSymbols.length > 0) {
      suggestions.push(`Active alternatives: ${activeSymbols.slice(0, 3).join(', ')}`);
    }
    
    // Get top ranked that aren't active yet
    const topRanked = this.rankingService.getTopN(5);
    const notActive = topRanked.filter(r => !activeSymbols.includes(r.symbol));
    if (notActive.length > 0) {
      suggestions.push(`Top opportunities: ${notActive.slice(0, 2).map(r => r.symbol).join(', ')}`);
    }
    
    if (this.config.allowManualOverride) {
      suggestions.push('Use manual override if you want to trade this symbol anyway');
    }
    
    return suggestions;
  }
  
  /**
   * Log gating decision
   */
  private logDecision(
    symbol: string,
    action: GatingDecision['action'],
    allowed: boolean,
    reason: string,
    overridden: boolean
  ): void {
    if (!this.config.logAllGatingDecisions) return;
    
    this.decisionLog.push({
      symbol,
      action,
      allowed,
      reason,
      timestamp: new Date(),
      overridden,
    });
    
    // Keep last 500 decisions
    if (this.decisionLog.length > 500) {
      this.decisionLog = this.decisionLog.slice(-500);
    }
  }
  
  /**
   * Get recent gating decisions
   */
  getRecentDecisions(limit: number = 20): GatingDecision[] {
    return this.decisionLog.slice(-limit);
  }
  
  /**
   * Get gating statistics
   */
  getStats(): {
    totalDecisions: number;
    allowed: number;
    blocked: number;
    overridden: number;
    activeSetSize: number;
  } {
    const allowed = this.decisionLog.filter(d => d.allowed).length;
    const overridden = this.decisionLog.filter(d => d.overridden).length;
    
    return {
      totalDecisions: this.decisionLog.length,
      allowed,
      blocked: this.decisionLog.length - allowed,
      overridden,
      activeSetSize: this.rotationService.getActiveSymbols().length,
    };
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<GatingConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createISERiskGating(
  rotationService: InstrumentRotationService,
  rankingService: InstrumentRankingService,
  config?: Partial<GatingConfig>
): ISERiskGating {
  return new ISERiskGating(rotationService, rankingService, config);
}

// ============================================================================
// INTEGRATION WITH EXISTING RISK GATEWAY
// ============================================================================

/**
 * Create a trade validator function that can be used with existing risk gateway
 */
export function createISETradeValidator(gating: ISERiskGating) {
  return {
    validateNewTrade: (symbol: string) => gating.canOpenNewPosition(symbol),
    validateScaleIn: (symbol: string) => gating.canScaleIn(symbol),
    validateExit: (symbol: string) => gating.canExit(symbol),
    validateStopAdjust: (symbol: string) => gating.canAdjustStop(symbol),
  };
}
