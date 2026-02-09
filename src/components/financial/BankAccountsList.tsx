'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlaidAccount } from '@/lib/financial/plaid-service';
import PlaidLinkButton from './PlaidLinkButton';
import AccountDetailsModal from './AccountDetailsModal';
import { useAuth } from '@/hooks/useAuth';

export default function BankAccountsList() {
  const { user, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<PlaidAccount | null>(null);
  const [filter, setFilter] = useState<'all' | 'depository' | 'credit' | 'loan' | 'investment'>('all');

  const fetchAccounts = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/financial/accounts`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      
      const data = await response.json();
      setAccounts(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchAccounts();
    }
  }, [authLoading, user, fetchAccounts]);

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
        return '';
      case 'credit':
        return '';
      case 'loan':
        return '';
      case 'investment':
        return '';
      default:
        return '';
    }
  };

  const getAccountTypeColor = (type: string): string => {
    switch (type) {
      case 'depository':
        return 'bg-blue-100 text-blue-800';
      case 'credit':
        return 'bg-blue-100 text-blue-800';
      case 'loan':
        return 'bg-orange-100 text-orange-800';
      case 'investment':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Accounts</h3>
          <p className="text-gray-600 dark:text-slate-300 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchAccounts}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-12">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl mb-6"></div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Accounts Connected</h3>
          <p className="text-gray-600 dark:text-slate-300 mb-8">
            Connect your bank accounts to start tracking your finances.
          </p>
          <PlaidLinkButton onSuccess={fetchAccounts} />
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalBalance = accounts
    .filter(a => a.accountType === 'depository' || a.accountType === 'investment')
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const totalDebt = accounts
    .filter(a => a.accountType === 'credit' || a.accountType === 'loan')
    .reduce((sum, a) => sum + Math.abs(a.currentBalance), 0);

  const filteredAccounts = filter === 'all' 
    ? accounts 
    : accounts.filter(a => a.accountType === filter);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">Total Accounts</h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{accounts.length}</div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">Connected accounts</div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">Total Balance</h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-green-600">{formatCurrency(totalBalance)}</div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">Assets</div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">Total Debt</h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-red-600">{formatCurrency(totalDebt)}</div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">Liabilities</div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'depository', 'credit', 'loan', 'investment'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${ filter === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:bg-slate-700' }`}
              >
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                {type !== 'all' && (
                  <span className="ml-2 text-xs">
                    ({accounts.filter(a => a.accountType === type).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Add Account Button */}
          <PlaidLinkButton onSuccess={fetchAccounts} variant="secondary" />
        </div>
      </div>

      {/* Accounts List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {filter === 'all' ? 'All Accounts' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Accounts`}
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
            {filteredAccounts.length} {filteredAccounts.length === 1 ? 'account' : 'accounts'}
          </p>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-slate-700">
          {filteredAccounts.map((account) => (
            <div
              key={account.id}
              className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors cursor-pointer"
              onClick={() => setSelectedAccount(account)}
            >
              <div className="flex items-center justify-between">
                {/* Account Info */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {account.institutionName.charAt(0)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {account.accountName}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getAccountTypeColor(account.accountType)}`}>
                        {getAccountTypeIcon(account.accountType)} {account.accountType}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-300">
                      <span>{account.institutionName}</span>
                      <span>••••{account.mask}</span>
                      <span>{account.accountSubtype}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      Last synced: {account.lastSynced.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Balance */}
                <div className="text-right ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(account.currentBalance)}
                  </div>
                  {account.availableBalance !== undefined && (
                    <div className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                      Available: {formatCurrency(account.availableBalance)}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {account.currency}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Account Details Modal */}
      {selectedAccount && (
        <AccountDetailsModal
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
          onRefresh={fetchAccounts}
        />
      )}
    </div>
  );
}
