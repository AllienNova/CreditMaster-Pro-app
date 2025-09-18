import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Zap
} from 'lucide-react';
import type { ImprovementAction, ImprovementPhase, ImprovementProgress } from '@/lib/credit-improvement-engine';

interface ActionPlanVisualizationProps {
  actions: ImprovementAction[];
  phases: ImprovementPhase[];
  progress?: Record<string, ImprovementProgress>;
  className?: string;
}

export const ActionPlanVisualization: React.FC<ActionPlanVisualizationProps> = ({
  actions,
  phases,
  progress = {},
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Color schemes
  const PRIORITY_COLORS = {
    1: '#EF4444', // Red for high priority
    2: '#F59E0B', // Amber for medium priority
    3: '#10B981'  // Green for low priority
  };

  const DIFFICULTY_COLORS = {
    'easy': '#10B981',   // Green
    'medium': '#F59E0B', // Amber
    'hard': '#EF4444'    // Red
  };

  const PHASE_COLORS = ['#3B82F6', '#8B5CF6', '#10B981'];

  // Prepare data for charts
  const priorityData = [1, 2, 3].map(priority => {
    const priorityActions = actions.filter(a => a.priority === priority);
    const totalImpact = priorityActions.reduce((sum, action) => 
      sum + (action.expectedScoreIncrease[0] + action.expectedScoreIncrease[1]) / 2, 0
    );
    
    return {
      priority: `Priority ${priority}`,
      count: priorityActions.length,
      impact: Math.round(totalImpact),
      color: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS]
    };
  });

  const difficultyData = ['easy', 'medium', 'hard'].map(difficulty => {
    const difficultyActions = actions.filter(a => a.difficulty === difficulty);
    return {
      difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      count: difficultyActions.length,
      color: DIFFICULTY_COLORS[difficulty as keyof typeof DIFFICULTY_COLORS]
    };
  });

  const phaseData = phases.map((phase, index) => ({
    phase: `Phase ${phase.phase}`,
    title: phase.title,
    duration: phase.duration_days,
    actions: phase.actions.length,
    minImpact: phase.expected_increase[0],
    maxImpact: phase.expected_increase[1],
    avgImpact: Math.round((phase.expected_increase[0] + phase.expected_increase[1]) / 2),
    color: PHASE_COLORS[index]
  }));

  const categoryData = actions.reduce((acc, action) => {
    const category = action.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const existing = acc.find(item => item.category === category);
    const avgImpact = (action.expectedScoreIncrease[0] + action.expectedScoreIncrease[1]) / 2;
    
    if (existing) {
      existing.count += 1;
      existing.totalImpact += avgImpact;
    } else {
      acc.push({
        category,
        count: 1,
        totalImpact: avgImpact,
        avgImpact: Math.round(avgImpact)
      });
    }
    return acc;
  }, [] as any[]);

  // Calculate overall progress
  const completedActions = Object.values(progress).filter(p => p.status === 'completed').length;
  const inProgressActions = Object.values(progress).filter(p => p.status === 'in_progress').length;
  const overallProgress = actions.length > 0 ? (completedActions / actions.length) * 100 : 0;

  // Custom tooltip components
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              <span className="font-medium">{entry.dataKey}: </span>
              {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.category || data.difficulty}</p>
          <p className="text-blue-600">
            <span className="font-medium">Count: </span>
            {data.count}
          </p>
          {data.totalImpact && (
            <p className="text-green-600">
              <span className="font-medium">Total Impact: </span>
              +{Math.round(data.totalImpact)} points
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <span>Action Plan Analytics</span>
        </CardTitle>
        <CardDescription>
          Comprehensive visualization of your improvement strategy
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="phases">Phases</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{actions.length}</div>
                <div className="text-sm text-gray-600">Total Actions</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">
                  +{Math.round(actions.reduce((sum, a) => sum + (a.expectedScoreIncrease[0] + a.expectedScoreIncrease[1]) / 2, 0))}
                </div>
                <div className="text-sm text-gray-600">Total Impact</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(phases.reduce((sum, p) => sum + p.duration_days, 0) / 30)}
                </div>
                <div className="text-sm text-gray-600">Months</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-600">{Math.round(overallProgress)}%</div>
                <div className="text-sm text-gray-600">Complete</div>
              </div>
            </div>

            {/* Priority vs Impact Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Impact by Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priorityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="priority" />
                        <YAxis />
                        <Tooltip content={<CustomBarTooltip />} />
                        <Bar dataKey="impact" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actions by Difficulty</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={difficultyData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="count"
                          label={({ difficulty, count }) => `${difficulty}: ${count}`}
                        >
                          {difficultyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Action Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {actions.slice(0, 5).map((action, index) => {
                    const actionProgress = progress[action.id];
                    const avgImpact = Math.round((action.expectedScoreIncrease[0] + action.expectedScoreIncrease[1]) / 2);
                    
                    return (
                      <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge 
                              variant="outline" 
                              style={{ backgroundColor: PRIORITY_COLORS[action.priority], color: 'white' }}
                            >
                              P{action.priority}
                            </Badge>
                            <Badge variant="secondary">{action.difficulty}</Badge>
                            <span className="font-medium text-sm">{action.title}</span>
                          </div>
                          <div className="text-xs text-gray-600">{action.timeframe}</div>
                          {actionProgress && (
                            <Progress value={actionProgress.progress_percentage} className="mt-2 h-2" />
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-green-600">+{avgImpact}</div>
                          <div className="text-xs text-gray-600">points</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="phases" className="space-y-6">
            {/* Phase Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Phase Timeline & Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={phaseData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="phase" />
                      <YAxis />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Legend />
                      <Bar dataKey="avgImpact" fill="#3B82F6" name="Expected Impact" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="duration" fill="#10B981" name="Duration (Days)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Phase Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {phases.map((phase, index) => (
                <Card key={phase.phase}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: PHASE_COLORS[index] }}
                      >
                        {phase.phase}
                      </div>
                      <span className="text-lg">{phase.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Duration:</span>
                        <span className="font-medium">{phase.duration_days} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Actions:</span>
                        <span className="font-medium">{phase.actions.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Expected Impact:</span>
                        <span className="font-medium text-green-600">
                          +{phase.expected_increase[0]}-{phase.expected_increase[1]} pts
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 block mb-2">Focus Areas:</span>
                        <div className="flex flex-wrap gap-1">
                          {phase.focus_areas.map((area, areaIndex) => (
                            <Badge key={areaIndex} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            {/* Category Impact Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Impact by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="category" type="category" width={120} />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar dataKey="totalImpact" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryData.map((category, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <h3 className="font-semibold text-lg mb-2">{category.category}</h3>
                      <div className="text-3xl font-bold text-purple-600 mb-1">
                        {category.count}
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        {category.count === 1 ? 'Action' : 'Actions'}
                      </div>
                      <div className="text-lg font-semibold text-green-600">
                        +{Math.round(category.totalImpact)} points
                      </div>
                      <div className="text-xs text-gray-600">Total Impact</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            {/* Overall Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Overall Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Plan Completion</span>
                    <span className="text-2xl font-bold text-blue-600">{Math.round(overallProgress)}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-4" />
                  
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-600">{completedActions}</div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-600">{inProgressActions}</div>
                      <div className="text-sm text-gray-600">In Progress</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-600">
                        {actions.length - completedActions - inProgressActions}
                      </div>
                      <div className="text-sm text-gray-600">Remaining</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress by Action */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Action Progress Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {actions.map((action) => {
                    const actionProgress = progress[action.id];
                    const statusColor = actionProgress?.status === 'completed' ? 'text-green-600' :
                                      actionProgress?.status === 'in_progress' ? 'text-blue-600' :
                                      'text-gray-600';
                    
                    return (
                      <div key={action.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium">{action.title}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline">P{action.priority}</Badge>
                              <Badge variant="secondary">{action.difficulty}</Badge>
                              <span className={`text-sm font-medium ${statusColor}`}>
                                {actionProgress?.status?.replace('_', ' ') || 'Not Started'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              +{Math.round((action.expectedScoreIncrease[0] + action.expectedScoreIncrease[1]) / 2)}
                            </div>
                            <div className="text-xs text-gray-600">points</div>
                          </div>
                        </div>
                        
                        {actionProgress && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{actionProgress.progress_percentage}%</span>
                            </div>
                            <Progress value={actionProgress.progress_percentage} className="h-2" />
                            
                            {actionProgress.started_date && (
                              <div className="text-xs text-gray-600">
                                Started: {new Date(actionProgress.started_date).toLocaleDateString()}
                              </div>
                            )}
                            
                            {actionProgress.completed_date && (
                              <div className="text-xs text-green-600">
                                Completed: {new Date(actionProgress.completed_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ActionPlanVisualization;

