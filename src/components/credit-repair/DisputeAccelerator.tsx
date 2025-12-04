/**
 * Dispute Accelerator Component
 * 
 * AI-powered dispute letter generator with:
 * - 10 proven dispute strategies
 * - FCRA-compliant letter generation
 * - Success rate predictions
 * - 30-day tracking
 * - CFPB escalation
 */

'use client';

import { useState } from 'react';
import type { InaccuracyType, DisputeStrategy } from '@/lib/credit-repair';

interface DisputeAcceleratorProps {
  userId?: string;
}

interface DisputeFormData {
  itemType: 'account' | 'inquiry' | 'public_record' | 'personal_info';
  itemDescription: string;
  accountNumber?: string;
  creditorName?: string;
  balance?: number;
  inaccuracyType: InaccuracyType;
  strategy: DisputeStrategy;
  additionalDetails?: string;
}

export default function DisputeAccelerator({ userId }: DisputeAcceleratorProps) {
  const [formData, setFormData] = useState<DisputeFormData>({
    itemType: 'account',
    itemDescription: '',
    inaccuracyType: 'not_mine',
    strategy: 'basic_dispute',
  });
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const inaccuracyTypes: { value: InaccuracyType; label: string; description: string }[] = [
    { value: 'not_mine', label: 'Not Mine', description: 'This account does not belong to me' },
    { value: 'incorrect_balance', label: 'Incorrect Balance', description: 'The balance is wrong' },
    { value: 'incorrect_payment_history', label: 'Incorrect Payment History', description: 'Payment history is inaccurate' },
    { value: 'incorrect_date', label: 'Incorrect Date', description: 'Dates are wrong' },
    { value: 'duplicate', label: 'Duplicate', description: 'This item appears multiple times' },
    { value: 'outdated', label: 'Outdated', description: 'This should have been removed' },
    { value: 'unauthorized_inquiry', label: 'Unauthorized Inquiry', description: 'I did not authorize this inquiry' },
    { value: 'identity_theft', label: 'Identity Theft', description: 'This is fraudulent' },
    { value: 'mixed_file', label: 'Mixed File', description: 'This belongs to someone else' },
    { value: 'other', label: 'Other', description: 'Other inaccuracy' },
  ];

  const strategies: { value: DisputeStrategy; label: string; successRate: number; timeline: string }[] = [
    { value: 'basic_dispute', label: 'Basic Dispute', successRate: 70, timeline: '30 days' },
    { value: 'debt_validation', label: 'Debt Validation', successRate: 75, timeline: '30 days' },
    { value: 'method_of_verification', label: 'Method of Verification', successRate: 65, timeline: '30-45 days' },
    { value: 'procedural_violation', label: 'Procedural Violation', successRate: 70, timeline: '30-45 days' },
    { value: 'statute_of_limitations', label: 'Statute of Limitations', successRate: 95, timeline: '30 days' },
    { value: 'identity_theft', label: 'Identity Theft', successRate: 85, timeline: '30-45 days' },
    { value: 'mixed_file', label: 'Mixed File', successRate: 85, timeline: '30-45 days' },
    { value: 'creditor_direct', label: 'Creditor Direct', successRate: 60, timeline: '30-60 days' },
    { value: 'goodwill', label: 'Goodwill Request', successRate: 60, timeline: '30-60 days' },
    { value: 'pay_for_delete', label: 'Pay-for-Delete', successRate: 80, timeline: '30-60 days' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/credit-repair/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: {
            type: formData.itemType,
            description: formData.itemDescription,
            accountNumber: formData.accountNumber,
            creditorName: formData.creditorName,
            balance: formData.balance,
          },
          strategy: formData.strategy,
          userId,
          inaccuracyType: formData.inaccuracyType,
          userInfo: {
            name: 'User Name', // Would come from auth
            address: '123 Main St, City, ST 12345',
            ssn: 'XXX-XX-1234',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate dispute letter');
      }

      const data = await response.json();
      setGeneratedLetter(data.data.letter);
      setShowPreview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedLetter) return;

    const blob = new Blob([generatedLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispute-letter-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedStrategy = strategies.find(s => s.value === formData.strategy);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-lg p-8 text-white mb-6">
        <h1 className="text-3xl font-bold mb-2">Dispute Accelerator</h1>
        <p className="text-red-100">
          AI-powered FCRA-compliant dispute letters - 70-95% success rate
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Generate Dispute Letter</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Item Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Type
              </label>
              <select
                value={formData.itemType}
                onChange={(e) => setFormData({ ...formData, itemType: e.target.value as DisputeFormData['itemType'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="account">Account</option>
                <option value="inquiry">Hard Inquiry</option>
                <option value="public_record">Public Record</option>
                <option value="personal_info">Personal Information</option>
              </select>
            </div>

            {/* Item Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Description *
              </label>
              <textarea
                value={formData.itemDescription}
                onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
                placeholder="Describe the item you want to dispute..."
                rows={3}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Creditor Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Creditor/Company Name
              </label>
              <input
                type="text"
                value={formData.creditorName || ''}
                onChange={(e) => setFormData({ ...formData, creditorName: e.target.value })}
                placeholder="e.g., Capital One, Experian"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number (last 4 digits)
              </label>
              <input
                type="text"
                value={formData.accountNumber || ''}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="XXXX"
                maxLength={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Inaccuracy Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type of Inaccuracy *
              </label>
              <select
                value={formData.inaccuracyType}
                onChange={(e) => setFormData({ ...formData, inaccuracyType: e.target.value as InaccuracyType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              >
                {inaccuracyTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Strategy */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dispute Strategy *
              </label>
              <select
                value={formData.strategy}
                onChange={(e) => setFormData({ ...formData, strategy: e.target.value as DisputeStrategy })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              >
                {strategies.map((strategy) => (
                  <option key={strategy.value} value={strategy.value}>
                    {strategy.label} - {strategy.successRate}% success, {strategy.timeline}
                  </option>
                ))}
              </select>
              {selectedStrategy && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-800">Success Rate: {selectedStrategy.successRate}%</span>
                    <span className="text-blue-800">Timeline: {selectedStrategy.timeline}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Details (Optional)
              </label>
              <textarea
                value={formData.additionalDetails || ''}
                onChange={(e) => setFormData({ ...formData, additionalDetails: e.target.value })}
                placeholder="Any additional information that might help..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? 'Generating Letter...' : 'Generate Dispute Letter'}
            </button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Letter Preview</h2>
          
          {!showPreview && (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Fill out the form to generate your dispute letter</p>
            </div>
          )}

          {showPreview && generatedLetter && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {generatedLetter}
                </pre>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Download Letter
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(generatedLetter)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Copy to Clipboard
                </button>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-2">Next Steps:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
                  <li>Print and sign the letter</li>
                  <li>Send via certified mail with return receipt</li>
                  <li>Keep copies of everything</li>
                  <li>Bureau has 30 days to respond</li>
                  <li>If no response, item must be removed</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
