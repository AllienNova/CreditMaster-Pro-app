'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlaidAccount, PlaidTransaction } from '@/lib/financial/plaid-service';
import { useAuth } from '@/hooks/useAuth';

interface AccountDetailsModalProps {
  account: PlaidAccount;
  onClose: () => void;
  onRefresh: () => void;
}

export default function AccountDetailsModal({ account, onClose, onRefresh }: AccountDetailsModalProps) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const response = await fetch(
        `/api/financial/transactions?accountId=${account.accountId}&startDate=${thirtyDaysAgo.toISOString()}&endDate=${new Date().toISOString()}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [user, account.accountId]);

  useEffect(() => {
    if (user) {
      void fetchTransactions();
    }
  }, [account.accountId, user, fetchTransactions]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      // TODO: Implement sync endpoint
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate sync
      await fetchTransactions();
      onRefresh();
    } catch (error) {
      console.error('Error syncing account:', error);
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getAccountTypeIcon = (type: string): string => {
    switch (type) {
      case 'depository':
        return '🏦';
      case 'credit':
        return '💳';
      case 'loan':
        return '🏠';
      case 'investment':
        return '📈';
      default:
        return '💰';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {account.institutionName.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{account.accountName}</h2>
                <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                  <span>{account.institutionName}</span>
                  <span>••••{account.mask}</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                    {getAccountTypeIcon(account.accountType)} {account.accountType}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Balance Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <h3 className="text-sm font-semibold opacity-90 mb-2">Current Balance</h3>
              <div className="text-3xl font-bold">{formatCurrency(account.currentBalance)}</div>
            </div>

            {account.availableBalance !== undefined && (
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Available Balance</h3>
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(account.availableBalance)}
                </div>
              </div>
            )}

            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Account Type</h3>
              <div className="text-2xl font-bold text-gray-900 capitalize">
                {account.accountSubtype}
              </div>
              <div className="text-sm text-gray-500 mt-1">{account.currency}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Syncing...
                </span>
              ) : (
                '🔄 Sync Transactions'
              )}
            </button>
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              📊 View Reports
            </button>
            <button
              type="button"
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
            >
              🗑️ Disconnect
            </button>
          </div>

          {/* Account Details */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Institution:</span>
                <span className="ml-2 font-semibold text-gray-900">{account.institutionName}</span>
              </div>
              <div>
                <span className="text-gray-600">Account ID:</span>
                <span className="ml-2 font-mono text-xs text-gray-900">••••{account.mask}</span>
              </div>
              <div>
                <span className="text-gray-600">Type:</span>
                <span className="ml-2 font-semibold text-gray-900 capitalize">{account.accountType}</span>
              </div>
              <div>
                <span className="text-gray-600">Subtype:</span>
                <span className="ml-2 font-semibold text-gray-900 capitalize">{account.accountSubtype}</span>
              </div>
              <div>
                <span className="text-gray-600">Currency:</span>
                <span className="ml-2 font-semibold text-gray-900">{account.currency}</span>
              </div>
              <div>
                <span className="text-gray-600">Last Synced:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {account.lastSynced.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions (Last 30 Days)</h3>
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{txn.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {txn.date.toLocaleDateString()} • {txn.category[0] || 'Uncategorized'}
                      </div>
                      {txn.pending && (
                        <span className="inline-block mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className={`text-lg font-bold ${txn.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {txn.amount > 0 ? '-' : '+'}{formatCurrency(Math.abs(txn.amount))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="text-gray-400 text-4xl mb-4">📭</div>
                <p className="text-gray-600">No transactions found</p>
                <p className="text-sm text-gray-500 mt-2">Transactions will appear here once synced</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
