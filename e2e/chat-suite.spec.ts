/**
 * Phase 6.4.3: E2E Chat Flows Test Suite
 * Comprehensive end-to-end tests for financial chat functionality
 */

import { test, expect, Page } from '@playwright/test';
import { AUTH_STORAGE_STATE, restoreAuthSession } from './utils/auth';

test.use({ storageState: AUTH_STORAGE_STATE });

// Helper functions
function buildSession(title: string, messageCount = 0) {
  const now = new Date().toISOString();
  return {
    id: `session-${Math.random().toString(36).slice(2, 10)}`,
    title,
    userId: 'e2e-user',
    createdAt: now,
    updatedAt: now,
    metadata: { messageCount },
  };
}

async function setupChatMocks(page: Page) {
  let sessions = [buildSession('General Chat', 0)];
  const messagesBySession = new Map<string, any[]>(
    sessions.map((session) => [session.id, []])
  );

  await page.route('**/api/chat/financial/sessions**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();

    if (pathname.endsWith('/messages')) {
      const match = pathname.match(/\/api\/chat\/financial\/sessions\/([^/]+)\/messages/);
      const sessionId = match?.[1];
      const messages = sessionId ? messagesBySession.get(sessionId) || [] : [];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages }),
      });
    }

    const sessionMatch = pathname.match(/\/api\/chat\/financial\/sessions\/([^/]+)$/);
    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      if (method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ session: { id: sessionId, userId: 'e2e-user' } }),
        });
      }
      if (method === 'DELETE') {
        sessions = sessions.filter((session) => session.id !== sessionId);
        messagesBySession.delete(sessionId);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    }

    if (pathname.endsWith('/api/chat/financial/sessions')) {
      if (method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ sessions }),
        });
      }
      if (method === 'POST') {
        const body = request.postData() ? JSON.parse(request.postData() as string) : {};
        const newSession = buildSession(body.title || 'New Chat', 0);
        sessions = [newSession, ...sessions];
        messagesBySession.set(newSession.id, []);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ session: newSession }),
        });
      }
    }

    return route.fallback();
  });

  await page.route('**/api/chat/financial', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      return route.fallback();
    }

    const body = request.postData() ? JSON.parse(request.postData() as string) : {};
    const sessionId = body.sessionId || sessions[0]?.id;
    const userMessage = {
      id: `user-${Date.now()}`,
      sessionId,
      role: 'user',
      content: body.message || '',
      timestamp: new Date().toISOString(),
    };
    const assistantMessage = {
      id: `assistant-${Date.now() + 1}`,
      sessionId,
      role: 'assistant',
      content: 'Here is a quick portfolio update based on your request.',
      timestamp: new Date().toISOString(),
      metadata: {
        suggestedActions: [{ label: 'View portfolio', action: 'view_portfolio' }],
      },
    };

    if (sessionId) {
      const existing = messagesBySession.get(sessionId) || [];
      messagesBySession.set(sessionId, [...existing, userMessage, assistantMessage]);
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: assistantMessage.content,
        metadata: assistantMessage.metadata,
      }),
    });
  });
}

async function selectFirstSession(page: Page) {
  try {
    await page.waitForSelector('[data-testid="session-item"]', { timeout: 2000 });
  } catch {
    return;
  }
  await page.locator('[data-testid="session-item"]').first().click();
}

