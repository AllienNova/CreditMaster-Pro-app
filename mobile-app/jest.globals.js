/**
 * Jest global setup - runs before modules are loaded.
 * Defines globals that React Native expects.
 */

// __DEV__ is set by the RN bundler; needed before any RN module loads.
// Note: react-native/jest/setup.js will override this to true; the real
// override to false happens in jest.setup.js (setupFilesAfterEnv).
globalThis.__DEV__ = false;

// ErrorUtils is expected by some RN internals
if (typeof globalThis.ErrorUtils === "undefined") {
  globalThis.ErrorUtils = {
    setGlobalHandler: () => {},
    getGlobalHandler: () => () => {},
    reportFatalError: (error) => {
      throw error;
    },
    reportError: () => {},
  };
}
