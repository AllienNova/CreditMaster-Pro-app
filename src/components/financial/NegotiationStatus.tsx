'use client';

/**
 * Negotiation Status Component
 * 
 * Track negotiation progress and outcomes with AI-generated scripts.
 */

import { useState } from 'react';

interface NegotiationScript {
  opening: string;
  keyPoints: string[];
  counterOffers: string[];
  closing: string;
}

interface NegotiationAttempt {
  id: string;
  billId: string;
  billName: string;
  provider: string;
  currentAmount: number;
  targetAmount: number;
  status: 'pending' | 'in_progress' | 'successful' | 'failed' | 'partial';
  script?: NegotiationScript;
  outcome?: {
    newAmount: number;
    savings: number;
    notes: string;
  };
  createdAt: string;
  completedAt?: string;
}

interface NegotiationStatusProps {
  billId: string;
  billName: string;
  provider: string;
  currentAmount: number;
  onClose: () => void;
}

export default function NegotiationStatus({ 
  billId, 
  billName, 
  provider, 
  currentAmount,
  onClose 
}: NegotiationStatusProps) {
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<NegotiationScript | null>(null);
  const [showOutcomeForm, setShowOutcomeForm] = useState(false);
  const [outcome, setOutcome] = useState({
    status: 'successful' as const,
    newAmount: 0,
    notes: '',
  });

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const generateScript = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/financial/bills/${billId}/negotiate`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to generate script');
      
      const data = await response.json();
      setScript(data.data.script);
    } catch (_error) {
      // NegotiationStatus error: Error generating script
      void _error;
      alert('Failed to generate negotiation script');
    } finally {
      setLoading(false);
    }
  };

  const recordOutcome = async () => {
    setLoading(true);
    try {
      const savings = currentAmount - outcome.newAmount;
      
      const response = await fetch(`/api/financial/bills/${billId}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: outcome.status,
          newAmount: outcome.newAmount,
          savings,
          notes: outcome.notes,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to record outcome');
      
      alert('Negotiation outcome recorded successfully!');
      onClose();
    } catch (_error) {
      // NegotiationStatus error: Error recording outcome
      void _error;
      alert('Failed to record outcome');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{billName}</h2>
              <p className="text-gray-600 dark:text-slate-300">{provider} • {formatCurrency(currentAmount)}/month</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 rounded-lg transition-colors"
            >
                          </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!script && !showOutcomeForm && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Ready to Negotiate?
              </h3>
              <p className="text-gray-600 dark:text-slate-300 mb-6">
                Generate an AI-powered negotiation script tailored to your situation
              </p>
              <button
                onClick={generateScript}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-lg hover:from-blue-700 hover:to-blue-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Negotiation Script'}
              </button>
            </div>
          )}

          {/* Script Display */}
          {script && !showOutcomeForm && (
            <div className="space-y-6">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Opening Statement</h4>
                <p className="text-gray-700 dark:text-slate-200">{script.opening}</p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Key Points to Mention</h4>
                <ul className="space-y-2">
                  {script.keyPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-slate-200">
                      <span className="text-green-600 font-bold">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Counter-Offer Strategies</h4>
                <ul className="space-y-2">
                  {script.counterOffers.map((offer, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-slate-200">
                      <span className="text-yellow-600 font-bold">{idx + 1}.</span>
                      <span>{offer}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Closing Statement</h4>
                <p className="text-gray-700 dark:text-slate-200">{script.closing}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <button
                  onClick={() => setShowOutcomeForm(true)}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Record Outcome
                </button>
                <button
                  onClick={generateScript}
                  disabled={loading}
                  className="px-6 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
                >
                  Regenerate Script
                </button>
              </div>
            </div>
          )}

          {/* Outcome Form */}
          {showOutcomeForm && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Record Negotiation Outcome</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                  Outcome Status
                </label>
                <select
                  value={outcome.status}
                  onChange={(e) => setOutcome({ ...outcome, status: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="successful">Successful - Got a better rate</option>
                  <option value="partial">Partial - Some improvement</option>
                  <option value="failed">Failed - No change</option>
                </select>
              </div>

              {(outcome.status === 'successful' || outcome.status === 'partial') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    New Monthly Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400">$</span>
                    <input
                      type="number"
                      value={outcome.newAmount || ''}
                      onChange={(e) => setOutcome({ ...outcome, newAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={currentAmount.toString()}
                      min="0"
                      step="1"
                    />
                  </div>
                  {outcome.newAmount > 0 && outcome.newAmount < currentAmount && (
                    <p className="mt-2 text-sm text-green-600">
                      You'll save {formatCurrency(currentAmount - outcome.newAmount)}/month!
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={outcome.notes}
                  onChange={(e) => setOutcome({ ...outcome, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Any additional details about the negotiation..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowOutcomeForm(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
                >
                  Back to Script
                </button>
                <button
                  onClick={recordOutcome}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Outcome'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

