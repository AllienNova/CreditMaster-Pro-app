import OpenAI from 'openai';
import { ADVANCED_STRATEGIES, StrategySelectionEngine } from './strategies';
import type { 
  CreditItem, 
  Strategy, 
  StrategyRecommendation, 
  User, 
  AIAnalysis,
  CreditAnalysis,
  ScoreFactor,
  ImprovementOpportunity,
  RiskFactor
} from '@/types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, this should be handled server-side
});

export interface StrategyAnalysisResult {
  recommendations: StrategyRecommendation[];
  creditAnalysis: CreditAnalysis;
  priorityItems: CreditItem[];
  estimatedImpact: {
    scoreIncrease: number;
    timeframe: string;
    successProbability: number;
  };
  actionPlan: ActionStep[];
}

export interface ActionStep {
  id: string;
  title: string;
  description: string;
  strategy: Strategy;
  targetItems: CreditItem[];
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: string;
  successRate: number;
  dependencies: string[];
}

export class AIStrategyEngine {
  private static readonly SCORE_FACTORS = {
    payment_history: 0.35,
    credit_utilization: 0.30,
    length_of_history: 0.15,
    credit_mix: 0.10,
    new_credit: 0.10
  };

  private static readonly NEGATIVE_IMPACT_WEIGHTS = {
    'late_payment': 50,
    'charge_off': 100,
    'collection': 80,
    'bankruptcy': 150,
    'tax_lien': 120,
    'judgment': 90,
    'foreclosure': 130,
    'hard_inquiry': 5
  };

  /**
   * Main AI analysis function that provides comprehensive strategy recommendations
   */
  static async analyzeAndRecommend(
    creditItems: CreditItem[],
    user: User,
    currentScore?: number
  ): Promise<StrategyAnalysisResult> {
    try {
      // Step 1: Analyze credit profile
      const creditAnalysis = await this.analyzeCreditProfile(creditItems, currentScore);
      
      // Step 2: Identify priority items for dispute
      const priorityItems = this.identifyPriorityItems(creditItems, creditAnalysis);
      
      // Step 3: Generate strategy recommendations for each item
      const recommendations = await this.generateRecommendations(priorityItems, user, creditAnalysis);
      
      // Step 4: Create action plan
      const actionPlan = this.createActionPlan(recommendations, priorityItems);
      
      // Step 5: Estimate overall impact
      const estimatedImpact = this.estimateImpact(recommendations, creditAnalysis);
      
      return {
        recommendations,
        creditAnalysis,
        priorityItems,
        estimatedImpact,
        actionPlan
      };
    } catch (error) {
      console.error('AI Strategy Engine Error:', error);
      throw new Error('Failed to generate strategy recommendations');
    }
  }

  /**
   * Analyze credit profile using AI and statistical models
   */
  private static async analyzeCreditProfile(
    creditItems: CreditItem[],
    currentScore?: number
  ): Promise<CreditAnalysis> {
    const accounts = creditItems.filter(item => item.item_type === 'account');
    const collections = creditItems.filter(item => item.item_type === 'collection');
    const publicRecords = creditItems.filter(item => item.item_type === 'public_record');
    const inquiries = creditItems.filter(item => item.item_type === 'inquiry');

    // Calculate score factors
    const scoreFactors = this.calculateScoreFactors(creditItems);
    
    // Identify improvement opportunities
    const improvementOpportunities = this.identifyImprovementOpportunities(creditItems);
    
    // Assess risk factors
    const riskFactors = this.assessRiskFactors(creditItems);
    
    // Estimate current score if not provided
    const estimatedScore = currentScore || this.estimateCreditScore(creditItems);
    
    // Generate timeline estimate using AI
    const timelineEstimate = await this.generateTimelineEstimate(creditItems, improvementOpportunities);

    return {
      overall_score: estimatedScore,
      score_factors: scoreFactors,
      improvement_opportunities: improvementOpportunities,
      risk_factors: riskFactors,
      timeline_estimate: timelineEstimate
    };
  }

