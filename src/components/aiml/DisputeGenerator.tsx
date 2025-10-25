'use client';

import { useState } from 'react';

interface DisputeGeneratorProps {
  onGenerate?: (disputeLetter: string) => void;
}

interface UserInfo {
  name: string;
  address: string;
  accountNumber?: string;
}

export default function DisputeGenerator({ onGenerate }: DisputeGeneratorProps) {
  const [disputeReason, setDisputeReason] = useState('');
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: '',
    address: '',
    accountNumber: '',
  });
  const [additionalContext, setAdditionalContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [disputeLetter, setDisputeLetter] = useState('');
  const [complianceReview, setComplianceReview] = useState<any>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setDisputeLetter('');
    setComplianceReview(null);

    try {
      // Validate inputs
      if (!disputeReason.trim()) {
        throw new Error('Please provide a dispute reason');
      }
      if (!userInfo.name.trim() || !userInfo.address.trim()) {
        throw new Error('Please provide your name and address');
      }

      const response = await fetch('/api/disputes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creditReport: {
            accounts: [], // In real app, this would come from user's credit report
          },
          disputeReason,
          userInfo: {
            name: userInfo.name,
            address: userInfo.address,
            accountNumber: userInfo.accountNumber || undefined,
          },
          additionalContext: additionalContext || undefined,
          reviewCompliance: true,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate dispute letter');
      }

      setDisputeLetter(data.data.disputeLetter);
      setComplianceReview(data.data.complianceReview);
      
      if (onGenerate) {
        onGenerate(data.data.disputeLetter);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(disputeLetter);
    alert('Dispute letter copied to clipboard!');
  };

  const handleDownload = () => {
    const blob = new Blob([disputeLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dispute-letter.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dispute-generator">
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-3xl font-bold mb-6">AI-Powered Dispute Letter Generator</h2>
        <p className="text-gray-600 mb-8">
          Generate professional, legally compliant credit dispute letters using Claude 4.5 Sonnet
        </p>

        <div className="space-y-6">
          {/* User Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Your Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name *</label>
                <input
                  type="text"
                  value={userInfo.name}
                  onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Address *</label>
                <textarea
                  value={userInfo.address}
                  onChange={(e) => setUserInfo({ ...userInfo, address: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="123 Main St, City, ST 12345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Account Number (Optional)</label>
                <input
                  type="text"
                  value={userInfo.accountNumber}
                  onChange={(e) => setUserInfo({ ...userInfo, accountNumber: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="1234567890"
                />
              </div>
            </div>
          </div>

          {/* Dispute Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Dispute Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Dispute Reason *</label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Describe the issue you're disputing (e.g., 'Incorrect late payment on account #1234 dated 01/15/2024')"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Additional Context (Optional)</label>
                <textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Any additional information that might help (e.g., 'I have proof of payment', 'This account was paid on time')"
                />
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Generating...' : 'Generate Dispute Letter'}
          </button>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Compliance Review */}
          {complianceReview && (
            <div className={`rounded-lg p-4 ${
              complianceReview.compliant 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <h4 className="font-semibold mb-2">
                {complianceReview.compliant ? '✅ Compliant' : '⚠️ Compliance Review'}
              </h4>
              <p className="text-sm mb-2">Risk Level: {complianceReview.risk_level.toUpperCase()}</p>
              {complianceReview.issues.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm font-medium">Issues:</p>
                  <ul className="list-disc list-inside text-sm">
                    {complianceReview.issues.map((issue: string, i: number) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {complianceReview.recommendations.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Recommendations:</p>
                  <ul className="list-disc list-inside text-sm">
                    {complianceReview.recommendations.map((rec: string, i: number) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Generated Letter */}
          {disputeLetter && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Generated Dispute Letter</h3>
                <div className="space-x-2">
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Copy
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap font-sans text-sm">{disputeLetter}</pre>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Generated using Claude 4.5 Sonnet • Powered by AIML API
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

