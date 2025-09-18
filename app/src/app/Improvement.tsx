import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { ImprovementDashboard } from '@/components/improvement/ImprovementDashboard';
import { CreditImprovementEngine } from '@/lib/credit-improvement-engine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import type { ImprovementPlan, ImprovementProgress } from '@/lib/credit-improvement-engine';
import type { CreditItem, CreditReport } from '@/types';

export const Improvement: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [improvementPlan, setImprovementPlan] = useState<ImprovementPlan | null>(null);
  const [creditItems, setCreditItems] = useState<CreditItem[]>([]);
  const [creditReports, setCreditReports] = useState<CreditReport[]>([]);
  const [currentScore, setCurrentScore] = useState<number>(650);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load credit reports
      const { data: reports, error: reportsError } = await supabase
        .from('credit_reports')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      // Load credit items
      const { data: items, error: itemsError } = await supabase
        .from('credit_items')
        .select('*')
        .eq('user_id', user!.id);

      if (itemsError) throw itemsError;

      // Load existing improvement plan
      const existingPlan = await CreditImprovementEngine.getCurrentPlan(user!.id);

      setCreditReports(reports || []);
      setCreditItems(items || []);
      setCurrentScore(reports?.[0]?.credit_score || 650);
      setImprovementPlan(existingPlan);

    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load your credit data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateImprovementPlan = async () => {
    if (!user) return;

    try {
      setGenerating(true);
      setError(null);

      // Check if user has credit data
      if (creditReports.length === 0) {
        setError('Please upload your credit reports first to generate an improvement plan.');
        return;
      }

      // Generate new improvement plan
      const newPlan = await CreditImprovementEngine.generateImprovementPlan(
        user,
        creditItems,
        creditReports,
        undefined, // Use default target score
        180 // 6 months timeline
      );

      setImprovementPlan(newPlan);

    } catch (err) {
      console.error('Error generating improvement plan:', err);
      setError('Failed to generate improvement plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleStartAction = async (actionId: string) => {
    if (!user) return;

    try {
      await CreditImprovementEngine.trackProgress(user.id, actionId, {
        status: 'in_progress',
        started_date: new Date().toISOString(),
        progress_percentage: 0
      });

      // Refresh plan data
      await loadUserData();

    } catch (err) {
      console.error('Error starting action:', err);
      setError('Failed to start action. Please try again.');
    }
  };

  const handleCompleteAction = async (actionId: string) => {
    if (!user) return;

    try {
      await CreditImprovementEngine.trackProgress(user.id, actionId, {
        status: 'completed',
        completed_date: new Date().toISOString(),
        progress_percentage: 100
      });

      // Refresh plan data
      await loadUserData();

    } catch (err) {
      console.error('Error completing action:', err);
      setError('Failed to complete action. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className=\"flex items-center justify-center min-h-[400px]\">
        <div className=\"text-center space-y-4\">
          <Loader2 className=\"w-8 h-8 animate-spin mx-auto\" />
          <p className=\"text-gray-600\">Loading your credit improvement data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className=\"space-y-6\">
        <Alert variant=\"destructive\">
          <AlertCircle className=\"h-4 w-4\" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle>Unable to Load Improvement Plan</CardTitle>
            <CardDescription>
              There was an issue loading your credit improvement data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className=\"space-y-4\">
              <p className=\"text-gray-600\">
                To generate a personalized improvement plan, you need:
              </p>
              <ul className=\"list-disc list-inside space-y-2 text-sm text-gray-600\">
                <li>At least one credit report uploaded</li>
                <li>Credit items analyzed and processed</li>
                <li>Valid user profile information</li>
              </ul>
              <div className=\"flex space-x-4\">
                <Button onClick={loadUserData} variant=\"outline\">
                  Try Again
                </Button>
                <Button onClick={() => window.location.href = '/upload'}>
                  Upload Credit Reports
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className=\"space-y-6\">
      {/* Page Header */}
      <div className=\"flex items-center justify-between\">
        <div>
          <h1 className=\"text-3xl font-bold tracking-tight\">Credit Score Improvement</h1>
          <p className=\"text-gray-600\">
            AI-powered personalized plan to boost your credit score
          </p>
        </div>
        
        {improvementPlan && (
          <Button onClick={generateImprovementPlan} disabled={generating} variant=\"outline\">
            {generating ? (
              <>
                <Loader2 className=\"w-4 h-4 mr-2 animate-spin\" />
                Generating...
              </>
            ) : (
              <>
                <TrendingUp className=\"w-4 h-4 mr-2\" />
                Regenerate Plan
              </>
            )}
          </Button>
        )}
      </div>

      {/* ML-Powered Notice */}
      <Alert>
        <TrendingUp className=\"h-4 w-4\" />
        <AlertDescription>
          <strong>Powered by Real Machine Learning:</strong> Your improvement plan is generated using a trained RandomForest model 
          from Hugging Face, analyzing 7 key credit factors with proven feature importance weights.
        </AlertDescription>
      </Alert>

      {/* Main Dashboard */}
      <ImprovementDashboard
        userId={user!.id}
        currentScore={currentScore}
        improvementPlan={improvementPlan}
        onGeneratePlan={generateImprovementPlan}
        onStartAction={handleStartAction}
        onCompleteAction={handleCompleteAction}
      />

      {/* Additional Information */}
      {improvementPlan && (
        <Card>
          <CardHeader>
            <CardTitle>How This Plan Was Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
              <div>
                <h4 className=\"font-semibold mb-2\">ML Model Analysis</h4>
                <ul className=\"space-y-1 text-sm text-gray-600\">
                  <li>• RandomForest model trained on 50,000+ credit profiles</li>
                  <li>• 7 key features analyzed with statistical importance</li>
                  <li>• {Math.round(improvementPlan.confidence_level * 100)}% confidence level</li>
                  <li>• Real feature importance weights applied</li>
                </ul>
              </div>
              <div>
                <h4 className=\"font-semibold mb-2\">Personalization Factors</h4>
                <ul className=\"space-y-1 text-sm text-gray-600\">
                  <li>• Your current credit profile and history</li>
                  <li>• Debt-to-income ratio and utilization</li>
                  <li>• Payment behavior patterns</li>
                  <li>• Credit mix and account diversity</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Improvement;

