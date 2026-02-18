/**
 * Phase 6.4.4: Service Integration Tests
 * Tests for data flow between all services
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Skip integration tests when real Supabase credentials are not available (not jest test dummies)
const hasSupabaseCredentials =
  supabaseUrl.length > 0 &&
  !supabaseUrl.includes('localhost:54321') &&
  supabaseKey.length > 0 &&
  !supabaseKey.startsWith('test-');
const supabase = hasSupabaseCredentials ? createClient(supabaseUrl, supabaseKey) : (null as never);

// Test user data
let testUserId: string;
let testEmail: string;

const describeIfCredentials = hasSupabaseCredentials ? describe : describe.skip;

describeIfCredentials('Service Integration Tests', () => {
  beforeAll(async () => {
    // Create test user
    testEmail = `integration-test-${Date.now()}@example.com`;
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
    });

    if (error) throw error;
    testUserId = data.user?.id || '';
  });

  afterAll(async () => {
    // Cleanup: Delete test user data
    if (testUserId) {
      await supabase.from('chat_sessions').delete().eq('user_id', testUserId);
      await supabase.from('portfolios').delete().eq('user_id', testUserId);
      await supabase.from('budgets').delete().eq('user_id', testUserId);
    }
  });

  describe('Financial Context → Health Score Integration', () => {
    it('should calculate health score based on financial data', async () => {
      // Create financial data
      const budgetData = {
        user_id: testUserId,
        name: 'Monthly Budget',
        period: 'monthly',
        total_amount: 5000,
        categories: [
          { name: 'Housing', amount: 1500 },
          { name: 'Food', amount: 500 },
        ],
      };

      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .insert(budgetData)
        .select()
        .single();

      expect(budgetError).toBeNull();
      expect(budget).toBeDefined();

      // Trigger health score calculation
      const response = await fetch('/api/financial/health-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId }),
      });

      expect(response.ok).toBe(true);
      const healthScore = await response.json();

      // Verify score accuracy
      expect(healthScore.score).toBeGreaterThanOrEqual(0);
      expect(healthScore.score).toBeLessThanOrEqual(100);
      expect(healthScore.factors).toBeDefined();
      expect(healthScore.factors.budgetHealth).toBeDefined();
    });
  });

  describe('Budget → Insights Integration', () => {
    it('should generate insights based on budget data', async () => {
      // Create budget
      const budgetData = {
        user_id: testUserId,
        name: 'Test Budget',
        period: 'monthly',
        total_amount: 4000,
        categories: [
          { name: 'Housing', amount: 2000 }, // 50% - should trigger warning
          { name: 'Food', amount: 1000 },
          { name: 'Entertainment', amount: 1000 },
        ],
      };

      const { data: budget } = await supabase
        .from('budgets')
        .insert(budgetData)
        .select()
        .single();

      // Generate insights
      const response = await fetch('/api/ai/insights/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetId: budget.id }),
      });

      expect(response.ok).toBe(true);
      const insights = await response.json();

      // Verify insight relevance and accuracy
      expect(insights.insights).toBeDefined();
      expect(Array.isArray(insights.insights)).toBe(true);
      expect(insights.insights.length).toBeGreaterThan(0);

      // Should have insight about high housing percentage
      const housingInsight = insights.insights.find((i: any) => 
        i.category === 'Housing' || i.message.includes('housing')
      );
      expect(housingInsight).toBeDefined();
    });
  });

  describe('Portfolio → Signals Integration', () => {
    it('should generate trading signals based on portfolio holdings', async () => {
      // Create portfolio
      const portfolioData = {
        user_id: testUserId,
        name: 'Test Portfolio',
        description: 'Integration test portfolio',
      };

      const { data: portfolio } = await supabase
        .from('portfolios')
        .insert(portfolioData)
        .select()
        .single();

      // Add holdings
      const holdingsData = [
        {
          portfolio_id: portfolio.id,
          symbol: 'AAPL',
          shares: 10,
          cost_basis: 150,
        },
        {
          portfolio_id: portfolio.id,
          symbol: 'GOOGL',
          shares: 5,
          cost_basis: 2800,
        },
      ];

      await supabase.from('holdings').insert(holdingsData);

      // Generate trading signals
      const response = await fetch('/api/investments/signals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioId: portfolio.id }),
      });

      expect(response.ok).toBe(true);
      const signals = await response.json();

      // Verify signal logic
      expect(signals.signals).toBeDefined();
      expect(Array.isArray(signals.signals)).toBe(true);
      
      signals.signals.forEach((signal: any) => {
        expect(signal.symbol).toBeDefined();
        expect(['BUY', 'SELL', 'HOLD']).toContain(signal.action);
        expect(signal.confidence).toBeGreaterThanOrEqual(0);
        expect(signal.confidence).toBeLessThanOrEqual(1);
        expect(signal.reasoning).toBeDefined();
      });
    });
  });

  describe('Chat → Actions Integration', () => {
    it('should detect intent and execute actions correctly', async () => {
      // Create chat session
      const sessionData = {
        user_id: testUserId,
        title: 'Integration Test Session',
      };

      const { data: session } = await supabase
        .from('chat_sessions')
        .insert(sessionData)
        .select()
        .single();

      // Send message with clear intent
      const response = await fetch('/api/chat/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          message: 'Show me my portfolio performance',
          streaming: false,
        }),
      });

      expect(response.ok).toBe(true);
      const chatResponse = await response.json();

      // Verify intent detection
      expect(chatResponse.intent).toBeDefined();
      expect(chatResponse.intent.type).toBe('PORTFOLIO_ANALYSIS');

      // Verify action execution
      expect(chatResponse.metadata).toBeDefined();
      expect(chatResponse.metadata.suggestedActions).toBeDefined();

      // Verify data updates (if applicable)
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false });

      expect(messages).toBeDefined();
      expect(messages!.length).toBeGreaterThan(0);
    });

    it('should handle action execution errors gracefully', async () => {
      const { data: session } = await supabase
        .from('chat_sessions')
        .insert({ user_id: testUserId, title: 'Error Test' })
        .select()
        .single();

      // Send message that requires data that doesn't exist
      const response = await fetch('/api/chat/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          message: 'Analyze my portfolio for symbol XYZ123INVALID',
          streaming: false,
        }),
      });

      expect(response.ok).toBe(true);
      const chatResponse = await response.json();

      // Should return helpful error message, not crash
      expect(chatResponse.message).toBeDefined();
      expect(chatResponse.message.toLowerCase()).toContain('unable');
    });
  });

  describe('Data Flow Verification', () => {
    it('should ensure data flows correctly between all services', async () => {
      // Create comprehensive financial profile
      const budgetData = {
        user_id: testUserId,
        name: 'Complete Budget',
        period: 'monthly',
        total_amount: 5000,
      };

      const { data: budget } = await supabase
        .from('budgets')
        .insert(budgetData)
        .select()
        .single();

      const portfolioData = {
        user_id: testUserId,
        name: 'Complete Portfolio',
      };

      const { data: portfolio } = await supabase
        .from('portfolios')
        .insert(portfolioData)
        .select()
        .single();

      // Verify data is accessible across services
      const healthResponse = await fetch('/api/financial/health-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId }),
      });

      expect(healthResponse.ok).toBe(true);
      const healthData = await healthResponse.json();

      // Health score should incorporate both budget and portfolio data
      expect(healthData.factors.budgetHealth).toBeDefined();
      expect(healthData.factors.investmentHealth).toBeDefined();

      // Verify no data loss or corruption
      const { data: retrievedBudget } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budget.id)
        .single();

      expect(retrievedBudget).toEqual(expect.objectContaining({
        name: budgetData.name,
        period: budgetData.period,
        total_amount: budgetData.total_amount,
      }));
    });
  });

  describe('Performance Testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();

      // Create multiple concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) =>
        fetch('/api/financial/health-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: testUserId }),
        })
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });

      // Should complete within reasonable time (10 seconds for 10 requests)
      expect(duration).toBeLessThan(10000);

      // Average response time should be under 1 second
      const avgResponseTime = duration / requests.length;
      expect(avgResponseTime).toBeLessThan(1000);
    });

    it('should handle large data sets efficiently', async () => {
      // Create portfolio with many holdings
      const { data: portfolio } = await supabase
        .from('portfolios')
        .insert({ user_id: testUserId, name: 'Large Portfolio' })
        .select()
        .single();

      const holdings = Array.from({ length: 50 }, (_, i) => ({
        portfolio_id: portfolio.id,
        symbol: `STOCK${i}`,
        shares: 10,
        cost_basis: 100,
      }));

      await supabase.from('holdings').insert(holdings);

      const startTime = Date.now();

      // Fetch portfolio analytics
      const response = await fetch(`/api/investments/portfolios/${portfolio.id}/analytics`, {
        method: 'GET',
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.ok).toBe(true);

      // Should complete within 3 seconds even with 50 holdings
      expect(duration).toBeLessThan(3000);
    });
  });
});


