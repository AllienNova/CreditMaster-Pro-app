'use client';

import React, { useEffect, useState } from 'react';

interface Dispute {
  id: string;
  user_id: string;
  user_email: string;
  bureau: string;
  status: string;
  item_type: string;
  item_description: string;
  outcome: string | null;
  created_at: string;
  resolved_at: string | null;
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBureau, setFilterBureau] = useState('all');

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const response = await fetch('/api/admin/disputes');
        if (response.ok) {
          const data = await response.json();
          setDisputes(data.disputes || []);
        }
      } catch (error) {
        console.error('Failed to fetch disputes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDisputes();
  }, []);

  const filteredDisputes = disputes.filter(dispute => {
    const matchesStatus = filterStatus === 'all' || dispute.status === filterStatus;
    const matchesBureau = filterBureau === 'all' || dispute.bureau === filterBureau;
    return matchesStatus && matchesBureau;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getBureauBadge = (bureau: string) => {
    const colors: Record<string, string> = {
      experian: 'bg-blue-100 text-blue-800',
      equifax: 'bg-red-100 text-red-800',
      transunion: 'bg-green-100 text-green-800',
    };
    return colors[bureau] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dispute Management</h1>
        <p className="text-gray-600 mt-1">Monitor and manage customer credit disputes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['draft', 'sent', 'under_review', 'resolved', 'rejected'].map(status => (
          <div key={status} className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</p>
            <p className="text-2xl font-bold text-gray-900">
              {disputes.filter(d => d.status === status).length}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="under_review">Under Review</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={filterBureau}
          onChange={(e) => setFilterBureau(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Bureaus</option>
          <option value="experian">Experian</option>
          <option value="equifax">Equifax</option>
          <option value="transunion">TransUnion</option>
        </select>
      </div>

      {/* Disputes Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bureau</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDisputes.map((dispute) => (
              <tr key={dispute.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dispute.user_email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getBureauBadge(dispute.bureau)}`}>
                    {dispute.bureau}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{dispute.item_type}</div>
                  <div className="text-xs text-gray-500 truncate max-w-xs">{dispute.item_description}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(dispute.status)}`}>
                    {dispute.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(dispute.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredDisputes.length === 0 && (
          <div className="text-center py-12 text-gray-500">No disputes found</div>
        )}
      </div>
    </div>
  );
}

