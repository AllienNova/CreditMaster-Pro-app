/**
 * Onboarding Progress Hook (Web)
 * 
 * Provides auto-save functionality for onboarding progress
 * - Loads saved progress on mount
 * - Auto-saves every 30 seconds
 * - Manual save on step completion
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface OnboardingProgress {
  current_step: number;
  completed_steps: number[];
  form_data: Record<string, any>;
  last_updated: string;
}

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

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
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasChangesRef = useRef(false);

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/onboarding/progress');
        
        if (response.ok) {
          const data = await response.json();
          setProgress(data);
        } else if (response.status !== 404) {
          // Failed to load progress
        }
      } catch (err) {
        // Error loading progress
        setError('Failed to load saved progress');
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, []);

  // Save progress to API
  const saveProgress = useCallback(async (progressToSave: OnboardingProgress) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('/api/onboarding/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(progressToSave),
      });

      if (!response.ok) {
        throw new Error('Failed to save progress');
      }

      hasChangesRef.current = false;
      return true;
    } catch (err) {
      // Error saving progress
      setError('Failed to save progress');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

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
  const completeStep = useCallback(async (stepNumber: number) => {
    const newCompletedSteps = Array.from(new Set([...progress.completed_steps, stepNumber]));
    const newProgress = {
      ...progress,
      completed_steps: newCompletedSteps,
      current_step: Math.min(stepNumber + 1, 5),
      last_updated: new Date().toISOString(),
    };
    
    setProgress(newProgress);
    await saveProgress(newProgress);
  }, [progress, saveProgress]);

  // Update form data for current step
  const updateFormData = useCallback((stepData: Record<string, any>) => {
    updateProgress({
      form_data: {
        ...progress.form_data,
        [`step_${progress.current_step}`]: stepData,
      },
    });
  }, [progress, updateProgress]);

  // Go to specific step
  const goToStep = useCallback((stepNumber: number) => {
    if (stepNumber >= 1 && stepNumber <= 5) {
      updateProgress({ current_step: stepNumber });
    }
  }, [updateProgress]);

  // Manual save
  const save = useCallback(async () => {
    return await saveProgress(progress);
  }, [progress, saveProgress]);

  return {
    progress,
    loading,
    saving,
    error,
    updateProgress,
    completeStep,
    updateFormData,
    goToStep,
    save,
  };
}

