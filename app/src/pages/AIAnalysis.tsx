import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Zap,
  RefreshCw,
  Download,
  Share2,
  Settings,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Target
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import StrategyRecommendations from '@/components/ai/StrategyRecommendations';
import { AIStrategyEngine, StrategyAnalysisResult } from '@/lib/ai-engine';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { CreditItem, User } from '@/types';

export const AIAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<StrategyAnalysisResult | null>(null);
  const [creditItems, setCreditItems] = useState<CreditItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalysisDate, setLastAnalysisDate] = useState<Date | null>(null);

  useEffect(() => {
    loadCreditItems();
    loadLastAnalysis();
  }, [user]);

  const loadCreditItems = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('credit_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      setCreditItems(data || []);
    } catch (error) {
      console.error('Error loading credit items:', error);
      setError('Failed to load credit items');
    }
  };

  const loadLastAnalysis = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ai_analysis')
        .select('*')
        .eq('user_id', user.id)
        .eq('analysis_type', 'portfolio')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setLastAnalysisDate(new Date(data[0].created_at));
        // You could also restore the previous analysis result here if needed
      }
    } catch (error) {
      console.error('Error loading last analysis:', error);
    }
  };

  const runAnalysis = async () => {
    if (!user || creditItems.length === 0) {
      setError('No credit items found. Please upload your credit reports first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current credit score from most recent report
      const { data: reportsData } = await supabase
        .from('credit_reports')
        .select('credit_score')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const currentScore = reportsData?.[0]?.credit_score;

      // Run AI analysis
      const result = await AIStrategyEngine.analyzeAndRecommend(
        creditItems,
        user as User,
        currentScore
      );

      setAnalysisResult(result);
      setLastAnalysisDate(new Date());

      // Save analysis to database
      await saveAnalysisResult(result);

    } catch (error) {
      console.error('Analysis error:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const saveAnalysisResult = async (result: StrategyAnalysisResult) => {
    if (!user) return;

    try {
      const analysisData = {
        user_id: user.id,
        analysis_type: 'portfolio',
        analysis_data: {
          credit_analysis: result.creditAnalysis,
          estimated_impact: result.estimatedImpact,
          action_plan: result.actionPlan,
          recommendations_count: result.recommendations.length,
          priority_items_count: result.priorityItems.length
        },
        confidence_score: result.estimatedImpact.successProbability * 100,
        recommendations: result.actionPlan.map(step => step.title)
      };

      const { error } = await supabase
        .from('ai_analysis')
        .insert(analysisData);

      if (error) {
        console.error('Error saving analysis:', error);
      }
    } catch (error) {
      console.error('Error saving analysis result:', error);
    }
  };

  const handleExecuteStrategy = async (strategyId: string, itemIds: string[]) => {
    if (!user) return;

    try {
      // Create strategy execution records
      const executions = itemIds.map(itemId => ({
        user_id: user.id,
        item_id: itemId,
        strategy_id: strategyId,
        execution_status: 'pending'
      }));

      const { error } = await supabase
        .from('strategy_executions')
        .insert(executions);

      if (error) throw error;

      // Navigate to disputes page to show execution progress
      navigate('/disputes');
    } catch (error) {
      console.error('Error executing strategy:', error);
      setError('Failed to execute strategy');
    }
  };

  const handleViewDetails = (itemId: string) => {
    navigate(`/credit-reports?item=${itemId}`);
  };

  const handleDownloadReport = () => {
    if (!analysisResult) return;

    // Generate and download PDF report
    const reportData = {
      analysis: analysisResult,
      generatedAt: new Date().toISOString(),
      user: user?.email
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credit-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isAnalysisStale = () => {
    if (!lastAnalysisDate) return true;
    const daysSinceAnalysis = (Date.now() - lastAnalysisDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceAnalysis > 7; // Consider stale after 7 days
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Credit Analysis</h1>
          <p className="text-gray-600 mt-2">
            Advanced AI-powered analysis and personalized strategy recommendations
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {analysisResult && (
            <>
              <Button variant="outline" onClick={handleDownloadReport}>
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </>
          )}
          <Button 
            onClick={runAnalysis} 
            disabled={loading || creditItems.length === 0}
            className="flex items-center"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Credit Items</p>
                <p className="text-2xl font-bold text-gray-900">{creditItems.length}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Last Analysis</p>
                <p className="text-2xl font-bold text-gray-900">
                  {lastAnalysisDate ? (
                    lastAnalysisDate.toLocaleDateString()
                  ) : (
                    'Never'
                  )}
                </p>
              </div>
              <div className="flex items-center">
                {isAnalysisStale() ? (
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Analysis Status</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? 'Running' : analysisResult ? 'Complete' : 'Pending'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Stale Warning */}
      {isAnalysisStale() && !loading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your analysis is outdated or hasn't been run yet. 
            <Button variant="link" className="p-0 h-auto ml-1" onClick={runAnalysis}>
              Run a new analysis
            </Button> 
            to get the latest recommendations.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* No Credit Items Warning */}
      {creditItems.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Credit Data Found
            </h3>
            <p className="text-gray-600 mb-4">
              Upload your credit reports to get started with AI analysis and personalized recommendations.
            </p>
            <Button onClick={() => navigate('/upload')}>
              Upload Credit Reports
            </Button>
          </CardContent>
        </Card>
      )}

      {/* AI Features Overview */}
      {!analysisResult && !loading && creditItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis Features</CardTitle>
            <CardDescription>
              Our advanced AI engine provides comprehensive credit analysis and strategy recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Brain className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Smart Analysis</h3>
                <p className="text-sm text-gray-600">
                  AI analyzes your entire credit profile to identify improvement opportunities
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Personalized Strategies</h3>
                <p className="text-sm text-gray-600">
                  Get customized recommendations from our 28-strategy arsenal
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Impact Prediction</h3>
                <p className="text-sm text-gray-600">
                  Accurate predictions of score improvements and timelines
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Zap className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Automated Execution</h3>
                <p className="text-sm text-gray-600">
                  One-click strategy execution with automated dispute generation
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Risk Assessment</h3>
                <p className="text-sm text-gray-600">
                  Identifies potential risks and provides mitigation strategies
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Settings className="h-6 w-6 text-gray-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Continuous Learning</h3>
                <p className="text-sm text-gray-600">
                  AI improves recommendations based on success rates and outcomes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategy Recommendations */}
      {analysisResult && (
        <StrategyRecommendations
          analysisResult={analysisResult}
          onExecuteStrategy={handleExecuteStrategy}
          onViewDetails={handleViewDetails}
          loading={loading}
        />
      )}
    </div>
  );
};

export default AIAnalysis;

