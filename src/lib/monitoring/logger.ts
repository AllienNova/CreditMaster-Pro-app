/**
 * Structured Logging Service
 * 
 * Production-ready logging with:
 * - Multiple log levels
 * - Structured JSON output
 * - Context enrichment
 * - Performance tracking
 * - Error serialization
 * - Log rotation
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  model?: string;
  duration?: number;
  cost?: number;
  tokens?: number;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    duration: number;
    memory: number;
    cpu?: number;
  };
}

/**
 * Logger class for structured logging
 */
class Logger {
  private serviceName: string;
  private environment: string;
  private minLevel: LogLevel;
  
  constructor(serviceName: string = 'creditmaster-pro') {
    this.serviceName = serviceName;
    this.environment = process.env.NODE_ENV || 'development';
    this.minLevel = this.getMinLevel();
  }
  
  private getMinLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toLowerCase();
    if (level === 'debug' || level === 'info' || level === 'warn' || level === 'error' || level === 'fatal') {
      return level;
    }
    return this.environment === 'production' ? 'info' : 'debug';
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    const currentLevelIndex = levels.indexOf(this.minLevel);
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex >= currentLevelIndex;
  }
  
  private formatLog(entry: LogEntry): string {
    const formatted = {
      ...entry,
      service: this.serviceName,
      environment: this.environment,
      timestamp: new Date().toISOString(),
    };
    
    if (this.environment === 'development') {
      // Pretty print for development
      return this.prettyPrint(formatted);
    }
    
    // JSON for production (for log aggregation)
    return JSON.stringify(formatted);
  }
  
  private prettyPrint(entry: any): string {
    const level = entry.level.toUpperCase().padEnd(5);
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const message = entry.message;
    
    let output = `[${timestamp}] ${level} ${message}`;
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }
    
    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  Stack: ${entry.error.stack}`;
      }
    }
    
    if (entry.performance) {
      output += `\n  Performance: ${entry.performance.duration}ms, ${entry.performance.memory}MB`;
    }
    
    return output;
  }
  
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }
    
    const formatted = this.formatLog(entry);
    
    // Output to console (in production, this would go to log aggregation service)
    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
      case 'fatal':
        console.error(formatted);
        break;
    }
    
    // In production, also send to:
    // - CloudWatch Logs
    // - Datadog
    // - New Relic
    // - Elasticsearch
    // etc.
  }
  
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }
  
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }
  
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }
  
  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, context, error);
  }
  
  fatal(message: string, error?: Error, context?: LogContext): void {
    this.log('fatal', message, context, error);
  }
  
  /**
   * Log AI interaction
   */
  aiInteraction(data: {
    model: string;
    prompt: string;
    response: string;
    tokens: number;
    cost: number;
    duration: number;
    userId?: string;
    success: boolean;
  }): void {
    this.info('AI Interaction', {
      model: data.model,
      tokens: data.tokens,
      cost: data.cost,
      duration: data.duration,
      userId: data.userId,
      success: data.success,
      promptLength: data.prompt.length,
      responseLength: data.response.length,
    });
  }
  
  /**
   * Log API request
   */
  apiRequest(data: {
    method: string;
    path: string;
    statusCode: number;
    duration: number;
    userId?: string;
    ipAddress?: string;
  }): void {
    const level = data.statusCode >= 500 ? 'error' : 
                  data.statusCode >= 400 ? 'warn' : 'info';
    
    this.log(level, `API Request: ${data.method} ${data.path}`, {
      method: data.method,
      path: data.path,
      statusCode: data.statusCode,
      duration: data.duration,
      userId: data.userId,
      ipAddress: data.ipAddress,
    });
  }
  
  /**
   * Log security event
   */
  securityEvent(data: {
    event: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    ipAddress?: string;
    details?: any;
  }): void {
    const level = data.severity === 'critical' || data.severity === 'high' ? 'error' : 'warn';
    
    this.log(level, `Security Event: ${data.event}`, {
      event: data.event,
      severity: data.severity,
      userId: data.userId,
      ipAddress: data.ipAddress,
      ...data.details,
    });
  }
  
  /**
   * Log performance metric
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation}`, {
      ...context,
      duration,
      operation,
    });
  }
  
  /**
   * Create child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger(this.serviceName);
    const originalLog = childLogger.log.bind(childLogger);
    
    childLogger.log = (level: LogLevel, message: string, childContext?: LogContext, error?: Error) => {
      originalLog(level, message, { ...context, ...childContext }, error);
    };
    
    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Create request logger with context
 */
export function createRequestLogger(requestId: string, userId?: string): Logger {
  return logger.child({ requestId, userId });
}

/**
 * Performance tracking decorator
 */
export function trackPerformance(operation: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;
        logger.performance(operation, duration);
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        logger.error(`${operation} failed`, error as Error, { duration });
        throw error;
      }
    };
    
    return descriptor;
  };
}

/**
 * Log rotation configuration
 */
export interface LogRotationConfig {
  maxSize: string; // e.g., '10m', '100m', '1g'
  maxFiles: number;
  compress: boolean;
}

/**
 * Default log rotation config
 */
export const DEFAULT_LOG_ROTATION: LogRotationConfig = {
  maxSize: '100m',
  maxFiles: 10,
  compress: true,
};

/**
 * Log aggregation configuration
 */
export interface LogAggregationConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  batchSize?: number;
  flushInterval?: number; // milliseconds
}

/**
 * Default log aggregation config
 */
export const DEFAULT_LOG_AGGREGATION: LogAggregationConfig = {
  enabled: process.env.NODE_ENV === 'production',
  endpoint: process.env.LOG_AGGREGATION_ENDPOINT,
  apiKey: process.env.LOG_AGGREGATION_API_KEY,
  batchSize: 100,
  flushInterval: 5000, // 5 seconds
};

