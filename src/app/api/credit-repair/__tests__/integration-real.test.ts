/**
 * Real Integration Tests
 *
 * Tests complete user flows with actual API calls and real database
 *
 * NOTE: These tests require:
 * 1. Running Next.js server (npm run dev)
 * 2. Valid Supabase credentials in .env
 * 3. AIML API key for AI features
 */

import {
  setupTestEnvironment,
  teardownTestEnvironment,
  makeAuthenticatedRequest,
  measureTime,
} from '@/lib/test-utils/test-setup';

// Check if we have required credentials
const hasCredentials = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;

// Skip these tests if credentials are not available
const describeOrSkip = hasCredentials ? describe : describe.skip;

describeOrSkip('Real Integration Tests - Credit Repair API', () => {
  let userId: string;
  let token: string;

  // Setup: Create test user and get token
  beforeAll(async () => {
    const setup = await setupTestEnvironment();
    userId = setup.userId;
    token = setup.token;
  }, 30000); // 30 second timeout for setup

  // Cleanup: Remove all test data
  afterAll(async () => {
    await teardownTestEnvironment(userId);
  }, 30000);

  // Clean up between tests
  afterEach(async () => {
    await teardownTestEnvironment(userId);
  });

  describe('Complete Dispute Lifecycle', () => {
    it('should handle full dispute flow: create → fetch → update → delete', async () => {
      // Step 1: Create dispute
      const createResponse = await makeAuthenticatedRequest('/api/credit-repair/disputes', {
        method: 'POST',
        token,
        body: {
          bureau: 'experian',
          itemType: 'late_payment',
          itemDescription: 'Late payment on credit card',
          reason: 'not_mine',
          generateLetter: false,
        },
      });

      expect(createResponse.status).toBe(201);
      const createData = await createResponse.json();
      expect(createData.success).toBe(true);
      expect(createData.data.id).toBeDefined();
      expect(createData.data.status).toBe('draft');

      const disputeId = createData.data.id;

      // Step 2: Fetch disputes
      const fetchResponse = await makeAuthenticatedRequest('/api/credit-repair/disputes', {
        token,
      });

      expect(fetchResponse.status).toBe(200);
      const fetchData = await fetchResponse.json();
      expect(fetchData.success).toBe(true);
      expect(fetchData.data).toHaveLength(1);
      expect(fetchData.data[0].id).toBe(disputeId);

      // Step 3: Update dispute
      const updateResponse = await makeAuthenticatedRequest(
        `/api/credit-repair/disputes/${disputeId}`,
        {
          method: 'PUT',
          token,
          body: {
            status: 'sent',
            version: createData.data.version,
          },
        }
      );

      expect(updateResponse.status).toBe(200);
      const updateData = await updateResponse.json();
      expect(updateData.success).toBe(true);
      expect(updateData.data.status).toBe('sent');
      expect(updateData.data.version).toBe(createData.data.version + 1);

      // Step 4: Delete dispute
      const deleteResponse = await makeAuthenticatedRequest(
        `/api/credit-repair/disputes/${disputeId}`,
        {
          method: 'DELETE',
          token,
        }
      );

      expect(deleteResponse.status).toBe(200);
      const deleteData = await deleteResponse.json();
      expect(deleteData.success).toBe(true);

      // Step 5: Verify deletion
      const verifyResponse = await makeAuthenticatedRequest('/api/credit-repair/disputes', {
        token,
      });

      const verifyData = await verifyResponse.json();
      expect(verifyData.data).toHaveLength(0);
    }, 15000);

    it('should handle optimistic locking correctly', async () => {
      // Create dispute
      const createResponse = await makeAuthenticatedRequest('/api/credit-repair/disputes', {
        method: 'POST',
        token,
        body: {
          bureau: 'experian',
          itemType: 'late_payment',
          itemDescription: 'Test dispute',
          reason: 'not_mine',
          generateLetter: false,
        },
      });

      const createData = await createResponse.json();
      const disputeId = createData.data.id;
      const version = createData.data.version;

      // First update (should succeed)
      const update1Response = await makeAuthenticatedRequest(
        `/api/credit-repair/disputes/${disputeId}`,
        {
          method: 'PUT',
          token,
          body: {
            status: 'sent',
            version,
          },
        }
      );

      expect(update1Response.status).toBe(200);

      // Second update with old version (should fail)
      const update2Response = await makeAuthenticatedRequest(
        `/api/credit-repair/disputes/${disputeId}`,
        {
          method: 'PUT',
          token,
          body: {
            status: 'under_review',
            version, // Using old version
          },
        }
      );

      expect(update2Response.status).toBe(409);
      const update2Data = await update2Response.json();
      expect(update2Data.error).toContain('modified by another process');
    }, 10000);
  });

  describe('Credit Card Management', () => {
    it('should handle complete credit card lifecycle', async () => {
      // Create card
      const createResponse = await makeAuthenticatedRequest('/api/credit-repair/cards', {
        method: 'POST',
        token,
        body: {
          name: 'Test Card',
          creditLimit: 5000,
          currentBalance: 1000,
        },
      });

      expect(createResponse.status).toBe(201);
      const createData = await createResponse.json();
      expect(createData.data.utilization).toBe(20);

      const cardId = createData.data.id;

      // Update card
      const updateResponse = await makeAuthenticatedRequest(
        `/api/credit-repair/cards/${cardId}`,
        {
          method: 'PUT',
          token,
          body: {
            currentBalance: 2500,
            version: createData.data.version,
          },
        }
      );

      expect(updateResponse.status).toBe(200);
      const updateData = await updateResponse.json();
      expect(updateData.data.utilization).toBe(50);

      // Delete card
      const deleteResponse = await makeAuthenticatedRequest(
        `/api/credit-repair/cards/${cardId}`,
        {
          method: 'DELETE',
          token,
        }
      );

      expect(deleteResponse.status).toBe(200);
    }, 10000);
  });

  describe('Goodwill Letter Flow', () => {
    it('should create and update goodwill letter', async () => {
      // Create goodwill letter
      const createResponse = await makeAuthenticatedRequest('/api/credit-repair/goodwill', {
        method: 'POST',
        token,
        body: {
          creditorName: 'Test Bank',
          accountNumber: '1234567890',
          issueDescription: 'Late payment due to medical emergency',
          generateLetter: false,
        },
      });

      expect(createResponse.status).toBe(201);
      const createData = await createResponse.json();
      expect(createData.data.status).toBe('draft');

      const letterId = createData.data.id;

      // Update to sent
      const updateResponse = await makeAuthenticatedRequest(
        `/api/credit-repair/goodwill/${letterId}`,
        {
          method: 'PUT',
          token,
          body: {
            status: 'sent',
            version: createData.data.version,
          },
        }
      );

      expect(updateResponse.status).toBe(200);
      const updateData = await updateResponse.json();
      expect(updateData.data.status).toBe('sent');
    }, 10000);
  });

  describe('Performance Benchmarks', () => {
    it('should respond to GET requests within 200ms', async () => {
      const { duration } = await measureTime(() =>
        makeAuthenticatedRequest('/api/credit-repair/disputes', { token })
      );

      expect(duration).toBeLessThan(200);
    });

    it('should respond to POST requests within 500ms', async () => {
      const { duration } = await measureTime(() =>
        makeAuthenticatedRequest('/api/credit-repair/disputes', {
          method: 'POST',
          token,
          body: {
            bureau: 'experian',
            itemType: 'late_payment',
            itemDescription: 'Test',
            reason: 'not_mine',
            generateLetter: false,
          },
        })
      );

      expect(duration).toBeLessThan(500);
    });

    it('should handle 10 concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, () =>
        makeAuthenticatedRequest('/api/credit-repair/disputes', { token })
      );

      const { duration } = await measureTime(() => Promise.all(requests));

      expect(duration).toBeLessThan(2000); // All 10 requests within 2 seconds
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const response = await makeAuthenticatedRequest('/api/credit-repair/disputes', {
        token: 'invalid-token',
      });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid input', async () => {
      const response = await makeAuthenticatedRequest('/api/credit-repair/disputes', {
        method: 'POST',
        token,
        body: {
          // Missing required fields
          bureau: 'experian',
        },
      });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent resources', async () => {
      const response = await makeAuthenticatedRequest(
        '/api/credit-repair/disputes/non-existent-id',
        { token }
      );

      expect(response.status).toBe(404);
    });
  });
});

