/**
 * The application's primary navigation.
 *
 * WHY THIS EXISTS. Before it, `src/app/layout.tsx` rendered only `<Providers>`
 * — no navigation chrome anywhere in the authenticated app. `<Header>` was
 * mounted on three marketing pages; `BottomNav` and `MobileNav` existed and
 * were rendered by nothing. The result: 39 of 204 pages were reachable by
 * clicking, and 165 built pages — the whole of trading, investing, chat, tax
 * and marketplace — could only be reached by typing a URL.
 *
 * That is why audit:links stayed green throughout. It proves every LINK
 * resolves to a page; it cannot see a page with no link pointing AT it,
 * because such a page is not in its input. `audit:reachability` closes that.
 *
 * EVERY href BELOW IS A ROUTE THAT EXISTS. Verified against src/app/**'s
 * page.tsx files at authoring time and enforced on every run by audit:links.
 * Detail routes (`/foo/[id]`) are deliberately absent: they are reached from
 * their list page, and a nav entry cannot supply an id.
 */

export interface NavItem {
  label: string;
  href: string;
}

export interface NavGroup {
  /** Group heading shown in the sidebar. */
  label: string;
  /** lucide-react icon name, resolved by the Sidebar component. */
  icon: string;
  items: NavItem[];
}

export const PRIMARY_NAV: readonly NavGroup[] = [
  {
    label: "Overview",
    icon: "LayoutDashboard",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Financial vitality", href: "/dashboard/vitality" },
      { label: "Analytics", href: "/analytics" },
      { label: "Insights", href: "/insights" },
      { label: "Progress", href: "/dashboard/progress" },
      { label: "Notifications", href: "/dashboard/notifications" },
      { label: "Reports", href: "/dashboard/reports" },
      { label: "Documents", href: "/dashboard/documents" },
      { label: "Journey", href: "/journey" },
      { label: "Alerts", href: "/insights/alerts" },
      { label: "Weekly summary", href: "/insights/weekly-summary" },
      { label: "Dashboard analytics", href: "/dashboard/analytics" },
    ],
  },
  {
    label: "Credit",
    icon: "Gauge",
    items: [
      { label: "Credit overview", href: "/credit" },
      { label: "Score factors", href: "/credit/factors" },
      { label: "Score simulator", href: "/credit/simulator" },
      { label: "Credit builder", href: "/credit-builder" },
      { label: "Credit repair", href: "/credit-repair" },
      { label: "Disputes", href: "/disputes" },
      { label: "Monitoring", href: "/dashboard/monitoring" },
      { label: "Identity protection", href: "/identity" },
      { label: "Credit reports", href: "/credit-reports" },
      { label: "Credit monitoring", href: "/credit-monitoring" },
      { label: "Goodwill letters", href: "/credit/goodwill-letters" },
      { label: "Secured cards", href: "/credit/secured-cards" },
      { label: "Utilization", href: "/credit-builder/utilization" },
      { label: "Payment history", href: "/credit-builder/payments" },
      { label: "Credit mix", href: "/credit-builder/mix" },
      { label: "Credit age", href: "/credit-builder/age" },
      { label: "Dispute wizard", href: "/disputes/wizard" },
      { label: "Student loan disputes", href: "/disputes/student-loans" },
      { label: "Freeze credit", href: "/credit-builder/freeze" },
      { label: "Goodwill", href: "/credit-builder/goodwill" },
      { label: "Identity theft", href: "/credit-builder/identity-theft" },
      { label: "Pay for delete", href: "/credit-builder/pay-for-delete" },
      { label: "Debt strategy", href: "/credit-builder/debt-strategy" },
      { label: "Builder budget", href: "/credit-builder/budget" },
      { label: "Builder simulator", href: "/credit-builder/simulator" },
      { label: "Upload report", href: "/credit-builder/reports/upload" },
    ],
  },
  {
    label: "Financial",
    icon: "Wallet",
    items: [
      { label: "Financial hub", href: "/financial" },
      { label: "Accounts", href: "/financial/accounts" },
      { label: "Transactions", href: "/financial/transactions" },
      { label: "Budgets", href: "/financial/budget" },
      { label: "Bills", href: "/financial/bills" },
      { label: "Goals", href: "/financial/goals" },
      { label: "Savings", href: "/financial/savings" },
      { label: "Debt", href: "/financial/debt" },
      { label: "Income", href: "/financial/income" },
      { label: "Spending", href: "/financial/spending" },
      { label: "Net worth", href: "/financial/net-worth" },
      { label: "Cash flow", href: "/financial/cash-flow" },
      { label: "Budgeting", href: "/budgeting" },
      { label: "Zero-based budget", href: "/budgeting/zero-based" },
      { label: "Auto-save", href: "/budgeting/auto-save" },
      { label: "Subscriptions", href: "/budgeting/subscriptions" },
      { label: "Smart budget", href: "/financial/smart-budget" },
      { label: "Real estate", href: "/financial/real-estate" },
      { label: "Crypto", href: "/financial/crypto" },
      { label: "Reports", href: "/financial/reports" },
      { label: "Student loans", href: "/student-loans" },
      { label: "Coach budget", href: "/financial/coach/budget" },
      { label: "Debt payoff plan", href: "/financial/coach/debt-payoff" },
      { label: "Coach goals", href: "/financial/coach/goals" },
      { label: "Financial settings", href: "/financial/settings" },
      { label: "Investments overview", href: "/financial/investments" },
    ],
  },
  {
    label: "Investing & Trading",
    icon: "TrendingUp",
    items: [
      { label: "Portfolio", href: "/investments" },
      { label: "Holdings", href: "/investments/holdings" },
      { label: "Watchlist", href: "/investments/watchlist" },
      { label: "Signals", href: "/investments/signals" },
      { label: "Research", href: "/investments/research" },
      { label: "Performance", href: "/investments/performance" },
      { label: "Rebalance", href: "/investments/rebalance" },
      { label: "Dividends", href: "/investments/dividends" },
      { label: "Trading", href: "/trading" },
      { label: "Paper trading", href: "/trading/paper" },
      { label: "Backtest", href: "/trading/backtest" },
      { label: "Strategies", href: "/trading/strategies" },
      { label: "Trade journal", href: "/trading/journal" },
      { label: "Add holding", href: "/investments/add-holding" },
      { label: "Deep analysis", href: "/investments/comprehensive-analysis" },
      { label: "Investment analytics", href: "/investments/analytics" },
    ],
  },
  {
    label: "Tax",
    icon: "Receipt",
    items: [
      { label: "Tax overview", href: "/tax" },
      { label: "Documents", href: "/tax/documents" },
      { label: "Scenarios", href: "/tax/scenarios" },
      { label: "Calendar", href: "/tax/calendar" },
    ],
  },
  {
    label: "Marketplace",
    icon: "Store",
    items: [
      { label: "Browse", href: "/marketplace" },
      { label: "Credit cards", href: "/recommendations/credit-cards" },
      { label: "Loans", href: "/marketplace/loans" },
      { label: "Secured cards", href: "/marketplace/secured-cards" },
      { label: "Tradelines", href: "/marketplace/tradelines" },
      { label: "Coaching", href: "/marketplace/coaching" },
      { label: "Attorneys", href: "/marketplace/attorneys" },
      { label: "Calculators", href: "/marketplace/calculators" },
    ],
  },
  {
    label: "AI",
    icon: "Sparkles",
    items: [
      { label: "Chat", href: "/chat" },
      { label: "Financial coach", href: "/financial/coach" },
      { label: "Action plan", href: "/financial/coach/action-plan" },
      { label: "Recommendations", href: "/recommendations" },
      { label: "AI tools", href: "/ai-tools" },
      { label: "Financial intelligence", href: "/financial-intelligence" },
      { label: "Dashboard chat", href: "/dashboard/chat" },
      { label: "AI strategies", href: "/ai-strategies" },
      { label: "Experts", href: "/experts" },
      { label: "Persona features", href: "/persona-features" },
      { label: "Coach recommendations", href: "/financial/coach/recommendations" },
    ],
  },
  {
    label: "Rewards",
    icon: "Trophy",
    items: [
      { label: "Rewards", href: "/rewards" },
      { label: "Badges", href: "/badges" },
      { label: "Challenges", href: "/challenges" },
      { label: "Leaderboard", href: "/leaderboard" },
      { label: "Shared goals", href: "/goals/shared" },
    ],
  },
  {
    label: "Account",
    icon: "Settings",
    items: [
      { label: "Settings", href: "/settings" },
      { label: "Profile", href: "/settings/profile" },
      { label: "Security", href: "/settings/security" },
      { label: "Connected accounts", href: "/settings/connected-accounts" },
      { label: "Billing", href: "/billing" },
      { label: "AI credits", href: "/settings/credits" },
      { label: "Documents", href: "/documents" },
      { label: "Help", href: "/help" },
      { label: "Profile", href: "/profile" },
      { label: "Notifications", href: "/notifications" },
      { label: "Notification settings", href: "/settings/notifications" },
      { label: "Privacy", href: "/settings/privacy" },
      { label: "Dashboard settings", href: "/dashboard/settings" },
      { label: "Subscriptions", href: "/subscriptions" },
    ],
  },
] as const;

/** Every href in the nav, for the reachability gate and tests. */
export const NAV_HREFS: readonly string[] = PRIMARY_NAV.flatMap((g) =>
  g.items.map((i) => i.href),
);
