/**
 * Unit tests for the getRiskLevel helper (TASK-INV coverage)
 * Covers the null-safe Sharpe-ratio classification added by INV-3.
 */

import { getRiskLevel } from "../risk-level";

describe("getRiskLevel", () => {
  it("returns N/A for null sharpe ratio", () => {
    const result = getRiskLevel(null);
    expect(result.level).toBe("N/A");
    expect(result.color).toBe("text-gray-500");
    expect(result.bgColor).toBe("bg-gray-100");
  });

  it("returns Low Risk when sharpe >= 2", () => {
    const result = getRiskLevel(2);
    expect(result.level).toBe("Low Risk");
    expect(result.color).toBe("text-green-600");
    expect(result.bgColor).toBe("bg-green-100");
  });

  it("returns Low Risk when sharpe > 2", () => {
    const result = getRiskLevel(3.5);
    expect(result.level).toBe("Low Risk");
  });

  it("returns Moderate Risk when 1 <= sharpe < 2", () => {
    const result = getRiskLevel(1.5);
    expect(result.level).toBe("Moderate Risk");
    expect(result.color).toBe("text-yellow-600");
    expect(result.bgColor).toBe("bg-yellow-100");
  });

  it("returns Moderate Risk at exactly sharpe = 1", () => {
    const result = getRiskLevel(1);
    expect(result.level).toBe("Moderate Risk");
  });

  it("returns High Risk when 0 <= sharpe < 1", () => {
    const result = getRiskLevel(0.5);
    expect(result.level).toBe("High Risk");
    expect(result.color).toBe("text-orange-600");
    expect(result.bgColor).toBe("bg-orange-100");
  });

  it("returns High Risk at exactly sharpe = 0", () => {
    const result = getRiskLevel(0);
    expect(result.level).toBe("High Risk");
  });

  it("returns Very High Risk when sharpe < 0", () => {
    const result = getRiskLevel(-0.5);
    expect(result.level).toBe("Very High Risk");
    expect(result.color).toBe("text-red-600");
    expect(result.bgColor).toBe("bg-red-100");
  });
});
