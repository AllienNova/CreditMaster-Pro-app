/**
 * Investment Analyst AI Prompts
 *
 * Professional hedge fund analyst prompts for stock analysis
 * Designed for data-driven insights with structured JSON output
 */

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

export const ANALYST_SYSTEM_PROMPT = `You are a senior hedge fund analyst with 15+ years of experience in equity research and portfolio management. Your analysis is:

- **Data-Driven**: Based on quantitative metrics, not speculation
- **Objective**: Balanced view of both bullish and bearish factors
- **Actionable**: Clear recommendations with specific entry/exit points
- **Risk-Aware**: Always consider downside scenarios and risk factors
- **Professional**: Institutional-grade analysis suitable for fiduciary decision-making

Your responses must be in valid JSON format with no markdown formatting.`;

// ============================================================================
// TECHNICAL ANALYSIS PROMPT
// ============================================================================

export const TECHNICAL_ANALYSIS_PROMPT = `Analyze the technical indicators and price action for {symbol}.

**Current Price Data:**
{priceData}

**Technical Indicators:**
{indicators}

**Historical Price Action:**
{historicalData}

**Analysis Requirements:**

1. **Trend Analysis**
   - Identify short-term (1-4 weeks), medium-term (1-3 months), and long-term (3-12 months) trends
   - Assess trend strength using ADX, moving average alignment, and price momentum
   - Identify key support and resistance levels

2. **Momentum Assessment**
   - Evaluate RSI for overbought/oversold conditions (>70 overbought, <30 oversold)
   - Analyze MACD for bullish/bearish crossovers and divergences
   - Review Stochastic oscillator for entry/exit timing

3. **Volatility Analysis**
   - Assess Bollinger Bands for volatility expansion/contraction
   - Evaluate ATR for position sizing and stop-loss placement
   - Identify potential breakout or breakdown scenarios

4. **Volume Confirmation**
   - Analyze volume trends relative to price action
   - Review OBV (On-Balance Volume) for accumulation/distribution
   - Assess VWAP for institutional activity

5. **Pattern Recognition**
   - Identify chart patterns (head & shoulders, triangles, flags, etc.)
   - Note candlestick patterns signaling reversals or continuations
   - Highlight any technical divergences

**Output Format (JSON):**
{
  "overallSignal": "strong_buy" | "buy" | "hold" | "sell" | "strong_sell",
  "confidence": 0-100,
  "trend": {
    "shortTerm": "bullish" | "bearish" | "neutral",
    "mediumTerm": "bullish" | "bearish" | "neutral",
    "longTerm": "bullish" | "bearish" | "neutral",
    "strength": 0-100,
    "description": "Brief trend summary"
  },
  "signals": [
    {
      "indicator": "RSI",
      "signal": "buy" | "sell" | "hold",
      "value": number,
      "description": "What this indicator suggests",
      "strength": "weak" | "moderate" | "strong"
    }
  ],
  "support": [price levels],
  "resistance": [price levels],
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"]
}`;

// ============================================================================
// FUNDAMENTAL ANALYSIS PROMPT
// ============================================================================

export const FUNDAMENTAL_ANALYSIS_PROMPT = `Perform a comprehensive fundamental analysis for {symbol}.

**Company Overview:**
{companyInfo}

**Financial Metrics:**
{financialMetrics}

**Valuation Ratios:**
{valuationRatios}

**Growth Metrics:**
{growthMetrics}

**Peer Comparison:**
{peerComparison}

**Analysis Requirements:**

1. **Valuation Assessment**
   - Evaluate P/E ratio vs. sector average and historical range
   - Assess PEG ratio for growth-adjusted valuation
   - Review Price-to-Book and Price-to-Sales for asset-based valuation
   - Calculate fair value using DCF, comparable multiples, or dividend discount model

2. **Profitability Analysis**
   - Analyze gross, operating, and net profit margins
   - Evaluate ROE, ROA, and ROIC for capital efficiency
   - Compare profitability metrics to industry peers
   - Identify margin expansion or contraction trends

3. **Growth Evaluation**
   - Assess revenue growth rates (YoY, 3Y, 5Y)
   - Evaluate EPS growth and earnings quality
   - Review forward earnings estimates and guidance
   - Identify growth drivers and sustainability

4. **Financial Health**
   - Analyze debt-to-equity and interest coverage ratios
   - Evaluate current and quick ratios for liquidity
   - Review free cash flow generation and yield
   - Assess balance sheet strength and financial flexibility

5. **Dividend Analysis** (if applicable)
   - Evaluate dividend yield vs. sector average
   - Assess payout ratio and dividend sustainability
   - Review dividend growth history
   - Calculate total return potential

**Output Format (JSON):**
{
  "overallRating": "excellent" | "good" | "fair" | "poor" | "very_poor",
  "fairValue": {
    "value": number,
    "method": "dcf" | "comparable" | "dividend_discount" | "earnings_multiple",
    "upside": percentage,
    "confidence": 0-100
  },
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "relativeValuation": "undervalued" | "fairly_valued" | "overvalued",
  "keyMetrics": [
    {
      "name": "Metric name",
      "value": number or string,
      "interpretation": "positive" | "negative" | "neutral",
      "weight": 0-1
    }
  ]
}`;

