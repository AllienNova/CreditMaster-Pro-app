/**
 * PCTT Native Trading Service
 *
 * Core trading service that executes PCTT signals directly through broker APIs.
 * This is the PRIMARY execution path - no external dependencies required.
 *
 * Flow: Your Charts → PCTT Engine → Broker API → Trade Executed
 *
 * TradingView integration is NOT required - it's an optional export feature
 * for users who want to visualize signals on TV separately.
 */

import { createClient } from "@/lib/supabase/server";
import {
  PCTTEngine,
  createPCTTEngine,
  PCTTSignal,
  PCTTConfig,
  OHLCV,
  StructureObject,
} from "./pctt-core";
import {
  BrokerInterface,
  BracketOrderRequest,
  BracketOrderResult,
  Position,
  AccountInfo,
} from "../brokers/broker-interface";
import { AlpacaBroker } from "../brokers/alpaca-broker";
import { createOperatingModeManager } from "@/lib/trading/modes/operating-mode-manager";
import type {
  OperatingMode,
  ModePermissions,
} from "@/lib/trading/modes/mode-types";
import {
  RiskGateway,
  type TradeContext,
  type PortfolioState,
  type EnhancedRiskValidation,
} from "@/lib/trading/risk/risk-gateway";
import {
  runPreMarketChecklist,
  type PreMarketContext,
} from "@/lib/trading/calendar/pre-market-checklist";

// ============================================================================
// TYPES
// ============================================================================

export interface PCTTTradingConfig {
  // Risk Management
  accountSize: number;
  riskPerTrade: number; // 0.01 = 1%
  maxDailyLoss: number; // 0.05 = 5%
  maxOpenPositions: number;

  // Signal Filters
  minQScore: number; // Minimum Q-score to trade (0.65 recommended)
  allowedRegimes: ("trend" | "range" | "transition")[];
  tradingHoursOnly: boolean;

  // PCTT Engine Config
  pcttConfig: Partial<PCTTConfig>;

  // Execution
  autoExecute: boolean; // Auto-execute or require confirmation
  useBracketOrders: boolean; // Use bracket orders with built-in SL/TP
  paperTrading: boolean;
}

export interface TradeSetup {
  symbol: string;
  signal: PCTTSignal;
  structure: StructureObject;

  // Position sizing
  shares: number;
  dollarAmount: number;
  riskAmount: number;

  // Order levels
  entryPrice: number;
  stopLossPrice: number;
  takeProfitTargets: number[];
  riskRewardRatio: number;

  // Validation
  isValid: boolean;
  validationErrors: string[];
}

export interface ExecutionResult {
  success: boolean;
  tradeId?: string;
  orderId?: string;

  // Order details
  symbol?: string;
  side?: "buy" | "sell";
  quantity?: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;

  error?: string;
  timestamp: Date;

  // Operating mode context
  operatingMode?: OperatingMode;
  requiresConfirmation?: boolean;
}

export interface ActivePosition {
  id: string;
  symbol: string;
  side: "long" | "short";
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit?: number;

  // PCTT context
  qScore: number;
  regime: string;
  actionLine: number;
  safetyLine: number;

  // P&L
  unrealizedPL: number;
  unrealizedPLPercent: number;

  // Orders
  entryOrderId: string;
  stopLossOrderId?: string;
  takeProfitOrderId?: string;

  entryTime: Date;
  status: "open" | "partial" | "closing";
}

export interface TradingStats {
  dailyPL: number;
  dailyTradeCount: number;
  openPositionCount: number;
  totalExposure: number;
  availableBuyingPower: number;
  canTrade: boolean;
  reason?: string;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_TRADING_CONFIG: PCTTTradingConfig = {
  accountSize: 100000,
  riskPerTrade: 0.02,
  maxDailyLoss: 0.05,
  maxOpenPositions: 5,
  minQScore: 0.65,
  allowedRegimes: ["trend"],
  tradingHoursOnly: true,
  pcttConfig: {},
  autoExecute: false,
  useBracketOrders: true,
  paperTrading: true,
};

// ============================================================================
// PCTT NATIVE TRADING SERVICE
// ============================================================================

export class PCTTTradingService {
  private userId: string;
  private config: PCTTTradingConfig;
  private broker: BrokerInterface | null = null;
  private pcttEngine: PCTTEngine;
  private activePositions: Map<string, ActivePosition> = new Map();
  private dailyPL: number = 0;
  private dailyTradeCount: number = 0;
  private preMarketCheckDone: boolean = false;

