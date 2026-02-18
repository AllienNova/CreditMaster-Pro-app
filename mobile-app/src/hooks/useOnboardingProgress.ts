/**
 * Onboarding Progress Hook (Mobile)
 *
 * Provides auto-save functionality for onboarding progress with offline support
 * - Loads saved progress on mount
 * - Auto-saves every 30 seconds
 * - Syncs with server when online
 * - Uses AsyncStorage for offline persistence
 */

import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

export interface OnboardingProgress {
  current_step: number;
  completed_steps: number[];
  form_data: Record<string, any>;
  last_updated: string;
}

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const STORAGE_KEY = "@onboarding_progress";
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export function useOnboardingProgress() {
  const [progress, setProgress] = useState<OnboardingProgress>({
    current_step: 1,
    completed_steps: [],
    form_data: {},
    last_updated: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasChangesRef = useRef(false);

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        setLoading(true);

        // Try to load from AsyncStorage first
        const localData = await AsyncStorage.getItem(STORAGE_KEY);
        if (localData) {
          setProgress(JSON.parse(localData));
        }

        // If online, fetch from server
        if (isOnline) {
          const response = await fetch(`${API_URL}/api/onboarding/progress`);

          if (response.ok) {
            const serverData = await response.json();
            setProgress(serverData);
            // Update local storage
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serverData));
          }
        }
      } catch (err) {
        console.error("Error loading progress:", err);
        setError("Failed to load saved progress");
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, [isOnline]);

  // Save progress locally and to API
  const saveProgress = useCallback(
    async (progressToSave: OnboardingProgress) => {
      try {
        setSaving(true);
        setError(null);

        // Always save to AsyncStorage
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progressToSave));

        // Sync with server if online
        if (isOnline) {
          const response = await fetch(`${API_URL}/api/onboarding/progress`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(progressToSave),
          });

          if (!response.ok) {
            throw new Error("Failed to sync with server");
          }
        }

        hasChangesRef.current = false;
        return true;
      } catch (err) {
        console.error("Error saving progress:", err);
        setError(
          isOnline ? "Failed to save progress" : "Saved locally (offline)",
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [isOnline],
  );

  // Auto-save every 30 seconds if there are changes
  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      if (hasChangesRef.current && !saving) {
        saveProgress(progress);
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [progress, saving, saveProgress]);

  // Update progress state
  const updateProgress = useCallback((updates: Partial<OnboardingProgress>) => {
    setProgress((prev) => ({
      ...prev,
      ...updates,
      last_updated: new Date().toISOString(),
    }));
    hasChangesRef.current = true;
  }, []);

  // Complete a step
  const completeStep = useCallback(
    async (stepNumber: number) => {
      const newCompletedSteps = Array.from(
        new Set([...progress.completed_steps, stepNumber]),
      );
      const newProgress = {
        ...progress,
        completed_steps: newCompletedSteps,
        current_step: Math.min(stepNumber + 1, 5),
        last_updated: new Date().toISOString(),
      };

      setProgress(newProgress);
      await saveProgress(newProgress);
    },
    [progress, saveProgress],
  );

  return {
    progress,
    loading,
    saving,
    error,
    isOnline,
    updateProgress,
    completeStep,
    save: () => saveProgress(progress),
  };
}
