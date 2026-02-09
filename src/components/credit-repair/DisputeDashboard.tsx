'use client';

/**
 * Credit Repair Dispute Dashboard
 * 
 * Comprehensive dispute management interface with:
 * - Active dispute tracking
 * - AI-powered recommendations
 * - Success rate analytics
 * - Timeline visualization
 */

import React, { useState, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface Dispute {
  id: string;
  itemType: 'account' | 'inquiry' | 'collection' | 'public_record';
  creditorName: string;
  accountNumber?: string;
  bureau: 'experian' | 'equifax' | 'transunion';
  status: 'draft' | 'pending' | 'in_review' | 'resolved' | 'rejected';
  reason: string;
  submittedDate?: Date;
  responseDate?: Date;
  resolution?: 'deleted' | 'corrected' | 'verified' | 'pending';
  estimatedImpact: number;
  confidenceScore: number;
  notes?: string;
}

export interface DisputeStats {
  total: number;
  pending: number;
  resolved: number;
  successRate: number;
  avgResolutionDays: number;
  estimatedScoreGain: number;
  actualScoreGain: number;
}

export interface DisputeDashboardProps {
  disputes: Dispute[];
  stats: DisputeStats;
  currentScore?: number;
  onCreateDispute?: () => void;
  onViewDispute?: (id: string) => void;
  onSendDispute?: (id: string) => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-500', textColor: 'text-gray-400 dark:text-slate-500' },
  pending: { label: 'Pending', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
  in_review: { label: 'In Review', color: 'bg-blue-500', textColor: 'text-blue-400' },
  resolved: { label: 'Resolved', color: 'bg-green-500', textColor: 'text-green-400' },
  rejected: { label: 'Rejected', color: 'bg-red-500', textColor: 'text-red-400' },
};

const BUREAU_COLORS = {
  experian: '#1a4480',
  equifax: '#c41230',
  transunion: '#00a3e0',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function DisputeDashboard({
  disputes,
  stats,
  currentScore,
  onCreateDispute,
  onViewDispute,
  onSendDispute,
  className = '',
}: DisputeDashboardProps) {
  const [filter, setFilter] = useState<'all' | Dispute['status']>('all');
  const [bureauFilter, setBureauFilter] = useState<'all' | Dispute['bureau']>('all');

  // Filter disputes
  const filteredDisputes = useMemo(() => {
    return disputes.filter(d => {
      if (filter !== 'all' && d.status !== filter) return false;
      if (bureauFilter !== 'all' && d.bureau !== bureauFilter) return false;
      return true;
    });
  }, [disputes, filter, bureauFilter]);

  // Group by status for pipeline view
  const pipelineData = useMemo(() => ({
    draft: disputes.filter(d => d.status === 'draft'),
    pending: disputes.filter(d => d.status === 'pending'),
    in_review: disputes.filter(d => d.status === 'in_review'),
    resolved: disputes.filter(d => d.status === 'resolved'),
  }), [disputes]);

  return (
    <div className={`dispute-dashboard bg-gray-900 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Dispute Center</h2>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
              Track and manage your credit disputes
            </p>
          </div>
          <button
            onClick={onCreateDispute}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2"
          >
            <span>+</span>
            <span>New Dispute</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6 border-b border-gray-800">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            label="Total Disputes"
            value={stats.total.toString()}
            icon=""
          />
          <StatCard
            label="In Progress"
            value={stats.pending.toString()}
            subValue="Active"
            icon="⏳"
          />
          <StatCard
            label="Resolved"
            value={stats.resolved.toString()}
            subValue={`${stats.successRate.toFixed(0)}% success`}
            icon=""
            valueColor="text-green-400"
          />
          <StatCard
            label="Avg Resolution"
            value={`${stats.avgResolutionDays}`}
            subValue="days"
            icon=""
          />
          <StatCard
            label="Est. Score Gain"
            value={`+${stats.estimatedScoreGain}`}
            subValue="points potential"
            icon=""
            valueColor="text-blue-400"
          />
          <StatCard
            label="Actual Gain"
            value={`+${stats.actualScoreGain}`}
            subValue="points achieved"
            icon=""
            valueColor="text-green-400"
          />
        </div>
      </div>

      {/* Pipeline View */}
      <div className="p-6 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Dispute Pipeline</h3>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(pipelineData).map(([status, items]) => (
            <PipelineColumn
              key={status}
              status={status as keyof typeof pipelineData}
              items={items}
              onItemClick={onViewDispute}
            />
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 dark:text-slate-500">Status:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="bg-gray-800 text-white text-sm rounded px-3 py-1.5 border border-gray-700"
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="in_review">In Review</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 dark:text-slate-500">Bureau:</span>
          <select
            value={bureauFilter}
            onChange={(e) => setBureauFilter(e.target.value as typeof bureauFilter)}
            className="bg-gray-800 text-white text-sm rounded px-3 py-1.5 border border-gray-700"
          >
            <option value="all">All Bureaus</option>
            <option value="experian">Experian</option>
            <option value="equifax">Equifax</option>
            <option value="transunion">TransUnion</option>
          </select>
        </div>
        <div className="ml-auto text-sm text-gray-400 dark:text-slate-500">
          {filteredDisputes.length} of {disputes.length} disputes
        </div>
      </div>

      {/* Dispute List */}
      <div className="divide-y divide-gray-800">
        {filteredDisputes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-4xl mb-4"></div>
            <p className="text-gray-400 dark:text-slate-500">No disputes found</p>
            <button
              onClick={onCreateDispute}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              Create your first dispute
            </button>
          </div>
        ) : (
          filteredDisputes.map(dispute => (
            <DisputeRow
              key={dispute.id}
              dispute={dispute}
              onView={() => onViewDispute?.(dispute.id)}
              onSend={() => onSendDispute?.(dispute.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: string;
  valueColor?: string;
}

function StatCard({ label, value, subValue, icon, valueColor = 'text-white' }: StatCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="text-2xl">{icon}</div>
      </div>
      <div className={`text-2xl font-bold mt-2 ${valueColor}`}>{value}</div>
      <div className="text-sm text-gray-400 dark:text-slate-500">{label}</div>
      {subValue && <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">{subValue}</div>}
    </div>
  );
}

// ============================================================================
// PIPELINE COLUMN
// ============================================================================

interface PipelineColumnProps {
  status: 'draft' | 'pending' | 'in_review' | 'resolved';
  items: Dispute[];
  onItemClick?: (id: string) => void;
}

function PipelineColumn({ status, items, onItemClick }: PipelineColumnProps) {
  const config = STATUS_CONFIG[status];
  
  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${config.color}`} />
          <span className="text-sm font-medium text-gray-300">{config.label}</span>
        </div>
        <span className="text-xs bg-gray-700 text-gray-400 dark:text-slate-500 px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {items.slice(0, 5).map(item => (
          <div
            key={item.id}
            onClick={() => onItemClick?.(item.id)}
            className="bg-gray-800 rounded p-2 cursor-pointer hover:bg-gray-700 transition"
          >
            <div className="text-sm text-white font-medium truncate">{item.creditorName}</div>
            <div className="flex items-center justify-between mt-1">
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${BUREAU_COLORS[item.bureau]}30`, color: BUREAU_COLORS[item.bureau] }}
              >
                {item.bureau.charAt(0).toUpperCase() + item.bureau.slice(1)}
              </span>
              <span className="text-xs text-gray-500 dark:text-slate-400">+{item.estimatedImpact} pts</span>
            </div>
          </div>
        ))}
        {items.length > 5 && (
          <div className="text-xs text-gray-500 dark:text-slate-400 text-center py-1">
            +{items.length - 5} more
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DISPUTE ROW
// ============================================================================

interface DisputeRowProps {
  dispute: Dispute;
  onView: () => void;
  onSend: () => void;
}

function DisputeRow({ dispute, onView, onSend }: DisputeRowProps) {
  const statusConfig = STATUS_CONFIG[dispute.status];
  
  return (
    <div className="px-6 py-4 hover:bg-gray-800/30 transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          {/* Bureau Badge */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: BUREAU_COLORS[dispute.bureau] }}
          >
            {dispute.bureau.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className="text-white font-medium">{dispute.creditorName}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.color}/20 ${statusConfig.textColor}`}>
                {statusConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-400 dark:text-slate-500">
              <span>{dispute.itemType.replace('_', ' ')}</span>
              {dispute.accountNumber && <span>•••{dispute.accountNumber.slice(-4)}</span>}
              <span>• {dispute.reason}</span>
            </div>
          </div>

          {/* Metrics */}
          <div className="text-right hidden md:block">
            <div className="text-sm text-gray-300">
              Est. Impact: <span className="text-green-400 font-medium">+{dispute.estimatedImpact} pts</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Confidence: {(dispute.confidenceScore * 100).toFixed(0)}%
            </div>
          </div>

          {/* Timeline */}
          <div className="text-right hidden lg:block">
            {dispute.submittedDate ? (
              <div className="text-sm text-gray-400 dark:text-slate-500">
                Submitted {formatDate(dispute.submittedDate)}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-slate-400">Not submitted</div>
            )}
            {dispute.responseDate && (
              <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Response: {formatDate(dispute.responseDate)}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onView}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition"
          >
            View
          </button>
          {dispute.status === 'draft' && (
            <button
              onClick={onSend}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export default DisputeDashboard;
