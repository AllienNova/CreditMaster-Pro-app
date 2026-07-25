/**
 * Fynvita Notifications Dashboard route (/dashboard/notifications).
 *
 * This route previously rendered a SECOND, mock-backed Notifications screen
 * (MOCK_NOTIFICATIONS + a setTimeout "load" + local mark-as-read that only
 * mutated component state, never the API). Its local Notification type also
 * invented `actionUrl`, `document_processed`, and `payment_reminder` fields
 * that do not exist in the real API model (src/services/api/types.ts), and its
 * "View details" link had no onPress — a dead no-op over fabricated data.
 *
 * It now re-exports the single real, store-backed Notifications screen
 * (app/notifications/index.tsx, wired to
 * useNotificationStore.fetchNotifications -> notificationApi.getAll via the
 * mapWebNotification adapter, with honest loading / error+retry / empty states)
 * so there is exactly one source of truth for notification data — mirroring
 * app/dashboard/documents.tsx.
 *
 * The /dashboard/notifications deep link continues to work and now shows real data.
 */
export { default } from "../notifications";
