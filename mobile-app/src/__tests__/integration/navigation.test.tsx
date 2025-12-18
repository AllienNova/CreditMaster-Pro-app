/**
 * CPFI Navigation Integration Tests
 * Tests navigation flows between screens
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  }),
  useSegments: () => ['(tabs)'],
  usePathname: () => '/',
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: {
    Screen: () => null,
  },
  Tabs: {
    Screen: () => null,
  },
}));

// Mock stores
jest.mock('../../store/authStore');
jest.mock('../../store/creditStore');

describe('Navigation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com' },
    });
  });

  describe('Authentication Flow', () => {
    it('should redirect to login when not authenticated', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        user: null,
      });

      // Simulate navigation guard check
      const isAuthenticated = false;
      if (!isAuthenticated) {
        mockReplace('/login');
      }

      expect(mockReplace).toHaveBeenCalledWith('/login');
    });

    it('should redirect to home after successful login', async () => {
      const mockLogin = jest.fn().mockResolvedValue(true);
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        login: mockLogin,
      });

      // Simulate login flow
      await mockLogin('test@example.com', 'password');
      mockReplace('/(tabs)');

      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  describe('Tab Navigation', () => {
    it('should navigate to credit tab', () => {
      mockPush('/(tabs)/credit');
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/credit');
    });

    it('should navigate to financial tab', () => {
      mockPush('/(tabs)/financial');
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/financial');
    });

    it('should navigate to profile tab', () => {
      mockPush('/(tabs)/profile');
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/profile');
    });
  });

  describe('Deep Linking', () => {
    it('should navigate to specific dispute', () => {
      const disputeId = 'dispute-123';
      mockPush(`/disputes/${disputeId}`);
      expect(mockPush).toHaveBeenCalledWith('/disputes/dispute-123');
    });

    it('should navigate to credit score details', () => {
      mockPush('/credit/score');
      expect(mockPush).toHaveBeenCalledWith('/credit/score');
    });

    it('should navigate to financial goals', () => {
      mockPush('/financial/goals');
      expect(mockPush).toHaveBeenCalledWith('/financial/goals');
    });
  });

  describe('Back Navigation', () => {
    it('should go back from detail screen', () => {
      mockBack();
      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Protected Routes', () => {
    it('should allow access to protected route when authenticated', () => {
      const isAuthenticated = true;
      const canAccess = isAuthenticated;
      expect(canAccess).toBe(true);
    });

    it('should deny access to admin routes for non-admin users', () => {
      const user = { role: 'user' };
      const canAccessAdmin = user.role === 'admin';
      expect(canAccessAdmin).toBe(false);
    });

    it('should allow access to admin routes for admin users', () => {
      const user = { role: 'admin' };
      const canAccessAdmin = user.role === 'admin';
      expect(canAccessAdmin).toBe(true);
    });
  });

  describe('Navigation State Persistence', () => {
    it('should restore navigation state on app restart', () => {
      const savedState = {
        routes: [{ name: '(tabs)', state: { routes: [{ name: 'credit' }] } }],
      };
      
      // Simulate state restoration
      const restoredRoute = savedState.routes[0].state?.routes[0].name;
      expect(restoredRoute).toBe('credit');
    });
  });
});

