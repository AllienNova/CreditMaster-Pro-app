/**
 * PCTT Webhook Handler
 *
 * ============================================================================
 * OPTIONAL FEATURE - NOT REQUIRED FOR TRADING
 * ============================================================================
 *
 * This is an OPTIONAL webhook receiver for users who want to receive alerts
 * from TradingView. It is NOT required for trading - all trading executes
 * natively through the PCTTTradingService → Broker API path.
 *
 * Use Case: User has exported Pine Script to TradingView and wants alerts
 * to sync back to Fynvita for logging/backup execution.
 *
 * Primary Trading Path (Native - Recommended):
 *   Your Charts → PCTTEngine → PCTTTradingService → Alpaca API → Trade
 *
 * Optional TradingView Webhook Path:
 *   TradingView Alert → This Handler → Log/Backup execution
 */

import { timingSafeEqual } from "@/lib/security/timing-safe-equal";

// ============================================================================
// TYPES
// ============================================================================

export interface PCTTWebhookPayload {
  signal: "long" | "short";
  symbol: string;
  price: number;
  stop: number;
  target1: number;
  target2: number;
  qScore: number;
  regime: string;
  timestamp: string;
}

export interface WebhookValidationResult {
  valid: boolean;
  error?: string;
  payload?: PCTTWebhookPayload;
}

export interface ExecutionResult {
  success: boolean;
  orderId?: string;
  error?: string;
  executedPrice?: number;
  executedQuantity?: number;
}

export interface WebhookConfig {
  secretToken?: string;
  allowedSymbols?: string[];
  maxPositionSize?: number;
  riskPerTrade?: number;
  accountSize?: number;
  paperTrading?: boolean;
  minQScore?: number;
  allowedRegimes?: string[];
  cooldownSeconds?: number;
  onSignal?: (payload: PCTTWebhookPayload) => Promise<ExecutionResult>;
  onError?: (error: Error, payload: unknown) => void;
}

