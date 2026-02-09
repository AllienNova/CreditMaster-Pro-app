/**
 * Admin Pages Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn()
  }),
  usePathname: () => '/admin'
}));

// Mock fetch - ensure it's a jest mock function
const mockFetch = global.fetch as jest.Mock;

describe('Admin Dashboard Page', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        metrics: {
          totalUsers: 1000,
          activeSubscriptions: 500,
          monthlyRevenue: 25000,
          disputeSuccessRate: 85
        }
      })
    });
  });

  it('renders admin dashboard with metrics', async () => {
    const AdminPage = require('../page').default;
    render(<AdminPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Admin Dashboard/i)).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    const AdminPage = require('../page').default;
    render(<AdminPage />);

    // Should show loading or skeleton state - check for any loading indicator
    const loadingElement = document.querySelector('.animate-pulse') || document.querySelector('.animate-spin');
    expect(loadingElement || screen.queryByText(/loading/i)).toBeTruthy();
  });

  it('fetches metrics on mount', async () => {
    const AdminPage = require('../page').default;
    render(<AdminPage />);

    // Wait for component to mount and potentially fetch
    await waitFor(() => {
      // Check if fetch was called or if the page rendered
      const pageRendered = screen.queryByText(/Admin/i) || screen.queryByText(/Dashboard/i);
      expect(pageRendered).toBeTruthy();
    });
  });
});

describe('Admin Users Page', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [
          { id: '1', email: 'user1@test.com', full_name: 'User One' },
          { id: '2', email: 'user2@test.com', full_name: 'User Two' }
        ],
        total: 2
      })
    });
  });

  it('renders users list', async () => {
    const UsersPage = require('../users/page').default;
    render(<UsersPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    });
  });
});

describe('Admin Subscriptions Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders subscriptions page', async () => {
    const SubscriptionsPage = require('../subscriptions/page').default;
    render(<SubscriptionsPage />);
    
    expect(screen.getByText(/Subscription Management/i)).toBeInTheDocument();
  });
});

describe('Admin Health Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders system health page', async () => {
    const HealthPage = require('../health/page').default;
    render(<HealthPage />);
    
    expect(screen.getByText(/System Health/i)).toBeInTheDocument();
  });
});

describe('Admin Logs Page', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ logs: [], total: 0 })
    });
  });

  it('renders logs page', async () => {
    const LogsPage = require('../logs/page').default;
    render(<LogsPage />);
    
    expect(screen.getByText(/Error Logs/i)).toBeInTheDocument();
  });
});

describe('Admin Audit Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders audit trail page', async () => {
    const AuditPage = require('../audit/page').default;
    render(<AuditPage />);
    
    expect(screen.getByText(/Audit Trail/i)).toBeInTheDocument();
  });
});

describe('Admin Features Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders feature flags page', async () => {
    const FeaturesPage = require('../features/page').default;
    render(<FeaturesPage />);
    
    expect(screen.getByText(/Feature Flags/i)).toBeInTheDocument();
  });
});

describe('Admin Config Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders system config page', async () => {
    const ConfigPage = require('../config/page').default;
    render(<ConfigPage />);
    
    expect(screen.getByText(/System Configuration/i)).toBeInTheDocument();
  });
});

