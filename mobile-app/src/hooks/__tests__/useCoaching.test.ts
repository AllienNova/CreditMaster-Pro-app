/**
 * useCoaching — authenticated API calls + migrated-path coverage
 * (TASK-MOB-W7-07 review fix / FND-071 test-gap)
 *
 * The spec explicitly required a coaching-hook test.
 * Verifies that fetchSessions and sendMessage route through the authed api client.
 */

import { renderHook, act, waitFor } from "@testing-library/react-native";

// Mock the authed client — factory functions defined INSIDE to survive hoisting
jest.mock("../../services/api/client", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Guard: bare fetch must not be called
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { useCoaching } from "../useCoaching";

const { api: mockApi } = require("../../services/api/client");

describe("useCoaching — authenticated API calls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("fetchSessions calls api.get('/ai/coaching/sessions') — not bare fetch", async () => {
    const fakeSessions = [
      {
        id: "s1",
        topic: "budgeting",
        title: "Budget basics",
        summary: "Learn basics",
        steps: ["Step 1"],
        duration: "5 min",
        completed: false,
      },
    ];
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: { sessions: fakeSessions },
    });

    const { result } = renderHook(() => useCoaching());

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    expect(mockApi.get).toHaveBeenCalledWith("/ai/coaching/sessions");
    expect(mockApi.get.mock.calls[0][0]).not.toContain("/api/");

    // Sessions should be populated from the API response
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].id).toBe("s1");

    const fetchCalls = (mockFetch.mock.calls as unknown[][]).filter(
      (c) => typeof c[0] === "string" && (c[0] as string).includes("coaching"),
    );
    expect(fetchCalls).toHaveLength(0);
  });

  it("fetchSessions falls back to mock data on API failure", async () => {
    mockApi.get.mockResolvedValueOnce({
      success: false,
      message: "Service unavailable",
    });

    const { result } = renderHook(() => useCoaching());

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    // Should fall back to MOCK_SESSIONS (4 entries)
    expect(result.current.sessions.length).toBeGreaterThan(0);
  });

  it("sendMessage calls api.post('/ai/coaching/chat', body) — not bare fetch", async () => {
    // Initial fetchSessions
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: { sessions: [] },
    });
    // sendMessage response
    mockApi.post.mockResolvedValueOnce({
      success: true,
      data: {
        response: "Great question about budgeting!",
        suggestions: ["Tell me more", "Next step"],
      },
    });

    const { result } = renderHook(() => useCoaching());

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.sendMessage("How do I budget?");
    });

    expect(mockApi.post).toHaveBeenCalledTimes(1);
    expect(mockApi.post.mock.calls[0][0]).toBe("/ai/coaching/chat");
    expect(mockApi.post.mock.calls[0][0]).not.toContain("/api/");
    expect(mockApi.post.mock.calls[0][1]).toMatchObject({ message: "How do I budget?" });

    // The coach response should appear in messages
    const messages = result.current.messages;
    const coachReply = messages.find(
      (m) => m.role === "coach" && m.content === "Great question about budgeting!",
    );
    expect(coachReply).toBeDefined();

    const fetchCalls = (mockFetch.mock.calls as unknown[][]).filter(
      (c) => typeof c[0] === "string" && (c[0] as string).includes("coaching"),
    );
    expect(fetchCalls).toHaveLength(0);
  });
});
