import { supabase } from './supabase';
import RealMLIntegration from './real-ml-integration';
import type { CreditItem, CreditReport, User } from '@/types';

export interface ImprovementAction {
  id: string;
  title: string;
  description: string;
  category: 'debt_reduction' | 'payment_optimization' | 'credit_mix' | 'history_building' | 'income_optimization';
  priority: 1 | 2 | 3;
  mlFeatureImpact: number; // Based on real ML feature importance
  expectedScoreIncrease: [number, number]; // Min, Max
  timeframe: string;
  difficulty: 'easy' | 'medium' | 'hard';
  cost: 'free' | 'low' | 'medium' | 'high';
  steps: string[];
  requirements?: string[];
  warnings?: string[];
}

export interface ImprovementPlan {
  id: string;
  user_id: string;
  created_at: string;
  current_score: number;
  target_score: number;
  timeline_days: number;
  total_expected_increase: [number, number];
  confidence_level: number;
  phases: ImprovementPhase[];
  actions: ImprovementAction[];
  ml_analysis: MLImprovementAnalysis;
}

export interface ImprovementPhase {
  phase: 1 | 2 | 3;
  title: string;
  duration_days: number;
  focus_areas: string[];
  expected_increase: [number, number];
  actions: string[]; // Action IDs
}

export interface MLImprovementAnalysis {
  current_features: Record<string, number>;
  feature_importance: Record<string, number>;
  improvement_opportunities: {
    feature: string;
    current_value: number;
    target_value: number;
    impact_percentage: number;
    expected_score_increase: number;
  }[];
  risk_factors: string[];
  success_probability: number;
}

export interface ImprovementProgress {
  action_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  started_date?: string;
  completed_date?: string;
  progress_percentage: number;
  notes?: string;
  actual_impact?: number;
}

/**
 * Credit Improvement Engine powered by Real ML Analysis
 */
export class CreditImprovementEngine {
  
  /**
   * Generate personalized improvement plan using real ML insights
   */
  static async generateImprovementPlan(
    user: User,
    creditItems: CreditItem[],
    creditReports: CreditReport[],
    targetScore?: number,
    timeframe?: number
  ): Promise<ImprovementPlan> {
    try {
      // Get current ML analysis
      const mlPredictions = await RealMLIntegration.predictCreditScoreWithRealModel({
        creditItems,
        currentScore: creditReports[0]?.credit_score || 650,
        creditReports,
        user
      });

      const currentPrediction = mlPredictions[0];
      const currentScore = creditReports[0]?.credit_score || 650;
      const targetScoreValue = targetScore || Math.min(850, currentScore + 100);
      const timeframeDays = timeframe || 180; // Default 6 months

      // Extract current features for ML analysis
      const currentFeatures = this.extractCurrentFeatures(creditItems, creditReports, user);
      
      // Get real ML feature importance (from our trained model)
      const featureImportance = {
        'Outstanding_Debt': 0.23,
        'Payment_Behaviour': 0.19,
        'Annual_Income': 0.18,
        'Credit_History_Age': 0.15,
        'Credit_Mix': 0.12,
        'Monthly_Balance': 0.08,
        'Num_of_Delayed_Payment': 0.05
      };

      // Analyze improvement opportunities
      const improvementOpportunities = this.analyzeImprovementOpportunities(
        currentFeatures,
        featureImportance,
        targetScoreValue,
        currentScore
      );

      // Generate personalized actions
      const actions = this.generatePersonalizedActions(
        improvementOpportunities,
        creditItems,
        user,
        timeframeDays
      );

      // Create improvement phases
      const phases = this.createImprovementPhases(actions, timeframeDays);

      // Calculate total expected improvement
      const totalExpectedIncrease = this.calculateTotalExpectedImprovement(actions);

      const improvementPlan: ImprovementPlan = {
        id: `plan_${Date.now()}`,
        user_id: user.id,
        created_at: new Date().toISOString(),
        current_score: currentScore,
        target_score: targetScoreValue,
        timeline_days: timeframeDays,
        total_expected_increase: totalExpectedIncrease,
        confidence_level: this.calculatePlanConfidence(actions, improvementOpportunities),
        phases,
        actions,
        ml_analysis: {
          current_features: currentFeatures,
          feature_importance: featureImportance,
          improvement_opportunities: improvementOpportunities,
          risk_factors: this.identifyRiskFactors(creditItems, user),
          success_probability: this.calculateSuccessProbability(improvementOpportunities, actions)
        }
      };

      // Save plan to database
      await this.savePlanToDatabase(improvementPlan);

      return improvementPlan;

    } catch (error) {
      console.error('Error generating improvement plan:', error);
      throw new Error('Failed to generate improvement plan');
    }
  }

