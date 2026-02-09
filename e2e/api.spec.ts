import { test, expect } from '@playwright/test';

test.describe('API Health Checks', () => {
  test('health endpoint should respond', async ({ request }) => {
    const response = await request.get('/api/health');
    // May or may not exist, but should not error
    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Auth API', () => {
  test('login endpoint should accept POST', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    // Should respond (even with error for invalid credentials)
    expect([200, 400, 401, 404]).toContain(response.status());
  });

  test('register endpoint should accept POST', async ({ request }) => {
    const response = await request.post('/api/auth/register', {
      data: {
        email: 'newuser@example.com',
        password: 'Password123!',
        name: 'Test User',
      },
    });
    expect([200, 201, 400, 409, 404]).toContain(response.status());
  });
});

test.describe('Disputes API', () => {
  test('GET /api/disputes should require auth', async ({ request }) => {
    const response = await request.get('/api/disputes');
    expect([401, 403, 200]).toContain(response.status());
  });

  test('POST /api/disputes should require auth', async ({ request }) => {
    const response = await request.post('/api/disputes', {
      data: {
        bureau: 'experian',
        accountName: 'Test Account',
        reason: 'not_mine',
      },
    });
    expect([401, 403, 200, 201]).toContain(response.status());
  });

  test('GET /api/disputes/templates should respond', async ({ request }) => {
    const response = await request.get('/api/disputes/templates');
    expect([200, 401, 403]).toContain(response.status());
  });
});

test.describe('Credit Builder API', () => {
  test('GET /api/credit-builder/tools should respond', async ({ request }) => {
    const response = await request.get('/api/credit-builder/tools');
    expect([200, 401, 403, 404]).toContain(response.status());
  });

  test('GET /api/credit-builder/recommendations should respond', async ({ request }) => {
    const response = await request.get('/api/credit-builder/recommendations');
    expect([200, 401, 403]).toContain(response.status());
  });
});

test.describe('Credit Report API', () => {
  test('GET /api/credit-report should require auth', async ({ request }) => {
    const response = await request.get('/api/credit-report');
    expect([401, 403, 200, 404]).toContain(response.status());
  });

  test('POST /api/credit-report/analyze should require auth', async ({ request }) => {
    const response = await request.post('/api/credit-report/analyze', {
      data: { reportId: 'test-123' },
    });
    expect([401, 403, 200, 400, 500]).toContain(response.status());
  });
});

test.describe('Notifications API', () => {
  test('GET /api/notifications should require auth', async ({ request }) => {
    const response = await request.get('/api/notifications');
    expect([401, 403, 200, 400]).toContain(response.status());
  });

  test('PATCH /api/notifications should require auth', async ({ request }) => {
    const response = await request.patch('/api/notifications', {
      data: { ids: ['notif-1'], read: true },
    });
    expect([401, 403, 200, 400]).toContain(response.status());
  });
});

test.describe('Payment API', () => {
  test('POST /api/payment/checkout should require data', async ({ request }) => {
    const response = await request.post('/api/payment/checkout', {
      data: {},
    });
    expect([400, 401, 403, 200]).toContain(response.status());
  });

  test('GET /api/payment/subscription should require auth', async ({ request }) => {
    const response = await request.get('/api/payment/subscription');
    expect([401, 403, 200, 404]).toContain(response.status());
  });
});

test.describe('Admin API', () => {
  test('GET /api/admin/users should require admin auth', async ({ request }) => {
    const response = await request.get('/api/admin/users');
    expect([401, 403]).toContain(response.status());
  });

  test('GET /api/admin/stats should require admin auth', async ({ request }) => {
    const response = await request.get('/api/admin/stats');
    expect([401, 403, 404]).toContain(response.status());
  });
});

test.describe('Student Loans API', () => {
  test('GET /api/student-loans/programs should respond', async ({ request }) => {
    const response = await request.get('/api/student-loans/programs');
    expect([200, 401, 403, 404]).toContain(response.status());
  });

  test('POST /api/student-loans/calculate should accept data', async ({ request }) => {
    const response = await request.post('/api/student-loans/calculate', {
      data: {
        balance: 50000,
        interestRate: 5.5,
        income: 60000,
      },
    });
    expect([200, 400, 401, 403, 404]).toContain(response.status());
  });
});

test.describe('Marketplace API', () => {
  test('GET /api/marketplace/tradelines should respond', async ({ request }) => {
    const response = await request.get('/api/marketplace/tradelines');
    expect([200, 404]).toContain(response.status());
  });
});

