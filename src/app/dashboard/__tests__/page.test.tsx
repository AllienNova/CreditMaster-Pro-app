import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '../page';
import { createBrowserClient } from '@supabase/ssr';

// Mock Supabase
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}));

describe('DashboardPage', () => {
  const mockSupabase = {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createBrowserClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('should display loading state initially', () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    render(<DashboardPage />);
    expect(screen.getByText(/Loading your AI credit dashboard.../i)).toBeInTheDocument();
  });

  it('should display dashboard content when user is authenticated', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: '123',
            email: 'test@example.com',
            user_metadata: { full_name: 'Test User' },
          },
        },
      },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Your AI-Powered Credit Repair Dashboard/i)).toBeInTheDocument();
    });
  });

  it('should display key metrics', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: '123',
            email: 'test@example.com',
            user_metadata: {},
          },
        },
      },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Credit Score')).toBeInTheDocument();
      expect(screen.getByText('AI Agents Active')).toBeInTheDocument();
      expect(screen.getByText('Active Disputes')).toBeInTheDocument();
      expect(screen.getByText('AI Strategies')).toBeInTheDocument();
    });
  });

  it('should display navigation links', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: '123',
            email: 'test@example.com',
            user_metadata: {},
          },
        },
      },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Student Loans')).toBeInTheDocument();
      expect(screen.getByText('Pricing')).toBeInTheDocument();
    });
  });
});

