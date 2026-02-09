'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Dispute, DisputeStatus, DisputeOutcome } from '@/lib/disputes/dispute-service';
import DisputeTimeline from './DisputeTimeline';
import DisputeActions from './DisputeActions';
import { useAuth } from '@/hooks/useAuth';

interface DisputeDetailProps {
  disputeId: string;
}

type DisputeAction =
  | 'send'
  | 'update_status'
  | 'resolve'
  | 'add_note';

type DisputeActionPayload =
  | { status: DisputeStatus; description: string }
  | { outcome: DisputeOutcome; note: string }
  | { note: string }
  | undefined;

export default function DisputeDetail({ disputeId }: DisputeDetailProps) {
  const { user, loading: authLoading } = useAuth();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDispute = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/disputes?disputeId=${disputeId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dispute');
      }

      const data = await response.json();
      setDispute(data.dispute);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [user, disputeId]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchDispute();
    }
  }, [disputeId, authLoading, user, fetchDispute]);

  const handleAction = async (action: DisputeAction, payload?: DisputeActionPayload) => {
    try {
      const response = await fetch('/api/disputes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disputeId,
          action,
          ...payload,
        }),
      });

      if (!response.ok) {
        throw new Error('Action failed');
      }

      const data = await response.json();
      setDispute(data.dispute);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading dispute...</div>;
  }

  if (error || !dispute) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error: {error || 'Dispute not found'}
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100',
    sent: 'bg-blue-100 text-blue-800',
    under_review: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    escalated: 'bg-blue-100 text-blue-800',
  };

  const bureauColors = {
    experian: 'text-red-600',
    equifax: 'text-blue-600',
    transunion: 'text-green-600',
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/disputes"
          className="text-blue-600 hover:text-blue-700 mb-4 inline-flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Disputes
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{dispute.itemType}</h1>
            <p className="text-gray-600 dark:text-slate-300 mt-1">
              Dispute ID: {dispute.id}
            </p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[dispute.status]}`}>
            {dispute.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dispute Information */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Dispute Information</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-slate-400">Bureau</label>
                <p className={`text-lg font-semibold ${bureauColors[dispute.bureau]}`}>
                  {dispute.bureau.charAt(0).toUpperCase() + dispute.bureau.slice(1)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-slate-400">Item Description</label>
                <p className="text-gray-900 dark:text-white">{dispute.itemDescription}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-slate-400">Dispute Reason</label>
                <p className="text-gray-900 dark:text-white">{dispute.reason}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-slate-400">Created</label>
                  <p className="text-gray-900 dark:text-white">{formatDate(dispute.createdAt)}</p>
                </div>
                {dispute.sentAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-slate-400">Sent</label>
                    <p className="text-gray-900 dark:text-white">{formatDate(dispute.sentAt)}</p>
                  </div>
                )}
                {dispute.estimatedResolutionDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-slate-400">Est. Resolution</label>
                    <p className="text-gray-900 dark:text-white">{formatDate(dispute.estimatedResolutionDate)}</p>
                  </div>
                )}
                {dispute.resolvedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-slate-400">Resolved</label>
                    <p className="text-gray-900 dark:text-white">{formatDate(dispute.resolvedAt)}</p>
                  </div>
                )}
              </div>
              {dispute.outcome && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-slate-400">Outcome</label>
                  <p className="text-gray-900 dark:text-white capitalize">{dispute.outcome}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dispute Letter */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Dispute Letter</h2>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-6 font-mono text-sm whitespace-pre-wrap">
                {dispute.letterContent}
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
                >
                  Print Letter
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(dispute.letterContent)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
                >
                  Copy to Clipboard
                </button>
              </div>
            </div>
          </div>

          {/* Evidence */}
          {dispute.evidence && dispute.evidence.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Evidence</h2>
              </div>
              <div className="p-6">
                <ul className="space-y-2">
                  {dispute.evidence.map((url, index) => (
                    <li key={index}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        Evidence {index + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Notes */}
          {dispute.notes && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notes</h2>
              </div>
              <div className="p-6">
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{dispute.notes}</p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <DisputeTimeline timeline={dispute.timeline} />
        </div>

        {/* Right Column - Actions */}
        <div>
          <DisputeActions dispute={dispute} onAction={handleAction} />
        </div>
      </div>
    </div>
  );
}