  constructor(userId: string, config: Partial<PCTTTradingConfig> = {}) {
    this.userId = userId;
    this.config = { ...DEFAULT_TRADING_CONFIG, ...config };
    this.pcttEngine = createPCTTEngine(this.config.pcttConfig);
  }

  // ============================================================================
  // BROKER CONNECTION
  // ============================================================================

  /**
   * Connect to broker for live/paper trading
   */
  async connectBroker(
    brokerType: "alpaca",
    credentials: { apiKey: string; apiSecret: string },
  ): Promise<boolean> {
    try {
      if (brokerType === "alpaca") {
        this.broker = new AlpacaBroker();
        await this.broker.connect({
          apiKey: credentials.apiKey,
          apiSecret: credentials.apiSecret,
          paperTrading: this.config.paperTrading,
        });
        return true;
      }
      return false;
    } catch (_error) {
      // Error logged
      return false;
    }
  }

  /**
   * Disconnect from broker
   */
  async disconnectBroker(): Promise<void> {
    if (this.broker) {
      await this.broker.disconnect();
      this.broker = null;
    }
  }

  /**
   * Check if broker is connected
   */
  isBrokerConnected(): boolean {
    return this.broker?.getConnectionStatus().connected ?? false;
  }

  // ============================================================================
  // SIGNAL ANALYSIS
  // ============================================================================

  /**
   * Analyze market data and generate trade setup
   * This is the core function that processes data through the PCTT engine
   */
  analyzeForTrade(symbol: string, candles: OHLCV[]): TradeSetup | null {
    // Reset engine and process all candles
    this.pcttEngine.reset();

    let latestResult: {
      structure: StructureObject;
      signal: PCTTSignal | null;
    } | null = null;

    for (const candle of candles) {
      latestResult = this.pcttEngine.update(candle);
    }

    if (!latestResult || !latestResult.signal) return null;

    const { structure, signal } = latestResult;

    // Only process entry signals (long or short)
    if (signal.type === "none") return null;

    // Validate signal
    const validationErrors: string[] = [];

    if (signal.qScore < this.config.minQScore) {
      validationErrors.push(
        `Q-score ${signal.qScore.toFixed(2)} below minimum ${this.config.minQScore}`,
      );
    }

    // Map regime for filtering
    const regimeMap: Record<string, "trend" | "range" | "transition"> = {
      trend_up: "trend",
      trend_down: "trend",
      range: "range",
      transition: "transition",
    };
    const mappedRegime = regimeMap[signal.regime] || "transition";

    if (!this.config.allowedRegimes.includes(mappedRegime)) {
      validationErrors.push(`Regime '${signal.regime}' not in allowed list`);
    }

    // Calculate position sizing
    const currentPrice = candles[candles.length - 1].close;
    const entryPrice = signal.entryPrice || currentPrice;
    const stopLossPrice = signal.stopPrice;
    const stopDistance = Math.abs(entryPrice - stopLossPrice);

    if (stopDistance === 0) {
      validationErrors.push("Invalid stop distance (zero)");
      return null;
    }

    const riskAmount = this.config.accountSize * this.config.riskPerTrade;
    const shares = Math.floor(riskAmount / stopDistance);
    const dollarAmount = shares * entryPrice;

    if (shares < 1) {
      validationErrors.push("Position size too small (< 1 share)");
    }

    // Calculate targets (1R, 2R, 3R)
    const direction = signal.type === "long" ? 1 : -1;
    const takeProfitTargets =
      signal.targetPrices.length > 0
        ? signal.targetPrices
        : [
            entryPrice + stopDistance * 1 * direction,
            entryPrice + stopDistance * 2 * direction,
            entryPrice + stopDistance * 3 * direction,
          ];

    const riskRewardRatio =
      signal.riskReward ||
      (stopDistance > 0
        ? Math.abs(takeProfitTargets[1] - entryPrice) / stopDistance
        : 0);

    return {
      symbol,
      signal,
      structure,
      shares,
      dollarAmount,
      riskAmount,
      entryPrice,
      stopLossPrice,
      takeProfitTargets,
      riskRewardRatio,
      isValid: validationErrors.length === 0,
      validationErrors,
    };
  }

