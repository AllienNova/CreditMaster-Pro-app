/**
 * Bill Negotiator Service
 *
 * AI-powered bill negotiation assistant that identifies negotiable bills,
 * analyzes market rates, generates personalized negotiation scripts,
 * and tracks outcomes to help users reduce monthly expenses.
 *
 * Phase 2.4: Bill Negotiation Assistant
 */

import { getSupabase } from '@/lib/supabase/client';
import { getAIMLService, type AIMLService } from '@/lib/aiml-service';
import type {
  NegotiableBill,
  BillType,
  MarketAnalysis,
  NegotiationScript,
  NegotiationOutcomeData,
  NegotiationHistory,
  SavingsEstimate,
  UserProfile,
  CompetitorRate,
  LeveragePoint,
  NegotiationPoint,
  Counterargument,
  FallbackOption,
  NegotiationDifficulty,
} from './types/bill-negotiation.types';

interface Transaction {
  id: string;
  user_id: string;
  date: Date;
  amount: number;
  merchant_name: string;
  category: string;
  subcategory?: string;
  is_recurring: boolean;
}

interface BillNegotiationOutcomeRow {
  bill_id: string;
  user_id: string;
  negotiation_date: string;
  success: boolean;
  savings_achieved: number;
  new_monthly_rate?: number;
  previous_monthly_rate: number;
  method: string;
  duration?: number;
  representative?: string;
  notes?: string;
  requires_followup?: boolean;
  followup_date?: string;
  followup_reason?: string;
  recorded_at: string;
}

/**
 * Bill Negotiator Service
 * Singleton service for bill negotiation assistance
 */
export class BillNegotiator {
  private static instance: BillNegotiator;
  private aimlService: AIMLService;
  private marketDataCache: Map<string, { data: MarketAnalysis; expiresAt: Date }>;
  private scriptCache: Map<string, { script: NegotiationScript; expiresAt: Date }>;

  private constructor() {
    this.aimlService = getAIMLService();
    this.marketDataCache = new Map();
    this.scriptCache = new Map();
  }

  public static getInstance(): BillNegotiator {
    if (!BillNegotiator.instance) {
      BillNegotiator.instance = new BillNegotiator();
    }
    return BillNegotiator.instance;
  }

  /**
   * Identify negotiable bills from user's transaction history
   */
  public async identifyNegotiableBills(userId: string): Promise<NegotiableBill[]> {
    const transactions = await this.fetchRecurringTransactions(userId);
    const negotiableBills: NegotiableBill[] = [];

    // Group transactions by merchant
    const merchantGroups = this.groupByMerchant(transactions);

    for (const [merchant, txns] of merchantGroups.entries()) {
      const billType = this.categorizeBillType(txns[0].category, merchant);

      // Only include negotiable bill types
      if (!this.isNegotiable(billType)) continue;

      const avgAmount = txns.reduce((sum, t) => sum + t.amount, 0) / txns.length;
      const negotiationPotential = await this.calculateNegotiationPotential(
        billType,
        merchant,
        avgAmount
      );

      if (negotiationPotential > 30) { // Only include bills with >30% potential
        negotiableBills.push({
          id: `bill-${merchant.toLowerCase().replace(/\s+/g, '-')}-${userId}`,
          userId,
          billType,
          provider: merchant,
          serviceName: this.inferServiceName(billType, merchant),
          currentAmount: avgAmount,
          billingFrequency: 'monthly',
          isUnderContract: false, // Would need additional data to determine
          negotiationPotential,
          estimatedSavings: avgAmount * (negotiationPotential / 100) * 0.7, // Conservative estimate
          difficulty: this.assessDifficulty(billType, negotiationPotential),
          status: 'not_started',
          negotiationCount: 0,
          totalSavingsAchieved: 0,
          detectedAt: new Date(),
          lastUpdated: new Date(),
        });
      }
    }

    // Sort by estimated savings (highest first)
    return negotiableBills.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
  }

