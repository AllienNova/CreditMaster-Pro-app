/**
 * Fynvita Financial Index - Redirects to tab
 */

import { Redirect } from "expo-router";

export default function FinancialIndex() {
  return <Redirect href="/(tabs)/financial" />;
}
