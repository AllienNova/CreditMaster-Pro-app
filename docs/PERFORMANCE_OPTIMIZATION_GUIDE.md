# Performance Optimization Guide

This guide explains how to use the performance optimizations implemented in Phase 6.5.

---

## 📊 Database Optimization

### Running the Migration

Apply the performance optimization migration:

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase Dashboard
# Run: supabase/migrations/20260105_performance_optimizations.sql
```

### Using Optimized Stored Procedures

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Get recent sessions with message preview (optimized)
const { data, error } = await supabase
  .rpc('get_recent_sessions_with_preview', {
    p_user_id: userId,
    p_limit: 20
  });

// Get paginated messages (optimized)
const { data, error } = await supabase
  .rpc('get_session_messages_paginated', {
    p_session_id: sessionId,
    p_limit: 50,
    p_offset: 0
  });
```

### Refreshing Materialized View

The materialized view should be refreshed periodically (e.g., every hour):

```typescript
// Refresh session statistics
const { error } = await supabase.rpc('refresh_chat_session_stats');
```

---

## 🗄️ Caching Strategy

### Server-Side Caching

The chat cache is automatically used in the `FinancialChatEngine`:

```typescript
import { FinancialChatEngine } from '@/lib/ai/financial-chat-engine';

const chatEngine = new FinancialChatEngine();

// Automatically uses cache
const sessions = await chatEngine.getUserSessions(userId);
const messages = await chatEngine.getSessionHistory(sessionId);
```

### Manual Cache Operations

```typescript
import { chatCache } from '@/lib/cache/chat-cache';

// Get cache statistics
const stats = chatCache.getStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);

// Clear cache for a user
chatCache.invalidateUser(userId);

// Clear cache for a session
chatCache.invalidateSession(sessionId);

// Clear all cache
chatCache.clear();
```

### Client-Side Caching with React Query

```typescript
import { useChatSessions, useSendChatMessage } from '@/hooks/use-chat-queries';

function ChatComponent({ userId }: { userId: string }) {
  // Automatically cached with React Query
  const { data, isLoading, error } = useChatSessions(userId);
  
  // Mutation with optimistic updates
  const sendMessage = useSendChatMessage();
  
  const handleSend = async (content: string) => {
    await sendMessage.mutateAsync({
      sessionId: currentSessionId,
      content,
    });
  };
  
  return (
    // Your component JSX
  );
}
```

### Cache Invalidation

```typescript
import { cacheInvalidation } from '@/lib/react-query/query-client-config';

// Invalidate specific caches
await cacheInvalidation.invalidateChatSessions(userId);
await cacheInvalidation.invalidateChatMessages(sessionId);

// Invalidate all user data
await cacheInvalidation.invalidateUserData(userId);
```

---

## 📦 Bundle Size Optimization

### Analyzing Bundle Size

Run the bundle analyzer after building:

```bash
# Build the application
npm run build

# Analyze bundle size
node scripts/analyze-bundle.js
```

### Using Code Splitting

The webpack configuration automatically splits code into chunks:

- **vendors**: All node_modules
- **react**: React and React DOM
- **charts**: Chart.js, Recharts
- **aiml**: Anthropic AI, OpenAI
- **common**: Shared code used in multiple places

No additional configuration needed!

---

## 🚀 Lazy Loading

### Using Pre-configured Lazy Components

```typescript
import { ChatInterface, ComprehensiveAnalysisPanel } from '@/lib/lazy-components';

function MyPage() {
  return (
    <div>
      {/* Automatically lazy-loaded with loading spinner */}
      <ChatInterface userId={userId} />
      <ComprehensiveAnalysisPanel symbol="AAPL" />
    </div>
  );
}
```

### Creating Custom Lazy Components

```typescript
import { createLazyComponent } from '@/lib/lazy-components';

const MyHeavyComponent = createLazyComponent(
  () => import('@/components/MyHeavyComponent'),
  {
    ssr: false, // Disable SSR for client-only components
    loading: () => <div>Loading...</div>, // Custom loading component
  }
);
```

### Route-Based Code Splitting

Next.js automatically code-splits routes. For additional optimization:

```typescript
// app/my-page/page.tsx
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false,
});

export default function MyPage() {
  return <HeavyComponent />;
}
```

---

## 📈 Monitoring Performance

### Cache Statistics

```typescript
import { chatCache } from '@/lib/cache/chat-cache';

// Get cache stats
const stats = chatCache.getStats();
console.log({
  hits: stats.hits,
  misses: stats.misses,
  hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
  size: stats.size,
});
```

### React Query DevTools

Add React Query DevTools for development:

```typescript
// app/layout.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          {process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

---

## 🎯 Best Practices

### Database Queries
- ✅ Always use indexed columns in WHERE clauses
- ✅ Use stored procedures for complex queries
- ✅ Implement pagination for large result sets
- ✅ Refresh materialized views periodically

### Caching
- ✅ Set appropriate TTL values based on data volatility
- ✅ Invalidate cache on data mutations
- ✅ Monitor cache hit rates (target: >70%)
- ✅ Use optimistic updates for better UX

### Bundle Size
- ✅ Analyze bundle size regularly
- ✅ Keep chunks under 500KB
- ✅ Use dynamic imports for large components
- ✅ Remove unused dependencies

### Lazy Loading
- ✅ Lazy load components above the fold
- ✅ Disable SSR for client-only components
- ✅ Provide meaningful loading states
- ✅ Prefetch critical resources

---

## 🔧 Troubleshooting

### High Cache Miss Rate
- Check TTL values (may be too short)
- Verify cache invalidation isn't too aggressive
- Monitor cache size (may be evicting too frequently)

### Large Bundle Size
- Run bundle analyzer to identify large chunks
- Check for duplicate dependencies
- Ensure tree shaking is working
- Consider lazy loading more components

### Slow Database Queries
- Check if indexes are being used (EXPLAIN ANALYZE)
- Verify materialized view is refreshed
- Monitor query execution times
- Consider adding more specific indexes

---

## 📚 Additional Resources

- [Next.js Performance Optimization](https://nextjs.org/docs/app/building-your-application/optimizing)
- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [Supabase Performance Tips](https://supabase.com/docs/guides/database/performance)
- [Web.dev Performance Guide](https://web.dev/performance/)

