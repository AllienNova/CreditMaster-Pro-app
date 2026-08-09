/**
 * Credit Score Simulator — de-fabricated (DEFAB-2 / ADR-0009).
 *
 * This page used to fabricate a projected credit score: a table of invented
 * per-action point impacts (pay-down-debt, credit-limit, authorized-user,
 * late-payment removal, utilization ...) summed into
 * projectedScore = clamp(currentScore + scoreChange, 300, 850) and rendered as a
 * specific "Projected" number, a signed "+N points" delta, a fabricated
 * confidence %, per-factor "+N pts" labels, and a time-to-achieve estimate.
 * FICO/VantageScore impacts are individualized and not precisely predictable, so
 * presenting invented point outcomes as a prediction is fabrication (FCRA/UDAAP
 * exposure). All of that — the impact table, the projected-score math, the
 * score/confidence cards, and every per-action point label — was removed.
 *
 * In its place: an honest "estimate unavailable" state (no point numbers, no
 * guarantee language) and number-free directional education — which habits
 * generally help vs hurt credit — carrying no per-user promised magnitude. The
 * per-user estimate is gated on the real-data rebuild (FR-605, ADR-0009 M6-5).
 */

import {
  Calculator,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const NOTICE_TITLE = "Score estimates are being updated";
const NOTICE_BODY =
  "We're rebuilding score-impact estimates to use your own credit data. Until then we can't show a projected point change — credit-score impacts are individual and can't be predicted precisely.";
const DISCLAIMER =
  "General education only — not a prediction of your credit score.";

// Number-free directional education: general direction only, never a per-user
// point magnitude. Standard credit-education statements, not a prediction about
// this user's score.
const HABITS_THAT_HELP: string[] = [
  "Paying down credit card balances",
  "Making every payment on time",
  "Keeping older accounts open",
  "Applying for new credit only when needed",
];

const HABITS_THAT_HURT: string[] = [
  "Missing or making late payments",
  "Carrying balances close to your limits",
  "Closing your oldest accounts",
  "Opening several new accounts at once",
];

export default function CreditScoreSimulatorPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Credit Score Simulator
            </h1>
          </div>
          <p className="text-gray-600 dark:text-slate-400">
            Learn which financial habits generally help or hurt your credit
          </p>
        </div>

        {/* Honest unavailable state — replaces the fabricated projection */}
        <div
          data-testid="simulator-unavailable"
          className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {NOTICE_TITLE}
              </h2>
              <p className="mt-1 text-gray-600 dark:text-slate-400">
                {NOTICE_BODY}
              </p>
            </div>
          </div>
        </div>

        {/* Number-free directional education */}
        <div
          data-testid="simulator-education"
          className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              What generally helps
            </h3>
          </div>
          <ul className="space-y-2">
            {HABITS_THAT_HELP.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-gray-700 dark:text-slate-300">
                  {item}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 mt-6 mb-3">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              What generally hurts
            </h3>
          </div>
          <ul className="space-y-2">
            {HABITS_THAT_HURT.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-gray-700 dark:text-slate-300">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p
          data-testid="simulator-disclaimer"
          className="mt-6 text-sm italic text-gray-500 dark:text-slate-400"
        >
          {DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
