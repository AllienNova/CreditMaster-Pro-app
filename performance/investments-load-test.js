/**
 * K6 Performance Tests for Investment APIs
 *
 * Tests investment API endpoints under load
 *
 * Run with: k6 run performance/investments-load-test.js
 *
 * Test Scenarios:
 * - Smoke test: 1 VU for 30s
 * - Load test: 100 VUs for 5m
 * - Stress test: Ramp up to 200 VUs
 * - Spike test: Sudden spike to 500 VUs
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const portfolioResponseTime = new Trend('portfolio_response_time');
const analysisResponseTime = new Trend('analysis_response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm up
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 100 },   // Stay at 100 users
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be below 1%
    errors: ['rate<0.05'],             // Custom error rate below 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'mock-auth-token';

// Test data
const testSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'AMD'];

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };

  // Test 1: Get Portfolio
  const portfolioResponse = http.get(
    `${BASE_URL}/api/investments/portfolio?period=1M`,
    { headers }
  );

  check(portfolioResponse, {
    'portfolio status is 200': (r) => r.status === 200,
    'portfolio response time < 500ms': (r) => r.timings.duration < 500,
    'portfolio has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
  }) || errorRate.add(1);

  portfolioResponseTime.add(portfolioResponse.timings.duration);

  sleep(1);

  // Test 2: Get Holdings
  const holdingsResponse = http.get(
    `${BASE_URL}/api/investments/holdings`,
    { headers }
  );

  check(holdingsResponse, {
    'holdings status is 200': (r) => r.status === 200,
    'holdings response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test 3: Get Stock Analysis (random symbol)
  const randomSymbol = testSymbols[Math.floor(Math.random() * testSymbols.length)];
  const analysisResponse = http.get(
    `${BASE_URL}/api/investments/analyze/${randomSymbol}`,
    { headers }
  );

  check(analysisResponse, {
    'analysis status is 200': (r) => r.status === 200,
    'analysis response time < 2000ms': (r) => r.timings.duration < 2000,
    'analysis has recommendation': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.recommendation;
      } catch (e) {
        return false;
      }
    },
  }) || errorRate.add(1);

  analysisResponseTime.add(analysisResponse.timings.duration);

  sleep(2);

  // Test 4: Get Market Data
  const marketDataResponse = http.get(
    `${BASE_URL}/api/investments/market-data?symbol=${randomSymbol}`,
    { headers }
  );

  check(marketDataResponse, {
    'market data status is 200': (r) => r.status === 200,
    'market data response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test 5: Create Holding (POST)
  const newHolding = {
    symbol: randomSymbol,
    quantity: Math.floor(Math.random() * 100) + 1,
    purchasePrice: Math.random() * 500 + 50,
    purchaseDate: new Date().toISOString().split('T')[0],
  };

  const createResponse = http.post(
    `${BASE_URL}/api/investments/holdings`,
    JSON.stringify(newHolding),
    { headers }
  );

  check(createResponse, {
    'create holding status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'create holding response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(2);
}

// Setup function (runs once at the beginning)
export function setup() {
  console.log('Starting investment API load tests...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('Test duration: ~7 minutes');
  console.log('Max concurrent users: 100');
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log('Load tests completed!');
}

