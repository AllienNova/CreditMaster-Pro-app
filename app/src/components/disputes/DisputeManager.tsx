import React, { useState, useEffect } from 'react';
import {
  FileText,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Download,
  Plus,
  Filter,
  Search,
  Calendar,
  Mail,
  Phone,
  Globe,
  RefreshCw,
  Target,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import type { 
  DisputeExecution, 
  CreditItem, 
  Strategy, 
  DisputeLetter,
  DisputeResponse 
} from '@/types';
import { cn, formatDate, formatCurrency } from '@/lib/utils';

interface DisputeManagerProps {
  disputes: DisputeExecution[];
  creditItems: CreditItem[];
  strategies: Strategy[];
  onCreateDispute: (itemId: string, strategyId: string) => void;
  onViewLetter: (letterId: string) => void;
  onUpdateResponse: (disputeId: string, response: DisputeResponse) => void;
  onExecuteDispute: (disputeId: string) => void;
  loading?: boolean;
}

export const DisputeManager: React.FC<DisputeManagerProps> = ({
  disputes,
  creditItems,
  strategies,
  onCreateDispute,
  onViewLetter,
  onUpdateResponse,
  onExecuteDispute,
  loading = false
}) => {
  const [selectedTab, setSelectedTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDispute, setSelectedDispute] = useState<DisputeExecution | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newDisputeItem, setNewDisputeItem] = useState('');
  const [newDisputeStrategy, setNewDisputeStrategy] = useState('');

  // Filter disputes based on search and filters
  const filteredDisputes = disputes.filter(dispute => {
    const matchesSearch = searchTerm === '' || 
      dispute.creditor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.dispute_reason?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || dispute.execution_status === statusFilter;
    
    const matchesTab = selectedTab === 'all' || 
      (selectedTab === 'active' && ['pending', 'executing'].includes(dispute.execution_status)) ||
      (selectedTab === 'completed' && dispute.execution_status === 'completed') ||
      (selectedTab === 'failed' && dispute.execution_status === 'failed');
    
    return matchesSearch && matchesStatus && matchesTab;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'executing': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'executing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBureauInfo = (bureau: string) => {
    const bureauData = {
      experian: { name: 'Experian', color: 'bg-blue-500', phone: '1-888-397-3742' },
      equifax: { name: 'Equifax', color: 'bg-red-500', phone: '1-866-349-5191' },
      transunion: { name: 'TransUnion', color: 'bg-green-500', phone: '1-800-916-8800' }
    };
    return bureauData[bureau as keyof typeof bureauData] || bureauData.experian;
  };

  const calculateDaysRemaining = (expectedDate: string) => {
    const expected = new Date(expectedDate);
    const now = new Date();
    const diffTime = expected.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleCreateDispute = () => {
    if (newDisputeItem && newDisputeStrategy) {
      onCreateDispute(newDisputeItem, newDisputeStrategy);
      setShowCreateDialog(false);
      setNewDisputeItem('');
      setNewDisputeStrategy('');
    }
  };

  const getDisputeProgress = (dispute: DisputeExecution) => {
    switch (dispute.execution_status) {
      case 'pending': return 25;
      case 'executing': return 50;
      case 'completed': return 100;
      case 'failed': return 100;
      default: return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dispute Management</h2>
          <p className="text-gray-600">Track and manage all your credit disputes</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Dispute
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Dispute</DialogTitle>
              <DialogDescription>
                Select a credit item and strategy to create a new dispute
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Credit Item</label>
                <Select value={newDisputeItem} onValueChange={setNewDisputeItem}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select credit item" />
                  </SelectTrigger>
                  <SelectContent>
                    {creditItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.creditor} - {item.item_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Strategy</label>
                <Select value={newDisputeStrategy} onValueChange={setNewDisputeStrategy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies.map(strategy => (
                      <SelectItem key={strategy.id} value={strategy.id}>
                        {strategy.name} (Tier {strategy.tier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateDispute} className="w-full">
                Create Dispute
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Disputes</p>
                <p className="text-2xl font-bold">{disputes.length}</p>
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
                <p className="text-2xl font-bold">
                  {disputes.filter(d => ['pending', 'executing'].includes(d.execution_status)).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Successful</p>
                <p className="text-2xl font-bold">
                  {disputes.filter(d => d.execution_status === 'completed' && d.success).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">
                  {disputes.length > 0 
                    ? Math.round((disputes.filter(d => d.success).length / disputes.length) * 100)
                    : 0}%
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search disputes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="executing">Executing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Disputes List */}
      <Card>
        <CardHeader>
          <CardTitle>Disputes</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="space-y-4 mt-6">
              {filteredDisputes.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Disputes Found</h3>
                  <p className="text-gray-600 mb-4">
                    {disputes.length === 0 
                      ? "You haven't created any disputes yet."
                      : "No disputes match your current filters."
                    }
                  </p>
                  {disputes.length === 0 && (
                    <Button onClick={() => setShowCreateDialog(true)}>
                      Create Your First Dispute
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDisputes.map((dispute) => {
                    const creditItem = creditItems.find(item => item.id === dispute.item_id);
                    const strategy = strategies.find(s => s.id === dispute.strategy_id);
                    const bureauInfo = getBureauInfo(dispute.bureau || 'experian');
                    const daysRemaining = calculateDaysRemaining(dispute.expected_response_date || '');

                    return (
                      <Card key={dispute.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-3">
                                <div className={cn(
                                  "w-3 h-3 rounded-full",
                                  bureauInfo.color
                                )}></div>
                                <h3 className="font-semibold text-gray-900">
                                  {creditItem?.creditor || 'Unknown Creditor'}
                                </h3>
                                <Badge className={getStatusColor(dispute.execution_status)}>
                                  {dispute.execution_status}
                                </Badge>
                                {strategy && (
                                  <Badge variant="outline">
                                    {strategy.name}
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                  <p className="text-sm text-gray-600">Bureau</p>
                                  <p className="font-medium">{bureauInfo.name}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Dispute Reason</p>
                                  <p className="font-medium">{dispute.dispute_reason}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Expected Response</p>
                                  <p className="font-medium">
                                    {dispute.expected_response_date 
                                      ? formatDate(dispute.expected_response_date)
                                      : 'Not set'
                                    }
                                  </p>
                                  {daysRemaining > 0 && (
                                    <p className="text-xs text-gray-500">
                                      {daysRemaining} days remaining
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-gray-600">Progress</span>
                                  <span className="text-sm font-medium">
                                    {getDisputeProgress(dispute)}%
                                  </span>
                                </div>
                                <Progress value={getDisputeProgress(dispute)} className="h-2" />
                              </div>

                              {/* Timeline */}
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  Created: {formatDate(dispute.created_at)}
                                </div>
                                {dispute.started_at && (
                                  <div className="flex items-center">
                                    <Send className="h-4 w-4 mr-1" />
                                    Sent: {formatDate(dispute.started_at)}
                                  </div>
                                )}
                                {dispute.completed_at && (
                                  <div className="flex items-center">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Completed: {formatDate(dispute.completed_at)}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col space-y-2 ml-4">
                              {dispute.execution_status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => onExecuteDispute(dispute.id)}
                                  className="flex items-center"
                                >
                                  <Zap className="h-4 w-4 mr-1" />
                                  Execute
                                </Button>
                              )}
                              
                              {dispute.letter_id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onViewLetter(dispute.letter_id!)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Letter
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedDispute(dispute)}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                            </div>
                          </div>

                          {/* Success/Failure Details */}
                          {dispute.execution_status === 'completed' && (
                            <div className="mt-4 pt-4 border-t">
                              <div className="flex items-center space-x-2">
                                {dispute.success ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <AlertTriangle className="h-5 w-5 text-red-500" />
                                )}
                                <span className={cn(
                                  "font-medium",
                                  dispute.success ? "text-green-700" : "text-red-700"
                                )}>
                                  {dispute.success ? 'Dispute Successful' : 'Dispute Unsuccessful'}
                                </span>
                              </div>
                              {dispute.outcome_details && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {JSON.stringify(dispute.outcome_details)}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Next Recommended Action */}
                          {dispute.next_strategy_recommended && (
                            <Alert className="mt-4">
                              <Target className="h-4 w-4" />
                              <AlertDescription>
                                <strong>Next Recommended Action:</strong> Consider using{' '}
                                {strategies.find(s => s.id === dispute.next_strategy_recommended)?.name}
                                {' '}strategy for this item.
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dispute Details Modal */}
      {selectedDispute && (
        <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Dispute Details</DialogTitle>
              <DialogDescription>
                Complete information about this dispute
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Creditor Information</h4>
                  <p className="text-sm text-gray-600">
                    {creditItems.find(item => item.id === selectedDispute.item_id)?.creditor}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Strategy Used</h4>
                  <p className="text-sm text-gray-600">
                    {strategies.find(s => s.id === selectedDispute.strategy_id)?.name}
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="font-medium mb-2">Bureau Contact Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm">
                        {getBureauInfo(selectedDispute.bureau || 'experian').phone}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm">Dispute Department</span>
                    </div>
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm">Online Portal Available</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="font-medium mb-2">Timeline</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Created:</span>
                    <span>{formatDate(selectedDispute.created_at)}</span>
                  </div>
                  {selectedDispute.started_at && (
                    <div className="flex justify-between text-sm">
                      <span>Executed:</span>
                      <span>{formatDate(selectedDispute.started_at)}</span>
                    </div>
                  )}
                  {selectedDispute.expected_response_date && (
                    <div className="flex justify-between text-sm">
                      <span>Expected Response:</span>
                      <span>{formatDate(selectedDispute.expected_response_date)}</span>
                    </div>
                  )}
                  {selectedDispute.completed_at && (
                    <div className="flex justify-between text-sm">
                      <span>Completed:</span>
                      <span>{formatDate(selectedDispute.completed_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DisputeManager;

