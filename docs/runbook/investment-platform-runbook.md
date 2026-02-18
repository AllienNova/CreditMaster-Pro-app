# Investment Platform Runbook

## Overview

This runbook provides operational procedures and troubleshooting steps for the CreditMaster Pro Investment Platform.

---

## Table of Contents

1. [Common Issues](#common-issues)
2. [Debugging Procedures](#debugging-procedures)
3. [Performance Issues](#performance-issues)
4. [Data Issues](#data-issues)
5. [API Issues](#api-issues)
6. [Emergency Procedures](#emergency-procedures)

---

## Common Issues

### Issue: Portfolio Not Loading

**Symptoms:**

- Users see loading spinner indefinitely
- Error message: "Failed to load portfolio"

**Diagnosis:**

1. Check Vercel deployment status
2. Check database connectivity
3. Check Redis cache status
4. Review error logs in Sentry

**Resolution:**

```bash
# Check health endpoint
curl https://app.creditmaster-pro.com/api/health

# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Check Redis connection
redis-cli -u $UPSTASH_REDIS_REST_URL ping

# Review logs
vercel logs --follow
```

**Prevention:**

- Enable health check monitoring
- Set up database connection pooling
- Configure Redis failover

---

### Issue: Stock Analysis Timeout

**Symptoms:**

- Analysis requests timeout after 30 seconds
- Error: "Analysis request timed out"

**Diagnosis:**

1. Check AIML API status
2. Check rate limits
3. Review API response times

**Resolution:**

```bash
# Check AIML API status
curl https://api.aimlapi.com/v1/health

# Check rate limit headers
curl -I https://app.creditmaster-pro.com/api/investments/analyze/AAPL \
  -H "Authorization: Bearer $TOKEN"

# Increase timeout in code
# app/api/investments/analyze/[symbol]/route.ts
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s
```

**Prevention:**

- Implement request queuing
- Add caching for frequently analyzed stocks
- Use faster AI model for initial analysis

---

### Issue: Real-Time Prices Not Updating

**Symptoms:**

- Prices are stale
- WebSocket connection failing

**Diagnosis:**

1. Check WebSocket connection status
2. Check market data API status
3. Review browser console errors

**Resolution:**

```javascript
// Client-side debugging
const ws = new WebSocket("wss://app.creditmaster-pro.com/api/investments/ws");

ws.onopen = () => console.log("WebSocket connected");
ws.onerror = (error) => console.error("WebSocket error:", error);
ws.onclose = () => console.log("WebSocket closed");

// Server-side: Check WebSocket handler
// app/api/investments/ws/route.ts
```

**Prevention:**

- Implement automatic reconnection
- Add fallback to polling
- Monitor WebSocket connection health

---

## Debugging Procedures

### Enable Debug Logging

```typescript
// lib/logger.ts
export const logger = {
  debug: (message: string, data?: any) => {
    if (process.env.DEBUG_MODE === "true") {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
    // Send to Sentry
  },
};
```

### Check API Request/Response

```bash
# Enable request logging
export DEBUG=true

# Monitor API calls
vercel logs --follow | grep "api/investments"

# Check specific endpoint
curl -v https://app.creditmaster-pro.com/api/investments/portfolio \
  -H "Authorization: Bearer $TOKEN"
```

### Database Query Debugging

```sql
-- Enable query logging
ALTER DATABASE creditmaster_pro SET log_statement = 'all';

-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE query LIKE '%cpfi_portfolios%'
ORDER BY mean_time DESC
LIMIT 10;

-- Check active connections
SELECT count(*) FROM pg_stat_activity;
```

---

## Performance Issues

### Slow API Response Times

**Diagnosis:**

```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s \
  https://app.creditmaster-pro.com/api/investments/portfolio

# curl-format.txt:
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
```

**Resolution:**

1. Add database indexes
2. Optimize queries
3. Increase cache TTL
4. Enable edge functions

```sql
-- Add indexes for common queries
CREATE INDEX idx_holdings_user_id ON cpfi_holdings(user_id);
CREATE INDEX idx_holdings_symbol ON cpfi_holdings(symbol);
CREATE INDEX idx_transactions_holding_id ON cpfi_transactions(holding_id);
```

---

### High Memory Usage

**Diagnosis:**

```bash
# Check Vercel function memory
vercel logs --follow | grep "Memory"

# Monitor Redis memory
redis-cli -u $UPSTASH_REDIS_REST_URL info memory
```

**Resolution:**

1. Reduce cache size
2. Implement pagination
3. Optimize data structures
4. Clear old cache entries

```typescript
// Clear old cache entries
async function clearOldCache() {
  const keys = await redis.keys("portfolio:*");
  const now = Date.now();

  for (const key of keys) {
    const ttl = await redis.ttl(key);
    if (ttl < 0) {
      await redis.del(key);
    }
  }
}
```

---

## Data Issues

### Incorrect Portfolio Values

**Diagnosis:**

```sql
-- Check portfolio calculations
SELECT
  p.id,
  p.user_id,
  SUM(h.quantity * h.current_price) as calculated_value,
  p.total_value as stored_value
FROM cpfi_portfolios p
JOIN cpfi_holdings h ON h.portfolio_id = p.id
GROUP BY p.id
HAVING SUM(h.quantity * h.current_price) != p.total_value;
```

**Resolution:**

```typescript
// Recalculate portfolio values
async function recalculatePortfolio(portfolioId: string) {
  const holdings = await getHoldings(portfolioId);
  const totalValue = holdings.reduce(
    (sum, h) => sum + h.quantity * h.currentPrice,
    0,
  );

  await updatePortfolio(portfolioId, { totalValue });
}
```

---

### Missing Market Data

**Diagnosis:**

```bash
# Check market data API status
curl https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=$API_KEY

# Check API rate limits
curl -I https://api.polygon.io/v2/aggs/ticker/AAPL/prev \
  -H "Authorization: Bearer $POLYGON_API_KEY"
```

**Resolution:**

1. Switch to backup provider
2. Use cached data
3. Implement retry logic

```typescript
// Fallback to backup provider
async function getQuote(symbol: string) {
  try {
    return await alphaVantage.getQuote(symbol);
  } catch (error) {
    logger.warn("Alpha Vantage failed, trying Polygon");
    return await polygon.getQuote(symbol);
  }
}
```

---

## API Issues

### Rate Limit Exceeded

**Symptoms:**

- 429 Too Many Requests errors
- Users unable to make requests

**Resolution:**

```typescript
// Implement request queuing
import PQueue from "p-queue";

const queue = new PQueue({
  concurrency: 5,
  interval: 1000,
  intervalCap: 10,
});

async function queuedRequest(fn: () => Promise<any>) {
  return queue.add(fn);
}
```

---

### External API Failures

**Symptoms:**

- Market data not updating
- AI analysis failing

**Resolution:**

```typescript
// Implement circuit breaker
class CircuitBreaker {
  private failures = 0;
  private threshold = 5;
  private timeout = 60000;
  private state = "CLOSED";

  async execute(fn: () => Promise<any>) {
    if (this.state === "OPEN") {
      throw new Error("Circuit breaker is OPEN");
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = "OPEN";
      setTimeout(() => {
        this.state = "HALF_OPEN";
        this.failures = 0;
      }, this.timeout);
    }
  }
}
```

---

## Emergency Procedures

### Complete Service Outage

1. **Immediate Actions:**
   - Check Vercel status page
   - Check database status
   - Check external API status
   - Enable maintenance mode

2. **Communication:**
   - Post status update
   - Notify users via email
   - Update social media

3. **Recovery:**
   - Rollback to last known good deployment
   - Restore from database backup if needed
   - Clear all caches
   - Gradually restore traffic

### Data Corruption

1. **Stop all writes:**

   ```sql
   REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM app_user;
   ```

2. **Assess damage:**

   ```sql
   SELECT * FROM cpfi_portfolios WHERE updated_at > '2024-01-15 12:00:00';
   ```

3. **Restore from backup:**
   ```bash
   pg_restore -d $DATABASE_URL backup.dump
   ```

---

## Contact Information

- **On-Call Engineer**: oncall@creditmaster-pro.com
- **DevOps Team**: devops@creditmaster-pro.com
- **Emergency Hotline**: 1-800-CREDIT-911

---

**Last Updated**: January 2024
