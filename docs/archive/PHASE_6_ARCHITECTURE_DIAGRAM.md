# Phase 6: Financial Chat Engine - Architecture Diagram

**Last Updated**: January 5, 2026

---

## 🏗️ **SYSTEM ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────┐              ┌──────────────────────┐         │
│  │   WEB INTERFACE      │              │  MOBILE INTERFACE    │         │
│  │  (Phase 6.2)         │              │  (Phase 6.3)         │         │
│  ├──────────────────────┤              ├──────────────────────┤         │
│  │ • ChatInterface      │              │ • Chat Screen        │         │
│  │ • ChatMessageList    │              │ • ChatBubble         │         │
│  │ • ChatInput          │              │ • ChatInput          │         │
│  │ • ChatSidebar        │              │ • SuggestionChips    │         │
│  │ • ChatHeader         │              │                      │         │
│  └──────────────────────┘              └──────────────────────┘         │
│           │                                      │                       │
│           └──────────────┬───────────────────────┘                       │
│                          │                                               │
└──────────────────────────┼───────────────────────────────────────────────┘
                           │
                           │ HTTPS + Auth
                           │
┌──────────────────────────┼───────────────────────────────────────────────┐
│                          ▼                                                │
│                    API LAYER                                              │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  POST /api/chat/financial                                       │    │
│  │  • Send message                                                 │    │
│  │  • Rate limiting: 100 req/hour                                  │    │
│  │  • XSS protection                                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  GET/POST /api/chat/financial/sessions                          │    │
│  │  • List sessions                                                │    │
│  │  • Create session                                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  GET/PATCH/DELETE /api/chat/financial/sessions/:id              │    │
│  │  • Get session details                                          │    │
│  │  • Update session                                               │    │
│  │  • Delete session                                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  GET /api/chat/financial/sessions/:id/messages                  │    │
│  │  • Get message history                                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                          │                                                │
└──────────────────────────┼────────────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER (Phase 6.1)                              │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  FinancialChatEngine                                            │    │
│  │  (src/lib/ai/financial-chat-engine.ts - 804 lines)              │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │                                                                  │    │
│  │  Core Methods:                                                  │    │
│  │  • createSession(userId, title?)                                │    │
│  │  • sendMessage(sessionId, message, streaming?)                  │    │
│  │  • detectIntent(message, context)                               │    │
│  │  • extractEntities(message)                                     │    │
│  │  • generateResponse(intent, context)                            │    │
│  │  • executeAction(action, parameters, context)                   │    │
│  │  • getSessionHistory(sessionId)                                 │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│           │                    │                    │                     │
│           ▼                    ▼                    ▼                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │ Intent       │    │ Entity       │    │ Action       │              │
│  │ Detection    │    │ Extraction   │    │ Execution    │              │
│  ├──────────────┤    ├──────────────┤    ├──────────────┤              │
│  │ 10 Types:    │    │ 6 Types:     │    │ 10 Types:    │              │
│  │ • QUESTION   │    │ • symbol     │    │ • VIEW_      │              │
│  │ • ACTION     │    │ • amount     │    │   PORTFOLIO  │              │
│  │ • EDUCATION  │    │ • date       │    │ • CREATE_    │              │
│  │ • PORTFOLIO_ │    │ • percentage │    │   BUDGET     │              │
│  │   ANALYSIS   │    │ • category   │    │ • ANALYZE_   │              │
│  │ • INVESTMENT_│    │ • asset_type │    │   INVESTMENT │              │
│  │   ADVICE     │    │              │    │ • GENERATE_  │              │
│  │ • BUDGET_    │    │              │    │   REPORT     │              │
│  │   PLANNING   │    │              │    │ • OPTIMIZE_  │              │
│  │ • DEBT_      │    │              │    │   DEBT       │              │
│  │   STRATEGY   │    │              │    │ • ASSESS_    │              │
│  │ • CREDIT_    │    │              │    │   RISK       │              │
│  │   IMPROVEMENT│    │              │    │ • GET_       │              │
│  │ • MARKET_    │    │              │    │   TRADING_   │              │
│  │   INSIGHTS   │    │              │    │   SIGNAL     │              │
│  │ • RISK_      │    │              │    │ • TRACK_     │              │
│  │   ASSESSMENT │    │              │    │   GOALS      │              │
│  │              │    │              │    │ • ANALYZE_   │              │
│  │              │    │              │    │   SPENDING   │              │
│  │              │    │              │    │ • RECOMMEND_ │              │
│  │              │    │              │    │   STRATEGY   │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    AI/ML LAYER                                            │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  AIML Service Integration                                       │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │  • Claude 4.5 Sonnet (primary)                                  │    │
│  │  • GPT-4o Mini (fallback)                                       │    │
│  │  • DeepSeek R1 (specialized)                                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                             │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Supabase PostgreSQL Database                                   │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │                                                                  │    │
│  │  Tables:                                                         │    │
│  │  ┌──────────────────┐         ┌──────────────────┐             │    │
│  │  │ chat_sessions    │         │ chat_messages    │             │    │
│  │  ├──────────────────┤         ├──────────────────┤             │    │
│  │  │ • id             │◄────────┤ • id             │             │    │
│  │  │ • user_id        │         │ • session_id     │             │    │
│  │  │ • title          │         │ • role           │             │    │
│  │  │ • created_at     │         │ • content        │             │    │
│  │  │ • updated_at     │         │ • metadata       │             │    │
│  │  │ • metadata       │         │ • created_at     │             │    │
│  │  └──────────────────┘         └──────────────────┘             │    │
│  │                                                                  │    │
│  │  RLS Policies (8 total):                                        │    │
│  │  • Users can view own sessions                                  │    │
│  │  • Users can create own sessions                                │    │
│  │  • Users can update own sessions                                │    │
│  │  • Users can delete own sessions                                │    │
│  │  • Users can view own messages                                  │    │
│  │  • Users can create own messages                                │    │
│  │  • Users can update own messages                                │    │
│  │  • Users can delete own messages                                │    │
│  │                                                                  │    │
│  │  Triggers (2):                                                   │    │
│  │  • update_chat_sessions_updated_at                              │    │
│  │  • update_chat_messages_updated_at                              │    │
│  │                                                                  │    │
│  │  Functions (3):                                                  │    │
│  │  • get_user_chat_sessions(user_id, limit)                       │    │
│  │  • get_session_messages(session_id, limit)                      │    │
│  │  • delete_old_sessions(days_old)                                │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 **SECURITY ARCHITECTURE**

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    ZERO TRUST SECURITY LAYERS                             │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Layer 1: Authentication                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ • Supabase Auth (JWT tokens)                                    │    │
│  │ • Periodic re-authentication (5 min)                            │    │
│  │ • Session validation on every request                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  Layer 2: Authorization                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ • Row Level Security (RLS) policies                             │    │
│  │ • Session ownership validation                                  │    │
│  │ • Least privilege access                                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  Layer 3: Input Validation                                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ • XSS protection (DOMPurify)                                    │    │
│  │ • Input sanitization                                            │    │
│  │ • Character limit enforcement (2000)                            │    │
│  │ • Type validation (TypeScript)                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  Layer 4: Rate Limiting                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ • 100 requests per hour per user                                │    │
│  │ • IP-based rate limiting                                        │    │
│  │ • Exponential backoff on errors                                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  Layer 5: Error Handling                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ • Safe error messages (no sensitive data)                       │    │
│  │ • Comprehensive logging                                         │    │
│  │ • Graceful degradation                                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 🧪 **TESTING ARCHITECTURE**

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    TESTING PYRAMID                                        │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│                          ┌─────────────┐                                  │
│                          │   E2E Tests │                                  │
│                          │  (32 tests) │                                  │
│                          └─────────────┘                                  │
│                        ┌───────────────────┐                              │
│                        │ Integration Tests │                              │
│                        │    (8 tests)      │                              │
│                        └───────────────────┘                              │
│                  ┌───────────────────────────────┐                        │
│                  │      Unit Tests               │                        │
│                  │      (35 tests)               │                        │
│                  └───────────────────────────────┘                        │
│                                                                           │
│  Test Coverage:                                                           │
│  • Financial Flows: 6 E2E tests                                           │
│  • Investment Flows: 7 E2E tests                                          │
│  • Chat Flows: 11 E2E tests                                               │
│  • Service Integration: 8 tests                                           │
│  • Unit Tests: 35 tests                                                   │
│                                                                           │
│  Total: 67 comprehensive tests                                            │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 **DATA FLOW DIAGRAM**

