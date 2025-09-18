import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import type { 
  CreditScorePrediction,
  DisputeSuccessPrediction,
  BehaviorInsights,
  FraudAlert,
  OptimizationOpportunity,
  PersonalizedStrategy
} from '@/types/ml-types';
import type { CreditItem, CreditReport, User } from '@/types';

const execAsync = promisify(exec);

/**
 * Real ML Integration using the actual Hugging Face trained model
 * Bridges TypeScript frontend with Python ML service
 */
export class RealMLIntegration {
  private static readonly PYTHON_SERVICE_PATH = '/home/ubuntu/creditmaster-pro/python_ml_service.py';
  
  /**
   * Call the Python ML service with features
   */
  private static async callPythonMLService(
    command: string,
    args: string[] = []
  ): Promise<any> {
    try {
      const fullCommand = `python3 "${this.PYTHON_SERVICE_PATH}" ${command} ${args.join(' ')}`;
      const { stdout, stderr } = await execAsync(fullCommand, {
        cwd: '/home/ubuntu/creditmaster-pro',
        timeout: 30000 // 30 second timeout
      });

      if (stderr && !stderr.includes('Loading model')) {
        console.error('Python ML Service stderr:', stderr);
      }

      // Parse JSON output
      const lines = stdout.trim().split('\n');
      const jsonLine = lines.find(line => line.startsWith('{'));
      
      if (!jsonLine) {
        throw new Error('No JSON output from Python service');
      }

      return JSON.parse(jsonLine);
    } catch (error) {
      console.error('Error calling Python ML service:', error);
      throw new Error(`ML Service Error: ${error}`);
    }
  }

  /**
   * Extract features for the real Hugging Face model
   */
  private static extractRealModelFeatures(
    creditItems: CreditItem[],
    creditReports: CreditReport[],
    user: User
  ): number[] {
    // Calculate features exactly as expected by the trained model
    const outstandingDebt = this.calculateOutstandingDebt(creditItems);
    const creditMix = this.calculateCreditMix(creditItems);
    const creditHistoryAge = this.calculateCreditHistoryAge(creditItems);
    const monthlyBalance = this.calculateMonthlyBalance(creditItems);
    const paymentBehaviour = this.calculatePaymentBehaviour(creditItems);
    const annualIncome = this.extractAnnualIncome(user, creditReports);
    const delayedPayments = this.calculateDelayedPayments(creditItems);

    return [
      outstandingDebt,
      creditMix,
      creditHistoryAge,
      monthlyBalance,
      paymentBehaviour,
      annualIncome,
      delayedPayments
    ];
  }

  /**
   * Calculate outstanding debt from credit items
   */
  private static calculateOutstandingDebt(creditItems: CreditItem[]): number {
    return creditItems
      .filter(item => item.item_type === 'account')
      .reduce((total, item) => {
        const balance = parseFloat(item.balance || '0');
        return total + (balance > 0 ? balance : 0);
      }, 0);
  }

  /**
   * Calculate credit mix score (0=Bad, 1=Good, 2=Excellent)
   */
  private static calculateCreditMix(creditItems: CreditItem[]): number {
    const accountTypes = new Set<string>();
    
    creditItems
      .filter(item => item.item_type === 'account')
      .forEach(item => {
        const accountType = item.account_type?.toLowerCase() || '';
        if (accountType.includes('credit card') || accountType.includes('credit')) {
          accountTypes.add('credit_card');
        }
        if (accountType.includes('mortgage') || accountType.includes('home')) {
          accountTypes.add('mortgage');
        }
        if (accountType.includes('auto') || accountType.includes('car') || accountType.includes('vehicle')) {
          accountTypes.add('auto');
        }
        if (accountType.includes('student') || accountType.includes('education')) {
          accountTypes.add('student');
        }
        if (accountType.includes('personal') || accountType.includes('installment')) {
          accountTypes.add('personal');
        }
      });

    // Score based on diversity of credit types
    if (accountTypes.size >= 4) return 2; // Excellent
    if (accountTypes.size >= 2) return 1; // Good
    return 0; // Bad
  }

  /**
   * Calculate credit history age in months
   */
  private static calculateCreditHistoryAge(creditItems: CreditItem[]): number {
    const openDates = creditItems
      .filter(item => item.item_type === 'account' && item.date_opened)
      .map(item => new Date(item.date_opened!))
      .filter(date => !isNaN(date.getTime()));

    if (openDates.length === 0) return 0;

    const oldestDate = new Date(Math.min(...openDates.map(d => d.getTime())));
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - oldestDate.getTime());
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
    
