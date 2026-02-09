/**
 * Fynvita Services Index
 * Central export point for all services
 */

// API Services
export * from './api';

// Notification Services
export * from './notifications';

// Background Task Services
export * from './background';

// Widget Services
export * from './widgets';

// Haptic Feedback Services
export * from './haptics';

// Biometric Authentication Services
export * from './biometrics';

// Legacy Services (to be deprecated)
export { supabase } from './supabase';
