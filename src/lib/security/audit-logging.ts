/**
 * Audit Logging Service
 * 
 * Provides comprehensive logging for:
 * - AI interactions
 * - Security events
 * - User actions
 * - System events
 * - Compliance tracking
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export type EventType = 
  | 'ai_request'
  | 'ai_response'
  | 'auth_success'
  | 'auth_failure'
  | 'permission_denied'
  | 'rate_limit_exceeded'
  | 'input_validation_failed'
  | 'output_validation_failed'
  | 'pii_detected'
  | 'harmful_content_detected'
  | 'cost_limit_exceeded'
  | 'api_error'
  | 'system_error';

type LogMetadata = Record<string, unknown>;
type StructuredRecord = Record<string, unknown>;

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  eventType: EventType;
  message: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: LogMetadata;
  duration?: number; // milliseconds
  cost?: number; // dollars
  tokens?: number;
  model?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface AIInteractionLog extends LogEntry {
  eventType: 'ai_request' | 'ai_response';
  model: string;
  prompt?: string;
  response?: string;
  tokens: number;
  cost: number;
  duration: number;
  validationResult?: {
    inputValid: boolean;
    outputValid: boolean;
    issues: string[];
  };
}

export interface SecurityEventLog extends LogEntry {
  eventType: 
    | 'auth_failure'
    | 'permission_denied'
    | 'rate_limit_exceeded'
    | 'input_validation_failed'
    | 'harmful_content_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'blocked' | 'allowed' | 'flagged';
}

/**
 * In-memory log store
 * In production, use a proper logging service (e.g., Winston, Pino, or cloud logging)
 */
class LogStore {
  private logs: LogEntry[] = [];
  private maxLogs = 10000; // Keep last 10k logs in memory

