/**
 * useNudges — authenticated API calls (TASK-MOB-W7-07 / FND-071)
 */

import { renderHook, act, waitFor } from "@testing-library/react-native";

// ── mock the authed client — functions defined INSIDE factory to survive hoisting ──
jest.mock("../../services/api/client", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { useNudges } from "../useNudges";

// Grab mock handles via require() — safe after hoisting completes
const { api: mockApi } = require("../../services/api/client");

describe("useNudges — authenticated API calls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetchNudges calls api.get('/ai/nudges') — not bare fetch", async () => {
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: { nudges: [] },
    });

    renderHook(() => useNudges());

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith("/ai/nudges");
    });

    expect(mockApi.get.mock.calls[0][0]).not.toContain("/api/");
  });

  it("respondToNudge posts to /ai/nudges with an `action` — not /respond, not bare fetch", async () => {
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: {
        nudges: [
          {
            id: "n1",
            nudgeType: "insight",
            title: "T",
            message: "M",
            priority: 1,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    });
    mockApi.post.mockResolvedValueOnce({ success: true, data: {} });

    const { result } = renderHook(() => useNudges());

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.respondToNudge("n1", "dismissed");
    });

    // POST /ai/nudges IS the record-response endpoint — its own docblock says
    // so. /ai/nudges/respond has never existed, and the server reads `action`,
    // not `response`, so the old call 404'd on every nudge anyone answered and
    // nothing was ever recorded. Both halves of that are pinned here.
    expect(mockApi.post).toHaveBeenCalledTimes(1);
    expect(mockApi.post.mock.calls[0][0]).toBe("/ai/nudges");
    expect(mockApi.post.mock.calls[0][1]).toEqual({
      nudgeId: "n1",
      action: "dismissed",
    });
    expect(mockApi.post.mock.calls[0][0]).not.toContain("/api/");
  });

  it("surfaces an error when the response could not be saved", async () => {
    // The nudge is removed from the list optimistically, so a swallowed
    // failure means it silently returns on the next launch with no record of
    // the answer. The old catch block was empty apart from a comment.
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: {
        nudges: [
          {
            id: "n1",
            nudgeType: "insight",
            title: "T",
            message: "M",
            priority: 1,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    });
    mockApi.post.mockResolvedValueOnce({
      success: false,
      error: { message: "not found" },
    });

    const { result } = renderHook(() => useNudges());
    await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.respondToNudge("n1", "dismissed");
    });

    expect(result.current.error).toBeTruthy();
  });
});

describe("useNudges — honest error handling (no mock fallback)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("populates real nudges sorted by priority with no error on success", async () => {
    const now = new Date().toISOString();
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: {
        nudges: [
          {
            id: "b",
            nudgeType: "reminder",
            title: "Second",
            message: "m",
            priority: 2,
            createdAt: now,
          },
          {
            id: "a",
            nudgeType: "insight",
            title: "First",
            message: "m",
            priority: 1,
            createdAt: now,
          },
        ],
      },
    });

    const { result } = renderHook(() => useNudges());

    await waitFor(() => {
      expect(result.current.nudges).toHaveLength(2);
    });

    expect(result.current.nudges.map((n) => n.title)).toEqual([
      "First",
      "Second",
    ]);
    expect(result.current.activeNudge?.title).toBe("First");
    expect(result.current.error).toBeNull();
  });

  it("surfaces an honest error (never mock nudges) when the API returns failure", async () => {
    mockApi.get.mockResolvedValueOnce({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    const { result } = renderHook(() => useNudges());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network down");
    expect(result.current.nudges).toEqual([]);
    expect(result.current.activeNudge).toBeNull();
    // The former MOCK_NUDGES fallback must be gone.
    expect(result.current.nudges.map((n) => n.title)).not.toContain(
      "🎉 Goal Achieved!",
    );
  });

  it("surfaces an honest error (never mock nudges) when the request throws", async () => {
    mockApi.get.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useNudges());

    await waitFor(() => {
      expect(result.current.error).toBe("boom");
    });

    expect(result.current.nudges).toEqual([]);
    expect(result.current.activeNudge).toBeNull();
  });
});
