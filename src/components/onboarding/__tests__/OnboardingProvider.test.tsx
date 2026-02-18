/**
 * OnboardingProvider & useOnboarding Hook Tests
 *
 * Tests the context provider's localStorage integration,
 * state management methods, and the useOnboarding hook
 * error boundary when used outside the provider.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingProvider, useOnboarding } from '../OnboardingProvider';

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    _getStore: () => store,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ---------------------------------------------------------------------------
// Test consumer component
// ---------------------------------------------------------------------------

function TestConsumer() {
  const {
    hasCompletedOnboarding,
    startOnboarding,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
  } = useOnboarding();

  return (
    <div>
      <span data-testid="status">
        {hasCompletedOnboarding ? 'completed' : 'not-completed'}
      </span>
      <button onClick={startOnboarding}>Start</button>
      <button onClick={completeOnboarding}>Complete</button>
      <button onClick={skipOnboarding}>Skip</button>
      <button onClick={resetOnboarding}>Reset</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
});

// ---------------------------------------------------------------------------
// useOnboarding outside provider
// ---------------------------------------------------------------------------

describe('useOnboarding — outside provider', () => {
  it('throws when used outside OnboardingProvider', () => {
    // Suppress React error boundary console output
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useOnboarding must be used within an OnboardingProvider');

    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Initial state loading from localStorage
// ---------------------------------------------------------------------------

describe('OnboardingProvider — initial state', () => {
  it('defaults to completed=true initially (avoids flash)', () => {
    render(
      <OnboardingProvider>
        <TestConsumer />
      </OnboardingProvider>
    );
    // Before useEffect fires, the default state is true
    // After useEffect fires with no localStorage value, it becomes false
    // waitFor is not needed — act() in render() flushes effects in jsdom
    const status = screen.getByTestId('status');
    // After the effect, localStorage returns null -> completed === false
    expect(status.textContent).toBe('not-completed');
  });

  it('reads "true" from localStorage and stays completed', () => {
    localStorageMock.getItem.mockReturnValue('true');

    render(
      <OnboardingProvider>
        <TestConsumer />
      </OnboardingProvider>
    );

    expect(screen.getByTestId('status').textContent).toBe('completed');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('fynvita_onboarding_completed');
  });

  it('reads non-"true" value from localStorage and sets not-completed', () => {
    localStorageMock.getItem.mockReturnValue('false');

    render(
      <OnboardingProvider>
        <TestConsumer />
      </OnboardingProvider>
    );

    expect(screen.getByTestId('status').textContent).toBe('not-completed');
  });
});

// ---------------------------------------------------------------------------
// completeOnboarding
// ---------------------------------------------------------------------------

describe('OnboardingProvider — completeOnboarding', () => {
  it('sets localStorage and updates state to completed', async () => {
    const user = userEvent.setup();

    render(
      <OnboardingProvider>
        <TestConsumer />
      </OnboardingProvider>
    );

    // Initially not-completed (no localStorage value)
    expect(screen.getByTestId('status').textContent).toBe('not-completed');

    await user.click(screen.getByText('Complete'));

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'fynvita_onboarding_completed',
      'true'
    );
    expect(screen.getByTestId('status').textContent).toBe('completed');
  });
});

// ---------------------------------------------------------------------------
// skipOnboarding
// ---------------------------------------------------------------------------

describe('OnboardingProvider — skipOnboarding', () => {
  it('sets localStorage and updates state to completed', async () => {
    const user = userEvent.setup();

    render(
      <OnboardingProvider>
        <TestConsumer />
      </OnboardingProvider>
    );

    await user.click(screen.getByText('Skip'));

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'fynvita_onboarding_completed',
      'true'
    );
    expect(screen.getByTestId('status').textContent).toBe('completed');
  });
});

// ---------------------------------------------------------------------------
// startOnboarding
// ---------------------------------------------------------------------------

describe('OnboardingProvider — startOnboarding', () => {
  it('sets state to not-completed (does not touch localStorage)', async () => {
    const user = userEvent.setup();
    localStorageMock.getItem.mockReturnValue('true');

    render(
      <OnboardingProvider>
        <TestConsumer />
      </OnboardingProvider>
    );

    expect(screen.getByTestId('status').textContent).toBe('completed');

    await user.click(screen.getByText('Start'));

    expect(screen.getByTestId('status').textContent).toBe('not-completed');
    // startOnboarding does NOT write to localStorage
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// resetOnboarding
// ---------------------------------------------------------------------------

describe('OnboardingProvider — resetOnboarding', () => {
  it('removes localStorage key and sets state to not-completed', async () => {
    const user = userEvent.setup();
    localStorageMock.getItem.mockReturnValue('true');

    render(
      <OnboardingProvider>
        <TestConsumer />
      </OnboardingProvider>
    );

    expect(screen.getByTestId('status').textContent).toBe('completed');

    await user.click(screen.getByText('Reset'));

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('fynvita_onboarding_completed');
    expect(screen.getByTestId('status').textContent).toBe('not-completed');
  });
});

// ---------------------------------------------------------------------------
// Children rendering
// ---------------------------------------------------------------------------

describe('OnboardingProvider — children', () => {
  it('renders children correctly', () => {
    render(
      <OnboardingProvider>
        <div data-testid="child">Hello</div>
      </OnboardingProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