  /**
   * Analyze market rates for a specific bill type and provider
   */
  public async analyzeMarketRates(
    billType: BillType,
    provider: string,
    location?: string
  ): Promise<MarketAnalysis> {
    // Check cache first (7-day cache)
    const cacheKey = `${billType}-${provider}-${location || 'default'}`;
    const cached = this.marketDataCache.get(cacheKey);

    if (cached && cached.expiresAt > new Date()) {
      return cached.data;
    }

    // Fetch market data (in production, this would call real APIs)
    const competitorRates = await this.fetchCompetitorRates(billType, provider, location);
    const averageMarketRate = this.calculateAverageRate(competitorRates);
    const userCurrentRate = await this.getUserCurrentRate(provider, billType);

    const savingsPotential = Math.max(0, userCurrentRate - averageMarketRate);
    const savingsPercentage = (savingsPotential / userCurrentRate) * 100;

    const marketPosition = this.determineMarketPosition(userCurrentRate, averageMarketRate);
    const leveragePoints = this.identifyLeveragePoints(
      billType,
      provider,
      userCurrentRate,
      competitorRates
    );

    const analysis: MarketAnalysis = {
      billType,
      provider,
      location,
      averageMarketRate,
      competitorRates,
      userCurrentRate,
      savingsPotential,
      savingsPercentage,
      marketPosition,
      leveragePoints,
      competitiveAdvantages: this.extractCompetitiveAdvantages(competitorRates),
      recommendedAction: this.determineRecommendedAction(savingsPercentage, marketPosition),
      confidenceScore: this.calculateConfidenceScore(competitorRates.length, billType),
      dataSource: 'market_research',
      lastUpdated: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    // Cache the result
    this.marketDataCache.set(cacheKey, { data: analysis, expiresAt: analysis.expiresAt });

    return analysis;
  }

  /**
   * Generate personalized negotiation script using AI
   */
  public async generateNegotiationScript(
    bill: NegotiableBill,
    userProfile?: UserProfile
  ): Promise<NegotiationScript> {
    // Check cache first (24-hour cache)
    const cacheKey = `script-${bill.id}`;
    const cached = this.scriptCache.get(cacheKey);

    if (cached && cached.expiresAt > new Date()) {
      return cached.script;
    }

    // Get market analysis for leverage points
    const marketAnalysis = await this.analyzeMarketRates(bill.billType, bill.provider);

    // Build user profile
    const profile = userProfile || await this.buildUserProfile(bill.userId, bill.provider);

    // Generate script using AI
    const prompt = this.buildScriptPrompt(bill, marketAnalysis, profile);

    let aiResponse: string;
    try {
      const response = await this.aimlService.chat(
        'anthropic/claude-4.5-sonnet',
        [{ role: 'user', content: prompt }],
        {
          max_tokens: 2000,
          temperature: 0.7,
        }
      );
      aiResponse = response.choices[0]?.message?.content || '';
    } catch (_error) {
      // BillNegotiator error: AI script generation failed, using template
      aiResponse = this.generateTemplateScript(bill, marketAnalysis, profile);
    }

    // Parse AI response into structured script
    const script = this.parseScriptResponse(aiResponse, bill, profile);

    // Cache the result
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    this.scriptCache.set(cacheKey, { script, expiresAt });

    return script;
  }

  /**
   * Track negotiation outcome and update bill status
   */
  public async trackNegotiationOutcome(
    billId: string,
    outcome: NegotiationOutcomeData
  ): Promise<void> {
    const supabase = getSupabase();

    // Store outcome in database
    const { error } = await (supabase.from('bill_negotiation_outcomes') as any).insert([{
      bill_id: billId,
      user_id: outcome.userId,
      negotiation_date: outcome.negotiationDate,
      success: outcome.success,
      savings_achieved: outcome.savingsAchieved,
      new_monthly_rate: outcome.newMonthlyRate,
      previous_monthly_rate: outcome.previousMonthlyRate,
      method: outcome.method,
      duration: outcome.duration,
      representative: outcome.representative,
      notes: outcome.notes,
      requires_followup: outcome.requiresFollowup,
      followup_date: outcome.followupDate,
      followup_reason: outcome.followupReason,
      recorded_at: outcome.recordedAt,
    }]);

    if (error) {
      // BillNegotiator error: Error tracking negotiation outcome
      throw new Error('Failed to track negotiation outcome');
    }

    // Clear caches for this bill
    this.scriptCache.delete(`script-${billId}`);
  }

  /**
   * Get negotiation history for a user
   */
  public async getBillNegotiationHistory(userId: string): Promise<NegotiationHistory[]> {
    const supabase = getSupabase();

    const { data: outcomes, error } = await supabase
      .from('bill_negotiation_outcomes')
      .select('*')
      .eq('user_id', userId)
      .order('negotiation_date', { ascending: false })
      .returns<BillNegotiationOutcomeRow[]>();

    if (error) {
      // BillNegotiator error: Error fetching negotiation history
      return [];
    }

    // Group by bill
    const billGroups = new Map<string, any[]>();
    for (const outcome of outcomes || []) {
      const billId = outcome.bill_id;
      if (!billGroups.has(billId)) {
        billGroups.set(billId, []);
      }
      billGroups.get(billId)!.push(outcome);
    }

    // Build history objects
    const history: NegotiationHistory[] = [];
    for (const [billId, attempts] of billGroups.entries()) {
      const totalSavings = attempts.reduce((sum, a) => sum + (a.savings_achieved || 0), 0);
      const successCount = attempts.filter(a => a.success).length;
      const successRate = (successCount / attempts.length) * 100;

      history.push({
        billId,
        provider: attempts[0].provider || 'Unknown',
        billType: attempts[0].bill_type || 'subscription',
        attempts: attempts.map(a => ({
          id: a.id,
          date: new Date(a.negotiation_date),
          method: a.method,
          contactName: a.representative,
          outcome: a.success ? 'success' : 'rejected',
          offeredAmount: a.new_monthly_rate,
          notes: a.notes,
          followUpDate: a.followup_date ? new Date(a.followup_date) : undefined,
        })),
        totalSavings,
        successRate,
        lastAttemptDate: new Date(attempts[0].negotiation_date),
      });
    }

    return history;
  }

  /**
   * Calculate potential savings from all negotiable bills
   */
  public async calculatePotentialSavings(userId: string): Promise<SavingsEstimate> {
    const negotiableBills = await this.identifyNegotiableBills(userId);

    const totalPotentialSavings = negotiableBills.reduce(
      (sum, bill) => sum + bill.estimatedSavings,
      0
    );

    const monthlyPotentialSavings = totalPotentialSavings;
    const annualPotentialSavings = monthlyPotentialSavings * 12;

    // Get top 5 bills with highest savings potential
    const highPotentialBills = negotiableBills.slice(0, 5);

    // Calculate confidence based on number of bills and data quality
    const confidenceScore = Math.min(
      95,
      50 + (negotiableBills.length * 5) + (highPotentialBills.length * 5)
    );

    return {
      userId,
      totalPotentialSavings,
      monthlyPotentialSavings,
      annualPotentialSavings,
      billCount: negotiableBills.length,
      highPotentialBills,
      confidenceScore,
      generatedAt: new Date(),
    };
  }


  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Fetch recurring transactions for a user
   */
  private async fetchRecurringTransactions(userId: string): Promise<Transaction[]> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_recurring', true)
      .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
      .order('date', { ascending: false })
      .returns<Array<Omit<Transaction, 'date'> & { date: string }>>();

    if (error) {
      // BillNegotiator error: Error fetching transactions
      return [];
    }

    return (data || []).map(t => ({
      ...t,
      date: new Date(t.date),
    }));
  }

