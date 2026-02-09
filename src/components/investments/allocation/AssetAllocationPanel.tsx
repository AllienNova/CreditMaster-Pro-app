'use client';

/**
 * Asset Allocation Panel Component
 *
 * Displays portfolio asset allocation analysis, risk metrics, and rebalancing recommendations
 * Mobile-responsive with collapsible sections, swipe navigation, pull-to-refresh, and WCAG 2.1 AA accessibility
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import {
  AssetAllocationAnalysis,
  RiskTolerance,
  AssetClass,
  RebalancingRecommendation,
} from '@/lib/investments/types/asset-allocation.types';
import { Portfolio } from '@/lib/investments/types/investment.types';
import { EfficientFrontierChart } from './EfficientFrontierChart';
import { getAssetAllocationService } from '@/lib/investments/services/AssetAllocationService';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { AssetAllocationSkeleton } from '@/components/ui/Skeleton';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useOnline } from '@/hooks/useOnline';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { OfflineQueueStatus } from '@/components/ui/OfflineQueueStatus';

// Collapsible section component with swipe navigation support
interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  sectionId: string;
  isActive?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  showSwipeIndicators?: boolean;
  sectionRef?: (el: HTMLDivElement | null) => void;
}

function CollapsibleSection({
  title,
  children,
  defaultExpanded = false,
  sectionId,
  isActive = false,
  onSwipeLeft,
  onSwipeRight,
  showSwipeIndicators = false,
  sectionRef,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Persist expansion state in localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(`allocation-section-${sectionId}`);
    if (savedState !== null) {
      setIsExpanded(savedState === 'true');
    }
  }, [sectionId]);

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem(`allocation-section-${sectionId}`, String(newState));
  };

  // Setup swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (onSwipeLeft && isExpanded) {
        onSwipeLeft();
      }
    },
    onSwipedRight: () => {
      if (onSwipeRight && isExpanded) {
        onSwipeRight();
      }
    },
    trackMouse: false, // Only track touch events
    preventScrollOnSwipe: false,
    delta: 50, // Minimum swipe distance in pixels
  });

  // Combine refs from swipeHandlers and sectionRef
  const refPassthrough = (el: HTMLDivElement | null) => {
    // Call swipeHandlers ref
    swipeHandlers.ref(el);
    // Call sectionRef
    if (sectionRef) {
      sectionRef(el);
    }
  };

  return (
    <div
      {...swipeHandlers}
      ref={refPassthrough}
      className={`bg-white dark:bg-slate-800 rounded-lg overflow-hidden transition-all duration-300 ${
        isActive ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
      }`}
    >
      <button
        onClick={toggleExpanded}
        className="w-full px-4 py-4 sm:px-6 sm:py-5 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-slate-750 active:bg-gray-100 dark:bg-slate-800 dark:active:bg-gray-700 transition-colors duration-200 min-h-[44px]"
        aria-expanded={isExpanded}
        aria-controls={`section-${sectionId}`}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
          {showSwipeIndicators && isExpanded && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Swipe</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}
        </div>
        <svg
          className={`w-6 h-6 text-gray-500 dark:text-slate-400 transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        id={`section-${sectionId}`}
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">{children}</div>
      </div>
    </div>
  );
}

interface AssetAllocationPanelProps {
  portfolio: Portfolio;
  onRebalance?: (recommendations: RebalancingRecommendation[]) => void;
}

export default function AssetAllocationPanel({ portfolio, onRebalance }: AssetAllocationPanelProps) {
  const [analysis, setAnalysis] = useState<AssetAllocationAnalysis | null>(null);
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>(RiskTolerance.MODERATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [activeSection, setActiveSection] = useState<number>(0);

  // Section refs for smooth scrolling
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Define swipeable sections (only the main analysis sections)
  const swipeableSections = useMemo(() => {
    if (!analysis) return [];
    return [
      { id: 'current-allocation', title: 'Current Allocation', index: 0 },
      { id: 'diversification', title: 'Diversification Score', index: 1 },
      { id: 'risk-metrics', title: 'Risk Metrics', index: 2 },
      { id: 'performance-metrics', title: 'Performance Metrics', index: 3 },
      { id: 'efficient-frontier', title: 'Efficient Frontier', index: 4 },
    ];
  }, [analysis]);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Swipe navigation handlers
  const handleSwipeLeft = () => {
    if (activeSection < swipeableSections.length - 1) {
      const nextSection = activeSection + 1;
      setActiveSection(nextSection);
      scrollToSection(nextSection);
    }
  };

  const handleSwipeRight = () => {
    if (activeSection > 0) {
      const prevSection = activeSection - 1;
      setActiveSection(prevSection);
      scrollToSection(prevSection);
    }
  };

  const scrollToSection = (index: number) => {
    const sectionElement = sectionRefs.current[index];
    if (sectionElement) {
      sectionElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  };

  // Keyboard navigation for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isMobile || !analysis) return;

      if (e.key === 'ArrowLeft' && activeSection > 0) {
        e.preventDefault();
        handleSwipeRight();
      } else if (e.key === 'ArrowRight' && activeSection < swipeableSections.length - 1) {
        e.preventDefault();
        handleSwipeLeft();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, analysis, activeSection, swipeableSections.length]);

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    if (!analysis) return; // Only refresh if analysis exists
    await analyzeAllocation();
  };

  // Pull-to-refresh hook
  const {
    containerRef: pullToRefreshRef,
    isPulling,
    isRefreshing,
    pullDistance,
    shouldTriggerRefresh,
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    maxPullDistance: 150,
    resistance: 0.5,
    enabled: isMobile && !!analysis, // Only enable on mobile when analysis exists
  });

  // Online/offline status
  const { isOnline } = useOnline();
  const [cachedAnalysisTimestamp, setCachedAnalysisTimestamp] = useState<Date | null>(null);

  // Offline queue
  const { addToQueue, pendingCount } = useOfflineQueue();

  // Load cached timestamp on mount
  useEffect(() => {
    const cachedTimestamp = localStorage.getItem('allocation-analysis-timestamp');
    if (cachedTimestamp) {
      setCachedAnalysisTimestamp(new Date(cachedTimestamp));
    }
  }, []);

  // Generate efficient frontier data
  const efficientFrontierData = useMemo(() => {
    const service = getAssetAllocationService();
    return service.generateEfficientFrontier(20);
  }, []);

  // Calculate current portfolio position for the chart
  const currentPortfolioPosition = useMemo(() => {
    if (!analysis) return undefined;

    return {
      volatility: analysis.riskMetrics.portfolioVolatility * 100,
      expectedReturn: analysis.performanceMetrics.expectedReturn * 100,
      label: 'Current Portfolio',
    };
  }, [analysis]);

  // Calculate recommended portfolio position for the chart
  const recommendedPortfolioPosition = useMemo(() => {
    if (!analysis) return undefined;

    return {
      volatility: analysis.recommendedModel.expectedVolatility * 100,
      expectedReturn: analysis.recommendedModel.expectedReturn * 100,
      label: `Recommended (${analysis.recommendedModel.name})`,
    };
  }, [analysis]);

  const analyzeAllocation = async () => {
    setLoading(true);
    setError(null);

    // If offline, queue the action instead of executing it
    if (!isOnline) {
      try {
        addToQueue({
          type: 'analysis',
          endpoint: '/api/investments/allocation-analysis',
          method: 'POST',
          data: {
            portfolio,
            riskTolerance,
            constraints: {
              transactionCostPerTrade: 10,
              minPositionSize: 0.01,
            },
          },
          maxRetries: 3,
        });

        setError('You are offline. Analysis request queued for when you reconnect.');
        setLoading(false);
        return;
      } catch (err) {
        setError('Failed to queue analysis request');
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/investments/allocation-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio,
          riskTolerance,
          constraints: {
            transactionCostPerTrade: 10,
            minPositionSize: 0.01,
          },
        }),
        // Use cache when offline
        cache: isOnline ? 'default' : 'force-cache',
      });

      const result = await response.json();

      if (result.success) {
        setAnalysis(result.data);
        // Update cached timestamp when we get fresh data
        if (isOnline) {
          const timestamp = new Date();
          setCachedAnalysisTimestamp(timestamp);
          // Store in localStorage for persistence
          localStorage.setItem('allocation-analysis-timestamp', timestamp.toISOString());
        }
      } else {
        setError(result.error || 'Failed to analyze allocation');
      }
    } catch (err) {
      // If offline, try to load from cache
      if (!isOnline) {
        const cachedTimestamp = localStorage.getItem('allocation-analysis-timestamp');
        if (cachedTimestamp) {
          setCachedAnalysisTimestamp(new Date(cachedTimestamp));
        }
        setError('You are offline. Showing cached data if available.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to analyze allocation');
      }
    } finally {
      setLoading(false);
    }
  };

  const getAssetClassColor = (assetClass: AssetClass): string => {
    const colors: Record<AssetClass, string> = {
      [AssetClass.STOCKS]: 'bg-blue-500',
      [AssetClass.BONDS]: 'bg-green-500',
      [AssetClass.CASH]: 'bg-gray-500',
      [AssetClass.REAL_ESTATE]: 'bg-blue-500',
      [AssetClass.COMMODITIES]: 'bg-yellow-500',
      [AssetClass.CRYPTO]: 'bg-orange-500',
      [AssetClass.ALTERNATIVES]: 'bg-emerald-500',
    };
    return colors[assetClass] || 'bg-gray-500';
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-gray-100 dark:bg-slate-900 rounded-lg transition-colors duration-200">
      {/* Offline Indicator */}
      <OfflineIndicator
        showCachedTimestamp={true}
        cachedAt={cachedAnalysisTimestamp}
        position="top"
        variant="banner"
      />

      {/* Offline Queue Status */}
      {pendingCount > 0 && (
        <OfflineQueueStatus variant="compact" className="mb-2" />
      )}

      {/* Header - Mobile Responsive */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Asset Allocation Analysis
          </h2>
          {/* Theme Toggle */}
          <ThemeToggle variant="icon" className="flex-shrink-0" />
        </div>

        {/* Controls - Stack on mobile, row on desktop */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <label htmlFor="risk-tolerance-select" className="sr-only">
            Select Risk Tolerance Level
          </label>
          <select
            id="risk-tolerance-select"
            value={riskTolerance}
            onChange={(e) => setRiskTolerance(e.target.value as RiskTolerance)}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-base rounded-lg border-2 border-gray-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 min-h-[44px] transition-colors duration-200"
            aria-label="Risk tolerance level"
          >
            <option value={RiskTolerance.VERY_CONSERVATIVE}>Very Conservative</option>
            <option value={RiskTolerance.CONSERVATIVE}>Conservative</option>
            <option value={RiskTolerance.MODERATE}>Moderate</option>
            <option value={RiskTolerance.AGGRESSIVE}>Aggressive</option>
            <option value={RiskTolerance.VERY_AGGRESSIVE}>Very Aggressive</option>
          </select>
          <button
            onClick={analyzeAllocation}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:scale-95 text-white text-base font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 min-h-[44px]"
            aria-label={loading ? 'Analyzing portfolio allocation' : 'Analyze portfolio allocation'}
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-500 rounded-lg text-red-700 dark:text-red-400 transition-colors duration-200"
          role="alert"
          aria-live="assertive"
        >
          <strong className="font-semibold">Error: </strong>
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !analysis && <AssetAllocationSkeleton />}

      {analysis && (
        <div
          ref={pullToRefreshRef}
          className="relative space-y-4 sm:space-y-6 overflow-y-auto"
          style={{
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Pull-to-Refresh Indicator */}
          <PullToRefreshIndicator
            isPulling={isPulling}
            isRefreshing={isRefreshing}
            pullDistance={pullDistance}
            threshold={80}
          />
          {/* Swipe Navigation Indicator (Mobile Only) */}
          {isMobile && swipeableSections.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-2">
              {swipeableSections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(index);
                    scrollToSection(index);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    activeSection === index ? 'w-8 bg-blue-500' : 'w-2 bg-gray-400 dark:bg-slate-600'
                  }`}
                  aria-label={`Navigate to ${section.title}`}
                  aria-current={activeSection === index ? 'true' : 'false'}
                />
              ))}
            </div>
          )}

          {/* Current Allocation - Collapsible */}
          <CollapsibleSection
            title="Current Allocation"
            defaultExpanded={true}
            sectionId="current-allocation"
            isActive={isMobile && activeSection === 0}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            showSwipeIndicators={isMobile}
            sectionRef={(el) => (sectionRefs.current[0] = el)}
          >
            <div className="space-y-3">
              {analysis.currentAllocations.map((allocation) => (
                <div key={allocation.assetClass} className="space-y-2">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-gray-600 dark:text-slate-300 capitalize">
                      {allocation.assetClass.replace('_', ' ')}
                    </span>
                    <span className="text-gray-900 dark:text-white font-semibold">
                      {allocation.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-300 dark:bg-slate-700 rounded-full h-2 sm:h-3 transition-colors duration-200">
                    <div
                      className={`${getAssetClassColor(allocation.assetClass)} h-2 sm:h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${allocation.percentage}%` }}
                      role="progressbar"
                      aria-valuenow={allocation.percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${allocation.assetClass} allocation: ${allocation.percentage.toFixed(1)}%`}
                    />
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                    ${allocation.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Diversification Score - Collapsible */}
          <CollapsibleSection
            title="Diversification Score"
            defaultExpanded={true}
            sectionId="diversification"
            isActive={isMobile && activeSection === 1}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            showSwipeIndicators={isMobile}
            sectionRef={(el) => (sectionRefs.current[1] = el)}
          >
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <div className="w-full bg-gray-300 dark:bg-slate-700 rounded-full h-4 sm:h-6 transition-colors duration-200">
                  <div
                    className={`h-4 sm:h-6 rounded-full transition-all duration-500 ${
                      analysis.diversificationScore >= 70
                        ? 'bg-green-500'
                        : analysis.diversificationScore >= 40
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${analysis.diversificationScore}%` }}
                    role="progressbar"
                    aria-valuenow={analysis.diversificationScore}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Diversification score: ${analysis.diversificationScore} out of 100`}
                  />
                </div>
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {analysis.diversificationScore}/100
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-slate-400">
              {analysis.diversificationScore >= 70
                ? 'Well diversified portfolio'
                : analysis.diversificationScore >= 40
                ? 'Moderate diversification - consider spreading investments'
                : 'Low diversification - high concentration risk'}
            </p>
          </CollapsibleSection>

          {/* Risk Metrics - Collapsible */}
          <CollapsibleSection
            title="Risk Metrics"
            defaultExpanded={false}
            sectionId="risk-metrics"
            isActive={isMobile && activeSection === 2}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            showSwipeIndicators={isMobile}
            sectionRef={(el) => (sectionRefs.current[2] = el)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-gray-50 dark:bg-slate-750 p-4 rounded-lg transition-colors duration-200">
                <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Volatility</div>
                <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  {(analysis.riskMetrics.portfolioVolatility * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">Standard deviation</div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-750 p-4 rounded-lg transition-colors duration-200">
                <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Beta</div>
                <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  {analysis.riskMetrics.portfolioBeta.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">Market correlation</div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-750 p-4 rounded-lg transition-colors duration-200">
                <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">VaR (95%)</div>
                <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  ${analysis.riskMetrics.valueAtRisk.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">Value at risk</div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-750 p-4 rounded-lg transition-colors duration-200">
                <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Max Drawdown</div>
                <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  {(analysis.riskMetrics.maxDrawdown * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">Worst decline</div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Performance Metrics - Collapsible */}
          <CollapsibleSection
            title="Performance Metrics"
            defaultExpanded={false}
            sectionId="performance-metrics"
            isActive={isMobile && activeSection === 3}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            showSwipeIndicators={isMobile}
            sectionRef={(el) => (sectionRefs.current[3] = el)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-gray-50 dark:bg-slate-750 p-4 rounded-lg transition-colors duration-200">
                <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Expected Return</div>
                <div className="text-xl sm:text-2xl font-semibold text-green-600 dark:text-green-400">
                  {(analysis.performanceMetrics.expectedReturn * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">Annual projection</div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-750 p-4 rounded-lg transition-colors duration-200">
                <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Sharpe Ratio</div>
                <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  {analysis.performanceMetrics.sharpeRatio.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">Risk-adjusted return</div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-750 p-4 rounded-lg transition-colors duration-200">
                <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Sortino Ratio</div>
                <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  {analysis.performanceMetrics.sortinoRatio.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">Downside risk</div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-750 p-4 rounded-lg transition-colors duration-200">
                <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Information Ratio</div>
                <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  {analysis.performanceMetrics.informationRatio.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">Benchmark comparison</div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Efficient Frontier Chart - Collapsible */}
          <CollapsibleSection
            title="Efficient Frontier"
            defaultExpanded={false}
            sectionId="efficient-frontier"
            isActive={isMobile && activeSection === 4}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            showSwipeIndicators={isMobile}
            sectionRef={(el) => (sectionRefs.current[4] = el)}
          >
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[320px]">
                <EfficientFrontierChart
                  frontierPoints={efficientFrontierData}
                  currentPortfolio={currentPortfolioPosition}
                  recommendedPortfolio={recommendedPortfolioPosition}
                  height={isMobile ? 300 : 450}
                />
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-slate-400">
              The efficient frontier shows the optimal risk-return tradeoff. Your current portfolio (red diamond) and recommended portfolio (green star) are plotted against the optimal frontier (blue curve).
            </p>
          </CollapsibleSection>

          {/* Rebalancing Recommendations - Collapsible */}
          {analysis.needsRebalancing && analysis.rebalancingRecommendations.length > 0 && (
            <CollapsibleSection
              title={`Rebalancing Recommendations (${analysis.rebalancingRecommendations.length})`}
              defaultExpanded={true}
              sectionId="rebalancing"
            >
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700/50 rounded-lg transition-colors duration-200">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
                    Portfolio deviation: {analysis.deviationFromTarget.toFixed(1)}% from target allocation
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {analysis.rebalancingRecommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg border-2 border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{rec.symbol}</span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${ rec.priority === 'high' ? 'bg-red-100 text-red-700' : rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' }`}
                          aria-label={`Priority: ${rec.priority}`}
                        >
                          {rec.priority.toUpperCase()}
                        </span>
                      </div>
                      <span
                        className={`px-4 py-2 rounded font-semibold text-sm min-h-[44px] flex items-center justify-center ${ rec.action === 'buy' ? 'bg-green-100 text-green-700' : rec.action === 'sell' ? 'bg-red-100 text-red-700' : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-300' }`}
                        aria-label={`Action: ${rec.action}`}
                      >
                        {rec.action.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm sm:text-base text-gray-700 dark:text-slate-300 mb-3">{rec.reason}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
                      <div className="bg-gray-100 dark:bg-slate-750 p-2 rounded transition-colors duration-200">
                        <span className="text-gray-600 dark:text-slate-400 block mb-1">Current</span>
                        <span className="text-gray-900 dark:text-white font-semibold">{rec.currentPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="bg-gray-100 dark:bg-slate-750 p-2 rounded transition-colors duration-200">
                        <span className="text-gray-600 dark:text-slate-400 block mb-1">Target</span>
                        <span className="text-gray-900 dark:text-white font-semibold">{rec.targetPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="bg-gray-100 dark:bg-slate-750 p-2 rounded transition-colors duration-200">
                        <span className="text-gray-600 dark:text-slate-400 block mb-1">Shares</span>
                        <span className="text-gray-900 dark:text-white font-semibold">
                          {rec.action === 'buy' ? '+' : '-'}
                          {rec.sharesToTrade}
                        </span>
                      </div>
                      <div className="bg-gray-100 dark:bg-slate-750 p-2 rounded transition-colors duration-200">
                        <span className="text-gray-600 dark:text-slate-400 block mb-1">Value</span>
                        <span className="text-gray-900 dark:text-white font-semibold">${rec.valueToTrade.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {onRebalance && (
                <button
                  onClick={() => onRebalance(analysis.rebalancingRecommendations)}
                  className="mt-6 w-full px-6 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 active:scale-95 text-white text-base font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 min-h-[44px]"
                  aria-label="Execute portfolio rebalancing recommendations"
                >
                  Execute Rebalancing
                </button>
              )}
            </CollapsibleSection>
          )}

          {!analysis.needsRebalancing && (
            <div
              className="bg-green-50 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-500 p-4 sm:p-6 rounded-lg transition-colors duration-200"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-lg sm:text-xl font-semibold">Portfolio is well-balanced!</span>
              </div>
              <div className="text-sm sm:text-base text-green-300 mt-3">
                Your current allocation is within acceptable ranges for your {riskTolerance.toLowerCase().replace('_', ' ')} risk tolerance.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
