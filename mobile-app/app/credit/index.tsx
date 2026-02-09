/**
 * Fynvita Credit Score Index - Redirects to tab
 */

import { Redirect } from 'expo-router';

export default function CreditIndex() {
  return <Redirect href="/(tabs)/credit" />;
}

