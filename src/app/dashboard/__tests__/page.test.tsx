import { render, screen, waitFor } from '@testing-library/react';
import { createBrowserClient } from '@supabase/ssr';
import DashboardPage from '../page';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';

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

  const renderWithOnboarding = () =>
    render(
      <OnboardingProvider>
        <DashboardPage />
      </OnboardingProvider>
    );

  it('should display loading state initially', () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    renderWithOnboarding();
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

    renderWithOnboarding();

    await waitFor(() => {
      expect(screen.getByText(/Your Credit Intelligence Dashboard/i)).toBeInTheDocument();
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

    renderWithOnboarding();

    await waitFor(() => {
      expect(screen.getByText('Credit Score')).toBeInTheDocument();
      expect(screen.getByText('AI Tools Used')).toBeInTheDocument();
      expect(screen.getByText('Disputes Sent')).toBeInTheDocument();
      expect(screen.getByText('Strategies Learned')).toBeInTheDocument();
    }, { timeout: 3000 });
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

    renderWithOnboarding();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Student Loans')).toBeInTheDocument();
      expect(screen.getByText('Pricing')).toBeInTheDocument();
    });
  });
});

