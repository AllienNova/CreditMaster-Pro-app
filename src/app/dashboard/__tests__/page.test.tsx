import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "../page";
import { createBrowserClient } from "@supabase/ssr";

// Mock Supabase
jest.mock("@supabase/ssr", () => ({
  createBrowserClient: jest.fn(),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/dashboard",
}));

describe("DashboardPage", () => {
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

  it("should display loading state initially", () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    render(<DashboardPage />);
    expect(
      screen.getByText(/Loading your AI credit dashboard.../i),
    ).toBeInTheDocument();
  });

  it("should display dashboard content when user is authenticated", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "123",
            email: "test@example.com",
            user_metadata: { full_name: "Test User" },
          },
        },
      },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      // Updated to match new Fynvita dashboard text
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    });
  });

  it("should display financial health description", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "123",
            email: "test@example.com",
            user_metadata: {},
          },
        },
      },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      // Updated to match current dashboard content
      expect(
        screen.getByText(/financial health dashboard/i),
      ).toBeInTheDocument();
    });
  });

  it("should display navigation links", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "123",
            email: "test@example.com",
            user_metadata: {},
          },
        },
      },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      // Use getAllByText for elements that appear multiple times
      expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Credit Builder").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Marketplace").length).toBeGreaterThan(0);
    });
  });
});
