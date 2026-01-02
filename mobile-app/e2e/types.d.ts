/**
 * Detox Type Declarations for E2E Tests
 *
 * This file provides minimal type declarations for Detox globals
 * to satisfy TypeScript compilation.
 */

/// <reference types="detox/detox" />

declare global {
  const device: import('detox').Device;
  const element: import('detox').Element;
  const by: import('detox').Matchers;
  const waitFor: import('detox').WaitFor;
  const expect: import('detox').Expect;
}

export {};
