# 🎯 Artillery Load Tests

This directory contains load testing configurations for CreditMaster Pro.

---

## 📁 Files

### Test Configurations

1. **`quick-test.yml`** - Quick 30-second smoke test
2. **`api-tests.yml`** - API endpoint load test (2 minutes)
3. **`load-tests.yml`** - Full load test with realistic traffic (8 minutes)
4. **`stress-tests.yml`** - Stress test to find breaking point (5 minutes)

### Scripts

1. **`run-tests.ps1`** - PowerShell script to run all tests sequentially

### Reports

All test reports are saved in `artillery/reports/` directory:

- JSON reports: Raw test data
- HTML reports: Visual reports with charts

---

## 🚀 Quick Start

### 1. Start the application

```bash
npm run dev
```

### 2. Run a quick test

```bash
npm run load:quick
```

### 3. Run API tests

```bash
npm run load:api
```

### 4. Run full load tests

```bash
npm run load:full
```

### 5. Run stress tests (⚠️ pushes system to limits)

```bash
npm run load:stress
```

### 6. Run all tests

```bash
npm run load:all
```

---

## 📊 Understanding Results

### Key Metrics

- **http.codes.200**: Successful requests
- **http.codes.4xx**: Client errors
- **http.codes.5xx**: Server errors
- **errors.ETIMEDOUT**: Timeout errors
- **http.request_rate**: Requests per second
- **http.response_time**: Response time statistics
  - **min**: Fastest response
  - **max**: Slowest response
  - **median**: 50th percentile
  - **p95**: 95th percentile
  - **p99**: 99th percentile

### What Good Looks Like

✅ **Healthy System**:

```
http.codes.200: 9950
http.codes.5xx: 0
errors.ETIMEDOUT: 0
http.request_rate: 50/sec
http.response_time:
  median: 120ms
  p95: 450ms
  p99: 890ms
```

⚠️ **Warning Signs**:

```
http.codes.200: 9500
http.codes.5xx: 450
errors.ETIMEDOUT: 50
http.request_rate: 45/sec
http.response_time:
  median: 500ms
  p95: 2500ms
  p99: 5000ms
```

🔥 **Critical Issues**:

```
http.codes.200: 5000
http.codes.5xx: 4500
errors.ETIMEDOUT: 500
http.request_rate: 25/sec
http.response_time:
  median: 2000ms
  p95: 8000ms
  p99: 15000ms
```

---

## 🔧 Customizing Tests

### Modify Load Levels

Edit the `phases` section in any YAML file:

```yaml
phases:
  - duration: 60 # Test duration in seconds
    arrivalRate: 10 # Virtual users per second
    name: "Phase 1"
```

### Add New Scenarios

Add to the `scenarios` section:

```yaml
scenarios:
  - name: "My New Test"
    weight: 10 # Percentage of traffic
    flow:
      - get:
          url: "/my-endpoint"
      - think: 2 # Wait 2 seconds
```

### Change Target

Edit the `target` in config:

```yaml
config:
  target: "https://production.creditmaster-pro.com"
```

---

## 📈 Performance Thresholds

### Current Thresholds

**API Tests**:

- Max error rate: 2%
- p95: < 1.5 seconds
- p99: < 3 seconds

**Load Tests**:

- Max error rate: 1%
- p95: < 2 seconds
- p99: < 5 seconds

### Adjusting Thresholds

Edit the `ensure` section:

```yaml
config:
  ensure:
    maxErrorRate: 1 # Max 1% error rate
    p95: 2000 # p95 < 2 seconds
    p99: 5000 # p99 < 5 seconds
```

---

## 🎯 Test Scenarios

### Public Pages (30%)

- Home page
- Pricing page
- About page

### Authentication (20%)

- Login page
- Login API
- Session management

### Dashboard (25%)

- Dashboard page
- Notifications API
- Disputes API

### AI Features (10%)

- AI chat
- Credit analysis
- Dispute generation

### Documents (10%)

- Document list
- Document API

### Credit Reports (5%)

- Credit reports page
- Credit monitoring API

---

## 📊 Monitoring During Tests

### Start Performance Monitor

In a separate terminal:

```bash
npm run monitor
```

This will track:

- CPU usage
- Memory usage
- Disk I/O
- Network I/O

Results saved to CSV for analysis.

---

## 🐛 Troubleshooting

### "ETIMEDOUT" Errors

**Cause**: Server not responding  
**Solution**:

1. Check if dev server is running
2. Increase timeout in config
3. Check network connectivity

### "503" Errors

**Cause**: Server overloaded  
**Solution**:

1. Reduce load (lower arrivalRate)
2. Optimize slow endpoints
3. Scale resources

### "Connection Refused"

**Cause**: Server not running  
**Solution**:

1. Start dev server: `npm run dev`
2. Verify port 3000 is available
3. Check firewall settings

### High Response Times

**Cause**: Performance bottleneck  
**Solution**:

1. Check database queries
2. Add caching
3. Optimize slow code
4. Add indexes

---

## 📚 Resources

- [Artillery Documentation](https://www.artillery.io/docs)
- [Load Testing Guide](../LOAD_TESTING_GUIDE.md)
- [Performance Optimization](https://nextjs.org/docs/advanced-features/measuring-performance)

---

## 🎉 Tips

1. **Start small**: Run quick-test first
2. **Monitor resources**: Use performance monitor
3. **Analyze reports**: Open HTML reports for visual analysis
4. **Iterate**: Test → Optimize → Re-test
5. **Document**: Keep track of performance improvements

---

**Happy load testing!** 🚀
