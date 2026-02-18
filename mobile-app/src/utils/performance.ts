/**
 * Fynvita Performance Utilities
 * Provides performance monitoring and optimization helpers
 */

import { InteractionManager, Platform } from "react-native";

/**
 * Performance metrics storage
 */
interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

const metrics: Map<string, PerformanceMetric> = new Map();

/**
 * Start measuring a performance metric
 */
export const startMeasure = (name: string): void => {
  metrics.set(name, {
    name,
    startTime: performance.now(),
  });
};

/**
 * End measuring a performance metric
 */
export const endMeasure = (name: string): number | null => {
  const metric = metrics.get(name);
  if (!metric) return null;

  const endTime = performance.now();
  const duration = endTime - metric.startTime;

  metrics.set(name, {
    ...metric,
    endTime,
    duration,
  });

  if (__DEV__) {
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  }

  return duration;
};

/**
 * Get all recorded metrics
 */
export const getMetrics = (): PerformanceMetric[] => {
  return Array.from(metrics.values());
};

/**
 * Clear all metrics
 */
export const clearMetrics = (): void => {
  metrics.clear();
};

/**
 * Run task after interactions complete (for non-critical operations)
 */
export const runAfterInteractions = <T>(
  task: () => T | Promise<T>,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    InteractionManager.runAfterInteractions(() => {
      try {
        const result = task();
        if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Debounce function for performance optimization
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

/**
 * Throttle function for performance optimization
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * Memoize function results
 */
export const memoize = <T extends (...args: unknown[]) => unknown>(
  func: T,
  keyResolver?: (...args: Parameters<T>) => string,
): T => {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = keyResolver ? keyResolver(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func(...args) as ReturnType<T>;
    cache.set(key, result);
    return result;
  }) as T;
};

/**
 * Batch multiple state updates
 */
export const batchUpdates = (callback: () => void): void => {
  // React Native automatically batches updates in event handlers
  // This is a placeholder for explicit batching if needed
  callback();
};

/**
 * Image optimization helpers
 */
export const imageOptimization = {
  /**
   * Get optimal image size based on device pixel ratio
   */
  getOptimalSize: (baseSize: number): number => {
    const pixelRatio = Platform.select({
      ios: 2,
      android: 2,
      default: 1,
    });
    return Math.ceil(baseSize * pixelRatio);
  },

  /**
   * Get image cache key
   */
  getCacheKey: (uri: string, width: number, height: number): string => {
    return `${uri}_${width}x${height}`;
  },
};

/**
 * List optimization helpers
 */
export const listOptimization = {
  /**
   * Get optimal window size for FlatList
   */
  getWindowSize: (itemHeight: number, screenHeight: number): number => {
    return Math.ceil(screenHeight / itemHeight) + 5;
  },

  /**
   * Get optimal initial render count
   */
  getInitialNumToRender: (itemHeight: number, screenHeight: number): number => {
    return Math.ceil(screenHeight / itemHeight) + 2;
  },

  /**
   * Get optimal max to render per batch
   */
  getMaxToRenderPerBatch: (): number => {
    return Platform.select({
      ios: 10,
      android: 5,
      default: 10,
    });
  },
};
