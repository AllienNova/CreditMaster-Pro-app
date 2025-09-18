import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload as UploadIcon,
  FileText,
  Brain,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Zap,
  Shield,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import FileUpload, { UploadedFile } from '@/components/upload/FileUpload';
import { CreditReportParser, ParsedCreditReport } from '@/lib/credit-parser';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { v4 as uuidv4 } from 'uuid';

interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
}

export const Upload: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResults, setProcessingResults] = useState<ParsedCreditReport[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const newFiles: UploadedFile[] = files.map(file => ({
      file,
      id: uuidv4(),
      status: 'uploading',
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setError(null);

    // Process each file
    for (const uploadedFile of newFiles) {
      await processFile(uploadedFile);
    }
  }, []);

  const processFile = async (uploadedFile: UploadedFile) => {
    try {
      // Update file status to processing
      updateFileStatus(uploadedFile.id, 'processing', 25);

      // Initialize processing steps
      const steps: ProcessingStep[] = [
        {
          id: 'upload',
          title: 'File Upload',
          description: 'Uploading file to secure storage',
          status: 'completed',
          progress: 100
        },
        {
          id: 'parse',
          title: 'Document Parsing',
          description: 'Extracting text and data from document',
          status: 'processing',
          progress: 0
        },
        {
          id: 'analyze',
          title: 'AI Analysis',
          description: 'Analyzing credit data and identifying items',
          status: 'pending',
          progress: 0
        },
        {
          id: 'save',
          title: 'Data Storage',
          description: 'Saving parsed data to your account',
          status: 'pending',
          progress: 0
        }
      ];

      setProcessingSteps(steps);
      setIsProcessing(true);

      // Step 1: Upload file to Supabase Storage
      updateFileStatus(uploadedFile.id, 'processing', 50);
      const filePath = `credit-reports/${user!.id}/${uploadedFile.id}-${uploadedFile.file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, uploadedFile.file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Step 2: Parse the document
      updateProcessingStep('parse', 'processing', 25);
      updateFileStatus(uploadedFile.id, 'processing', 60);

      const parsedReport = await CreditReportParser.parseFile(uploadedFile.file);
      
      updateProcessingStep('parse', 'completed', 100);
      updateFileStatus(uploadedFile.id, 'processing', 75);

      // Step 3: AI Analysis (simulate for now)
      updateProcessingStep('analyze', 'processing', 0);
      
      // Simulate AI processing time
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 200));
        updateProcessingStep('analyze', 'processing', i);
      }
      
      updateProcessingStep('analyze', 'completed', 100);
      updateFileStatus(uploadedFile.id, 'processing', 85);

      // Step 4: Save to database
      updateProcessingStep('save', 'processing', 0);
      
      const creditReport = {
        id: uuidv4(),
        user_id: user!.id,
        bureau: parsedReport.bureau,
        report_date: new Date().toISOString().split('T')[0],
        credit_score: parsedReport.creditScore,
        raw_data: { text: parsedReport.rawText },
        parsed_data: {
          personal_info: parsedReport.personalInfo,
          accounts: parsedReport.accounts,
          inquiries: parsedReport.inquiries,
          public_records: parsedReport.publicRecords,
          collections: parsedReport.collections
        }
      };

      // Save credit report
      const { error: reportError } = await supabase
        .from('credit_reports')
        .insert(creditReport);

      if (reportError) {
        throw new Error(`Failed to save report: ${reportError.message}`);
      }

      // Save individual credit items
      const allItems = [
        ...parsedReport.accounts,
        ...parsedReport.inquiries,
        ...parsedReport.publicRecords,
        ...parsedReport.collections
      ].map(item => ({
        ...item,
        user_id: user!.id,
        report_id: creditReport.id
      }));

      if (allItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('credit_items')
          .insert(allItems);

        if (itemsError) {
          console.warn('Some items failed to save:', itemsError);
        }
      }

      updateProcessingStep('save', 'completed', 100);
      updateFileStatus(uploadedFile.id, 'completed', 100);

      // Add to results
      setProcessingResults(prev => [...prev, parsedReport]);

    } catch (error) {
      console.error('File processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';
      
      updateFileStatus(uploadedFile.id, 'error', 0, errorMessage);
      setError(errorMessage);
      
      // Update current processing step to error
      setProcessingSteps(prev => prev.map(step => 
        step.status === 'processing' 
          ? { ...step, status: 'error' as const }
          : step
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const updateFileStatus = (
    fileId: string, 
    status: UploadedFile['status'], 
    progress: number, 
    error?: string
  ) => {
    setUploadedFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, status, progress, error }
        : file
    ));
  };

  const updateProcessingStep = (
    stepId: string, 
    status: ProcessingStep['status'], 
    progress: number
  ) => {
    setProcessingSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, progress }
        : step
    ));
  };

  const handleFileRemove = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  const handleViewResults = () => {
    navigate('/credit-reports');
  };

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Upload Credit Reports
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload your credit reports from Experian, Equifax, and TransUnion. 
          Our AI will automatically analyze them and identify opportunities for improvement.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Zap className="h-8 w-8 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Instant Processing</h3>
            <p className="text-sm text-gray-600">
              Advanced AI processes your reports in seconds, not hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="h-8 w-8 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Bank-Level Security</h3>
            <p className="text-sm text-gray-600">
              Your data is encrypted and stored with enterprise-grade security
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Brain className="h-8 w-8 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Smart Analysis</h3>
            <p className="text-sm text-gray-600">
              AI identifies the best strategies for your specific situation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UploadIcon className="h-5 w-5 mr-2" />
            Upload Your Credit Reports
          </CardTitle>
          <CardDescription>
            Drag and drop your credit report files or click to browse. 
            Supports PDF, Word documents, text files, and images.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUpload
            onFilesSelected={handleFilesSelected}
            onFileRemove={handleFileRemove}
            uploadedFiles={uploadedFiles}
            maxFiles={6}
            maxSize={10 * 1024 * 1024} // 10MB
          />
        </CardContent>
      </Card>

      {/* Processing Steps */}
      {processingSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Status</CardTitle>
            <CardDescription>
              Real-time progress of your credit report analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {processingSteps.map((step, index) => (
                <div key={step.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStepIcon(step)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {step.title}
                      </h4>
                      <Badge
                        variant={
                          step.status === 'completed' ? 'default' :
                          step.status === 'error' ? 'destructive' :
                          step.status === 'processing' ? 'secondary' : 'outline'
                        }
                      >
                        {step.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      {step.description}
                    </p>
                    {step.status === 'processing' && (
                      <Progress value={step.progress} className="h-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {processingResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Processing Complete
            </CardTitle>
            <CardDescription>
              Your credit reports have been successfully analyzed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {processingResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {result.bureau.charAt(0).toUpperCase() + result.bureau.slice(1)} Credit Report
                      </h4>
                      <p className="text-sm text-gray-600">
                        Credit Score: {result.creditScore > 0 ? result.creditScore : 'Not detected'}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {result.confidence}% Confidence
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Accounts:</span>
                      <span className="ml-2 font-medium">{result.accounts.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Inquiries:</span>
                      <span className="ml-2 font-medium">{result.inquiries.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Collections:</span>
                      <span className="ml-2 font-medium">{result.collections.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Public Records:</span>
                      <span className="ml-2 font-medium">{result.publicRecords.length}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-center pt-4">
                <Button onClick={handleViewResults} className="flex items-center">
                  View Detailed Results
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>Where to get your credit reports:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Experian: <a href="https://www.experian.com" className="text-blue-600 hover:underline">experian.com</a></li>
              <li>Equifax: <a href="https://www.equifax.com" className="text-blue-600 hover:underline">equifax.com</a></li>
              <li>TransUnion: <a href="https://www.transunion.com" className="text-blue-600 hover:underline">transunion.com</a></li>
              <li>Free Annual Reports: <a href="https://www.annualcreditreport.com" className="text-blue-600 hover:underline">annualcreditreport.com</a></li>
            </ul>
            <p className="mt-3">
              <strong>Supported file formats:</strong> PDF, Word documents (.doc, .docx), text files (.txt), and images (JPG, PNG)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Upload;

