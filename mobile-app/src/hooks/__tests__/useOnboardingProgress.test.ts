/**
 * Onboarding progress persistence.
 *
 * The wizard did not use this hook at all. profile.tsx, goals.tsx and
 * connect.tsx each held their answers in local useState and wrote them
 * nowhere — nothing in the app imported useOnboardingProgress, and nothing
 * called userApi.getOnboardingStatus/updateOnboarding either. A backgrounded
 * app or a dropped session lost every field the user had typed and put them
 * back on step 1, because the server had no record that step 1 had happened.
 *
 * The tests below pin the two things the screens now depend on:
 *
 *  1. completeStep merges form data in the SAME state update that advances the
 *     step. Doing it as updateProgress(...) then completeStep(...) reads
 *     `progress` from one closure twice, so the second call overwrites the
 *     first with pre-update state and silently drops the user's answers.
 *  2. A failed server save still resolves and still writes to AsyncStorage, so
 *     an offline user keeps their answers and is not trapped in the wizard.
 */

import { renderHook, act, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useOnboardingProgress } from "../useOnboardingProgress";
import { api } from "../../services/api/client";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: (cb: (s: { isConnected: boolean }) => void) => {
    cb({ isConnected: true });
    return () => {};
  },
}));

jest.mock("../../services/api/client", () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const STORAGE_KEY = "@onboarding_progress";

function lastSavedBody() {
  const call = mockApi.post.mock.calls.at(-1);
  return call?.[1] as {
    current_step: number;
    completed_steps: number[];
    form_data: Record<string, unknown>;
  };
}

describe("useOnboardingProgress", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.setItem.mockResolvedValue(undefined);
    mockApi.get.mockResolvedValue({ success: true, data: null } as never);
    mockApi.post.mockResolvedValue({ success: true, data: {} } as never);
  });

  async function mount() {
    const view = renderHook(() => useOnboardingProgress());
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    return view;
  }

  it("starts at step 1 for a user with no saved progress", async () => {
    const { result } = await mount();
    expect(result.current.progress.current_step).toBe(1);
    expect(result.current.progress.completed_steps).toEqual([]);
  });

  it("restores saved progress from the server", async () => {
    mockApi.get.mockResolvedValue({
      success: true,
      data: {
        current_step: 3,
        completed_steps: [1, 2],
        form_data: { profile: { firstName: "Ada" } },
        last_updated: "2026-08-17T00:00:00Z",
      },
    } as never);

    const { result } = await mount();
    expect(result.current.progress.current_step).toBe(3);
    expect(result.current.progress.form_data).toEqual({
      profile: { firstName: "Ada" },
    });
  });

  describe("completeStep", () => {
    it("advances to the next step and records the one just finished", async () => {
      const { result } = await mount();

      await act(async () => {
        await result.current.completeStep(1);
      });

      expect(lastSavedBody().completed_steps).toEqual([1]);
      expect(lastSavedBody().current_step).toBe(2);
    });

    it("saves the form data passed with it", async () => {
      const { result } = await mount();

      await act(async () => {
        await result.current.completeStep(1, {
          profile: { firstName: "Ada", lastName: "Lovelace" },
        });
      });

      expect(lastSavedBody().form_data).toEqual({
        profile: { firstName: "Ada", lastName: "Lovelace" },
      });
    });

    it("MERGES with earlier answers instead of replacing them", async () => {
      // The regression that matters: step 2 must not wipe step 1's answers.
      const { result } = await mount();

      await act(async () => {
        await result.current.completeStep(1, { profile: { firstName: "Ada" } });
      });
      await act(async () => {
        await result.current.completeStep(2, { goals: ["improve_score"] });
      });

      expect(lastSavedBody().form_data).toEqual({
        profile: { firstName: "Ada" },
        goals: ["improve_score"],
      });
      expect(lastSavedBody().completed_steps).toEqual([1, 2]);
      expect(lastSavedBody().current_step).toBe(3);
    });

    it("does not record the same step twice", async () => {
      const { result } = await mount();

      await act(async () => {
        await result.current.completeStep(1);
      });
      await act(async () => {
        await result.current.completeStep(1);
      });

      expect(lastSavedBody().completed_steps).toEqual([1]);
    });

    it("never advances past the last step the server accepts", async () => {
      // onboarding_progress CHECKs current_step BETWEEN 1 AND 5, so completing
      // step 5 must clamp rather than send 6 and be rejected.
      const { result } = await mount();

      await act(async () => {
        await result.current.completeStep(5);
      });

      expect(lastSavedBody().current_step).toBe(5);
    });

    it("keeps the answers locally when the server save fails", async () => {
      mockApi.post.mockResolvedValue({
        success: false,
        error: { message: "offline" },
      } as never);

      const { result } = await mount();

      let saved: boolean | undefined;
      await act(async () => {
        saved = await result.current.completeStep(1, {
          profile: { firstName: "Ada" },
        });
      });

      expect(saved).toBe(false);
      // AsyncStorage is written before the network call, so the answers survive
      // and the caller can still navigate on.
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining("Ada"),
      );
    });
  });
});
