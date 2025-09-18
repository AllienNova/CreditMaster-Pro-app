import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Brain, 
  TrendingUp, 
  BarChart3, 
  Target, 
  RefreshCw,
  Download,
  Calendar,
  Zap,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

// Import our dashboard components
import CreditScoreProjectionChart from '@/components/dashboard/CreditScoreProjectionChart';
import ActionPlanVisualization from '@/components/dashboard/ActionPlanVisualization';
import MLInsightsDashboard from '@/components/dashboard/MLInsightsDashboard';

// Import our ML engine
import CreditImprovementEngine from '@/lib/credit-improvement-engine';
import RealMLIntegration from '@/lib/real-ml-integration';

// Import types
import type { 
  ImprovementPlan, 
  CreditScoreProjection, 
  ImprovementProgress 
} from '@/lib/credit-improvement-engine';
import type { CreditItem, CreditReport, User } from '@/types';

interface CreditAnalyticsDashboardProps {
  user: User;
  creditItems: CreditItem[];
  creditReports: CreditReport[];
}

export const CreditAnalyticsDashboard: React.FC<CreditAnalyticsDashboardProps> = ({
  user,
  creditItems,
  creditReports
}) => {
  // State management
  const [improvementPlan, setImprovementPlan] = useState<ImprovementPlan | null>(null);
  const [scoreProjections, setScoreProjections] = useState<CreditScoreProjection[]>([]);
  const [actionProgress, setActionProgress] = useState<Record<string, ImprovementProgress>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Current credit score
  const currentScore = creditReports[0]?.credit_score || 650;
  const targetScore = 750; // Default target

  // Load existing plan or generate new one
  useEffect(() => {
    loadOrGeneratePlan();
  }, [user.id]);

  const loadOrGeneratePlan = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to load existing plan first
      const existingPlan = await CreditImprovementEngine.getCurrentPlan(user.id);
      
      if (existingPlan) {
        console.log('📋 Loaded existing improvement plan');
        setImprovementPlan(existingPlan);
        
        // Generate projections for existing plan
        const projections = await CreditImprovementEngine.generateScoreProjections(existingPlan);
        setScoreProjections(projections);
        
        // Load progress data
        await loadProgressData(existingPlan);
        
        setLastUpdated(new Date(existingPlan.created_at));
      } else {
        console.log('🚀 No existing plan found, generating new one...');
        await generateNewPlan();
      }
    } catch (err) {
      console.error('❌ Error loading/generating plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to load improvement plan');
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewPlan = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      console.log('🧠 Generating ML-powered improvement plan...');
      
      // Generate comprehensive improvement plan
      const newPlan = await CreditImprovementEngine.generateImprovementPlan(
        user,
        creditItems,
        creditReports,
        targetScore,
        180 // 6 months
      );

      setImprovementPlan(newPlan);
      console.log('✅ Improvement plan generated successfully');

      // Generate score projections
      console.log('📊 Generating score projections...');
      const projections = await CreditImprovementEngine.generateScoreProjections(newPlan);
      setScoreProjections(projections);
      console.log('✅ Score projections generated');

      // Initialize progress tracking
      const initialProgress: Record<string, ImprovementProgress> = {};
      newPlan.actions.forEach(action => {
        initialProgress[action.id] = {
          action_id: action.id,
          status: 'not_started',
          progress_percentage: 0
        };
      });
      setActionProgress(initialProgress);

      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('❌ Error generating new plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate improvement plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadProgressData = async (plan: ImprovementPlan) => {
    try {
      // In a real implementation, this would load from Supabase
      // For now, we'll simulate some progress data
      const mockProgress: Record<string, ImprovementProgress> = {};
      
      plan.actions.forEach((action, index) => {
        // Simulate some completed and in-progress actions
        const status = index < 2 ? 'completed' : 
                     index < 4 ? 'in_progress' : 
                     'not_started';
        
        const progress = status === 'completed' ? 100 :
                        status === 'in_progress' ? Math.floor(Math.random() * 80) + 20 :
                        0;

        mockProgress[action.id] = {
          action_id: action.id,
          status,
          progress_percentage: progress,
          started_date: status !== 'not_started' ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
          completed_date: status === 'completed' ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString() : undefined
        };
      });

      setActionProgress(mockProgress);
    } catch (err) {
      console.error('❌ Error loading progress data:', err);
    }
  };

  const handleRefreshAnalysis = async () => {
    await generateNewPlan();
  };

  const handleExportReport = async () => {
    if (!improvementPlan) return;

    try {
      // In a real implementation, this would generate and download a PDF report
      console.log('📄 Exporting comprehensive credit analysis report...');
      
      // For now, we'll create a simple data export
      const reportData = {
        user: user.email,
        generated_at: new Date().toISOString(),
        current_score: currentScore,
        target_score: targetScore,
        plan: improvementPlan,
        projections: scoreProjections,
        progress: actionProgress
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credit-analysis-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Report exported successfully');
    } catch (err) {
      console.error('❌ Error exporting report:', err);
    }
  };

  // Calculate key metrics
  const totalExpectedImprovement = improvementPlan ? 
    Math.round((improvementPlan.total_expected_increase[0] + improvementPlan.total_expected_increase[1]) / 2) : 0;
  
  const completedActions = Object.values(actionProgress).filter(p => p.status === 'completed').length;
  const totalActions = improvementPlan?.actions.length || 0;
  const overallProgress = totalActions > 0 ? (completedActions / totalActions) * 100 : 0;

  const planConfidence = improvementPlan?.confidence_level || 0;
  const successProbability = improvementPlan?.ml_analysis.success_probability || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Loading Credit Analysis</h3>
          <p className="text-gray-600">Analyzing your credit profile with ML algorithms...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Analysis Error</AlertTitle>
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadOrGeneratePlan}
            className="mt-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Analysis
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!improvementPlan) {
    return (
      <div className="text-center py-12">
        <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Analysis Available</h3>
        <p className="text-gray-600 mb-4">Generate your personalized credit improvement plan</p>
        <Button onClick={generateNewPlan} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating Analysis...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Generate ML Analysis
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Credit Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            ML-powered insights and projections for your credit improvement journey
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={handleRefreshAnalysis} disabled={isGenerating}>
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh Analysis
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Score</p>
                <p className="text-3xl font-bold text-blue-600">{currentScore}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expected Improvement</p>
                <p className="text-3xl font-bold text-green-600">+{totalExpectedImprovement}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Plan Progress</p>
                <p className="text-3xl font-bold text-purple-600">{Math.round(overallProgress)}%</p>
              </div>
              <Target className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Probability</p>
                <p className="text-3xl font-bold text-orange-600">{Math.round(successProbability * 100)}%</p>
              </div>
              <Zap className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Status Alert */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>ML Analysis Complete</AlertTitle>
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              Your personalized improvement plan was generated with <strong>{Math.round(planConfidence * 100)}% confidence</strong>.
              {lastUpdated && (
                <span className="text-sm text-gray-600 ml-2">
                  Last updated: {lastUpdated.toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                <Brain className="w-3 h-3 mr-1" />
                ML-Powered
              </Badge>
              <Badge variant="outline">
                <Calendar className="w-3 h-3 mr-1" />
                {improvementPlan.timeline_days} days
              </Badge>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="projections" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="projections">Score Projections</TabsTrigger>
          <TabsTrigger value="actions">Action Plan</TabsTrigger>
          <TabsTrigger value="insights">ML Insights</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="projections">
          <CreditScoreProjectionChart
            projections={scoreProjections}
            currentScore={currentScore}
            targetScore={targetScore}
          />
        </TabsContent>

        <TabsContent value="actions">
          <ActionPlanVisualization
            actions={improvementPlan.actions}
            phases={improvementPlan.phases}
            progress={actionProgress}
          />
        </TabsContent>

        <TabsContent value="insights">
          <MLInsightsDashboard
            mlAnalysis={improvementPlan.ml_analysis}
            currentScore={currentScore}
          />
        </TabsContent>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Plan Summary</CardTitle>
                <CardDescription>Key metrics from your improvement plan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Actions:</span>
                    <span className="font-semibold">{improvementPlan.actions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed Actions:</span>
                    <span className="font-semibold text-green-600">{completedActions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Timeline:</span>
                    <span className="font-semibold">{Math.round(improvementPlan.timeline_days / 30)} months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ML Confidence:</span>
                    <span className="font-semibold">{Math.round(planConfidence * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Risk Factors:</span>
                    <span className="font-semibold text-orange-600">
                      {improvementPlan.ml_analysis.risk_factors.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Next Recommended Actions</CardTitle>
                <CardDescription>High-priority actions to focus on</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {improvementPlan.actions
                    .filter(action => !actionProgress[action.id] || actionProgress[action.id].status === 'not_started')
                    .slice(0, 3)
                    .map((action, index) => (
                      <div key={action.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">Priority {action.priority}</Badge>
                          <span className="text-sm font-semibold text-green-600">
                            +{Math.round((action.expectedScoreIncrease[0] + action.expectedScoreIncrease[1]) / 2)} pts
                          </span>
                        </div>
                        <h4 className="font-medium text-sm">{action.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">{action.timeframe}</p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreditAnalyticsDashboard;

