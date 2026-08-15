/**
 * Fynvita Mobile App Jest Setup
 */

// Force __DEV__ to false in tests so stores use mocked APIs instead of dev seed data.
// react-native/jest/setup.js (a setupFile) sets __DEV__ = true; we override it here
// in setupFilesAfterEnv which runs after all setupFiles.
globalThis.__DEV__ = false;

// Polyfill Headers for test environment (used in fetch mock)
if (typeof globalThis.Headers === "undefined") {
  globalThis.Headers = class Headers {
    constructor() { this._headers = {}; }
    append(k, v) { this._headers[k.toLowerCase()] = v; }
    get(k) { return this._headers[k.toLowerCase()] || null; }
  };
}

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Mock expo-secure-store
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: "Link",
  Stack: {
    Screen: "Screen",
  },
  Tabs: {
    Screen: "Screen",
  },
}));

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
  MaterialIcons: "MaterialIcons",
  FontAwesome: "FontAwesome",
}));

// Mock react-native-svg — return functional components so JSX rendering works
jest.mock("react-native-svg", () => {
  const React = require("react");
  const makeMock = (name) => {
    const Comp = (props) => React.createElement(name, props, props.children);
    Comp.displayName = name;
    return Comp;
  };
  return {
    __esModule: true,
    default: makeMock("Svg"),
    Svg: makeMock("Svg"),
    Circle: makeMock("Circle"),
    G: makeMock("G"),
    Path: makeMock("Path"),
    Rect: makeMock("Rect"),
    Line: makeMock("Line"),
    Text: makeMock("SvgText"),
    Defs: makeMock("Defs"),
    LinearGradient: makeMock("LinearGradient"),
    Stop: makeMock("Stop"),
    ClipPath: makeMock("ClipPath"),
  };
});

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  SafeAreaProvider: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// react-native-reanimated: explicit factory pointing at the project-local mock.
//
// The automatic `__mocks__/<package>.js` convention does NOT apply here because
// jest `roots` is scoped to `src`, so a root-level __mocks__ directory is never
// scanned. Wiring it explicitly is what actually takes effect.
//
// See __mocks__/react-native-reanimated.js for why the package's own mock is
// unusable: it ships TypeScript/ESM only, and routing around that still breaks
// React Native Testing Library's host-component detection, which fails every
// render() in an affected file.
// React Native's jest mock leaves AccessibilityInfo.isReduceMotionEnabled
// returning undefined, so src/lib/animations.ts:44 —
// `AccessibilityInfo.isReduceMotionEnabled().then(...)` — throws
// "Cannot read properties of undefined (reading 'then')" inside an effect.
// Real RN returns a Promise, so this restores the documented contract rather
// than working around app code.
//
// Patched on the live object rather than jest.mock()'d by module path: mocking
// the deep Libraries/... path replaced more of the module than intended and
// broke a second test.
// Applied in beforeEach, not at module scope: requiring react-native while this
// setup file is still evaluating initialises RN too early and breaks its Switch
// component, which then fails RNTL's host-component detection for the whole
// file. Same trap as __mocks__/react-native-reanimated.js. `clearMocks: true`
// also wipes these between tests, so they must be re-applied each time anyway.
beforeEach(() => {
  const { AccessibilityInfo } = require("react-native");
  AccessibilityInfo.isReduceMotionEnabled = jest.fn(() =>
    Promise.resolve(false),
  );
  AccessibilityInfo.isScreenReaderEnabled = jest.fn(() =>
    Promise.resolve(false),
  );
  AccessibilityInfo.addEventListener = jest.fn(() => ({ remove: jest.fn() }));
});


jest.mock("react-native-reanimated", () =>
  require("./__mocks__/react-native-reanimated.js"),
);

// Mock expo-notifications (comprehensive — covers pushNotificationService)
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" }),
  ),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: "test-token" })),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve("notif-id-123")),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve(undefined)),
  cancelAllScheduledNotificationsAsync: jest.fn(() =>
    Promise.resolve(undefined),
  ),
  getBadgeCountAsync: jest.fn(() => Promise.resolve(0)),
  setBadgeCountAsync: jest.fn(() => Promise.resolve(undefined)),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve(undefined)),
  removeNotificationSubscription: jest.fn(),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
  SchedulableTriggerInputTypes: {
    DATE: "date",
    TIME_INTERVAL: "timeInterval",
    CALENDAR: "calendar",
    DAILY: "daily",
    WEEKLY: "weekly",
    MONTHLY: "monthly",
    YEARLY: "yearly",
  },
}));

// Mock expo-device — use a mutable object so tests can override isDevice
jest.mock("expo-device", () => {
  const device = {
    isDevice: true,
    brand: "Test",
    modelName: "Test Device",
    deviceName: "Test Device",
  };
  return {
    __esModule: true,
    ...device,
    // Re-export as a module namespace: `import * as Device` reads these properties.
    // Because resetMocks only resets jest.fn() calls (not plain values),
    // tests can set `Device.isDevice = false` via require('expo-device').
    get isDevice() {
      return device.isDevice;
    },
    set isDevice(v) {
      device.isDevice = v;
    },
  };
});

// Mock @react-native-community/netinfo
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true, type: "wifi" })),
    configure: jest.fn(),
  },
  NetInfoStateType: {
    unknown: "unknown",
    none: "none",
    cellular: "cellular",
    wifi: "wifi",
    bluetooth: "bluetooth",
    ethernet: "ethernet",
    wimax: "wimax",
    vpn: "vpn",
    other: "other",
  },
}));

// Mock Supabase
jest.mock("./src/services/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: { access_token: "test-token", user: { id: "test-user-id" } },
        },
      }),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}));

// Global fetch mock
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    headers: new globalThis.Headers(),
  }),
);

// Silence console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0]?.includes?.("Animated") ||
    args[0]?.includes?.("useNativeDriver")
  ) {
    return;
  }
  originalWarn.apply(console, args);
};
