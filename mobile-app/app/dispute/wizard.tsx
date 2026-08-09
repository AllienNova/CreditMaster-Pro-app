import { Redirect } from "expo-router";

/**
 * Dispute Wizard - entry point that routes to the create screen.
 *
 * The create screen implements the full 6-step wizard flow:
 * 1. Bureau selection
 * 2. Dispute type
 * 3. Item selection
 * 4. Message customization (with AI assist)
 * 5. Review & submit
 * 6. Confirmation
 *
 * This route exists for backwards compatibility with navigation links
 * that reference /dispute/wizard.
 */
export default function DisputeWizard() {
  return <Redirect href="/dispute/create" />;
}
