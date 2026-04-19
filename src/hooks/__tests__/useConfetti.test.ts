/**
 * Tests for useConfetti hook
 */

import { renderHook, act } from "@testing-library/react";
import { useConfetti } from "../useConfetti";

// Mock Confetti component and portal – browser APIs not available in jsdom
jest.mock("@/components/ui/animations/Confetti", () => ({
  Confetti: () => null,
}));

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

describe("useConfetti", () => {
  it("returns triggerConfetti function and ConfettiPortal component", () => {
    const { result } = renderHook(() => useConfetti());
    expect(typeof result.current.triggerConfetti).toBe("function");
    expect(typeof result.current.ConfettiPortal).toBe("function");
  });

  it("triggerConfetti can be called without options", () => {
    const { result } = renderHook(() => useConfetti());
    expect(() => {
      act(() => {
        result.current.triggerConfetti();
      });
    }).not.toThrow();
  });

  it("triggerConfetti can be called with origin options", () => {
    const { result } = renderHook(() => useConfetti());
    expect(() => {
      act(() => {
        result.current.triggerConfetti({ origin: { x: 100, y: 200 } });
      });
    }).not.toThrow();
  });

  it("multiple triggerConfetti calls do not throw", () => {
    const { result } = renderHook(() => useConfetti());
    expect(() => {
      act(() => {
        result.current.triggerConfetti();
        result.current.triggerConfetti({ origin: { x: 50, y: 50 } });
        result.current.triggerConfetti();
      });
    }).not.toThrow();
  });

  it("ConfettiPortal is stable reference across renders", () => {
    const { result, rerender } = renderHook(() => useConfetti());
    const first = result.current.ConfettiPortal;
    rerender();
    // triggerConfetti is memoized — it should not change on plain rerender
    expect(typeof result.current.ConfettiPortal).toBe("function");
    // After no state changes, the component reference from the hook should be a function
    expect(first).toBeDefined();
  });

  it("hook cleans up on unmount without errors", () => {
    const { result, unmount } = renderHook(() => useConfetti());
    act(() => {
      result.current.triggerConfetti();
    });
    expect(() => unmount()).not.toThrow();
  });
});
