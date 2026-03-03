# Financial Chat API Documentation

**Version**: 1.0.0
**Base URL**: `/api/chat/financial`
**Authentication**: Required (Supabase Auth)
**Phase**: 6.1 - Financial Chat Engine

---

## 🔐 Authentication

All endpoints require authentication via Supabase Auth. The API uses Row Level Security (RLS) to ensure users can only access their own data.

**Authentication Methods**:

```typescript
// Client-side (automatic with Supabase client)
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

// Server-side API routes
import { createClient } from "@/lib/supabase/server";
const supabase = createClient();
const {
  data: { user },
} = await supabase.auth.getUser();
```

**Security Headers**:

- `Authorization: Bearer <token>` - Supabase session token
- `Content-Type: application/json`

---

## 📋 API Endpoints

### 1. List Chat Sessions

**GET** `/api/chat/financial/sessions`

Get all chat sessions for the authenticated user with pagination support.

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 20 | Maximum number of sessions (1-100) |
| `offset` | number | No | 0 | Number of sessions to skip |

**Response**: `200 OK`

```json
{
  "sessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-uuid",
      "title": "Budget Planning Chat",
      "createdAt": "2026-01-05T10:00:00Z",
      "updatedAt": "2026-01-05T11:30:00Z",
      "messageCount": 12,
      "lastMessageAt": "2026-01-05T11:30:00Z",
      "archived": false,
      "metadata": {}
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

**Error Responses**:

- `401 Unauthorized` - Missing or invalid authentication
- `500 Internal Server Error` - Server error

**Caching**: Cached for 2 minutes (client-side with React Query)

**Example**:

```typescript
const response = await fetch("/api/chat/financial/sessions?limit=10&offset=0");
const { sessions, total } = await response.json();
```

---

### 2. Create Chat Session

**POST** `/api/chat/financial/sessions`

Create a new chat session for the authenticated user.

**Request Body**:

```json
{
  "title": "Investment Strategy Discussion"
}
```

**Validation**:

- `title`: Optional string, max 200 characters
- If not provided, defaults to "New Chat"

**Response**: `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-uuid",
  "title": "Investment Strategy Discussion",
  "createdAt": "2026-01-05T10:00:00Z",
  "updatedAt": "2026-01-05T10:00:00Z",
  "messageCount": 0,
  "lastMessageAt": null,
  "archived": false,
  "metadata": {}
}
```

**Error Responses**:

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Missing or invalid authentication
- `500 Internal Server Error` - Server error

**Side Effects**:

- Invalidates user sessions cache
- Creates database record with RLS protection

**Example**:

```typescript
const response = await fetch("/api/chat/financial/sessions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title: "My New Chat" }),
});
const session = await response.json();
```

---

### 3. Get Chat Session

**GET** `/api/chat/financial/sessions/[id]`

Get a specific chat session by ID. Only returns if user owns the session (RLS).

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Session ID |

**Response**: `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-uuid",
  "title": "Updated Chat Title",
  "createdAt": "2026-01-05T10:00:00Z",
  "updatedAt": "2026-01-05T12:00:00Z",
  "messageCount": 12,
  "lastMessageAt": "2026-01-05T11:30:00Z",
  "archived": false,
  "metadata": {}
}
```

**Error Responses**:

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - User doesn't own this session
- `404 Not Found` - Session not found
- `500 Internal Server Error` - Server error

**Side Effects**:

- Updates `updated_at` timestamp
- Invalidates session cache

---

### 5. Delete Chat Session

**DELETE** `/api/chat/financial/sessions/[id]`

Archive a chat session (soft delete). Only allowed if user owns the session (RLS).

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Session ID |

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "Session archived successfully"
}
```

**Error Responses**:

- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - User doesn't own this session
- `404 Not Found` - Session not found
- `500 Internal Server Error` - Server error

**Side Effects**:

- Sets `archived = true` (soft delete)
- Invalidates session and user sessions cache
- Messages remain in database but session is hidden

**Note**: This is a soft delete. Data is not permanently removed.

---

### 6. List Messages

**GET** `/api/chat/financial/sessions/[id]/messages`

Get all messages for a chat session with pagination support.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Session ID |

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 50 | Maximum number of messages (1-100) |
| `offset` | number | No | 0 | Number of messages to skip |

**Response**: `200 OK`

```json
{
  "messages": [
    {
      "id": "msg-uuid-1",
      "sessionId": "session-uuid",
      "role": "user",
      "content": "How should I allocate my portfolio?",
      "timestamp": "2026-01-05T10:00:00Z",
      "metadata": {},
      "intentType": "PORTFOLIO_ADVICE",
      "intentConfidence": 0.95
    },
    {
      "id": "msg-uuid-2",
      "sessionId": "session-uuid",
      "role": "assistant",
      "content": "Based on your risk profile and financial goals...",
      "timestamp": "2026-01-05T10:00:05Z",
      "metadata": {
        "actionTaken": "VIEW_PORTFOLIO",
        "entities": [
          { "type": "asset_type", "value": "stocks", "confidence": 0.9 }
        ]
      },
      "intentType": null,
      "intentConfidence": null
    }
  ],
  "total": 12,
  "limit": 50,
  "offset": 0
}
```

**Message Roles**:

- `user`: Message from the user
- `assistant`: AI-generated response
- `system`: System messages (e.g., session started)

**Intent Types** (for user messages):

