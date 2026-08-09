import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import GoodwillLettersPage from "../page";

// Mock Next.js Link
jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const okResponse = (data: unknown) => ({
  ok: true,
  json: async () => data,
  // A global test wrapper clones responses before the app reads them.
  clone: function () {
    return this;
  },
});

// Shape mirrors GET /api/credit-repair/goodwill -> { success, data: { letters } },
// letters being the DB `GoodwillLetter` rows serialized (Date columns -> ISO).
const realPayload = {
  success: true,
  data: {
    letters: [
      {
        id: "l1",
        creditorName: "Northgate Bank",
        accountNumber: "****1010",
        reason: "Requesting removal after a documented hardship",
        status: "approved",
        sentAt: "2025-12-15T00:00:00.000Z",
        outcome: "removed",
        createdAt: "2025-12-10T00:00:00.000Z",
      },
      {
        id: "l2",
        creditorName: "Riverside Credit Union",
        status: "sent",
        sentAt: "2026-01-05T00:00:00.000Z",
        createdAt: "2026-01-03T00:00:00.000Z",
      },
      {
        id: "l3",
        creditorName: "Summit Card Co",
        status: "denied",
        outcome: "denied",
        sentAt: "2026-01-10T00:00:00.000Z",
        createdAt: "2026-01-08T00:00:00.000Z",
      },
      {
        id: "l4",
        creditorName: "Harbor Finance",
        status: "draft",
        createdAt: "2026-01-18T00:00:00.000Z",
      },
    ],
  },
};

describe("GoodwillLettersPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Reassign after MSW's beforeAll(listen) has wrapped global.fetch with its
    // interceptor: this page's route has no MSW handler, and the interceptor's
    // passthrough normalizer chokes on a plain mock response. Overriding here
    // routes fetch straight to the mock so the page reads exactly what we return.
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it("shows an honest loading state before data resolves", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<GoodwillLettersPage />);

    expect(screen.getByTestId("goodwill-loading")).toBeInTheDocument();
    expect(screen.getByText(/loading goodwill letters/i)).toBeInTheDocument();
  });

  it("renders the user's real letters and never the former mock data", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(realPayload));

    render(<GoodwillLettersPage />);

    await waitFor(() => {
      expect(screen.getByText("Northgate Bank")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/credit-repair/goodwill");

    // Real letters render.
    expect(screen.getByText("Riverside Credit Union")).toBeInTheDocument();
    expect(screen.getByText("Summit Card Co")).toBeInTheDocument();
    expect(screen.getByText("Harbor Finance")).toBeInTheDocument();
    expect(
      screen.getByText("Requesting removal after a documented hardship"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Account: \*\*\*\*1010/)).toBeInTheDocument();

    // Mapped statuses render (approved -> successful, denied -> unsuccessful).
    expect(screen.getByText("successful")).toBeInTheDocument();
    expect(screen.getByText("unsuccessful")).toBeInTheDocument();

    // Success rate computed from real letters: 1 removed of 3 sent = 33%.
    expect(screen.getByText("33%")).toBeInTheDocument();

    // The former hardcoded mock letters are gone.
    expect(screen.queryByText("Chase Bank")).not.toBeInTheDocument();
    expect(screen.queryByText("Capital One")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Goodwill Request for Late Payment Removal"),
    ).not.toBeInTheDocument();
  });

  it("filters the list by mapped status", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(realPayload));

    render(<GoodwillLettersPage />);

    await waitFor(() => {
      expect(screen.getByText("Harbor Finance")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Successful" }));

    expect(screen.getByText("Northgate Bank")).toBeInTheDocument();
    expect(screen.queryByText("Harbor Finance")).not.toBeInTheDocument();
    expect(screen.queryByText("Riverside Credit Union")).not.toBeInTheDocument();
  });

  it("shows the empty state when the user has no letters", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ success: true, data: {} }));

    render(<GoodwillLettersPage />);

    await waitFor(() => {
      expect(screen.getByText("No Letters Found")).toBeInTheDocument();
    });

    expect(screen.queryByText("Chase Bank")).not.toBeInTheDocument();
  });

  it("surfaces the server error message and retries on demand", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse({ success: false, error: "Server exploded" }),
    );

    render(<GoodwillLettersPage />);

    await waitFor(() => {
      expect(screen.getByTestId("goodwill-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Server exploded")).toBeInTheDocument();

    // Retry succeeds -> real data renders.
    mockFetch.mockResolvedValueOnce(okResponse(realPayload));
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByText("Northgate Bank")).toBeInTheDocument();
    });
  });

  it("falls back to a default message when the failure carries no error text", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ success: false }));

    render(<GoodwillLettersPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load goodwill letters"),
      ).toBeInTheDocument();
    });
  });

  it("handles a non-Error rejection with a generic message", async () => {
    mockFetch.mockRejectedValueOnce("network down");

    render(<GoodwillLettersPage />);

    await waitFor(() => {
      expect(screen.getByText("An error occurred")).toBeInTheDocument();
    });
  });
});
