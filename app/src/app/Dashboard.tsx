import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Gavel,
  CheckCircle,
  AlertTriangle,
  Clock,
  Target,
  Brain,
  Shield,
  CreditCard,
  Users
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { CreditItem, StrategyExecution, DashboardStats, CreditScoreHistory } from '@/types';

// Mock data for demonstration
const mockCreditScoreHistory: CreditScoreHistory[] = [
  { date: '2024-01', experian_score: 580, equifax_score: 575, transunion_score: 585 },
  { date: '2024-02', experian_score: 595, equifax_score: 590, transunion_score: 600 },
  { date: '2024-03', experian_score: 610, equifax_score: 605, transunion_score: 615 },
  { date: '2024-04', experian_score: 625, equifax_score: 620, transunion_score: 630 },
  { date: '2024-05', experian_score: 640, equifax_score: 635, transunion_score: 645 },
  { date: '2024-06', experian_score: 655, equifax_score: 650, transunion_score: 660 }
];

const mockDisputeData = [
  { name: 'Pending', value: 8, color: '#f59e0b' },
  { name: 'Investigating', value: 12, color: '#3b82f6' },
  { name: 'Resolved', value: 25, color: '#10b981' },
  { name: 'Verified', value: 5, color: '#ef4444' }
];

const mockStrategyData = [
  { strategy: 'MOV Requests', success: 85, attempts: 12 },
  { strategy: 'Debt Validation', success: 75, attempts: 8 },
  { strategy: 'Goodwill Letters', success: 45, attempts: 15 },
  { strategy: 'Section 609', success: 65, attempts: 10 },
  { strategy: 'Pay for Delete', success: 70, attempts: 6 }
];

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total_items: 0,
    disputed_items: 0,
    resolved_items: 0,
    success_rate: 0,
    credit_score_change: 0,
    active_disputes: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load credit items
      const { data: creditItems } = await supabase
        .from('credit_items')
        .select('*')
        .eq('user_id', user!.id);

      // Load strategy executions
      const { data: executions } = await supabase
        .from('strategy_executions')
        .select('*, strategies(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Calculate stats
      const totalItems = creditItems?.length || 0;
      const disputedItems = creditItems?.filter(item => item.status === 'disputed').length || 0;
      const resolvedItems = creditItems?.filter(item => item.status === 'resolved').length || 0;
      const activeDisputes = executions?.filter(exec => exec.execution_status === 'executing').length || 0;
      const successRate = disputedItems > 0 ? (resolvedItems / disputedItems) * 100 : 0;

      setStats({
        total_items: totalItems,
        disputed_items: disputedItems,
        resolved_items: resolvedItems,
        success_rate: successRate,
        credit_score_change: 75, // Mock data
        active_disputes: activeDisputes
      });

      setRecentActivity(executions || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 740) return 'text-green-600';
    if (score >= 670) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 740) return 'Excellent';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="text-blue-100 mt-1">
              Your credit repair journey is making great progress
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              +{stats.credit_score_change}
            </div>
            <div className="text-blue-100 text-sm">
              Points improved
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_items}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">Credit report items</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Disputes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active_disputes}</p>
              </div>
              <Gavel className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Clock className="h-4 w-4 text-orange-500 mr-1" />
              <span className="text-gray-500">In progress</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.success_rate.toFixed(0)}%</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-4">
              <Progress value={stats.success_rate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved Items</p>
                <p className="text-2xl font-bold text-gray-900">{stats.resolved_items}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">Successfully removed</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Score Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
              Credit Score Progress
            </CardTitle>
            <CardDescription>
              Track your credit score improvements over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockCreditScoreHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['dataMin - 20', 'dataMax + 20']} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="experian_score"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Experian"
                  />
                  <Line
                    type="monotone"
                    dataKey="equifax_score"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Equifax"
                  />
                  <Line
                    type="monotone"
                    dataKey="transunion_score"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="TransUnion"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Gavel className="h-5 w-5 mr-2 text-blue-600" />
              Dispute Status Overview
            </CardTitle>
            <CardDescription>
              Current status of all your disputes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockDisputeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {mockDisputeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {mockDisputeData.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-600" />
            Strategy Performance
          </CardTitle>
          <CardDescription>
            Success rates of different dispute strategies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockStrategyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="strategy" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="success" fill="#3b82f6" name="Success Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates on your credit repair progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {activity.execution_status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : activity.execution_status === 'executing' ? (
                        <Clock className="h-5 w-5 text-blue-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.strategies?.strategy_name || 'Strategy Execution'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Status: {activity.execution_status}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No recent activity</p>
                  <p className="text-sm text-gray-400">Upload a credit report to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to accelerate your progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Upload New Credit Report
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Brain className="h-4 w-4 mr-2" />
                Run AI Analysis
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Gavel className="h-4 w-4 mr-2" />
                Start New Dispute
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                View Strategy Recommendations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Notifications */}
      {stats.active_disputes > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {stats.active_disputes} active disputes in progress. 
            Check your disputes page for updates and next actions.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default Dashboard;

