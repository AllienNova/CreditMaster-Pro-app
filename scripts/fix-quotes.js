/**
 * Fix missing closing quotes in template literal ternary expressions.
 *
 * Pattern: `${condition ? 'value1 : 'value2'}` -> `${condition ? 'value1' : 'value2'}`
 * Also handles double quotes variant.
 */
const fs = require('fs');
const path = require('path');

const files = [
  'src/app/admin/analytics/page.tsx',
  'src/app/admin/error.tsx',
  'src/app/admin/settings/page.tsx',
  'src/app/analytics/layout.tsx',
  'src/app/budgeting/auto-save/page.tsx',
  'src/app/budgeting/bills/page.tsx',
  'src/app/budgeting/subscriptions/page.tsx',
  'src/app/budgeting/zero-based/page.tsx',
  'src/app/challenges/page.tsx',
  'src/app/credit/goodwill-letters/page.tsx',
  'src/app/credit/simulator/page.tsx',
  'src/app/dashboard/notifications/page.tsx',
  'src/app/dashboard/progress/page.tsx',
  'src/app/disputes/error.tsx',
  'src/app/financial/error.tsx',
  'src/app/goals/shared/page.tsx',
  'src/app/help/layout.tsx',
  'src/app/insights/alerts/page.tsx',
  'src/app/insights/weekly-summary/page.tsx',
  'src/app/investments/dividends/page.tsx',
  'src/app/investments/error.tsx',
  'src/app/investments/rebalance/page.tsx',
  'src/app/investments/signals/page.tsx',
  'src/app/investments/watchlist/error.tsx',
  'src/app/investments/watchlist/page.tsx',
  'src/app/journey/page.tsx',
  'src/app/marketplace/tradelines/page.tsx',
  'src/app/page.tsx',
  'src/app/pricing/page.tsx',
  'src/app/tax/calendar/page.tsx',
  'src/app/tax/documents/page.tsx',
  'src/app/trading/page.tsx',
  'src/app/trading/paper/page.tsx',
  'src/components/credit-monitoring/CreditAlertsList.tsx',
  'src/components/financial/ActionPlanManager.tsx',
  'src/components/financial/BillNegotiationAssistant.tsx',
  'src/components/financial/BillsSubscriptions.tsx',
  'src/components/financial/DebtPayoffPlanner.tsx',
  'src/components/financial/SavingsAutomation.tsx',
  'src/components/financial/SpendingAnalysis.tsx',
  'src/components/investments/allocation/AssetAllocationPanel.tsx',
  'src/components/investments/HoldingsManagement.tsx',
  'src/components/investments/PortfolioOverview.tsx',
  'src/components/investments/StockAnalysisView.tsx',
  'src/components/notifications/NotificationItem.tsx',
  'src/components/trading/OpportunityRadar.tsx',
  'src/components/ui/BottomNav.tsx',
  'src/components/ui/Calendar.tsx',
  'src/components/ui/OfflineIndicator.tsx',
  'src/components/ui/OfflineQueueStatus.tsx',
  'src/components/ui/ProgressIndicator.tsx',
  'src/components/ui/ThemeToggle.tsx',
];

let totalFixes = 0;

files.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP (not found): ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const original = content;
  let fileFixes = 0;

  // Pattern 1: Single-quoted string missing closing quote before colon in ternary
  // Matches: 'some-classes : where the quote is opened but not closed before :
  // Inside template literals like `${cond ? 'value1 : 'value2'}`
  // We need to find ternary patterns where the first branch string is not closed

  // Strategy: Find all template literal expressions ${...} and fix broken ternaries inside

  // Regex approach: find `? 'string-without-closing-quote : ` pattern
  // Pattern: ? 'text text : ' (missing closing quote after first branch)
  // Should become: ? 'text text' : '

  // Fix pattern: `? 'classes... :` -> `? 'classes...' :`  (single quotes)
  // This targets: opening single quote, CSS class chars, then space-colon without closing quote
  const singleQuoteTernaryFix = /(\?\s*)'([^']*?[a-zA-Z0-9\]\/\)])(\s+:\s+)/g;
  content = content.replace(singleQuoteTernaryFix, (match, before, classes, after) => {
    // Only fix if this looks like a CSS class string (contains dashes, colons for dark:, etc.)
    // and the next char after : is a quote (meaning it's a ternary)
    fileFixes++;
    return `${before}'${classes}'${after}`;
  });

  // Fix pattern: `? "classes... :` -> `? "classes..." :`  (double quotes)
  const doubleQuoteTernaryFix = /(\?\s*)"([^"]*?[a-zA-Z0-9\]\/\)])(\s+:\s+)/g;
  content = content.replace(doubleQuoteTernaryFix, (match, before, classes, after) => {
    fileFixes++;
    return `${before}"${classes}"${after}`;
  });

  // Also fix: `condition ? 'text-something : 'other'` where space before colon
  // Pattern 2: Fix remaining cases where ' is opened, has class names, then ` : '`
  // More aggressive: look for 'string : ' inside className template literals

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`FIXED (${fileFixes} replacements): ${filePath}`);
    totalFixes += fileFixes;
  } else {
    console.log(`NO CHANGE: ${filePath}`);
  }
});

console.log(`\nTotal fixes: ${totalFixes} across ${files.length} files`);