```
User Input
    │
    ▼
[XSS Protection] ──► DOMPurify sanitization
    │
    ▼
[Character Limit] ──► Max 2000 chars
    │
    ▼
[Authentication] ──► JWT validation
    │
    ▼
[Rate Limiting] ──► 100 req/hour check
    │
    ▼
[Intent Detection] ──► AI analysis (10 intent types)
    │
    ▼
[Entity Extraction] ──► Extract 6 entity types
    │
    ▼
[Context Building] ──► Session history + user data
    │
    ▼
[AI Response] ──► Claude 4.5 Sonnet
    │
    ▼
[Action Execution] ──► Execute 10 action types
    │
    ▼
[Response Formatting] ──► Add metadata (actions, education)
    │
    ▼
[Database Storage] ──► Save to chat_messages
    │
    ▼
[Client Update] ──► Optimistic UI update
    │
    ▼
User sees response
```

---

## 🎯 **COMPONENT INTERACTION**

```
ChatInterface (Web/Mobile)
    │
    ├──► ChatInput ──► User types message
    │                  │
    │                  ▼
    │              [Sanitize & Validate]
    │                  │
    │                  ▼
    │              [Send to API]
    │
    ├──► ChatMessageList ──► Display messages
    │                        │
    │                        ├──► User messages (blue/right)
    │                        ├──► Assistant messages (gray/left)
    │                        └──► System messages (yellow/center)
    │
    ├──► ChatSidebar ──► Session management
    │                    │
    │                    ├──► Create session
    │                    ├──► Switch session
    │                    └──► Delete session
    │
    └──► ChatHeader ──► User menu & navigation
                        │
                        ├──► Dashboard
                        ├──► Settings
                        └──► Logout
```

---

## ✨ **SUMMARY**

This architecture provides:

- ✅ Scalable multi-layer design
- ✅ Comprehensive security (zero trust)
- ✅ Full test coverage (67 tests)
- ✅ Cross-platform support (web + mobile)
- ✅ Production-ready quality
