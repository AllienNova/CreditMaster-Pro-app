import React, { useState, useEffect } from 'react';
import {
  Brain,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Calendar,
  Star,
  Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import type { 
  StrategyAnalysisResult, 
  ActionStep, 
  CreditItem, 
  StrategyRecommendation,
  ScoreFactor,
  ImprovementOpportunity,
  RiskFactor
} from '@/types';
import { cn, formatCurrency } from '@/lib/utils';

interface StrategyRecommendationsProps {
  analysisResult: StrategyAnalysisResult;
  onExecuteStrategy: (strategyId: string, itemIds: string[]) => void;
  onViewDetails: (itemId: string) => void;
  loading?: boolean;
}

export const StrategyRecommendations: React.FC<StrategyRecommendationsProps> = ({
  analysisResult,
  onExecuteStrategy,
  onViewDetails,
  loading = false
}) => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getImpactColor = (impact: 'positive' | 'negative' | 'neutral') => {
    switch (impact) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      case 'neutral': return 'text-gray-600';
    }
  };

  const getDifficultyIcon = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'hard': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              AI Analysis in Progress
            </h3>
            <p className="text-gray-600">
              Our advanced AI is analyzing your credit profile and generating personalized strategies...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              +{analysisResult.estimatedImpact.scoreIncrease}
            </div>
            <p className="text-sm text-gray-600">Potential Score Increase</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {analysisResult.estimatedImpact.timeframe}
            </div>
            <p className="text-sm text-gray-600">Estimated Timeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {analysisResult.priorityItems.length}
            </div>
            <p className="text-sm text-gray-600">Priority Items</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <BarChart3 className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(analysisResult.estimatedImpact.successProbability * 100)}%
            </div>
            <p className="text-sm text-gray-600">Success Probability</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            AI Strategy Analysis
          </CardTitle>
          <CardDescription>
            Comprehensive analysis and personalized recommendations for your credit profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="action-plan">Action Plan</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="recommendations">Strategies</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Credit Score Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Credit Score Factors</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysisResult.creditAnalysis.score_factors.map((factor, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{factor.factor}</span>
                          <Badge variant="outline" className={getImpactColor(factor.impact)}>
                            {factor.impact}
                          </Badge>
                        </div>
                        <Progress 
                          value={factor.weight * 100} 
                          className="h-2"
                        />
                        <p className="text-xs text-gray-600">{factor.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Improvement Opportunities */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Improvement Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysisResult.creditAnalysis.improvement_opportunities.map((opportunity, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{opportunity.opportunity}</h4>
                          <div className="flex items-center space-x-2">
                            {getDifficultyIcon(opportunity.difficulty)}
                            <Badge variant="secondary">
                              +{opportunity.potential_impact} pts
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Timeline: {opportunity.timeline}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {opportunity.strategies.map((strategy, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {strategy.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Risk Factors */}
              {analysisResult.creditAnalysis.risk_factors.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Risk Factors Identified:</strong>
                    <ul className="mt-2 space-y-1">
                      {analysisResult.creditAnalysis.risk_factors.map((risk, index) => (
                        <li key={index} className="text-sm">
                          • {risk.risk}: {risk.description}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* Action Plan Tab */}
            <TabsContent value="action-plan" className="space-y-4">
              <div className="space-y-4">
                {analysisResult.actionPlan.map((step, index) => (
                  <Card key={step.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleStepExpansion(step.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">
                                  {index + 1}
                                </span>
                              </div>
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{step.title}</h3>
                              <p className="text-sm text-gray-600">
                                {step.targetItems.length} item(s) • {step.estimatedDuration}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getPriorityColor(step.priority)}>
                              {step.priority}
                            </Badge>
                            <Badge variant="outline">
                              {step.successRate.toFixed(0)}% success
                            </Badge>
                            <ArrowRight 
                              className={cn(
                                "h-4 w-4 transition-transform",
                                expandedSteps.has(step.id) && "rotate-90"
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {expandedSteps.has(step.id) && (
                        <div className="border-t bg-gray-50 p-4">
                          <div className="space-y-4">
                            <p className="text-sm text-gray-700">{step.description}</p>
                            
                            <div>
                              <h4 className="text-sm font-medium mb-2">Target Items:</h4>
                              <div className="space-y-2">
                                {step.targetItems.map((item) => (
                                  <div 
                                    key={item.id}
                                    className="flex items-center justify-between p-2 bg-white rounded border"
                                  >
                                    <div>
                                      <span className="font-medium">{item.creditor}</span>
                                      <span className="text-sm text-gray-600 ml-2">
                                        {item.item_type} • {item.payment_status}
                                      </span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onViewDetails(item.id)}
                                    >
                                      View Details
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {step.dependencies.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">Dependencies:</h4>
                                <p className="text-sm text-gray-600">
                                  This step should be executed after: {step.dependencies.join(', ')}
                                </p>
                              </div>
                            )}

                            <div className="flex justify-end">
                              <Button
                                onClick={() => onExecuteStrategy(
                                  step.strategy.id,
                                  step.targetItems.map(item => item.id)
                                )}
                                className="flex items-center"
                              >
                                <Zap className="h-4 w-4 mr-2" />
                                Execute Strategy
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Analysis Tab */}
            <TabsContent value="analysis" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Score Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Current Credit Profile</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-6">
                      <div className="text-4xl font-bold text-gray-900 mb-2">
                        {analysisResult.creditAnalysis.overall_score}
                      </div>
                      <p className="text-gray-600">Current Estimated Score</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Priority Items</span>
                        <span className="font-medium">{analysisResult.priorityItems.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Improvement Opportunities</span>
                        <span className="font-medium">
                          {analysisResult.creditAnalysis.improvement_opportunities.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Risk Factors</span>
                        <span className="font-medium">
                          {analysisResult.creditAnalysis.risk_factors.length}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Projected Improvement */}
                <Card>
                  <CardHeader>
                    <CardTitle>Projected Improvement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-6">
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        {analysisResult.creditAnalysis.overall_score + analysisResult.estimatedImpact.scoreIncrease}
                      </div>
                      <p className="text-gray-600">Projected Score</p>
                      <div className="flex items-center justify-center mt-2">
                        <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-green-600 font-medium">
                          +{analysisResult.estimatedImpact.scoreIncrease} points
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Success Probability</span>
                        <span className="font-medium">
                          {Math.round(analysisResult.estimatedImpact.successProbability * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Estimated Timeline</span>
                        <span className="font-medium">{analysisResult.estimatedImpact.timeframe}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Strategies Recommended</span>
                        <span className="font-medium">{analysisResult.actionPlan.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline Estimate */}
              <Card>
                <CardHeader>
                  <CardTitle>Timeline Estimate</CardTitle>
                  <CardDescription>
                    AI-generated timeline: {analysisResult.creditAnalysis.timeline_estimate}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Timeline estimates are based on historical success rates and the complexity of your credit profile. 
                      Individual results may vary based on creditor responses and market conditions.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-4">
              <div className="grid gap-4">
                {analysisResult.recommendations.slice(0, 10).map((recommendation, index) => (
                  <Card key={`${recommendation.strategyId}-${recommendation.itemId}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium">
                              {ADVANCED_STRATEGIES.find(s => s.id === recommendation.strategyId)?.name || recommendation.strategyId}
                            </h3>
                            <Badge variant="outline">
                              Tier {ADVANCED_STRATEGIES.find(s => s.id === recommendation.strategyId)?.tier || 'N/A'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <span className="text-sm text-gray-600">Success Rate:</span>
                              <div className="flex items-center">
                                <Progress 
                                  value={recommendation.successProbability * 100} 
                                  className="h-2 flex-1 mr-2"
                                />
                                <span className="text-sm font-medium">
                                  {Math.round(recommendation.successProbability * 100)}%
                                </span>
                              </div>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">Impact Score:</span>
                              <div className="flex items-center">
                                <Progress 
                                  value={recommendation.impactScore * 100} 
                                  className="h-2 flex-1 mr-2"
                                />
                                <span className="text-sm font-medium">
                                  {Math.round(recommendation.impactScore * 100)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            {recommendation.reasoning.map((reason, idx) => (
                              <p key={idx} className="text-xs text-gray-600">• {reason}</p>
                            ))}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onExecuteStrategy(recommendation.strategyId, [recommendation.itemId])}
                        >
                          Execute
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default StrategyRecommendations;

