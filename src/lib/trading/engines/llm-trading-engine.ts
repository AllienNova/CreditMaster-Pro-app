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

import { AIMLService } from '@/lib/aiml-service';

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

export interface SentimentAnalysis {
  symbol: string;
  overallSentiment: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
  sentimentScore: number; // -1.0 to 1.0
  confidence: number;
  drivers: { factor: string; impact: 'positive' | 'negative' | 'neutral'; weight: number }[];
  summary: string;
  timestamp: Date;
}

export interface GeneratedSignal {
  symbol: string;
  action: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  confidence: number;
  timeframe: string;
  entry?: { price: number; type: string };
  stopLoss?: number;
  takeProfit?: number;
  reasoning: string;
  supportingFactors: string[];
  contraryFactors: string[];
  timestamp: Date;
}

export class LLMTradingEngine {
  private aiml: AIMLService | null = null;
  private defaultProvider: LLMProvider = 'claude';

  private readonly MODEL_MAP: Record<LLMProvider, string> = {
    claude: 'anthropic/claude-4.5-sonnet',
    gpt: 'openai/gpt-4o-mini',
    deepseek: 'deepseek/deepseek-r1',
  };

  constructor() {
    try {
      this.aiml = new AIMLService();
    } catch {
      // AIML_API_KEY not set — will use mock responses
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
  // SENTIMENT ANALYSIS
  // ============================================================================

  async analyzeSentiment(context: MarketContext): Promise<SentimentAnalysis> {
    const prompt = `You are an expert market sentiment analyst. Analyze the sentiment for the following asset.

## ${context.symbol}
- Current Price: $${context.currentPrice.toFixed(2)}
- 24h Change: ${(context.priceChange24h * 100).toFixed(2)}%
- 7d Change: ${(context.priceChange7d * 100).toFixed(2)}%
- Volume: ${context.volume.toLocaleString()} (change: ${(context.volumeChange * 100).toFixed(1)}%)
${context.technicalSummary ? `- Technical Trend: ${context.technicalSummary.trend}, RSI: ${context.technicalSummary.rsi.toFixed(1)}` : ''}
${context.recentNews?.length ? `\n## Recent News\n${context.recentNews.map(n => `- ${n.headline} (sentiment: ${n.sentiment.toFixed(2)})`).join('\n')}` : ''}
${context.socialSentiment !== undefined ? `- Social Sentiment Score: ${context.socialSentiment.toFixed(2)}` : ''}

## Required Output (JSON)
{
  "overallSentiment": "very_bullish|bullish|neutral|bearish|very_bearish",
  "sentimentScore": -1.0 to 1.0,
  "confidence": 0.0-1.0,
  "drivers": [{"factor": "description", "impact": "positive|negative|neutral", "weight": 0.0-1.0}],
  "summary": "Brief sentiment summary"
}`;

    const response = await this.callLLM(prompt, 'claude');
    return this.parseSentimentAnalysis(response, context.symbol);
  }

  private parseSentimentAnalysis(response: string, symbol: string): SentimentAnalysis {
    try {
      const json = this.extractJSON(response);
      return {
        symbol,
        overallSentiment: json.overallSentiment || 'neutral',
        sentimentScore: Math.max(-1, Math.min(1, json.sentimentScore ?? 0)),
        confidence: Math.max(0, Math.min(1, json.confidence ?? 0.5)),
        drivers: json.drivers || [],
        summary: json.summary || '',
        timestamp: new Date(),
      };
    } catch {
      return {
        symbol,
        overallSentiment: 'neutral',
        sentimentScore: 0,
        confidence: 0.5,
        drivers: [],
        summary: 'Unable to analyze sentiment',
        timestamp: new Date(),
      };
    }
  }

  // ============================================================================
  // SIGNAL GENERATION
  // ============================================================================

  async generateSignal(
    context: MarketContext,
    signals?: { source: string; signal: string; confidence: number }[],
    sentiment?: SentimentAnalysis
  ): Promise<GeneratedSignal> {
    const prompt = `You are an expert quantitative analyst. Generate a trading signal for the following asset, synthesizing all available data.

## ${context.symbol}
- Current Price: $${context.currentPrice.toFixed(2)}
- 24h Change: ${(context.priceChange24h * 100).toFixed(2)}%
- 7d Change: ${(context.priceChange7d * 100).toFixed(2)}%
- Volume: ${context.volume.toLocaleString()}
${context.technicalSummary ? `
- Trend: ${context.technicalSummary.trend}
- RSI: ${context.technicalSummary.rsi.toFixed(1)}
- MACD: ${context.technicalSummary.macdSignal}
- Support: $${context.technicalSummary.support.toFixed(2)}
- Resistance: $${context.technicalSummary.resistance.toFixed(2)}` : ''}

${signals?.length ? `## Existing Signals\n${signals.map(s => `- ${s.source}: ${s.signal} (${(s.confidence * 100).toFixed(0)}%)`).join('\n')}` : ''}

${sentiment ? `## Sentiment\n- Overall: ${sentiment.overallSentiment} (score: ${sentiment.sentimentScore.toFixed(2)}, confidence: ${(sentiment.confidence * 100).toFixed(0)}%)` : ''}

## Required Output (JSON)
{
  "action": "strong_buy|buy|hold|sell|strong_sell",
  "confidence": 0.0-1.0,
  "timeframe": "intraday|swing|position",
  "entry": {"price": 0.00, "type": "market|limit"},
  "stopLoss": 0.00,
  "takeProfit": 0.00,
  "reasoning": "Why this signal",
  "supportingFactors": ["factor1", "factor2"],
  "contraryFactors": ["factor1", "factor2"]
}`;

    const response = await this.callLLM(prompt, 'deepseek');
    return this.parseGeneratedSignal(response, context.symbol);
  }

  private parseGeneratedSignal(response: string, symbol: string): GeneratedSignal {
    try {
      const json = this.extractJSON(response);
      return {
        symbol,
        action: json.action || 'hold',
        confidence: Math.max(0, Math.min(1, json.confidence ?? 0.5)),
        timeframe: json.timeframe || 'swing',
        entry: json.entry,
        stopLoss: json.stopLoss,
        takeProfit: json.takeProfit,
        reasoning: json.reasoning || '',
        supportingFactors: json.supportingFactors || [],
        contraryFactors: json.contraryFactors || [],
        timestamp: new Date(),
      };
    } catch {
      return {
        symbol,
        action: 'hold',
        confidence: 0.5,
        timeframe: 'swing',
        reasoning: 'Unable to generate signal',
        supportingFactors: [],
        contraryFactors: [],
        timestamp: new Date(),
      };
    }
  }

  // ============================================================================
  // LLM COMMUNICATION
  // ============================================================================

  private async callLLM(prompt: string, provider: LLMProvider): Promise<string> {
    if (!this.aiml) {
      return this.getMockResponse(prompt);
    }

    try {
      const model = this.MODEL_MAP[provider] || this.MODEL_MAP.claude;
      const response = await this.aiml.chat(
        model,
        [{ role: 'user', content: prompt }],
        { max_tokens: 4096, temperature: 0.3 }
      );
      return response.choices[0]?.message?.content || this.getMockResponse(prompt);
    } catch {
      return this.getMockResponse(prompt);
    }
  }

  private getMockResponse(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('market analysis') || lowerPrompt.includes('market analyst')) {
      return JSON.stringify({
        marketCondition: 'neutral',
        summary: 'Market showing mixed signals with no clear directional bias',
        sectors: [{ name: 'Technology', outlook: 'neutral', reasoning: 'Awaiting earnings catalysts' }],
        keyLevels: [],
        tradingOpportunities: [],
        risks: ['Elevated volatility', 'Macro uncertainty'],
        catalysts: ['Upcoming earnings season', 'Central bank policy decisions'],
      });
    }
    if (lowerPrompt.includes('trade idea') || lowerPrompt.includes('expert trader')) {
      return JSON.stringify({
        direction: 'neutral',
        conviction: 'low',
        entry: { type: 'limit', price: 100, zone: { low: 99, high: 101 } },
        stopLoss: { price: 95, type: 'fixed', rationale: 'Below recent support' },
        targets: [{ price: 110, exitPercent: 100, rationale: 'Next resistance level' }],
        positionSizePercent: 2,
        rationale: 'Insufficient data for high-conviction trade',
        keyRisks: ['Market uncertainty'],
        catalysts: [],
        invalidationCriteria: 'Break below support',
      });
    }
    if (lowerPrompt.includes('sentiment')) {
      return JSON.stringify({
        overallSentiment: 'neutral',
        sentimentScore: 0,
        confidence: 0.5,
        drivers: [{ factor: 'Mixed market signals', impact: 'neutral', weight: 1.0 }],
        summary: 'Sentiment is neutral with no strong directional bias',
      });
    }
    if (lowerPrompt.includes('trading signal') || lowerPrompt.includes('generate a trading signal')) {
      return JSON.stringify({
        action: 'hold',
        confidence: 0.5,
        timeframe: 'swing',
        reasoning: 'Insufficient conviction for directional trade',
        supportingFactors: ['Stable price action'],
        contraryFactors: ['Low volume', 'No clear trend'],
      });
    }
    if (lowerPrompt.includes('interpret') || lowerPrompt.includes('interpreting trading signals')) {
      return JSON.stringify({
        overallSignal: 'hold',
        confidence: 0.5,
        recommendation: 'wait',
        signalQuality: { technical: 0.5, fundamental: 0.5, sentiment: 0.5, overall: 0.5 },
        conflicts: [],
        considerations: ['Wait for clearer signals'],
        riskFactors: ['Market uncertainty'],
        rationale: 'Signals do not converge on a clear direction',
      });
    }
    if (lowerPrompt.includes('risk') && lowerPrompt.includes('assess')) {
      return JSON.stringify({
        overallRisk: 'medium',
        riskScore: 50,
        factors: [{ factor: 'Market volatility', impact: 'negative', severity: 5, description: 'Standard market conditions' }],
        recommendations: ['Use appropriate position sizing'],
        warnings: [],
      });
    }
    if (lowerPrompt.includes('portfolio') && lowerPrompt.includes('review')) {
      return JSON.stringify({
        healthScore: 70,
        diversification: { score: 70, issues: [], suggestions: ['Consider adding more sectors'] },
        riskExposure: { overall: 'medium', byCategory: {}, concerns: [] },
        performanceInsights: ['Portfolio performance is in line with market averages'],
        actionItems: [],
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
