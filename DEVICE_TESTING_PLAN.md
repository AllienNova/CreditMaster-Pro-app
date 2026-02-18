# Fynvita — Physical Device Testing & Debugging Plan

> Comprehensive testing strategy for Website, Web App (PWA), and Mobile App (iOS/Android)

---

## 1. Platform State Assessment (Current)

### Web Application (Next.js 15.5)

| Metric | Value | Status |
|--------|-------|--------|
| TypeScript Errors | 0 | PASS |
| Production Build | 388 pages, builds clean | PASS |
| Test Suites | 143+ passing, 0 failures | PASS |
| Test Coverage | 81.42% | PASS |
| Bundle Size | 538 kB shared JS | WARN (heavy) |
| API Routes | 248 endpoints | PASS |
| Pages | 60+ unique routes | PASS |
| Security Headers | HSTS, CSP, X-Frame-Options | PASS |
| Middleware | Auth + routing configured | PASS |
| Docker | Multi-stage Dockerfile ready | PASS |
| Vercel Config | vercel.json with CRON jobs | PASS |

**Verdict: PRODUCTION-READY. Can deploy and test on devices immediately.**

---

### PWA (Progressive Web App)

| Metric | Value | Status |
|--------|-------|--------|
| manifest.json | Complete (name, icons, shortcuts) | PASS |
| Service Worker | sw.js (7.75 KB) — cache-first + network-first | PASS |
| Icons | 8 sizes (72x72 to 512x512), maskable | PASS |
| Offline Support | Static cache + dynamic cache + API fallback | PASS |
| Push Notifications | VAPID keys, subscription flow | PASS |
| Install Prompt | Standalone display mode configured | PASS |
| Screenshots | Dashboard + mobile dashboard | PASS |
| Shortcuts | Dashboard, New Dispute | PASS |

**Verdict: PRODUCTION-READY. Installable on mobile browsers and desktop.**

---

### Mobile App (React Native / Expo)

| Metric | Value | Status |
|--------|-------|--------|
| TypeScript Errors | 94 across 39 files | FAIL |
| Expo SDK | 52.0.48 | PASS |
| React Native | 0.74.0 | PASS |
| Navigation | Expo Router 3.5 (248 screens) | PASS |
| State Management | 19 Zustand stores | PASS |
| EAS Build Config | dev/preview/prod profiles | PASS |
| iOS Config | Bundle ID, permissions, deep links | PASS |
| Android Config | Package, permissions, intent filters | PASS |
| Detox E2E | 4 test files configured | PASS |
| Jest Unit Tests | Configured with 80% threshold | PASS |
| ios/ directory | NOT GENERATED (needs `expo prebuild`) | BLOCKED |
| android/ directory | NOT GENERATED (needs `expo prebuild`) | BLOCKED |
| Store Metadata | Complete (screenshots, descriptions) | PASS |

**Verdict: NOT BUILDABLE. 94 TypeScript errors must be fixed, then `expo prebuild` to generate native projects. Architecture and configuration are solid.**

---

## 2. Pre-Testing Fixes Required

### Priority 1: Mobile App TypeScript Errors (94 errors, 39 files)

These must be resolved before any mobile device testing:

**Error Categories:**
- Component prop mismatches (ProgressRing children, LineChart currency)
- Expo Router typed routes (Href type mismatches)
- Missing properties on types (DisputeTemplate.bestPractices, DisputeState.stats)
- Style type errors (empty string "" not assignable to ViewStyle)
- Implicit `any` types
- Duplicate object literal keys

