/**
 * Settings Pages Tests
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/settings",
}));

// Mock Supabase client to prevent env var requirement
jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
  getSupabase: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  supabaseAdmin: {},
}));

// Import AFTER mocks are set up
import { createClient } from "@/lib/supabase/client";

// Mock window.matchMedia for theme detection
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock fetch - ensure it's a jest mock function
const mockFetch = global.fetch as jest.Mock;

// Helper to create mock Supabase client
function createMockSupabaseClient() {
  return {
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithPassword: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      signUp: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  };
}

// Re-setup createClient mock before each test (resetMocks: true wipes factory implementations)
beforeEach(() => {
  (createClient as jest.Mock).mockReturnValue(createMockSupabaseClient());
});

// Helper to wrap components with ThemeProvider
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider defaultTheme="light">{component}</ThemeProvider>,
  );
};

describe("Settings Hub Page", () => {
  it("renders settings hub with all sections", () => {
    const SettingsPage = require("../page").default;
    renderWithTheme(<SettingsPage />);

    // Use queryAllBy to handle multiple matches
    expect(screen.queryAllByText(/Settings/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Profile/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Notifications/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Privacy/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Billing/i).length).toBeGreaterThan(0);
  });
});

describe("Profile Settings Page", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: {
          full_name: "Test User",
          email: "test@example.com",
          phone: "555-1234",
        },
      }),
    });
  });

  it("renders profile form", async () => {
    const ProfilePage = require("../profile/page").default;
    render(<ProfilePage />);

    expect(screen.getByText(/Profile Settings/i)).toBeInTheDocument();
  });

  it("shows form fields", async () => {
    const ProfilePage = require("../profile/page").default;
    render(<ProfilePage />);

    // Check for any input fields
    const inputs = document.querySelectorAll("input, textarea");
    expect(inputs.length).toBeGreaterThan(0);
  });
});

describe("Notifications Settings Page", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        settings: {
          notifications: {
            email_disputes: true,
            email_scores: true,
            push_enabled: false,
          },
        },
      }),
    });
  });

  it("renders notification preferences", async () => {
    const NotificationsPage = require("../notifications/page").default;
    render(<NotificationsPage />);

    const notificationElements = screen.queryAllByText(/Notification/i);
    expect(notificationElements.length).toBeGreaterThan(0);
  });

  it("shows toggle switches", async () => {
    const NotificationsPage = require("../notifications/page").default;
    render(<NotificationsPage />);

    // Check for toggle switches or buttons that control notifications
    const toggles = document.querySelectorAll(
      'input[type="checkbox"], [role="switch"], button',
    );
    expect(toggles.length).toBeGreaterThan(0);
  });
});

describe("Privacy Settings Page", () => {
  it("renders privacy settings", () => {
    const PrivacyPage = require("../privacy/page").default;
    render(<PrivacyPage />);

    const privacyElements = screen.queryAllByText(/Privacy/i);
    expect(privacyElements.length).toBeGreaterThan(0);
  });

  it("shows data sharing options", () => {
    const PrivacyPage = require("../privacy/page").default;
    render(<PrivacyPage />);

    const dataElements = screen.queryAllByText(/Data/i);
    const sharingElements = screen.queryAllByText(/Sharing/i);
    expect(dataElements.length + sharingElements.length).toBeGreaterThan(0);
  });
});

describe("Billing Settings Page", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        subscription: {
          plan: "premium",
          status: "active",
          current_period_end: "2024-12-31",
        },
      }),
    });
  });

  it("renders billing page", async () => {
    const BillingPage = require("../billing/page").default;
    render(<BillingPage />);

    const billingElements = screen.queryAllByText(/Billing/i);
    expect(billingElements.length).toBeGreaterThan(0);
  });

  it("shows subscription info", async () => {
    const BillingPage = require("../billing/page").default;
    render(<BillingPage />);

    await waitFor(() => {
      const planElements = screen.queryAllByText(/Plan/i);
      const subElements = screen.queryAllByText(/Subscription/i);
      expect(planElements.length + subElements.length).toBeGreaterThan(0);
    });
  });
});

describe("Connected Accounts Page", () => {
  it("renders connected accounts page", () => {
    const ConnectedAccountsPage = require("../connected-accounts/page").default;
    render(<ConnectedAccountsPage />);

    // Check for any heading that indicates the page rendered
    const headings = screen.queryAllByRole("heading");
    expect(headings.length).toBeGreaterThan(0);
  });

  it("shows bureau connections", () => {
    const ConnectedAccountsPage = require("../connected-accounts/page").default;
    render(<ConnectedAccountsPage />);

    // Check for bureau-related content
    const bureauContent =
      screen.queryByText(/Experian/i) ||
      screen.queryByText(/Bureau/i) ||
      screen.queryByText(/Credit/i);
    expect(bureauContent).toBeTruthy();
  });
});