- `PORTFOLIO_ADVICE`: Portfolio allocation questions
- `BUDGET_HELP`: Budget planning assistance
- `DEBT_STRATEGY`: Debt payoff strategies
- `SAVINGS_GOAL`: Savings goals and planning
- `INVESTMENT_ANALYSIS`: Stock/investment analysis
- `TAX_PLANNING`: Tax optimization questions
- `RETIREMENT_PLANNING`: Retirement planning
- `RISK_ASSESSMENT`: Risk tolerance evaluation
- `GENERAL_QUESTION`: General financial questions
- `GREETING`: Greetings and small talk

**Error Responses**:

- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - User doesn't own this session
- `404 Not Found` - Session not found
- `500 Internal Server Error` - Server error

**Caching**: Cached for 1 minute (client-side with React Query)

**Security**: RLS policies ensure users can only access messages from their own sessions

---

### 7. Send Message

**POST** `/api/chat/financial/sessions/[id]/messages`

Send a message to a chat session and receive an AI-generated response.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Session ID |

**Request Body**:

```json
{
  "content": "What's the best way to pay off my credit card debt?"
}
```

**Validation**:

- `content`: Required string, max 2000 characters
- Content is sanitized for XSS protection

**Response**: `200 OK`

```json
{
  "userMessage": {
    "id": "msg-uuid-1",
    "sessionId": "session-uuid",
    "role": "user",
    "content": "What's the best way to pay off my credit card debt?",
    "timestamp": "2026-01-05T10:00:00Z",
    "metadata": {},
    "intentType": "DEBT_STRATEGY",
    "intentConfidence": 0.98
  },
  "assistantMessage": {
    "id": "msg-uuid-2",
    "sessionId": "session-uuid",
    "role": "assistant",
    "content": "Based on your financial situation, I recommend the debt avalanche method...",
    "timestamp": "2026-01-05T10:00:05Z",
    "metadata": {
      "actionTaken": "DEBT_ANALYSIS",
      "entities": [
        { "type": "category", "value": "credit_card", "confidence": 0.95 }
      ],
      "suggestions": [
        "Review your current debt balances",
        "Consider balance transfer options",
        "Set up automatic payments"
      ]
    },
    "intentType": null,
    "intentConfidence": null
  }
}
```

**Processing Steps**:

1. Validate and sanitize user input
2. Detect intent and extract entities
3. Build chat context (portfolio, goals, preferences)
4. Generate AI response with AIML service
5. Execute any required actions
6. Save both messages to database
7. Update session metadata

**Error Responses**:

- `400 Bad Request` - Invalid request body or content too long
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - User doesn't own this session
- `404 Not Found` - Session not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

**Rate Limiting**: 60 requests per minute per user

**Side Effects**:

- Creates 2 message records (user + assistant)
- Updates session `message_count` and `last_message_at`
- Invalidates messages cache
- May execute financial actions (view portfolio, create budget, etc.)

**Performance**: Average response time 2-5 seconds (includes AI processing)

---

## 🔒 Security Considerations

### Row Level Security (RLS)

All database tables use RLS policies to ensure data isolation:

```sql
-- Users can only view their own sessions
CREATE POLICY "Users can view their own chat sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only view messages from their own sessions
CREATE POLICY "Users can view messages from their own sessions"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );
```

### Input Sanitization

All user input is sanitized to prevent XSS attacks:

- Content is limited to 2000 characters
- HTML tags are stripped using DOMPurify
- SQL injection is prevented by parameterized queries

### Authentication Verification

Every request verifies:

1. Valid Supabase session token
2. User ID matches session owner
3. Session is not archived

### Rate Limiting

API endpoints are rate-limited to prevent abuse:

- 60 requests per minute per user
- 429 status code returned when exceeded
- Retry-After header indicates wait time

---

## 📊 Performance Optimizations

### Caching Strategy

**Server-Side Cache** (In-Memory):

- User sessions: 2 minutes TTL
- Session messages: 3 minutes TTL
- Session details: 10 minutes TTL

**Client-Side Cache** (React Query):

- Sessions list: 2 minutes stale time
- Session details: 5 minutes stale time
- Messages list: 1 minute stale time

### Database Optimizations

**Indexes**:

- `idx_chat_sessions_user_archived_updated` - Composite index for session queries
- `idx_chat_messages_session_timestamp` - Composite index for message queries
- `idx_chat_sessions_metadata_gin` - GIN index for JSONB searches

**Stored Procedures**:

- `get_recent_sessions_with_preview()` - Optimized session list with last message
- `get_session_messages_paginated()` - Proper pagination for messages

**Materialized View**:

- `chat_session_stats` - Cached statistics for dashboard

---

## 🧪 Testing

### Example Test Cases

```typescript
// Test: Create session
const session = await fetch("/api/chat/financial/sessions", {
  method: "POST",
  body: JSON.stringify({ title: "Test Chat" }),
});
expect(session.status).toBe(201);

// Test: Send message
const response = await fetch(
  `/api/chat/financial/sessions/${sessionId}/messages`,
  {
    method: "POST",
    body: JSON.stringify({ content: "Hello" }),
  },
);
expect(response.status).toBe(200);
const { userMessage, assistantMessage } = await response.json();
expect(userMessage.role).toBe("user");
expect(assistantMessage.role).toBe("assistant");

// Test: Unauthorized access
const otherUserSession = await fetch(
  `/api/chat/financial/sessions/${otherUserId}`,
);
expect(otherUserSession.status).toBe(403);
```

---

## 📚 Additional Resources

- [Financial Chat Engine Documentation](./PHASE_6.1_COMPLETION_SUMMARY.md)
- [Performance Optimization Guide](./PERFORMANCE_OPTIMIZATION_GUIDE.md)
- [Zero Trust Security Documentation](./ZERO_TRUST_SECURITY.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
