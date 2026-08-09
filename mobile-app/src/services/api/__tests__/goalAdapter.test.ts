/**
 * mapWebGoal — web -> mobile financial-goal adapter (PARITY-P1).
 *
 * The real web route (GET /api/financial/goals) returns a bare goals array whose
 * items carry `targetDate` (no `deadline`), no `userId`, and a wider GoalStatus
 * enum than the mobile FinancialGoal.status union. This adapter bridges them;
 * getting the status map wrong hides in-progress goals (goalStore filters on
 * status === "active"), and reading `data.goals` (absent) hides all of them.
 */

// Stub the module's side-effecting client import so financial.ts loads in
// isolation, while still driving api.get for the getAll wrapper tests.
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import { mapWebGoal, financialGoalsApi } from "../financial";

beforeEach(() => {
  jest.clearAllMocks();
});

const base = {
  id: "g1",
  name: "Emergency Fund",
  targetAmount: 20000,
  currentAmount: 15000,
};

describe("mapWebGoal", () => {
  it("maps targetDate -> deadline + targetDate and preserves core fields", () => {
    const m = mapWebGoal({
      ...base,
      targetDate: "2026-08-01T00:00:00.000Z",
      status: "in_progress",
    });
    expect(m.id).toBe("g1");
    expect(m.name).toBe("Emergency Fund");
    expect(m.targetAmount).toBe(20000);
    expect(m.currentAmount).toBe(15000);
    expect(m.deadline).toBe("2026-08-01T00:00:00.000Z");
    expect(m.targetDate).toBe("2026-08-01T00:00:00.000Z");
  });

  it("falls back to the web `deadline` when `targetDate` is absent", () => {
    const m = mapWebGoal({ ...base, deadline: "2027-01-01T00:00:00.000Z" });
    expect(m.deadline).toBe("2027-01-01T00:00:00.000Z");
    expect(m.targetDate).toBe("2027-01-01T00:00:00.000Z");
  });

  it("defaults userId to an empty string when the web payload omits it", () => {
    expect(mapWebGoal({ ...base }).userId).toBe("");
    expect(mapWebGoal({ ...base, userId: "u9" }).userId).toBe("u9");
  });

  it("collapses the wider web GoalStatus enum onto the mobile union", () => {
    const s = (status: string) => mapWebGoal({ ...base, status }).status;
    expect(s("completed")).toBe("completed");
    expect(s("paused")).toBe("paused");
    expect(s("not_started")).toBe("active");
    expect(s("in_progress")).toBe("active");
    expect(s("on_track")).toBe("active");
    expect(s("behind")).toBe("active");
    expect(s("ahead")).toBe("active");
  });

  it("defaults status to 'active' for unknown/missing status", () => {
    expect(mapWebGoal({ ...base, status: "brand_new_status" }).status).toBe(
      "active",
    );
    expect(mapWebGoal({ ...base }).status).toBe("active");
  });

  it("maps the web GoalType onto the mobile GoalType", () => {
    const t = (type: string) => mapWebGoal({ ...base, type }).type;
    expect(t("emergency_fund")).toBe("emergency_fund");
    expect(t("debt_payoff")).toBe("debt_payoff");
    expect(t("home_down_payment")).toBe("home");
    expect(t("major_purchase")).toBe("other");
    expect(t("custom")).toBe("other");
    expect(t("brand_new_type")).toBe("other");
  });

  it("leaves type undefined when the web payload omits it", () => {
    expect(mapWebGoal({ ...base }).type).toBeUndefined();
  });
});

describe("financialGoalsApi.getAll", () => {
  it("adapts the bare web goals array into { goals } of the mobile shape", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: [
        {
          id: "g1",
          name: "Emergency Fund",
          targetAmount: 20000,
          currentAmount: 15000,
          targetDate: "2026-08-01T00:00:00.000Z",
          status: "on_track",
        },
      ],
    });

    const res = await financialGoalsApi.getAll();

    expect(mockApiGet).toHaveBeenCalledWith("/financial/goals");
    expect(res.success).toBe(true);
    expect(res.data?.goals).toHaveLength(1);
    expect(res.data?.goals[0]).toMatchObject({
      id: "g1",
      userId: "",
      deadline: "2026-08-01T00:00:00.000Z",
      status: "active",
    });
  });

  it("returns empty goals when the payload is not an array", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: { goals: [] } });
    const res = await financialGoalsApi.getAll();
    expect(res.success).toBe(true);
    expect(res.data?.goals).toEqual([]);
  });

  it("passes through a failed request without fabricating data", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_500", message: "boom" },
    });
    const res = await financialGoalsApi.getAll();
    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("boom");
  });
});
