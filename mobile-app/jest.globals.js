/**
 * Jest global setup - runs before modules are loaded.
 * Defines globals that React Native expects.
 */

// __DEV__ is set by the RN bundler; needed before any RN module loads
if (typeof globalThis.__DEV__ === "undefined") {
  globalThis.__DEV__ = true;
}

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
