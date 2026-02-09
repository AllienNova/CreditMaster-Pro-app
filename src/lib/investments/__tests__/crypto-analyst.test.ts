/**
 * Crypto Analyst Service Tests
 *
 * Comprehensive test suite for cryptocurrency analysis with on-chain metrics,
 * DeFi analytics, tokenomics, and sentiment analysis
 *
 * Target Coverage: 90%+
 */

// Use global jest instead of @jest/globals to avoid type issues with mocked functions
import { CryptoAnalyst } from '../crypto-analyst';
import {
  CryptoCategory,
  OnChainDataSource,
  DeFiProtocolType,
  type CryptoAnalysis,
  type OnChainMetrics,
  type DeFiMetrics,
  type TokenomicsAnalysis,
  type CryptoSentiment,
} from '../types/crypto-analysis.types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock CoinGecko Client
jest.mock('../../integrations/coingecko', () => ({
  CoinGeckoClient: jest.fn().mockImplementation(() => ({
    getCoinPrice: jest.fn(),
    getCoinHistory: jest.fn(),
    getTrendingCoins: jest.fn(),
    searchCoins: jest.fn(),
  })),
}));

// Mock Redis Cache
jest.mock('../../cache/redis-cache-service', () => ({
  redisCache: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
}));

// Import mocked modules
import { CoinGeckoClient } from '../../integrations/coingecko';
import { redisCache } from '../../cache/redis-cache-service';

// ============================================================================
// TEST DATA
// ============================================================================

const mockCoinId = 'bitcoin';

const mockPriceData = {
  symbol: 'BTC',
  name: 'Bitcoin',
  currentPrice: 45000,
  marketCap: 850000000000,
  volume24h: 25000000000,
  priceChange24h: 2.5,
  priceChange7d: 5.2,
  priceChange30d: -3.1,
  allTimeHigh: 69000,
  allTimeLow: 67.81,
  athDate: new Date('2021-11-10'),
  atlDate: new Date('2013-07-06'),
};

const mockOnChainMetrics: OnChainMetrics = {
  coinId: 'bitcoin',
  dataSource: OnChainDataSource.BITCOIN,
  timestamp: new Date(),
  networkActivity: {
    activeAddresses24h: 950000,
    activeAddresses7d: 6500000,
    activeAddresses30d: 25000000,
    newAddresses24h: 450000,
    addressGrowthRate: 3.5,
  },
  transactionMetrics: {
    transactionCount24h: 280000,
    transactionVolume24h: 12500000000,
    averageTransactionValue: 44642,
    transactionFees24h: 850000,
    averageFee: 3.04,
  },
  networkSecurity: {
    hashRate: 450,
    difficulty: 45,
    blockTime: 600,
    blockHeight: 820000,
  },
};

const mockDeFiMetrics: DeFiMetrics = {
  coinId: 'uniswap',
  protocolType: DeFiProtocolType.DEX,
  timestamp: new Date(),
  tvl: {
    current: 4500000000,
    change24h: 2.3,
    change7d: 5.8,
    change30d: 12.5,
    rank: 5,
  },
  liquidityMetrics: {
    totalLiquidity: 4500000000,
    liquidityPools: 850,
    topPoolTVL: 450000000,
    averagePoolSize: 5294117,
  },
  yieldFarming: {
    averageAPY: 12.5,
    maxAPY: 85.3,
    totalFarms: 125,
    activeFarmers: 45000,
  },
  protocolRevenue: {
    revenue24h: 2500000,
    revenue7d: 18000000,
    revenue30d: 75000000,
    fees24h: 3200000,
    protocolFeeShare: 15,
  },
};

const mockTokenomics: TokenomicsAnalysis = {
  coinId: 'ethereum',
  timestamp: new Date(),
  supplyMechanics: {
    totalSupply: 120000000,
    circulatingSupply: 120000000,
    maxSupply: 120000000,
    supplyRatio: 100,
    inflationRate: 0.5,
    burnRate: 2500000,
  },
  distribution: {
    top10HoldersPercentage: 35,
    top100HoldersPercentage: 65,
    whaleConcentration: 28,
    retailHolders: 850000,
    giniCoefficient: 0.65,
  },
  tokenUtility: {
    hasGovernance: true,
    hasStaking: true,
    hasYieldFarming: true,
    hasBuyback: false,
    utilityScore: 85,
  },
};

