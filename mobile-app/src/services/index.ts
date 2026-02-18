/**
 * Fynvita Services Index
 * Central export point for all services
 */

// API Services
export * from "./api";

// Notification Services
export * from "./notifications";

// Background Task Services
export * from "./background";

// Widget Services
export * from "./widgets";

// Haptic Feedback Services
export * from "./haptics";

// Biometric Authentication Services
export * from "./biometrics";

// Offline Sync Service
export { offlineSyncService, OfflineSyncService } from "./offline-sync";
export type {
  SyncQueueItem,
  SyncResult,
  SyncPriority,
  SyncOperationType,
  SyncEntity,
  ConflictStrategy,
  OfflineSyncConfig,
} from "./offline-sync";

// Legacy Services (to be deprecated)
export { supabase } from "./supabase";
