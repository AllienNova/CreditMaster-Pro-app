/**
 * Utilization Optimizer Component
 * 
 * Helps users optimize credit utilization for maximum score impact:
 * - Calculate optimal payment amounts
 * - Payment timing strategy (pay BEFORE statement date)
 * - Per-card and overall utilization
 * - 20-50 point impact in 30 days
 */

'use client';

import { useState } from 'react';

interface CreditCard {
  id: string;
  name: string;
  currentBalance: number;
  creditLimit: number;
  statementDate: number; // Day of month (1-31)
  dueDate: number; // Day of month (1-31)
}

interface OptimizedPayment {
  cardName: string;
  paymentAmount: number;
  newBalance: number;
  newUtilization: number;
}

type OptimizationPlan =
  | {
      strategy: 'pay_off_all' | 'optimize_partial';
      payments: OptimizedPayment[];
      currentScore: number;
      newScore: number;
      scoreImpact: number;
    }
  | {
      strategy: 'no_cash';
      message: string;
    };

export default function UtilizationOptimizer() {
  const [cards, setCards] = useState<CreditCard[]>([
    {
      id: '1',
      name: 'Card 1',
      currentBalance: 0,
      creditLimit: 5000,
      statementDate: 15,
      dueDate: 10,
    },
  ]);
  const [availableCash, setAvailableCash] = useState<number>(0);
  const [optimizedPlan, setOptimizedPlan] = useState<OptimizationPlan | null>(null);

  const addCard = () => {
    setCards([
      ...cards,
      {
        id: Date.now().toString(),
        name: `Card ${cards.length + 1}`,
        currentBalance: 0,
        creditLimit: 5000,
        statementDate: 15,
        dueDate: 10,
      },
    ]);
  };

  const updateCard = <K extends keyof CreditCard>(id: string, field: K, value: CreditCard[K]) => {
    setCards(cards.map(card =>
      card.id === id ? { ...card, [field]: value } : card
    ));
  };

  const removeCard = (id: string) => {
    setCards(cards.filter(card => card.id !== id));
  };

  const calculateUtilization = (balance: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.round((balance / limit) * 100);
  };

  const calculateOverallUtilization = () => {
    const totalBalance = cards.reduce((sum, card) => sum + card.currentBalance, 0);
    const totalLimit = cards.reduce((sum, card) => sum + card.creditLimit, 0);
    return calculateUtilization(totalBalance, totalLimit);
  };

  const optimizePayments = () => {
    const totalBalance = cards.reduce((sum, card) => sum + card.currentBalance, 0);
    const totalLimit = cards.reduce((sum, card) => sum + card.creditLimit, 0);
    
    if (availableCash >= totalBalance) {
      // Can pay off everything
      setOptimizedPlan({
        strategy: 'pay_off_all',
        payments: cards.map(card => ({
          cardName: card.name,
          paymentAmount: card.currentBalance,
          newBalance: 0,
          newUtilization: 0,
        })),
        currentScore: calculateOverallUtilization(),
        newScore: 0,
        scoreImpact: calculateScoreImpact(calculateOverallUtilization(), 0),
      });
    } else if (availableCash > 0) {
      // Optimize partial payment
      // Strategy: Pay down highest utilization cards first
      const sortedCards = [...cards].sort((a, b) => {
        const utilA = calculateUtilization(a.currentBalance, a.creditLimit);
        const utilB = calculateUtilization(b.currentBalance, b.creditLimit);
        return utilB - utilA;
      });

      let remainingCash = availableCash;
      const payments = sortedCards.map(card => {
        const targetUtilization = 10; // Target 10% or less
        const targetBalance = card.creditLimit * (targetUtilization / 100);
        const idealPayment = Math.max(0, card.currentBalance - targetBalance);
        const actualPayment = Math.min(remainingCash, idealPayment, card.currentBalance);
        
        remainingCash -= actualPayment;
        
        return {
          cardName: card.name,
          paymentAmount: actualPayment,
          newBalance: card.currentBalance - actualPayment,
          newUtilization: calculateUtilization(
            card.currentBalance - actualPayment,
            card.creditLimit
          ),
        };
      });

      const newTotalBalance = totalBalance - availableCash;
      const newOverallUtilization = calculateUtilization(newTotalBalance, totalLimit);

      setOptimizedPlan({
        strategy: 'optimize_partial',
        payments,
        currentScore: calculateOverallUtilization(),
        newScore: newOverallUtilization,
        scoreImpact: calculateScoreImpact(calculateOverallUtilization(), newOverallUtilization),
      });
    } else {
      setOptimizedPlan({
        strategy: 'no_cash',
        message: 'Enter available cash to see optimization plan',
      });
    }
  };

  const calculateScoreImpact = (currentUtil: number, newUtil: number) => {
    // Rough estimate: Each 10% reduction in utilization = ~10-15 points
    const utilReduction = currentUtil - newUtil;
    return Math.round((utilReduction / 10) * 12);
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization <= 10) return 'text-green-600';
    if (utilization <= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUtilizationBgColor = (utilization: number) => {
    if (utilization <= 10) return 'bg-green-100';
    if (utilization <= 30) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const overallUtilization = calculateOverallUtilization();

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-8 text-white mb-6">
        <h1 className="text-3xl font-bold mb-2">Utilization Optimizer</h1>
        <p className="text-green-100">
          Optimize your credit utilization for 20-50 point boost in 30 days
        </p>
      </div>

      {/* Overall Utilization */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Overall Utilization</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-5xl font-bold">
              <span className={getUtilizationColor(overallUtilization)}>
                {overallUtilization}%
              </span>
            </div>
            <p className="text-gray-600 mt-2">
              {overallUtilization <= 10 && 'Excellent! Keep it under 10%'}
              {overallUtilization > 10 && overallUtilization <= 30 && 'Good, but aim for under 10%'}
              {overallUtilization > 30 && 'High utilization - pay down ASAP'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Balance</div>
            <div className="text-2xl font-bold text-gray-800">
              ${cards.reduce((sum, card) => sum + card.currentBalance, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-2">Total Limit</div>
            <div className="text-xl font-semibold text-gray-700">
              ${cards.reduce((sum, card) => sum + card.creditLimit, 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Your Credit Cards</h2>
          <button
            onClick={addCard}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + Add Card
          </button>
        </div>

        <div className="space-y-4">
          {cards.map((card) => {
            const utilization = calculateUtilization(card.currentBalance, card.creditLimit);
            return (
              <div key={card.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Card Name</label>
                    <input
                      type="text"
                      value={card.name}
                      onChange={(e) => updateCard(card.id, 'name', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Current Balance</label>
                    <input
                      type="number"
                      value={card.currentBalance}
                      onChange={(e) => updateCard(card.id, 'currentBalance', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Credit Limit</label>
                    <input
                      type="number"
                      value={card.creditLimit}
                      onChange={(e) => updateCard(card.id, 'creditLimit', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Statement Date</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={card.statementDate}
                      onChange={(e) => updateCard(card.id, 'statementDate', parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Utilization</label>
                    <div className={`px-2 py-1 rounded text-center font-bold ${getUtilizationBgColor(utilization)}`}>
                      <span className={getUtilizationColor(utilization)}>{utilization}%</span>
                    </div>
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
              </div>
            );
          })}
        </div>
      </div>

      {/* Optimization */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Payment Optimization</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Available Cash for Payments
          </label>
          <input
            type="number"
            value={availableCash}
            onChange={(e) => setAvailableCash(parseFloat(e.target.value) || 0)}
            placeholder="Enter amount you can pay"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>

        <button
          onClick={optimizePayments}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold mb-4"
        >
          Optimize My Payments
        </button>

        {optimizedPlan && optimizedPlan.strategy !== 'no_cash' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Optimization Results</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-blue-600">Current Utilization</div>
                  <div className="text-2xl font-bold text-blue-800">{optimizedPlan.currentScore}%</div>
                </div>
                <div>
                  <div className="text-sm text-green-600">New Utilization</div>
                  <div className="text-2xl font-bold text-green-800">{optimizedPlan.newScore}%</div>
                </div>
                <div>
                  <div className="text-sm text-purple-600">Estimated Impact</div>
                  <div className="text-2xl font-bold text-purple-800">+{optimizedPlan.scoreImpact} pts</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-800">Recommended Payments:</h3>
              {optimizedPlan.payments.map((payment, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{payment.cardName}</span>
                  <div className="text-right">
                    <div className="font-bold text-green-600">Pay ${payment.paymentAmount.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">
                      New balance: ${payment.newBalance.toLocaleString()} ({payment.newUtilization}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">💡 Pro Tip:</h3>
              <p className="text-sm text-yellow-700">
                Make these payments <strong>BEFORE your statement closing date</strong>, not the due date! 
                This ensures the lower balance is reported to credit bureaus.
              </p>
            </div>
          </div>
        )}
        {optimizedPlan && optimizedPlan.strategy === 'no_cash' && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            {optimizedPlan.message}
          </div>
        )}
      </div>
    </div>
  );
}
