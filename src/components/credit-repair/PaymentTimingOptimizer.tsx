/**
 * Payment Timing Optimizer Component
 *
 * Optimize when you pay to maximize credit score:
 * - Pay BEFORE statement date (not due date)
 * - 100% success rate
 * - 10-20 point impact in 30 days
 * - Simple calendar-based strategy
 */

"use client";

import { useState } from "react";

interface Card {
  id: string;
  name: string;
  balance: number;
  limit: number;
  statementDate: number;
  dueDate: number;
}

export default function PaymentTimingOptimizer() {
  const [cards, setCards] = useState<Card[]>([
    {
      id: "1",
      name: "Card 1",
      balance: 1000,
      limit: 5000,
      statementDate: 15,
      dueDate: 10,
    },
  ]);

  const addCard = () => {
    setCards([
      ...cards,
      {
        id: Date.now().toString(),
        name: `Card ${cards.length + 1}`,
        balance: 0,
        limit: 5000,
        statementDate: 15,
        dueDate: 10,
      },
    ]);
  };

  const updateCard = <K extends keyof Card>(
    id: string,
    field: K,
    value: Card[K],
  ) => {
    setCards(
      cards.map((card) =>
        card.id === id ? { ...card, [field]: value } : card,
      ),
    );
  };

  const removeCard = (id: string) => {
    setCards(cards.filter((card) => card.id !== id));
  };

  const getOptimalPaymentDate = (statementDate: number) => {
    // Pay 3-5 days before statement date
    return statementDate - 3;
  };

  const getUtilization = (balance: number, limit: number) => {
    return limit > 0 ? Math.round((balance / limit) * 100) : 0;
  };

  const getCurrentDate = () => {
    return new Date().getDate();
  };

  const getDaysUntilStatement = (statementDate: number) => {
    const today = getCurrentDate();
    if (statementDate >= today) {
      return statementDate - today;
    } else {
      return 30 - today + statementDate;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-blue-600 rounded-lg p-8 text-white mb-6">
        <h1 className="text-3xl font-bold mb-2">Payment Timing Optimizer</h1>
        <p className="text-teal-100">
          Pay BEFORE statement date for 10-20 point boost - 100% success rate
        </p>
      </div>

      {/* Key Concept */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-blue-800 mb-3 text-lg">
          The Secret: Statement Date vs Due Date
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
            <div className="text-red-600 font-bold mb-2">
              WRONG: Pay on Due Date
            </div>
            <p className="text-sm text-gray-700 dark:text-slate-200">
              Most people pay on the due date. But your balance is already
              reported to credit bureaus on the <strong>statement date</strong>{" "}
              (usually 20-25 days before due date).
            </p>
            <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
              Result: High utilization reported = Lower score
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
            <div className="text-green-600 font-bold mb-2">
              RIGHT: Pay Before Statement Date
            </div>
            <p className="text-sm text-gray-700 dark:text-slate-200">
              Pay 3-5 days <strong>before</strong> your statement closing date.
              This ensures a low balance is reported to credit bureaus.
            </p>
            <div className="mt-3 p-2 bg-green-50 rounded text-sm text-green-700">
              Result: Low utilization reported = Higher score (+10-20 pts)
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Your Payment Schedule</h2>
          <button
            onClick={addCard}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            + Add Card
          </button>
        </div>

        <div className="space-y-4">
          {cards.map((card) => {
            const utilization = getUtilization(card.balance, card.limit);
            const optimalDate = getOptimalPaymentDate(card.statementDate);
            const daysUntil = getDaysUntilStatement(card.statementDate);
            const isUrgent = daysUntil <= 5;

            return (
              <div
                key={card.id}
                className={`border-2 rounded-lg p-4 ${isUrgent ? "border-orange-400 bg-orange-50" : "border-gray-200 dark:border-slate-700"}`}
              >
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-slate-300 mb-1">
                      Card Name
                    </label>
                    <input
                      type="text"
                      value={card.name}
                      onChange={(e) =>
                        updateCard(card.id, "name", e.target.value)
                      }
                      className="w-full px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-slate-300 mb-1">
                      Balance
                    </label>
                    <input
                      type="number"
                      value={card.balance}
                      onChange={(e) =>
                        updateCard(
                          card.id,
                          "balance",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="w-full px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-slate-300 mb-1">
                      Limit
                    </label>
                    <input
                      type="number"
                      value={card.limit}
                      onChange={(e) =>
                        updateCard(
                          card.id,
                          "limit",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="w-full px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-slate-300 mb-1">
                      Statement Date
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={card.statementDate}
                      onChange={(e) =>
                        updateCard(
                          card.id,
                          "statementDate",
                          parseInt(e.target.value) || 1,
                        )
                      }
                      className="w-full px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-slate-300 mb-1">
                      Due Date
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={card.dueDate}
                      onChange={(e) =>
                        updateCard(
                          card.id,
                          "dueDate",
                          parseInt(e.target.value) || 1,
                        )
                      }
                      className="w-full px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => removeCard(card.id)}
                      className="w-full px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Payment Recommendation */}
                <div
                  className={`p-4 rounded-lg ${isUrgent ? "bg-orange-100 border border-orange-300" : "bg-teal-50 border border-teal-200"}`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-gray-600 dark:text-slate-300 mb-1">
                        Current Utilization
                      </div>
                      <div
                        className={`text-2xl font-bold ${utilization > 30 ? "text-red-600" : utilization > 10 ? "text-yellow-600" : "text-green-600"}`}
                      >
                        {utilization}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-slate-300 mb-1">
                        Optimal Payment Date
                      </div>
                      <div className="text-2xl font-bold text-teal-600">
                        Day {optimalDate}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        (3 days before statement)
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-slate-300 mb-1">
                        Days Until Statement
                      </div>
                      <div
                        className={`text-2xl font-bold ${isUrgent ? "text-orange-600" : "text-gray-700 dark:text-slate-200"}`}
                      >
                        {daysUntil} days
                      </div>
                      {isUrgent && (
                        <div className="text-xs text-orange-600 font-semibold">
                          Pay soon!
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-teal-200">
                    <div className="text-sm font-semibold text-teal-800 mb-1">
                      Recommendation:
                    </div>
                    <p className="text-sm text-teal-700">
                      {utilization > 30 ? (
                        <>
                          Pay{" "}
                          <strong>
                            ${Math.ceil(card.balance - card.limit * 0.1)}
                          </strong>{" "}
                          by <strong>Day {optimalDate}</strong> to get under 10%
                          utilization
                        </>
                      ) : utilization > 10 ? (
                        <>
                          Pay{" "}
                          <strong>
                            ${Math.ceil(card.balance - card.limit * 0.1)}
                          </strong>{" "}
                          by <strong>Day {optimalDate}</strong> to reach optimal
                          10% utilization
                        </>
                      ) : (
                        <>
                          Great! Keep utilization under 10% and pay by{" "}
                          <strong>Day {optimalDate}</strong>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Payment Calendar</h2>
        <div className="space-y-2">
          {cards.map((card) => {
            const optimalDate = getOptimalPaymentDate(card.statementDate);
            return (
              <div
                key={card.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg"
              >
                <div>
                  <div className="font-semibold text-gray-800 dark:text-slate-100">
                    {card.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">
                    Statement: Day {card.statementDate} | Due: Day{" "}
                    {card.dueDate}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-teal-600">
                    Pay by Day {optimalDate}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">
                    ({getDaysUntilStatement(card.statementDate)} days from now)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pro Tips */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Pro Tips:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
          <li>Set up calendar reminders 5 days before each statement date</li>
          <li>
            Use autopay but schedule it for BEFORE statement date, not due date
          </li>
          <li>
            Even paying $1 before statement date can help if you can't pay full
            balance
          </li>
          <li>This strategy works immediately - see results in 30 days</li>
          <li>Combine with utilization optimization for maximum impact</li>
        </ul>
      </div>
    </div>
  );
}
