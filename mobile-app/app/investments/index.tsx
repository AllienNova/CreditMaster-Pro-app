/**
 * /investments — re-exports the tab screen.
 *
 * This file and app/(tabs)/investments.tsx both resolve to /investments, since
 * a route group "(x)" is not part of the url. The tab one wins, so the ~625
 * lines that used to be here never rendered.
 *
 * Establishing which was canonical was evidence, not a coin toss. The two were
 * near-identical; this file's only extras were an empty state reading "No
 * holdings yet / Add Holding" instead of "No investments yet / Browse Stocks",
 * and subscriptions to selectInvestmentLoading / selectInvestmentError that
 * eslint confirms were declared and never used. The tab version additionally
 * links to /trading. So nothing user-facing was lost by keeping the tab.
 *
 * Re-exported rather than deleted: removing a module needs a named owner's
 * approval, and this way which route wins stops mattering.
 *
 * Worth its own fix, and NOT done here: the surviving screen has no loading or
 * error state at all — a failed holdings fetch renders the empty state, which
 * reads as "you own nothing" rather than "we could not load this".
 */

export { default } from "../(tabs)/investments";
