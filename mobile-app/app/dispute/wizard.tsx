import { Redirect } from 'expo-router';

/**
 * Dispute Wizard - redirects to the create screen
 *
 * The create screen already implements a multi-step wizard flow.
 * This route exists for backwards compatibility with navigation links
 * that reference /dispute/wizard.
 */
export default function DisputeWizard() {
  return <Redirect href="/dispute/create" />;
}