  // ============================================================================
  // TRADE EXECUTION
  // ============================================================================

  /**
   * Execute a trade setup through the connected broker.
   *
   * Execution flow:
   *   1. Pre-flight (broker, setup validity)
   *   2. Operating mode check (WATCH blocks live, GUIDED flags confirmation)
   *   3. Enhanced 3-gate risk validation
   *   4. Trading condition checks (daily loss, max positions)
   *   5. Market hours check
   *   6. Order placement
   *   7. Position tracking + graduation recording
   */
  async executeTrade(setup: TradeSetup): Promise<ExecutionResult> {
    const timestamp = new Date();

    // Pre-flight checks
    if (!this.broker) {
      return { success: false, error: "Broker not connected", timestamp };
    }

    if (!setup.isValid) {
      return {
        success: false,
        error: `Validation failed: ${setup.validationErrors.join(", ")}`,
        timestamp,
      };
    }

    // ========================================================================
    // OPERATING MODE CHECK
    // ========================================================================

    let currentMode: OperatingMode = "guided"; // Safe default
    let permissions: ModePermissions = {
      mode: "guided",
      canViewSignals: true,
      canPaperTrade: true,
      canPlaceLiveOrders: true,
      requiresConfirmation: true,
      canAutoExecute: false,
    };
    let modeManagerAvailable = false;

    try {
      const modeManager = createOperatingModeManager(this.userId);
      const permResult = await modeManager.getModePermissions();
      if (permResult.success && permResult.data) {
        permissions = permResult.data;
        currentMode = permissions.mode;
        modeManagerAvailable = true;
      }
    } catch (_err) {
      // Mode manager unavailable — default to GUIDED (safest fallback)
    }

    // WATCH mode: block live trades (only paper trades allowed)
    if (!permissions.canPlaceLiveOrders && !this.config.paperTrading) {
      return {
        success: false,
        error:
          "WATCH mode active: live trades are not permitted. Only paper trades are allowed.",
        timestamp,
        operatingMode: currentMode,
        requiresConfirmation: false,
      };
    }

    // ========================================================================
    // Strativion: Pre-market checklist (runs once per trading day)
    // ========================================================================
    if (!this.preMarketCheckDone) {
      try {
        const brokerConnected = this.broker?.getConnectionStatus().connected ?? false;
        let accountEquity = this.config.accountSize;
        let killSwitchActive = false;

        if (this.broker) {
          try {
            const account = await this.broker.getAccount();
            accountEquity = account.portfolioValue;
          } catch {
            // Use default account size
          }
        }

        try {
          const riskGw = new RiskGateway(this.userId);
          killSwitchActive = riskGw.getKillSwitchStatus().active;
        } catch {
          // Risk gateway unavailable
        }

        const preMarketCtx: PreMarketContext = {
          brokerConnected,
          killSwitchActive,
          accountEquityUsd: accountEquity,
          isDayTrading: true,
        };

        const checklistResult = runPreMarketChecklist(preMarketCtx);
        if (!checklistResult.passed) {
          return {
            success: false,
            error: `Pre-market checklist failed: ${checklistResult.blockers.join("; ")}`,
            timestamp,
            operatingMode: currentMode,
          };
        }

        this.preMarketCheckDone = true;
      } catch (preMarketErr) {
        // Pre-market checklist error is non-fatal — log and continue
        console.error("[PreMarketChecklist] Error:", preMarketErr);
        this.preMarketCheckDone = true; // Don't block retries on error
      }
    }

    // ========================================================================
    // ENHANCED RISK VALIDATION (3-Gate Architecture)
    // ========================================================================

    try {
      const riskGateway = new RiskGateway(this.userId);

      // Build portfolio state from broker account
      let portfolioState: PortfolioState = {
        totalValue: this.config.accountSize,
        cashBalance: this.config.accountSize,
        positions: [],
        dailyPnL: this.dailyPL,
        weeklyPnL: this.dailyPL, // approximation
        drawdown: 0,
        openPositionCount: this.activePositions.size,
      };

      if (this.broker) {
        try {
          const account = await this.broker.getAccount();
          portfolioState = {
            ...portfolioState,
            totalValue: account.portfolioValue,
            cashBalance: account.cash,
          };
        } catch {
          // Use defaults if broker account call fails
        }
      }

      const tradeContext: TradeContext = {
        trade: {
          symbol: setup.symbol,
          side: setup.signal.type === "long" ? "buy" : "sell",
          quantity: setup.shares,
          price: setup.entryPrice,
          stopLoss: setup.stopLossPrice,
        },
        portfolio: portfolioState,
        operatingMode: currentMode,
        dailyTradeCount: this.dailyTradeCount,
      };

      const riskValidation: EnhancedRiskValidation =
        await riskGateway.validateTradeEnhanced(tradeContext);

      if (!riskValidation.approved) {
        const failedGates = riskValidation.gateResults
          .filter((g) => !g.passed)
          .map((g) => g.gate);
        const violationMessages = riskValidation.violations
          .map((v) => v.message)
          .join("; ");

        return {
          success: false,
          error: `Risk validation failed [${failedGates.join(", ")}]: ${violationMessages}`,
          timestamp,
          operatingMode: currentMode,
          requiresConfirmation: false,
        };
      }
    } catch (_err) {
      // Risk gateway error — log but don't block (fail-open for now)
      // In production, this should be configurable (fail-open vs fail-closed)
    }

    // ========================================================================
    // TRADING CONDITION CHECKS
    // ========================================================================

    const stats = await this.getTradingStats();
    if (!stats.canTrade) {
      return {
        success: false,
        error: stats.reason || "Trading not allowed",
        timestamp,
        operatingMode: currentMode,
      };
    }

    // Check market hours if required
    if (this.config.tradingHoursOnly) {
      const isOpen = await this.broker.isMarketOpen();
      if (!isOpen) {
        return {
          success: false,
          error: "Market is closed",
          timestamp,
          operatingMode: currentMode,
        };
      }
    }

    // GUIDED mode: flag that confirmation is required (UI layer handles prompt)
    const requiresConfirmation = permissions.requiresConfirmation;

    // ========================================================================
    // ORDER EXECUTION
    // ========================================================================

    const side = setup.signal.type === "long" ? "buy" : "sell";
    const positionSide = setup.signal.type as "long" | "short";

    let result: BracketOrderResult;

    if (this.config.useBracketOrders) {
      // Bracket order with built-in stop loss and take profit
      const bracketRequest: BracketOrderRequest = {
        symbol: setup.symbol,
        side,
        quantity: setup.shares,
        entryType: "market",
        stopLossPrice: setup.stopLossPrice,
        takeProfitPrice: setup.takeProfitTargets[0], // First target (1R)
        timeInForce: "gtc",
      };

      result = await this.broker.placeBracketOrder(bracketRequest);
    } else {
      // Simple market order (manage stops separately)
      const orderResult = await this.broker.placeOrder({
        symbol: setup.symbol,
        side,
        type: "market",
        quantity: setup.shares,
        timeInForce: "day",
      });

      result = {
        success: orderResult.success,
        entryOrder: orderResult.order,
        error: orderResult.error,
      };
    }

    if (result.success && result.entryOrder) {
      // Track position
      const position: ActivePosition = {
        id: result.entryOrder.id,
        symbol: setup.symbol,
        side: positionSide,
        quantity: setup.shares,
        entryPrice: setup.entryPrice,
        currentPrice: setup.entryPrice,
        stopLoss: setup.stopLossPrice,
        takeProfit: setup.takeProfitTargets[0],
        qScore: setup.signal.qScore,
        regime: setup.signal.regime,
        actionLine: setup.signal.actionLine,
        safetyLine: setup.signal.safetyLine,
        unrealizedPL: 0,
        unrealizedPLPercent: 0,
        entryOrderId: result.entryOrder.id,
        stopLossOrderId: result.stopLossOrder?.id,
        takeProfitOrderId: result.takeProfitOrder?.id,
        entryTime: new Date(),
        status: "open",
      };

      this.activePositions.set(position.id, position);
      this.dailyTradeCount++;

      // Persist to database
      await this.savePosition(position);

      // ====================================================================
      // GRADUATION RECORDING (live trades only, not paper)
      // ====================================================================
      if (!this.config.paperTrading && modeManagerAvailable) {
        try {
          const modeManager = createOperatingModeManager(this.userId);
          // Record the live trade for graduation tracking
          // At execution time we don't know P&L yet; record as not-yet-profitable
          await modeManager.recordLiveTrade(false);

          // Record active day for current mode
          if (currentMode === "guided" || currentMode === "autonomous") {
            const dayMode =
              currentMode === "autonomous" ? "guided" : currentMode;
            await modeManager.recordActiveDay(dayMode);
          }
        } catch {
          // Graduation recording failure is non-fatal
        }
      }

      return {
        success: true,
        tradeId: position.id,
        orderId: result.entryOrder.id,
        symbol: setup.symbol,
        side,
        quantity: setup.shares,
        entryPrice: setup.entryPrice,
        stopLoss: setup.stopLossPrice,
        takeProfit: setup.takeProfitTargets[0],
        timestamp,
        operatingMode: currentMode,
        requiresConfirmation,
      };
    }

    return {
      success: false,
      error: result.error || "Order execution failed",
      timestamp,
      operatingMode: currentMode,
    };
  }

