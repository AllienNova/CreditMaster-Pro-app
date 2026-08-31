/**
 * Project-local mock for react-native-reanimated.
 *
 * WHY NOT THE PACKAGE'S OWN MOCK. `react-native-reanimated@3.16.7` ships its
 * jest mock only as TypeScript (`src/mock.ts`) plus an ESM build
 * (`lib/module/`); there is no CommonJS build. Both routes were tried and both
 * fail here:
 *
 *   require("react-native-reanimated/mock")            -> Cannot find module
 *                                                         './src/mock'  (the .ts
 *                                                         file is not transformed)
 *   require(".../lib/module/mock") + transform allowed -> resolves, but merely
 *                                                         importing reanimated
 *                                                         then breaks React
 *                                                         Native Testing
 *                                                         Library's host-
 *                                                         component detection
 *
 * The second failure is the nasty one: RNTL probes for host component names on
 * the first render() in a file, that probe renders a `Switch`, and the probe
 * blows up with "Element type is invalid ... Check the render method of
 * ForwardRef(Switch)". EVERY render() in the file then fails — including tests
 * for components that never touch reanimated. That is why
 * src/components/__tests__/components.test.tsx had 32 failures across Button,
 * Card, Input and ProgressRing, none of which import it directly.
 *
 * A hand-written mock removes the dependency on the package's shipping choices
 * entirely. The surface below is not guessed — it is what the app actually uses,
 * enumerated by grep across src/ and app/.
 *
 * Animated components are plain RN components so trees render and queries work.
 * Hooks return inert values; these tests assert structure and behaviour, not
 * interpolated animation frames.
 */

const React = require("react");

/**
 * react-native is required LAZILY, inside render, and never at module scope.
 *
 * This mock is evaluated while jest is still wiring the React Native preset. A
 * top-level `require("react-native")` here initialises RN too early and leaves
 * its `Switch` component undefined — which then breaks React Native Testing
 * Library's host-component detection and fails EVERY render() in the file, with
 * an error that names Switch and gives no hint that reanimated is involved.
 * Measured: with a module-scope require the probe fails; deferring it fixes it.
 */
const lazy = (name) => {
  const Wrapped = React.forwardRef((props, ref) => {
    const RN = require("react-native");
    return React.createElement(RN[name], { ...props, ref });
  });
  Wrapped.displayName = `Animated(${name})`;
  return Wrapped;
};

const passthrough = (Component) => {
  const Wrapped = React.forwardRef((props, ref) =>
    React.createElement(Component, { ...props, ref }),
  );
  Wrapped.displayName = "Animated(Component)";
  return Wrapped;
};

const AnimatedView = lazy("View");
const AnimatedText = lazy("Text");
const AnimatedScrollView = lazy("ScrollView");
const AnimatedImage = lazy("Image");
const AnimatedFlatList = lazy("FlatList");

/** `useSharedValue` returns a mutable box; app code reads and writes `.value`. */
const useSharedValue = (initial) => ({ value: initial });

/**
 * Returns the style object the caller built. Real reanimated computes this on
 * the UI thread; here the worklet is invoked once so any plain-object style it
 * returns still reaches the component and remains assertable.
 */
const useAnimatedStyle = (fn) => {
  try {
    return typeof fn === "function" ? (fn() ?? {}) : {};
  } catch {
    return {};
  }
};

// Timing helpers resolve immediately to their target value, so a component that
// sets `opacity.value = withTiming(1)` ends up at 1 rather than at a promise.
const identity = (toValue) => toValue;
const withTiming = identity;
const withSpring = identity;
const withDelay = (_delay, value) => value;
const withSequence = (...values) => values[values.length - 1];
const withRepeat = (value) => value;
const withDecay = identity;

const interpolate = (_value, _input, output) =>
  Array.isArray(output) ? output[0] : 0;
const interpolateColor = (_value, _input, output) =>
  Array.isArray(output) ? output[0] : "#000000";

const runOnJS = (fn) => fn;
const runOnUI = (fn) => fn;
const cancelAnimation = () => {};
const measure = () => null;
const useDerivedValue = (fn) => ({
  value: typeof fn === "function" ? fn() : undefined,
});
const useAnimatedProps = (fn) => (typeof fn === "function" ? fn() : {});
const useAnimatedRef = () => ({ current: null });
const useAnimatedScrollHandler = () => () => {};
const useAnimatedGestureHandler = () => () => {};

const easingFn = (t) => t;
const Easing = {
  linear: easingFn,
  ease: easingFn,
  quad: easingFn,
  cubic: easingFn,
  poly: () => easingFn,
  sin: easingFn,
  circle: easingFn,
  exp: easingFn,
  elastic: () => easingFn,
  back: () => easingFn,
  bounce: easingFn,
  bezier: () => ({ factory: () => easingFn }),
  bezierFn: () => easingFn,
  in: (fn) => fn ?? easingFn,
  out: (fn) => fn ?? easingFn,
  inOut: (fn) => fn ?? easingFn,
};

// Layout/entering/exiting presets are chainable builders in real reanimated, so
// the mock must return something that survives `.duration(300).delay(100)`.
const chainable = () => {
  const builder = {};
  const methods = [
    "duration",
    "delay",
    "springify",
    "damping",
    "stiffness",
    "mass",
    "easing",
    "withInitialValues",
    "withCallback",
    "randomDelay",
    "build",
    "reduceMotion",
  ];
  for (const m of methods) builder[m] = () => builder;
  return builder;
};

const presetProxy = new Proxy(
  {},
  {
    get: (_t, prop) =>
      prop === "toString" ? () => "AnimatedPreset" : chainable(),
  },
);

const Animated = {
  View: AnimatedView,
  Text: AnimatedText,
  ScrollView: AnimatedScrollView,
  Image: AnimatedImage,
  FlatList: AnimatedFlatList,
  createAnimatedComponent: passthrough,
  call: () => {},
};

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useAnimatedProps,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedGestureHandler,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  withDecay,
  interpolate,
  interpolateColor,
  runOnJS,
  runOnUI,
  cancelAnimation,
  measure,
  Easing,
  Extrapolate: { CLAMP: "clamp", EXTEND: "extend", IDENTITY: "identity" },
  Extrapolation: { CLAMP: "clamp", EXTEND: "extend", IDENTITY: "identity" },
  Layout: presetProxy,
  FadeIn: presetProxy,
  FadeOut: presetProxy,
  FadeInDown: presetProxy,
  FadeInUp: presetProxy,
  SlideInRight: presetProxy,
  SlideOutLeft: presetProxy,
  ZoomIn: presetProxy,
  ZoomOut: presetProxy,
};
