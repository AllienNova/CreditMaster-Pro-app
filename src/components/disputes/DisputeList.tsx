'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Dispute, DisputeStatus, Bureau } from '@/lib/disputes/dispute-service';
import AIDisputeStrategy from './AIDisputeStrategy';
import { useAuth } from '@/hooks/useAuth';

export default function DisputeList() {
  const { user, loading: authLoading } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'all'>('all');
  const [bureauFilter, setBureauFilter] = useState<Bureau | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch disputes
  const fetchDisputes = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/disputes?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch disputes');
      }

      const data = await response.json();
      setDisputes(data.disputes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchDisputes();
    }
  }, [authLoading, user, fetchDisputes]);

  // Filter disputes
  const filteredDisputes = disputes.filter((dispute) => {
    const matchesSearch = 
      dispute.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.reason.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBureau = bureauFilter === 'all' || dispute.bureau === bureauFilter;
    
    return matchesSearch && matchesBureau;
  });

  // Paginate disputes
  const totalPages = Math.ceil(filteredDisputes.length / itemsPerPage);
  const paginatedDisputes = filteredDisputes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (authLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
        Please log in to view your disputes.
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12">Loading disputes...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error: {error}
      </div>
    );
  }

  return (
    <>
      {/* AI Dispute Strategy */}
      <AIDisputeStrategy />

      <div className="bg-white rounded-lg shadow mt-6">
        {/* Filters and Search */}
        <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search disputes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DisputeStatus | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
              <option value="escalated">Escalated</option>
            </select>

            <select
              value={bureauFilter}
              onChange={(e) => setBureauFilter(e.target.value as Bureau | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Bureaus</option>
              <option value="experian">Experian</option>
              <option value="equifax">Equifax</option>
              <option value="transunion">TransUnion</option>
            </select>

            <Link
              href="/disputes/new"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + New Dispute
            </Link>
          </div>
        </div>
      </div>

      {/* Disputes List */}
      {paginatedDisputes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchTerm || statusFilter !== 'all' || bureauFilter !== 'all' ? (
            <p>No disputes match your filters</p>
          ) : (
            <div>
              <p className="mb-4">You haven't created any disputes yet</p>
              <Link
                href="/disputes/new"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Your First Dispute
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-200">
            {paginatedDisputes.map((dispute) => (
              <DisputeCard key={dispute.id} dispute={dispute} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-6 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredDisputes.length)} of{' '}
                {filteredDisputes.length} disputes
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </>
  );
}

// Dispute Card Component
function DisputeCard({ dispute }: { dispute: Dispute }) {
  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    under_review: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    escalated: 'bg-purple-100 text-purple-800',
  };

  const bureauColors = {
    experian: 'text-red-600',
    equifax: 'text-blue-600',
    transunion: 'text-green-600',
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Link href={`/disputes/${dispute.id}`} className="block p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{dispute.itemType}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[dispute.status]}`}>
              {dispute.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <p className="text-gray-600 mb-2">{dispute.itemDescription}</p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className={`font-medium ${bureauColors[dispute.bureau]}`}>
              {dispute.bureau.charAt(0).toUpperCase() + dispute.bureau.slice(1)}
            </span>
            <span>Created: {formatDate(dispute.createdAt)}</span>
            {dispute.sentAt && <span>Sent: {formatDate(dispute.sentAt)}</span>}
            {dispute.estimatedResolutionDate && (
              <span>Est. Resolution: {formatDate(dispute.estimatedResolutionDate)}</span>
            )}
          </div>
        </div>
        <div className="ml-4">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}
