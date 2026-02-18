# Investment API Documentation

## Overview

The Investment API provides comprehensive portfolio management, stock analysis, and market data capabilities powered by AI and real-time data sources.

**Base URL**: `https://api.creditmaster-pro.com/api/investments`

**Authentication**: All endpoints require Bearer token authentication.

```
Authorization: Bearer <your-access-token>
```

---

## Endpoints

### Portfolio Management

#### GET /api/investments/portfolio

Get portfolio summary with performance metrics.

**Query Parameters:**

- `period` (optional): Time period for performance data
  - Values: `1D`, `1W`, `1M`, `3M`, `6M`, `1Y`, `ALL`
  - Default: `1M`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "portfolio-id",
    "userId": "user-id",
    "totalValue": 125000.5,
    "totalCost": 100000.0,
    "totalGain": 25000.5,
    "totalGainPercent": 25.0,
    "dayChange": 1250.0,
    "dayChangePercent": 1.01,
    "holdings": [
      {
        "id": "holding-id",
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "quantity": 100,
        "averagePrice": 150.0,
        "currentPrice": 175.5,
        "currentValue": 17550.0,
        "gainLoss": 2550.0,
        "gainLossPercent": 17.0,
        "dayChange": 250.0,
        "dayChangePercent": 1.45
      }
    ],
    "allocation": {
      "stocks": 75.5,
      "etfs": 15.2,
      "crypto": 9.3
    },
    "performance": {
      "dates": ["2024-01-01", "2024-01-02"],
      "values": [100000, 102500]
    }
  }
}
```

---

### Holdings Management

#### GET /api/investments/holdings

Get all holdings for the authenticated user.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "holding-id",
      "portfolioId": "portfolio-id",
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "assetType": "stock",
      "quantity": 100,
      "averagePrice": 150.0,
      "currentPrice": 175.5,
      "currentValue": 17550.0,
      "gainLoss": 2550.0,
      "gainLossPercent": 17.0,
      "dayChange": 250.0,
      "dayChangePercent": 1.45,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T12:00:00Z"
    }
  ]
}
```

#### POST /api/investments/holdings

Create a new holding.

**Request Body:**

```json
{
  "symbol": "TSLA",
  "quantity": 50,
  "purchasePrice": 250.0,
  "purchaseDate": "2024-01-15",
  "assetType": "stock"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "new-holding-id",
    "symbol": "TSLA",
    "quantity": 50,
    "averagePrice": 250.0,
    "currentPrice": 265.0,
    "currentValue": 13250.0
  }
}
```

#### PATCH /api/investments/holdings/:id

Update an existing holding.

**Request Body:**

```json
{
  "quantity": 75,
  "averagePrice": 245.0
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "holding-id",
    "quantity": 75,
    "averagePrice": 245.0
  }
}
```

#### DELETE /api/investments/holdings/:id

Delete a holding.

**Response:**

```json
{
  "success": true,
  "message": "Holding deleted successfully"
}
```

---

### Stock Analysis

#### GET /api/investments/analyze/:symbol

Get comprehensive AI-powered stock analysis.

**Path Parameters:**

- `symbol` (required): Stock ticker symbol (e.g., AAPL, GOOGL)

**Query Parameters:**

- `timeframe` (optional): Analysis timeframe
  - Values: `1D`, `1W`, `1M`, `3M`, `6M`, `1Y`
  - Default: `1M`

**Response:**

```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "companyName": "Apple Inc.",
    "currentPrice": 175.5,
    "priceChange": 2.5,
    "priceChangePercent": 1.45,
    "recommendation": "buy",
    "confidenceScore": 0.85,
    "targetPrice": 200.0,
    "analysisSummary": "Strong fundamentals with positive momentum...",
    "bullishFactors": ["Strong revenue growth", "Expanding market share"],
    "bearishFactors": ["High valuation", "Regulatory concerns"],
    "technicalIndicators": {
      "rsi": 65.5,
      "macdSignal": "bullish",
      "movingAverageSignal": "above"
    },
    "fundamentalMetrics": {
      "peRatio": 28.5,
      "eps": 6.15,
      "marketCap": 2800000000000,
      "dividendYield": 0.52
    },
    "sentimentAnalysis": {
      "score": 0.75,
      "sentiment": "positive",
      "sources": 150
    }
  }
}
```

---

### Market Data

#### GET /api/investments/market-data

Get real-time market data for a symbol.

**Query Parameters:**

- `symbol` (required): Stock ticker symbol

**Response:**

```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "price": 175.5,
    "change": 2.5,
    "changePercent": 1.45,
    "volume": 50000000,
    "marketCap": 2800000000000,
    "high52Week": 199.62,
    "low52Week": 124.17
  }
}
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Common Error Codes:**

- `401`: Unauthorized - Invalid or missing authentication token
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource not found
- `422`: Validation Error - Invalid request data
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server error

---

## Rate Limits

- **Portfolio/Holdings**: 100 requests per minute
- **Market Data**: 60 requests per minute
- **AI Analysis**: 20 requests per minute

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## Webhooks

Subscribe to real-time portfolio updates via WebSocket:

```javascript
const ws = new WebSocket("wss://api.creditmaster-pro.com/api/investments/ws");

ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: "subscribe",
      symbols: ["AAPL", "GOOGL"],
    }),
  );
};

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log("Price update:", update);
};
```

---

## SDKs and Libraries

- **JavaScript/TypeScript**: `@creditmaster-pro/investments-sdk`
- **Python**: `creditmaster-pro-investments`
- **React Hooks**: Built-in hooks available in the web app

---

## Support

For API support, contact: api-support@creditmaster-pro.com
