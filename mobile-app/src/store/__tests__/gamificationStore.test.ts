/**
 * Fynvita Gamification Store Unit Tests
 */

import { act } from "@testing-library/react-native";
import { useGamificationStore } from "../gamificationStore";

jest.mock("../../services/api/gamification", () => ({
  gamificationApi: {
    getProgress: jest.fn(),
    updateStreak: jest.fn(),
    getBadges: jest.fn(),
    awardBadge: jest.fn(),
    getQuests: jest.fn(),
    completeQuest: jest.fn(),
    getLeaderboard: jest.fn(),
  },
}));

jest.mock("../../data/dev-seed", () => ({
  seedGamificationProgress: null,
  seedBadgesResponse: { earned: [], inProgress: [], locked: [], stats: null },
  seedQuestsResponse: { today: [], completedToday: 0, totalToday: 0, availableXp: 0 },
  seedLeaderboard: { entries: [], type: "weekly_xp", periodStart: "", periodEnd: "", userRank: null, userPercentile: null },
}));

const { gamificationApi } = require("../../services/api/gamification");

const mockProgress = {
  xp: { current: 1500, toNextLevel: 2000 },
  level: { current: 5, title: "Budgeting Pro", progress: 75 },
  streak: { days: 12, multiplier: 1.5, longestStreak: 20 },
};

describe("Gamification Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGamificationStore.getState().resetStore();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useGamificationStore.getState();
      expect(state.progress).toBeNull();
      expect(state.earnedBadges).toEqual([]);
      expect(state.quests).toEqual([]);
      expect(state.leaderboard).toEqual([]);
    });
  });

  describe("fetchProgress", () => {
    it("should fetch progress successfully", async () => {
      gamificationApi.getProgress.mockResolvedValue({ success: true, data: mockProgress });

      await act(async () => {
        await useGamificationStore.getState().fetchProgress();
      });

      const state = useGamificationStore.getState();
      expect(state.progress).toEqual(mockProgress);
      expect(state.isLoadingProgress).toBe(false);
      expect(state.lastProgressFetch).not.toBeNull();
    });

    it("should set error on API failure", async () => {
      gamificationApi.getProgress.mockResolvedValue({
        success: false,
        error: { message: "Server error" },
      });

      await act(async () => {
        await useGamificationStore.getState().fetchProgress();
      });

      expect(useGamificationStore.getState().progressError).toBe("Server error");
    });

    it("should set error on thrown exception", async () => {
      gamificationApi.getProgress.mockRejectedValue(new Error("Network down"));

      await act(async () => {
        await useGamificationStore.getState().fetchProgress();
      });

      expect(useGamificationStore.getState().progressError).toBe("Network down");
    });
  });

  describe("fetchBadges", () => {
    it("should fetch badges successfully", async () => {
      const mockBadges = {
        earned: [{ id: "b-1", code: "first_budget", earnedAt: "2025-01-01" }],
        inProgress: [{ id: "b-2", code: "savings_starter", progress: 50 }],
        locked: [{ id: "b-3", code: "debt_free" }],
        stats: { totalEarned: 1, totalAvailable: 10, byCategory: {} },
      };
      gamificationApi.getBadges.mockResolvedValue({ success: true, data: mockBadges });

      await act(async () => {
        await useGamificationStore.getState().fetchBadges();
      });

      const state = useGamificationStore.getState();
      expect(state.earnedBadges).toHaveLength(1);
      expect(state.inProgressBadges).toHaveLength(1);
      expect(state.lockedBadges).toHaveLength(1);
    });

    it("should handle API failure", async () => {
      gamificationApi.getBadges.mockResolvedValue({
        success: false,
        error: { message: "Badge service down" },
      });

      await act(async () => {
        await useGamificationStore.getState().fetchBadges();
      });

      expect(useGamificationStore.getState().badgesError).toBe("Badge service down");
    });
  });

  describe("fetchQuests", () => {
    it("should fetch quests successfully", async () => {
      const mockQuests = {
        today: [{ questId: "q-1", title: "Check budget", isCompleted: false }],
        completedToday: 0,
        totalToday: 3,
        availableXp: 150,
      };
      gamificationApi.getQuests.mockResolvedValue({ success: true, data: mockQuests });

      await act(async () => {
        await useGamificationStore.getState().fetchQuests();
      });

      const state = useGamificationStore.getState();
      expect(state.quests).toHaveLength(1);
      expect(state.totalQuestsToday).toBe(3);
      expect(state.availableXp).toBe(150);
    });
  });

  describe("completeQuest", () => {
    it("should mark quest as completed and update counters", async () => {
      useGamificationStore.setState({
        quests: [{ questId: "q-1", title: "Check budget", isCompleted: false } as never],
        questsCompletedToday: 0,
        availableXp: 150,
        progress: mockProgress,
      });

      gamificationApi.completeQuest.mockResolvedValue({
        success: true,
        data: { success: true, xpEarned: 50 },
      });
      gamificationApi.getProgress.mockResolvedValue({ success: true, data: mockProgress });

      let result;
      await act(async () => {
        result = await useGamificationStore.getState().completeQuest("q-1");
      });

      expect(result).toEqual({ xpEarned: 50 });
      const state = useGamificationStore.getState();
      expect(state.questsCompletedToday).toBe(1);
      expect(state.quests[0].isCompleted).toBe(true);
    });

    it("should return null on failure", async () => {
      gamificationApi.completeQuest.mockRejectedValue(new Error("Fail"));

      let result;
      await act(async () => {
        result = await useGamificationStore.getState().completeQuest("q-1");
      });

      expect(result).toBeNull();
    });
  });

  describe("fetchLeaderboard", () => {
    it("should fetch leaderboard successfully", async () => {
      const mockLb = {
        entries: [{ userId: "u-1", username: "Alice", xp: 5000, rank: 1 }],
        type: "weekly_xp",
        periodStart: "2025-04-21",
        periodEnd: "2025-04-27",
        userRank: 5,
        userPercentile: 85,
      };
      gamificationApi.getLeaderboard.mockResolvedValue({ success: true, data: mockLb });

      await act(async () => {
        await useGamificationStore.getState().fetchLeaderboard("weekly_xp");
      });

      const state = useGamificationStore.getState();
      expect(state.leaderboard).toHaveLength(1);
      expect(state.userRank).toBe(5);
      expect(state.userPercentile).toBe(85);
    });
  });

  describe("clearErrors", () => {
    it("should clear all error fields", () => {
      useGamificationStore.setState({
        progressError: "e1",
        badgesError: "e2",
        questsError: "e3",
        leaderboardError: "e4",
      });
      useGamificationStore.getState().clearErrors();
      const s = useGamificationStore.getState();
      expect(s.progressError).toBeNull();
      expect(s.badgesError).toBeNull();
      expect(s.questsError).toBeNull();
      expect(s.leaderboardError).toBeNull();
    });
  });

  describe("resetStore", () => {
    it("should reset to initial state", () => {
      useGamificationStore.setState({ progress: mockProgress as never });
      useGamificationStore.getState().resetStore();
      expect(useGamificationStore.getState().progress).toBeNull();
    });
  });
});
