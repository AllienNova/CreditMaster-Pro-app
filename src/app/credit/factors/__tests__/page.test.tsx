import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CreditFactorsPage from "../page";

// Mock Next.js Link component
jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = "MockLink";
  return MockLink;
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Helper to create mock response with clone method
const createMockResponse = (data: any) => ({
  ok: true,
  json: async () => data,
  clone: function () {
    return this;
  },
});

describe("CreditFactorsPage", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("renders loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<CreditFactorsPage />);

    expect(
      screen.getByRole("heading", { name: /credit factors/i }),
    ).toBeInTheDocument();
  });

  it("renders factors after successful fetch", async () => {
    const mockFactors = [
      {
        id: "payment_history",
        name: "Payment History",
        impact: "positive",
        category: "payment_history",
        status: "good",
        value: "98% on-time payments",
        description: "You have a strong payment history.",
        recommendation: "Continue making payments on time.",
        percentImpact: 35,
      },
      {
        id: "credit_utilization",
        name: "Credit Utilization",
        impact: "neutral",
        category: "credit_utilization",
        status: "fair",
        value: "32% utilization",
        description: "Your utilization is slightly above 30%.",
        recommendation: "Pay down balances.",
        percentImpact: 30,
      },
    ];

    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        success: true,
        // The route nests both lists under `data`. A sibling key does not
        // survive the mobile client's envelope unwrap, so it moved inside.
        data: { factors: mockFactors, unavailable: [] },
      }),
    );

    render(<CreditFactorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Payment History")).toBeInTheDocument();
      expect(screen.getByText("Credit Utilization")).toBeInTheDocument();
    });
  });

  it("displays factor score summary", async () => {
    const mockFactors = [
      {
        id: "payment_history",
        name: "Payment History",
        impact: "positive",
        category: "payment_history",
        status: "good",
        value: "98% on-time payments",
        description: "You have a strong payment history.",
        percentImpact: 35,
      },
    ];

    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        success: true,
        // The route nests both lists under `data`. A sibling key does not
        // survive the mobile client's envelope unwrap, so it moved inside.
        data: { factors: mockFactors, unavailable: [] },
      }),
    );

    render(<CreditFactorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Factor Score")).toBeInTheDocument();
      expect(screen.getByText("/100")).toBeInTheDocument();
    });
  });

  it("expands factor details when clicked", async () => {
    // NOTE ON MOCKING IN THIS FILE. The `global.fetch = mockFetch` at the top
    // is overridden by MSW: server.listen() runs in a beforeAll, which fires
    // AFTER this module is evaluated, so MSW wins every time. Every
    // mockFetch.mockResolvedValueOnce fixture here was dead code answering
    // nothing. Overriding the handler is the pattern that actually works, and
    // it is what the error-state test below already does.
    const { server } = require("@/__tests__/mocks/server");
    const { rest } = require("msw");

    server.use(
      rest.get(
        "http://localhost/api/credit/factors",
        (req: any, res: any, ctx: any) =>
          res(
            ctx.json({
              success: true,
              data: {
                factors: [
                  {
                    id: "credit_age",
                    name: "Credit Age",
                    impact: "positive",
                    category: "credit_age",
                    status: "good",
                    value: "7 year average across your linked accounts",
                    description: "Your credit history length is good.",
                    recommendation: "Keep old accounts open.",
                    percentImpact: 15,
                  },
                ],
                unavailable: [],
              },
            }),
          ),
      ),
    );

    render(<CreditFactorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Credit Age")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /credit age/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Your credit history length is good."),
      ).toBeInTheDocument();
      expect(screen.getByText("Keep old accounts open.")).toBeInTheDocument();
    });
  });

  it("handles error state", async () => {
    // Override MSW handler to return error for this test
    const { server } = require("@/__tests__/mocks/server");
    const { rest } = require("msw");

    server.use(
      rest.get(
        "http://localhost/api/credit/factors",
        (req: any, res: any, ctx: any) => {
          return res(
            ctx.status(500),
            ctx.json({ success: false, error: "Failed to fetch" }),
          );
        },
      ),
    );

    render(<CreditFactorsPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
    });
  });

  it("displays empty state when no factors", async () => {
    // Override MSW handler to return empty data for this test
    const { server } = require("@/__tests__/mocks/server");
    const { rest } = require("msw");

    server.use(
      rest.get(
        "http://localhost/api/credit/factors",
        (req: any, res: any, ctx: any) => {
          return res(ctx.json({ success: true, data: [] }));
        },
      ),
    );

    render(<CreditFactorsPage />);

    await waitFor(() => {
      expect(screen.getByText("No factor data available")).toBeInTheDocument();
    });
  });

  it("shows improvement alert for factors needing attention", async () => {
    // The two factors this route can actually compute are credit_age and
    // credit_mix; the previous fixture used payment_history and
    // credit_utilization, both of which it reports as uncomputable. Same
    // assertion, factors that can really arrive.
    const { server } = require("@/__tests__/mocks/server");
    const { rest } = require("msw");

    server.use(
      rest.get(
        "http://localhost/api/credit/factors",
        (req: any, res: any, ctx: any) =>
          res(
            ctx.json({
              success: true,
              data: {
                factors: [
                  {
                    id: "credit_age",
                    name: "Credit Age",
                    impact: "negative",
                    category: "credit_age",
                    status: "poor",
                    value: "0.6 year average across your linked accounts",
                    description: "Your accounts are new.",
                    percentImpact: 15,
                  },
                  {
                    id: "credit_mix",
                    name: "Credit Mix",
                    impact: "neutral",
                    category: "credit_mix",
                    status: "fair",
                    value: "1 of 3 account types",
                    description: "You have one account type.",
                    percentImpact: 10,
                  },
                ],
                unavailable: [],
              },
            }),
          ),
      ),
    );

    render(<CreditFactorsPage />);

    await waitFor(() => {
      expect(screen.getByText(/2 factors need attention/i)).toBeInTheDocument();
    });
  });

  it("displays score range visualization with current score", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<CreditFactorsPage />);

    // Check that the score is displayed (should be visible immediately)
    expect(screen.getByText("742")).toBeInTheDocument();

    // Check that the score change is displayed
    expect(screen.getByText(/\+15 pts/i)).toBeInTheDocument();

    // Check that the score range label is displayed (appears in both badge and legend)
    const veryGoodElements = screen.getAllByText("Very Good");
    expect(veryGoodElements.length).toBeGreaterThan(0);
  });

  it("displays all score range segments", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<CreditFactorsPage />);

    // Check that all range labels are displayed in the legend
    const poorElements = screen.getAllByText("Poor");
    expect(poorElements.length).toBeGreaterThan(0);

    const fairElements = screen.getAllByText("Fair");
    expect(fairElements.length).toBeGreaterThan(0);

    const goodElements = screen.getAllByText("Good");
    expect(goodElements.length).toBeGreaterThan(0);

    const veryGoodElements = screen.getAllByText("Very Good");
    expect(veryGoodElements.length).toBeGreaterThan(0);

    const excellentElements = screen.getAllByText("Excellent");
    expect(excellentElements.length).toBeGreaterThan(0);

    // Check that range boundaries are displayed
    expect(screen.getByText("300")).toBeInTheDocument();
    expect(screen.getByText("850")).toBeInTheDocument();
  });

  it("displays score range description", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<CreditFactorsPage />);

    // Check that the description for "Very Good" range is displayed
    expect(
      screen.getByText(/above average - keep up the good work/i),
    ).toBeInTheDocument();
  });
});
