import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Target,
  Mail,
  Share2,
  Settings,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReportGenerator from '@/components/reports/ReportGenerator';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, subMonths } from 'date-fns';
import type { CreditItem, DisputeExecution, CreditReport } from '@/types';

interface ReportMetrics {
  totalReports: number;
  recentGenerations: number;
  mostPopularTemplate: string;
  averageGenerationTime: string;
}

interface QuickStat {
  label: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportMetrics, setReportMetrics] = useState<ReportMetrics>({
    totalReports: 0,
    recentGenerations: 0,
    mostPopularTemplate: 'N/A',
    averageGenerationTime: '2 min'
  });
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadReportData();
      loadQuickStats();
      loadRecentReports();
    }
  }, [user, selectedTimeframe]);

  const loadReportData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load report generation history
      const { data: generations, error } = await supabase
        .from('report_generations')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false });

      if (error) throw error;

      // Calculate metrics
      const totalReports = generations?.length || 0;
      const recentDate = subDays(new Date(), parseInt(selectedTimeframe));
      const recentGenerations = generations?.filter(g => 
        new Date(g.generated_at) >= recentDate
      ).length || 0;

      // Find most popular template
      const templateCounts = generations?.reduce((acc, gen) => {
        acc[gen.template_id] = (acc[gen.template_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      
      const mostPopularTemplate = Object.keys(templateCounts).length > 0
        ? Object.entries(templateCounts).sort(([,a], [,b]) => b - a)[0][0]
        : 'N/A';

      setReportMetrics({
        totalReports,
        recentGenerations,
        mostPopularTemplate,
        averageGenerationTime: '2 min'
      });

    } catch (error) {
      console.error('Error loading report data:', error);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const loadQuickStats = async () => {
    if (!user) return;

    try {
      // Load credit data for stats
      const [creditItemsResult, disputesResult, reportsResult] = await Promise.all([
        supabase.from('credit_items').select('*').eq('user_id', user.id),
        supabase.from('strategy_executions').select('*').eq('user_id', user.id),
        supabase.from('credit_reports').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(2)
      ]);

      const creditItems = creditItemsResult.data || [];
      const disputes = disputesResult.data || [];
      const creditReports = reportsResult.data || [];

      // Calculate stats
      const totalItems = creditItems.length;
      const negativeItems = creditItems.filter(item => 
        ['collection', 'charge_off', 'late_payment'].includes(item.item_type)
      ).length;
      
      const totalDisputes = disputes.length;
      const successfulDisputes = disputes.filter(d => d.success === true).length;
      const successRate = totalDisputes > 0 ? Math.round((successfulDisputes / totalDisputes) * 100) : 0;

      // Score change calculation
      const scoreChange = creditReports.length >= 2 
        ? (creditReports[0].credit_score || 0) - (creditReports[1].credit_score || 0)
        : 0;

      const stats: QuickStat[] = [
        {
          label: 'Total Credit Items',
          value: totalItems,
          change: 0,
          icon: <FileText className="h-5 w-5" />,
          color: 'text-blue-600'
        },
        {
          label: 'Negative Items',
          value: negativeItems,
          change: 0,
          icon: <AlertCircle className="h-5 w-5" />,
          color: 'text-red-600'
        },
        {
          label: 'Success Rate',
          value: `${successRate}%`,
          change: 0,
          icon: <Target className="h-5 w-5" />,
          color: 'text-green-600'
        },
        {
          label: 'Score Change',
          value: scoreChange > 0 ? `+${scoreChange}` : scoreChange.toString(),
          change: scoreChange,
          icon: <TrendingUp className="h-5 w-5" />,
          color: scoreChange >= 0 ? 'text-green-600' : 'text-red-600'
        }
      ];

      setQuickStats(stats);
    } catch (error) {
      console.error('Error loading quick stats:', error);
    }
  };

  const loadRecentReports = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('report_generations')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentReports(data || []);
    } catch (error) {
      console.error('Error loading recent reports:', error);
    }
  };

  const getTemplateDisplayName = (templateId: string): string => {
    const templateNames: Record<string, string> = {
      'comprehensive_analysis': 'Comprehensive Analysis',
      'dispute_summary': 'Dispute Summary',
      'monthly_progress': 'Monthly Progress',
      'strategy_effectiveness': 'Strategy Effectiveness',
      'legal_documentation': 'Legal Documentation'
    };
    return templateNames[templateId] || templateId;
  };

  const getTemplateIcon = (templateId: string) => {
    const icons: Record<string, React.ReactNode> = {
      'comprehensive_analysis': <BarChart3 className="h-4 w-4" />,
      'dispute_summary': <CheckCircle className="h-4 w-4" />,
      'monthly_progress': <Calendar className="h-4 w-4" />,
      'strategy_effectiveness': <Target className="h-4 w-4" />,
      'legal_documentation': <FileText className="h-4 w-4" />
    };
    return icons[templateId] || <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">
            Generate comprehensive reports and track your credit repair progress
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Email Reports
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                  {stat.change !== 0 && (
                    <p className={`text-xs ${stat.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change > 0 ? '+' : ''}{stat.change} from last period
                    </p>
                  )}
                </div>
                <div className={stat.color}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900">{reportMetrics.totalReports}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recent Generations</p>
                <p className="text-2xl font-bold text-green-600">{reportMetrics.recentGenerations}</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Most Popular</p>
                <p className="text-lg font-bold text-purple-600">
                  {getTemplateDisplayName(reportMetrics.mostPopularTemplate)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Generation</p>
                <p className="text-2xl font-bold text-orange-600">{reportMetrics.averageGenerationTime}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="generator" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generator">Report Generator</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Generator Tab */}
        <TabsContent value="generator">
          <ReportGenerator />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Generation History</CardTitle>
              <CardDescription>
                View and download your previously generated reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentReports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Generated Yet</h3>
                  <p className="text-gray-600 mb-4">
                    Generate your first report to see it appear here.
                  </p>
                  <Button onClick={() => document.querySelector('[value="generator"]')?.click()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentReports.map((report) => (
                    <Card key={report.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {getTemplateIcon(report.template_id)}
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">
                                {getTemplateDisplayName(report.template_id)}
                              </h3>
                              <p className="text-sm text-gray-600">
                                Generated on {format(new Date(report.generated_at), 'PPP')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">PDF</Badge>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Share2 className="h-4 w-4 mr-1" />
                              Share
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Report Generation Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Generation Trends</CardTitle>
                <CardDescription>
                  Report generation activity over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Chart visualization will be available after generating more reports
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Template Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Template Usage</CardTitle>
                <CardDescription>
                  Most frequently used report templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Comprehensive Analysis', usage: 45, color: 'bg-blue-500' },
                    { name: 'Monthly Progress', usage: 30, color: 'bg-green-500' },
                    { name: 'Dispute Summary', usage: 15, color: 'bg-purple-500' },
                    { name: 'Strategy Effectiveness', usage: 10, color: 'bg-orange-500' }
                  ].map((template) => (
                    <div key={template.name} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{template.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`${template.color} h-2 rounded-full`}
                            style={{ width: `${template.usage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-8">{template.usage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Report generation performance statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Average Generation Time</span>
                    <span className="font-medium">2.3 minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="font-medium text-green-600">98.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Average File Size</span>
                    <span className="font-medium">2.1 MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Downloads</span>
                    <span className="font-medium">{reportMetrics.totalReports * 2}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
                <CardDescription>
                  Bulk export and sharing options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Export All Reports (ZIP)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Monthly Summary
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Report Collection
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Automated Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;

