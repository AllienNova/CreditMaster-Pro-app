# CreditMaster Pro - API Documentation

## Base URL
```
Production: https://api.creditmaster.pro
Development: http://localhost:3000/api
```

## Authentication
All API requests require authentication via Bearer token:
```http
Authorization: Bearer <your_jwt_token>
```

---

## AI Endpoints

### POST /api/ai/dispute
Generate AI-powered dispute letters.

**Request:**
```json
{
  "creditBureau": "equifax" | "experian" | "transunion",
  "errorType": "incorrect_info" | "not_my_account" | "status_error",
  "accountDetails": {
    "accountNumber": "string",
    "creditorName": "string",
    "errorDescription": "string"
  },
  "model": "gpt-4o" | "claude-3-opus" (optional)
}
```

**Response:**
```json
{
  "letter": "string",
  "confidence": 0.95,
  "suggestedAttachments": ["string"],
  "estimatedTimeline": "30-45 days"
}
```

### POST /api/ai/analyze
Analyze credit report for errors and opportunities.

**Request:**
```json
{
  "reportData": "string (JSON or Base64 PDF)",
  "analysisType": "full" | "errors_only" | "quick_scan"
}
```

**Response:**
```json
{
  "errors": [{ "type": "string", "severity": "high" | "medium" | "low", "item": {} }],
  "opportunities": [{ "description": "string", "impact": "number" }],
  "score": { "current": 650, "potential": 720 }
}
```

### POST /api/ai/chat
Send message to AI assistant.

**Request:**
```json
{
  "message": "string",
  "context": "credit_repair" | "general",
  "model": "gpt-4o-mini" (optional)
}
```

**Response:**
```json
{
  "response": "string",
  "sources": ["string"],
  "followUpQuestions": ["string"]
}
```

### POST /api/ai/voice
Process voice input/output.

**Request:**
```json
{
  "audio": "base64_encoded_audio",
  "action": "transcribe" | "synthesize",
  "text": "string (for synthesis)"
}
```

**Response:**
```json
{
  "transcript": "string",
  "audioUrl": "string",
  "confidence": 0.95
}
```

---

## Credit Endpoints

### GET /api/credit-report
Fetch user's credit report data.

**Response:**
```json
{
  "bureaus": {
    "equifax": { "score": 650, "accounts": [], "inquiries": [] },
    "experian": { "score": 655, "accounts": [], "inquiries": [] },
    "transunion": { "score": 648, "accounts": [], "inquiries": [] }
  },
  "lastUpdated": "2024-12-05T00:00:00Z"
}
```

### POST /api/credit-report/import
Import credit report from external source.

**Request:**
```json
{
  "source": "annualcreditreport" | "creditkarma" | "manual",
  "data": "string (JSON or PDF)"
}
```

---

## Dispute Endpoints

### GET /api/disputes
List all disputes.

**Query Parameters:**
- `status`: pending | sent | resolved
- `bureau`: equifax | experian | transunion
- `page`: number
- `limit`: number (max 50)

### POST /api/disputes
Create new dispute.

### GET /api/disputes/:id
Get dispute details.

### PATCH /api/disputes/:id
Update dispute status.

### DELETE /api/disputes/:id
Delete dispute.

---

## Analytics Endpoints

### GET /api/analytics/usage
Get AI usage statistics.

**Response:**
```json
{
  "totalRequests": 1250,
  "totalCost": 45.32,
  "byModel": [{ "model": "gpt-4o", "requests": 500, "cost": 25.00 }],
  "byFeature": [{ "feature": "disputes", "count": 300 }]
}
```

### GET /api/analytics/performance
Get model performance metrics.

---

## Rate Limits

| Plan | Requests/min | Daily Limit |
|------|-------------|-------------|
| Free | 10 | 100 |
| Basic | 30 | 500 |
| Premium | 60 | 2000 |
| Enterprise | 120 | Unlimited |

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

## SDKs
- JavaScript/TypeScript: `@creditmaster/sdk`
- Python: `creditmaster-sdk`

---

*API Version: 1.0.0 | Last Updated: December 2024*