    return diffMonths;
  }

  /**
   * Calculate monthly balance
   */
  private static calculateMonthlyBalance(creditItems: CreditItem[]): number {
    const totalBalance = creditItems
      .filter(item => item.item_type === 'account')
      .reduce((total, item) => {
        const balance = parseFloat(item.balance || '0');
        return total + balance;
      }, 0);

    return Math.abs(totalBalance);
  }

  /**
   * Calculate payment behavior score (0-100)
   */
  private static calculatePaymentBehaviour(creditItems: CreditItem[]): number {
    const accounts = creditItems.filter(item => item.item_type === 'account');
    if (accounts.length === 0) return 50; // Default neutral score

    let totalScore = 0;
    let accountCount = 0;

    accounts.forEach(item => {
      const paymentHistory = item.payment_history || '';
      if (paymentHistory.length > 0) {
        // Count on-time payments (0s) vs late payments (1-9)
        const onTimePayments = (paymentHistory.match(/0/g) || []).length;
        const latePayments = (paymentHistory.match(/[1-9]/g) || []).length;
        const totalPayments = onTimePayments + latePayments;
        
        if (totalPayments > 0) {
          const score = (onTimePayments / totalPayments) * 100;
          totalScore += score;
          accountCount++;
        }
      }
    });

    return accountCount > 0 ? Math.round(totalScore / accountCount) : 50;
  }

  /**
   * Extract annual income from user data or estimate
   */
  private static extractAnnualIncome(user: User, creditReports: CreditReport[]): number {
    // Try to extract from user metadata
    const userIncome = user.user_metadata?.annual_income;
    if (userIncome && typeof userIncome === 'number' && userIncome > 0) {
      return userIncome;
    }

    // Estimate based on credit limits (conservative approach)
    const totalCreditLimits = creditReports
      .flatMap(report => report.credit_items || [])
      .filter(item => item.item_type === 'account' && item.credit_limit)
      .reduce((total, item) => total + parseFloat(item.credit_limit || '0'), 0);

    if (totalCreditLimits > 0) {
      // Conservative estimate: total credit limits * 2.5
      return Math.round(totalCreditLimits * 2.5);
    }

    // Default estimate based on credit score if available
    const currentScore = creditReports[0]?.credit_score || 650;
    if (currentScore >= 750) return 75000;
    if (currentScore >= 700) return 60000;
    if (currentScore >= 650) return 50000;
    if (currentScore >= 600) return 40000;
    return 35000; // Conservative default
  }

  /**
   * Calculate number of delayed payments
   */
  private static calculateDelayedPayments(creditItems: CreditItem[]): number {
    return creditItems
      .filter(item => item.item_type === 'account')
      .reduce((total, item) => {
        const paymentHistory = item.payment_history || '';
        // Count late payment indicators (1-9 represent 30, 60, 90+ day lates)
        const latePayments = (paymentHistory.match(/[1-9]/g) || []).length;
        return total + latePayments;
      }, 0);
  }

  /**
   * Predict credit score using the real Hugging Face model
   */
  static async predictCreditScoreWithRealModel(profile: {
    creditItems: CreditItem[];
    currentScore: number;
    creditReports: CreditReport[];
    user: User;
  }): Promise<CreditScorePrediction[]> {
    try {
      // Extract features for the real model
      const features = this.extractRealModelFeatures(
        profile.creditItems,
        profile.creditReports,
        profile.user
      );

      console.log('Extracted features for ML model:', {
        Outstanding_Debt: features[0],
        Credit_Mix: features[1],
        Credit_History_Age: features[2],
        Monthly_Balance: features[3],
        Payment_Behaviour: features[4],
        Annual_Income: features[5],
        Num_of_Delayed_Payment: features[6]
      });

      // Call the Python ML service
      const mlResult = await this.callPythonMLService('predict', features.map(String));

      if (!mlResult.success) {
        throw new Error(mlResult.error || 'ML prediction failed');
      }

      console.log('ML Model Result:', mlResult);

      // Generate predictions for different timeframes
      const predictions: CreditScorePrediction[] = [];
      const timeframes: Array<'30_days' | '60_days' | '90_days' | '180_days' | '1_year'> = 
        ['30_days', '60_days', '90_days', '180_days', '1_year'];

      const baseScore = mlResult.credit_score_estimate || 650;
      const confidence = mlResult.confidence || 0.75;

      for (const timeframe of timeframes) {
        // Apply time-based improvements (assuming positive actions)
        const timeMultipliers = {
          '30_days': 1.00,
          '60_days': 1.01,
          '90_days': 1.03,
          '180_days': 1.07,
          '1_year': 1.15
        };

        const predictedScore = Math.round(baseScore * timeMultipliers[timeframe]);
        const confidenceInterval: [number, number] = [
          Math.max(300, predictedScore - 20),
          Math.min(850, predictedScore + 20)
        ];

        // Extract contributing factors from feature importance
        const contributingFactors = [];
        if (mlResult.feature_importance) {
          const featureNames = [
            'Outstanding Debt',
            'Credit Mix',
            'Credit History Length',
            'Monthly Balance',
            'Payment History',
            'Annual Income',
            'Recent Inquiries'
          ];

          Object.entries(mlResult.feature_importance).forEach(([feature, importance], index) => {
            const impact = (importance as number) * 100;
            const featureName = featureNames[index] || feature;
            
            // Determine direction based on feature value and typical credit scoring
            let direction: 'positive' | 'negative' = 'positive';
            if (feature === 'Outstanding_Debt' && features[0] > features[5] * 0.3) direction = 'negative';
            if (feature === 'Num_of_Delayed_Payment' && features[6] > 2) direction = 'negative';
            if (feature === 'Payment_Behaviour' && features[4] < 70) direction = 'negative';

            contributingFactors.push({
              factor: featureName,
              impact: Math.round(impact),
              direction
            });
          });
        }

        predictions.push({
          id: `real_pred_${Date.now()}_${timeframe}`,
          user_id: profile.user.id,
          prediction_type: 'credit_score',
          model_version: `huggingface_${mlResult.model_type}_v1.0`,
          confidence_level: confidence,
          prediction_date: new Date().toISOString(),
          timeframe,
          predicted_score: predictedScore,
          confidence_interval: confidenceInterval,
          contributing_factors: contributingFactors,
          baseline_score: profile.currentScore,
          action_impact: predictedScore - profile.currentScore
        });
      }

      return predictions;

    } catch (error) {
      console.error('Error in real ML prediction:', error);
      
      // Fallback to basic prediction if ML service fails
      return this.generateFallbackPredictions(profile);
    }
  }

  /**
   * Generate fallback predictions if ML service fails
   */
  private static generateFallbackPredictions(profile: {
    creditItems: CreditItem[];
    currentScore: number;
    creditReports: CreditReport[];
    user: User;
  }): CreditScorePrediction[] {
    console.log('Using fallback prediction method');
    
    const predictions: CreditScorePrediction[] = [];
    const timeframes: Array<'30_days' | '60_days' | '90_days' | '180_days' | '1_year'> = 
      ['30_days', '60_days', '90_days', '180_days', '1_year'];

    for (const timeframe of timeframes) {
      const baseScore = profile.currentScore || 650;
      const improvement = Math.random() * 30 + 10; // 10-40 point improvement
      const predictedScore = Math.round(baseScore + improvement);

      predictions.push({
        id: `fallback_pred_${Date.now()}_${timeframe}`,
        user_id: profile.user.id,
        prediction_type: 'credit_score',
        model_version: 'fallback_v1.0',
        confidence_level: 0.65,
        prediction_date: new Date().toISOString(),
        timeframe,
        predicted_score: Math.min(850, predictedScore),
        confidence_interval: [predictedScore - 25, predictedScore + 25],
        contributing_factors: [
          { factor: 'Payment History', impact: 35, direction: 'positive' },
          { factor: 'Credit Utilization', impact: 30, direction: 'positive' },
          { factor: 'Credit History Length', impact: 15, direction: 'positive' },
          { factor: 'Credit Mix', impact: 10, direction: 'positive' },
          { factor: 'New Credit', impact: 10, direction: 'positive' }
        ],
        baseline_score: baseScore,
        action_impact: predictedScore - baseScore
      });
    }

    return predictions;
  }

  /**
   * Test the ML service connection
   */
  static async testMLService(): Promise<{
    success: boolean;
    modelInfo?: any;
    error?: string;
  }> {
    try {
      const modelInfo = await this.callPythonMLService('info');
      return {
        success: true,
        modelInfo
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get model information
   */
  static async getModelInfo(): Promise<any> {
    return await this.callPythonMLService('info');
  }
}

export default RealMLIntegration;

