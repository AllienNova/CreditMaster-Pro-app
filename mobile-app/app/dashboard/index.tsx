/**
 * Fynvita Dashboard Index - Redirects to main tabs dashboard
 */

import { Redirect } from 'expo-router';

export default function DashboardIndex() {
  return <Redirect href="/(tabs)" />;
}

