import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  TrendingUp, 
  Target, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  DollarSign,
  CreditCard,
  User,
  BarChart3,
  Zap,
  Trophy,
  ArrowRight,
  Info
} from 'lucide-react';
import type { ImprovementPlan, ImprovementAction, ImprovementProgress } from '@/lib/credit-improvement-engine';

interface ImprovementDashboardProps {
  userId: string;
  currentScore: number;
  improvementPlan?: ImprovementPlan;
  onGeneratePlan: () => void;
  onStartAction: (actionId: string) => void;
  onCompleteAction: (actionId: string) => void;
}

export const ImprovementDashboard: React.FC<ImprovementDashboardProps> = ({
  userId,
  currentScore,
  improvementPlan,
  onGeneratePlan,
  onStartAction,
  onCompleteAction
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [actionProgress, setActionProgress] = useState<Record<string, ImprovementProgress>>({});

  // Calculate overall progress
  const calculateOverallProgress = () => {
    if (!improvementPlan) return 0;
    
    const completedActions = Object.values(actionProgress).filter(p => p.status === 'completed').length;
    const totalActions = improvementPlan.actions.length;
    
    return totalActions > 0 ? (completedActions / totalActions) * 100 : 0;
  };

  // Get priority color
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-500';
      case 2: return 'bg-yellow-500';
      case 3: return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Get difficulty badge variant
  const getDifficultyVariant = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'default';
      case 'medium': return 'secondary';
      case 'hard': return 'destructive';
      default: return 'outline';
    }
  };

  // Get cost color
  const getCostColor = (cost: string) => {
    switch (cost) {
      case 'free': return 'text-green-600';
      case 'low': return 'text-yellow-600';
      case 'medium': return 'text-orange-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!improvementPlan) {
    return (
      <div className=\"space-y-6\">
        <Card>
          <CardHeader className=\"text-center\">
            <div className=\"mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4\">
              <TrendingUp className=\"w-8 h-8 text-blue-600\" />
            </div>
            <CardTitle className=\"text-2xl\">Ready to Improve Your Credit?</CardTitle>
            <CardDescription className=\"text-lg\">
              Get a personalized improvement plan powered by AI and real credit data
            </CardDescription>
          </CardHeader>
          <CardContent className=\"text-center space-y-4\">
            <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4 mb-6\">
              <div className=\"p-4 bg-blue-50 rounded-lg\">
                <Zap className=\"w-8 h-8 text-blue-600 mx-auto mb-2\" />
                <h3 className=\"font-semibold\">ML-Powered Analysis</h3>
                <p className=\"text-sm text-gray-600\">Real machine learning identifies your biggest opportunities</p>
              </div>
              <div className=\"p-4 bg-green-50 rounded-lg\">
                <Target className=\"w-8 h-8 text-green-600 mx-auto mb-2\" />
                <h3 className=\"font-semibold\">Personalized Actions</h3>
                <p className=\"text-sm text-gray-600\">Custom action plan based on your specific credit profile</p>
              </div>
              <div className=\"p-4 bg-purple-50 rounded-lg\">
                <BarChart3 className=\"w-8 h-8 text-purple-600 mx-auto mb-2\" />
                <h3 className=\"font-semibold\">Measurable Results</h3>
                <p className=\"text-sm text-gray-600\">Track real progress with predicted score improvements</p>
              </div>
            </div>
            <Button onClick={onGeneratePlan} size=\"lg\" className=\"w-full md:w-auto\">
              <TrendingUp className=\"w-4 h-4 mr-2\" />
              Generate My Improvement Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className=\"space-y-6\">
      {/* Header Stats */}
      <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
        <Card>
          <CardContent className=\"p-6\">
            <div className=\"flex items-center space-x-2\">
              <div className=\"p-2 bg-blue-100 rounded-lg\">
                <TrendingUp className=\"w-4 h-4 text-blue-600\" />
              </div>
              <div>
                <p className=\"text-sm font-medium text-gray-600\">Current Score</p>
                <p className=\"text-2xl font-bold\">{currentScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className=\"p-6\">
            <div className=\"flex items-center space-x-2\">
              <div className=\"p-2 bg-green-100 rounded-lg\">
                <Target className=\"w-4 h-4 text-green-600\" />
              </div>
              <div>
                <p className=\"text-sm font-medium text-gray-600\">Target Score</p>
                <p className=\"text-2xl font-bold\">{improvementPlan.target_score}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className=\"p-6\">
            <div className=\"flex items-center space-x-2\">
              <div className=\"p-2 bg-purple-100 rounded-lg\">
                <Trophy className=\"w-4 h-4 text-purple-600\" />
              </div>
              <div>
                <p className=\"text-sm font-medium text-gray-600\">Expected Increase</p>
                <p className=\"text-2xl font-bold\">
                  +{improvementPlan.total_expected_increase[0]}-{improvementPlan.total_expected_increase[1]}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className=\"p-6\">
            <div className=\"flex items-center space-x-2\">
              <div className=\"p-2 bg-orange-100 rounded-lg\">
                <Calendar className=\"w-4 h-4 text-orange-600\" />
              </div>
              <div>
                <p className=\"text-sm font-medium text-gray-600\">Timeline</p>
                <p className=\"text-2xl font-bold\">{Math.round(improvementPlan.timeline_days / 30)}mo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className=\"flex items-center space-x-2\">
            <BarChart3 className=\"w-5 h-5\" />
            <span>Overall Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className=\"space-y-4\">
            <div className=\"flex justify-between items-center\">
              <span className=\"text-sm font-medium\">Plan Completion</span>
              <span className=\"text-sm text-gray-600\">{Math.round(calculateOverallProgress())}%</span>
            </div>
            <Progress value={calculateOverallProgress()} className=\"w-full\" />
            
            <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4 mt-4\">
              <div className=\"text-center p-4 bg-green-50 rounded-lg\">
                <CheckCircle className=\"w-8 h-8 text-green-600 mx-auto mb-2\" />
                <p className=\"text-2xl font-bold text-green-600\">
                  {Object.values(actionProgress).filter(p => p.status === 'completed').length}
                </p>
                <p className=\"text-sm text-gray-600\">Completed Actions</p>
              </div>
              <div className=\"text-center p-4 bg-blue-50 rounded-lg\">
                <Clock className=\"w-8 h-8 text-blue-600 mx-auto mb-2\" />
                <p className=\"text-2xl font-bold text-blue-600\">
                  {Object.values(actionProgress).filter(p => p.status === 'in_progress').length}
                </p>
                <p className=\"text-sm text-gray-600\">In Progress</p>
              </div>
              <div className=\"text-center p-4 bg-gray-50 rounded-lg\">
                <Target className=\"w-8 h-8 text-gray-600 mx-auto mb-2\" />
                <p className=\"text-2xl font-bold text-gray-600\">
                  {Object.values(actionProgress).filter(p => p.status === 'not_started').length}
                </p>
                <p className=\"text-sm text-gray-600\">Remaining</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className=\"grid w-full grid-cols-4\">
          <TabsTrigger value=\"overview\">Overview</TabsTrigger>
          <TabsTrigger value=\"actions\">Action Plan</TabsTrigger>
          <TabsTrigger value=\"phases\">Phases</TabsTrigger>
          <TabsTrigger value=\"analysis\">ML Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value=\"overview\" className=\"space-y-6\">
          {/* Success Probability */}
          <Card>
            <CardHeader>
              <CardTitle className=\"flex items-center space-x-2\">
                <Trophy className=\"w-5 h-5\" />
                <span>Success Probability</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className=\"flex items-center space-x-4\">
                <div className=\"flex-1\">
                  <div className=\"flex justify-between mb-2\">
                    <span className=\"text-sm font-medium\">Likelihood of Success</span>
                    <span className=\"text-sm text-gray-600\">
                      {Math.round(improvementPlan.ml_analysis.success_probability * 100)}%
                    </span>
                  </div>
                  <Progress value={improvementPlan.ml_analysis.success_probability * 100} />
                </div>
                <div className=\"text-right\">
                  <p className=\"text-2xl font-bold text-green-600\">
                    {Math.round(improvementPlan.confidence_level * 100)}%
                  </p>
                  <p className=\"text-sm text-gray-600\">Confidence</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Factors */}
          {improvementPlan.ml_analysis.risk_factors.length > 0 && (
            <Alert>
              <AlertTriangle className=\"h-4 w-4\" />
              <AlertTitle>Risk Factors to Consider</AlertTitle>
              <AlertDescription>
                <ul className=\"list-disc list-inside space-y-1 mt-2\">
                  {improvementPlan.ml_analysis.risk_factors.map((risk, index) => (
                    <li key={index} className=\"text-sm\">{risk}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Top Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle>Top Improvement Opportunities</CardTitle>
              <CardDescription>Based on ML analysis of your credit profile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className=\"space-y-4\">
                {improvementPlan.ml_analysis.improvement_opportunities.slice(0, 3).map((opp, index) => (
                  <div key={index} className=\"flex items-center justify-between p-4 border rounded-lg\">
                    <div className=\"flex-1\">
                      <h4 className=\"font-semibold\">{opp.feature.replace('_', ' ')}</h4>
                      <p className=\"text-sm text-gray-600\">
                        {opp.impact_percentage.toFixed(1)}% impact on credit score
                      </p>
                    </div>
                    <div className=\"text-right\">
                      <p className=\"text-lg font-bold text-green-600\">+{opp.expected_score_increase}</p>
                      <p className=\"text-sm text-gray-600\">points</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value=\"actions\" className=\"space-y-6\">
          <div className=\"grid gap-4\">
            {improvementPlan.actions.map((action) => {
              const progress = actionProgress[action.id] || { status: 'not_started', progress_percentage: 0 };
              
              return (
                <Card key={action.id} className=\"relative\">
                  <CardHeader>
                    <div className=\"flex items-start justify-between\">
                      <div className=\"flex-1\">
                        <div className=\"flex items-center space-x-2 mb-2\">
                          <div className={`w-3 h-3 rounded-full ${getPriorityColor(action.priority)}`} />
                          <CardTitle className=\"text-lg\">{action.title}</CardTitle>
                          <Badge variant={getDifficultyVariant(action.difficulty)}>
                            {action.difficulty}
                          </Badge>
                        </div>
                        <CardDescription>{action.description}</CardDescription>
                      </div>
                      <div className=\"text-right\">
                        <p className=\"text-lg font-bold text-green-600\">
                          +{action.expectedScoreIncrease[0]}-{action.expectedScoreIncrease[1]}
                        </p>
                        <p className=\"text-sm text-gray-600\">points</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className=\"space-y-4\">
                      {/* Action Details */}
                      <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4 text-sm\">
                        <div>
                          <p className=\"font-medium text-gray-600\">Timeline</p>
                          <p>{action.timeframe}</p>
                        </div>
                        <div>
                          <p className=\"font-medium text-gray-600\">Cost</p>
                          <p className={getCostColor(action.cost)}>{action.cost}</p>
                        </div>
                        <div>
                          <p className=\"font-medium text-gray-600\">ML Impact</p>
                          <p>{Math.round(action.mlFeatureImpact * 100)}%</p>
                        </div>
                        <div>
                          <p className=\"font-medium text-gray-600\">Status</p>
                          <Badge variant={progress.status === 'completed' ? 'default' : 'secondary'}>
                            {progress.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {progress.status !== 'not_started' && (
                        <div>
                          <div className=\"flex justify-between mb-2\">
                            <span className=\"text-sm font-medium\">Progress</span>
                            <span className=\"text-sm text-gray-600\">{progress.progress_percentage}%</span>
                          </div>
                          <Progress value={progress.progress_percentage} />
                        </div>
                      )}

                      {/* Action Steps */}
                      <div>
                        <h4 className=\"font-semibold mb-2\">Action Steps:</h4>
                        <ul className=\"space-y-1\">
                          {action.steps.map((step, stepIndex) => (
                            <li key={stepIndex} className=\"flex items-start space-x-2 text-sm\">
                              <CheckCircle className=\"w-4 h-4 text-green-500 mt-0.5 flex-shrink-0\" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Warnings */}
                      {action.warnings && action.warnings.length > 0 && (
                        <Alert>
                          <Info className=\"h-4 w-4\" />
                          <AlertTitle>Important Notes</AlertTitle>
                          <AlertDescription>
                            <ul className=\"list-disc list-inside space-y-1 mt-2\">
                              {action.warnings.map((warning, index) => (
                                <li key={index} className=\"text-sm\">{warning}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Action Buttons */}
                      <div className=\"flex space-x-2\">
                        {progress.status === 'not_started' && (
                          <Button onClick={() => onStartAction(action.id)}>
                            <ArrowRight className=\"w-4 h-4 mr-2\" />
                            Start Action
                          </Button>
                        )}
                        {progress.status === 'in_progress' && (
                          <Button onClick={() => onCompleteAction(action.id)} variant=\"outline\">
                            <CheckCircle className=\"w-4 h-4 mr-2\" />
                            Mark Complete
                          </Button>
                        )}
                        {progress.status === 'completed' && (
                          <Badge variant=\"default\" className=\"px-3 py-1\">
                            <CheckCircle className=\"w-4 h-4 mr-1\" />
                            Completed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value=\"phases\" className=\"space-y-6\">
          <div className=\"space-y-6\">
            {improvementPlan.phases.map((phase, index) => (
              <Card key={phase.phase}>
                <CardHeader>
                  <CardTitle className=\"flex items-center space-x-2\">
                    <div className=\"w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center\">
                      <span className=\"text-sm font-bold text-blue-600\">{phase.phase}</span>
                    </div>
                    <span>{phase.title}</span>
                  </CardTitle>
                  <CardDescription>
                    {phase.duration_days} days • Expected increase: +{phase.expected_increase[0]}-{phase.expected_increase[1]} points
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className=\"space-y-4\">
                    <div>
                      <h4 className=\"font-semibold mb-2\">Focus Areas:</h4>
                      <div className=\"flex flex-wrap gap-2\">
                        {phase.focus_areas.map((area, areaIndex) => (
                          <Badge key={areaIndex} variant=\"secondary\">{area}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className=\"font-semibold mb-2\">Actions in this Phase:</h4>
                      <div className=\"space-y-2\">
                        {phase.actions.map((actionId) => {
                          const action = improvementPlan.actions.find(a => a.id === actionId);
                          if (!action) return null;
                          
                          return (
                            <div key={actionId} className=\"flex items-center justify-between p-3 bg-gray-50 rounded-lg\">
                              <span className=\"font-medium\">{action.title}</span>
                              <Badge variant=\"outline\">
                                +{action.expectedScoreIncrease[0]}-{action.expectedScoreIncrease[1]} pts
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value=\"analysis\" className=\"space-y-6\">
          {/* Feature Importance */}
          <Card>
            <CardHeader>
              <CardTitle>ML Feature Importance Analysis</CardTitle>
              <CardDescription>
                Based on the trained RandomForest model from Hugging Face
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className=\"space-y-4\">
                {Object.entries(improvementPlan.ml_analysis.feature_importance)
                  .sort(([,a], [,b]) => b - a)
                  .map(([feature, importance]) => (
                    <div key={feature} className=\"space-y-2\">
                      <div className=\"flex justify-between\">
                        <span className=\"font-medium\">{feature.replace('_', ' ')}</span>
                        <span className=\"text-sm text-gray-600\">{Math.round(importance * 100)}%</span>
                      </div>
                      <Progress value={importance * 100} />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Current Features */}
          <Card>
            <CardHeader>
              <CardTitle>Your Current Credit Profile</CardTitle>
              <CardDescription>ML model input features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
                {Object.entries(improvementPlan.ml_analysis.current_features).map(([feature, value]) => (
                  <div key={feature} className=\"p-4 border rounded-lg\">
                    <h4 className=\"font-semibold\">{feature.replace('_', ' ')}</h4>
                    <p className=\"text-2xl font-bold text-blue-600\">
                      {typeof value === 'number' ? 
                        (feature.includes('Income') || feature.includes('Debt') || feature.includes('Balance') ? 
                          `$${value.toLocaleString()}` : 
                          Math.round(value)
                        ) : 
                        value
                      }
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImprovementDashboard;

