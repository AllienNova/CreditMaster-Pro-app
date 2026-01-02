'use client';

/**
 * Goal Form Component
 * 
 * Create/edit goal form with validation and milestone setup.
 */

import { useState, useEffect } from 'react';

interface FinancialGoal {
  id?: string;
  type: 'emergency_fund' | 'debt_payoff' | 'savings' | 'investment' | 'retirement' | 'custom';
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  status: 'active' | 'completed' | 'paused';
  autoSaveEnabled?: boolean;
  autoSaveAmount?: number;
}

interface GoalFormProps {
  goal?: FinancialGoal;
  onSave: (goal: Partial<FinancialGoal>) => Promise<void>;
  onCancel: () => void;
}

export default function GoalForm({ goal, onSave, onCancel }: GoalFormProps) {
  const [formData, setFormData] = useState<Partial<FinancialGoal>>({
    type: 'savings',
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    targetDate: '',
    status: 'active',
    autoSaveEnabled: false,
    autoSaveAmount: 0,
    ...goal,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const goalTypes = [
    { value: 'emergency_fund', label: '🚨 Emergency Fund', description: 'Build a safety net for unexpected expenses' },
    { value: 'debt_payoff', label: '💳 Debt Payoff', description: 'Pay off credit cards or loans' },
    { value: 'savings', label: '💰 Savings', description: 'General savings goal' },
    { value: 'investment', label: '📈 Investment', description: 'Grow wealth through investments' },
    { value: 'retirement', label: '🏖️ Retirement', description: 'Save for retirement' },
    { value: 'custom', label: '🎯 Custom', description: 'Create your own goal' },
  ];

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Goal name is required';
    }

    if (!formData.targetAmount || formData.targetAmount <= 0) {
      newErrors.targetAmount = 'Target amount must be greater than 0';
    }

    if (formData.currentAmount && formData.currentAmount < 0) {
      newErrors.currentAmount = 'Current amount cannot be negative';
    }

    if (!formData.targetDate) {
      newErrors.targetDate = 'Target date is required';
    } else {
      const targetDate = new Date(formData.targetDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (targetDate < today) {
        newErrors.targetDate = 'Target date must be in the future';
      }
    }

    if (formData.autoSaveEnabled && (!formData.autoSaveAmount || formData.autoSaveAmount <= 0)) {
      newErrors.autoSaveAmount = 'Auto-save amount must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof FinancialGoal, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Goal Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Goal Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {goalTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleChange('type', type.value)}
              className={`p-4 text-left rounded-lg border-2 transition-all ${
                formData.type === type.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900 mb-1">{type.label}</div>
              <div className="text-xs text-gray-600">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Goal Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Goal Name *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., Emergency Fund, Vacation, New Car"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* Amount Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="targetAmount" className="block text-sm font-medium text-gray-700 mb-2">
            Target Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              id="targetAmount"
              type="number"
              value={formData.targetAmount || ''}
              onChange={(e) => handleChange('targetAmount', parseFloat(e.target.value) || 0)}
              className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.targetAmount ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="10000"
              min="0"
              step="100"
            />
          </div>
          {errors.targetAmount && <p className="mt-1 text-sm text-red-600">{errors.targetAmount}</p>}
        </div>

        <div>
          <label htmlFor="currentAmount" className="block text-sm font-medium text-gray-700 mb-2">
            Current Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              id="currentAmount"
              type="number"
              value={formData.currentAmount || ''}
              onChange={(e) => handleChange('currentAmount', parseFloat(e.target.value) || 0)}
              className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.currentAmount ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0"
              min="0"
              step="100"
            />
          </div>
          {errors.currentAmount && <p className="mt-1 text-sm text-red-600">{errors.currentAmount}</p>}
        </div>
      </div>

      {/* Target Date */}
      <div>
        <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 mb-2">
          Target Date *
        </label>
        <input
          id="targetDate"
          type="date"
          value={formData.targetDate}
          onChange={(e) => handleChange('targetDate', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.targetDate ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.targetDate && <p className="mt-1 text-sm text-red-600">{errors.targetDate}</p>}
      </div>

      {/* Auto-Save Settings */}
      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-medium text-gray-900">Enable Auto-Save</div>
            <div className="text-sm text-gray-600">Automatically save towards this goal each month</div>
          </div>
          <button
            type="button"
            onClick={() => handleChange('autoSaveEnabled', !formData.autoSaveEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.autoSaveEnabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.autoSaveEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {formData.autoSaveEnabled && (
          <div>
            <label htmlFor="autoSaveAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Auto-Save Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                id="autoSaveAmount"
                type="number"
                value={formData.autoSaveAmount || ''}
                onChange={(e) => handleChange('autoSaveAmount', parseFloat(e.target.value) || 0)}
                className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.autoSaveAmount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="100"
                min="0"
                step="10"
              />
            </div>
            {errors.autoSaveAmount && <p className="mt-1 text-sm text-red-600">{errors.autoSaveAmount}</p>}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : goal ? 'Update Goal' : 'Create Goal'}
        </button>
      </div>
    </form>
  );
}

