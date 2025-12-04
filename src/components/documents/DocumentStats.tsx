'use client';

import { useState, useEffect, useCallback } from 'react';
import { DocumentType } from '@/lib/documents/document-service';
import { useAuth } from '@/hooks/useAuth';

interface DocumentStatsType {
  total: number;
  byType: Record<DocumentType, number>;
  totalSize: number;
}

export default function DocumentStats() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DocumentStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/documents`);
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch document stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchStats();
    }
  }, [authLoading, user, fetchStats]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: 'Total Documents',
      value: stats.total,
      icon: '📄',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Credit Reports',
      value: stats.byType.credit_report || 0,
      icon: '📊',
      color: 'bg-green-50 text-green-700',
    },
    {
      label: 'Dispute Letters',
      value: stats.byType.dispute_letter || 0,
      icon: '✉️',
      color: 'bg-purple-50 text-purple-700',
    },
    {
      label: 'Total Storage',
      value: formatFileSize(stats.totalSize),
      icon: '💾',
      color: 'bg-orange-50 text-orange-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {statCards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600">{card.label}</span>
            <span className={`text-2xl ${card.color} rounded-lg p-2`}>
              {card.icon}
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{card.value}</div>
        </div>
      ))}
    </div>
  );
}
