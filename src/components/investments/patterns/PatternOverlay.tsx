'use client';

/**
 * Pattern Recognition Overlay Component
 * 
 * Displays detected chart patterns on the chart with:
 * - Pattern visualization
 * - Pattern details panel
 * - Price targets and stop loss levels
 * - Pattern alerts
 */

import React, { useState, useMemo } from 'react';
import {
  DetectedPattern,
  PatternType,
  PatternDirection,
  PatternScanResult,
  PATTERN_INFO,
} from '@/lib/investments/services/PatternRecognitionService';

// ============================================================================
// TYPES
// ============================================================================

interface PatternOverlayProps {
  scanResult: PatternScanResult | null;
  onPatternSelect?: (pattern: DetectedPattern) => void;
  onCreateAlert?: (pattern: DetectedPattern) => void;
  showFilters?: boolean;
  className?: string;
}

interface PatternFilterState {
  directions: PatternDirection[];
  minReliability: number;
  selectedTypes: PatternType[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PatternOverlay({
  scanResult,
  onPatternSelect,
  onCreateAlert,
  showFilters = true,
  className = '',
}: PatternOverlayProps) {
  const [selectedPattern, setSelectedPattern] = useState<DetectedPattern | null>(null);
  const [filters, setFilters] = useState<PatternFilterState>({
    directions: ['bullish', 'bearish', 'neutral'],
    minReliability: 50,
    selectedTypes: [],
  });

  // Filter patterns
  const filteredPatterns = useMemo(() => {
    if (!scanResult?.patterns) return [];
    
    return scanResult.patterns.filter(p => {
      if (!filters.directions.includes(p.direction)) return false;
      if (p.reliability < filters.minReliability) return false;
      if (filters.selectedTypes.length > 0 && !filters.selectedTypes.includes(p.type)) return false;
      return true;
    });
  }, [scanResult, filters]);

  const handlePatternClick = (pattern: DetectedPattern) => {
    setSelectedPattern(pattern);
    onPatternSelect?.(pattern);
  };

  if (!scanResult) {
    return (
      <div className={`p-4 text-center text-gray-400 ${className}`}>
        <div className="text-4xl mb-2">🔍</div>
        <p>No pattern data available</p>
        <p className="text-sm mt-1">Load chart data to scan for patterns</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">
            🔍 Pattern Recognition
          </h3>
          <span className="text-sm text-gray-400">
            {filteredPatterns.length} patterns found
          </span>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <PatternFilters 
          filters={filters}
          onChange={setFilters}
          availablePatterns={scanResult.patterns}
        />
      )}

      {/* Pattern List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredPatterns.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No patterns match your filters</p>
          </div>
        ) : (
          filteredPatterns.map(pattern => (
            <PatternCard
              key={pattern.id}
              pattern={pattern}
              isSelected={selectedPattern?.id === pattern.id}
              onClick={() => handlePatternClick(pattern)}
              onCreateAlert={onCreateAlert}
            />
          ))
        )}
      </div>

      {/* Support/Resistance Levels */}
      <div className="px-4 py-3 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Key Levels</span>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <span className="text-xs text-red-400">Resistance</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {scanResult.resistanceLevels.slice(0, 3).map((level, i) => (
                <span key={i} className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                  ${level.toFixed(2)}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <span className="text-xs text-green-400">Support</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {scanResult.supportLevels.slice(0, 3).map((level, i) => (
                <span key={i} className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                  ${level.toFixed(2)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PATTERN FILTERS
// ============================================================================

interface PatternFiltersProps {
  filters: PatternFilterState;
  onChange: (filters: PatternFilterState) => void;
  availablePatterns: DetectedPattern[];
}

function PatternFilters({ filters, onChange, availablePatterns }: PatternFiltersProps) {
  const directions: PatternDirection[] = ['bullish', 'bearish', 'neutral'];

  const toggleDirection = (dir: PatternDirection) => {
    const newDirs = filters.directions.includes(dir)
      ? filters.directions.filter(d => d !== dir)
      : [...filters.directions, dir];
    onChange({ ...filters, directions: newDirs });
  };

  return (
    <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 space-y-2">
      {/* Direction Filters */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Direction:</span>
        {directions.map(dir => (
          <button
            key={dir}
            onClick={() => toggleDirection(dir)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              filters.directions.includes(dir)
                ? dir === 'bullish' ? 'bg-green-600 text-white' :
                  dir === 'bearish' ? 'bg-red-600 text-white' :
                  'bg-gray-600 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {dir === 'bullish' && '📈'}
            {dir === 'bearish' && '📉'}
            {dir === 'neutral' && '➖'}
            <span className="ml-1 capitalize">{dir}</span>
          </button>
        ))}
      </div>

      {/* Reliability Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Min Reliability:</span>
        <input
          type="range"
          min="0"
          max="100"
          value={filters.minReliability}
          onChange={(e) => onChange({ ...filters, minReliability: parseInt(e.target.value) })}
          className="flex-1 h-1"
        />
        <span className="text-xs text-white w-8">{filters.minReliability}%</span>
      </div>
    </div>
  );
}

// ============================================================================
// PATTERN CARD
// ============================================================================

interface PatternCardProps {
  pattern: DetectedPattern;
  isSelected: boolean;
  onClick: () => void;
  onCreateAlert?: (pattern: DetectedPattern) => void;
}

function PatternCard({ pattern, isSelected, onClick, onCreateAlert }: PatternCardProps) {
  const info = PATTERN_INFO[pattern.type];

  const getDirectionColors = (dir: PatternDirection) => {
    if (dir === 'bullish') return 'border-green-500/30 bg-green-500/10';
    if (dir === 'bearish') return 'border-red-500/30 bg-red-500/10';
    return 'border-gray-500/30 bg-gray-500/10';
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: string }> = {
      forming: { color: 'bg-yellow-500', icon: '⏳' },
      complete: { color: 'bg-blue-500', icon: '✓' },
      confirmed: { color: 'bg-green-500', icon: '✅' },
      failed: { color: 'bg-red-500', icon: '❌' },
      invalidated: { color: 'bg-gray-500', icon: '⊘' },
    };
    return badges[status] || { color: 'bg-gray-500', icon: '?' };
  };

  const badge = getStatusBadge(pattern.status);

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } ${getDirectionColors(pattern.direction)}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{info?.name || pattern.type}</span>
            <span className={`w-2 h-2 rounded-full ${badge.color}`} title={pattern.status} />
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            Reliability: {pattern.reliability}%
          </div>
        </div>
        <span className={`text-lg ${
          pattern.direction === 'bullish' ? 'text-green-400' :
          pattern.direction === 'bearish' ? 'text-red-400' : 'text-gray-400'
        }`}>
          {pattern.direction === 'bullish' && '📈'}
          {pattern.direction === 'bearish' && '📉'}
          {pattern.direction === 'neutral' && '➖'}
        </span>
      </div>

      {/* Price Targets */}
      {pattern.priceTarget && (
        <div className="flex items-center gap-3 text-sm mb-2">
          <span className="text-gray-400">Target:</span>
          <span className={pattern.direction === 'bullish' ? 'text-green-400' : 'text-red-400'}>
            ${pattern.priceTarget.toFixed(2)}
            {pattern.targetPercent && (
              <span className="text-xs ml-1">({pattern.targetPercent > 0 ? '+' : ''}{pattern.targetPercent.toFixed(1)}%)</span>
            )}
          </span>
          {pattern.stopLoss && (
            <>
              <span className="text-gray-400">SL:</span>
              <span className="text-red-400">${pattern.stopLoss.toFixed(2)}</span>
            </>
          )}
        </div>
      )}

      {/* Description */}
      <p className="text-xs text-gray-400 mb-2">{pattern.tradingImplication}</p>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onCreateAlert && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateAlert(pattern);
            }}
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            🔔 Create Alert
          </button>
        )}
        <span className="text-xs text-gray-500">
          {info?.reliability || 'Medium reliability'}
        </span>
      </div>
    </div>
  );
}

export default PatternOverlay;