// ============================================================================
// SENTIMENT ANALYSIS PROMPT
// ============================================================================

export const SENTIMENT_ANALYSIS_PROMPT = `Analyze market sentiment and investor positioning for {symbol}.

**News Sentiment:**
{newsSentiment}

**Social Media Sentiment:**
{socialSentiment}

**Analyst Ratings:**
{analystRatings}

**Insider Activity:**
{insiderActivity}

**Institutional Activity:**
{institutionalActivity}

**Analysis Requirements:**

1. **News Sentiment**
   - Aggregate sentiment from recent news articles
   - Identify trending topics and themes
   - Assess impact of recent news on stock price
   - Highlight any major catalysts or concerns

2. **Social Media Sentiment**
   - Evaluate retail investor sentiment from Twitter, Reddit, StockTwits
   - Assess mention volume and trending score
   - Identify bullish vs. bearish sentiment distribution
   - Note any viral trends or coordinated activity

3. **Analyst Sentiment**
   - Review consensus rating and recent changes
   - Analyze price target distribution and average
   - Track recent upgrades/downgrades and rationale
   - Assess analyst confidence and conviction

4. **Insider Activity**
   - Evaluate insider buying vs. selling patterns
   - Assess significance of transactions (size, timing, position)
   - Identify any unusual or noteworthy insider activity
   - Interpret insider confidence in company prospects

5. **Institutional Activity**
   - Review institutional ownership changes
   - Identify new positions and increased holdings
   - Note any significant institutional exits
   - Assess smart money positioning

**Output Format (JSON):**
{
  "overallSentiment": {
    "score": -100 to 100,
    "label": "very_bearish" | "bearish" | "neutral" | "bullish" | "very_bullish",
    "confidence": 0-100
  },
  "newsImpact": "positive" | "negative" | "neutral",
  "socialTrend": "increasing" | "decreasing" | "stable",
  "analystConsensus": "strong_buy" | "buy" | "hold" | "sell" | "strong_sell",
  "insiderSignal": "bullish" | "bearish" | "neutral",
  "institutionalSignal": "accumulation" | "distribution" | "neutral",
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "catalysts": [
    {
      "type": "earnings" | "product" | "regulatory" | "macro" | "other",
      "description": "Catalyst description",
      "expectedDate": "YYYY-MM-DD" or null,
      "potentialImpact": "high" | "medium" | "low",
      "direction": "positive" | "negative" | "uncertain"
    }
  ]
}`;

// ============================================================================
// RECOMMENDATION PROMPT
// ============================================================================

