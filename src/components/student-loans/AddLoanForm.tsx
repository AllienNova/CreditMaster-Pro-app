'use client';

import { useState } from 'react';

export interface NewLoanFormData {
  loan_type: string;
  servicer_name: string;
  current_balance: number;
  interest_rate: number;
  loan_status: string;
  disbursement_date: string;
  repayment_start_date: string;
  original_amount?: number;
  outstanding_interest?: number;
}

interface AddLoanFormProps {
  onSubmit: (loanData: NewLoanFormData) => void;
  onCancel: () => void;
}

export default function AddLoanForm({ onSubmit, onCancel }: AddLoanFormProps) {
  const [formData, setFormData] = useState({
    loan_type: 'direct_subsidized',
    servicer_name: '',
    current_balance: '',
    interest_rate: '',
    loan_status: 'in_repayment',
    disbursement_date: '',
    repayment_start_date: '',
    original_amount: '',
    outstanding_interest: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const loanTypes = [
    { value: 'direct_subsidized', label: 'Direct Subsidized' },
    { value: 'direct_unsubsidized', label: 'Direct Unsubsidized' },
    { value: 'direct_plus', label: 'Direct PLUS' },
    { value: 'direct_consolidation', label: 'Direct Consolidation' },
    { value: 'perkins', label: 'Perkins' },
    { value: 'ffel_subsidized', label: 'FFEL Subsidized' },
    { value: 'ffel_unsubsidized', label: 'FFEL Unsubsidized' },
    { value: 'ffel_plus', label: 'FFEL PLUS' },
    { value: 'private', label: 'Private' },
  ];

  const loanStatuses = [
    { value: 'in_repayment', label: 'In Repayment' },
    { value: 'deferment', label: 'Deferment' },
    { value: 'forbearance', label: 'Forbearance' },
    { value: 'grace_period', label: 'Grace Period' },
    { value: 'delinquent', label: 'Delinquent' },
    { value: 'default', label: 'Default' },
    { value: 'paid_in_full', label: 'Paid in Full' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.servicer_name.trim()) {
      newErrors.servicer_name = 'Servicer name is required';
    }

    if (!formData.current_balance || parseFloat(formData.current_balance) <= 0) {
      newErrors.current_balance = 'Valid current balance is required';
    }

    if (!formData.interest_rate || parseFloat(formData.interest_rate) < 0) {
      newErrors.interest_rate = 'Valid interest rate is required';
    }

    if (!formData.disbursement_date) {
      newErrors.disbursement_date = 'Disbursement date is required';
    }

    if (!formData.repayment_start_date) {
      newErrors.repayment_start_date = 'Repayment start date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Convert string values to numbers
    const loanData: NewLoanFormData = {
      ...formData,
      current_balance: parseFloat(formData.current_balance),
      interest_rate: parseFloat(formData.interest_rate),
      original_amount: formData.original_amount ? parseFloat(formData.original_amount) : undefined,
      outstanding_interest: formData.outstanding_interest ? parseFloat(formData.outstanding_interest) : undefined,
    };

    onSubmit(loanData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Loan Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Loan Type *
        </label>
        <select
          name="loan_type"
          value={formData.loan_type}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {loanTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Servicer Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Servicer Name *
        </label>
        <input
          type="text"
          name="servicer_name"
          value={formData.servicer_name}
          onChange={handleChange}
          placeholder="e.g., Nelnet, Great Lakes, Navient"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.servicer_name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.servicer_name && (
          <p className="mt-1 text-sm text-red-600">{errors.servicer_name}</p>
        )}
      </div>

      {/* Current Balance and Interest Rate */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Balance *
          </label>
          <input
            type="number"
            name="current_balance"
            value={formData.current_balance}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.current_balance ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.current_balance && (
            <p className="mt-1 text-sm text-red-600">{errors.current_balance}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interest Rate (%) *
          </label>
          <input
            type="number"
            name="interest_rate"
            value={formData.interest_rate}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            max="100"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.interest_rate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.interest_rate && (
            <p className="mt-1 text-sm text-red-600">{errors.interest_rate}</p>
          )}
        </div>
      </div>

      {/* Loan Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Loan Status *
        </label>
        <select
          name="loan_status"
          value={formData.loan_status}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {loanStatuses.map(status => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Disbursement Date *
          </label>
          <input
            type="date"
            name="disbursement_date"
            value={formData.disbursement_date}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.disbursement_date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.disbursement_date && (
            <p className="mt-1 text-sm text-red-600">{errors.disbursement_date}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Repayment Start Date *
          </label>
          <input
            type="date"
            name="repayment_start_date"
            value={formData.repayment_start_date}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.repayment_start_date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.repayment_start_date && (
            <p className="mt-1 text-sm text-red-600">{errors.repayment_start_date}</p>
          )}
        </div>
      </div>

      {/* Optional Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Original Amount (Optional)
          </label>
          <input
            type="number"
            name="original_amount"
            value={formData.original_amount}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Outstanding Interest (Optional)
          </label>
          <input
            type="number"
            name="outstanding_interest"
            value={formData.outstanding_interest}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Add Loan
        </button>
      </div>
    </form>
  );
}
