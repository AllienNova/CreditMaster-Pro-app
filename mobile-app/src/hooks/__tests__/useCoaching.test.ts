/**
 * useCoaching — authenticated API calls + migrated-path coverage
 * (TASK-MOB-W7-07 review fix / FND-071 test-gap)
 *
 * The spec required a coaching-hook test. Its original purpose — the hook must
 * route through the authed api client and never call bare fetch — is preserved
 * below.
 *
 * WHAT CHANGED AND WHY. This file used to assert that fetchSessions called
 * `/ai/coaching/sessions` and sendMessage called `/ai/coaching/chat`. Neither
 * route has ever existed, so both requests 404'd on every run. One test
 * ("fetchSessions falls back to mock data on API failure") pinned that as
 * correct behaviour, and the chat's fallback — getCoachResponse() — checked the
 * user's message for "budget", "save" or "credit" and returned one of five
 * hardcoded paragraphs. Since the request always failed, that WAS the coach:
 * no model was ever consulted for any reply any user received.
 *
 * Now:
 *  - the session catalogue is product content read locally, so no request is
 *    made for it at all;
 *  - the chat posts to /ai/financial-coach/advice, which is real,
 *    authenticated, rate-limited and backed by ModelRouter;
 *  - a failed request produces an error, never a fabricated reply.
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

const ADVICE = {
  success: true,
  data: {
    data: {
      answer: "Track every dollar for one month before changing anything.",
      actionSteps: ["Export last month's transactions"],
      encouragement: "You are already ahead by asking.",
    },
  },
};

describe("useCoaching — authenticated API calls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("the session catalogue", () => {
    it("loads without a request, because it is product content not user data", async () => {
      const { result } = renderHook(() => useCoaching());

      await waitFor(() => {
        expect(result.current.sessions.length).toBeGreaterThan(0);
      });

      // It used to GET /ai/coaching/sessions — a 404 — and then use this same
      // local array as a "fallback".
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it("never calls bare fetch", async () => {
      const { result } = renderHook(() => useCoaching());
      await waitFor(() => {
        expect(result.current.sessions.length).toBeGreaterThan(0);
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("sendMessage", () => {
    it("posts the question to the real coach endpoint, not bare fetch", async () => {
      mockApi.post.mockResolvedValueOnce(ADVICE);

      const { result } = renderHook(() => useCoaching());
      await act(async () => {
        await result.current.sendMessage("How do I start budgeting?");
      });

      expect(mockApi.post).toHaveBeenCalledTimes(1);
      expect(mockApi.post.mock.calls[0][0]).toBe("/ai/financial-coach/advice");
      // The client's base URL already supplies /api.
      expect(mockApi.post.mock.calls[0][0]).not.toContain("/api/");
      expect(mockApi.post.mock.calls[0][1]).toMatchObject({
        question: "How do I start budgeting?",
      });

      const fetchCalls = (mockFetch.mock.calls as unknown[][]).filter(
        (c) => typeof c[0] === "string" && (c[0] as string).includes("coach"),
      );
      expect(fetchCalls).toHaveLength(0);
    });

    it("renders the model's answer, its steps and its encouragement", async () => {
      mockApi.post.mockResolvedValueOnce(ADVICE);

      const { result } = renderHook(() => useCoaching());
      await act(async () => {
        await result.current.sendMessage("How do I start budgeting?");
      });

      const last = result.current.messages[result.current.messages.length - 1];
      expect(last.role).toBe("coach");
      expect(last.content).toContain("Track every dollar");
      expect(last.content).toContain("1. Export last month's transactions");
      expect(last.content).toContain("You are already ahead");
    });

    it("does NOT fabricate a reply when the request fails", async () => {
      // The regression that matters. getCoachResponse returned a paragraph
      // about the 50/30/20 rule for anything containing "budget", and it ran on
      // every failure — which was every request.
      mockApi.post.mockResolvedValueOnce({
        success: false,
        error: { message: "upstream down" },
      });

      const { result } = renderHook(() => useCoaching());
      const before = result.current.messages.length;

      await act(async () => {
        await result.current.sendMessage("How do I start budgeting?");
      });

      // The user's own message is added; no coach reply follows it.
      const messages = result.current.messages;
      expect(messages).toHaveLength(before + 1);
      expect(messages[messages.length - 1].role).toBe("user");
      expect(JSON.stringify(messages)).not.toMatch(/50\/30\/20/);
      expect(result.current.error).toBeTruthy();
    });

    it("does not fabricate a reply when the server answers with nothing usable", async () => {
      mockApi.post.mockResolvedValueOnce({
        success: true,
        data: { data: { answer: "" } },
      });

      const { result } = renderHook(() => useCoaching());
      await act(async () => {
        await result.current.sendMessage("How do I start budgeting?");
      });

      const messages = result.current.messages;
      expect(messages[messages.length - 1].role).toBe("user");
      expect(result.current.error).toBeTruthy();
    });

    it("answers a too-short message itself instead of sending a doomed request", async () => {
      // The advice endpoint requires 10-500 characters and returns a 400 with a
      // Zod issue list, which the chat would have shown as a failed reply.
      const { result } = renderHook(() => useCoaching());
      await act(async () => {
        await result.current.sendMessage("ok");
      });

      expect(mockApi.post).not.toHaveBeenCalled();
      const last = result.current.messages[result.current.messages.length - 1];
      expect(last.role).toBe("coach");
      expect(last.content).toMatch(/at least 10/i);
    });
  });
});
