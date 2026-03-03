/**
 * @jest-environment jsdom
 */

import { describe, it, expect } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";

import BillReminderTemplate from "../templates/BillReminderTemplate";
import type { BillReminderTemplateProps } from "../templates/BillReminderTemplate";
import WeeklyDigestTemplate from "../templates/WeeklyDigestTemplate";
import type { WeeklyDigestTemplateProps } from "../templates/WeeklyDigestTemplate";
import TradingAlertTemplate from "../templates/TradingAlertTemplate";
import type { TradingAlertTemplateProps } from "../templates/TradingAlertTemplate";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

// ---------------------------------------------------------------------------
// BillReminderTemplate
// ---------------------------------------------------------------------------

describe("BillReminderTemplate", () => {
  const baseProps: BillReminderTemplateProps = {
    name: "Jane",
    billName: "Netflix",
    amount: 15.99,
    currency: "USD",
    dueDate: "2026-03-05",
    accountName: "Chase Checking",
    daysUntilDue: 3,
    autopayEnabled: false,
    dashboardUrl: "https://fynvita.com/dashboard",
  };

  it("renders the bill reminder with all required fields", () => {
    const html = render(BillReminderTemplate(baseProps));

    expect(html).toContain("Bill Payment Reminder");
    expect(html).toContain("Jane");
    expect(html).toContain("Netflix");
    expect(html).toContain("$15.99");
    expect(html).toContain("2026-03-05");
    expect(html).toContain("Chase Checking");
  });

  it("renders urgency label for due in 3 days", () => {
    const html = render(BillReminderTemplate({ ...baseProps, daysUntilDue: 3 }));
    expect(html).toContain("Due in 3 days");
  });

  it("renders urgency label for due tomorrow", () => {
    const html = render(BillReminderTemplate({ ...baseProps, daysUntilDue: 1 }));
    expect(html).toContain("Due Tomorrow");
  });

  it("renders urgency label for due today", () => {
    const html = render(BillReminderTemplate({ ...baseProps, daysUntilDue: 0 }));
    expect(html).toContain("Due Today");
  });

  it("shows autopay warning when autopay is disabled", () => {
    const html = render(BillReminderTemplate({ ...baseProps, autopayEnabled: false }));
    expect(html).toContain("Not Enabled");
    expect(html).toContain("Autopay is not enabled for this bill");
  });

  it("shows autopay confirmation when autopay is enabled", () => {
    const html = render(BillReminderTemplate({ ...baseProps, autopayEnabled: true }));
    expect(html).toContain("Enabled");
    expect(html).toContain("Autopay is enabled");
    expect(html).toContain("sufficient funds");
  });

  it("includes the bills dashboard link", () => {
    const html = render(BillReminderTemplate(baseProps));
    expect(html).toContain("https://fynvita.com/dashboard/bills");
    expect(html).toContain("View Bills Dashboard");
  });

  it("includes the Fynvita footer", () => {
    const html = render(BillReminderTemplate(baseProps));
    expect(html).toContain("Fynvita");
    expect(html).toContain("All rights reserved");
  });

  it("formats amounts in the specified currency", () => {
    const html = render(
      BillReminderTemplate({ ...baseProps, amount: 1299.5, currency: "USD" }),
    );
    expect(html).toContain("$1,299.50");
  });

  it("renders correctly with large daysUntilDue", () => {
    const html = render(
      BillReminderTemplate({ ...baseProps, daysUntilDue: 30 }),
    );
    expect(html).toContain("Due in 30 days");
  });
});

// ---------------------------------------------------------------------------
// WeeklyDigestTemplate
// ---------------------------------------------------------------------------

