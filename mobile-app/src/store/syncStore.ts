/**
 * CPFI Sync Store
 * Manages offline sync queue, connectivity status, and data synchronization
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { processOfflineQueue } from '../services/api';

interface PendingAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'dispute' | 'budget' | 'goal' | 'transaction' | 'document';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

interface SyncState {
  // Connectivity
  isOnline: boolean;
  connectionType: string | null;
  lastOnlineAt: string | null;
  
  // Sync status
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  
  // Pending actions
  pendingActions: PendingAction[];
  failedActions: PendingAction[];
  
  // Actions - Connectivity
  setOnlineStatus: (isOnline: boolean, connectionType?: string) => void;
  initializeNetworkListener: () => () => void;
  
  // Actions - Sync
  syncAll: () => Promise<{ success: number; failed: number }>;
  addPendingAction: (action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>) => void;
  removePendingAction: (actionId: string) => void;
  retryFailedActions: () => Promise<void>;
  clearFailedActions: () => void;
  
  // Actions - Utility
  clearSyncError: () => void;
  resetStore: () => void;
}

const initialState = {
  isOnline: true,
  connectionType: null,
  lastOnlineAt: null,
  isSyncing: false,
  lastSyncAt: null,
  syncError: null,
  pendingActions: [],
  failedActions: [],
};

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setOnlineStatus: (isOnline, connectionType) => {
        set((state) => ({
          isOnline,
          connectionType: connectionType || state.connectionType,
          lastOnlineAt: isOnline ? new Date().toISOString() : state.lastOnlineAt,
        }));
        
        // Auto-sync when coming back online
        if (isOnline && get().pendingActions.length > 0) {
          get().syncAll();
        }
      },

      initializeNetworkListener: () => {
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
          get().setOnlineStatus(
            state.isConnected ?? false,
            state.type
          );
        });
        
        // Get initial state
        NetInfo.fetch().then((state: NetInfoState) => {
          get().setOnlineStatus(
            state.isConnected ?? false,
            state.type
          );
        });
        
        return unsubscribe;
      },

      syncAll: async () => {
        const { isOnline, pendingActions } = get();
        
        if (!isOnline) {
          set({ syncError: 'No internet connection' });
          return { success: 0, failed: 0 };
        }
        
        if (pendingActions.length === 0) {
          return { success: 0, failed: 0 };
        }
        
        set({ isSyncing: true, syncError: null });
        
        try {
          // Process API offline queue first
          const apiResult = await processOfflineQueue();
          
          // Process local pending actions
          let success = apiResult.processed;
          let failed = apiResult.failed;
          
          const remainingActions: PendingAction[] = [];
          const newFailedActions: PendingAction[] = [];
          
          for (const action of pendingActions) {
            try {
              // Process each action based on type and entity
              const processed = await processAction(action);
              if (processed) {
                success++;
              } else {
                if (action.retryCount < 3) {
                  remainingActions.push({ ...action, retryCount: action.retryCount + 1 });
                } else {
                  newFailedActions.push(action);
                  failed++;
                }
              }
            } catch {
              if (action.retryCount < 3) {
                remainingActions.push({ ...action, retryCount: action.retryCount + 1 });
              } else {
                newFailedActions.push(action);
                failed++;
              }
            }
          }
          
          set((state) => ({
            pendingActions: remainingActions,
            failedActions: [...state.failedActions, ...newFailedActions],
            lastSyncAt: new Date().toISOString(),
            isSyncing: false,
          }));
          
          return { success, failed };
        } catch (error) {
          set({ 
            syncError: error instanceof Error ? error.message : 'Sync failed',
            isSyncing: false 
          });
          return { success: 0, failed: pendingActions.length };
        }
      },

      addPendingAction: (action) => {
        const newAction: PendingAction = {
          ...action,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          retryCount: 0,
        };
        
        set((state) => ({
          pendingActions: [...state.pendingActions, newAction],
        }));
        
        // Try to sync immediately if online
        if (get().isOnline) {
          get().syncAll();
        }
      },

      removePendingAction: (actionId) => {
        set((state) => ({
          pendingActions: state.pendingActions.filter(a => a.id !== actionId),
        }));
      },

      retryFailedActions: async () => {
        const { failedActions } = get();
        
        // Move failed actions back to pending with reset retry count
        set((state) => ({
          pendingActions: [
            ...state.pendingActions,
            ...failedActions.map(a => ({ ...a, retryCount: 0 })),
          ],
          failedActions: [],
        }));
        
        await get().syncAll();
      },

      clearFailedActions: () => set({ failedActions: [] }),

      clearSyncError: () => set({ syncError: null }),
      
      resetStore: () => set(initialState),
    }),
    {
      name: 'cpfi-sync-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pendingActions: state.pendingActions,
        failedActions: state.failedActions,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);

// Helper function to process individual actions
async function processAction(action: PendingAction): Promise<boolean> {
  // Import stores dynamically to avoid circular dependencies
  const { useDisputeStore } = await import('./disputeStore');
  const { useFinancialStore } = await import('./financialStore');
  
  switch (action.entity) {
    case 'dispute':
      if (action.type === 'create') {
        const result = await useDisputeStore.getState().createDispute(action.data as never);
        return !!result;
      }
      break;
    case 'budget':
      if (action.type === 'create') {
        return await useFinancialStore.getState().createBudget(action.data as never);
      }
      break;
    case 'goal':
      if (action.type === 'create') {
        return await useFinancialStore.getState().createGoal(action.data as never);
      }
      break;
    default:
      console.warn(`Unknown entity type: ${action.entity}`);
  }
  
  return false;
}

// Selectors
export const selectIsOnline = (state: SyncState) => state.isOnline;
export const selectIsSyncing = (state: SyncState) => state.isSyncing;
export const selectPendingCount = (state: SyncState) => state.pendingActions.length;
export const selectFailedCount = (state: SyncState) => state.failedActions.length;
export const selectHasPendingChanges = (state: SyncState) => 
  state.pendingActions.length > 0 || state.failedActions.length > 0;
