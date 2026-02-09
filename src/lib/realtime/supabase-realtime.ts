/**
 * Supabase Realtime Service
 * 
 * Provides real-time subscriptions for dashboard updates
 */

import { createBrowserClient } from '@supabase/ssr';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Types
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface RealtimeSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

export interface RealtimeConfig {
  table: string;
  schema?: string;
  event?: RealtimeEvent;
  filter?: string;
}

export interface DisputeData {
  id: string;
  user_id: string;
  status: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationData {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface CreditScoreData {
  id: string;
  user_id: string;
  score: number;
  updated_at: string;
}

// Create browser client
function getSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Subscribe to table changes
 */
export function subscribeToTable<T extends Record<string, any>>(
  config: RealtimeConfig,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void
): RealtimeSubscription {
  const supabase = getSupabaseClient();

  const channelConfig = {
    event: config.event || '*',
    schema: config.schema || 'public',
    table: config.table,
    filter: config.filter
  } as const;

  const channel = supabase
    .channel(`${config.table}-changes`)
    .on(
      'postgres_changes' as any,
      channelConfig,
      callback as any
    )
    .subscribe();

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel);
    }
  };
}

/**
 * Subscribe to user-specific changes
 */
export function subscribeToUserChanges<T extends Record<string, any>>(
  userId: string,
  table: string,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void
): RealtimeSubscription {
  return subscribeToTable<T>(
    {
      table,
      filter: `user_id=eq.${userId}`
    },
    callback
  );
}

/**
 * Subscribe to credit score changes
 */
export function subscribeToCreditScores(
  userId: string,
  onUpdate: (score: number, change: number) => void
): RealtimeSubscription {
  return subscribeToUserChanges(
    userId,
    'credit_scores',
    (payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const newScore = (payload.new as any).score;
        const oldScore = (payload.old as any)?.score || newScore;
        onUpdate(newScore, newScore - oldScore);
      }
    }
  );
}

/**
 * Subscribe to dispute status changes
 */
export function subscribeToDisputes(
  userId: string,
  onUpdate: (dispute: DisputeData, eventType: string) => void
): RealtimeSubscription {
  return subscribeToUserChanges(
    userId,
    'disputes',
    (payload) => {
      onUpdate((payload.new || payload.old) as DisputeData, payload.eventType);
    }
  );
}

/**
 * Subscribe to notification updates
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: NotificationData) => void
): RealtimeSubscription {
  return subscribeToUserChanges(
    userId,
    'notifications',
    (payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        onNotification(payload.new as NotificationData);
      }
    }
  );
}

/**
 * Subscribe to multiple tables at once
 */
export function subscribeToMultiple<T extends Record<string, unknown>>(
  subscriptions: Array<{
    config: RealtimeConfig;
    callback: (payload: RealtimePostgresChangesPayload<T>) => void;
  }>
): { unsubscribeAll: () => void } {
  const subs = subscriptions.map(({ config, callback }) =>
    subscribeToTable(config, callback)
  );

  return {
    unsubscribeAll: () => {
      subs.forEach(sub => sub.unsubscribe());
    }
  };
}

/**
 * Presence tracking for active users
 */
export function trackPresence(
  roomId: string,
  userId: string,
  userInfo: Record<string, any>
): RealtimeSubscription {
  const supabase = getSupabaseClient();
  
  const channel = supabase.channel(roomId, {
    config: { presence: { key: userId } }
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const _state = channel.presenceState();
      // SupabaseRealtime: Presence state synced
      void _state;
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(userInfo);
      }
    });

  return {
    channel,
    unsubscribe: () => {
      channel.untrack();
      supabase.removeChannel(channel);
    }
  };
}

