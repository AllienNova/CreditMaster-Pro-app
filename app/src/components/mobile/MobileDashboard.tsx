import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3, 
  Target, 
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  Zap
} from 'lucide-react';

// Mobile-optimized chart components
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface MobileDashboardProps {
  className?: string;
}

const MobileDashboard: React.FC<MobileDashboardProps> = ({ className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [creditScore, setCreditScore] = useState(678);
  const [scoreChange, setScoreChange] = useState(+12);
  const [improvementProgress, setImprovementProgress] = useState(68);

  // Mock data for mobile charts
  const scoreHistory = [
    { month: 'Jan', score: 650 },
    { month: 'Feb', score: 658 },
    { month: 'Mar', score: 665 },
    { month: 'Apr', score: 672 },
    { month: 'May', score: 678 }
  ];

  const factorBreakdown = [
    { name: 'Payment History', value: 35, color: '#10B981' },
    { name: 'Credit Utilization', value: 30, color: '#3B82F6' },
    { name: 'Credit History', value: 15, color: '#8B5CF6' },
    { name: 'Credit Mix', value: 10, color: '#F59E0B' },
    { name: 'New Credit', value: 10, color: '#EF4444' }
  ];

  const quickActions = [
    { 
      id: 'upload', 
      title: 'Upload Report', 
      description: 'Add new credit report',
      icon: Plus,
      color: 'bg-blue-500',
      path: '/upload'
    },
    { 
      id: 'analyze', 
      title: 'AI Analysis', 
      description: 'Get ML insights',
      icon: Zap,
      color: 'bg-purple-500',
      path: '/ai-analysis'
    },
    { 
      id: 'dispute', 
      title: 'Start Dispute', 
      description: 'Challenge items',
      icon: Target,
      color: 'bg-green-500',
      path: '/disputes'
    },
    { 
      id: 'improve', 
      title: 'Improvement Plan', 
      description: 'View action plan',
      icon: TrendingUp,
      color: 'bg-orange-500',
      path: '/improvement'
    }
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'dispute_submitted',
      title: 'Dispute Submitted',
      description: 'Capital One - Incorrect balance',
      time: '2 hours ago',
      status: 'pending',
      icon: Clock
    },
    {
      id: 2,
      type: 'score_update',
      title: 'Score Increased',
      description: '+5 points from Experian',
      time: '1 day ago',
      status: 'success',
      icon: TrendingUp
    },
    {
      id: 3,
      type: 'action_completed',
      title: 'Action Completed',
      description: 'Paid down credit card debt',
      time: '3 days ago',
      status: 'success',
      icon: CheckCircle
    }
  ];

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
  };

  return (
    <div className={`space-y-4 pb-20 ${className}`}>
      {/* Mobile Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600">Your credit improvement journey</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Credit Score Card - Mobile Optimized */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-100 text-sm font-medium">Current Credit Score</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-bold">{creditScore}</span>
                <div className="flex items-center space-x-1">
                  {scoreChange > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-300" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-300" />
                  )}
                  <span className={`text-sm font-medium ${
                    scoreChange > 0 ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {scoreChange > 0 ? '+' : ''}{scoreChange}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-xs">This Month</p>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Good
              </Badge>
            </div>
          </div>

          {/* Mini Score History Chart */}
          <div className="h-16 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scoreHistory}>
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#ffffff" 
                  strokeWidth={2}
                  fill="rgba(255,255,255,0.2)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Improvement Progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Improvement Progress</CardTitle>
            <Badge variant="outline">{improvementProgress}% Complete</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={improvementProgress} className="mb-3" />
          <div className="flex justify-between text-sm text-gray-600">
            <span>Target: 750</span>
            <span>Est. 3 months</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Grid */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card key={action.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{action.title}</p>
                      <p className="text-xs text-gray-500 truncate">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Key Metrics - Mobile Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mx-auto mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">12</p>
            <p className="text-xs text-gray-600">Items Removed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mx-auto mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">5</p>
            <p className="text-xs text-gray-600">Active Disputes</p>
          </CardContent>
        </Card>
      </div>

      {/* Credit Factors - Mobile Pie Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Credit Score Factors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            {/* Mini Pie Chart */}
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={factorBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={40}
                    dataKey="value"
                  >
                    {factorBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-2">
              {factorBreakdown.slice(0, 3).map((factor) => (
                <div key={factor.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: factor.color }}
                    />
                    <span className="text-gray-700 text-xs">{factor.name}</span>
                  </div>
                  <span className="font-medium text-xs">{factor.value}%</span>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="text-xs p-0 h-auto">
                View All Factors <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs p-0 h-auto">
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentActivity.map((activity) => {
            const Icon = activity.icon;
            return (
              <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${activity.status === 'success' ? 'bg-green-100' : 
                    activity.status === 'pending' ? 'bg-yellow-100' : 'bg-gray-100'}
                `}>
                  <Icon className={`w-4 h-4 ${
                    activity.status === 'success' ? 'text-green-600' : 
                    activity.status === 'pending' ? 'text-yellow-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-600 truncate">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Next Steps Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm text-gray-900 mb-1">Next Recommended Action</h4>
              <p className="text-xs text-gray-600 mb-2">
                Pay down your Capital One card to below 30% utilization for a potential +15 point increase.
              </p>
              <Button size="sm" className="text-xs">
                Take Action
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileDashboard;

