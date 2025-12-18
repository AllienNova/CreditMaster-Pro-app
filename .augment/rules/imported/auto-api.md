---
type: "always_apply"
---

# Auto API Rules

type: auto
description: Apply when working on APIs, endpoints, REST, GraphQL, fetch, axios, or backend

---

## API Handler Pattern

```typescript
export async function handler(req: Request): Promise<Response> {
  try {
    // 1. Validate input
    const validated = InputSchema.parse(await req.json());

    // 2. Authenticate/Authorize
    const user = await authenticate(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Business logic
    const result = await processRequest(validated, user);

    // 4. Return response
    return Response.json({ success: true, data: result });

  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('API Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Input Validation

- Always validate with Zod or similar
- Sanitize user input
- Check required fields
- Validate types and formats
- Set reasonable limits (string length, array size)

## Error Responses

```typescript
interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

// 400 - Bad Request (validation)
// 401 - Unauthorized (not logged in)
// 403 - Forbidden (no permission)
// 404 - Not Found
// 409 - Conflict (duplicate)
// 500 - Internal Server Error
```

## Security

- Validate all inputs server-side
- Use parameterized queries
- Rate limit endpoints
- Implement CORS properly
- Log security events
- Never expose internal errors

## Database Operations

- Use transactions for multi-step operations
- Implement pagination for lists
- Add proper indexes
- Handle connection pooling
- Implement retry logic
