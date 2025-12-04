'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CreditScoreCard from '@/components/credit-bureau/CreditScoreCard';
import CreditReportViewer from '@/components/credit-bureau/CreditReportViewer';
import CreditReportImport from '@/components/credit-bureau/CreditReportImport';
import type { CreditReport } from '@/types/credit-bureau';

export default function CreditReportsPage() {
  const [reports, setReports] = useState<CreditReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CreditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

  // Fetch credit reports on mount
  useEffect(() => {
    void fetchReports();
  }, []);

  const fetchReports = async (preferredReportId?: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/credit-bureau/report');
      if (response.ok) {
        const data = await response.json();
        const nextReports: CreditReport[] = data.reports || [];
        setReports(nextReports);
        if (nextReports.length > 0) {
          const preferredMatch = preferredReportId
            ? nextReports.find(report => report.id === preferredReportId)
            : null;
          setSelectedReport(preferredMatch ?? nextReports[0]);
        } else {
          setSelectedReport(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportComplete = (reportId: string) => {
    setShowImport(false);
    void fetchReports(reportId);
  };

  const handleDisputeClick = (itemId: string, itemType: 'account' | 'inquiry' | 'public_record') => {
    // Navigate to dispute page or open dispute modal
    console.log('Dispute clicked:', itemId, itemType);
    // TODO: Implement dispute flow
  };

  // If no reports, show import screen
  if (!loading && reports.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-2xl font-bold gradient-text">
                CreditMaster Pro
              </Link>
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                  Dashboard
                </Link>
                <Link href="/pricing" className="text-gray-700 hover:text-gray-900">
                  Pricing
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Credit Reports</h1>
            <p className="text-lg text-gray-600">
              Import your credit reports from Experian, Equifax, or TransUnion to get started.
            </p>
          </div>

          <CreditReportImport
            onImportComplete={handleImportComplete}
            onError={(error) => console.error('Import error:', error)}
          />

          {/* Features */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure Import</h3>
              <p className="text-sm text-gray-600">
                Your credit data is encrypted and stored securely with bank-level security.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Analysis</h3>
              <p className="text-sm text-gray-600">
                Get instant AI-powered insights and recommendations to improve your credit.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Smart Disputes</h3>
              <p className="text-sm text-gray-600">
                Generate professional dispute letters with AI in seconds.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold gradient-text">
              CreditMaster Pro
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/pricing" className="text-gray-700 hover:text-gray-900">
                Pricing
              </Link>
              <button
                onClick={() => setShowImport(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Import Report
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading credit reports...</p>
          </div>
        ) : showImport ? (
          <div>
            <button
              onClick={() => setShowImport(false)}
              className="mb-6 text-blue-600 hover:text-blue-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Reports
            </button>
            <CreditReportImport
              onImportComplete={handleImportComplete}
              onError={(error) => console.error('Import error:', error)}
            />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Credit Reports</h1>
              <p className="text-lg text-gray-600">
                View and manage your credit reports from all three bureaus.
              </p>
            </div>

            {/* Credit Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {reports.map((report) => (
                <CreditScoreCard
                  key={report.id}
                  score={report.creditScore}
                  bureau={report.bureau}
                  previousScore={report.creditScore - 15} // Mock previous score
                  lastUpdated={new Date(report.reportDate)}
                  factors={{
                    positive: [
                      'On-time payment history',
                      'Low credit utilization',
                      'Long credit history',
                    ],
                    negative: [
                      '2 hard inquiries in last 6 months',
                      'High balance on credit card',
                    ],
                  }}
                />
              ))}
            </div>

            {/* Report Selector */}
            {reports.length > 1 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Report to View
                </label>
                <select
                  value={selectedReport?.id || ''}
                  onChange={(e) => {
                    const report = reports.find((r) => r.id === e.target.value);
                    setSelectedReport(report || null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {reports.map((report) => (
                    <option key={report.id} value={report.id}>
                      {report.bureau.charAt(0).toUpperCase() + report.bureau.slice(1)} -{' '}
                      {new Date(report.reportDate).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Credit Report Viewer */}
            {selectedReport && (
              <CreditReportViewer report={selectedReport} onDisputeClick={handleDisputeClick} />
            )}

            {/* AI Recommendations */}
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">🤖 AI Recommendations</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">1</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Pay down credit card balances</div>
                    <div className="text-sm text-gray-600">
                      Reducing your utilization from 45% to 30% could increase your score by 20-30 points.
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">2</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Dispute unauthorized inquiries</div>
                    <div className="text-sm text-gray-600">
                      We found 2 hard inquiries you may not recognize. Disputing them could help your score.
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">3</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Request credit limit increases</div>
                    <div className="text-sm text-gray-600">
                      Increasing your total available credit can lower your utilization ratio.
                    </div>
                  </div>
                </div>
              </div>
              <button className="mt-6 w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity">
                Get Personalized Strategy (28 Strategies Available)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
