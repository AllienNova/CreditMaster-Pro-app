import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import TradelinesPage from "../page";

// Minimal fetch Response test double (no `any`).
function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as unknown as Response;
}

const fetchMock = jest.fn();

describe("TradelinesPage — honest empty/error states (no mock fallback)", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders real tradeline data when the fetch succeeds", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        success: true,
        data: [
          {
            id: "t-real-1",
            providerId: "prov-real-1",
            creditLimit: 40000,
            ageMonths: 72,
            utilization: 6,
            price: 799,
            estimatedScoreImpact: 42,
            bureausReporting: ["Experian", "Equifax"],
            available: true,
            provider: { name: "Real Provider Co", rating: 4.8, verified: true },
          },
        ],
      }),
    );

    render(<TradelinesPage />);

    await waitFor(() => {
      expect(screen.getByText("Real Provider Co")).toBeInTheDocument();
    });
    expect(screen.getByText(/Showing 1 tradeline/i)).toBeInTheDocument();
    // The deleted mock fallback rows must never appear.
    expect(screen.queryByText("Provider p1")).not.toBeInTheDocument();
    expect(screen.queryByText("Provider p2")).not.toBeInTheDocument();
  });

  it("renders the empty state (and no fabricated rows) when the API returns no tradelines", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: [] }));

    render(<TradelinesPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No tradelines match your filters"),
      ).toBeInTheDocument();
    });
    // Deleted mock fallback must not render on an empty response.
    expect(screen.queryByText("Provider p1")).not.toBeInTheDocument();
    expect(screen.queryByText("Provider p2")).not.toBeInTheDocument();
    // An empty response is not an error.
    expect(
      screen.queryByText("Couldn't load tradelines. Please try again."),
    ).not.toBeInTheDocument();
  });

  it("renders an honest error state (and no fabricated rows) when the API responds not-ok", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: false, error: "boom" }, false),
    );

    render(<TradelinesPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't load tradelines. Please try again."),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    // No fabricated fallback rows on failure.
    expect(screen.queryByText("Provider p1")).not.toBeInTheDocument();
    expect(screen.queryByText("Provider p2")).not.toBeInTheDocument();
  });

  it("renders the error state (and no fabricated rows) when the API returns success:false", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, error: "nope" }));

    render(<TradelinesPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't load tradelines. Please try again."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Provider p1")).not.toBeInTheDocument();
  });

  it("renders the error state when the fetch rejects (network failure)", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    render(<TradelinesPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't load tradelines. Please try again."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Provider p1")).not.toBeInTheDocument();
  });
});