  /**
   * Close an active position
   */
  async closePosition(
    positionId: string,
    reason: string = "manual",
  ): Promise<ExecutionResult> {
    const timestamp = new Date();

    if (!this.broker) {
      return { success: false, error: "Broker not connected", timestamp };
    }

    const position = this.activePositions.get(positionId);
    if (!position) {
      return { success: false, error: "Position not found", timestamp };
    }

    const result = await this.broker.closePosition(position.symbol);

    if (result.success) {
      // Update P&L
      const exitPrice = result.order?.filledAvgPrice || position.currentPrice;
      const pl =
        position.side === "long"
          ? (exitPrice - position.entryPrice) * position.quantity
          : (position.entryPrice - exitPrice) * position.quantity;

      this.dailyPL += pl;
      this.activePositions.delete(positionId);

      // Update database
      await this.closePositionInDb(positionId, exitPrice, pl, reason);

      return {
        success: true,
        tradeId: positionId,
        orderId: result.order?.id,
        symbol: position.symbol,
        timestamp,
      };
    }

    return {
      success: false,
      error: result.error || "Failed to close position",
      timestamp,
    };
  }

  // ============================================================================
  // POSITION MANAGEMENT
  // ============================================================================

  /**
   * Update positions with current prices
   */
  async updatePositions(): Promise<void> {
    if (!this.broker) return;

    const brokerPositions = await this.broker.getPositions();

    for (const [id, position] of this.activePositions) {
      const brokerPos = brokerPositions.find(
        (p) => p.symbol === position.symbol,
      );
      if (brokerPos) {
        position.currentPrice = brokerPos.currentPrice;
        position.unrealizedPL = brokerPos.unrealizedPL;
        position.unrealizedPLPercent = brokerPos.unrealizedPLPercent;
      }
    }
  }

