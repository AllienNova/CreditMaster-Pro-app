/**
 * Coerce an API payload field into an array before it enters a store.
 *
 * WHY THIS EXISTS. Stores declare fields as `T[]` and initialise them to `[]`,
 * then write the API response straight in:
 *
 *   set({ accounts: response.data.accounts })
 *
 * If the payload does not carry that key — a shape change, an error body, an
 * empty result serialised differently — the field becomes `undefined` while its
 * type still says `T[]`. Every screen that reads it then crashes on the first
 * `.length` or `.map`, and React's ErrorBoundary replaces the entire tab.
 *
 * That is not hypothetical. Driving the app on a simulator, three of six tabs
 * died this way:
 *
 *   Money    TypeError: Cannot read property 'length' of undefined  (FinancialScreen)
 *   Invest   same class
 *   Profile  same class
 *
 * Guarding at each call site does not hold — the next screen to read the field
 * reintroduces it. Coercing on the way IN means the store's declared type is
 * true for every reader, which is what the type was always claiming.
 *
 * An absent list and an empty list are deliberately treated the same: both mean
 * "nothing to show". Distinguishing "failed to load" belongs in the error flag
 * the stores already carry, not in a field typed as an array.
 */
export function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