  /**
   * Group transactions by merchant
   */
  private groupByMerchant(transactions: Transaction[]): Map<string, Transaction[]> {
    const groups = new Map<string, Transaction[]>();

    for (const txn of transactions) {
      const merchant = txn.merchant_name;
      if (!groups.has(merchant)) {
        groups.set(merchant, []);
      }
      groups.get(merchant)!.push(txn);
    }

    return groups;
  }

  /**
   * Categorize bill type from transaction category and merchant
   */
  private categorizeBillType(category: string, merchant: string): BillType {
    const merchantLower = merchant.toLowerCase();
    const categoryLower = category.toLowerCase();

    // Telecom providers
    if (merchantLower.includes('verizon') || merchantLower.includes('at&t') ||
        merchantLower.includes('t-mobile') || merchantLower.includes('sprint')) {
      return 'mobile';
    }

    if (merchantLower.includes('comcast') || merchantLower.includes('xfinity') ||
        merchantLower.includes('spectrum') || merchantLower.includes('cox')) {
      return 'internet';
    }

    // Utilities
    if (categoryLower.includes('utilities') || merchantLower.includes('electric') ||
        merchantLower.includes('power')) {
      return 'electricity';
    }

    if (merchantLower.includes('gas')) {
      return 'gas';
    }

    if (merchantLower.includes('water')) {
      return 'water';
    }

    // Insurance
    if (categoryLower.includes('insurance')) {
      if (merchantLower.includes('auto') || merchantLower.includes('car')) {
        return 'auto_insurance';
      }
      return 'home_insurance';
    }

    // Streaming
    if (merchantLower.includes('netflix') || merchantLower.includes('hulu') ||
        merchantLower.includes('disney') || merchantLower.includes('spotify')) {
      return 'streaming';
    }

    // Default
    return 'subscription';
  }

