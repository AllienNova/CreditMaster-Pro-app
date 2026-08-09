/**
 * Pure helper extracted from RiskGauge so it can be unit-tested independently.
 * Returns display metadata for a Sharpe-ratio-based risk classification.
 */
export function getRiskLevel(
  sharpe: number | null,
): { level: string; color: string; bgColor: string } {
  if (sharpe === null)
    return { level: "N/A", color: "text-gray-500", bgColor: "bg-gray-100" };
  if (sharpe >= 2)
    return {
      level: "Low Risk",
      color: "text-green-600",
      bgColor: "bg-green-100",
    };
  if (sharpe >= 1)
    return {
      level: "Moderate Risk",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    };
  if (sharpe >= 0)
    return {
      level: "High Risk",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    };
  return {
    level: "Very High Risk",
    color: "text-red-600",
    bgColor: "bg-red-100",
  };
}
