/**
 * Fynvita Credit Monitoring Dashboard Screen
 * Main dashboard for credit monitoring features
 */

import React from 'react';
import { PlaceholderScreen } from '../../src/components';

export default function CreditMonitoringScreen() {
  return (
    <PlaceholderScreen
      title="Credit Monitoring"
      description="Monitor your credit reports from all three bureaus and receive instant alerts for any changes."
      icon="shield-checkmark-outline"
      estimatedRelease="Phase 1 - Week 2"
      features={[
        'Real-time credit monitoring across all 3 bureaus',
        'Instant alerts for new accounts, inquiries, and changes',
        'Dark web monitoring for exposed credentials',
        'Identity theft protection and insurance',
        'Customizable alert preferences',
        'Bureau connection management',
      ]}
      relatedScreens={[
        { title: 'View Alerts', route: '/monitoring/alerts' },
        { title: 'Monitoring Settings', route: '/monitoring/settings' },
        { title: 'Credit Score Dashboard', route: '/(tabs)/credit' },
        { title: 'Identity Protection', route: '/identity' },
      ]}
    />
  );
}
