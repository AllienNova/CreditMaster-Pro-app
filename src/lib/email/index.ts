export {
  sendWelcomeEmail,
  sendDisputeStatusEmail,
  sendScoreChangeEmail,
  sendPaymentReceiptEmail,
} from "./email-service";

export { default as BillReminderTemplate } from "./templates/BillReminderTemplate";
export type { BillReminderTemplateProps } from "./templates/BillReminderTemplate";

export { default as WeeklyDigestTemplate } from "./templates/WeeklyDigestTemplate";
export type {
  WeeklyDigestTemplateProps,
  BudgetCategory,
} from "./templates/WeeklyDigestTemplate";

export { default as TradingAlertTemplate } from "./templates/TradingAlertTemplate";
export type {
  TradingAlertTemplateProps,
  TradingAlertType,
  SignalDirection,
} from "./templates/TradingAlertTemplate";