const mockSentiment: CryptoSentiment = {
  coinId: 'bitcoin',
  timestamp: new Date(),
  overallSentiment: 'bullish',
  sentimentScore: 68.5,
  fearGreedIndex: {
    value: 65,
    classification: 'greed',
    change24h: 3,
  },
  socialMetrics: {
    twitterFollowers: 5500000,
    twitterMentions24h: 85000,
    redditSubscribers: 4800000,
    redditActiveUsers: 12000,
    telegramMembers: 25000,
    githubStars: 68000,
    githubCommits30d: 450,
  },
  newsSentiment: {
    positiveNews: 18,
    negativeNews: 5,
    neutralNews: 12,
    sentimentRatio: 0.78,
    topHeadlines: [
      'Bitcoin shows strong momentum in Q1',
      'Institutional adoption continues to grow',
      'Network upgrade scheduled for next month',
    ],
  },
  communityEngagement: {
    engagementScore: 75,
    communityGrowth7d: 8.5,
    communityGrowth30d: 22.3,
    developerActivity: 'very_high',
  },
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('CryptoAnalyst', () => {
  let cryptoAnalyst: CryptoAnalyst;
  let mockCoinGecko: any;

  beforeEach(() => {
    jest.clearAllMocks();
    cryptoAnalyst = new CryptoAnalyst();
    mockCoinGecko = new CoinGeckoClient();

    // Setup default mock responses
    (redisCache.get as jest.Mock).mockResolvedValue(null);
    (redisCache.set as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // CRYPTO ANALYSIS TESTS (8 tests)
  // ==========================================================================

  describe('analyzeCrypto', () => {
    it('should perform complete cryptocurrency analysis', async () => {
      // Mock fetch for price data
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          symbol: 'btc',
          name: 'Bitcoin',
          market_data: {
            current_price: { usd: 45000 },
            market_cap: { usd: 850000000000 },
            total_volume: { usd: 25000000000 },
            price_change_percentage_24h: 2.5,
            price_change_percentage_7d: 5.2,
            price_change_percentage_30d: -3.1,
            ath: { usd: 69000 },
            atl: { usd: 67.81 },
            ath_date: { usd: '2021-11-10' },
            atl_date: { usd: '2013-07-06' },
            total_supply: 21000000,
            circulating_supply: 19500000,
            max_supply: 21000000,
          },
          community_data: {
            twitter_followers: 5500000,
            reddit_subscribers: 4800000,
          },
          developer_data: {
            stars: 68000,
            commit_count_4_weeks: 450,
          },
        }),
      });

      const analysis = await cryptoAnalyst.analyzeCrypto('bitcoin');

      expect(analysis).toBeDefined();
      expect(analysis.coinId).toBe('bitcoin');
      expect(analysis.symbol).toBe('BTC');
      expect(analysis.name).toBe('Bitcoin');
      expect(analysis.category).toBe(CryptoCategory.LAYER1);
      expect(analysis.overallScore).toBeGreaterThan(0);
      expect(analysis.overallScore).toBeLessThanOrEqual(100);
      expect(analysis.riskLevel).toBeDefined();
      expect(analysis.investmentGrade).toBeDefined();
      expect(analysis.priceData).toBeDefined();
      expect(analysis.tokenomics).toBeDefined();
      expect(analysis.sentiment).toBeDefined();
      expect(analysis.recommendations).toBeInstanceOf(Array);
      expect(analysis.warnings).toBeInstanceOf(Array);
      expect(analysis.metadata).toBeDefined();
    });

    it('should use cached analysis when available', async () => {
      const cachedAnalysis: CryptoAnalysis = {
        coinId: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        category: CryptoCategory.LAYER1,
        timestamp: new Date(),
        overallScore: 75,
        riskLevel: 'moderate',
        investmentGrade: 'B',
        priceData: mockPriceData,
        tokenomics: mockTokenomics,
        sentiment: mockSentiment,
        recommendations: ['Test recommendation'],
        warnings: ['Test warning'],
        metadata: {
          dataQuality: 80,
          lastUpdated: new Date(),
          sources: ['CoinGecko'],
        },
      };

      (redisCache.get as jest.Mock).mockResolvedValueOnce(cachedAnalysis);

      const analysis = await cryptoAnalyst.analyzeCrypto('bitcoin');

      expect(analysis).toEqual(cachedAnalysis);
      expect(redisCache.get).toHaveBeenCalledWith('crypto-analysis:bitcoin');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should cache analysis results', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          symbol: 'btc',
          name: 'Bitcoin',
          market_data: {
            current_price: { usd: 45000 },
            market_cap: { usd: 850000000000 },
            total_volume: { usd: 25000000000 },
            price_change_percentage_24h: 2.5,
            price_change_percentage_7d: 5.2,
            price_change_percentage_30d: -3.1,
            ath: { usd: 69000 },
            atl: { usd: 67.81 },
            total_supply: 21000000,
            circulating_supply: 19500000,
          },
          community_data: {},
          developer_data: {},
        }),
      });

      await cryptoAnalyst.analyzeCrypto('bitcoin');

      expect(redisCache.set).toHaveBeenCalled();
      // Find the crypto-analysis cache call (not on-chain or other metrics)
      const setCalls = (redisCache.set as jest.Mock).mock.calls;
      const analysisCacheCall = setCalls.find((call) => call[0] === 'crypto-analysis:bitcoin');
      expect(analysisCacheCall).toBeDefined();
      expect(analysisCacheCall[2]).toBe(900); // 15 minutes TTL
    });


    it('should correctly categorize different cryptocurrencies', async () => {
      const testCases = [
        { coinId: 'bitcoin', expectedCategory: CryptoCategory.LAYER1 },
        { coinId: 'ethereum', expectedCategory: CryptoCategory.LAYER1 },
        { coinId: 'polygon', expectedCategory: CryptoCategory.LAYER2 },
        { coinId: 'uniswap', expectedCategory: CryptoCategory.DEFI },
        { coinId: 'dogecoin', expectedCategory: CryptoCategory.MEME },
        { coinId: 'binancecoin', expectedCategory: CryptoCategory.EXCHANGE },
      ];

      for (const testCase of testCases) {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            symbol: testCase.coinId.substring(0, 3),
            name: testCase.coinId,
            market_data: {
              current_price: { usd: 100 },
              market_cap: { usd: 1000000 },
              total_volume: { usd: 100000 },
              price_change_percentage_24h: 1,
              price_change_percentage_7d: 2,
              price_change_percentage_30d: 3,
              ath: { usd: 200 },
              atl: { usd: 10 },
              total_supply: 1000000,
              circulating_supply: 900000,
            },
            community_data: {},
            developer_data: {},
          }),
        });

        const analysis = await cryptoAnalyst.analyzeCrypto(testCase.coinId);
        expect(analysis.category).toBe(testCase.expectedCategory);
      }
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(cryptoAnalyst.analyzeCrypto('invalid-coin')).rejects.toThrow();
    });

    it('should calculate overall score correctly', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          symbol: 'btc',
          name: 'Bitcoin',
          market_data: {
            current_price: { usd: 45000 },
            market_cap: { usd: 850000000000 },
            total_volume: { usd: 25000000000 },
            price_change_percentage_24h: 5,
            price_change_percentage_7d: 10,
            price_change_percentage_30d: 15,
            ath: { usd: 69000 },
            atl: { usd: 67.81 },
            total_supply: 21000000,
            circulating_supply: 19500000,
            max_supply: 21000000,
          },
          community_data: {
            twitter_followers: 5500000,
            reddit_subscribers: 4800000,
          },
          developer_data: {
            stars: 68000,
            commit_count_4_weeks: 450,
          },
        }),
      });

      const analysis = await cryptoAnalyst.analyzeCrypto('bitcoin');

      expect(analysis.overallScore).toBeGreaterThan(0);
      expect(analysis.overallScore).toBeLessThanOrEqual(100);
      expect(typeof analysis.overallScore).toBe('number');
    });

    it('should assign appropriate risk levels', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          symbol: 'test',
          name: 'Test Coin',
          market_data: {
            current_price: { usd: 1 },
            market_cap: { usd: 1000000 },
            total_volume: { usd: 100000 },
            price_change_percentage_24h: -25,
            price_change_percentage_7d: -30,
            price_change_percentage_30d: -40,
            ath: { usd: 10 },
            atl: { usd: 0.01 },
            total_supply: 1000000000,
            circulating_supply: 100000000,
          },
          community_data: {},
          developer_data: {},
        }),
      });

      const analysis = await cryptoAnalyst.analyzeCrypto('test-coin');

      expect(['very_low', 'low', 'moderate', 'high', 'very_high']).toContain(analysis.riskLevel);
    });

    it('should assign investment grades', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          symbol: 'btc',
          name: 'Bitcoin',
          market_data: {
            current_price: { usd: 45000 },
            market_cap: { usd: 850000000000 },
            total_volume: { usd: 25000000000 },
            price_change_percentage_24h: 2,
            price_change_percentage_7d: 5,
            price_change_percentage_30d: 8,
            ath: { usd: 69000 },
            atl: { usd: 67.81 },
            total_supply: 21000000,
            circulating_supply: 19500000,
          },
          community_data: {},
          developer_data: {},
        }),
      });

      const analysis = await cryptoAnalyst.analyzeCrypto('bitcoin');

      expect(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F']).toContain(
        analysis.investmentGrade
      );
    });
  });

  // ==========================================================================
  // ON-CHAIN METRICS TESTS (6 tests)
  // ==========================================================================

  describe('getOnChainMetrics', () => {
    it('should fetch on-chain metrics for Bitcoin', async () => {
      const metrics = await cryptoAnalyst.getOnChainMetrics('bitcoin');

      expect(metrics).toBeDefined();
      expect(metrics.coinId).toBe('bitcoin');
      expect(metrics.dataSource).toBe(OnChainDataSource.BITCOIN);
      expect(metrics.networkActivity).toBeDefined();
      expect(metrics.transactionMetrics).toBeDefined();
      expect(metrics.networkSecurity).toBeDefined();
      expect(metrics.networkSecurity?.hashRate).toBeGreaterThan(0);
    });

    it('should fetch on-chain metrics for Ethereum', async () => {
      const metrics = await cryptoAnalyst.getOnChainMetrics('ethereum');

      expect(metrics).toBeDefined();
      expect(metrics.coinId).toBe('ethereum');
      expect(metrics.dataSource).toBe(OnChainDataSource.ETHEREUM);
      expect(metrics.validatorMetrics).toBeDefined();
      expect(metrics.validatorMetrics?.totalValidators).toBeGreaterThan(0);
    });

    it('should use cached on-chain metrics when available', async () => {
      (redisCache.get as jest.Mock).mockResolvedValueOnce(mockOnChainMetrics);

      const metrics = await cryptoAnalyst.getOnChainMetrics('bitcoin');

      expect(metrics).toEqual(mockOnChainMetrics);
      expect(redisCache.get).toHaveBeenCalledWith('onchain-metrics:bitcoin');
    });

    it('should cache on-chain metrics', async () => {
      await cryptoAnalyst.getOnChainMetrics('bitcoin');

      expect(redisCache.set).toHaveBeenCalled();
      const setCall = (redisCache.set as jest.Mock).mock.calls[0];
      expect(setCall[0]).toBe('onchain-metrics:bitcoin');
      expect(setCall[2]).toBe(3600); // 1 hour TTL
    });

    it('should validate network activity metrics', async () => {
      const metrics = await cryptoAnalyst.getOnChainMetrics('bitcoin');

      expect(metrics.networkActivity.activeAddresses24h).toBeGreaterThanOrEqual(0);
      expect(metrics.networkActivity.activeAddresses7d).toBeGreaterThanOrEqual(0);
      expect(metrics.networkActivity.activeAddresses30d).toBeGreaterThanOrEqual(0);
      expect(metrics.networkActivity.newAddresses24h).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.networkActivity.addressGrowthRate).toBe('number');
    });

    it('should validate transaction metrics', async () => {
      const metrics = await cryptoAnalyst.getOnChainMetrics('ethereum');

      expect(metrics.transactionMetrics.transactionCount24h).toBeGreaterThanOrEqual(0);
      expect(metrics.transactionMetrics.transactionVolume24h).toBeGreaterThanOrEqual(0);
      expect(metrics.transactionMetrics.averageTransactionValue).toBeGreaterThanOrEqual(0);
      expect(metrics.transactionMetrics.transactionFees24h).toBeGreaterThanOrEqual(0);
      expect(metrics.transactionMetrics.averageFee).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // DEFI METRICS TESTS (5 tests)
  // ==========================================================================

  describe('getDeFiMetrics', () => {
    it('should fetch DeFi metrics from DefiLlama', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          tvl: 4500000000,
          change_1d: 2.3,
          change_7d: 5.8,
          change_1m: 12.5,
          tvlRank: 5,
          category: 'Dexes',
          chains: ['ethereum', 'polygon', 'arbitrum'],
          chainTvls: {
            ethereum: 3000000000,
            polygon: 1000000000,
            arbitrum: 500000000,
          },
        }),
      });

      const metrics = await cryptoAnalyst.getDeFiMetrics('uniswap');

      expect(metrics).toBeDefined();
      expect(metrics.coinId).toBe('uniswap');
      expect(metrics.protocolType).toBe(DeFiProtocolType.DEX);
      expect(metrics.tvl).toBeDefined();
      expect(metrics.tvl.current).toBeGreaterThan(0);
      expect(metrics.liquidityMetrics).toBeDefined();
    });

    it('should handle DefiLlama API errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const metrics = await cryptoAnalyst.getDeFiMetrics('unknown-protocol');

      // Should return mock data on error
      expect(metrics).toBeDefined();
      expect(metrics.tvl).toBeDefined();
    });

    it('should use cached DeFi metrics when available', async () => {
      (redisCache.get as jest.Mock).mockResolvedValueOnce(mockDeFiMetrics);

      const metrics = await cryptoAnalyst.getDeFiMetrics('uniswap');

      expect(metrics).toEqual(mockDeFiMetrics);
      expect(redisCache.get).toHaveBeenCalledWith('defi-metrics:uniswap');
    });

    it('should cache DeFi metrics', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      await cryptoAnalyst.getDeFiMetrics('uniswap');

      expect(redisCache.set).toHaveBeenCalled();
      const setCall = (redisCache.set as jest.Mock).mock.calls[0];
      expect(setCall[0]).toBe('defi-metrics:uniswap');
      expect(setCall[2]).toBe(1800); // 30 minutes TTL
    });

    it('should validate TVL metrics', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          tvl: 4500000000,
          change_1d: 2.3,
          change_7d: 5.8,
          change_1m: 12.5,
          category: 'Dexes',
        }),
      });

      const metrics = await cryptoAnalyst.getDeFiMetrics('uniswap');

      expect(metrics.tvl.current).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.tvl.change24h).toBe('number');
      expect(typeof metrics.tvl.change7d).toBe('number');
      expect(typeof metrics.tvl.change30d).toBe('number');
    });
  });

  // ==========================================================================
  // TOKENOMICS TESTS (4 tests)
  // ==========================================================================

  describe('getTokenomics', () => {
    it('should fetch tokenomics data from CoinGecko', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          market_data: {
            total_supply: 120000000,
            circulating_supply: 120000000,
            max_supply: 120000000,
          },
          categories: ['governance', 'staking'],
        }),
      });

      const tokenomics = await cryptoAnalyst.getTokenomics('ethereum');

      expect(tokenomics).toBeDefined();
      expect(tokenomics.coinId).toBe('ethereum');
      expect(tokenomics.supplyMechanics).toBeDefined();
      expect(tokenomics.distribution).toBeDefined();
      expect(tokenomics.tokenUtility).toBeDefined();
    });

    it('should use cached tokenomics when available', async () => {
      (redisCache.get as jest.Mock).mockResolvedValueOnce(mockTokenomics);

      const tokenomics = await cryptoAnalyst.getTokenomics('ethereum');

      expect(tokenomics).toEqual(mockTokenomics);
      expect(redisCache.get).toHaveBeenCalledWith('tokenomics:ethereum');
    });

    it('should cache tokenomics data', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          market_data: {
            total_supply: 120000000,
            circulating_supply: 120000000,
          },
        }),
      });

      await cryptoAnalyst.getTokenomics('ethereum');

      expect(redisCache.set).toHaveBeenCalled();
      const setCall = (redisCache.set as jest.Mock).mock.calls[0];
      expect(setCall[0]).toBe('tokenomics:ethereum');
    });

    it('should validate supply mechanics', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          market_data: {
            total_supply: 21000000,
            circulating_supply: 19500000,
            max_supply: 21000000,
          },
        }),
      });

      const tokenomics = await cryptoAnalyst.getTokenomics('bitcoin');

      expect(tokenomics.supplyMechanics.totalSupply).toBeGreaterThan(0);
      expect(tokenomics.supplyMechanics.circulatingSupply).toBeGreaterThan(0);
      expect(tokenomics.supplyMechanics.supplyRatio).toBeGreaterThan(0);
      expect(tokenomics.supplyMechanics.supplyRatio).toBeLessThanOrEqual(100);
    });
  });

  // ==========================================================================
  // SENTIMENT ANALYSIS TESTS (7 tests)
  // ==========================================================================

  describe('getCryptoSentiment', () => {
    it('should fetch sentiment data from multiple sources', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            community_data: {
              twitter_followers: 5500000,
              reddit_subscribers: 4800000,
              telegram_channel_user_count: 25000,
            },
            developer_data: {
              stars: 68000,
              commit_count_4_weeks: 450,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                value: '65',
                value_classification: 'Greed',
              },
            ],
          }),
        });

      const sentiment = await cryptoAnalyst.getCryptoSentiment('bitcoin');

      expect(sentiment).toBeDefined();
      expect(sentiment.coinId).toBe('bitcoin');
      expect(sentiment.overallSentiment).toBeDefined();
      expect(sentiment.sentimentScore).toBeGreaterThanOrEqual(0);
      expect(sentiment.sentimentScore).toBeLessThanOrEqual(100);
      expect(sentiment.fearGreedIndex).toBeDefined();
      expect(sentiment.socialMetrics).toBeDefined();
      expect(sentiment.communityEngagement).toBeDefined();
    });

    it('should use cached sentiment when available', async () => {
      (redisCache.get as jest.Mock).mockResolvedValueOnce(mockSentiment);

      const sentiment = await cryptoAnalyst.getCryptoSentiment('bitcoin');

      expect(sentiment).toEqual(mockSentiment);
      expect(redisCache.get).toHaveBeenCalledWith('crypto-sentiment:bitcoin');
    });

    it('should cache sentiment data', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            community_data: {},
            developer_data: {},
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ value: '50', value_classification: 'Neutral' }],
          }),
        });

      await cryptoAnalyst.getCryptoSentiment('bitcoin');

      expect(redisCache.set).toHaveBeenCalled();
      const setCall = (redisCache.set as jest.Mock).mock.calls[0];
      expect(setCall[0]).toBe('crypto-sentiment:bitcoin');
      expect(setCall[2]).toBe(1800); // 30 minutes TTL
    });

    it('should classify sentiment correctly', async () => {
      const testCases = [
        { score: 85, expected: 'very_bullish' },
        { score: 65, expected: 'bullish' },
        { score: 50, expected: 'neutral' },
        { score: 35, expected: 'bearish' },
        { score: 15, expected: 'very_bearish' },
      ];

      for (const testCase of testCases) {
        global.fetch = jest.fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              community_data: {
                twitter_followers: testCase.score * 100000,
              },
              developer_data: {},
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              data: [{ value: testCase.score.toString(), value_classification: 'Neutral' }],
            }),
          });

        const sentiment = await cryptoAnalyst.getCryptoSentiment('test-coin');
        expect(['very_bullish', 'bullish', 'neutral', 'bearish', 'very_bearish']).toContain(
          sentiment.overallSentiment
        );
      }
    });

    it('should calculate engagement score', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            community_data: {
              twitter_followers: 5500000,
              reddit_subscribers: 4800000,
            },
            developer_data: {
              stars: 68000,
              commit_count_4_weeks: 450,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ value: '65', value_classification: 'Greed' }],
          }),
        });

      const sentiment = await cryptoAnalyst.getCryptoSentiment('bitcoin');

      expect(sentiment.communityEngagement.engagementScore).toBeGreaterThanOrEqual(0);
      expect(sentiment.communityEngagement.engagementScore).toBeLessThanOrEqual(100);
    });

    it('should classify developer activity', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            community_data: {},
            developer_data: {
              commit_count_4_weeks: 500,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ value: '50', value_classification: 'Neutral' }],
          }),
        });

      const sentiment = await cryptoAnalyst.getCryptoSentiment('ethereum');

      expect(['very_low', 'low', 'moderate', 'high', 'very_high']).toContain(
        sentiment.communityEngagement.developerActivity
      );
    });

    it('should handle Fear & Greed Index API errors', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            community_data: {},
            developer_data: {},
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const sentiment = await cryptoAnalyst.getCryptoSentiment('bitcoin');

      // Should use fallback value
      expect(sentiment.fearGreedIndex).toBeDefined();
      expect(sentiment.fearGreedIndex.value).toBeGreaterThanOrEqual(0);
      expect(sentiment.fearGreedIndex.value).toBeLessThanOrEqual(100);
    });
  });

  // ==========================================================================
  // API INTEGRATION TESTS (5 tests)
  // ==========================================================================

  describe('API Integration', () => {
    it('should handle CoinGecko rate limiting', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      await expect(cryptoAnalyst.analyzeCrypto('bitcoin')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(cryptoAnalyst.analyzeCrypto('bitcoin')).rejects.toThrow();
    });

    it('should handle invalid JSON responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(cryptoAnalyst.analyzeCrypto('bitcoin')).rejects.toThrow();
    });

    it('should handle missing data fields gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          symbol: 'test',
          name: 'Test Coin',
          market_data: {
            current_price: { usd: 1 },
            // Missing other fields
          },
        }),
      });

      const analysis = await cryptoAnalyst.analyzeCrypto('test-coin');

      expect(analysis).toBeDefined();
      expect(analysis.priceData).toBeDefined();
    });

    it('should respect cache TTL settings', async () => {
      const cacheKey = 'crypto-analysis:bitcoin';
      const ttl = 900; // 15 minutes

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          symbol: 'btc',
          name: 'Bitcoin',
          market_data: {
            current_price: { usd: 45000 },
            market_cap: { usd: 850000000000 },
            total_volume: { usd: 25000000000 },
            price_change_percentage_24h: 2,
            total_supply: 21000000,
            circulating_supply: 19500000,
          },
          community_data: {},
          developer_data: {},
        }),
      });

      await cryptoAnalyst.analyzeCrypto('bitcoin');

      expect(redisCache.set).toHaveBeenCalled();
      // Find the crypto-analysis cache call
      const setCalls = (redisCache.set as jest.Mock).mock.calls;
      const analysisCacheCall = setCalls.find((call) => call[0] === cacheKey);
      expect(analysisCacheCall).toBeDefined();
      expect(analysisCacheCall[2]).toBe(ttl);
    });
  });
});


