import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Brain,
  Zap,
  Download,
  Upload,
  Settings,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Calendar,
  Target
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DisputeManager from '@/components/disputes/DisputeManager';
import { DisputeEngine, GeneratedDispute } from '@/lib/dispute-engine';
import { ADVANCED_STRATEGIES } from '@/lib/strategies';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { 
  DisputeExecution, 
  CreditItem, 
  Strategy, 
  DisputeLetter,
  DisputeResponse,
  User
} from '@/types';

export const Disputes: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [disputes, setDisputes] = useState<DisputeExecution[]>([]);
  const [creditItems, setCreditItems] = useState<CreditItem[]>([]);
  const [strategies] = useState<Strategy[]>(ADVANCED_STRATEGIES);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    if (user) {
      loadDisputes();
      loadCreditItems();
    }
  }, [user]);

  const loadDisputes = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('strategy_executions')
        .select(`
          *,
          credit_items (
            creditor,
            item_type,
            payment_status,
            balance
          ),
          strategies (
            strategy_name,
            tier,
            success_rate
          ),
          dispute_letters (
            id,
            subject,
            status
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDisputes(data || []);
    } catch (error) {
      console.error('Error loading disputes:', error);
      setError('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const handleCreateDispute = async (itemId: string, strategyId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get credit item and strategy details
      const creditItem = creditItems.find(item => item.id === itemId);
      const strategy = strategies.find(s => s.id === strategyId);

      if (!creditItem || !strategy) {
        throw new Error('Invalid credit item or strategy selected');
      }

      // Generate dispute package
      const disputePackage = await DisputeEngine.generateDispute({
        creditItem,
        strategy,
        user: user as User
      });

      // Save dispute letter to database
      const { data: letterData, error: letterError } = await supabase
        .from('dispute_letters')
        .insert({
          ...disputePackage.letter,
          id: undefined // Let database generate ID
        })
        .select()
        .single();

      if (letterError) throw letterError;

      // Save strategy execution to database
      const { data: executionData, error: executionError } = await supabase
        .from('strategy_executions')
        .insert({
          ...disputePackage.execution,
          id: undefined, // Let database generate ID
          letter_id: letterData.id
        })
        .select()
        .single();

      if (executionError) throw executionError;

      // Reload disputes
      await loadDisputes();

      // Show success message
      alert('Dispute created successfully!');
    } catch (error) {
      console.error('Error creating dispute:', error);
      setError(error instanceof Error ? error.message : 'Failed to create dispute');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteDispute = async (disputeId: string) => {
    try {
      setLoading(true);
      setError(null);

      await DisputeEngine.executeDispute(disputeId);
      
      // Reload disputes to show updated status
      await loadDisputes();

      alert('Dispute executed successfully!');
    } catch (error) {
      console.error('Error executing dispute:', error);
      setError(error instanceof Error ? error.message : 'Failed to execute dispute');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLetter = async (letterId: string) => {
    try {
      const { data, error } = await supabase
        .from('dispute_letters')
        .select('*')
        .eq('id', letterId)
        .single();

      if (error) throw error;

      // Create and download the letter as a text file
      const letterContent = `
Subject: ${data.subject}

To: ${data.recipient_name}
${data.recipient_address}

${data.content}

Legal Citations:
${data.legal_citations?.join('\n') || 'None'}

Generated on: ${new Date(data.created_at).toLocaleDateString()}
      `.trim();

      const blob = new Blob([letterContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dispute-letter-${letterId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error viewing letter:', error);
      setError('Failed to load dispute letter');
    }
  };

  const handleUpdateResponse = async (disputeId: string, response: DisputeResponse) => {
    try {
      await DisputeEngine.processDisputeResponse(disputeId, response);
      await loadDisputes();
    } catch (error) {
      console.error('Error updating dispute response:', error);
      setError('Failed to update dispute response');
    }
  };

  const getDisputeStats = () => {
    const total = disputes.length;
    const active = disputes.filter(d => ['pending', 'executing'].includes(d.execution_status)).length;
    const completed = disputes.filter(d => d.execution_status === 'completed').length;
    const successful = disputes.filter(d => d.success === true).length;
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;

    return { total, active, completed, successful, successRate };
  };

  const stats = getDisputeStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dispute Management</h1>
          <p className="text-gray-600 mt-2">
            Manage and track all your credit repair disputes
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => navigate('/ai-analysis')}>
            <Brain className="h-4 w-4 mr-2" />
            AI Analysis
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Disputes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.active}</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Successful</p>
                <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-purple-600">{stats.successRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common dispute management actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  className="h-20 flex-col"
                  onClick={() => navigate('/ai-analysis')}
                >
                  <Brain className="h-6 w-6 mb-2" />
                  Run AI Analysis
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col"
                  onClick={() => navigate('/upload')}
                >
                  <Upload className="h-6 w-6 mb-2" />
                  Upload New Reports
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col"
                  onClick={() => setSelectedTab('disputes')}
                >
                  <FileText className="h-6 w-6 mb-2" />
                  View All Disputes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest dispute updates and actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {disputes.slice(0, 5).length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Activity</h3>
                  <p className="text-gray-600 mb-4">
                    Start by running an AI analysis or creating your first dispute.
                  </p>
                  <Button onClick={() => navigate('/ai-analysis')}>
                    Get Started
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {disputes.slice(0, 5).map((dispute) => {
                    const creditItem = creditItems.find(item => item.id === dispute.item_id);
                    const strategy = strategies.find(s => s.id === dispute.strategy_id);
                    
                    return (
                      <div key={dispute.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {dispute.execution_status === 'completed' && dispute.success ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : dispute.execution_status === 'executing' ? (
                              <Zap className="h-5 w-5 text-blue-500" />
                            ) : (
                              <FileText className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {creditItem?.creditor || 'Unknown Creditor'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {strategy?.name || 'Unknown Strategy'} • {dispute.execution_status}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {new Date(dispute.created_at).toLocaleDateString()}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            {dispute.bureau || 'Experian'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips and Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Tips & Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Response Timing:</strong> Credit bureaus have 30 days to respond to disputes. 
                    Follow up if you don't receive a response within this timeframe.
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <Target className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Strategy Selection:</strong> Use our AI analysis to select the most effective 
                    strategies for your specific credit items.
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Documentation:</strong> Keep copies of all dispute letters and responses 
                    for your records and potential legal proceedings.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disputes Tab */}
        <TabsContent value="disputes">
          <DisputeManager
            disputes={disputes}
            creditItems={creditItems}
            strategies={strategies}
            onCreateDispute={handleCreateDispute}
            onViewLetter={handleViewLetter}
            onUpdateResponse={handleUpdateResponse}
            onExecuteDispute={handleExecuteDispute}
            loading={loading}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dispute Analytics</CardTitle>
              <CardDescription>
                Performance metrics and success rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Success Rate by Strategy */}
                <div>
                  <h4 className="font-medium mb-4">Success Rate by Strategy</h4>
                  <div className="space-y-3">
                    {strategies.slice(0, 5).map((strategy) => {
                      const strategyDisputes = disputes.filter(d => d.strategy_id === strategy.id);
                      const successfulDisputes = strategyDisputes.filter(d => d.success === true);
                      const successRate = strategyDisputes.length > 0 
                        ? Math.round((successfulDisputes.length / strategyDisputes.length) * 100)
                        : 0;

                      return (
                        <div key={strategy.id} className="flex items-center justify-between">
                          <span className="text-sm">{strategy.name}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${successRate}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-10">{successRate}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bureau Performance */}
                <div>
                  <h4 className="font-medium mb-4">Performance by Bureau</h4>
                  <div className="space-y-3">
                    {['experian', 'equifax', 'transunion'].map((bureau) => {
                      const bureauDisputes = disputes.filter(d => d.bureau === bureau);
                      const successfulDisputes = bureauDisputes.filter(d => d.success === true);
                      const successRate = bureauDisputes.length > 0 
                        ? Math.round((successfulDisputes.length / bureauDisputes.length) * 100)
                        : 0;

                      return (
                        <div key={bureau} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{bureau}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${successRate}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-10">{successRate}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Disputes;