  /**
   * Check if bill type is negotiable
   */
  private isNegotiable(billType: BillType): boolean {
    const negotiableTypes: BillType[] = [
      'telecom', 'internet', 'cable', 'mobile',
      'auto_insurance', 'home_insurance',
      'subscription', 'streaming'
    ];
    return negotiableTypes.includes(billType);
  }

  /**
   * Calculate negotiation potential score (0-100)
   */
  private async calculateNegotiationPotential(
    billType: BillType,
    merchant: string,
    currentAmount: number
  ): Promise<number> {
    // Base scores by bill type
    const baseScores: Record<string, number> = {
      'cable': 85,
      'internet': 80,
      'mobile': 75,
      'telecom': 75,
      'auto_insurance': 70,
      'home_insurance': 70,
      'subscription': 60,
      'streaming': 50,
      'utilities': 40,
    };

    let score = baseScores[billType] || 50;

    // Adjust based on amount (higher bills = more negotiation potential)
    if (currentAmount > 100) score += 10;
    if (currentAmount > 200) score += 5;

    // Provider-specific adjustments
    const merchantLower = merchant.toLowerCase();
    if (merchantLower.includes('comcast') || merchantLower.includes('xfinity')) {
      score += 10; // Known for negotiating
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Infer service name from bill type and merchant
   */
  private inferServiceName(billType: BillType, merchant: string): string {
    const typeNames: Record<string, string> = {
      'mobile': 'Mobile Phone Service',
      'internet': 'Internet Service',
      'cable': 'Cable TV Service',
      'electricity': 'Electric Service',
      'gas': 'Gas Service',
      'water': 'Water Service',
      'auto_insurance': 'Auto Insurance',
      'home_insurance': 'Home Insurance',
      'streaming': 'Streaming Service',
      'subscription': 'Subscription Service',
    };

    return `${merchant} ${typeNames[billType] || 'Service'}`;
  }

  /**
   * Assess negotiation difficulty
   */
  private assessDifficulty(billType: BillType, potential: number): NegotiationDifficulty {
    if (potential >= 70) return 'easy';
    if (potential >= 50) return 'moderate';
    return 'difficult';
  }


  /**
   * Fetch competitor rates (mock data for now)
   */
  private async fetchCompetitorRates(
    billType: BillType,
    provider: string,
    location?: string
  ): Promise<CompetitorRate[]> {
    // In production, this would call real market data APIs
    // For now, return mock data based on bill type
    const mockRates: Record<string, CompetitorRate[]> = {
      'internet': [
        {
          provider: 'Spectrum',
          rate: 49.99,
          features: ['300 Mbps', 'No data caps', 'Free modem'],
          promotionalRate: 39.99,
          promotionalPeriod: '12 months',
        },
        {
          provider: 'Xfinity',
          rate: 59.99,
          features: ['200 Mbps', 'Unlimited data', 'Free installation'],
          promotionalRate: 44.99,
          promotionalPeriod: '12 months',
        },
      ],
      'mobile': [
        {
          provider: 'T-Mobile',
          rate: 70.00,
          features: ['Unlimited data', '5G included', 'Netflix on Us'],
        },
        {
          provider: 'Verizon',
          rate: 80.00,
          features: ['Unlimited premium data', '5G Ultra Wideband', 'Disney+ included'],
        },
      ],
    };

    return mockRates[billType] || [];
  }

  /**
   * Calculate average rate from competitor rates
   */
  private calculateAverageRate(rates: CompetitorRate[]): number {
    if (rates.length === 0) return 0;
    const sum = rates.reduce((acc, r) => acc + r.rate, 0);
    return sum / rates.length;
  }

  /**
   * Get user's current rate for a provider
   */
  private async getUserCurrentRate(provider: string, billType: BillType): Promise<number> {
    // In production, fetch from user's bill data
    // For now, return a mock value slightly above market average
    const mockRates: Record<string, number> = {
      'internet': 79.99,
      'mobile': 85.00,
      'cable': 120.00,
      'streaming': 15.99,
    };
    return mockRates[billType] || 50.00;
  }

  /**
   * Determine market position
   */
  private determineMarketPosition(
    userRate: number,
    avgRate: number
  ): 'below_average' | 'average' | 'above_average' | 'significantly_above' {
    const diff = ((userRate - avgRate) / avgRate) * 100;

    if (diff < -10) return 'below_average';
    if (diff <= 10) return 'average';
    if (diff <= 30) return 'above_average';
    return 'significantly_above';
  }

  /**
   * Identify leverage points for negotiation
   */
  private identifyLeveragePoints(
    billType: BillType,
    provider: string,
    userRate: number,
    competitorRates: CompetitorRate[]
  ): LeveragePoint[] {
    const points: LeveragePoint[] = [];

    // Competitor pricing leverage
    const lowerRates = competitorRates.filter(r => r.rate < userRate);
    if (lowerRates.length > 0) {
      const lowestRate = Math.min(...lowerRates.map(r => r.rate));
      points.push({
        type: 'competitor_pricing',
        description: `Competitors offering similar service for $${lowestRate}/month`,
        strength: 'strong',
        talkingPoint: `I've seen ${lowerRates[0].provider} offering similar service for $${lowestRate}/month. Can you match that?`,
      });
    }

    // Loyalty leverage (assume 2+ years for mock)
    points.push({
      type: 'loyalty',
      description: 'Long-term customer with good payment history',
      strength: 'moderate',
      talkingPoint: "I've been a loyal customer for over 2 years with perfect payment history. What can you do to reward my loyalty?",
    });

    // Market rate leverage
    const avgRate = this.calculateAverageRate(competitorRates);
    if (userRate > avgRate * 1.1) {
      points.push({
        type: 'market_rate',
        description: `Current rate is ${((userRate - avgRate) / avgRate * 100).toFixed(0)}% above market average`,
        strength: 'strong',
        talkingPoint: `The market average for this service is $${avgRate.toFixed(2)}, but I'm paying $${userRate.toFixed(2)}. Can we adjust to market rates?`,
      });
    }

    return points;
  }

  /**
   * Extract competitive advantages from competitor rates
   */
  private extractCompetitiveAdvantages(rates: CompetitorRate[]): string[] {
    const advantages: string[] = [];

    for (const rate of rates) {
      if (rate.promotionalRate) {
        advantages.push(`${rate.provider} offers promotional rate of $${rate.promotionalRate}/month`);
      }
      if (rate.features.length > 0) {
        advantages.push(`${rate.provider} includes: ${rate.features.join(', ')}`);
      }
    }

    return advantages.slice(0, 5); // Top 5 advantages
  }

  /**
   * Determine recommended action
   */
  private determineRecommendedAction(
    savingsPercentage: number,
    marketPosition: string
  ): 'negotiate' | 'switch' | 'stay' | 'research_more' {
    if (savingsPercentage > 20 && marketPosition === 'significantly_above') {
      return 'switch';
    }
    if (savingsPercentage > 10) {
      return 'negotiate';
    }
    if (savingsPercentage < 5) {
      return 'stay';
    }
    return 'research_more';
  }

  /**
   * Calculate confidence score for market analysis
   */
  private calculateConfidenceScore(competitorCount: number, billType: BillType): number {
    let score = 50;

    // More competitors = higher confidence
    score += competitorCount * 10;

    // Well-known bill types = higher confidence
    const highConfidenceTypes: BillType[] = ['internet', 'mobile', 'cable', 'streaming'];
    if (highConfidenceTypes.includes(billType)) {
      score += 20;
    }

    return Math.min(95, score);
  }


  /**
   * Build user profile for negotiation
   */
  private async buildUserProfile(userId: string, provider: string): Promise<UserProfile> {
    // In production, fetch real user data
    return {
      userId,
      tenure: 24, // months
      paymentHistory: 'excellent',
      loyaltyScore: 85,
      previousNegotiations: 0,
      successRate: 0,
    };
  }

  /**
   * Build prompt for AI script generation
   */
  private buildScriptPrompt(
    bill: NegotiableBill,
    marketAnalysis: MarketAnalysis,
    profile: UserProfile
  ): string {
    return `Generate a personalized bill negotiation script for the following scenario:

Bill Details:
- Provider: ${bill.provider}
- Service: ${bill.serviceName}
- Current Monthly Rate: $${bill.currentAmount}
- Bill Type: ${bill.billType}

Market Analysis:
- Average Market Rate: $${marketAnalysis.averageMarketRate}
- Potential Savings: $${marketAnalysis.savingsPotential}/month
- Market Position: ${marketAnalysis.marketPosition}
- Recommended Action: ${marketAnalysis.recommendedAction}

Customer Profile:
- Tenure: ${profile.tenure} months
- Payment History: ${profile.paymentHistory}
- Loyalty Score: ${profile.loyaltyScore}/100

Leverage Points:
${marketAnalysis.leveragePoints.map(lp => `- ${lp.description} (${lp.strength})`).join('\n')}

Competitive Advantages:
${marketAnalysis.competitiveAdvantages.map(ca => `- ${ca}`).join('\n')}

Please provide:
1. Opening statement (friendly but assertive)
2. 3-5 main negotiation points with supporting data
3. 2-3 common objections and how to counter them
4. 2-3 fallback options if initial request is denied
5. Closing statement

Format the response as JSON with the following structure:
{
  "opening": "...",
  "mainPoints": [{"point": "...", "supportingData": "...", "priority": "high|medium|low"}],
  "counterarguments": [{"objection": "...", "response": "..."}],
  "fallbackOptions": [{"option": "...", "description": "...", "estimatedSavings": number}],
  "closing": "...",
  "strategy": "aggressive|balanced|conservative"
}`;
  }

  /**
   * Generate template script (fallback when AI fails)
   */
  private generateTemplateScript(
    bill: NegotiableBill,
    marketAnalysis: MarketAnalysis,
    profile: UserProfile
  ): string {
    const targetSavings = marketAnalysis.savingsPotential * 0.7; // Conservative target

    return JSON.stringify({
      opening: `Hi, I'm calling about my ${bill.serviceName} account. I've been a loyal customer for ${profile.tenure} months with excellent payment history, and I'd like to discuss my current rate of $${bill.currentAmount}/month.`,
      mainPoints: [
        {
          point: `I've researched current market rates and found that the average is $${marketAnalysis.averageMarketRate}/month`,
          supportingData: `Competitors like ${marketAnalysis.competitorRates[0]?.provider || 'others'} are offering similar service for less`,
          priority: 'high',
        },
        {
          point: `As a loyal customer with ${profile.tenure} months of perfect payment history, I'd like to see what retention offers are available`,
          supportingData: `My loyalty score is ${profile.loyaltyScore}/100`,
          priority: 'high',
        },
        {
          point: `I'm currently paying ${marketAnalysis.savingsPercentage.toFixed(0)}% above market average`,
          supportingData: `This represents $${marketAnalysis.savingsPotential.toFixed(2)}/month in potential savings`,
          priority: 'medium',
        },
      ],
      counterarguments: [
        {
          objection: "That's our standard rate for this service level",
          response: `I understand, but I've seen promotional rates and competitor offers that are significantly lower. What retention offers do you have available for loyal customers?`,
        },
        {
          objection: "We can't match competitor pricing",
          response: `I'm not necessarily asking you to match it exactly, but can we find a middle ground that reflects my loyalty and payment history?`,
        },
      ],
      fallbackOptions: [
        {
          option: "Request promotional rate",
          description: `Ask for the new customer promotional rate of $${(marketAnalysis.averageMarketRate * 0.9).toFixed(2)}/month`,
          estimatedSavings: bill.currentAmount - (marketAnalysis.averageMarketRate * 0.9),
        },
        {
          option: "Downgrade to lower tier",
          description: "Ask about lower-tier plans that might meet your needs",
          estimatedSavings: targetSavings * 0.5,
        },
      ],
      closing: `I really value my relationship with ${bill.provider} and would prefer to stay, but I need to make financially responsible decisions. Can you help me find a solution that works for both of us?`,
      strategy: 'balanced',
    });
  }

  /**
   * Parse AI response into structured script
   */
  private parseScriptResponse(
    aiResponse: string,
    bill: NegotiableBill,
    profile: UserProfile
  ): NegotiationScript {
    try {
      const parsed = JSON.parse(aiResponse);

      return {
        billId: bill.id,
        provider: bill.provider,
        billType: bill.billType,
        opening: parsed.opening,
        mainPoints: parsed.mainPoints.map((p: any, i: number) => ({
          id: `point-${i}`,
          order: i + 1,
          point: p.point,
          supportingData: p.supportingData,
          expectedResponse: p.expectedResponse,
          priority: p.priority || 'medium',
        })),
        counterarguments: parsed.counterarguments.map((c: any) => ({
          objection: c.objection,
          response: c.response,
          alternativeApproach: c.alternativeApproach,
        })),
        fallbackOptions: parsed.fallbackOptions.map((f: any) => ({
          option: f.option,
          description: f.description,
          estimatedSavings: f.estimatedSavings || 0,
          likelihood: f.likelihood || 'medium',
        })),
        closing: parsed.closing,
        strategy: parsed.strategy || 'balanced',
        targetSavings: bill.estimatedSavings,
        minimumAcceptableSavings: bill.estimatedSavings * 0.5,
        userTenure: profile.tenure,
        paymentHistory: profile.paymentHistory,
        loyaltyScore: profile.loyaltyScore,
        aiModel: 'anthropic/claude-4.5-sonnet',
        confidence: 85,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    } catch (_error) {
      // BillNegotiator error: Failed to parse AI response, using template
      // Fallback to template
      const templateResponse = this.generateTemplateScript(bill,
        {
          billType: bill.billType,
          provider: bill.provider,
          averageMarketRate: bill.currentAmount * 0.8,
          competitorRates: [],
          userCurrentRate: bill.currentAmount,
          savingsPotential: bill.estimatedSavings,
          savingsPercentage: (bill.estimatedSavings / bill.currentAmount) * 100,
          marketPosition: 'above_average',
          leveragePoints: [],
          competitiveAdvantages: [],
          recommendedAction: 'negotiate',
          confidenceScore: 70,
          dataSource: 'template',
          lastUpdated: new Date(),
          expiresAt: new Date(),
        },
        profile
      );
      return this.parseScriptResponse(templateResponse, bill, profile);
    }
  }
}

// Export singleton instance
export const getBillNegotiator = () => BillNegotiator.getInstance();




