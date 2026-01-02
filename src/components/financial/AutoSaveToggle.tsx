'use client';

/**
 * Auto-Save Toggle Component
 * 
 * Enable/disable automatic savings for goals with amount configuration.
 */

import { useState } from 'react';

interface AutoSaveToggleProps {
  goalId: string;
  enabled: boolean;
  amount: number;
  onToggle: (goalId: string, enabled: boolean, amount?: number) => Promise<void>;
}

export default function AutoSaveToggle({ goalId, enabled, amount, onToggle }: AutoSaveToggleProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [saveAmount, setSaveAmount] = useState(amount);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleToggle = async () => {
    setSaving(true);
    try {
      const newEnabled = !isEnabled;
      await onToggle(goalId, newEnabled, saveAmount);
      setIsEnabled(newEnabled);
      if (newEnabled && saveAmount === 0) {
        setIsEditing(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAmountChange = async () => {
    if (saveAmount <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    setSaving(true);
    try {
      await onToggle(goalId, isEnabled, saveAmount);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <div>
              <div className="font-medium text-gray-900">Auto-Save</div>
              <div className="text-sm text-gray-600">
                {isEnabled 
                  ? `${formatCurrency(saveAmount)}/month automatically saved` 
                  : 'Enable automatic monthly savings'}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
            isEnabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Amount Editor */}
      {isEnabled && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={saveAmount}
                  onChange={(e) => setSaveAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="100"
                  min="0"
                  step="10"
                />
              </div>
              <button
                onClick={handleAmountChange}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? '...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setSaveAmount(amount);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Monthly amount: <span className="font-semibold">{formatCurrency(saveAmount)}</span>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      {isEnabled && !isEditing && (
        <div className="mt-3 p-2 bg-white/50 rounded text-xs text-gray-600">
          💡 Funds will be automatically transferred on the 1st of each month
        </div>
      )}
    </div>
  );
}

