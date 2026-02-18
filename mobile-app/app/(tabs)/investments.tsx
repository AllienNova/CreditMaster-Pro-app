/**
 * Investments Tab Entry Point
 * Redirects to the investments stack navigator
 */

import { Redirect } from "expo-router";

export default function InvestmentsTab() {
  return <Redirect href="/investments" />;
}
