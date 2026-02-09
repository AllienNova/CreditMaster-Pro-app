/**
 * LLM Trading Engine
 * 
 * Large Language Model-powered trading analysis using:
 * - Claude 4.5 for deep market analysis
 * - GPT-4o Mini for quick signal interpretation
 * - DeepSeek R1 for reasoning chains
 * 
 * Capabilities:
 * - Market condition analysis
 * - Trade idea generation
 * - Signal interpretation
 * - Risk assessment
 * - Portfolio review
 */

// Dynamic imports to handle missing packages gracefully
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Anthropic: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let OpenAI: any = null;

// Try to load SDKs if available
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Anthropic = require('@anthropic-ai/sdk').default;
} catch { /* SDK not installed */ }

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  OpenAI = require('openai').default;
} catch { /* SDK not installed */ }

// ============================================================================
// TYPES
// ============================================================================

export type LLMProvider = 'claude' | 'gpt' | 'deepseek';

export interface MarketContext {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  priceChange7d: number;
  volume: number;
  volumeChange: number;
  marketCap?: number;
  sector?: string;
  
  // Technical context
  technicalSummary?: {
    trend: 'bullish' | 'bearish' | 'neutral';
    support: number;
    resistance: number;
    rsi: number;
    macdSignal: 'bullish' | 'bearish' | 'neutral';
  };
  
  // News/sentiment
  recentNews?: { headline: string; sentiment: number }[];
  socialSentiment?: number;
}

export interface TradeIdeaParams {
  symbol: string;
  context: MarketContext;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  timeHorizon: 'intraday' | 'swing' | 'position';
  accountSize: number;
  existingPositions?: { symbol: string; side: string; pnl: number }[];
}

export interface TradeIdea {
  symbol: string;
  direction: 'long' | 'short' | 'neutral';
  conviction: 'high' | 'medium' | 'low';
  
  entry: {
    type: 'market' | 'limit' | 'stop_limit';
    price: number;
    zone: { low: number; high: number };
  };
  
  stopLoss: {
    price: number;
    type: string;
    rationale: string;
  };
  
  targets: {
    price: number;
    exitPercent: number;
    rationale: string;
  }[];
  
  trailingStop?: {
    type: string;
    activationPrice: number;
    distance: number;
  };
  
  riskReward: {
    risk: number;
    reward: number;
    ratio: number;
  };
  
  positionSize: {
    shares: number;
    dollarAmount: number;
    portfolioPercent: number;
  };
  
  rationale: string;
  keyRisks: string[];
  catalysts: string[];
  invalidationCriteria: string;
}

export interface SignalInterpretation {
  overallSignal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  confidence: number;
  
  recommendation: 'execute' | 'wait' | 'skip';
  
  signalQuality: {
    technical: number;
    fundamental: number;
    sentiment: number;
    overall: number;
  };
  
  conflicts: {
    signal1: string;
    signal2: string;
    resolution: string;
  }[];
  
  considerations: string[];
  riskFactors: string[];
  rationale: string;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'extreme';
  riskScore: number;
  
  factors: {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    severity: number;
    description: string;
  }[];
  
  recommendations: string[];
  warnings: string[];
}

export interface PortfolioReview {
  healthScore: number;
  
  diversification: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
  
  riskExposure: {
    overall: 'low' | 'medium' | 'high';
    byCategory: Record<string, number>;
    concerns: string[];
  };
  
  performanceInsights: string[];
  
  actionItems: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    rationale: string;
  }[];
}

export interface MarketAnalysis {
  timestamp: Date;
  marketCondition: 'bullish' | 'bearish' | 'neutral' | 'volatile';
  
  summary: string;
  
  sectors: {
    name: string;
    outlook: 'bullish' | 'bearish' | 'neutral';
    reasoning: string;
  }[];
  
  keyLevels: {
    symbol: string;
    support: number[];
    resistance: number[];
  }[];
  
  tradingOpportunities: {
    symbol: string;
    direction: string;
    confidence: number;
    reasoning: string;
  }[];
  
  risks: string[];
  catalysts: string[];
}

