/**
 * Fynvita Stock Analysis Screen - Redirect
 *
 * This file redirects to the canonical stock analysis location at /investments/analyze/[symbol]
 * Kept for backwards compatibility with existing deep links.
 */

import { useLocalSearchParams, Redirect } from "expo-router";

export default function StockAnalysisRedirect() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();

  // Redirect to the canonical location
  return <Redirect href={`/investments/analyze/${symbol || "AAPL"}`} />;
}
