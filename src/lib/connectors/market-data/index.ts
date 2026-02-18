/**
 * Market Data Connectors
 *
 * Unified market data access across multiple providers.
 */

export {
  FinnhubConnector,
  createFinnhubConnector,
  type InsiderTransaction,
  type RecommendationTrend,
  type EarningsSurprise,
  type CompanyNews,
  type SentimentData,
  type CompanyFinancials,
  type TechnicalPattern,
} from "./finnhub-connector";
