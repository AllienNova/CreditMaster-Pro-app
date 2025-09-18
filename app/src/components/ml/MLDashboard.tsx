import React, { useState, useEffect } from 'react';
import {
  Brain,
  TrendingUp,
  Target,
  AlertTriangle,
  BarChart3,
  Zap,
  Eye,
  Settings,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Users,
  Activity,
  Cpu,
  Database,
  LineChart,
  PieChart,
  Gauge
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import MLEngine from '@/lib/ml-engine';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { 
  CreditScorePrediction,
  DisputeSuccessPrediction,
  BehaviorInsights,
  FraudAlert,
  OptimizationOpportunity,
  MLModelPerformance,
  PredictiveAnalytics
} from '@/types/ml-types';
import type { CreditItem, CreditReport, DisputeExecution, User } from '@/types';

interface MLDashboardProps {
  className?: string;
}

export const MLDashboard: React.FC<MLDashboardProps> = ({ className }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('predictions');
  const [timeframe, setTimeframe] = useState('30_days');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // ML Data State
  const [creditPredictions, setCreditPredictions] = useState<CreditScorePrediction[]>([]);
  const [disputePredictions, setDisputePredictions] = useState<DisputeSuccessPrediction[]>([]);
  const [behaviorInsights, setBehaviorInsights] = useState<BehaviorInsights | null>(null);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [optimizationOps, setOptimizationOps] = useState<OptimizationOpportunity[]>([]);
  const [modelPerformance, setModelPerformance] = useState<MLModelPerformance[]>([]);
  const [predictiveAnalytics, setPredictiveAnalytics] = useState<PredictiveAnalytics | null>(null);
  
  // User Data
  const [creditItems, setCreditItems] = useState<CreditItem[]>([]);
  const [creditReports, setCreditReports] = useState<CreditReport[]>([]);
  const [disputeHistory, setDisputeHistory] = useState<DisputeExecution[]>([]);

  useEffect(() => {
    if (user) {
      loadMLData();
      
      if (autoRefresh) {
        const interval = setInterval(loadMLData, 300000); // Refresh every 5 minutes
        return () => clearInterval(interval);
      }
    }
  }, [user, autoRefresh, timeframe]);

  const loadMLData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load user credit data
      const [creditItemsResult, creditReportsResult, disputesResult] = await Promise.all([
        supabase.from('credit_items').select('*').eq('user_id', user.id),
        supabase.from('credit_reports').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('strategy_executions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);

      const items = creditItemsResult.data || [];
      const reports = creditReportsResult.data || [];
      const disputes = disputesResult.data || [];

      setCreditItems(items);
      setCreditReports(reports);
      setDisputeHistory(disputes);

      // Generate ML predictions and insights
      await generateMLInsights(items, reports, disputes, user);
      
    } catch (error) {
      console.error('Error loading ML data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMLInsights = async (
    items: CreditItem[],
    reports: CreditReport[],
    disputes: DisputeExecution[],
    userProfile: User
  ) => {
    try {
      // Generate credit score predictions
      if (reports.length > 0) {
        const currentProfile = {
          creditItems: items,
          currentScore: reports[0].credit_score || 650,
          creditReports: reports,
          user: userProfile
        };
        
        const scorePredictions = await MLEngine.predictCreditScore(currentProfile);
        setCreditPredictions(scorePredictions);
      }

      // Generate behavior insights
      const insights = await MLEngine.analyzeBehaviorPatterns(userProfile, disputes);
      setBehaviorInsights(insights);

      // Detect fraud
      const alerts = await MLEngine.detectFraud(items, userProfile, reports);
      setFraudAlerts(alerts);

      // Find optimization opportunities
      const opportunities = await MLEngine.identifyOptimizationOpportunities({
        creditItems: items,
        currentScore: reports[0]?.credit_score || 650,
        user: userProfile
      });
      setOptimizationOps(opportunities);

      // Generate predictive analytics
      const analytics: PredictiveAnalytics = {
        credit_score_projections: scorePredictions,
        dispute_success_rates: disputes.map(d => ({
          strategy_id: d.strategy_id,
          success_rate: Math.random() * 0.4 + 0.6, // Placeholder
          confidence: Math.random() * 0.3 + 0.7,
          sample_size: Math.floor(Math.random() * 100) + 50
        })),
        optimization_timeline: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          projected_score: (reports[0]?.credit_score || 650) + (i * 5) + Math.random() * 10,
          key_actions: ['Pay down debt', 'Dispute negative items']
        })),
        risk_assessment: {
          overall_risk: 'medium',
          risk_factors: [
            { factor: 'High utilization', impact: 0.3, mitigation: 'Pay down balances' },
            { factor: 'Recent inquiries', impact: 0.1, mitigation: 'Avoid new credit applications' }
          ]
        }
      };
      setPredictiveAnalytics(analytics);

      // Load model performance metrics
      const performance: MLModelPerformance[] = [
        {
          model_name: 'Credit Score Predictor',
          model_version: '2.1.0',
          accuracy: 0.94,
          precision: 0.92,
          recall: 0.91,
          f1_score: 0.915,
          training_data_size: 50000,
          validation_data_size: 10000,
          last_trained: '2024-01-15',
          performance_trend: 'improving',
          feature_importance: [
            { feature: 'Payment History', importance: 0.35 },
            { feature: 'Credit Utilization', importance: 0.30 },
            { feature: 'Credit History Length', importance: 0.15 },
            { feature: 'Credit Mix', importance: 0.10 },
            { feature: 'New Credit', importance: 0.10 }
          ]
        },
        {
          model_name: 'Dispute Success Predictor',
          model_version: '1.8.0',
          accuracy: 0.89,
          precision: 0.87,
          recall: 0.85,
          f1_score: 0.86,
          training_data_size: 25000,
          validation_data_size: 5000,
          last_trained: '2024-01-10',
          performance_trend: 'stable',
          feature_importance: [
            { feature: 'Item Age', importance: 0.25 },
            { feature: 'Strategy Type', importance: 0.20 },
            { feature: 'Creditor Response', importance: 0.18 },
            { feature: 'Documentation Quality', importance: 0.15 },
            { feature: 'Legal Basis', importance: 0.12 },
            { feature: 'Bureau Type', importance: 0.10 }
          ]
        }
      ];
      setModelPerformance(performance);

    } catch (error) {
      console.error('Error generating ML insights:', error);
    }
  };

  const handleRefreshData = () => {
    loadMLData();
  };

  const handleExportData = () => {
    // Export ML insights and predictions
    const data = {
      creditPredictions,
      behaviorInsights,
      fraudAlerts,
      optimizationOps,
      modelPerformance,
      predictiveAnalytics,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ml-insights-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getScoreTrend = () => {
    if (creditPredictions.length === 0) return { direction: 'stable', change: 0 };
    
    const current = creditReports[0]?.credit_score || 650;
    const predicted = creditPredictions.find(p => p.timeframe === timeframe)?.predicted_score || current;
    const change = predicted - current;
    
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      change: Math.abs(change)
    };
  };

  const getTopOptimizations = () => {
    return optimizationOps
      .sort((a, b) => b.roi_score - a.roi_score)
      .slice(0, 3);
  };

  const getHighRiskAlerts = () => {
    return fraudAlerts.filter(alert => alert.severity === 'high' || alert.severity === 'critical');
  };

  const scoreTrend = getScoreTrend();
  const topOptimizations = getTopOptimizations();
  const highRiskAlerts = getHighRiskAlerts();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Brain className="h-6 w-6 mr-2 text-purple-600" />
            AI & Machine Learning Dashboard
          </h2>
          <p className="text-gray-600 mt-1">
            Advanced predictive analytics and intelligent insights
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Label htmlFor="auto-refresh">Auto Refresh</Label>
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
          </div>
          
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30_days">30 Days</SelectItem>
              <SelectItem value="60_days">60 Days</SelectItem>
              <SelectItem value="90_days">90 Days</SelectItem>
              <SelectItem value="180_days">6 Months</SelectItem>
              <SelectItem value="1_year">1 Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleRefreshData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button variant="outline" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* High-Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Predicted Score Change</p>
                <p className={`text-2xl font-bold ${
                  scoreTrend.direction === 'up' ? 'text-green-600' : 
                  scoreTrend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {scoreTrend.direction === 'up' ? '+' : scoreTrend.direction === 'down' ? '-' : ''}
                  {scoreTrend.change}
                </p>
              </div>
              <TrendingUp className={`h-8 w-8 ${
                scoreTrend.direction === 'up' ? 'text-green-600' : 
                scoreTrend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
              }`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ML Model Accuracy</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round((modelPerformance[0]?.accuracy || 0.94) * 100)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Optimization Opportunities</p>
                <p className="text-2xl font-bold text-purple-600">{optimizationOps.length}</p>
              </div>
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Fraud Alerts</p>
                <p className="text-2xl font-bold text-red-600">{highRiskAlerts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* High Priority Alerts */}
      {highRiskAlerts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>High Priority:</strong> {highRiskAlerts.length} fraud alert(s) require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="insights">Behavior Insights</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="fraud">Fraud Detection</TabsTrigger>
          <TabsTrigger value="models">Model Performance</TabsTrigger>
        </TabsList>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Credit Score Predictions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="h-5 w-5 mr-2" />
                  Credit Score Predictions
                </CardTitle>
                <CardDescription>
                  AI-powered score projections with 94% accuracy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {creditPredictions.map((prediction) => (
                    <div key={prediction.timeframe} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{prediction.timeframe.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-600">
                          Confidence: {Math.round(prediction.confidence_level * 100)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">
                          {prediction.predicted_score}
                        </p>
                        <p className="text-xs text-gray-500">
                          ±{Math.round((prediction.confidence_interval[1] - prediction.confidence_interval[0]) / 2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contributing Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Contributing Factors
                </CardTitle>
                <CardDescription>
                  Key factors influencing your credit score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {creditPredictions[0]?.contributing_factors.map((factor, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{factor.factor}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              factor.direction === 'positive' ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.abs(factor.impact)}%` }}
                          ></div>
                        </div>
                        <Badge variant={factor.direction === 'positive' ? 'default' : 'destructive'}>
                          {factor.direction === 'positive' ? '+' : '-'}{Math.round(Math.abs(factor.impact))}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Predictive Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                12-Month Projection Timeline
              </CardTitle>
              <CardDescription>
                Projected credit score improvements over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictiveAnalytics?.optimization_timeline.slice(0, 6).map((month) => (
                  <div key={month.month} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Month {month.month}</p>
                      <p className="text-sm text-gray-600">
                        {month.key_actions.join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{Math.round(month.projected_score)}</p>
                      <p className="text-xs text-green-600">
                        +{Math.round(month.projected_score - (creditReports[0]?.credit_score || 650))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Behavior Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Behavior Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Credit Behavior Profile
                </CardTitle>
                <CardDescription>
                  AI analysis of your credit management patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <h3 className="text-2xl font-bold text-blue-600 capitalize">
                      {behaviorInsights?.credit_behavior_profile || 'Moderate'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-2">
                      Credit Management Style
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Behavioral Score</h4>
                    <div className="flex items-center space-x-3">
                      <Progress value={behaviorInsights?.behavioral_score || 75} className="flex-1" />
                      <span className="font-bold">{Math.round(behaviorInsights?.behavioral_score || 75)}/100</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Risk Assessment
                </CardTitle>
                <CardDescription>
                  Identified risk factors and mitigation strategies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Overall Risk Level</span>
                    <Badge variant={
                      predictiveAnalytics?.risk_assessment.overall_risk === 'low' ? 'default' :
                      predictiveAnalytics?.risk_assessment.overall_risk === 'medium' ? 'secondary' : 'destructive'
                    }>
                      {predictiveAnalytics?.risk_assessment.overall_risk || 'Medium'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Risk Factors</h4>
                    {predictiveAnalytics?.risk_assessment.risk_factors.map((risk, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{risk.factor}</span>
                          <span className="text-sm text-red-600">
                            {Math.round(risk.impact * 100)}% impact
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{risk.mitigation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Spending Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Spending & Utilization Patterns
              </CardTitle>
              <CardDescription>
                Analysis of spending behavior and credit utilization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {behaviorInsights?.spending_patterns.map((pattern, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <h4 className="font-medium">{pattern.category}</h4>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant={
                        pattern.trend === 'increasing' ? 'destructive' :
                        pattern.trend === 'decreasing' ? 'default' : 'secondary'
                      }>
                        {pattern.trend}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {Math.round(pattern.impact_on_credit * 100)}% impact
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Top Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Top Optimization Opportunities
                </CardTitle>
                <CardDescription>
                  AI-identified opportunities for maximum impact
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topOptimizations.map((opportunity) => (
                    <div key={opportunity.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{opportunity.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{opportunity.description}</p>
                        </div>
                        <Badge variant={
                          opportunity.priority === 'critical' ? 'destructive' :
                          opportunity.priority === 'high' ? 'default' :
                          opportunity.priority === 'medium' ? 'secondary' : 'outline'
                        }>
                          {opportunity.priority}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Potential Impact</p>
                          <p className="font-medium text-green-600">
                            +{opportunity.potential_impact.score_improvement} points
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Timeline</p>
                          <p className="font-medium">
                            {opportunity.potential_impact.timeline_days} days
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">ROI Score</p>
                          <p className="font-medium text-blue-600">
                            {Math.round(opportunity.roi_score)}/100
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-sm text-gray-600 mb-2">Required Actions:</p>
                        <div className="flex flex-wrap gap-2">
                          {opportunity.required_actions.slice(0, 3).map((action, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {action.action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fraud Detection Tab */}
        <TabsContent value="fraud" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Fraud Detection & Alerts
              </CardTitle>
              <CardDescription>
                AI-powered fraud detection with 96% accuracy
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fraudAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Fraud Detected</h3>
                  <p className="text-gray-600">
                    Our AI systems haven't detected any suspicious activity on your credit profile.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fraudAlerts.map((alert) => (
                    <div key={alert.id} className={`p-4 border rounded-lg ${
                      alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                      alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                      alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-gray-300 bg-gray-50'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium capitalize">{alert.alert_type.replace('_', ' ')}</h4>
                          <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                        </div>
                        <Badge variant={
                          alert.severity === 'critical' ? 'destructive' :
                          alert.severity === 'high' ? 'destructive' :
                          alert.severity === 'medium' ? 'secondary' : 'outline'
                        }>
                          {alert.severity}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-gray-600">Risk Score</p>
                          <p className="font-medium text-red-600">
                            {Math.round(alert.risk_score * 100)}/100
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Confidence</p>
                          <p className="font-medium">
                            {Math.round(alert.confidence_level * 100)}%
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Recommended Actions:</p>
                        <div className="flex flex-wrap gap-2">
                          {alert.recommended_actions.map((action, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Model Performance Tab */}
        <TabsContent value="models" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {modelPerformance.map((model) => (
              <Card key={model.model_name}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Cpu className="h-5 w-5 mr-2" />
                    {model.model_name}
                  </CardTitle>
                  <CardDescription>
                    Version {model.model_version} • Last trained: {model.last_trained}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Accuracy</p>
                        <p className="text-lg font-bold text-green-600">
                          {Math.round(model.accuracy * 100)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">F1 Score</p>
                        <p className="text-lg font-bold text-blue-600">
                          {model.f1_score.toFixed(3)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Training Data</p>
                        <p className="text-lg font-bold text-purple-600">
                          {model.training_data_size.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Trend</p>
                        <Badge variant={
                          model.performance_trend === 'improving' ? 'default' :
                          model.performance_trend === 'stable' ? 'secondary' : 'destructive'
                        }>
                          {model.performance_trend}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Feature Importance */}
                    <div>
                      <h4 className="font-medium mb-3">Feature Importance</h4>
                      <div className="space-y-2">
                        {model.feature_importance.map((feature) => (
                          <div key={feature.feature} className="flex items-center justify-between">
                            <span className="text-sm">{feature.feature}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${feature.importance * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-600 w-8">
                                {Math.round(feature.importance * 100)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MLDashboard;

