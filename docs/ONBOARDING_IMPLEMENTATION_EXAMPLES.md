# Onboarding Implementation Examples

This document provides ready-to-use code examples for implementing the key onboarding enhancements.

## 1. Progress Save/Resume Hook

### Web Implementation (React)

```typescript
// hooks/useOnboardingProgress.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingProgress {
  currentStep: number;
  completedSteps: number[];
  formData: Record<string, any>;
  lastUpdated: string;
}

export const useOnboardingProgress = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<OnboardingProgress>({
    currentStep: 1,
    completedSteps: [],
    formData: {},
    lastUpdated: new Date().toISOString()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`/api/onboarding/progress/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.progress) {
            setProgress(data.progress);
          }
        }
      } catch (error) {
        console.error('Failed to load progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [user?.id]);

  // Auto-save progress every 30 seconds
  useEffect(() => {
    if (!user?.id || isLoading) return;

    const saveProgress = async () => {
      setIsSaving(true);
      try {
        await fetch(`/api/onboarding/progress/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...progress,
            lastUpdated: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Failed to save progress:', error);
      } finally {
        setIsSaving(false);
      }
    };

    const interval = setInterval(saveProgress, 30000);
    return () => clearInterval(interval);
  }, [user?.id, progress, isLoading]);

  const updateProgress = useCallback((updates: Partial<OnboardingProgress>) => {
    setProgress(prev => ({ ...prev, ...updates }));
  }, []);

  const completeStep = useCallback((step: number) => {
    setProgress(prev => ({
      ...prev,
      completedSteps: [...new Set([...prev.completedSteps, step])],
      currentStep: step + 1
    }));
  }, []);

  const updateFormData = useCallback((field: string, value: any) => {
    setProgress(prev => ({
      ...prev,
      formData: { ...prev.formData, [field]: value }
    }));
  }, []);

  return {
    progress,
    isLoading,
    isSaving,
    updateProgress,
    completeStep,
    updateFormData
  };
};
```

### Mobile Implementation (React Native)

```typescript
// hooks/useOnboardingProgress.ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/authStore';
import NetInfo from '@react-native-community/netinfo';

const STORAGE_KEY = '@onboarding_progress';

export const useOnboardingProgress = () => {
  const { user } = useAuthStore();
  const [progress, setProgress] = useState({
    currentStep: 1,
    completedSteps: [],
    formData: {},
    lastUpdated: new Date().toISOString()
  });
  const [isOnline, setIsOnline] = useState(true);
  const [needsSync, setNeedsSync] = useState(false);

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  // Load from local storage
  useEffect(() => {
    const loadLocal = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setProgress(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load local progress:', error);
      }
    };
    loadLocal();
  }, []);

  // Save to local storage
  useEffect(() => {
    const saveLocal = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      } catch (error) {
        console.error('Failed to save local progress:', error);
      }
    };
    saveLocal();
  }, [progress]);

  // Sync with server when online
  useEffect(() => {
    if (!isOnline || !needsSync || !user?.id) return;

    const syncWithServer = async () => {
      try {
        await fetch(`/api/onboarding/progress/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(progress)
        });
        setNeedsSync(false);
      } catch (error) {
        console.error('Failed to sync progress:', error);
      }
    };

    syncWithServer();
  }, [isOnline, needsSync, user?.id, progress]);

  const updateProgress = useCallback((updates) => {
    setProgress(prev => ({ ...prev, ...updates }));
    setNeedsSync(true);
  }, []);

  return { progress, updateProgress, isOnline, needsSync };
};
```

## 2. Educational Tooltip Component

### Web Component

```typescript
// components/onboarding/EducationalTooltip.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface TooltipProps {
  content: string;
  title?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  learnMoreUrl?: string;
  children?: React.ReactNode;
  className?: string;
}