  /**
   * Calculate detailed score factors
   */
  private static calculateScoreFactors(creditItems: CreditItem[]): ScoreFactor[] {
    const factors: ScoreFactor[] = [];
    const accounts = creditItems.filter(item => item.item_type === 'account');
    const collections = creditItems.filter(item => item.item_type === 'collection');
    const publicRecords = creditItems.filter(item => item.item_type === 'public_record');
    const inquiries = creditItems.filter(item => item.item_type === 'inquiry');

    // Payment History (35%)
    const latePayments = accounts.filter(acc => 
      acc.payment_status.includes('late') || acc.payment_status.includes('charge')
    ).length;
    
    factors.push({
      factor: 'Payment History',
      impact: latePayments > 0 ? 'negative' : 'positive',
      weight: this.SCORE_FACTORS.payment_history,
      description: latePayments > 0 
        ? `${latePayments} accounts with late payments or charge-offs`
        : 'No late payments detected'
    });

    // Credit Utilization (30%)
    const totalBalances = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const totalLimits = accounts.reduce((sum, acc) => sum + (acc.credit_limit || 0), 0);
    const utilizationRate = totalLimits > 0 ? (totalBalances / totalLimits) * 100 : 0;
    
    factors.push({
      factor: 'Credit Utilization',
      impact: utilizationRate > 30 ? 'negative' : utilizationRate < 10 ? 'positive' : 'neutral',
      weight: this.SCORE_FACTORS.credit_utilization,
      description: `${utilizationRate.toFixed(1)}% utilization across all accounts`
    });

    // Length of Credit History (15%)
    const oldestAccount = accounts.reduce((oldest, acc) => {
      if (!acc.date_opened) return oldest;
      const accountDate = new Date(acc.date_opened);
      return !oldest || accountDate < oldest ? accountDate : oldest;
    }, null as Date | null);
    
    const historyLength = oldestAccount 
      ? Math.floor((Date.now() - oldestAccount.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 0;
    
    factors.push({
      factor: 'Length of Credit History',
      impact: historyLength > 7 ? 'positive' : historyLength < 2 ? 'negative' : 'neutral',
      weight: this.SCORE_FACTORS.length_of_history,
      description: `${historyLength} years of credit history`
    });

    // Credit Mix (10%)
    const accountTypes = new Set(accounts.map(acc => acc.account_type).filter(Boolean));
    
    factors.push({
      factor: 'Credit Mix',
      impact: accountTypes.size >= 3 ? 'positive' : accountTypes.size === 1 ? 'negative' : 'neutral',
      weight: this.SCORE_FACTORS.credit_mix,
      description: `${accountTypes.size} different types of credit accounts`
    });

    // New Credit (10%)
    const recentInquiries = inquiries.filter(inq => {
      if (!inq.date_opened) return false;
      const inquiryDate = new Date(inq.date_opened);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      return inquiryDate > twoYearsAgo;
    }).length;
    
    factors.push({
      factor: 'New Credit',
      impact: recentInquiries > 6 ? 'negative' : recentInquiries < 2 ? 'positive' : 'neutral',
      weight: this.SCORE_FACTORS.new_credit,
      description: `${recentInquiries} inquiries in the last 2 years`
    });

    return factors;
  }

  /**
   * Identify improvement opportunities using AI analysis
   */
  private static identifyImprovementOpportunities(creditItems: CreditItem[]): ImprovementOpportunity[] {
    const opportunities: ImprovementOpportunity[] = [];
    
    // Negative items removal
    const negativeItems = creditItems.filter(item => 
      item.payment_status.includes('late') ||
      item.payment_status.includes('charge') ||
      item.item_type === 'collection' ||
      item.item_type === 'public_record'
    );
    
    if (negativeItems.length > 0) {
      const potentialImpact = negativeItems.reduce((sum, item) => {
        const weight = this.NEGATIVE_IMPACT_WEIGHTS[item.payment_status as keyof typeof this.NEGATIVE_IMPACT_WEIGHTS] || 30;
        return sum + weight;
      }, 0);
      
      opportunities.push({
        opportunity: 'Remove Negative Items',
        potential_impact: Math.min(potentialImpact, 150), // Cap at 150 points
        difficulty: negativeItems.length > 5 ? 'hard' : negativeItems.length > 2 ? 'medium' : 'easy',
        timeline: negativeItems.length > 5 ? '6-12 months' : '3-6 months',
        strategies: this.getRelevantStrategies(negativeItems)
      });
    }

    // Credit utilization optimization
    const accounts = creditItems.filter(item => item.item_type === 'account');
    const highUtilizationAccounts = accounts.filter(acc => {
      if (!acc.balance || !acc.credit_limit) return false;
      return (acc.balance / acc.credit_limit) > 0.3;
    });
    
    if (highUtilizationAccounts.length > 0) {
      opportunities.push({
        opportunity: 'Optimize Credit Utilization',
        potential_impact: 50,
        difficulty: 'easy',
        timeline: '1-2 months',
        strategies: ['credit_profile_optimization', 'pay_for_delete']
      });
    }

    // Inquiry removal
    const recentInquiries = creditItems.filter(item => 
      item.item_type === 'inquiry' && this.isRecentInquiry(item)
    );
    
    if (recentInquiries.length > 3) {
      opportunities.push({
        opportunity: 'Remove Unauthorized Inquiries',
        potential_impact: recentInquiries.length * 5,
        difficulty: 'medium',
        timeline: '2-4 months',
        strategies: ['inquiry_suppression']
      });
    }

    return opportunities;
  }

  /**
   * Assess risk factors that could impact credit repair success
   */
  private static assessRiskFactors(creditItems: CreditItem[]): RiskFactor[] {
    const riskFactors: RiskFactor[] = [];
    
    // Recent negative activity
    const recentNegativeItems = creditItems.filter(item => {
      if (!item.last_reported_date) return false;
      const reportDate = new Date(item.last_reported_date);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return reportDate > sixMonthsAgo && (
        item.payment_status.includes('late') ||
        item.item_type === 'collection'
      );
    });
    
    if (recentNegativeItems.length > 0) {
      riskFactors.push({
        risk: 'Recent Negative Activity',
        severity: 'high',
        description: 'Recent late payments or collections may make disputes more challenging',
        mitigation: ['Focus on older items first', 'Establish positive payment history', 'Consider goodwill letters']
      });
    }

    // Multiple disputes on same item
    const itemsWithMultipleDisputes = creditItems.filter(item => 
      item.dispute_history && item.dispute_history.length > 2
    );
    
    if (itemsWithMultipleDisputes.length > 0) {
      riskFactors.push({
        risk: 'Frivolous Dispute Risk',
        severity: 'medium',
        description: 'Multiple disputes on same items may be flagged as frivolous',
        mitigation: ['Space out disputes', 'Use different strategies', 'Provide substantial evidence']
      });
    }

    return riskFactors;
  }

  /**
   * Estimate credit score based on credit items
   */
  private static estimateCreditScore(creditItems: CreditItem[]): number {
    let baseScore = 650; // Average starting point
    
    // Adjust for negative items
    const negativeItems = creditItems.filter(item => 
      item.payment_status.includes('late') ||
      item.payment_status.includes('charge') ||
      item.item_type === 'collection' ||
      item.item_type === 'public_record'
    );
    
    negativeItems.forEach(item => {
      const impact = this.NEGATIVE_IMPACT_WEIGHTS[item.payment_status as keyof typeof this.NEGATIVE_IMPACT_WEIGHTS] || 30;
      baseScore -= impact;
    });
    
    // Adjust for positive factors
    const accounts = creditItems.filter(item => item.item_type === 'account');
    const totalBalances = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const totalLimits = accounts.reduce((sum, acc) => sum + (acc.credit_limit || 0), 0);
    
    if (totalLimits > 0) {
      const utilization = totalBalances / totalLimits;
      if (utilization < 0.1) baseScore += 20;
      else if (utilization > 0.5) baseScore -= 30;
    }
    
    return Math.max(300, Math.min(850, baseScore));
  }

  /**
   * Generate timeline estimate using AI
   */
  private static async generateTimelineEstimate(
    creditItems: CreditItem[],
    opportunities: ImprovementOpportunity[]
  ): Promise<string> {
    try {
      const prompt = `
        Analyze this credit profile and provide a realistic timeline estimate for credit repair:
        
        Credit Items: ${creditItems.length} total items
        - Accounts: ${creditItems.filter(i => i.item_type === 'account').length}
        - Collections: ${creditItems.filter(i => i.item_type === 'collection').length}
        - Public Records: ${creditItems.filter(i => i.item_type === 'public_record').length}
        - Inquiries: ${creditItems.filter(i => i.item_type === 'inquiry').length}
        
        Improvement Opportunities: ${opportunities.length}
        
        Provide a concise timeline estimate (e.g., "3-6 months", "6-12 months") based on the complexity.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50,
        temperature: 0.3
      });

      return response.choices[0]?.message?.content?.trim() || "6-12 months";
    } catch (error) {
      console.warn('AI timeline estimation failed, using fallback');
      return opportunities.length > 3 ? "9-18 months" : "3-9 months";
    }
  }

  /**
   * Identify priority items for dispute based on impact and success probability
   */
  private static identifyPriorityItems(
    creditItems: CreditItem[],
    analysis: CreditAnalysis
  ): CreditItem[] {
    return creditItems
      .filter(item => this.isDisputableItem(item))
      .map(item => ({
        ...item,
        _priorityScore: this.calculatePriorityScore(item, analysis)
      }))
      .sort((a, b) => (b as any)._priorityScore - (a as any)._priorityScore)
      .slice(0, 10); // Top 10 priority items
  }

  /**
   * Calculate priority score for an item
   */
  private static calculatePriorityScore(item: CreditItem, analysis: CreditAnalysis): number {
    let score = 0;
    
    // Impact on credit score
    const impactWeight = this.NEGATIVE_IMPACT_WEIGHTS[item.payment_status as keyof typeof this.NEGATIVE_IMPACT_WEIGHTS] || 10;
    score += impactWeight;
    
    // Age of item (older items are easier to dispute)
    const itemAge = this.calculateItemAge(item);
    if (itemAge > 2) score += 20;
    if (itemAge > 5) score += 30;
    
    // Item type priority
    if (item.item_type === 'public_record') score += 50;
    if (item.item_type === 'collection') score += 40;
    if (item.item_type === 'account' && item.payment_status.includes('charge')) score += 35;
    
    // Balance amount (higher balances get priority)
    if (item.balance && item.balance > 1000) score += 15;
    if (item.balance && item.balance > 10000) score += 25;
    
    // Previous dispute history (fewer disputes = higher priority)
    const disputeCount = item.dispute_history?.length || 0;
    score -= disputeCount * 10;
    
    return score;
  }

  /**
   * Generate strategy recommendations for priority items
   */
  private static async generateRecommendations(
    priorityItems: CreditItem[],
    user: User,
    analysis: CreditAnalysis
  ): Promise<StrategyRecommendation[]> {
    const allRecommendations: StrategyRecommendation[] = [];
    
    for (const item of priorityItems) {
      const itemRecommendations = await StrategySelectionEngine.selectOptimalStrategies(
        item,
        user,
        item.dispute_history?.map(d => d.strategy_id) || []
      );
      
      // Enhance recommendations with AI insights
      const enhancedRecommendations = await this.enhanceRecommendationsWithAI(
        itemRecommendations,
        item,
        analysis
      );
      
      allRecommendations.push(...enhancedRecommendations);
    }
    
    return allRecommendations.sort((a, b) => 
      (b.successProbability * b.impactScore) - (a.successProbability * a.impactScore)
    );
  }

  /**
   * Enhance recommendations with AI insights
   */
  private static async enhanceRecommendationsWithAI(
    recommendations: StrategyRecommendation[],
    item: CreditItem,
    analysis: CreditAnalysis
  ): Promise<StrategyRecommendation[]> {
    try {
      const prompt = `
        Analyze this credit item and enhance the strategy recommendations:
        
        Item: ${item.creditor} - ${item.item_type}
        Status: ${item.payment_status}
        Balance: $${item.balance || 0}
        Age: ${this.calculateItemAge(item)} years
        
        Current Recommendations: ${recommendations.map(r => r.strategyId).join(', ')}
        
        Provide insights on:
        1. Best strategy order
        2. Success probability adjustments
        3. Additional considerations
        
        Keep response concise and actionable.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.3
      });

      const aiInsights = response.choices[0]?.message?.content || '';
      
      // Apply AI insights to enhance recommendations
      return recommendations.map(rec => ({
        ...rec,
        reasoning: [...rec.reasoning, `AI Insight: ${aiInsights.slice(0, 100)}...`]
      }));
    } catch (error) {
      console.warn('AI enhancement failed, returning original recommendations');
      return recommendations;
    }
  }

