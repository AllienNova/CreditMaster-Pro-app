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

  it("respondToNudge calls api.post('/ai/nudges/respond', body) — not bare fetch", async () => {
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

    expect(mockApi.post).toHaveBeenCalledTimes(1);
    expect(mockApi.post.mock.calls[0][0]).toBe("/ai/nudges/respond");
    expect(mockApi.post.mock.calls[0][1]).toEqual({
      nudgeId: "n1",
      response: "dismissed",
    });
    expect(mockApi.post.mock.calls[0][0]).not.toContain("/api/");
  });
});