export interface SignalLog {
  id: string;
  timestamp: Date;
  payload: PCTTWebhookPayload;
  result: ExecutionResult;
  positionSize: number;
  riskAmount: number;
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export class PCTTWebhookHandler {
  private config: WebhookConfig;
  private signalHistory: Map<string, number> = new Map();
  private signalLogs: SignalLog[] = [];

  constructor(config: WebhookConfig = {}) {
    this.config = {
      maxPositionSize: 1000,
      riskPerTrade: 0.02,
      accountSize: 100000,
      paperTrading: true,
      minQScore: 0.65,
      allowedRegimes: ["TREND UP", "TREND DOWN", "TRANSITION"],
      cooldownSeconds: 300,
      ...config,
    };
  }

  // ==========================================================================
  // WEBHOOK PROCESSING
  // ==========================================================================

  /**
   * Process incoming webhook from TradingView
   */
  async processWebhook(
    body: unknown,
    headers?: Record<string, string>,
  ): Promise<ExecutionResult> {
    try {
      // Validate authentication if secret token is set
      if (this.config.secretToken) {
        const authToken =
          headers?.["x-webhook-secret"] || headers?.["authorization"];
        if (!timingSafeEqual(authToken ?? "", this.config.secretToken)) {
          return {
            success: false,
            error: "Unauthorized: Invalid secret token",
          };
        }
      }

      // Validate and parse payload
      const validation = this.validatePayload(body);
      if (!validation.valid || !validation.payload) {
        return { success: false, error: validation.error || "Invalid payload" };
      }

      const payload = validation.payload;

      // Check cooldown
      const cooldownResult = this.checkCooldown(payload.symbol);
      if (!cooldownResult.allowed) {
        return {
          success: false,
          error: `Cooldown active for ${payload.symbol}. Wait ${cooldownResult.remainingSeconds}s`,
        };
      }

      // Apply filters
      const filterResult = this.applyFilters(payload);
      if (!filterResult.passed) {
        return { success: false, error: filterResult.reason };
      }

      // Calculate position size
      const positionSize = this.calculatePositionSize(payload);

      // Execute or forward to handler
      let result: ExecutionResult;

      if (this.config.onSignal) {
        result = await this.config.onSignal(payload);
      } else if (this.config.paperTrading) {
        result = this.simulateExecution(payload, positionSize);
      } else {
        result = { success: false, error: "No execution handler configured" };
      }

      // Log signal
      this.logSignal(payload, result, positionSize);

      // Update cooldown
      if (result.success) {
        this.signalHistory.set(payload.symbol, Date.now());
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.config.onError?.(err, body);
      return { success: false, error: err.message };
    }
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  /**
   * Validate incoming webhook payload
   */
  validatePayload(body: unknown): WebhookValidationResult {
    if (!body || typeof body !== "object") {
      return { valid: false, error: "Payload must be an object" };
    }

    const data = body as Record<string, unknown>;

    // Required fields
    if (!data.signal || !["long", "short"].includes(data.signal as string)) {
      return {
        valid: false,
        error: 'Invalid or missing signal field (must be "long" or "short")',
      };
    }

    if (!data.symbol || typeof data.symbol !== "string") {
      return { valid: false, error: "Invalid or missing symbol field" };
    }

    if (typeof data.price !== "number" || data.price <= 0) {
      return { valid: false, error: "Invalid or missing price field" };
    }

    if (typeof data.stop !== "number" || data.stop <= 0) {
      return { valid: false, error: "Invalid or missing stop field" };
    }

    if (typeof data.target1 !== "number" || data.target1 <= 0) {
      return { valid: false, error: "Invalid or missing target1 field" };
    }

    if (typeof data.qScore !== "number" || data.qScore < 0 || data.qScore > 1) {
      return {
        valid: false,
        error: "Invalid or missing qScore field (must be 0-1)",
      };
    }

    // Validate stop placement
    if (data.signal === "long" && data.stop >= data.price) {
      return {
        valid: false,
        error: "Long signal stop must be below entry price",
      };
    }

    if (data.signal === "short" && data.stop <= data.price) {
      return {
        valid: false,
        error: "Short signal stop must be above entry price",
      };
    }

    const payload: PCTTWebhookPayload = {
      signal: data.signal as "long" | "short",
      symbol: data.symbol as string,
      price: data.price as number,
      stop: data.stop as number,
      target1: data.target1 as number,
      target2: (data.target2 as number) || (data.target1 as number),
      qScore: data.qScore as number,
      regime: (data.regime as string) || "UNKNOWN",
      timestamp: (data.timestamp as string) || new Date().toISOString(),
    };

    return { valid: true, payload };
  }

  // ==========================================================================
  // FILTERS
  // ==========================================================================

  /**
   * Apply trading filters to signal
   */
  applyFilters(payload: PCTTWebhookPayload): {
    passed: boolean;
    reason?: string;
  } {
    // Symbol filter
    if (this.config.allowedSymbols && this.config.allowedSymbols.length > 0) {
      if (!this.config.allowedSymbols.includes(payload.symbol)) {
        return {
          passed: false,
          reason: `Symbol ${payload.symbol} not in allowed list`,
        };
      }
    }

    // Q-Score filter
    if (this.config.minQScore && payload.qScore < this.config.minQScore) {
      return {
        passed: false,
        reason: `Q-Score ${(payload.qScore * 100).toFixed(0)}% below minimum ${(this.config.minQScore * 100).toFixed(0)}%`,
      };
    }

    // Regime filter
    if (this.config.allowedRegimes && this.config.allowedRegimes.length > 0) {
      if (!this.config.allowedRegimes.includes(payload.regime)) {
        return {
          passed: false,
          reason: `Regime ${payload.regime} not allowed`,
        };
      }
    }

    return { passed: true };
  }

  /**
   * Check cooldown for symbol
   */
  checkCooldown(symbol: string): {
    allowed: boolean;
    remainingSeconds?: number;
  } {
    const lastSignalTime = this.signalHistory.get(symbol);

    if (!lastSignalTime || !this.config.cooldownSeconds) {
      return { allowed: true };
    }

    const elapsed = (Date.now() - lastSignalTime) / 1000;
    const remaining = this.config.cooldownSeconds - elapsed;

    if (remaining <= 0) {
      return { allowed: true };
    }

    return { allowed: false, remainingSeconds: Math.ceil(remaining) };
  }

  // ==========================================================================
  // POSITION SIZING
  // ==========================================================================

  /**
   * Calculate position size based on risk parameters
   */
  calculatePositionSize(payload: PCTTWebhookPayload): number {
    if (!this.config.accountSize || !this.config.riskPerTrade) {
      return this.config.maxPositionSize || 100;
    }

    const riskAmount = this.config.accountSize * this.config.riskPerTrade;
    const riskPerShare = Math.abs(payload.price - payload.stop);

    if (riskPerShare <= 0) {
      return 0;
    }

    let shares = Math.floor(riskAmount / riskPerShare);

    // Apply max position size limit
    if (this.config.maxPositionSize) {
      shares = Math.min(shares, this.config.maxPositionSize);
    }

    return shares;
  }

  // ==========================================================================
  // EXECUTION
  // ==========================================================================

  /**
   * Simulate trade execution (paper trading)
   */
  private simulateExecution(
    payload: PCTTWebhookPayload,
    quantity: number,
  ): ExecutionResult {
    if (quantity <= 0) {
      return { success: false, error: "Position size is zero or negative" };
    }

    // Simulate slippage (0.01% - 0.05%)
    const slippagePct = 0.0001 + Math.random() * 0.0004;
    const slippage = payload.price * slippagePct;
    const executedPrice =
      payload.signal === "long"
        ? payload.price + slippage
        : payload.price - slippage;

    return {
      success: true,
      orderId: `PAPER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      executedPrice,
      executedQuantity: quantity,
    };
  }

  // ==========================================================================
  // LOGGING
  // ==========================================================================

  /**
   * Log signal and execution result
   */
  private logSignal(
    payload: PCTTWebhookPayload,
    result: ExecutionResult,
    positionSize: number,
  ): void {
    const riskAmount = positionSize * Math.abs(payload.price - payload.stop);

    const log: SignalLog = {
      id: result.orderId || `LOG-${Date.now()}`,
      timestamp: new Date(),
      payload,
      result,
      positionSize,
      riskAmount,
    };

    this.signalLogs.push(log);

    // Keep only last 1000 logs
    if (this.signalLogs.length > 1000) {
      this.signalLogs.shift();
    }
  }

  /**
   * Get signal history
   */
  getSignalLogs(limit: number = 100): SignalLog[] {
    return this.signalLogs.slice(-limit);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSignals: number;
    successfulSignals: number;
    failedSignals: number;
    longSignals: number;
    shortSignals: number;
    avgQScore: number;
    totalRisk: number;
  } {
    const logs = this.signalLogs;
    const successful = logs.filter((l) => l.result.success);
    const longs = logs.filter((l) => l.payload.signal === "long");
    const shorts = logs.filter((l) => l.payload.signal === "short");

    return {
      totalSignals: logs.length,
      successfulSignals: successful.length,
      failedSignals: logs.length - successful.length,
      longSignals: longs.length,
      shortSignals: shorts.length,
      avgQScore:
        logs.length > 0
          ? logs.reduce((sum, l) => sum + l.payload.qScore, 0) / logs.length
          : 0,
      totalRisk: successful.reduce((sum, l) => sum + l.riskAmount, 0),
    };
  }

  /**
   * Clear logs and cooldowns
   */
  reset(): void {
    this.signalLogs = [];
    this.signalHistory.clear();
  }
}

// ============================================================================
// EXPRESS MIDDLEWARE (for Next.js API routes or Express)
// ============================================================================

/**
 * Create webhook middleware for Next.js API routes
 */
export function createWebhookMiddleware(config: WebhookConfig = {}) {
  const handler = new PCTTWebhookHandler(config);

  return async (req: { body: unknown; headers: Record<string, string> }) => {
    return handler.processWebhook(req.body, req.headers);
  };
}

// ============================================================================
// FACTORY
// ============================================================================

export function createPCTTWebhookHandler(
  config?: WebhookConfig,
): PCTTWebhookHandler {
  return new PCTTWebhookHandler(config);
}

export default PCTTWebhookHandler;
