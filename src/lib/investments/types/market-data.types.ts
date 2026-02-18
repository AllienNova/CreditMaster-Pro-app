/**
 * Market Data Type Definitions
 *
 * Comprehensive TypeScript interfaces and Zod schemas for all market data structures
 * Supports stocks, cryptocurrencies, ETFs, mutual funds, and bonds
 */

import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export enum AssetType {
  STOCK = "STOCK",
  CRYPTO = "CRYPTO",
  ETF = "ETF",
  MUTUAL_FUND = "MUTUAL_FUND",
  BOND = "BOND",
}

export enum TimeInterval {
  ONE_MIN = "1MIN",
  FIVE_MIN = "5MIN",
  FIFTEEN_MIN = "15MIN",
  THIRTY_MIN = "30MIN",
  ONE_HOUR = "1HOUR",
  ONE_DAY = "1DAY",
  ONE_WEEK = "1WEEK",
  ONE_MONTH = "1MONTH",
}

export enum MarketStatus {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  PRE_MARKET = "PRE_MARKET",
  AFTER_HOURS = "AFTER_HOURS",
}

export enum SentimentScore {
  VERY_BEARISH = "VERY_BEARISH",
  BEARISH = "BEARISH",
  NEUTRAL = "NEUTRAL",
  BULLISH = "BULLISH",
  VERY_BULLISH = "VERY_BULLISH",
}

// ============================================================================
// STOCK QUOTE INTERFACES
// ============================================================================

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  marketCap?: number;
  peRatio?: number;
  week52High: number;
  week52Low: number;
  timestamp: Date;
  marketStatus: MarketStatus;
}

// ============================================================================
// STOCK HISTORY INTERFACES (OHLCV)
// ============================================================================

export interface OHLCVData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
  vwap?: number;
}

export interface StockHistory {
  symbol: string;
  interval: TimeInterval;
  data: OHLCVData[];
  startDate: Date;
  endDate: Date;
}

// ============================================================================
// CRYPTOCURRENCY INTERFACES
// ============================================================================

export interface CryptoQuote {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply?: number;
  maxSupply?: number;
  high24h: number;
  low24h: number;
  allTimeHigh?: number;
  allTimeLow?: number;
  timestamp: Date;
}

// ============================================================================
// MARKET NEWS INTERFACES
// ============================================================================

export interface MarketNews {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  imageUrl?: string;
  publishedAt: Date;
  sentiment?: SentimentScore;
  symbols?: string[];
  categories?: string[];
}

// ============================================================================
// EARNINGS DATA INTERFACES
// ============================================================================

export interface EarningsData {
  symbol: string;
  fiscalDateEnding: Date;
  reportedDate: Date;
  reportedEPS: number;
  estimatedEPS: number;
  surprise: number;
  surprisePercent: number;
  reportedRevenue?: number;
  estimatedRevenue?: number;
}

export interface EarningsCalendar {
  symbol: string;
  companyName: string;
  earnings: EarningsData[];
}

// ============================================================================
// COMPANY PROFILE INTERFACES
// ============================================================================

export interface CompanyProfile {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  exchange: string;
  currency: string;
  country: string;
  marketCap: number;
  employees?: number;
  ceo?: string;
  website?: string;
  logoUrl?: string;
  ipoDate?: Date;
  fiscalYearEnd?: string;
}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

export interface MarketDataError {
  code: string;
  message: string;
  provider?: string;
  timestamp: Date;
  retryable: boolean;
}

export class MarketDataAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider: string,
    public retryable: boolean = true,
  ) {
    super(message);
    this.name = "MarketDataAPIError";
  }
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export const AssetTypeSchema = z.nativeEnum(AssetType);
export const TimeIntervalSchema = z.nativeEnum(TimeInterval);
export const MarketStatusSchema = z.nativeEnum(MarketStatus);
export const SentimentScoreSchema = z.nativeEnum(SentimentScore);

export const StockQuoteSchema = z.object({
  symbol: z.string().min(1).max(10),
  price: z.number().positive(),
  change: z.number(),
  changePercent: z.number(),
  volume: z.number().nonnegative(),
  avgVolume: z.number().nonnegative(),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  previousClose: z.number().positive(),
  marketCap: z.number().positive().optional(),
  peRatio: z.number().optional(),
  week52High: z.number().positive(),
  week52Low: z.number().positive(),
  timestamp: z.date(),
  marketStatus: MarketStatusSchema,
});

export const OHLCVDataSchema = z.object({
  timestamp: z.date(),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().nonnegative(),
  adjustedClose: z.number().positive().optional(),
  vwap: z.number().positive().optional(),
});

export const StockHistorySchema = z.object({
  symbol: z.string().min(1).max(10),
  interval: TimeIntervalSchema,
  data: z.array(OHLCVDataSchema),
  startDate: z.date(),
  endDate: z.date(),
});

export const CryptoQuoteSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  price: z.number().positive(),
  change24h: z.number(),
  changePercent24h: z.number(),
  marketCap: z.number().nonnegative(),
  volume24h: z.number().nonnegative(),
  circulatingSupply: z.number().nonnegative(),
  totalSupply: z.number().nonnegative().optional(),
  maxSupply: z.number().nonnegative().optional(),
  high24h: z.number().positive(),
  low24h: z.number().positive(),
  allTimeHigh: z.number().positive().optional(),
  allTimeLow: z.number().positive().optional(),
  timestamp: z.date(),
});

export const MarketNewsSchema = z.object({
  id: z.string(),
  headline: z.string().min(1),
  summary: z.string(),
  source: z.string().min(1),
  url: z.string().url(),
  imageUrl: z.string().url().optional(),
  publishedAt: z.date(),
  sentiment: SentimentScoreSchema.optional(),
  symbols: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
});

export const EarningsDataSchema = z.object({
  symbol: z.string().min(1).max(10),
  fiscalDateEnding: z.date(),
  reportedDate: z.date(),
  reportedEPS: z.number(),
  estimatedEPS: z.number(),
  surprise: z.number(),
  surprisePercent: z.number(),
  reportedRevenue: z.number().optional(),
  estimatedRevenue: z.number().optional(),
});

export const CompanyProfileSchema = z.object({
  symbol: z.string().min(1).max(10),
  name: z.string().min(1),
  description: z.string(),
  sector: z.string().min(1),
  industry: z.string().min(1),
  exchange: z.string().min(1),
  currency: z.string().length(3),
  country: z.string().min(2),
  marketCap: z.number().nonnegative(),
  employees: z.number().int().positive().optional(),
  ceo: z.string().optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  ipoDate: z.date().optional(),
  fiscalYearEnd: z.string().optional(),
});
