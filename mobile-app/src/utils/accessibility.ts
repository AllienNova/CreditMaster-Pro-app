/**
 * Fynvita Accessibility Utilities
 * Provides accessibility helpers for screen readers and assistive technologies
 */

import { AccessibilityInfo, Platform } from "react-native";

/**
 * Accessibility labels for common UI elements
 */
export const accessibilityLabels = {
  // Navigation
  homeTab: "Home tab, double tap to navigate",
  creditTab: "Credit tab, double tap to view credit scores",
  financialTab: "Financial tab, double tap to view finances",
  profileTab: "Profile tab, double tap to view settings",

  // Credit Score
  creditScoreCard: (score: number, change: number) =>
    `Credit score ${score}, ${change >= 0 ? "up" : "down"} ${Math.abs(change)} points`,
  bureauScore: (bureau: string, score: number) =>
    `${bureau} credit score: ${score}`,

  // Disputes
  disputeItem: (status: string, bureau: string, date: string) =>
    `Dispute with ${bureau}, status: ${status}, created ${date}`,
  createDisputeButton: "Create new dispute, double tap to start",

  // Financial
  accountBalance: (name: string, balance: number) =>
    `${name} account, balance: $${balance.toLocaleString()}`,
  transactionItem: (merchant: string, amount: number, category: string) =>
    `${merchant}, ${amount < 0 ? "spent" : "received"} $${Math.abs(amount).toFixed(2)}, category: ${category}`,

  // Goals
  goalProgress: (name: string, current: number, target: number) =>
    `${name} goal, $${current.toLocaleString()} of $${target.toLocaleString()}, ${Math.round((current / target) * 100)}% complete`,

  // Buttons
  refreshButton: "Refresh data, double tap to reload",
  backButton: "Go back, double tap to return to previous screen",
  closeButton: "Close, double tap to dismiss",
  submitButton: "Submit, double tap to confirm",
};

/**
 * Accessibility roles for semantic meaning
 */
export const accessibilityRoles = {
  button: "button" as const,
  link: "link" as const,
  header: "header" as const,
  image: "image" as const,
  text: "text" as const,
  adjustable: "adjustable" as const,
  alert: "alert" as const,
  checkbox: "checkbox" as const,
  combobox: "combobox" as const,
  menu: "menu" as const,
  menubar: "menubar" as const,
  menuitem: "menuitem" as const,
  progressbar: "progressbar" as const,
  radio: "radio" as const,
  radiogroup: "radiogroup" as const,
  scrollbar: "scrollbar" as const,
  search: "search" as const,
  spinbutton: "spinbutton" as const,
  summary: "summary" as const,
  switch: "switch" as const,
  tab: "tab" as const,
  tablist: "tablist" as const,
  timer: "timer" as const,
  toolbar: "toolbar" as const,
};

/**
 * Announce message to screen reader
 */
export const announceForAccessibility = (message: string) => {
  AccessibilityInfo.announceForAccessibility(message);
};

/**
 * Check if screen reader is enabled
 */
export const isScreenReaderEnabled = async (): Promise<boolean> => {
  return AccessibilityInfo.isScreenReaderEnabled();
};

/**
 * Check if reduce motion is enabled
 */
export const isReduceMotionEnabled = async (): Promise<boolean> => {
  return AccessibilityInfo.isReduceMotionEnabled();
};

/**
 * Get accessibility props for a touchable element
 */
export const getTouchableAccessibilityProps = (
  label: string,
  hint?: string,
  disabled?: boolean,
) => ({
  accessible: true,
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityRole: "button" as const,
  accessibilityState: { disabled },
});

/**
 * Get accessibility props for a header
 */
export const getHeaderAccessibilityProps = (title: string) => ({
  accessible: true,
  accessibilityLabel: title,
  accessibilityRole: "header" as const,
});

/**
 * Get accessibility props for a progress indicator
 */
export const getProgressAccessibilityProps = (
  label: string,
  value: number,
  max: number,
) => ({
  accessible: true,
  accessibilityLabel: `${label}, ${Math.round((value / max) * 100)}% complete`,
  accessibilityRole: "progressbar" as const,
  accessibilityValue: {
    min: 0,
    max,
    now: value,
  },
});

/**
 * Format currency for screen readers
 */
export const formatCurrencyForAccessibility = (amount: number): string => {
  const absAmount = Math.abs(amount);
  const dollars = Math.floor(absAmount);
  const cents = Math.round((absAmount - dollars) * 100);

  let result = "";
  if (amount < 0) result += "negative ";
  result += `${dollars} dollars`;
  if (cents > 0) result += ` and ${cents} cents`;

  return result;
};

/**
 * Format date for screen readers
 */
export const formatDateForAccessibility = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
