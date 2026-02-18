/**
 * usePullToRefresh Hook
 *
 * Custom React hook for implementing pull-to-refresh functionality on mobile devices.
 * Uses native touch events and CSS transforms for smooth animations.
 */

import { useEffect, useRef, useState, useCallback } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // Distance in pixels to trigger refresh
  maxPullDistance?: number; // Maximum pull distance
  resistance?: number; // Pull resistance factor (0-1)
  enabled?: boolean; // Enable/disable pull-to-refresh
}

interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPullDistance = 150,
  resistance = 0.5,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
  });

  const touchStartY = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || state.isRefreshing) return;

      const container = containerRef.current;
      if (!container) return;

      // Only trigger if scrolled to top
      if (container.scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY;
      }
    },
    [enabled, state.isRefreshing],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || state.isRefreshing || touchStartY.current === 0) return;

      const container = containerRef.current;
      if (!container || container.scrollTop > 0) return;

      const touchY = e.touches[0].clientY;
      const pullDistance = touchY - touchStartY.current;

      if (pullDistance > 0) {
        // Prevent default scrolling when pulling down
        e.preventDefault();

        // Apply resistance to pull distance
        const resistedDistance = Math.min(
          pullDistance * resistance,
          maxPullDistance,
        );

        setState({
          isPulling: true,
          isRefreshing: false,
          pullDistance: resistedDistance,
        });
      }
    },
    [enabled, state.isRefreshing, resistance, maxPullDistance],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || state.isRefreshing) return;

    const { pullDistance } = state;

    if (pullDistance >= threshold) {
      // Trigger refresh
      setState({
        isPulling: false,
        isRefreshing: true,
        pullDistance: threshold,
      });

      try {
        await onRefresh();
      } finally {
        setState({
          isPulling: false,
          isRefreshing: false,
          pullDistance: 0,
        });
      }
    } else {
      // Reset state
      setState({
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
      });
    }

    touchStartY.current = 0;
  }, [enabled, state, threshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    isPulling: state.isPulling,
    isRefreshing: state.isRefreshing,
    pullDistance: state.pullDistance,
    shouldTriggerRefresh: state.pullDistance >= threshold,
  };
}