describe("WeeklyDigestTemplate", () => {
  const baseProps: WeeklyDigestTemplateProps = {
    name: "John",
    weekStartDate: "Feb 24, 2026",
    weekEndDate: "Mar 2, 2026",
    totalSpending: 1250.0,
    totalSavings: 350.0,
    currency: "USD",
    spendingChange: -5.3,
    topCategories: [
      { name: "Groceries", spent: 320, budget: 400, currency: "USD" },
      { name: "Dining Out", spent: 180, budget: 150, currency: "USD" },
      { name: "Transportation", spent: 95, budget: 200, currency: "USD" },
    ],
    budgetStatus: "on_track",
    budgetUtilization: 72,
    tips: [
      "Consider meal prepping to reduce dining out expenses.",
      "Your transportation spending is well under budget this week.",
    ],
    dashboardUrl: "https://fynvita.com/dashboard",
  };

  it("renders the weekly digest with all required fields", () => {
    const html = render(WeeklyDigestTemplate(baseProps));

    expect(html).toContain("Your Weekly Financial Summary");
    expect(html).toContain("John");
    expect(html).toContain("Feb 24, 2026");
    expect(html).toContain("Mar 2, 2026");
    expect(html).toContain("$1,250.00");
    expect(html).toContain("$350.00");
  });

  it("shows negative spending change in green", () => {
    const html = render(WeeklyDigestTemplate(baseProps));
    // Negative change is good (spending decreased)
    expect(html).toContain("-5.3%");
    expect(html).toContain("vs last week");
  });

  it("shows positive spending change", () => {
    const html = render(
      WeeklyDigestTemplate({ ...baseProps, spendingChange: 12.5 }),
    );
    expect(html).toContain("+12.5%");
  });

  it("renders on_track budget status", () => {
    const html = render(
      WeeklyDigestTemplate({ ...baseProps, budgetStatus: "on_track" }),
    );
    expect(html).toContain("On Track");
    expect(html).toContain("72%");
  });

  it("renders over_budget status", () => {
    const html = render(
      WeeklyDigestTemplate({
        ...baseProps,
        budgetStatus: "over_budget",
        budgetUtilization: 115,
      }),
    );
    expect(html).toContain("Over Budget");
    expect(html).toContain("115%");
  });

  it("renders under_budget status", () => {
    const html = render(
      WeeklyDigestTemplate({
        ...baseProps,
        budgetStatus: "under_budget",
        budgetUtilization: 45,
      }),
    );
    expect(html).toContain("Under Budget");
    expect(html).toContain("45%");
  });

  it("renders top spending categories with amounts", () => {
    const html = render(WeeklyDigestTemplate(baseProps));

    expect(html).toContain("Top Spending Categories");
    expect(html).toContain("Groceries");
    expect(html).toContain("$320.00");
    expect(html).toContain("$400.00");
    expect(html).toContain("Dining Out");
    expect(html).toContain("$180.00");
    expect(html).toContain("Transportation");
  });

  it("renders financial tips", () => {
    const html = render(WeeklyDigestTemplate(baseProps));

    expect(html).toContain("Financial Tips for You");
    expect(html).toContain("Consider meal prepping");
    expect(html).toContain("transportation spending is well under budget");
  });

  it("renders without categories when empty", () => {
    const html = render(
      WeeklyDigestTemplate({ ...baseProps, topCategories: [] }),
    );
    expect(html).not.toContain("Top Spending Categories");
  });

  it("renders without tips when empty", () => {
    const html = render(WeeklyDigestTemplate({ ...baseProps, tips: [] }));
    expect(html).not.toContain("Financial Tips for You");
  });

  it("includes the dashboard link", () => {
    const html = render(WeeklyDigestTemplate(baseProps));
    expect(html).toContain("https://fynvita.com/dashboard");
    expect(html).toContain("View Full Dashboard");
  });

  it("includes the Fynvita footer", () => {
    const html = render(WeeklyDigestTemplate(baseProps));
    expect(html).toContain("Fynvita");
    expect(html).toContain("All rights reserved");
  });
});

// ---------------------------------------------------------------------------
// TradingAlertTemplate
// ---------------------------------------------------------------------------