  /**
   * Create actionable plan from recommendations
   */
  private static createActionPlan(
    recommendations: StrategyRecommendation[],
    priorityItems: CreditItem[]
  ): ActionStep[] {
    const actionSteps: ActionStep[] = [];
    const processedItems = new Set<string>();
    
    // Group recommendations by strategy
    const strategyGroups = new Map<string, StrategyRecommendation[]>();
    recommendations.forEach(rec => {
      const existing = strategyGroups.get(rec.strategyId) || [];
      existing.push(rec);
      strategyGroups.set(rec.strategyId, existing);
    });
    
    // Create action steps
    let stepIndex = 1;
    for (const [strategyId, recs] of strategyGroups) {
      const strategy = ADVANCED_STRATEGIES.find(s => s.id === strategyId);
      if (!strategy) continue;
      
      const targetItems = recs
        .map(rec => priorityItems.find(item => item.id === rec.itemId))
        .filter(Boolean) as CreditItem[];
      
      if (targetItems.length === 0) continue;
      
      const avgSuccessRate = recs.reduce((sum, rec) => sum + rec.successProbability, 0) / recs.length;
      const priority = this.determinePriority(avgSuccessRate, strategy.tier, targetItems.length);
      
      actionSteps.push({
        id: `step_${stepIndex++}`,
        title: `Execute ${strategy.name}`,
        description: `Apply ${strategy.name} to ${targetItems.length} item(s). ${strategy.legal_basis}`,
        strategy,
        targetItems,
        priority,
        estimatedDuration: this.estimateStepDuration(strategy, targetItems.length),
        successRate: avgSuccessRate * 100,
        dependencies: this.identifyDependencies(strategy, actionSteps)
      });
      
      targetItems.forEach(item => processedItems.add(item.id));
    }
    
    return actionSteps.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Estimate overall impact of strategy execution
   */
  private static estimateImpact(
    recommendations: StrategyRecommendation[],
    analysis: CreditAnalysis
  ): { scoreIncrease: number; timeframe: string; successProbability: number } {
    const totalImpact = recommendations.reduce((sum, rec) => 
      sum + (rec.impactScore * rec.successProbability), 0
    );
    
    const avgSuccessProbability = recommendations.length > 0 
      ? recommendations.reduce((sum, rec) => sum + rec.successProbability, 0) / recommendations.length
      : 0;
    
    const scoreIncrease = Math.min(totalImpact * 100, 200); // Cap at 200 points
    const timeframe = recommendations.length > 10 ? "12-18 months" : "6-12 months";
    
    return {
      scoreIncrease: Math.round(scoreIncrease),
      timeframe,
      successProbability: avgSuccessProbability
    };
  }

  // Helper methods
  private static isDisputableItem(item: CreditItem): boolean {
    return item.status !== 'resolved' && (
      item.payment_status.includes('late') ||
      item.payment_status.includes('charge') ||
      item.item_type === 'collection' ||
      item.item_type === 'public_record' ||
      (item.item_type === 'inquiry' && this.isRecentInquiry(item))
    );
  }

  private static isRecentInquiry(item: CreditItem): boolean {
    if (!item.date_opened) return false;
    const inquiryDate = new Date(item.date_opened);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    return inquiryDate > twoYearsAgo;
  }

  private static calculateItemAge(item: CreditItem): number {
    const firstReported = new Date(item.first_reported_date);
    const now = new Date();
    return (now.getTime() - firstReported.getTime()) / (1000 * 60 * 60 * 24 * 365);
  }

  private static getRelevantStrategies(items: CreditItem[]): string[] {
    const strategies = new Set<string>();
    
    items.forEach(item => {
      if (item.item_type === 'collection') {
        strategies.add('debt_validation');
        strategies.add('pay_for_delete');
      }
      if (item.item_type === 'public_record') {
        strategies.add('bankruptcy_removal');
        strategies.add('statute_limitations');
      }
      if (item.payment_status.includes('late')) {
        strategies.add('goodwill_saturation');
        strategies.add('factual_dispute');
      }
    });
    
    return Array.from(strategies);
  }

  private static determinePriority(
    successRate: number, 
    tier: number, 
    itemCount: number
  ): 'high' | 'medium' | 'low' {
    const score = (successRate * 100) + (6 - tier) * 10 + itemCount * 5;
    
    if (score > 80) return 'high';
    if (score > 50) return 'medium';
    return 'low';
  }

  private static estimateStepDuration(strategy: Strategy, itemCount: number): string {
    const baseDuration = {
      1: 30, // Tier 1: 30 days
      2: 45, // Tier 2: 45 days
      3: 60, // Tier 3: 60 days
      4: 90, // Tier 4: 90 days
      5: 60, // Tier 5: 60 days
      6: 120, // Tier 6: 120 days
      7: 45  // Tier 7: 45 days
    }[strategy.tier] || 60;
    
    const adjustedDuration = baseDuration + (itemCount - 1) * 7; // Add 7 days per additional item
    
    if (adjustedDuration <= 30) return "2-4 weeks";
    if (adjustedDuration <= 60) return "1-2 months";
    if (adjustedDuration <= 90) return "2-3 months";
    return "3-4 months";
  }

  private static identifyDependencies(strategy: Strategy, existingSteps: ActionStep[]): string[] {
    const dependencies: string[] = [];
    
    // Some strategies should be executed after others
    if (strategy.id === 'mov_request') {
      const factualDispute = existingSteps.find(step => 
        step.strategy.id === 'factual_dispute'
      );
      if (factualDispute) {
        dependencies.push(factualDispute.id);
      }
    }
    
    return dependencies;
  }
}

export default AIStrategyEngine;