**Files with errors (39):**
```
app/credit-builder/score-simulator.tsx
app/credit/factors.tsx
app/dashboard/settings.tsx
app/dashboard/spending.tsx
app/dispute/analytics.tsx
app/dispute/use-template.tsx
app/financial/bills.tsx
app/financial/budgets.tsx
app/financial/debt.tsx
app/financial/goals.tsx
app/financial/overview.tsx
app/financial-intelligence/debt-payoff.tsx
app/financial-intelligence/smart-budget-enhanced.tsx
app/financial-intelligence/spending-insights.tsx
app/identity/dark-web.tsx
app/identity/index.tsx
app/marketplace/consolidation.tsx
app/profile/settings.tsx
app/profile/subscription.tsx
app/rewards/index.tsx
app/tax/calendar.tsx
app/tax/deductions.tsx
app/tax/documents.tsx
app/tax/index.tsx
app/tax/optimizer.tsx
app/tax/scenarios.tsx
app/trading/chart.tsx
app/trading/history.tsx
app/trading/paper.tsx
src/components/charts/ChartContainer.tsx
src/components/charts/ChartHelpers.tsx
src/components/chat/ChatBubble.tsx
src/components/chat/ChatInput.tsx
src/components/chat/SuggestionChips.tsx
src/components/financial/PaydayCountdown.tsx
src/services/biometrics/biometricService.ts
src/services/haptics/hapticService.ts
src/services/widget-service.ts
src/store/index.ts
```

### Priority 2: Web App Bundle Size

- 538 kB shared JS is heavy for mobile browsers
- Should investigate code splitting and lazy loading effectiveness
- Target: < 300 kB shared JS

---

## 3. Device Testing Matrix

### Target Devices

| Device | OS | Screen | Purpose |
|--------|----|--------|---------|
| iPhone 15 Pro | iOS 17+ | 6.1" OLED | Primary iOS |
| iPhone SE (3rd gen) | iOS 16+ | 4.7" LCD | Small screen edge cases |
| iPad Air | iPadOS 17+ | 10.9" | Tablet layout |
| Samsung Galaxy S24 | Android 14 | 6.2" AMOLED | Primary Android |
| Google Pixel 8 | Android 14 | 6.2" OLED | Stock Android reference |
| Samsung Galaxy A14 | Android 13 | 6.6" LCD | Budget device (perf testing) |
| Android Tablet | Android 13+ | 10"+ | Tablet layout |

### Browser Matrix (for Web/PWA)

| Browser | Platforms | Priority |
|---------|-----------|----------|
| Safari | iOS, macOS | Critical |
| Chrome | Android, Windows, macOS | Critical |
| Firefox | Android, Windows | High |
| Samsung Internet | Samsung devices | Medium |
| Edge | Windows, Android | Medium |

---

## 4. Testing Plan — Stage by Stage

---

### STAGE 1: Local Development Verification

**Duration:** 1-2 hours
**Devices:** Development machine only
**Goal:** Confirm all platforms start and render

#### Web App

**Commands:**
```bash
cd /c/Githhub/Fynvita
npm run dev
```