describe("TradingAlertTemplate", () => {
  const baseSignalProps: TradingAlertTemplateProps = {
    name: "Alex",
    alertType: "signal",
    symbol: "AAPL",
    companyName: "Apple Inc.",
    currentPrice: 187.45,
    currency: "USD",
    dashboardUrl: "https://fynvita.com/dashboard",
    signalDirection: "buy",
    signalConfidence: 85,
    signalStrategy: "PCTT Pivot Breakout",
    timestamp: "2026-02-28 14:30:00 UTC",
  };

  const basePriceAlertProps: TradingAlertTemplateProps = {
    name: "Alex",
    alertType: "price_alert",
    symbol: "TSLA",
    companyName: "Tesla, Inc.",
    currentPrice: 245.6,
    currency: "USD",
    dashboardUrl: "https://fynvita.com/dashboard",
    targetPrice: 240.0,
    priceDirection: "above",
    timestamp: "2026-02-28 15:00:00 UTC",
  };

  const basePositionProps: TradingAlertTemplateProps = {
    name: "Alex",
    alertType: "position_update",
    symbol: "MSFT",
    companyName: "Microsoft Corporation",
    currentPrice: 415.2,
    currency: "USD",
    dashboardUrl: "https://fynvita.com/dashboard",
    positionAction: "Stop Loss Triggered",
    positionQuantity: 50,
    positionPnl: -325.0,
    positionPnlPercentage: -1.56,
    timestamp: "2026-02-28 16:00:00 UTC",
  };

  // --- Signal alerts ---

  it("renders signal alert with all fields", () => {
    const html = render(TradingAlertTemplate(baseSignalProps));

    expect(html).toContain("Trading Signal Alert");
    expect(html).toContain("Alex");
    expect(html).toContain("AAPL");
    expect(html).toContain("Apple Inc.");
    expect(html).toContain("$187.45");
    expect(html).toContain("BUY");
    expect(html).toContain("85%");
    expect(html).toContain("PCTT Pivot Breakout");
  });

  it("renders sell signal direction", () => {
    const html = render(
      TradingAlertTemplate({ ...baseSignalProps, signalDirection: "sell" }),
    );
    expect(html).toContain("SELL");
  });

  it("renders hold signal direction", () => {
    const html = render(
      TradingAlertTemplate({ ...baseSignalProps, signalDirection: "hold" }),
    );
    expect(html).toContain("HOLD");
  });

  it("renders signal without optional strategy", () => {
    const html = render(
      TradingAlertTemplate({
        ...baseSignalProps,
        signalStrategy: undefined,
      }),
    );
    expect(html).toContain("BUY");
    expect(html).not.toContain("Strategy:");
  });

  it("renders signal without optional confidence", () => {
    const html = render(
      TradingAlertTemplate({
        ...baseSignalProps,
        signalConfidence: undefined,
      }),
    );
    expect(html).toContain("BUY");
    expect(html).not.toContain("Confidence:");
  });

  // --- Price alerts ---

  it("renders price alert with target price", () => {
    const html = render(TradingAlertTemplate(basePriceAlertProps));

    expect(html).toContain("Price Alert Triggered");
    expect(html).toContain("TSLA");
    expect(html).toContain("Tesla, Inc.");
    expect(html).toContain("$245.60");
    expect(html).toContain("above");
    expect(html).toContain("$240.00");
  });

  it("renders price alert for below direction", () => {
    const html = render(
      TradingAlertTemplate({
        ...basePriceAlertProps,
        priceDirection: "below",
        currentPrice: 235.0,
      }),
    );
    expect(html).toContain("below");
    expect(html).toContain("$235.00");
  });

  // --- Position updates ---

  it("renders position update with P&L", () => {
    const html = render(TradingAlertTemplate(basePositionProps));

    expect(html).toContain("Position Update");
    expect(html).toContain("MSFT");
    expect(html).toContain("Microsoft Corporation");
    expect(html).toContain("Stop Loss Triggered");
    expect(html).toContain("50");
    expect(html).toContain("-$325.00");
    expect(html).toContain("-1.56%");
  });

  it("renders positive P&L with plus prefix", () => {
    const html = render(
      TradingAlertTemplate({
        ...basePositionProps,
        positionPnl: 1250.75,
        positionPnlPercentage: 6.02,
        positionAction: "Take Profit Hit",
      }),
    );
    expect(html).toContain("+$1,250.75");
    expect(html).toContain("+6.02%");
    expect(html).toContain("Take Profit Hit");
  });

  it("renders position update without optional fields", () => {
    const html = render(
      TradingAlertTemplate({
        ...basePositionProps,
        positionAction: undefined,
        positionQuantity: undefined,
        positionPnl: undefined,
        positionPnlPercentage: undefined,
      }),
    );
    expect(html).toContain("Position Update");
    expect(html).toContain("MSFT");
    expect(html).not.toContain("Action:");
    expect(html).not.toContain("Quantity:");
  });

  // --- Common elements ---

  it("includes timestamp on all alert types", () => {
    const signalHtml = render(TradingAlertTemplate(baseSignalProps));
    const priceHtml = render(TradingAlertTemplate(basePriceAlertProps));
    const positionHtml = render(TradingAlertTemplate(basePositionProps));

    expect(signalHtml).toContain("2026-02-28 14:30:00 UTC");
    expect(priceHtml).toContain("2026-02-28 15:00:00 UTC");
    expect(positionHtml).toContain("2026-02-28 16:00:00 UTC");
  });

  it("includes the disclaimer on all alert types", () => {
    const html = render(TradingAlertTemplate(baseSignalProps));
    expect(html).toContain("informational purposes only");
    expect(html).toContain("does not constitute financial advice");
  });

  it("includes the investments dashboard link", () => {
    const html = render(TradingAlertTemplate(baseSignalProps));
    expect(html).toContain("https://fynvita.com/dashboard/investments");
    expect(html).toContain("View Investments");
  });

  it("includes the Fynvita footer", () => {
    const html = render(TradingAlertTemplate(baseSignalProps));
    expect(html).toContain("Fynvita");
    expect(html).toContain("All rights reserved");
  });

  it("formats currency amounts correctly", () => {
    const html = render(
      TradingAlertTemplate({
        ...baseSignalProps,
        currentPrice: 1234.56,
      }),
    );
    expect(html).toContain("$1,234.56");
  });
});
