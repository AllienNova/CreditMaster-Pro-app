/**
 * Data Aggregator
 * 
 * Aggregates and processes data for analytics:
 * - Time-based aggregation
 * - Statistical calculations
 * - Data transformation
 * - Trend analysis
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AggregationOptions {
  groupBy: 'hour' | 'day' | 'week' | 'month' | 'year';
  metrics: string[];
  filters?: Record<string, unknown>;
}

export interface AggregatedData {
  period: string;
  metrics: Record<string, number>;
  count: number;
}

export interface StatisticalSummary {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  variance: number;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  change_percentage: number;
  confidence: number;
  prediction_next_period?: number;
}

// ============================================================================
// DATA AGGREGATOR CLASS
// ============================================================================

export class DataAggregator {
  
  /**
   * Aggregate data by time period
   */
  static aggregateByTime(
    data: Array<Record<string, unknown>>,
    dateField: string,
    options: AggregationOptions
  ): AggregatedData[] {
    console.log(`📊 Aggregating data by ${options.groupBy}`);
    
    const grouped = new Map<string, Record<string, unknown>[]>();
    
    // Group data by time period
    data.forEach(item => {
      const rawValue = item[dateField];
      if (!(typeof rawValue === 'string' || typeof rawValue === 'number' || rawValue instanceof Date)) {
        return;
      }
      const date = new Date(rawValue);
      const period = this.getPeriodKey(date, options.groupBy);
      
      if (!grouped.has(period)) {
        grouped.set(period, []);
      }
      grouped.get(period)!.push(item);
    });
    
    // Calculate metrics for each period
    const aggregated: AggregatedData[] = [];
    
    grouped.forEach((items, period) => {
      const metrics: Record<string, number> = {};
      
      options.metrics.forEach(metric => {
        const values = items
          .map(item => Number(item[metric]))
          .filter((value): value is number => Number.isFinite(value));
        metrics[metric] = values.reduce((sum, val) => sum + val, 0);
      });
      
      aggregated.push({
        period,
        metrics,
        count: items.length
      });
    });
    
    // Sort by period
    return aggregated.sort((a, b) => a.period.localeCompare(b.period));
  }
  
  /**
   * Get period key for grouping
   */
  private static getPeriodKey(date: Date, groupBy: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    
    switch (groupBy) {
      case 'hour':
        return `${year}-${month}-${day} ${hour}:00`;
      case 'day':
        return `${year}-${month}-${day}`;
      case 'week':
        const weekNum = this.getWeekNumber(date);
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
      case 'month':
        return `${year}-${month}`;
      case 'year':
        return `${year}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }
  
  /**
   * Get week number
   */
  private static getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
  
  /**
   * Calculate statistical summary
   */
  static calculateStatistics(values: number[]): StatisticalSummary {
    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
        stdDev: 0,
        variance: 0
      };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;
    
    // Median
    const median = count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];
    
    // Variance and standard deviation
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);
    
    return {
      count,
      sum,
      mean,
      median,
      min: sorted[0],
      max: sorted[count - 1],
      stdDev,
      variance
    };
  }
  
  /**
   * Analyze trend
   */
  static analyzeTrend(values: number[]): TrendAnalysis {
    if (values.length < 2) {
      return {
        direction: 'stable',
        change_percentage: 0,
        confidence: 0
      };
    }
    
    // Calculate linear regression
    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    const sumX = indices.reduce((sum, x) => sum + x, 0);
    const sumY = values.reduce((sum, y) => sum + y, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared (confidence)
    const meanY = sumY / n;
    const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    const ssResidual = values.reduce((sum, y, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const rSquared = 1 - (ssResidual / ssTotal);
    
    // Determine direction
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const changePercentage = ((lastValue - firstValue) / firstValue) * 100;
    
    let direction: 'up' | 'down' | 'stable';
    if (Math.abs(changePercentage) < 5) {
      direction = 'stable';
    } else if (changePercentage > 0) {
      direction = 'up';
    } else {
      direction = 'down';
    }
    
    // Predict next value
    const predictionNextPeriod = slope * n + intercept;
    
    return {
      direction,
      change_percentage: changePercentage,
      confidence: Math.max(0, Math.min(1, rSquared)),
      prediction_next_period: predictionNextPeriod
    };
  }
  
  /**
   * Calculate moving average
   */
  static calculateMovingAverage(values: number[], windowSize: number): number[] {
    if (values.length < windowSize) {
      return values;
    }
    
    const result: number[] = [];
    
    for (let i = 0; i <= values.length - windowSize; i++) {
      const window = values.slice(i, i + windowSize);
      const avg = window.reduce((sum, val) => sum + val, 0) / windowSize;
      result.push(avg);
    }
    
    return result;
  }
  
  /**
   * Calculate percentage change
   */
  static calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }
  
  /**
   * Group data by field
   */
  static groupBy<T extends Record<string, unknown>, K extends keyof T>(data: T[], field: K): Map<T[K], T[]> {
    const grouped = new Map<T[K], T[]>();
    
    data.forEach(item => {
      const key = item[field];
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    });
    
    return grouped;
  }
  
  /**
   * Calculate percentile
   */
  static calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    if (lower === upper) {
      return sorted[lower];
    }
    
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
  
  /**
   * Calculate growth rate
   */
  static calculateGrowthRate(values: number[]): number {
    if (values.length < 2) return 0;
    
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const periods = values.length - 1;
    
    if (firstValue === 0) return 0;
    
    // Compound Annual Growth Rate (CAGR)
    return (Math.pow(lastValue / firstValue, 1 / periods) - 1) * 100;
  }
  
  /**
   * Normalize data to 0-1 range
   */
  static normalize(values: number[]): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    if (range === 0) return values.map(() => 0);
    
    return values.map(val => (val - min) / range);
  }
  
  /**
   * Calculate correlation between two datasets
   */
  static calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    if (denominator === 0) return 0;
    
    return numerator / denominator;
  }
}

export default DataAggregator;