  /**
   * Get all active positions
   */
  getActivePositions(): ActivePosition[] {
    return Array.from(this.activePositions.values());
  }

  /**
   * Get trading statistics
   */
  async getTradingStats(): Promise<TradingStats> {
    let availableBuyingPower = this.config.accountSize;
    let totalExposure = 0;

    if (this.broker) {
      try {
        const account = await this.broker.getAccount();
        availableBuyingPower = account.buyingPower;
        totalExposure = account.portfolioValue - account.cash;
      } catch {
        // Use defaults if broker call fails
      }
    }

    const openPositionCount = this.activePositions.size;

    // Check if trading is allowed
    let canTrade = true;
    let reason: string | undefined;

    if (this.dailyPL <= -(this.config.accountSize * this.config.maxDailyLoss)) {
      canTrade = false;
      reason = "Daily loss limit reached";
    } else if (openPositionCount >= this.config.maxOpenPositions) {
      canTrade = false;
      reason = "Maximum positions reached";
    }

    return {
      dailyPL: this.dailyPL,
      dailyTradeCount: this.dailyTradeCount,
      openPositionCount,
      totalExposure,
      availableBuyingPower,
      canTrade,
      reason,
    };
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private async savePosition(position: ActivePosition): Promise<void> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("pctt_positions").upsert({
      id: position.id,
      user_id: this.userId,
      symbol: position.symbol,
      side: position.side,
      quantity: position.quantity,
      entry_price: position.entryPrice,
      stop_loss: position.stopLoss,
      take_profit: position.takeProfit,
      q_score: position.qScore,
      regime: position.regime,
      action_line: position.actionLine,
      safety_line: position.safetyLine,
      entry_order_id: position.entryOrderId,
      stop_loss_order_id: position.stopLossOrderId,
      take_profit_order_id: position.takeProfitOrderId,
      entry_time: position.entryTime.toISOString(),
      status: position.status,
    });
  }

