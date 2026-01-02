/**
 * MSW Server Setup for Testing
 * 
 * This file sets up Mock Service Worker (MSW) for intercepting API requests during tests.
 * MSW allows us to mock API responses without modifying application code.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server with all handlers
export const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn', // Warn about unhandled requests
  });
});

// Reset handlers after each test to ensure test isolation
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});

