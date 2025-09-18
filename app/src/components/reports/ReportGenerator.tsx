import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  BarChart3,
  FileCheck,
  Mail,
  Share2,
  Settings,
  Eye,
  Clock,
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { DocumentGenerator, DocumentGenerationOptions, ReportData } from '@/lib/document-generator';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import type { 
  CreditItem, 
  DisputeExecution, 
  Strategy, 
  CreditReport,
  StrategyAnalysisResult,
  User
} from '@/types';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  type: 'analysis' | 'dispute' | 'monthly' | 'strategy' | 'legal';
  estimatedPages: number;
  generationTime: string;
}

export const ReportGenerator: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [generationOptions, setGenerationOptions] = useState<DocumentGenerationOptions>({
    includeCharts: true,
    includeTimeline: true,
    includeStrategies: true,
    includeLetters: false,
    watermark: 'CreditMaster Pro',
    customBranding: true
  });
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'comprehensive_analysis',
      name: 'Comprehensive Credit Analysis',
      description: 'Complete credit profile analysis with AI recommendations and action plan',
      icon: <BarChart3 className="h-5 w-5" />,
      type: 'analysis',
      estimatedPages: 12,
      generationTime: '2-3 minutes'
    },
    {
      id: 'dispute_summary',
      name: 'Dispute Activity Summary',
      description: 'Summary of all dispute activities, success rates, and outcomes',
      icon: <FileCheck className="h-5 w-5" />,
      type: 'dispute',
      estimatedPages: 6,
      generationTime: '1-2 minutes'
    },
    {
      id: 'monthly_progress',
      name: 'Monthly Progress Report',
      description: 'Monthly summary of credit improvements and dispute progress',
      icon: <Calendar className="h-5 w-5" />,
      type: 'monthly',
      estimatedPages: 4,
      generationTime: '1 minute'
    },
    {
      id: 'strategy_effectiveness',
      name: 'Strategy Effectiveness Report',
      description: 'Analysis of strategy performance and success rates',
      icon: <Target className="h-5 w-5" />,
      type: 'strategy',
      estimatedPages: 8,
      generationTime: '2 minutes'
    },
    {
      id: 'legal_documentation',
      name: 'Legal Documentation Package',
      description: 'Complete legal documentation for disputes and correspondence',
      icon: <FileText className="h-5 w-5" />,
      type: 'legal',
      estimatedPages: 15,
      generationTime: '3-4 minutes'
    }
  ];

  useEffect(() => {
    if (user) {
      loadReportData();
    }
  }, [user]);

  const loadReportData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load all necessary data for reports
      const [
        creditReportsResult,
        creditItemsResult,
        disputesResult,
        strategiesResult,
        analysisResult
      ] = await Promise.all([
        supabase.from('credit_reports').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('credit_items').select('*').eq('user_id', user.id),
        supabase.from('strategy_executions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('strategies').select('*'),
        supabase.from('ai_analysis').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1)
      ]);

      const data: ReportData = {
        user: user as User,
        creditReports: creditReportsResult.data || [],
        creditItems: creditItemsResult.data || [],
        disputes: disputesResult.data || [],
        strategies: strategiesResult.data || [],
        analysisResult: analysisResult.data?.[0]?.analysis_data || null,
        generatedAt: new Date().toISOString()
      };

      setReportData(data);
    } catch (error) {
      console.error('Error loading report data:', error);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!reportData || !selectedTemplate) return;

    try {
      setLoading(true);
      setError(null);
      setGenerationProgress(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      let blob: Blob;

      switch (selectedTemplate) {
        case 'comprehensive_analysis':
          blob = await DocumentGenerator.generateCreditAnalysisReport(reportData, generationOptions);
          break;
        case 'monthly_progress':
          blob = await DocumentGenerator.generateMonthlyReport(user!.id, selectedMonth, generationOptions);
          break;
        case 'strategy_effectiveness':
          blob = await DocumentGenerator.generateStrategyReport(reportData.strategies, reportData.disputes);
          break;
        default:
          throw new Error('Unsupported report template');
      }

      clearInterval(progressInterval);
      setGenerationProgress(100);

      // Download the generated report
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTemplate}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Save generation record
      await saveGenerationRecord(selectedTemplate);

    } catch (error) {
      console.error('Error generating report:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setLoading(false);
      setGenerationProgress(0);
    }
  };

  const saveGenerationRecord = async (templateId: string) => {
    if (!user) return;

    try {
      await supabase.from('report_generations').insert({
        user_id: user.id,
        template_id: templateId,
        generation_options: generationOptions,
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Failed to save generation record:', error);
    }
  };

  const handlePreviewReport = () => {
    setShowPreview(true);
  };

  const getReportStats = () => {
    if (!reportData) return { totalItems: 0, negativeItems: 0, disputes: 0, successRate: 0 };

    const totalItems = reportData.creditItems.length;
    const negativeItems = reportData.creditItems.filter(item => 
      ['collection', 'charge_off', 'late_payment'].includes(item.item_type)
    ).length;
    const disputes = reportData.disputes.length;
    const successfulDisputes = reportData.disputes.filter(d => d.success === true).length;
    const successRate = disputes > 0 ? Math.round((successfulDisputes / disputes) * 100) : 0;

    return { totalItems, negativeItems, disputes, successRate };
  };

  const stats = getReportStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Report Generator</h2>
          <p className="text-gray-600">Generate comprehensive credit analysis and dispute reports</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Email Report
          </Button>
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share
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
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Negative Items</p>
                <p className="text-2xl font-bold text-red-600">{stats.negativeItems}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Disputes</p>
                <p className="text-2xl font-bold text-purple-600">{stats.disputes}</p>
              </div>
              <FileCheck className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{stats.successRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="options">Generation Options</TabsTrigger>
          <TabsTrigger value="history">Generation History</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Report Template</CardTitle>
              <CardDescription>
                Choose from our professional report templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportTemplates.map((template) => (
                  <Card 
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate === template.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {template.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {template.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">
                            {template.description}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{template.estimatedPages} pages</span>
                            <span>{template.generationTime}</span>
                          </div>
                          <Badge 
                            variant="outline" 
                            className="mt-2"
                          >
                            {template.type}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Generation Controls */}
          {selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle>Generate Report</CardTitle>
                <CardDescription>
                  {reportTemplates.find(t => t.id === selectedTemplate)?.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Monthly Report Date Selection */}
                  {selectedTemplate === 'monthly_progress' && (
                    <div>
                      <Label htmlFor="month-select">Select Month</Label>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => {
                            const date = subMonths(new Date(), i);
                            const value = format(date, 'yyyy-MM');
                            const label = format(date, 'MMMM yyyy');
                            return (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Generation Progress */}
                  {loading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Generating report...</span>
                        <span className="text-sm font-medium">{generationProgress}%</span>
                      </div>
                      <Progress value={generationProgress} className="h-2" />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3">
                    <Button 
                      onClick={handleGenerateReport}
                      disabled={loading || !reportData}
                      className="flex items-center"
                    >
                      {loading ? (
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {loading ? 'Generating...' : 'Generate PDF'}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={handlePreviewReport}
                      disabled={loading}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Options Tab */}
        <TabsContent value="options" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generation Options</CardTitle>
              <CardDescription>
                Customize your report content and formatting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Content Options */}
              <div>
                <h4 className="font-medium mb-3">Content Options</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-charts"
                      checked={generationOptions.includeCharts}
                      onCheckedChange={(checked) => 
                        setGenerationOptions(prev => ({ ...prev, includeCharts: checked as boolean }))
                      }
                    />
                    <Label htmlFor="include-charts">Include Charts and Graphs</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-timeline"
                      checked={generationOptions.includeTimeline}
                      onCheckedChange={(checked) => 
                        setGenerationOptions(prev => ({ ...prev, includeTimeline: checked as boolean }))
                      }
                    />
                    <Label htmlFor="include-timeline">Include Timeline Analysis</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-strategies"
                      checked={generationOptions.includeStrategies}
                      onCheckedChange={(checked) => 
                        setGenerationOptions(prev => ({ ...prev, includeStrategies: checked as boolean }))
                      }
                    />
                    <Label htmlFor="include-strategies">Include Strategy Recommendations</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-letters"
                      checked={generationOptions.includeLetters}
                      onCheckedChange={(checked) => 
                        setGenerationOptions(prev => ({ ...prev, includeLetters: checked as boolean }))
                      }
                    />
                    <Label htmlFor="include-letters">Include Dispute Letters</Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Branding Options */}
              <div>
                <h4 className="font-medium mb-3">Branding Options</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="custom-branding"
                      checked={generationOptions.customBranding}
                      onCheckedChange={(checked) => 
                        setGenerationOptions(prev => ({ ...prev, customBranding: checked as boolean }))
                      }
                    />
                    <Label htmlFor="custom-branding">Include CreditMaster Pro Branding</Label>
                  </div>
                  
                  <div>
                    <Label htmlFor="watermark">Watermark Text</Label>
                    <Input
                      id="watermark"
                      value={generationOptions.watermark || ''}
                      onChange={(e) => 
                        setGenerationOptions(prev => ({ ...prev, watermark: e.target.value }))
                      }
                      placeholder="Enter watermark text"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generation History</CardTitle>
              <CardDescription>
                View your previously generated reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Generated Yet</h3>
                <p className="text-gray-600 mb-4">
                  Generate your first report to see it appear here.
                </p>
                <Button onClick={() => document.querySelector('[value="templates"]')?.click()}>
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Preview</DialogTitle>
            <DialogDescription>
              Preview of your selected report template
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <Eye className="h-4 w-4" />
              <AlertDescription>
                This is a preview of the report structure. The actual PDF will contain your real data and professional formatting.
              </AlertDescription>
            </Alert>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-bold text-lg mb-4">
                {reportTemplates.find(t => t.id === selectedTemplate)?.name}
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Cover Page</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex justify-between">
                  <span>Executive Summary</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex justify-between">
                  <span>Credit Profile Overview</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                {generationOptions.includeCharts && (
                  <div className="flex justify-between">
                    <span>Charts and Analytics</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                )}
                {generationOptions.includeStrategies && (
                  <div className="flex justify-between">
                    <span>Strategy Recommendations</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                )}
                {generationOptions.includeTimeline && (
                  <div className="flex justify-between">
                    <span>Timeline Analysis</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Action Plan</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex justify-between">
                  <span>Legal Disclaimers</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportGenerator;

