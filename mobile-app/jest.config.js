/**
 * Fynvita Mobile App Jest Configuration
 *
 * Uses explicit config instead of jest-expo preset to avoid broken
 * expo-modules-core/build/Refs dependency (JS files missing, only .d.ts present).
 * Replicates the jest-expo preset's transform and haste settings directly.
 */

module.exports = {
  // Replicate jest-expo preset inline (skip broken setup.js)
  haste: {
    defaultPlatform: "ios",
    platforms: ["android", "ios", "native"],
  },
  transform: {
    "\\.[jt]sx?$": [
      "babel-jest",
      {
        caller: {
          name: "metro",
          bundler: "metro",
          platform: "ios",
        },
      },
    ],
    "^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp|ttf|otf|m4v|mov|mp4|mpeg|mpg|webm|aac|aiff|caf|m4a|mp3|wav|html|pdf|obj)$":
      require.resolve("jest-expo/src/preset/assetFileTransformer.js"),
  },
  globals: {
    __DEV__: false,
  },
  setupFiles: [
    "<rootDir>/jest.globals.js",
    require.resolve("react-native/jest/setup.js"),
  ],
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
    "**/*.test.ts",
    "**/*.test.tsx",
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!src/**/__tests__/**",
  ],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 14,
      statements: 14,
    },
    // Enforce high coverage on files that have dedicated test suites
    "./src/store/dashboardStore.ts": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "./src/store/notificationStore.ts": {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "./src/store/syncStore.ts": {
      branches: 50,
      functions: 90,
      lines: 70,
      statements: 70,
    },
    "./src/store/creditStore.ts": {
      branches: 40,
      functions: 50,
      lines: 55,
      statements: 55,
    },
    "./src/store/disputeStore.ts": {
      branches: 40,
      functions: 60,
      lines: 55,
      statements: 55,
    },
    "./src/services/notifications/pushNotificationService.ts": {
      branches: 65,
      functions: 80,
      lines: 85,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|zustand)",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
