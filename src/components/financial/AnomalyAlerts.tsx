'use client';

/**
 * Anomaly Alerts Component
 * 
 * Displays unusual spending pattern notifications with explanations and actions.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface Anomaly {
  id: string;
  type: 'unusual_amount' | 'unusual_frequency' | 'unusual_merchant' | 'unusual_category' | 'unusual_time';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  merchant: string;
  amount: number;
  expectedAmount: number;
  deviation: number;
  confidence: number;
  explanation: string;
  suggestions: string[];
  detectedAt: string;
  transactionId?: string;
}

interface AnomalyAlertsProps {
  timeRange?: '7d' | '30d' | '90d';
}

export default function AnomalyAlerts({ timeRange = '30d' }: AnomalyAlertsProps) {
  const { user } = useAuth();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'critical'>('all');

  const fetchAnomalies = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/financial/spending/anomalies?timeRange=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch anomalies');
      
      const data = await response.json();
      setAnomalies(data.data || []);
    } catch (error) {
      console.error('Error fetching anomalies:', error);
    } finally {
      setLoading(false);
    }
  }, [user, timeRange]);

  useEffect(() => {
    void fetchAnomalies();
  }, [fetchAnomalies]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'low': return 'bg-blue-100 border-blue-300 text-blue-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string): string => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '📊';
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'unusual_amount': return 'Unusual Amount';
      case 'unusual_frequency': return 'Unusual Frequency';
      case 'unusual_merchant': return 'New Merchant';
      case 'unusual_category': return 'Unusual Category';
      case 'unusual_time': return 'Unusual Time';
      default: return type;
    }
  };

  const filteredAnomalies = anomalies.filter(anomaly => {
    if (filter === 'all') return true;
    return anomaly.severity === filter;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          <h3 className="text-lg font-semibold text-gray-900">Anomaly Detection</h3>
          {filteredAnomalies.length > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              {filteredAnomalies.length}
            </span>
          )}
        </div>
        
        {/* Filter */}
        <div className="flex items-center gap-2">
          {['all', 'high', 'critical'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Anomalies List */}
      {filteredAnomalies.length > 0 ? (
        <div className="space-y-4">
          {filteredAnomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className={`p-4 rounded-lg border-2 ${getSeverityColor(anomaly.severity)}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getSeverityIcon(anomaly.severity)}</span>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">
                        {getTypeLabel(anomaly.type)}
                      </div>
                      <div className="text-sm text-gray-700">
                        {anomaly.merchant} • {anomaly.category.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {formatCurrency(anomaly.amount)}
                      </div>
                      <div className="text-xs text-gray-600">
                        Expected: {formatCurrency(anomaly.expectedAmount)}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3 p-3 bg-white/50 rounded-lg">
                    <div className="text-sm text-gray-700 mb-2">
                      <span className="font-medium">Explanation:</span> {anomaly.explanation}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>Deviation: {(anomaly.deviation * 100).toFixed(1)}%</span>
                      <span>Confidence: {(anomaly.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  {anomaly.suggestions && anomaly.suggestions.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-700">Suggestions:</div>
                      {anomaly.suggestions.map((suggestion, idx) => (
                        <div key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                          <span>•</span>
                          <span>{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">✅</div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No Anomalies Detected</h4>
          <p className="text-gray-600">Your spending patterns look normal</p>
        </div>
      )}
    </div>
  );
}

