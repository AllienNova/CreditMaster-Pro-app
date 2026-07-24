import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ServicesPage from "../page";

// Minimal fetch Response test double (no `any`).
function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as unknown as Response;
}

const fetchMock = jest.fn();

describe("ServicesPage — honest empty/error states (no mock fallback)", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("does not render fabricated providers while loading", () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));

    render(<ServicesPage />);

    expect(screen.getByText("Loading services...")).toBeInTheDocument();
    // State no longer initializes to mock data.
    expect(screen.queryByText("Lexington Law")).not.toBeInTheDocument();
    expect(screen.queryByText("Credit Saint")).not.toBeInTheDocument();
  });

  it("renders real provider data when the fetch succeeds", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        success: true,
        data: [
          {
            id: "p-real-1",
            name: "Real Repair LLC",
            rating: 4.9,
            reviewCount: 321,
            bbbRating: "A+",
            yearsInBusiness: 7,
            priceRange: "$59/mo",
            services: ["Disputes"],
            guarantee: "30-day money back",
            verified: true,
          },
        ],
      }),
    );

    render(<ServicesPage />);

    await waitFor(() => {
      expect(screen.getByText("Real Repair LLC")).toBeInTheDocument();
    });
    // The deleted mock fallback providers must never appear.
    expect(screen.queryByText("Lexington Law")).not.toBeInTheDocument();
    expect(screen.queryByText("Credit Saint")).not.toBeInTheDocument();
  });

  it("renders the empty state (and no fabricated providers) when the API returns none", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: [] }));

    render(<ServicesPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No credit repair services available right now."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Lexington Law")).not.toBeInTheDocument();
    // An empty response is not an error.
    expect(
      screen.queryByText("Couldn't load providers. Try again."),
    ).not.toBeInTheDocument();
  });

  it("renders an honest error state (and no fabricated providers) when the API responds not-ok", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: false, error: "boom" }, false),
    );

    render(<ServicesPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't load providers. Try again."),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    // No fabricated fallback providers on failure.
    expect(screen.queryByText("Lexington Law")).not.toBeInTheDocument();
    expect(screen.queryByText("Credit Saint")).not.toBeInTheDocument();
  });

  it("renders the error state (and no fabricated providers) when success:false", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, error: "nope" }));

    render(<ServicesPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't load providers. Try again."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Lexington Law")).not.toBeInTheDocument();
  });

  it("renders the error state when the fetch rejects (network failure)", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    render(<ServicesPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't load providers. Try again."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Lexington Law")).not.toBeInTheDocument();
  });
});
