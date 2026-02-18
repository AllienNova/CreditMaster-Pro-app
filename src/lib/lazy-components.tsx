/**
 * Lazy Component Loader
 * Phase 6.5.4: Lazy loading implementation for components
 *
 * Centralized lazy loading configuration for heavy components
 */

import dynamic from "next/dynamic";
import { ComponentType, ReactElement } from "react";

// Loading component for lazy-loaded components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// ============================================================================
// CHAT COMPONENTS
// ============================================================================

export const ChatInterface = dynamic(
  () =>
    import("@/components/chat/ChatInterface").then((mod) => mod.ChatInterface),
  {
    loading: () => <LoadingSpinner />,
    ssr: false, // Disable SSR for chat interface (requires client-side auth)
  },
);

export const ChatMessageList = dynamic(
  () =>
    import("@/components/chat/ChatMessageList").then(
      (mod) => mod.ChatMessageList,
    ),
  {
    loading: () => <LoadingSpinner />,
  },
);

export const ChatSidebar = dynamic(
  () => import("@/components/chat/ChatSidebar").then((mod) => mod.ChatSidebar),
  {
    loading: () => <LoadingSpinner />,
  },
);

// ============================================================================
// INVESTMENT COMPONENTS
// ============================================================================

export const ComprehensiveAnalysisPanel = dynamic(
  () =>
    import("@/components/investments/analysis/ComprehensiveAnalysisPanel").then(
      (mod) => mod.ComprehensiveAnalysisPanel,
    ),
  {
    loading: () => <LoadingSpinner />,
    ssr: false, // Heavy component with charts
  },
);

export const AssetAllocationPanel = dynamic(
  () =>
    import("@/components/investments/allocation/AssetAllocationPanel").then(
      (mod) => mod.default,
    ),
  {
    loading: () => <LoadingSpinner />,
    ssr: false, // Heavy component with charts
  },
);

// ============================================================================
// FINANCIAL COMPONENTS
// ============================================================================

// Note: Financial components are imported directly where needed

// ============================================================================
// CHART COMPONENTS
// ============================================================================

export const LineChart = dynamic(
  () => import("@/components/charts/LineChart"),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  },
);

export const PieChart = dynamic(() => import("@/components/charts/PieChart"), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});

export const BarChart = dynamic(() => import("@/components/charts/BarChart"), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a lazy-loaded component with custom loading state
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: {
    loading?: () => ReactElement;
    ssr?: boolean;
  },
) {
  return dynamic(importFn, {
    loading: options?.loading || (() => <LoadingSpinner />),
    ssr: options?.ssr ?? true,
  });
}
