import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminHealthPage from "../page";

/**
 * The page must render ONLY what the health API returns — no hardcoded
 * "operational". These tests assert fetch-on-mount, honest loading/error
 * states, and that an unconfigured service surfaces as `unknown`, never green.
 */

const mockFetch = global.fetch as jest.Mock;

// A real Response (not a plain object) — the global MSW interceptor calls
// `.clone()` on whatever fetch resolves to.
const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const SAMPLE = {
  status: "degraded",
  checkedAt: "2026-07-25T12:00:00.000Z",
  services: [
    { service: "Supabase", status: "healthy" },
    { service: "Stripe", status: "down", detail: "Invalid API Key" },
    { service: "AIML", status: "unknown", detail: "not configured" },
  ],
};

describe("AdminHealthPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("fetches /api/admin/health on mount and renders real per-service status", async () => {
    mockFetch.mockResolvedValue(jsonResponse(SAMPLE));

    render(<AdminHealthPage />);

    expect(screen.getByRole("status")).toHaveTextContent(/checking/i);

    await waitFor(() =>
      expect(screen.getByText("Supabase")).toBeInTheDocument(),
    );
    // MSW normalises fetch args into a Request, so read the URL off the call.
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArg = mockFetch.mock.calls[0][0];
    const calledUrl = typeof callArg === "string" ? callArg : callArg.url;
    expect(calledUrl).toBe("/api/admin/health");
    expect(screen.getByText("Stripe")).toBeInTheDocument();
    expect(screen.getByText("Invalid API Key")).toBeInTheDocument();
    expect(screen.getByText("not configured")).toBeInTheDocument();
    // Honest: an unconfigured service is shown as "unknown", not "operational".
    expect(screen.getByText("unknown")).toBeInTheDocument();
    expect(screen.queryByText(/operational/i)).not.toBeInTheDocument();
    expect(screen.getByText(/1\/3 services healthy/)).toBeInTheDocument();
  });

  it("shows an honest error state when the health API returns non-OK", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 500));

    render(<AdminHealthPage />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/unable to load system health/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/HTTP 500/)).toBeInTheDocument();
  });

  it("shows an error state when the fetch itself rejects", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));

    render(<AdminHealthPage />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );
    expect(screen.getByText(/network down/i)).toBeInTheDocument();
  });

  it("re-probes when 'Run Health Check' is clicked", async () => {
    mockFetch.mockResolvedValue(jsonResponse(SAMPLE));
    render(<AdminHealthPage />);
    await waitFor(() =>
      expect(screen.getByText("Supabase")).toBeInTheDocument(),
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("button", { name: /run health check/i }),
    );
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });

  it("recovers when 'Retry' is clicked after an error", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 500));
    render(<AdminHealthPage />);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );

    mockFetch.mockResolvedValueOnce(jsonResponse(SAMPLE));
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() =>
      expect(screen.getByText("Supabase")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
