/**
 * Fynvita Bureau Connections Screen
 * Manage credit bureau connections and monitoring status
 */

import React from "react";
import { PlaceholderScreen } from "../../src/components";

export default function BureauConnectionsScreen() {
  return (
    <PlaceholderScreen
      title="Bureau Connections"
      description="Connect and manage your credit bureau accounts to enable real-time monitoring."
      icon="link-outline"
      estimatedRelease="Phase 1 - Week 2"
      features={[
        "Connect to Experian, Equifax, and TransUnion",
        "OAuth-based secure authentication",
        "View connection status for each bureau",
        "Enable/disable monitoring per bureau",
        "Reconnect expired connections",
        "View last sync timestamp",
      ]}
      relatedScreens={[
        { title: "Credit Monitoring Dashboard", route: "/monitoring" },
        { title: "Monitoring Settings", route: "/monitoring/settings" },
        { title: "Credit Score", route: "/(tabs)/credit" },
      ]}
    />
  );
}