export const EducationalTooltip: React.FC<TooltipProps> = ({
  content,
  title,
  placement = 'top',
  learnMoreUrl,
  children,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = trigger.top - tooltip.height - 8;
        left = trigger.left + (trigger.width - tooltip.width) / 2;
        break;
      case 'bottom':
        top = trigger.bottom + 8;
        left = trigger.left + (trigger.width - tooltip.width) / 2;
        break;
      case 'left':
        top = trigger.top + (trigger.height - tooltip.height) / 2;
        left = trigger.left - tooltip.width - 8;
        break;
      case 'right':
        top = trigger.top + (trigger.height - tooltip.height) / 2;
        left = trigger.right + 8;
        break;
    }

    setPosition({ top, left });
  }, [isOpen, placement]);

  const handleMouseEnter = () => setIsOpen(true);
  const handleMouseLeave = () => setIsOpen(false);
  const handleClick = () => setIsOpen(!isOpen);

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-flex items-center gap-1 ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {children || (
          <InformationCircleIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-help" />
        )}
      </div>

      {isOpen && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-50 max-w-xs bg-gray-900 text-white rounded-lg shadow-xl p-4 animate-fade-in"
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
        >
          {title && (
            <h4 className="font-semibold text-sm mb-2">{title}</h4>
          )}
          <p className="text-sm leading-relaxed">{content}</p>
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-blue-300 hover:text-blue-200"
            >
              Learn more →
            </a>
          )}
          <div
            className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              placement === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
              placement === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
              placement === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
              'left-[-4px] top-1/2 -translate-y-1/2'
            }`}
          />
        </div>,
        document.body
      )}
    </>
  );
};

// Usage example
export const ProfileFormWithTooltips = () => {
  return (
    <div className="space-y-4">
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          Social Security Number
          <EducationalTooltip
            title="Why we need your SSN"
            content="Your SSN is required to verify your identity with credit bureaus and pull your credit reports. We use bank-level encryption to protect your data."
            learnMoreUrl="/security"
          />
        </label>
        <input
          type="password"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          placeholder="XXX-XX-XXXX"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          Current Credit Score Range
          <EducationalTooltip
            title="Credit Score Ranges"
            content="Poor (300-579), Fair (580-669), Good (670-739), Very Good (740-799), Excellent (800-850). Your range helps us create a personalized improvement plan."
          />
        </label>
        <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
          <option>Select your range</option>
          <option>Below 580 (Poor)</option>
          <option>580-669 (Fair)</option>
          <option>670-739 (Good)</option>
          <option>740-799 (Very Good)</option>
          <option>800+ (Excellent)</option>
        </select>
      </div>
    </div>
  );
};
```

### Mobile Component (React Native)

```typescript
// components/onboarding/EducationalTooltip.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme as theme } from '@/constants/theme';

interface TooltipProps {
  content: string;
  title?: string;
  learnMoreUrl?: string;
  iconSize?: number;
  iconColor?: string;
}

export const EducationalTooltip: React.FC<TooltipProps> = ({
  content,
  title,
  learnMoreUrl,
  iconSize = 20,
  iconColor = theme.colors.textSecondary
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleLearnMore = () => {
    if (learnMoreUrl) {
      Linking.openURL(learnMoreUrl);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsVisible(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="information-circle-outline"
          size={iconSize}
          color={iconColor}
        />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.tooltipContainer}>
            <View style={styles.tooltipContent}>
              {title && (
                <Text style={styles.tooltipTitle}>{title}</Text>
              )}
              <Text style={styles.tooltipText}>{content}</Text>

              {learnMoreUrl && (
                <TouchableOpacity
                  onPress={handleLearnMore}
                  style={styles.learnMoreButton}
                >
                  <Text style={styles.learnMoreText}>Learn more</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setIsVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg
  },
  tooltipContainer: {
    width: '100%',
    maxWidth: 400
  },
  tooltipContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm
  },
  tooltipText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.md
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: theme.spacing.md
  },
  learnMoreText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500'
  },
  closeButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center'
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
```