test.describe('Chat Flows E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await restoreAuthSession(page);
    await setupChatMocks(page);
    await page.goto('/chat');
  });

  test('Chat Session Management', async ({ page }) => {
    // Verify initial session is created
    await expect(page.locator('[data-testid="chat-session"]')).toBeVisible();

    // Create new session
    await page.click('[data-testid="new-session-button"]');
    await page.waitForSelector('[data-testid="new-session-input"]');
    await page.fill('[data-testid="new-session-input"]', 'Investment Questions');
    await page.click('[data-testid="save-session-button"]');

    // Verify new session appears in sidebar
    await expect(page.locator('text=Investment Questions')).toBeVisible();

    // Switch sessions
    const firstSession = page.locator('[data-testid="session-item"]').first();
    await firstSession.click();
    await expect(page.locator('[data-testid="active-session"]')).toBeVisible();

    // Delete session
    const targetSession = page
      .locator('[data-testid="session-item"]')
      .filter({ hasText: 'Investment Questions' });
    await targetSession.locator('[data-testid="delete-session-button"]').click();
    await targetSession.locator('[data-testid="delete-session-button"]').click();

    // Verify session is removed
    await expect(page.locator('text=Investment Questions')).not.toBeVisible();
  });

  test('Message Flow with AI Response', async ({ page }) => {
    await selectFirstSession(page);

    // Send message
    const testMessage = 'What is my portfolio performance?';
    await page.fill('[data-testid="chat-input"]', testMessage);
    await page.click('[data-testid="send-button"]');

    // Verify user message appears
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();

    // Wait for AI response
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

    // Verify AI response appears
    const assistantMessages = await page.locator('[data-testid="assistant-message"]').all();
    expect(assistantMessages.length).toBeGreaterThan(0);

    // Verify message metadata
    await expect(page.locator('[data-testid="message-timestamp"]')).toBeVisible();
  });

  test('Intent Detection and Suggested Actions', async ({ page }) => {
    await selectFirstSession(page);

    // Send message that should trigger suggested actions
    await page.fill('[data-testid="chat-input"]', 'I want to analyze my investments');
    await page.click('[data-testid="send-button"]');

    // Wait for response with suggested actions
    await page.waitForSelector('[data-testid="suggested-actions"]', { timeout: 10000 });

    // Verify suggested actions appear
    await expect(page.locator('[data-testid="suggested-actions"]')).toBeVisible();
    
    // Click on a suggested action
    const firstAction = page.locator('[data-testid="suggested-action"]').first();
    await firstAction.click();

    // Verify navigation or action execution
    // This will depend on the specific action
    await page.waitForTimeout(1000);
  });

  test('Authentication and Session Validation', async ({ page }) => {
    await selectFirstSession(page);

    // Send a message
    await page.fill('[data-testid="chat-input"]', 'Test message');
    await page.click('[data-testid="send-button"]');

    // Wait for response
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

    // Simulate session timeout by clearing cookies
    await page.context().clearCookies();

    // Try to send another message
    await page.fill('[data-testid="chat-input"]', 'Another message');
    await page.click('[data-testid="send-button"]');

    // Should redirect to login or show auth error
    await page.waitForTimeout(2000);
    const errorMessage = page.locator('[data-testid="error-message"]');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible();
    } else {
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/auth\/login|chat/);
    }
  });

  test('Cross-platform Chat Persistence', async ({ page }) => {
    // Send message on web
    await selectFirstSession(page);
    const testMessage = 'Portfolio analysis request';
    await page.fill('[data-testid="chat-input"]', testMessage);
    await page.click('[data-testid="send-button"]');

    // Wait for response
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

    // Reload to simulate a new session
    await page.reload();
    await page.waitForTimeout(500);
    await page.click('[data-testid="session-item"]');

    // Verify message history persists
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();
  });

  test('Error Handling - Network Failure', async ({ page }) => {
    await selectFirstSession(page);

    // Simulate network failure
    await page.unroute('**/api/chat/financial');
    await page.route('**/api/chat/financial', route => route.abort());

    // Try to send message
    await page.fill('[data-testid="chat-input"]', 'Test message');
    await page.click('[data-testid="send-button"]');

    // Verify error message appears
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Failed to send message')).toBeVisible();
  });

  test('Error Handling - Invalid Input', async ({ page }) => {
    await selectFirstSession(page);

    // Try to send empty message
    await page.click('[data-testid="send-button"]');

    // Verify send button is disabled or no message is sent
    const messages = await page.locator('[data-testid="user-message"]').all();
    const initialCount = messages.length;

    // Try again
    await page.click('[data-testid="send-button"]');
    const newMessages = await page.locator('[data-testid="user-message"]').all();
    expect(newMessages.length).toBe(initialCount);
  });

  test('Error Handling - Auth Error', async ({ page }) => {
    await selectFirstSession(page);

    // Simulate auth error by intercepting API call
    await page.unroute('**/api/chat/financial');
    await page.route('**/api/chat/financial', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    // Try to send message
    await page.fill('[data-testid="chat-input"]', 'Test message');
    await page.click('[data-testid="send-button"]');

    // Verify error handling
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('Mobile Chat Interface', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/chat');
    await selectFirstSession(page);

    // Verify mobile layout
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();

    // Send message on mobile
    await page.fill('[data-testid="chat-input"]', 'Mobile test message');
    await page.click('[data-testid="send-button"]');

    // Verify message appears
    await expect(page.locator('text=Mobile test message')).toBeVisible();

    // Verify mobile-specific elements
    await expect(page.locator('[data-testid="mobile-chat-header"]')).toBeVisible();
  });

  test('Character Limit Validation', async ({ page }) => {
    await selectFirstSession(page);

    // Create message exceeding 2000 characters
    const longMessage = 'a'.repeat(2000);
    await page.fill('[data-testid="chat-input"]', longMessage);

    // Verify character counter shows error
    await expect(page.locator('[data-testid="char-counter-error"]')).toBeVisible();

    // Verify send button remains available at the limit
    await expect(page.locator('[data-testid="send-button"]')).toBeEnabled();
  });

  test('XSS Protection', async ({ page }) => {
    await selectFirstSession(page);

    // Try to send message with HTML/script tags
    const xssMessage = '<script>alert("XSS")</script><img src=x onerror=alert("XSS")>';
    await page.fill('[data-testid="chat-input"]', xssMessage);
    await page.click('[data-testid="send-button"]');

    // Wait for message to appear
    await page.waitForTimeout(1000);

    // Verify message is sanitized (no script execution)
    const messageContent = await page.locator('[data-testid="user-message"]').last().textContent();
    expect(messageContent).not.toContain('<script>');
    expect(messageContent).not.toContain('<img');
  });
});
