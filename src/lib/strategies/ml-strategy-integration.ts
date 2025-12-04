/**
 * ML Strategy Integration
 * 
 * Bridges the 28 credit repair strategies with ML prediction models
 * for intelligent, data-driven strategy recommendations.
 * 
 * Features:
 * - ML-enhanced strategy scoring
 * - Feature extraction from credit items
 * - Applicability filtering
 * - Success probability prediction
 * - Timeline estimation
 * - ROI calculation
 */

import { Strategy } from '@/types/student-loan';
import { ADVANCED_STRATEGIES } from './index';
import { MLPredictionModels } from '../ml-prediction-models';

// Types
export interface CreditItem {
  type: 'collection' | 'account' | 'inquiry' | 'public_record' | 'late_payment' | 'charge_off';
  description: string;
  amount?: number;
  date: string;
  bureau: 'experian' | 'equifax' | 'transunion';
  status: string;
  accountType?: string;
  creditorName?: string;
  age?: number; // Age in months
}

export interface UserProfile {
  creditScore: number;
  accountAge: number; // Average age in months
  paymentHistory: number; // Percentage of on-time payments
  utilization: number; // Credit utilization percentage
  totalAccounts: number;
  negativeItems: number;
  inquiries: number;
}

export interface StrategyRecommendation {
  strategy: Strategy;
  score: number; // 0-100
  successProbability: number; // 0-1
  estimatedTimeline: string;
  requiredActions: string[];
  legalBasis: string;
  reasoning: string;
  roi: number; // Expected credit score improvement
  confidence: number; // ML confidence 0-1
}

export interface FeatureVector {
  // Credit item features
  itemAge: number;
  itemAmount: number;
  itemType: string;
  
  // User profile features
  creditScore: number;
  accountAge: number;
  paymentHistory: number;
  utilization: number;
  
  // Strategy features
  strategySuccessRate: number;
  strategyTier: number;
  
  // Contextual features
  previousAttempts: number;
  bureauType: string;
}

/**
 * ML Strategy Integration Service
 */
class MLStrategyIntegration {
  private mlModels: MLPredictionModels;
  
  constructor() {
    this.mlModels = new MLPredictionModels();
  }
  
  /**
   * Main recommendation engine
   * Returns top 5 strategies ranked by ML-enhanced scoring
   */
  async recommendStrategies(
    creditItem: CreditItem,
    userProfile: UserProfile,
    previousAttempts: string[] = []
  ): Promise<StrategyRecommendation[]> {
    try {
      // 1. Filter applicable strategies
      const applicableStrategies = this.filterApplicableStrategies(
        ADVANCED_STRATEGIES,
        creditItem
      );
      
      // 2. Remove previously attempted strategies
      const availableStrategies = applicableStrategies.filter(
        s => !previousAttempts.includes(s.id)
      );
      
      if (availableStrategies.length === 0) {
        throw new Error('No applicable strategies available');
      }
      
      // 3. Score each strategy using ML + rules
      const recommendations: StrategyRecommendation[] = [];
      
      for (const strategy of availableStrategies) {
        const recommendation = await this.scoreStrategy(
          strategy,
          creditItem,
          userProfile,
          previousAttempts.length
        );
        recommendations.push(recommendation);
      }
      
      // 4. Sort by score (descending) and return top 5
      recommendations.sort((a, b) => b.score - a.score);
      return recommendations.slice(0, 5);
      
    } catch (error) {
      console.error('Error recommending strategies:', error);
      throw error;
    }
  }
  
  /**
   * Score a single strategy using ML + rule-based approach
   */
  private async scoreStrategy(
    strategy: Strategy,
    creditItem: CreditItem,
    userProfile: UserProfile,
    previousAttemptsCount: number
  ): Promise<StrategyRecommendation> {
    // Extract features
    const features = this.extractFeatures(
      creditItem,
      userProfile,
      strategy,
      previousAttemptsCount
    );
    
    // Get ML prediction for dispute success
    const mlPrediction = await this.mlModels.predictCreditRepairSuccess({
      creditScore: userProfile.creditScore,
      accountAge: userProfile.accountAge,
      paymentHistory: userProfile.paymentHistory,
      utilization: userProfile.utilization,
      itemType: creditItem.type,
      itemAge: this.calculateItemAge(creditItem.date),
      itemAmount: creditItem.amount || 0,
      previousDisputes: previousAttemptsCount,
      bureauType: creditItem.bureau,
    });
    
    // Calculate composite score (0-100)
    const baseScore = strategy.success_rate * 100; // 40-85
    const mlScore = mlPrediction.probability * 100; // 0-100
    const confidenceBonus = mlPrediction.confidence * 10; // 0-10
    const tierBonus = (5 - strategy.tier) * 5; // 0-20 (higher tier = higher bonus)
    const attemptPenalty = previousAttemptsCount * 5; // -5 per previous attempt
    
    const compositeScore = Math.max(0, Math.min(100,
      baseScore * 0.4 +
      mlScore * 0.3 +
      confidenceBonus +
      tierBonus -
      attemptPenalty
    ));

    const utilizationAdjustment = (100 - Math.min(features.utilization, 100)) * 0.05;
    const repetitionPenalty = features.previousAttempts * 2;
    const finalScore = Math.max(0, Math.min(100, compositeScore + utilizationAdjustment - repetitionPenalty));
    
    // Calculate success probability (weighted average)
    const successProbability = (
      strategy.success_rate * 0.6 +
      mlPrediction.probability * 0.4
    );
    
    // Estimate timeline
    const estimatedTimeline = this.estimateTimeline(strategy, creditItem);
    
    // Generate required actions
    const requiredActions = this.generateRequiredActions(strategy, creditItem);
    
    // Generate reasoning
    const reasoning = this.generateReasoning(
      strategy,
      creditItem,
      successProbability,
      mlPrediction.confidence
    );
    
    // Calculate ROI (expected credit score improvement)
    const roi = this.calculateROI(
      strategy,
      creditItem,
      userProfile,
      successProbability
    );
    
    return {
      strategy,
      score: finalScore,
      successProbability,
      estimatedTimeline,
      requiredActions,
      legalBasis: strategy.legal_basis,
      reasoning,
      roi,
      confidence: mlPrediction.confidence,
    };
  }
  