  add(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  query(filter: Partial<LogEntry>): LogEntry[] {
    return this.logs.filter(log => {
      for (const [key, value] of Object.entries(filter)) {
        if (log[key as keyof LogEntry] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  getRecent(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  clear(): void {
    this.logs = [];
  }

  count(): number {
    return this.logs.length;
  }
}

const logStore = new LogStore();

/**
 * Generate unique log ID
 */
function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create log entry
 */
export function createLogEntry(
  level: LogLevel,
  eventType: EventType,
  message: string,
  metadata?: LogMetadata
): LogEntry {
  return {
    id: generateLogId(),
    timestamp: new Date(),
    level,
    eventType,
    message,
    metadata,
  };
}

/**
 * Log AI interaction
 */
export function logAIInteraction(data: {
  userId?: string;
  model: string;
  prompt: string;
  response: string;
  tokens: number;
  cost: number;
  duration: number;
  inputValid: boolean;
  outputValid: boolean;
  issues?: string[];
}): void {
  const entry: AIInteractionLog = {
    id: generateLogId(),
    timestamp: new Date(),
    level: 'info',
    eventType: 'ai_request',
    message: `AI request to ${data.model}`,
    userId: data.userId,
    model: data.model,
    prompt: data.prompt.substring(0, 500), // Truncate for storage
    response: data.response.substring(0, 500),
    tokens: data.tokens,
    cost: data.cost,
    duration: data.duration,
    validationResult: {
      inputValid: data.inputValid,
      outputValid: data.outputValid,
      issues: data.issues || [],
    },
  };
  
  logStore.add(entry);
  
  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[AI Interaction]', {
      model: data.model,
      tokens: data.tokens,
      cost: data.cost,
      duration: data.duration,
    });
  }
}

/**
 * Log security event
 */
export function logSecurityEvent(data: {
  eventType: SecurityEventLog['eventType'];
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'blocked' | 'allowed' | 'flagged';
  userId?: string;
  ipAddress?: string;
  metadata?: LogMetadata;
}): void {
  const entry: SecurityEventLog = {
    id: generateLogId(),
    timestamp: new Date(),
    level: data.severity === 'critical' ? 'critical' : 
           data.severity === 'high' ? 'error' : 
           data.severity === 'medium' ? 'warn' : 'info',
    eventType: data.eventType,
    message: data.message,
    userId: data.userId,
    ipAddress: data.ipAddress,
    severity: data.severity,
    action: data.action,
    metadata: data.metadata,
  };
  
  logStore.add(entry);
  
  // Log to console
  console.log(`[Security Event - ${data.severity.toUpperCase()}]`, data.message);
  
  // In production, send critical events to alerting system
  if (data.severity === 'critical') {
    // sendAlert(entry);
  }
}

/**
 * Log authentication event
 */
export function logAuthEvent(data: {
  success: boolean;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  metadata?: LogMetadata;
}): void {
  const entry: LogEntry = {
    id: generateLogId(),
    timestamp: new Date(),
    level: data.success ? 'info' : 'warn',
    eventType: data.success ? 'auth_success' : 'auth_failure',
    message: data.success 
      ? `Authentication successful for ${data.email || data.userId}`
      : `Authentication failed: ${data.reason || 'Unknown'}`,
    userId: data.userId,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    metadata: {
      email: data.email,
      reason: data.reason,
      ...data.metadata,
    },
  };
  
  logStore.add(entry);
}

/**
 * Log error
 */
export function logError(error: Error, context?: {
  userId?: string;
  eventType?: EventType;
  metadata?: LogMetadata;
}): void {
  const entry: LogEntry = {
    id: generateLogId(),
    timestamp: new Date(),
    level: 'error',
    eventType: context?.eventType || 'system_error',
    message: error.message,
    userId: context?.userId,
    metadata: context?.metadata,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  };
  
  logStore.add(entry);
  console.error('[Error]', error);
}

/**
 * Log info message
 */
export function logInfo(message: string, metadata?: LogMetadata): void {
  const entry = createLogEntry('info', 'ai_request', message, metadata);
  logStore.add(entry);
}

/**
 * Log warning
 */
export function logWarning(message: string, metadata?: LogMetadata): void {
  const entry = createLogEntry('warn', 'ai_request', message, metadata);
  logStore.add(entry);
}

/**
 * Query logs
 */
export function queryLogs(filter: {
  userId?: string;
  eventType?: EventType;
  level?: LogLevel;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): LogEntry[] {
  let results = logStore.query({
    userId: filter.userId,
    eventType: filter.eventType,
    level: filter.level,
  });
  
  // Filter by date range
  if (filter.startDate) {
    results = results.filter(log => log.timestamp >= filter.startDate!);
  }
  if (filter.endDate) {
    results = results.filter(log => log.timestamp <= filter.endDate!);
  }
  
  // Limit results
  if (filter.limit) {
    results = results.slice(-filter.limit);
  }
  
  return results;
}

/**
 * Get recent logs
 */
export function getRecentLogs(count: number = 100): LogEntry[] {
  return logStore.getRecent(count);
}

/**
 * Get logs by user
 */
export function getUserLogs(userId: string, limit: number = 100): LogEntry[] {
  return queryLogs({ userId, limit });
}

/**
 * Get security events
 */
export function getSecurityEvents(limit: number = 100): SecurityEventLog[] {
  const securityEventTypes: EventType[] = [
    'auth_failure',
    'permission_denied',
    'rate_limit_exceeded',
    'input_validation_failed',
    'harmful_content_detected',
  ];
  
  const logs = logStore.getRecent(limit);
  return logs.filter(log => 
    securityEventTypes.includes(log.eventType)
  ) as SecurityEventLog[];
}

/**
 * Get AI interaction logs
 */
export function getAIInteractionLogs(limit: number = 100): AIInteractionLog[] {
  return queryLogs({ 
    eventType: 'ai_request', 
    limit 
  }) as AIInteractionLog[];
}

/**
 * Get usage statistics
 */
export function getUsageStats(userId?: string): {
  totalRequests: number;
  totalCost: number;
  totalTokens: number;
  avgDuration: number;
  modelUsage: Record<string, number>;
} {
  const logs = userId 
    ? getUserLogs(userId, 10000)
    : getRecentLogs(10000);
  
  const aiLogs = logs.filter(log => 
    log.eventType === 'ai_request'
  ) as AIInteractionLog[];
  
  const stats = {
    totalRequests: aiLogs.length,
    totalCost: 0,
    totalTokens: 0,
    avgDuration: 0,
    modelUsage: {} as Record<string, number>,
  };
  
  let totalDuration = 0;
  
  for (const log of aiLogs) {
    stats.totalCost += log.cost || 0;
    stats.totalTokens += log.tokens || 0;
    totalDuration += log.duration || 0;
    
    if (log.model) {
      stats.modelUsage[log.model] = (stats.modelUsage[log.model] || 0) + 1;
    }
  }
  
  stats.avgDuration = aiLogs.length > 0 ? totalDuration / aiLogs.length : 0;
  
  return stats;
}

/**
 * Export logs (for compliance/audit)
 */
export function exportLogs(filter?: {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
}): string {
  const logs = queryLogs({
    ...filter,
    limit: 100000, // Export all matching logs
  });
  
  return JSON.stringify(logs, null, 2);
}

/**
 * Clear logs (use with caution)
 */
export function clearLogs(): void {
  logStore.clear();
}

/**
 * Get log count
 */
export function getLogCount(): number {
  return logStore.count();
}

/**
 * Audit Logger Object (for convenience)
 * Provides a unified interface for logging
 */
export const auditLogger = {
  logAIInteraction: async (log: {
    userId: string;
    action: string;
    input: StructuredRecord;
    output: StructuredRecord;
    success: boolean;
  }) => {
    logAIInteraction({
      userId: log.userId,
      model: 'api',
      prompt: JSON.stringify(log.input),
      response: JSON.stringify(log.output),
      tokens: 0,
      cost: 0,
      duration: 0,
      inputValid: true,
      outputValid: log.success,
      issues: log.success ? [] : ['Action failed'],
    });
  },

  logSecurityEvent: async (log: {
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    metadata?: LogMetadata;
  }) => {
    logSecurityEvent({
      eventType: log.type as SecurityEventLog['eventType'],
      message: log.message,
      severity: log.severity,
      action: 'flagged',
      userId: log.userId,
      metadata: log.metadata,
    });
  },

  logAuthEvent: async (
    userId: string,
    event: 'login' | 'logout' | 'token_refresh' | 'password_change',
    success: boolean
  ) => {
    logAuthEvent({
      success,
      userId,
      reason: event,
    });
  },

  logAPIRequest: async (
    method: string,
    path: string,
    userId?: string,
    statusCode?: number,
    duration?: number
  ) => {
    logInfo(`${method} ${path}`, {
      method,
      path,
      userId,
      statusCode,
      duration,
    });
  },
};

export default auditLogger;