  /**
   * Calculate improvement impact for specific action
   */
  static calculateActionImpact(
    action: ImprovementAction,
    currentFeatures: Record<string, number>,
    featureImportance: Record<string, number>
  ): number {
    // Map action categories to ML features
    const actionFeatureMap = {
      'debt_reduction': 'Outstanding_Debt',
      'payment_optimization': 'Payment_Behaviour',
      'income_optimization': 'Annual_Income',
      'history_building': 'Credit_History_Age',
      'credit_mix': 'Credit_Mix'
    };

    const relatedFeature = actionFeatureMap[action.category];
    if (!relatedFeature || !featureImportance[relatedFeature]) {
      return 0;
    }

    const featureWeight = featureImportance[relatedFeature];
    const baseImpact = action.mlFeatureImpact;
    
    // Calculate expected score impact based on ML feature importance
    return Math.round(baseImpact * featureWeight * 100); // Convert to score points
  }

  /**
   * Track improvement progress
   */
  static async trackProgress(
    userId: string,
    actionId: string,
    progress: Partial<ImprovementProgress>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('improvement_progress')
        .upsert({
          user_id: userId,
          action_id: actionId,
          ...progress,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update plan progress
      await this.updatePlanProgress(userId);

    } catch (error) {
      console.error('Error tracking progress:', error);
      throw error;
    }
  }

  /**
   * Get user's current improvement plan
   */
  static async getCurrentPlan(userId: string): Promise<ImprovementPlan | null> {
    try {
      const { data, error } = await supabase
        .from('improvement_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      return JSON.parse(data.plan_data) as ImprovementPlan;

    } catch (error) {
      console.error('Error getting current plan:', error);
      return null;
    }
  }

  /**
   * Extract current features for ML analysis
   */
  private static extractCurrentFeatures(
    creditItems: CreditItem[],
    creditReports: CreditReport[],
    user: User
  ): Record<string, number> {
    // Calculate outstanding debt
    const outstandingDebt = creditItems
      .filter(item => item.item_type === 'account')
      .reduce((total, item) => total + parseFloat(item.balance || '0'), 0);

    // Calculate credit mix
    const accountTypes = new Set();
    creditItems
      .filter(item => item.item_type === 'account')
      .forEach(item => {
        const type = item.account_type?.toLowerCase() || '';
        if (type.includes('credit')) accountTypes.add('credit_card');
        if (type.includes('mortgage')) accountTypes.add('mortgage');
        if (type.includes('auto')) accountTypes.add('auto');
        if (type.includes('student')) accountTypes.add('student');
      });
    const creditMix = accountTypes.size >= 4 ? 2 : accountTypes.size >= 2 ? 1 : 0;

    // Calculate credit history age
    const openDates = creditItems
      .filter(item => item.date_opened)
      .map(item => new Date(item.date_opened!));
    const creditHistoryAge = openDates.length > 0 
      ? Math.floor((Date.now() - Math.min(...openDates.map(d => d.getTime()))) / (1000 * 60 * 60 * 24 * 30.44))
      : 0;

    // Calculate payment behavior
    let totalPaymentScore = 0;
    let accountCount = 0;
    creditItems
      .filter(item => item.payment_history)
      .forEach(item => {
        const history = item.payment_history || '';
        const onTime = (history.match(/0/g) || []).length;
        const late = (history.match(/[1-9]/g) || []).length;
        if (onTime + late > 0) {
          totalPaymentScore += (onTime / (onTime + late)) * 100;
          accountCount++;
        }
      });
    const paymentBehaviour = accountCount > 0 ? totalPaymentScore / accountCount : 50;

    // Extract annual income
    const annualIncome = user.user_metadata?.annual_income || 50000;

    // Calculate monthly balance
    const monthlyBalance = Math.abs(outstandingDebt);

    // Calculate delayed payments
    const delayedPayments = creditItems
      .reduce((total, item) => {
        const history = item.payment_history || '';
        return total + (history.match(/[1-9]/g) || []).length;
      }, 0);

    return {
      'Outstanding_Debt': outstandingDebt,
      'Credit_Mix': creditMix,
      'Credit_History_Age': creditHistoryAge,
      'Monthly_Balance': monthlyBalance,
      'Payment_Behaviour': paymentBehaviour,
      'Annual_Income': annualIncome,
      'Num_of_Delayed_Payment': delayedPayments
    };
  }

  /**
   * Analyze improvement opportunities based on ML feature importance
   */
  private static analyzeImprovementOpportunities(
    currentFeatures: Record<string, number>,
    featureImportance: Record<string, number>,
    targetScore: number,
    currentScore: number
  ) {
    const scoreGap = targetScore - currentScore;
    const opportunities = [];

    // Debt reduction opportunity (23% impact)
    if (currentFeatures['Outstanding_Debt'] > 0) {
      const debtReductionTarget = Math.max(0, currentFeatures['Outstanding_Debt'] * 0.5);
      const expectedIncrease = Math.round(scoreGap * featureImportance['Outstanding_Debt']);
      
      opportunities.push({
        feature: 'Outstanding_Debt',
        current_value: currentFeatures['Outstanding_Debt'],
        target_value: debtReductionTarget,
        impact_percentage: featureImportance['Outstanding_Debt'] * 100,
        expected_score_increase: expectedIncrease
      });
    }

    // Payment behavior improvement (19% impact)
    if (currentFeatures['Payment_Behaviour'] < 95) {
      const expectedIncrease = Math.round(scoreGap * featureImportance['Payment_Behaviour']);
      
      opportunities.push({
        feature: 'Payment_Behaviour',
        current_value: currentFeatures['Payment_Behaviour'],
        target_value: 95,
        impact_percentage: featureImportance['Payment_Behaviour'] * 100,
        expected_score_increase: expectedIncrease
      });
    }

    // Income optimization (18% impact)
    const incomeTarget = currentFeatures['Annual_Income'] * 1.2; // 20% increase
    const incomeIncrease = Math.round(scoreGap * featureImportance['Annual_Income']);
    
    opportunities.push({
      feature: 'Annual_Income',
      current_value: currentFeatures['Annual_Income'],
      target_value: incomeTarget,
      impact_percentage: featureImportance['Annual_Income'] * 100,
      expected_score_increase: incomeIncrease
    });

    // Credit mix improvement (12% impact)
    if (currentFeatures['Credit_Mix'] < 2) {
      const expectedIncrease = Math.round(scoreGap * featureImportance['Credit_Mix']);
      
      opportunities.push({
        feature: 'Credit_Mix',
        current_value: currentFeatures['Credit_Mix'],
        target_value: 2,
        impact_percentage: featureImportance['Credit_Mix'] * 100,
        expected_score_increase: expectedIncrease
      });
    }

    return opportunities.sort((a, b) => b.expected_score_increase - a.expected_score_increase);
  }

  /**
   * Generate personalized actions based on opportunities
   */
  private static generatePersonalizedActions(
    opportunities: any[],
    creditItems: CreditItem[],
    user: User,
    timeframeDays: number
  ): ImprovementAction[] {
    const actions: ImprovementAction[] = [];

    opportunities.forEach((opp, index) => {
      switch (opp.feature) {
        case 'Outstanding_Debt':
          actions.push({
            id: `debt_reduction_${Date.now()}`,
            title: `Pay Down $${Math.round(opp.current_value - opp.target_value).toLocaleString()} in Debt`,
            description: `Reduce your outstanding debt from $${Math.round(opp.current_value).toLocaleString()} to $${Math.round(opp.target_value).toLocaleString()}`,
            category: 'debt_reduction',
            priority: 1,
            mlFeatureImpact: opp.impact_percentage / 100,
            expectedScoreIncrease: [opp.expected_score_increase - 5, opp.expected_score_increase + 10],
            timeframe: '60-90 days',
            difficulty: 'medium',
            cost: 'high',
            steps: [
              'List all debts with balances and interest rates',
              'Focus on highest utilization credit cards first',
              'Pay more than minimum payments',
              'Consider debt consolidation if beneficial',
              'Track progress monthly'
            ],
            requirements: ['Available funds for debt payment'],
            warnings: ['Avoid closing accounts after paying them off']
          });
          break;

        case 'Payment_Behaviour':
          actions.push({
            id: `payment_optimization_${Date.now()}`,
            title: 'Achieve Perfect Payment History',
            description: `Improve payment consistency from ${Math.round(opp.current_value)}% to 95%+`,
            category: 'payment_optimization',
            priority: 1,
            mlFeatureImpact: opp.impact_percentage / 100,
            expectedScoreIncrease: [opp.expected_score_increase - 3, opp.expected_score_increase + 8],
            timeframe: '30-60 days',
            difficulty: 'easy',
            cost: 'free',
            steps: [
              'Set up autopay for all accounts',
              'Pay before due dates, not on due dates',
              'Make multiple payments per month if possible',
              'Set up payment reminders',
              'Monitor all accounts weekly'
            ],
            requirements: ['Bank account for autopay'],
            warnings: ['Ensure sufficient funds for autopay']
          });
          break;

        case 'Annual_Income':
          actions.push({
            id: `income_optimization_${Date.now()}`,
            title: 'Optimize Income Reporting',
            description: `Increase reported income from $${Math.round(opp.current_value).toLocaleString()} to $${Math.round(opp.target_value).toLocaleString()}`,
            category: 'income_optimization',
            priority: 2,
            mlFeatureImpact: opp.impact_percentage / 100,
            expectedScoreIncrease: [opp.expected_score_increase - 5, opp.expected_score_increase + 5],
            timeframe: '90-120 days',
            difficulty: 'medium',
            cost: 'low',
            steps: [
              'Update income with all creditors',
              'Include all income sources (side jobs, investments)',
              'Request credit limit increases',
              'Consider additional income streams',
              'Document income increases'
            ],
            requirements: ['Proof of income documentation']
          });
          break;

        case 'Credit_Mix':
          actions.push({
            id: `credit_mix_${Date.now()}`,
            title: 'Diversify Credit Portfolio',
            description: `Improve credit mix from ${opp.current_value} to ${opp.target_value} (Excellent)`,
            category: 'credit_mix',
            priority: 3,
            mlFeatureImpact: opp.impact_percentage / 100,
            expectedScoreIncrease: [opp.expected_score_increase - 3, opp.expected_score_increase + 7],
            timeframe: '120-180 days',
            difficulty: 'medium',
            cost: 'medium',
            steps: [
              'Assess current credit types',
              'Consider adding installment loan if needed',
              'Avoid unnecessary credit applications',
              'Keep existing accounts active',
              'Monitor credit mix impact'
            ],
            requirements: ['Good payment history', 'Stable income'],
            warnings: ['New credit may temporarily lower score']
          });
          break;
      }
    });

    return actions.slice(0, 6); // Limit to top 6 actions
  }

  /**
   * Create improvement phases
   */
  private static createImprovementPhases(
    actions: ImprovementAction[],
    timeframeDays: number
  ): ImprovementPhase[] {
    const phase1Actions = actions.filter(a => a.priority === 1);
    const phase2Actions = actions.filter(a => a.priority === 2);
    const phase3Actions = actions.filter(a => a.priority === 3);

    return [
      {
        phase: 1,
        title: 'High-Impact Quick Wins',
        duration_days: Math.round(timeframeDays * 0.4),
        focus_areas: ['Debt Reduction', 'Payment Optimization'],
        expected_increase: this.calculatePhaseImpact(phase1Actions),
        actions: phase1Actions.map(a => a.id)
      },
      {
        phase: 2,
        title: 'Medium-Term Optimization',
        duration_days: Math.round(timeframeDays * 0.4),
        focus_areas: ['Income Optimization', 'Credit History'],
        expected_increase: this.calculatePhaseImpact(phase2Actions),
        actions: phase2Actions.map(a => a.id)
      },
      {
        phase: 3,
        title: 'Fine-Tuning & Maintenance',
        duration_days: Math.round(timeframeDays * 0.2),
        focus_areas: ['Credit Mix', 'Long-term Maintenance'],
        expected_increase: this.calculatePhaseImpact(phase3Actions),
        actions: phase3Actions.map(a => a.id)
      }
    ];
  }

  /**
   * Calculate total expected improvement
   */
  private static calculateTotalExpectedImprovement(actions: ImprovementAction[]): [number, number] {
    const minIncrease = actions.reduce((sum, action) => sum + action.expectedScoreIncrease[0], 0);
    const maxIncrease = actions.reduce((sum, action) => sum + action.expectedScoreIncrease[1], 0);
    
    // Apply diminishing returns (actions don't stack linearly)
    const adjustedMin = Math.round(minIncrease * 0.8);
    const adjustedMax = Math.round(maxIncrease * 0.9);
    
    return [adjustedMin, adjustedMax];
  }

  /**
   * Calculate phase impact
   */
  private static calculatePhaseImpact(actions: ImprovementAction[]): [number, number] {
    if (actions.length === 0) return [0, 0];
    
    const minIncrease = actions.reduce((sum, action) => sum + action.expectedScoreIncrease[0], 0);
    const maxIncrease = actions.reduce((sum, action) => sum + action.expectedScoreIncrease[1], 0);
    
    return [Math.round(minIncrease * 0.8), Math.round(maxIncrease * 0.9)];
  }

  /**
   * Calculate plan confidence
   */
  private static calculatePlanConfidence(
    actions: ImprovementAction[],
    opportunities: any[]
  ): number {
    // Base confidence on number of high-impact opportunities
    const highImpactOpps = opportunities.filter(opp => opp.expected_score_increase > 15).length;
    const easyActions = actions.filter(a => a.difficulty === 'easy').length;
    
    let confidence = 0.6; // Base confidence
    confidence += highImpactOpps * 0.1;
    confidence += easyActions * 0.05;
    
    return Math.min(confidence, 0.95);
  }

  /**
   * Identify risk factors
   */
  private static identifyRiskFactors(creditItems: CreditItem[], user: User): string[] {
    const risks: string[] = [];
    
    const collections = creditItems.filter(item => item.item_type === 'collection');
    if (collections.length > 0) {
      risks.push(`${collections.length} collection account(s) may limit improvement`);
    }
    
    const highUtilization = creditItems.filter(item => {
      const balance = parseFloat(item.balance || '0');
      const limit = parseFloat(item.credit_limit || '0');
      return limit > 0 && (balance / limit) > 0.8;
    });
    
    if (highUtilization.length > 0) {
      risks.push('High credit utilization on multiple accounts');
    }
    
    return risks;
  }

  /**
   * Calculate success probability
   */
  private static calculateSuccessProbability(
    opportunities: any[],
    actions: ImprovementAction[]
  ): number {
    const totalExpectedIncrease = opportunities.reduce((sum, opp) => sum + opp.expected_score_increase, 0);
    const easyActionCount = actions.filter(a => a.difficulty === 'easy').length;
    
    let probability = 0.5; // Base probability
    
    if (totalExpectedIncrease > 50) probability += 0.2;
    if (totalExpectedIncrease > 30) probability += 0.1;
    if (easyActionCount >= 2) probability += 0.15;
    
    return Math.min(probability, 0.92);
  }

  /**
   * Save plan to database
   */
  private static async savePlanToDatabase(plan: ImprovementPlan): Promise<void> {
    try {
      const { error } = await supabase
        .from('improvement_plans')
        .insert({
          id: plan.id,
          user_id: plan.user_id,
          status: 'active',
          plan_data: JSON.stringify(plan),
          created_at: plan.created_at
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving plan to database:', error);
      throw error;
    }
  }

  /**
   * Update plan progress
   */
  private static async updatePlanProgress(userId: string): Promise<void> {
    // Implementation for updating overall plan progress
    // This would calculate completion percentage, update milestones, etc.
  }
}

export default CreditImprovementEngine;

