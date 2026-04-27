---
paths:
  - "frontend/**/*.tsx"
  - "frontend/**/*.ts"
  - "frontend/**/*.css"
---

# React Frontend Rules (Strativion PCTT Platform)

## Component Architecture
- Functional components ONLY. No class components under any circumstance.
- Maximum component file length: 200 lines. Extract sub-components into separate files for longer logic.
- Component file naming: PascalCase (e.g., `TradeApprovalDialog.tsx`).
- Hook file naming: camelCase with `use` prefix (e.g., `usePositionData.ts`).
- No default exports. Use named exports for all components and hooks.

## State Management
- Use Recoil atoms and selectors for global state. Atom definitions are documented in SSOT-UI sections.
- Local component state uses `useState` only for truly ephemeral UI state (open/closed, hover, focus).
- Derived data MUST use Recoil selectors, not inline computation in render functions.
- WebSocket connections via the custom `useWebSocket` hook with auto-reconnect and exponential backoff.

## SUPERVISED Mode Enforcement
- In SUPERVISED mode, every trade action MUST show an approval dialog before execution.
- The `TradeApprovalDialog` component displays: signal details, risk parameters, expected cost, and agent confidence.
- No trade order reaches the execution layer without explicit user confirmation in SUPERVISED mode.

## Charting
- TradingView Lightweight Charts v5 for ALL chart rendering. No other charting library (no Recharts, no D3 for price charts).
- Chart integration uses React refs. This is the only acceptable use of direct DOM refs.
- PCTT overlays (trendlines, pivots, zones) render via the LWC plugin API, not custom canvas drawing.

## Styling
- No inline styles. Use Tailwind CSS utility classes or CSS modules.
- Responsive design: all layouts must work at 1280px, 1440px, and 1920px widths.
- Dark theme is the default. All color values reference CSS custom properties for theme switching.

## Performance
- Memoize expensive computations with `useMemo`. Provide correct dependency arrays.
- Memoize callbacks passed to child components with `useCallback`.
- Virtualize long lists (positions, orders, trade history) using `react-window` or equivalent.
- No unnecessary re-renders. Use React DevTools Profiler to verify during development.

## Data Handling
- Every component receiving agent data MUST handle three states: loading, error, and empty.
- Display skeleton loaders during loading, not spinners (reduces layout shift).
- Error boundaries at route level to catch rendering failures gracefully.

## Accessibility
- All interactive elements need `aria-label` or `aria-labelledby` attributes.
- Keyboard navigation: Tab order, Enter/Space activation, Escape to close dialogs.
- Color is never the sole indicator of state. Use icons, text labels, or patterns alongside color.
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text.
