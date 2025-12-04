'use client';

import { useState } from 'react';
import LoanCard from './LoanCard';

interface StudentLoan {
  loan_id: string;
  loan_type: string;
  servicer_name: string;
  current_balance: number;
  interest_rate: number;
  loan_status: string;
  disbursement_date: string;
  repayment_start_date: string;
}

interface LoanListProps {
  loans: StudentLoan[];
  onViewStrategies: (loanId: string) => void;
  onCreateDispute: (loanId: string) => void;
}

export default function LoanList({ loans, onViewStrategies, onCreateDispute }: LoanListProps) {
  const [sortBy, setSortBy] = useState<'balance' | 'rate' | 'status'>('balance');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Get unique statuses for filter
  const statuses = ['all', ...Array.from(new Set(loans.map(loan => loan.loan_status)))];

  // Filter loans
  const filteredLoans = filterStatus === 'all'
    ? loans
    : loans.filter(loan => loan.loan_status === filterStatus);

  // Sort loans
  const sortedLoans = [...filteredLoans].sort((a, b) => {
    switch (sortBy) {
      case 'balance':
        return b.current_balance - a.current_balance;
      case 'rate':
        return b.interest_rate - a.interest_rate;
      case 'status':
        return a.loan_status.localeCompare(b.loan_status);
      default:
        return 0;
    }
  });

  return (
    <div>
      {/* Filters and Sort */}
      <div className="p-6 border-b border-gray-200 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'balance' | 'rate' | 'status')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="balance">Balance (High to Low)</option>
            <option value="rate">Interest Rate (High to Low)</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statuses.map(status => (
              <option key={status} value={status}>
                {status === 'all' ? 'All Statuses' : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-sm text-gray-600">
          Showing {sortedLoans.length} of {loans.length} loans
        </div>
      </div>

      {/* Loan Cards */}
      <div className="p-6 space-y-4">
        {sortedLoans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No loans match your filters</p>
          </div>
        ) : (
          sortedLoans.map(loan => (
            <LoanCard
              key={loan.loan_id}
              loan={loan}
              onViewStrategies={onViewStrategies}
              onCreateDispute={onCreateDispute}
            />
          ))
        )}
      </div>
    </div>
  );
}
