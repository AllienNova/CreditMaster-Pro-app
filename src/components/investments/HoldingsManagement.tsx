'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type {
  Holding,
  HoldingCreateInput,
  AssetType,
} from '@/lib/investments/types/portfolio.types';

type SortField =
  | 'symbol'
  | 'totalValue'
  | 'gainLoss'
  | 'gainLossPercent'
  | 'shares';
type SortDir = 'asc' | 'desc';

// ============================================================================
// SUB-COMPONENTS (defined before main component for ESLint compatibility)
// ============================================================================

function SummaryCard({
  title,
  value,
  isPositive,
}: {
  title: string;
  value: string;
  isPositive?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p
        className={`text-xl font-bold mt-1 ${
          isPositive !== undefined
            ? isPositive
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
            : 'text-gray-900 dark:text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

interface HoldingsTableProps {
  holdings: Holding[];
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  onEdit: (h: Holding) => void;
  onDelete: (id: string) => void;
  formatCurrency: (n: number) => string;
  SortIcon: React.FC<{ field: SortField }>;
}

function HoldingsTable({
  holdings,
  onSort,
  onEdit,
  onDelete,
  formatCurrency,
  SortIcon,
}: HoldingsTableProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('symbol')}
              >
                Symbol <SortIcon field="symbol" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('shares')}
              >
                Shares <SortIcon field="shares" />
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Avg Cost
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Price
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('totalValue')}
              >
                Value <SortIcon field="totalValue" />
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('gainLoss')}
              >
                Gain/Loss <SortIcon field="gainLoss" />
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {holdings.map((h) => (
              <tr
                key={h.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                  {h.symbol}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                  {h.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                  {h.shares.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                  {formatCurrency(h.averageCostBasis)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                  {formatCurrency(h.currentPrice)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900 dark:text-white">
                  {formatCurrency(h.totalValue)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div
                    className={
                      h.gainLoss >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }
                  >
                    <div>{formatCurrency(h.gainLoss)}</div>
                    <div className="text-sm">
                      {h.gainLoss >= 0 ? '+' : ''}
                      {h.gainLossPercent.toFixed(2)}%
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <button
                    type="button"
                    onClick={() => onEdit(h)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(h.id)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {holdings.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No holdings found. Add your first holding to get started.
          </div>
        )}
      </div>
    </div>
  );
}

interface AddHoldingModalProps {
  onClose: () => void;
  onSubmit: (data: HoldingCreateInput) => void;
}

function AddHoldingModal({ onClose, onSubmit }: AddHoldingModalProps) {
  const [formData, setFormData] = useState<HoldingCreateInput>({
    symbol: '',
    name: '',
    shares: 0,
    averageCostBasis: 0,
    assetType: 'stock',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.symbol ||
      formData.shares <= 0 ||
      formData.averageCostBasis <= 0
    ) {
      alert('Please fill in all required fields');
      return;
    }
    onSubmit({ ...formData, symbol: formData.symbol.toUpperCase() });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add Holding
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label
              htmlFor="add-symbol"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Symbol *
            </label>
            <input
              id="add-symbol"
              type="text"
              value={formData.symbol}
              onChange={(e) =>
                setFormData({ ...formData, symbol: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="AAPL"
              required
            />
          </div>
          <div>
            <label
              htmlFor="add-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Name
            </label>
            <input
              id="add-name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Apple Inc."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="add-shares"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Shares *
              </label>
              <input
                id="add-shares"
                type="number"
                step="0.0001"
                min="0"
                value={formData.shares || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    shares: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label
                htmlFor="add-cost"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Avg Cost *
              </label>
              <input
                id="add-cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.averageCostBasis || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    averageCostBasis: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="add-type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Asset Type
            </label>
            <select
              id="add-type"
              value={formData.assetType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  assetType: e.target.value as AssetType,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="stock">Stock</option>
              <option value="etf">ETF</option>
              <option value="mutual_fund">Mutual Fund</option>
              <option value="bond">Bond</option>
              <option value="crypto">Crypto</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Holding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditHoldingModalProps {
  holding: Holding;
  onClose: () => void;
  onSuccess: () => void;
}

function EditHoldingModal({
  holding,
  onClose,
  onSuccess,
}: EditHoldingModalProps) {
  const [shares, setShares] = useState(holding.shares);
  const [avgCost, setAvgCost] = useState(holding.averageCostBasis);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (shares <= 0 || avgCost <= 0) {
      alert('Shares and cost must be greater than 0');
      return;
    }
    try {
      setSaving(true);
      const response = await fetch(`/api/investments/holdings/${holding.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shares, averageCostBasis: avgCost }),
      });
      if (!response.ok) throw new Error('Failed to update');
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit {holding.symbol}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label
              htmlFor="edit-shares"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Shares
            </label>
            <input
              id="edit-shares"
              type="number"
              step="0.0001"
              min="0"
              value={shares}
              onChange={(e) => setShares(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label
              htmlFor="edit-cost"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Average Cost Basis
            </label>
            <input
              id="edit-cost"
              type="number"
              step="0.01"
              min="0"
              value={avgCost}
              onChange={(e) => setAvgCost(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HoldingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 h-20"
          />
        ))}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-[400px]" />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HoldingsManagement() {
  const { user, loading: authLoading } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [sortField, setSortField] = useState<SortField>('totalValue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterType, setFilterType] = useState<AssetType | 'all'>('all');

  const fetchHoldings = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('sortBy', sortField);
      params.set('sortDir', sortDir);
      if (filterType !== 'all') params.set('assetType', filterType);

      const response = await fetch(`/api/investments/holdings?${params}`);
      if (!response.ok) throw new Error('Failed to fetch holdings');
      const result = await response.json();
      if (result.success) {
        setHoldings(result.data);
        setError(null);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load holdings');
    } finally {
      setLoading(false);
    }
  }, [user, sortField, sortDir, filterType]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchHoldings();
    }
  }, [authLoading, user, fetchHoldings]);

  const handleAddHolding = async (data: HoldingCreateInput) => {
    try {
      const response = await fetch('/api/investments/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to add holding');
      }
      setShowAddModal(false);
      void fetchHoldings();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add holding');
    }
  };

  const handleDeleteHolding = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holding?')) return;
    try {
      const response = await fetch(`/api/investments/holdings/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete holding');
      void fetchHoldings();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Symbol',
      'Name',
      'Shares',
      'Avg Cost',
      'Current Price',
      'Total Value',
      'Gain/Loss',
      'Gain/Loss %',
    ];
    const rows = holdings.map((h) => [
      h.symbol,
      h.name,
      h.shares,
      h.averageCostBasis.toFixed(2),
      h.currentPrice.toFixed(2),
      h.totalValue.toFixed(2),
      h.gainLoss.toFixed(2),
      h.gainLossPercent.toFixed(2),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `holdings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(n);

  if (loading) return <HoldingsSkeleton />;

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-red-800 dark:text-red-200 font-medium">Error</h3>
        <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
        <button
          type="button"
          onClick={() => void fetchHoldings()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Calculate totals
  const totalValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent =
    totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-300">↕</span>;
    return <span>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Holdings"
          value={holdings.length.toString()}
        />
        <SummaryCard title="Total Value" value={formatCurrency(totalValue)} />
        <SummaryCard title="Total Cost" value={formatCurrency(totalCost)} />
        <SummaryCard
          title="Total Gain/Loss"
          value={`${formatCurrency(totalGainLoss)} (${totalGainLossPercent.toFixed(2)}%)`}
          isPositive={totalGainLoss >= 0}
        />
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Holding
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Export CSV
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-type"
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            Filter:
          </label>
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as AssetType | 'all')}
            className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
          >
            <option value="all">All Types</option>
            <option value="stock">Stocks</option>
            <option value="etf">ETFs</option>
            <option value="mutual_fund">Mutual Funds</option>
            <option value="bond">Bonds</option>
            <option value="crypto">Crypto</option>
          </select>
        </div>
      </div>

      {/* Holdings Table - continued below */}
      <HoldingsTable
        holdings={holdings}
        sortField={sortField}
        sortDir={sortDir}
        onSort={handleSort}
        onEdit={setEditingHolding}
        onDelete={handleDeleteHolding}
        formatCurrency={formatCurrency}
        SortIcon={SortIcon}
      />

      {/* Add Holding Modal */}
      {showAddModal && (
        <AddHoldingModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddHolding}
        />
      )}

      {/* Edit Holding Modal */}
      {editingHolding && (
        <EditHoldingModal
          holding={editingHolding}
          onClose={() => setEditingHolding(null)}
          onSuccess={() => {
            setEditingHolding(null);
            void fetchHoldings();
          }}
        />
      )}
    </div>
  );
}