  /**
   * Extract features for ML model
   */
  private extractFeatures(
    creditItem: CreditItem,
    userProfile: UserProfile,
    strategy: Strategy,
    previousAttempts: number
  ): FeatureVector {
    return {
      itemAge: this.calculateItemAge(creditItem.date),
      itemAmount: creditItem.amount || 0,
      itemType: creditItem.type,
      creditScore: userProfile.creditScore,
      accountAge: userProfile.accountAge,
      paymentHistory: userProfile.paymentHistory,
      utilization: userProfile.utilization,
      strategySuccessRate: strategy.success_rate,
      strategyTier: strategy.tier,
      previousAttempts,
      bureauType: creditItem.bureau,
    };
  }
  
  /**
   * Filter strategies by applicability to credit item
   */
  private filterApplicableStrategies(
    strategies: Strategy[],
    creditItem: CreditItem
  ): Strategy[] {
    return strategies.filter(strategy => {
      // Check if strategy targets this item type
      const targetsItemType = strategy.target_items.includes(creditItem.type);
      
      // Check if strategy is active
      const isActive = strategy.is_active;
      
      // Check prerequisites (simplified - in production, check actual conditions)
      const meetsPrerequisites = true; // TODO: Implement prerequisite checking
      
      return targetsItemType && isActive && meetsPrerequisites;
    });
  }
  
  /**
   * Calculate item age in months
   */
  private calculateItemAge(dateString: string): number {
    const itemDate = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - itemDate.getTime();
    const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30);
    return Math.floor(diffMonths);
  }
  
  /**
   * Estimate timeline for strategy execution
   */
  private estimateTimeline(strategy: Strategy, creditItem: CreditItem): string {
    // Base timeline by tier
    const baseTimeline = {
      1: '30-45 days',
      2: '45-60 days',
      3: '60-90 days',
      4: '90-120 days',
    }[strategy.tier] || '60-90 days';
    
    // Adjust for item type
    if (creditItem.type === 'inquiry') {
      return '15-30 days'; // Inquiries are faster
    }
    
    if (creditItem.type === 'public_record') {
      return '90-180 days'; // Public records take longer
    }
    
    return baseTimeline;
  }
  
  /**
   * Generate required actions for strategy
   */
  private generateRequiredActions(strategy: Strategy, creditItem: CreditItem): string[] {
    const actions: string[] = [];
    
    // Add strategy-specific tactics
    actions.push(...strategy.key_tactics);
    
    // Add item-specific actions
    if (creditItem.type === 'collection') {
      actions.push('Request debt validation');
      actions.push('Verify original creditor');
    }
    
    if (creditItem.type === 'inquiry') {
      actions.push('Identify unauthorized inquiry');
      actions.push('Submit inquiry dispute letter');
    }
    
    return actions;
  }
  
  /**
   * Generate reasoning for recommendation
   */
  private generateReasoning(
    strategy: Strategy,
    creditItem: CreditItem,
    successProbability: number,
    confidence: number
  ): string {
    const successPercent = Math.round(successProbability * 100);
    const confidencePercent = Math.round(confidence * 100);
    
    return `This strategy has a ${successPercent}% predicted success rate for ${creditItem.type} items. ` +
           `ML confidence: ${confidencePercent}%. ` +
           `Legal basis: ${strategy.legal_basis}. ` +
           `Recommended for ${strategy.target_items.join(', ')} items.`;
  }
  
  /**
   * Calculate ROI (expected credit score improvement)
   */
  private calculateROI(
    strategy: Strategy,
    creditItem: CreditItem,
    userProfile: UserProfile,
    successProbability: number
  ): number {
    // Base impact by item type
    const baseImpact = {
      'collection': 30,
      'charge_off': 40,
      'late_payment': 20,
      'inquiry': 5,
      'public_record': 50,
      'account': 25,
    }[creditItem.type] || 20;
    
    // Adjust for item amount (higher amounts = higher impact)
    const amountMultiplier = creditItem.amount
      ? Math.min(2, 1 + (creditItem.amount / 10000))
      : 1;
    
    // Adjust for success probability
    const expectedImpact = baseImpact * amountMultiplier * successProbability;
    
    return Math.round(expectedImpact);
  }
}

// Export singleton instance
export const mlStrategyIntegration = new MLStrategyIntegration();
export default mlStrategyIntegration;