**What to Expect:**
- Dev server starts on http://localhost:3000
- Landing page renders with "Fynvita" branding
- Dashboard loads (may redirect to login without auth)
- All 60+ routes accessible via browser
- Hot reload works on file changes
- No console errors in browser DevTools
- API routes respond at /api/* endpoints

**Red Flags:**
- Hydration mismatches (SSR vs client render differences)
- Missing environment variables (blank pages, API 500s)
- Slow initial page load > 5 seconds
- Console errors about missing modules

#### Mobile App (after TS fixes)

**Commands:**
```bash
cd /c/Githhub/Fynvita/mobile-app
npx expo start
# Press 'i' for iOS simulator, 'a' for Android emulator
```

**What to Expect:**
- Expo dev server starts with QR code
- Splash screen appears briefly
- Auth screen or onboarding flow loads
- Tab navigation renders with 6 tabs (Home, Credit, Disputes, Money, Invest, Profile)
- Navigation between screens works
- No red error screen (React Native error boundary)

**Red Flags:**
- Red screen with stack trace = JavaScript error
- Yellow box warnings about deprecated APIs
- "Network request failed" = API URL misconfigured
- Blank white screen = layout crash or missing component

---

### STAGE 2: Physical Device — Web/PWA Testing

**Duration:** 3-4 hours
**Devices:** 2 phones (iOS + Android), 1 tablet
**Goal:** Validate responsive design, PWA install, offline behavior

#### 2A: Mobile Browser Testing

**Setup:**
1. Deploy to Vercel preview: `vercel` (or use `ngrok` for localhost)
2. Open URL on each physical device's browser

**Test Checklist — Per Device:**

| # | Test | Expected Result | Priority |
|---|------|----------------|----------|
| 1 | Load landing page | Renders within 3s, no layout breaking | Critical |
| 2 | Scroll behavior | Smooth 60fps, no jank | Critical |
| 3 | Navigation menu | Hamburger menu opens/closes, links work | Critical |
| 4 | Login flow | Form fields focusable, keyboard doesn't overlap | Critical |
| 5 | Dashboard layout | Cards stack vertically on mobile, grid on tablet | Critical |
| 6 | Charts/graphs | Render correctly, touch interactions work | High |
| 7 | Form inputs | All input types work (text, email, number, date) | Critical |
| 8 | File upload | Document picker opens, uploads succeed | High |
| 9 | Scroll in modals | Content scrollable inside modals/sheets | High |
| 10 | Font rendering | Text readable at all sizes, no overflow | Critical |
| 11 | Image loading | All images load, proper aspect ratios | High |
| 12 | Dark mode | Toggle works, no contrast issues | Medium |
| 13 | Landscape orientation | Layout doesn't break | Medium |
| 14 | Pinch-to-zoom | Disabled on app-like pages, enabled on content | Medium |
| 15 | Tap targets | Minimum 44x44px, no misclick zones | Critical |

**What to Expect (iOS Safari):**
- Bottom address bar may overlap fixed footers — test `safe-area-inset-bottom`
- 100vh includes address bar height — use `dvh` units
- Smooth scrolling by default, rubber-band effect at edges
- Date inputs render native date pickers
- PWA install banner appears after repeated visits

**What to Expect (Android Chrome):**
- Three-button nav or gesture nav may overlap bottom UI
- "Add to Home Screen" prompt may appear automatically
- Autofill behavior differs from desktop
- Back gesture may conflict with drawer navigation

**What to Expect (Tablet):**
- Wider viewport — verify grid layouts use available space
- Split-screen mode should still work
- Sidebars may render differently than mobile

#### 2B: PWA Installation Testing

**iOS (Safari):**
```
1. Open site in Safari
2. Tap Share icon → "Add to Home Screen"
3. Verify app name: "Fynvita - Your Financial Vitality"
4. Verify icon renders correctly (not blank/default)
5. Launch from home screen
```

**What to Expect:**
- App opens in standalone mode (no Safari chrome)
- Status bar matches theme color (#10b981)
- Splash screen shows briefly
- Navigation works without browser UI
- Back/forward via in-app navigation only
- Shortcuts ("Dashboard", "New Dispute") appear in 3D Touch/long-press menu

**Android (Chrome):**
```
1. Open site in Chrome
2. Look for "Add to Home Screen" banner OR
3. Tap three-dot menu → "Install app"
4. Verify installation dialog shows correct name and icon
5. Launch from home screen or app drawer
```

**What to Expect:**
- Install dialog shows app name and screenshots
- App appears in app drawer like native app
- Opens in standalone window (no Chrome UI)
- Recent apps shows as separate entry
- Push notification permission prompt appears

**Red Flags:**
- "Add to Home Screen" not appearing = manifest.json issue
- Blank icon = icon paths incorrect in manifest
- Still shows browser chrome = `display: standalone` not working
- No offline indication = service worker not registered

#### 2C: Offline/Network Testing

**Test Steps:**
1. Load app fully while online
2. Enable Airplane Mode
3. Navigate between cached pages
4. Try an API-dependent action (e.g., load credit score)
5. Come back online
6. Verify pending actions sync

**What to Expect:**
- Cached pages load from service worker
- Static assets (CSS, JS, images) available offline
- API requests show graceful error (not blank screen)
- "You're offline" indicator appears
- When back online, pending data syncs automatically

**Red Flags:**
- White screen on any cached page = cache strategy broken
- Infinite loading spinner = no offline fallback
- Lost data on reconnect = sync queue not working
- Stale content shown without indication = cache invalidation missing

#### 2D: Push Notification Testing

**Test Steps:**
1. Grant notification permission when prompted
2. Trigger a test notification from admin/API
3. Verify notification appears (foreground and background)
4. Tap notification — verify deep link works

**What to Expect:**
- Permission dialog appears on first visit
- Notifications show title, body, and icon
- Tapping notification opens correct page
- Badge count updates (if configured)

---

### STAGE 3: Physical Device — Mobile App Testing

**Duration:** 4-6 hours
**Devices:** 2 phones (iOS + Android), simulators for additional coverage
**Prerequisite:** Fix 94 TypeScript errors, run `expo prebuild`

#### 3A: Development Build Installation

**iOS Physical Device:**
```bash
cd /c/Githhub/Fynvita/mobile-app
eas build --profile development --platform ios
# OR for local dev client:
npx expo run:ios --device
```

**Android Physical Device:**
```bash
eas build --profile development --platform android
# Downloads .apk — install via adb or direct transfer
adb install build-xxx.apk
```

**What to Expect:**
- EAS build takes 10-30 minutes (cloud build)
- iOS requires Apple Developer account + device registration
- Android APK installs directly (enable "Unknown sources")
- Dev client shows Expo menu (shake device to open)
- Hot reload works via same WiFi network

**Red Flags:**
- iOS "Untrusted Developer" = Go to Settings → General → VPN & Device Management → Trust
- Android "App not installed" = conflicting package name or insufficient storage
- "Network request failed" = dev machine and phone not on same network
- Expo menu not appearing on shake = dev client not properly built

#### 3B: Core Functionality Testing

| # | Test | Expected Result | Priority |
|---|------|----------------|----------|
| 1 | App launch | Splash → Auth/Onboarding in < 3s | Critical |
| 2 | Login/Register | Supabase auth works, token stored securely | Critical |
| 3 | Biometric auth | Face ID / Fingerprint prompt appears | High |
| 4 | Tab navigation | All 6 tabs render and switch smoothly | Critical |
| 5 | Credit score display | Score gauge renders, data loads from API | Critical |
| 6 | Dispute list | Disputes load, pull-to-refresh works | Critical |
| 7 | Create dispute | Full wizard flow completes, saved to DB | Critical |
| 8 | Document camera | Camera opens, captures document, uploads | High |
| 9 | Document picker | File browser opens, selects and uploads | High |
| 10 | Financial overview | Charts render with real/mock data | High |
| 11 | Investment portfolio | Portfolio data loads, charts interactive | High |
| 12 | AI chat | Chat interface sends/receives messages | High |
| 13 | Push notifications | Registration succeeds, notifications received | High |
| 14 | Deep links | `fynvita.com/app/*` URLs open correct screen | Medium |
| 15 | Background fetch | App updates data when backgrounded | Medium |
| 16 | Gesture navigation | Back swipe, pull-to-refresh, swipe-to-delete | Critical |
| 17 | Keyboard handling | Inputs visible when keyboard is open, dismiss on tap | Critical |
| 18 | Scroll performance | 60fps on long lists (disputes, transactions) | Critical |
| 19 | Image loading | Lazy loading, placeholder → loaded transition | High |
| 20 | Error states | Network error, empty state, 404 all handled | High |

#### 3C: Platform-Specific Testing

**iOS-Specific:**

| Test | Expected | Notes |
|------|----------|-------|
| Face ID integration | Prompt appears, authenticates | Requires real device |
| Safe area insets | Content doesn't hide behind notch/Dynamic Island | Check all screens |
| Haptic feedback | Tactile response on key actions | iPhone 8+ |
| App Shortcuts (3D Touch) | Credit Monitor, Data Sync, Price Alert | Long-press app icon |
| Universal Links | fynvita.com URLs open app | Requires AASA file on server |
| App Store screenshot sizes | 6.5" and 5.5" layouts render correctly | For submission |
| Background app refresh | Data syncs while app is backgrounded | Check Settings → Fynvita |
| Low Power Mode | App still functions, animations may reduce | Test critical paths |

**Android-Specific:**

| Test | Expected | Notes |
|------|----------|-------|
| Fingerprint auth | Prompt appears, authenticates | BiometricPrompt API |
| Adaptive icon | Icon renders correctly with various shapes | Check launcher |
| Back button behavior | Navigates back through stack, exits on root | System back gesture too |
| Intent filters | https://fynvita.com/app/* opens app | Verify link handling |
| Split screen | App renders in half-screen mode | Check for layout breaks |
| Notification channels | Categories in system notification settings | Android 8+ |
| Different API levels | Test on Android 13 AND Android 14 | EAS config targets API 34 |
| Battery optimization | App not killed in background | Check Doze mode behavior |

#### 3D: Performance Profiling

**Tools:**
- iOS: Xcode Instruments (after `expo prebuild`)
- Android: Android Studio Profiler, Flipper
- Both: React Native Performance Monitor (dev menu)

**Metrics to Capture:**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Cold start time | < 2 seconds | Stopwatch from tap to interactive |
| Screen transition | < 300ms | Performance monitor overlay |
| List scroll FPS | 60fps constant | Performance monitor overlay |
| Memory usage | < 200MB baseline | Platform profiler |
| Memory on charts | < 350MB peak | Load financial charts, check profiler |
| API response display | < 1s from request | Network inspector |
| Image load time | < 500ms per image | Visual + network tab |
| JS bundle size | < 5MB | EAS build output |
| App binary size | < 50MB iOS, < 30MB Android | Build artifact |

**What to Expect:**
- First launch slower than subsequent (JIT compilation)
- Chart screens will use more memory than list screens
- Animations may drop frames on budget Android devices
- Background to foreground transition should be instant

**Red Flags:**
- Memory keeps climbing without releasing = memory leak
- Scroll stuttering on simple lists = unnecessary re-renders
- App crashes after extended use = memory pressure
- Battery drain > 5% per hour of active use = background task leak

---

### STAGE 4: Network Condition Testing

**Duration:** 2-3 hours
**Tools:** Chrome DevTools throttling (web), Network Link Conditioner (iOS), Charles Proxy (all)

#### Test Matrix

| Condition | Bandwidth | Latency | Test Focus |
|-----------|-----------|---------|------------|
| WiFi (baseline) | Unlimited | <50ms | Full functionality |
| 4G | 4 Mbps | 150ms | Typical mobile usage |
| 3G | 750 Kbps | 400ms | Slow network handling |
| 2G | 250 Kbps | 800ms | Graceful degradation |
| Offline | 0 | ∞ | Cached content, error states |
| Intermittent | Drops every 30s | Variable | Retry logic, data consistency |

**What to Expect per Condition:**

**4G (typical mobile):**
- Pages load in 1-3 seconds
- Images lazy-load as user scrolls
- API responses arrive within 500ms
- Streaming AI responses work but slower

**3G (slow):**
- Initial page load 5-10 seconds
- Loading skeletons visible for 2-5 seconds
- Large images may time out — need fallbacks
- AI responses may timeout (30s default)
- Pagination becomes critical (don't load 100 items)

**2G (degraded):**
- App should show loading state, not blank
- Critical data (credit score, disputes) should cache
- Non-essential features (AI chat, image gen) should show "slow network" warning
- Form submissions should queue, not fail silently

**Intermittent:**
- Requests should retry with exponential backoff
- Partial data should not corrupt state
- Optimistic UI updates should rollback on failure
- User should see sync status indicator

---

### STAGE 5: Security & Auth Testing on Devices

**Duration:** 2-3 hours
**Goal:** Verify auth flows, token handling, and data protection on real devices

#### Test Cases

| # | Test | Expected | Priority |
|---|------|----------|----------|
| 1 | Login → close app → reopen | Stays logged in (token persisted) | Critical |
| 2 | Token expiry | Graceful re-auth prompt, not crash | Critical |
| 3 | Force kill → reopen | Session restored from secure storage | Critical |
| 4 | Multiple tabs/windows (web) | Auth state consistent across tabs | High |
| 5 | Browser autofill | Login form compatible with password managers | High |
| 6 | Biometric re-auth | Prompts biometric for sensitive actions (payments) | High |
| 7 | HTTP redirect | All HTTP requests redirect to HTTPS | Critical |
| 8 | CSP headers | No inline script violations in console | High |
| 9 | Sensitive data in logs | No tokens/passwords in console output | Critical |
| 10 | Screenshot protection | Sensitive screens blocked from screenshots (mobile) | Medium |
| 11 | Copy/paste on inputs | Password fields don't allow copy | Medium |
| 12 | Rate limiting | Rapid login attempts get throttled (429) | High |

---

### STAGE 6: Accessibility Testing

**Duration:** 2-3 hours
**Tools:** VoiceOver (iOS), TalkBack (Android), Lighthouse (web)

#### Test Cases

| # | Test | Expected | Priority |
|---|------|----------|----------|
| 1 | VoiceOver navigation (iOS) | All interactive elements announced | Critical |
| 2 | TalkBack navigation (Android) | All interactive elements announced | Critical |
| 3 | Screen reader on forms | Labels read for every input field | Critical |
| 4 | Color contrast | WCAG AA (4.5:1 text, 3:1 large text) | Critical |
| 5 | Font scaling (200%) | Layout doesn't break, text readable | High |
| 6 | Reduce Motion | Animations disabled when system pref set | Medium |
| 7 | Dynamic Type (iOS) | Text scales with system font size | High |
| 8 | Focus indicators | Visible focus ring on all interactive elements | High |
| 9 | Error announcements | Screen reader announces form validation errors | High |
| 10 | Chart accessibility | Charts have text alternatives or data tables | Medium |

**What to Expect:**
- React Native's `accessibilityLabel` props should announce elements
- Web's `aria-*` attributes should guide screen readers
- Charts are the hardest to make accessible — may need data table fallback
- Form errors should use `aria-live="assertive"` or `accessibilityLiveRegion`

---

### STAGE 7: Pre-Release Validation

**Duration:** 1-2 days
**Goal:** Full regression on release candidates

#### 7A: Web — Vercel Preview Deploy

```bash
vercel --prod
# OR staging:
vercel
```

**Verification:**
1. Lighthouse audit: Performance > 70, Accessibility > 90, Best Practices > 90
2. All critical user journeys work (signup → dashboard → dispute → payment)
3. Stripe test mode checkout completes
4. Email notifications sent via Resend
5. Document upload to S3 succeeds
6. PWA installs and works offline

#### 7B: Mobile — EAS Preview Build

```bash
cd mobile-app
eas build --profile preview --platform all
```

**Verification:**
1. Install preview build on physical devices
2. Full onboarding flow completes
3. All 6 tabs load with data
4. Push notification registration succeeds
5. Deep links resolve correctly
6. Background fetch executes
7. Biometric auth works
8. App doesn't crash after 30 minutes of active use

#### 7C: Cross-Platform Consistency

| Feature | Web | PWA | iOS | Android | Should Match? |
|---------|-----|-----|-----|---------|---------------|
| Credit score display | Test | Test | Test | Test | Yes |
| Dispute list | Test | Test | Test | Test | Yes (data) |
| Chart rendering | Test | Test | Test | Test | Visually similar |
| Navigation structure | Test | Test | Test | Test | Same hierarchy |
| Dark mode | Test | Test | Test | Test | Yes |
| Notifications | Test | Test | Test | Test | Same content |
| Payment flow | Test | N/A | Test | Test | Same flow |

---

## 5. Debugging Toolkit

### Web Debugging

| Tool | Purpose | When to Use |
|------|---------|-------------|
| Chrome DevTools | DOM, Network, Console, Performance | Always |
| React DevTools | Component tree, state, hooks | Component issues |
| Lighthouse | Performance, A11y, PWA audits | Pre-release |
| Network tab (Slow 3G) | Throttled performance | Network testing |
| Application tab | Service worker, cache, storage | PWA debugging |
| `next dev --turbo` | Fast dev server | Local development |

### Mobile Debugging

| Tool | Purpose | When to Use |
|------|---------|-------------|
| Expo Dev Menu | JS logs, performance overlay, element inspector | Always |
| Flipper | Network, layout, database inspection | Deep debugging |
| Xcode Console | iOS native logs, crashes | iOS-specific issues |
| Android Logcat | Android native logs, crashes | Android-specific issues |
| React Native Debugger | Chrome DevTools + React DevTools | State/network |
| `expo start --dev-client` | Custom dev client with native modules | Native module issues |
| `adb logcat` | Raw Android system logs | Crash investigation |

### Common Debug Commands

```bash
# Web — check build output
npm run build 2>&1 | grep -i error

# Web — check TypeScript
npx tsc --noEmit

# Web — run specific test
npm test -- --testPathPattern="dispute"

# Mobile — check TypeScript
cd mobile-app && npx tsc --noEmit

# Mobile — clear cache and restart
cd mobile-app && npx expo start -c

# Mobile — generate native projects
cd mobile-app && npx expo prebuild --clean

# Mobile — install on connected Android device
adb install path/to/app.apk

# Mobile — view Android logs
adb logcat | grep -i "fynvita\|ReactNative\|ExpoModules"

# Mobile — view iOS logs (requires Xcode)
xcrun simctl spawn booted log stream --predicate 'process == "Fynvita"'
```

---

## 6. Issue Tracking Template

When logging bugs during physical device testing, use this format:

```
## Bug: [Short title]

**Platform:** iOS / Android / Web / PWA
**Device:** iPhone 15 Pro / Samsung Galaxy S24 / etc.
**OS Version:** iOS 17.4 / Android 14 / Chrome 122
**Screen:** /dashboard / Credit tab / etc.
**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1. Open the app
2. Navigate to X
3. Tap on Y
4. Observe Z

**Expected:** What should happen
**Actual:** What happened instead

**Screenshots/Video:** [attach]
**Console Logs:** [paste relevant errors]
**Network Requests:** [failing request details if applicable]
```

---

## 7. Testing Priority Order

```
Phase 1 (BLOCKERS):
  [1] Fix 94 mobile TS errors
  [2] Run expo prebuild
  [3] Verify web prod build deploys clean

Phase 2 (WEB/PWA — immediate):
  [4] Mobile browser testing (iOS Safari + Android Chrome)
  [5] PWA install + offline testing
  [6] Responsive layout validation
  [7] Push notification flow

Phase 3 (MOBILE — after TS fixes):
  [8] EAS dev build → install on devices
  [9] Core navigation + auth flow
  [10] Feature testing (disputes, credit, financial)
  [11] Camera/document upload
  [12] Biometric auth

Phase 4 (QUALITY):
  [13] Network condition testing
  [14] Security validation
  [15] Accessibility audit
  [16] Performance profiling
  [17] Cross-platform consistency

Phase 5 (RELEASE):
  [18] Preview builds for stakeholder review
  [19] Production builds
  [20] Store submission (iOS App Store + Google Play)
```

---

## 8. Success Criteria

The app is ready for public release when:

- [ ] 0 TypeScript errors on all platforms
- [ ] All critical test cases pass on 2+ physical devices per platform
- [ ] Lighthouse Performance > 70, Accessibility > 90
- [ ] Cold start < 3s on mobile, < 2s on web
- [ ] No crashes during 1-hour continuous use session
- [ ] Offline mode gracefully degrades
- [ ] Push notifications work on iOS and Android
- [ ] PWA installs and works correctly
- [ ] All auth flows work (login, register, biometric, token refresh)
- [ ] Payment flow completes in test mode
- [ ] Accessibility audit passes WCAG AA
- [ ] No security vulnerabilities in auth/token handling

---

*Generated: February 15, 2026*
*Platform: Fynvita v1.0.0*