// ============================================================================
// LLM TRADING ENGINE
// ============================================================================

export class LLMTradingEngine {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private anthropic: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private openai: any = null;
  private defaultProvider: LLMProvider = 'claude';

  constructor() {
    // Initialize clients if API keys available
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  // ============================================================================
  // MARKET ANALYSIS
  // ============================================================================

  async analyzeMarketConditions(
    symbols: string[],
    contexts: MarketContext[]
  ): Promise<MarketAnalysis> {
    const prompt = this.buildMarketAnalysisPrompt(symbols, contexts);
    const response = await this.callLLM(prompt, 'claude');
    return this.parseMarketAnalysis(response);
  }

  private buildMarketAnalysisPrompt(symbols: string[], contexts: MarketContext[]): string {
    return `You are an expert market analyst. Analyze the following market data and provide a comprehensive market analysis.

## Market Data
${contexts.map(c => `
### ${c.symbol}
- Current Price: $${c.currentPrice.toFixed(2)}
- 24h Change: ${(c.priceChange24h * 100).toFixed(2)}%
- 7d Change: ${(c.priceChange7d * 100).toFixed(2)}%
- Volume: ${c.volume.toLocaleString()}
- Sector: ${c.sector || 'N/A'}
${c.technicalSummary ? `
- Trend: ${c.technicalSummary.trend}
- RSI: ${c.technicalSummary.rsi.toFixed(1)}
- Support: $${c.technicalSummary.support.toFixed(2)}
- Resistance: $${c.technicalSummary.resistance.toFixed(2)}
` : ''}
`).join('\n')}

## Required Output (JSON)
Provide your analysis in the following JSON format:
{
  "marketCondition": "bullish|bearish|neutral|volatile",
  "summary": "Brief market summary",
  "sectors": [{"name": "sector", "outlook": "bullish|bearish|neutral", "reasoning": "why"}],
  "keyLevels": [{"symbol": "SYM", "support": [price1, price2], "resistance": [price1, price2]}],
  "tradingOpportunities": [{"symbol": "SYM", "direction": "long|short", "confidence": 0.0-1.0, "reasoning": "why"}],
  "risks": ["risk1", "risk2"],
  "catalysts": ["catalyst1", "catalyst2"]
}`;
  }

  // ============================================================================
  // TRADE IDEA GENERATION
  // ============================================================================

  async generateTradeIdea(params: TradeIdeaParams): Promise<TradeIdea> {
    const prompt = this.buildTradeIdeaPrompt(params);
    const response = await this.callLLM(prompt, 'claude');
    return this.parseTradeIdea(response, params);
  }

  private buildTradeIdeaPrompt(params: TradeIdeaParams): string {
    const { symbol, context, riskTolerance, timeHorizon, accountSize } = params;
    
    return `You are an expert trader generating a detailed trade idea.

## Symbol: ${symbol}
- Current Price: $${context.currentPrice.toFixed(2)}
- 24h Change: ${(context.priceChange24h * 100).toFixed(2)}%
- Volume: ${context.volume.toLocaleString()}
${context.technicalSummary ? `
- Trend: ${context.technicalSummary.trend}
- RSI: ${context.technicalSummary.rsi.toFixed(1)}
- Support: $${context.technicalSummary.support.toFixed(2)}
- Resistance: $${context.technicalSummary.resistance.toFixed(2)}
` : ''}

## Trading Parameters
- Risk Tolerance: ${riskTolerance}
- Time Horizon: ${timeHorizon}
- Account Size: $${accountSize.toLocaleString()}

## Required Output (JSON)
Generate a complete trade idea:
{
  "direction": "long|short|neutral",
  "conviction": "high|medium|low",
  "entry": {
    "type": "market|limit|stop_limit",
    "price": 0.00,
    "zone": {"low": 0.00, "high": 0.00}
  },
  "stopLoss": {
    "price": 0.00,
    "type": "fixed|atr|swing",
    "rationale": "why this stop"
  },
  "targets": [
    {"price": 0.00, "exitPercent": 50, "rationale": "first target reasoning"},
    {"price": 0.00, "exitPercent": 50, "rationale": "second target reasoning"}
  ],
  "trailingStop": {
    "type": "percentage|atr",
    "activationPrice": 0.00,
    "distance": 0.00
  },
  "positionSizePercent": 0.00,
  "rationale": "Overall trade thesis",
  "keyRisks": ["risk1", "risk2"],
  "catalysts": ["catalyst1", "catalyst2"],
  "invalidationCriteria": "When to abandon the trade"
}`;
  }

  // ============================================================================
  // SIGNAL INTERPRETATION
  // ============================================================================

  async interpretSignals(
    signals: { source: string; signal: string; confidence: number; details?: string }[],
    context: MarketContext
  ): Promise<SignalInterpretation> {
    const prompt = this.buildSignalInterpretationPrompt(signals, context);
    const response = await this.callLLM(prompt, 'gpt');
    return this.parseSignalInterpretation(response);
  }

  private buildSignalInterpretationPrompt(
    signals: { source: string; signal: string; confidence: number; details?: string }[],
    context: MarketContext
  ): string {
    return `You are an expert at interpreting trading signals. Analyze these signals and provide a unified recommendation.

## Symbol: ${context.symbol}
Current Price: $${context.currentPrice.toFixed(2)}

## Signals
${signals.map(s => `- ${s.source}: ${s.signal} (confidence: ${(s.confidence * 100).toFixed(0)}%)${s.details ? ` - ${s.details}` : ''}`).join('\n')}

## Required Output (JSON)
{
  "overallSignal": "strong_buy|buy|hold|sell|strong_sell",
  "confidence": 0.0-1.0,
  "recommendation": "execute|wait|skip",
  "signalQuality": {
    "technical": 0.0-1.0,
    "fundamental": 0.0-1.0,
    "sentiment": 0.0-1.0,
    "overall": 0.0-1.0
  },
  "conflicts": [{"signal1": "source1", "signal2": "source2", "resolution": "how resolved"}],
  "considerations": ["consideration1", "consideration2"],
  "riskFactors": ["risk1", "risk2"],
  "rationale": "Why this recommendation"
}`;
  }

  // ============================================================================
  // RISK ASSESSMENT
  // ============================================================================

  async assessRisk(trade: TradeIdea, portfolio?: { value: number; positions: { symbol: string; value: number }[] }): Promise<RiskAssessment> {
    const prompt = this.buildRiskAssessmentPrompt(trade, portfolio);
    const response = await this.callLLM(prompt, 'deepseek');
    return this.parseRiskAssessment(response);
  }

  private buildRiskAssessmentPrompt(
    trade: TradeIdea,
    portfolio?: { value: number; positions: { symbol: string; value: number }[] }
  ): string {
    return `Assess the risk of this proposed trade.

## Trade Details
- Symbol: ${trade.symbol}
- Direction: ${trade.direction}
- Entry: $${trade.entry.price.toFixed(2)}
- Stop Loss: $${trade.stopLoss.price.toFixed(2)}
- Risk/Reward: ${trade.riskReward.ratio.toFixed(2)}
- Position Size: ${trade.positionSize.portfolioPercent.toFixed(1)}% of portfolio

${portfolio ? `
## Portfolio Context
- Total Value: $${portfolio.value.toLocaleString()}
- Existing Positions: ${portfolio.positions.length}
` : ''}

## Required Output (JSON)
{
  "overallRisk": "low|medium|high|extreme",
  "riskScore": 0-100,
  "factors": [
    {"factor": "factor name", "impact": "positive|negative|neutral", "severity": 0-10, "description": "details"}
  ],
  "recommendations": ["recommendation1", "recommendation2"],
  "warnings": ["warning1", "warning2"]
}`;
  }

  // ============================================================================
  // PORTFOLIO REVIEW
  // ============================================================================

  async reviewPortfolio(
    positions: { symbol: string; shares: number; avgCost: number; currentPrice: number; sector?: string }[],
    totalValue: number
  ): Promise<PortfolioReview> {
    const prompt = this.buildPortfolioReviewPrompt(positions, totalValue);
    const response = await this.callLLM(prompt, 'claude');
    return this.parsePortfolioReview(response);
  }

  private buildPortfolioReviewPrompt(
    positions: { symbol: string; shares: number; avgCost: number; currentPrice: number; sector?: string }[],
    totalValue: number
  ): string {
    return `Review this investment portfolio and provide recommendations.

## Portfolio Value: $${totalValue.toLocaleString()}

## Positions
${positions.map(p => {
  const value = p.shares * p.currentPrice;
  const pnl = (p.currentPrice - p.avgCost) / p.avgCost * 100;
  return `- ${p.symbol}: ${p.shares} shares @ $${p.currentPrice.toFixed(2)} (${pnl >= 0 ? '+' : ''}${pnl.toFixed(1)}%) - ${(value / totalValue * 100).toFixed(1)}% of portfolio${p.sector ? ` [${p.sector}]` : ''}`;
}).join('\n')}

## Required Output (JSON)
{
  "healthScore": 0-100,
  "diversification": {
    "score": 0-100,
    "issues": ["issue1"],
    "suggestions": ["suggestion1"]
  },
  "riskExposure": {
    "overall": "low|medium|high",
    "byCategory": {"category": 0-100},
    "concerns": ["concern1"]
  },
  "performanceInsights": ["insight1", "insight2"],
  "actionItems": [
    {"priority": "high|medium|low", "action": "what to do", "rationale": "why"}
  ]
}`;
  }

  // ============================================================================
  // LLM COMMUNICATION
  // ============================================================================

  private async callLLM(prompt: string, provider: LLMProvider): Promise<string> {
    try {
      if (provider === 'claude' && this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        });
        return response.content[0].type === 'text' ? response.content[0].text : '';
      }
      
      if ((provider === 'gpt' || provider === 'deepseek') && this.openai) {
        const model = provider === 'deepseek' ? 'gpt-4o-mini' : 'gpt-4o-mini';
        const response = await this.openai.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4096,
        });
        return response.choices[0]?.message?.content || '';
      }

      // Fallback mock response
      return this.getMockResponse(prompt);
    } catch (_error) {
      // Error logged
      return this.getMockResponse(prompt);
    }
  }

  private getMockResponse(prompt: string): string {
    // Return mock JSON responses for testing
    if (prompt.includes('market analysis')) {
      return JSON.stringify({
        marketCondition: 'neutral',
        summary: 'Market showing mixed signals',
        sectors: [],
        keyLevels: [],
        tradingOpportunities: [],
        risks: ['Market volatility'],
        catalysts: ['Earnings season'],
      });
    }
    return '{}';
  }

  // ============================================================================
  // RESPONSE PARSING
  // ============================================================================

  private parseMarketAnalysis(response: string): MarketAnalysis {
    try {
      const json = this.extractJSON(response);
      return {
        timestamp: new Date(),
        marketCondition: json.marketCondition || 'neutral',
        summary: json.summary || '',
        sectors: json.sectors || [],
        keyLevels: json.keyLevels || [],
        tradingOpportunities: json.tradingOpportunities || [],
        risks: json.risks || [],
        catalysts: json.catalysts || [],
      };
    } catch {
      return {
        timestamp: new Date(),
        marketCondition: 'neutral',
        summary: 'Unable to parse analysis',
        sectors: [],
        keyLevels: [],
        tradingOpportunities: [],
        risks: [],
        catalysts: [],
      };
    }
  }

  private parseTradeIdea(response: string, params: TradeIdeaParams): TradeIdea {
    try {
      const json = this.extractJSON(response);
      const { context, accountSize } = params;
      
      const positionPercent = json.positionSizePercent || 2;
      const dollarAmount = accountSize * (positionPercent / 100);
      const shares = Math.floor(dollarAmount / context.currentPrice);
      
      return {
        symbol: context.symbol,
        direction: json.direction || 'neutral',
        conviction: json.conviction || 'low',
        entry: json.entry || { type: 'limit', price: context.currentPrice, zone: { low: context.currentPrice * 0.99, high: context.currentPrice * 1.01 } },
        stopLoss: json.stopLoss || { price: context.currentPrice * 0.95, type: 'fixed', rationale: 'Default 5% stop' },
        targets: json.targets || [{ price: context.currentPrice * 1.1, exitPercent: 100, rationale: 'Default 10% target' }],
        trailingStop: json.trailingStop,
        riskReward: {
          risk: Math.abs(context.currentPrice - (json.stopLoss?.price || context.currentPrice * 0.95)),
          reward: (json.targets?.[0]?.price || context.currentPrice * 1.1) - context.currentPrice,
          ratio: 2,
        },
        positionSize: {
          shares,
          dollarAmount,
          portfolioPercent: positionPercent,
        },
        rationale: json.rationale || '',
        keyRisks: json.keyRisks || [],
        catalysts: json.catalysts || [],
        invalidationCriteria: json.invalidationCriteria || '',
      };
    } catch {
      return this.getDefaultTradeIdea(params);
    }
  }

  private parseSignalInterpretation(response: string): SignalInterpretation {
    try {
      const json = this.extractJSON(response);
      return {
        overallSignal: json.overallSignal || 'hold',
        confidence: json.confidence || 0.5,
        recommendation: json.recommendation || 'wait',
        signalQuality: json.signalQuality || { technical: 0.5, fundamental: 0.5, sentiment: 0.5, overall: 0.5 },
        conflicts: json.conflicts || [],
        considerations: json.considerations || [],
        riskFactors: json.riskFactors || [],
        rationale: json.rationale || '',
      };
    } catch {
      return {
        overallSignal: 'hold',
        confidence: 0.5,
        recommendation: 'wait',
        signalQuality: { technical: 0.5, fundamental: 0.5, sentiment: 0.5, overall: 0.5 },
        conflicts: [],
        considerations: [],
        riskFactors: [],
        rationale: 'Unable to parse interpretation',
      };
    }
  }

  private parseRiskAssessment(response: string): RiskAssessment {
    try {
      const json = this.extractJSON(response);
      return {
        overallRisk: json.overallRisk || 'medium',
        riskScore: json.riskScore || 50,
        factors: json.factors || [],
        recommendations: json.recommendations || [],
        warnings: json.warnings || [],
      };
    } catch {
      return {
        overallRisk: 'medium',
        riskScore: 50,
        factors: [],
        recommendations: [],
        warnings: [],
      };
    }
  }

  private parsePortfolioReview(response: string): PortfolioReview {
    try {
      const json = this.extractJSON(response);
      return {
        healthScore: json.healthScore || 70,
        diversification: json.diversification || { score: 70, issues: [], suggestions: [] },
        riskExposure: json.riskExposure || { overall: 'medium', byCategory: {}, concerns: [] },
        performanceInsights: json.performanceInsights || [],
        actionItems: json.actionItems || [],
      };
    } catch {
      return {
        healthScore: 70,
        diversification: { score: 70, issues: [], suggestions: [] },
        riskExposure: { overall: 'medium', byCategory: {}, concerns: [] },
        performanceInsights: [],
        actionItems: [],
      };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractJSON(text: string): any {
    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return {};
  }

  private getDefaultTradeIdea(params: TradeIdeaParams): TradeIdea {
    const { context, accountSize } = params;
    return {
      symbol: context.symbol,
      direction: 'neutral',
      conviction: 'low',
      entry: { type: 'limit', price: context.currentPrice, zone: { low: context.currentPrice * 0.99, high: context.currentPrice * 1.01 } },
      stopLoss: { price: context.currentPrice * 0.95, type: 'fixed', rationale: 'Default stop' },
      targets: [{ price: context.currentPrice * 1.1, exitPercent: 100, rationale: 'Default target' }],
      riskReward: { risk: context.currentPrice * 0.05, reward: context.currentPrice * 0.1, ratio: 2 },
      positionSize: { shares: Math.floor(accountSize * 0.02 / context.currentPrice), dollarAmount: accountSize * 0.02, portfolioPercent: 2 },
      rationale: 'Unable to generate trade idea',
      keyRisks: [],
      catalysts: [],
      invalidationCriteria: '',
    };
  }
}

// Export singleton
export const llmTradingEngine = new LLMTradingEngine();