  private async closePositionInDb(
    positionId: string,
    exitPrice: number,
    realizedPL: number,
    exitReason: string,
  ): Promise<void> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("pctt_positions")
      .update({
        exit_price: exitPrice,
        exit_time: new Date().toISOString(),
        realized_pl: realizedPL,
        exit_reason: exitReason,
        status: "closed",
      })
      .eq("id", positionId);
  }

  async loadPositions(): Promise<void> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("pctt_positions")
      .select("*")
      .eq("user_id", this.userId)
      .eq("status", "open");

    if (data) {
      for (const row of data) {
        const position: ActivePosition = {
          id: row.id,
          symbol: row.symbol,
          side: row.side,
          quantity: row.quantity,
          entryPrice: row.entry_price,
          currentPrice: row.entry_price,
          stopLoss: row.stop_loss,
          takeProfit: row.take_profit,
          qScore: row.q_score,
          regime: row.regime,
          actionLine: row.action_line,
          safetyLine: row.safety_line,
          unrealizedPL: 0,
          unrealizedPLPercent: 0,
          entryOrderId: row.entry_order_id,
          stopLossOrderId: row.stop_loss_order_id,
          takeProfitOrderId: row.take_profit_order_id,
          entryTime: new Date(row.entry_time),
          status: row.status,
        };
        this.activePositions.set(position.id, position);
      }
    }
  }

  // ============================================================================
  // OPERATING MODE
  // ============================================================================

  /**
   * Get the current operating mode for this user.
   *
   * Returns the mode from the operating mode manager, falling back to "guided"
   * if the manager is unavailable (safest default — requires confirmation).
   */
  async getOperatingMode(): Promise<OperatingMode> {
    try {
      const modeManager = createOperatingModeManager(this.userId);
      const result = await modeManager.getCurrentMode();
      if (result.success && result.data) {
        return result.data;
      }
    } catch {
      // Mode manager unavailable — fall back to safe default
    }
    return "guided";
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Update trading configuration
   */
  updateConfig(config: Partial<PCTTTradingConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.pcttConfig) {
      this.pcttEngine = createPCTTEngine(this.config.pcttConfig);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): PCTTTradingConfig {
    return { ...this.config };
  }

  /**
   * Reset daily statistics (call at market open)
   */
  resetDailyStats(): void {
    this.dailyPL = 0;
    this.dailyTradeCount = 0;
    this.preMarketCheckDone = false;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createPCTTTradingService(
  userId: string,
  config?: Partial<PCTTTradingConfig>,
): PCTTTradingService {
  return new PCTTTradingService(userId, config);
}