export const RECOMMENDATION_PROMPT = `Generate a comprehensive investment recommendation for {symbol} based on multi-factor analysis.

**Technical Analysis Summary:**
{technicalSummary}

**Fundamental Analysis Summary:**
{fundamentalSummary}

**Sentiment Analysis Summary:**
{sentimentSummary}

**Current Market Context:**
{marketContext}

**User Profile:**
- Risk Tolerance: {riskTolerance}
- Time Horizon: {timeHorizon}
- Investment Style: {investmentStyle}

**Analysis Requirements:**

1. **Synthesize Multi-Factor Analysis**
   - Weight technical, fundamental, and sentiment factors appropriately
   - Identify alignment or divergence between analysis types
   - Assess overall risk/reward profile
   - Consider current market environment and sector trends

2. **Generate Recommendation**
   - Provide clear buy/sell/hold recommendation
   - Specify confidence level (0-100)
   - Define appropriate time horizon
   - Suggest position sizing based on risk

3. **Set Price Targets**
   - Bull case scenario (optimistic, 25% probability)
   - Base case scenario (most likely, 50% probability)
   - Bear case scenario (pessimistic, 25% probability)
   - Include rationale for each scenario

4. **Risk Assessment**
   - Identify key risk factors
   - Assess overall risk level
   - Suggest risk mitigation strategies
   - Define stop-loss levels

5. **Action Plan**
   - Specify entry price range
   - Set target price and stop-loss
   - Recommend position size
   - Outline monitoring criteria

**Output Format (JSON):**
{
  "recommendation": {
    "action": "strong_buy" | "buy" | "hold" | "sell" | "strong_sell",
    "confidence": 0-100,
    "timeHorizon": "short_term" | "medium_term" | "long_term",
    "entryPrice": number,
    "targetPrice": number,
    "stopLoss": number,
    "positionSize": 0-100 (percentage of portfolio),
    "rationale": ["Reason 1", "Reason 2", "Reason 3"]
  },
  "priceTargets": [
    {
      "scenario": "bull" | "base" | "bear",
      "price": number,
      "probability": 0-100,
      "timeframe": "3 months" | "6 months" | "12 months",
      "rationale": "Explanation"
    }
  ],
  "riskAssessment": {
    "overallRisk": "very_low" | "low" | "moderate" | "high" | "very_high",
    "keyRisks": ["Risk 1", "Risk 2", "Risk 3"],
    "mitigants": ["Mitigation 1", "Mitigation 2"]
  },
  "investmentThesis": "Comprehensive 2-3 paragraph investment thesis",
  "bullCase": ["Bull point 1", "Bull point 2", "Bull point 3"],
  "bearCase": ["Bear point 1", "Bear point 2", "Bear point 3"],
  "keyMetrics": [
    {
      "name": "Metric name",
      "value": number or string,
      "interpretation": "positive" | "negative" | "neutral",
      "weight": 0-1
    }
  ],
  "warnings": ["Warning 1", "Warning 2"]
}`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format price data for prompts
 */
export function formatPriceData(quote: any): string {
  return `
Symbol: ${quote.symbol}
Current Price: $${quote.price.toFixed(2)}
Change: ${quote.change >= 0 ? "+" : ""}${quote.change.toFixed(2)} (${quote.changePercent.toFixed(2)}%)
Open: $${quote.open.toFixed(2)}
High: $${quote.high.toFixed(2)}
Low: $${quote.low.toFixed(2)}
Volume: ${quote.volume.toLocaleString()}
52-Week High: $${quote.week52High.toFixed(2)}
52-Week Low: $${quote.week52Low.toFixed(2)}
`.trim();
}

/**
 * Format technical indicators for prompts
 */
export function formatIndicators(indicators: any): string {
  return `
Moving Averages:
- SMA(20): $${indicators.sma20.toFixed(2)}
- SMA(50): $${indicators.sma50.toFixed(2)}
- SMA(200): $${indicators.sma200.toFixed(2)}
- EMA(12): $${indicators.ema12.toFixed(2)}
- EMA(26): $${indicators.ema26.toFixed(2)}

Momentum Indicators:
- RSI: ${indicators.rsi.toFixed(2)}
- MACD: ${indicators.macd.macd.toFixed(2)}
- MACD Signal: ${indicators.macd.signal.toFixed(2)}
- MACD Histogram: ${indicators.macd.histogram.toFixed(2)}
- Stochastic %K: ${indicators.stochastic.k.toFixed(2)}
- Stochastic %D: ${indicators.stochastic.d.toFixed(2)}

Volatility Indicators:
- Bollinger Upper: $${indicators.bollingerBands.upper.toFixed(2)}
- Bollinger Middle: $${indicators.bollingerBands.middle.toFixed(2)}
- Bollinger Lower: $${indicators.bollingerBands.lower.toFixed(2)}
- ATR: ${indicators.atr.toFixed(2)}

Volume Indicators:
- OBV: ${indicators.obv.toLocaleString()}
- VWAP: $${indicators.vwap.toFixed(2)}

Trend Indicators:
- ADX: ${indicators.adx.toFixed(2)}
- CCI: ${indicators.cci.toFixed(2)}
`.trim();
}
