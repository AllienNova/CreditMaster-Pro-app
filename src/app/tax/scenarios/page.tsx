'use client';

/**
 * Tax Scenario Modeler
 *
 * What-if analysis tool for tax planning decisions.
 * Compare different scenarios to optimize tax outcomes.
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';

interface ScenarioInput {
  name: string;
  grossIncome: number;
  additional401k: number;
  additionalIra: number;
  additionalHsa: number;
  additionalCharitable: number;
  capitalGainsRealized: number;
  rothConversion: number;
}

interface ScenarioResult {
  name: string;
  taxableIncome: number;
  federalTax: number;
  stateTax: number;
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
  takeHomePay: number;
}

const defaultScenario: ScenarioInput = {
  name: 'Current Plan',
  grossIncome: 300000,
  additional401k: 0,
  additionalIra: 0,
  additionalHsa: 0,
  additionalCharitable: 0,
  capitalGainsRealized: 0,
  rothConversion: 0,
};

export default function TaxScenarioModelerPage() {
  const [baseScenario, setBaseScenario] = useState<ScenarioInput>({
    ...defaultScenario,
    name: 'Baseline',
  });
  const [scenarios, setScenarios] = useState<ScenarioInput[]>([
    { ...defaultScenario, name: 'Max 401(k)', additional401k: 13000 },
    {
      ...defaultScenario,
      name: 'Max All Retirement',
      additional401k: 13000,
      additionalIra: 7000,
      additionalHsa: 3150,
    },
  ]);
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateScenario = useCallback(
    (scenario: ScenarioInput): ScenarioResult => {
      // Simplified tax calculation for demonstration
      const standardDeduction = 14600;
      const adjustedIncome =
        scenario.grossIncome -
        scenario.additional401k -
        scenario.additionalIra -
        scenario.additionalHsa;

      const taxableIncome = Math.max(
        0,
        adjustedIncome - standardDeduction - scenario.additionalCharitable
      );

      // Federal tax brackets (2024 single)
      let federalTax = 0;
      const brackets = [
        { limit: 11600, rate: 0.1 },
        { limit: 47150, rate: 0.12 },
        { limit: 100525, rate: 0.22 },
        { limit: 191950, rate: 0.24 },
        { limit: 243725, rate: 0.32 },
        { limit: 609350, rate: 0.35 },
        { limit: Infinity, rate: 0.37 },
      ];

      let remaining = taxableIncome;
      let prevLimit = 0;
      for (const bracket of brackets) {
        const taxableInBracket = Math.min(remaining, bracket.limit - prevLimit);
        if (taxableInBracket <= 0) break;
        federalTax += taxableInBracket * bracket.rate;
        remaining -= taxableInBracket;
        prevLimit = bracket.limit;
      }

      // California state tax (simplified)
      const stateTax = taxableIncome * 0.093;

      // Add Roth conversion to tax
      const rothTax = scenario.rothConversion * 0.32;

      // Capital gains tax (simplified - assuming long-term)
      const capitalGainsTax = scenario.capitalGainsRealized * 0.15;

      const totalTax = federalTax + stateTax + rothTax + capitalGainsTax;
      const effectiveRate =
        scenario.grossIncome > 0 ? totalTax / scenario.grossIncome : 0;

      // Find marginal rate
      let marginalRate = 0.37;
      for (const bracket of brackets) {
        if (taxableIncome <= bracket.limit) {
          marginalRate = bracket.rate;
          break;
        }
      }

      return {
        name: scenario.name,
        taxableIncome,
        federalTax,
        stateTax,
        totalTax,
        effectiveRate,
        marginalRate,
        takeHomePay: scenario.grossIncome - totalTax,
      };
    },
    []
  );

  const runComparison = useCallback(() => {
    setIsCalculating(true);

    setTimeout(() => {
      const allScenarios = [baseScenario, ...scenarios];
      const calculatedResults = allScenarios.map(calculateScenario);
      setResults(calculatedResults);
      setIsCalculating(false);
    }, 500);
  }, [baseScenario, scenarios, calculateScenario]);

  const addScenario = () => {
    setScenarios([
      ...scenarios,
      { ...defaultScenario, name: `Scenario ${scenarios.length + 1}` },
    ]);
  };

  const removeScenario = (index: number) => {
    setScenarios(scenarios.filter((_, i) => i !== index));
  };

  const updateScenario = (
    index: number,
    field: keyof ScenarioInput,
    value: string | number
  ) => {
    const updated = [...scenarios];
    updated[index] = { ...updated[index], [field]: value };
    setScenarios(updated);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const baselineResult = results.find((r) => r.name === 'Baseline');

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/tax" className="flex items-center gap-2">
                <span className="text-gray-400 dark:text-slate-500">←</span>
                <span className="text-gray-600 dark:text-slate-300">Back to Tax</span>
              </Link>
              <span className="text-gray-300">|</span>
              <h1 className="text-lg font-semibold text-amber-600">
                Scenario Modeler
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            What-If Tax Scenarios
          </h2>
          <p className="text-gray-600 dark:text-slate-300 mt-1">
            Compare different tax strategies to find the optimal approach for
            your situation.
          </p>
        </div>

        {/* Baseline Configuration */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Baseline (Current Situation)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                Gross Income
              </label>
              <input
                type="number"
                value={baseScenario.grossIncome}
                onChange={(e) =>
                  setBaseScenario({
                    ...baseScenario,
                    grossIncome: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                YTD 401(k) Contribution
              </label>
              <input
                type="number"
                value={baseScenario.additional401k}
                onChange={(e) =>
                  setBaseScenario({
                    ...baseScenario,
                    additional401k: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                Capital Gains to Realize
              </label>
              <input
                type="number"
                value={baseScenario.capitalGainsRealized}
                onChange={(e) =>
                  setBaseScenario({
                    ...baseScenario,
                    capitalGainsRealized: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Scenarios */}
        <div className="space-y-4 mb-6">
          {scenarios.map((scenario, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <input
                  type="text"
                  value={scenario.name}
                  onChange={(e) =>
                    updateScenario(index, 'name', e.target.value)
                  }
                  className="text-lg font-semibold text-gray-900 dark:text-white border-none focus:ring-0 p-0"
                />
                <button
                  onClick={() => removeScenario(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    Additional 401(k)
                  </label>
                  <input
                    type="number"
                    value={scenario.additional401k}
                    onChange={(e) =>
                      updateScenario(
                        index,
                        'additional401k',
                        Number(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    Additional IRA
                  </label>
                  <input
                    type="number"
                    value={scenario.additionalIra}
                    onChange={(e) =>
                      updateScenario(
                        index,
                        'additionalIra',
                        Number(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    Additional HSA
                  </label>
                  <input
                    type="number"
                    value={scenario.additionalHsa}
                    onChange={(e) =>
                      updateScenario(
                        index,
                        'additionalHsa',
                        Number(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    Charitable Giving
                  </label>
                  <input
                    type="number"
                    value={scenario.additionalCharitable}
                    onChange={(e) =>
                      updateScenario(
                        index,
                        'additionalCharitable',
                        Number(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={addScenario}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
          >
            + Add Scenario
          </button>
          <button
            onClick={runComparison}
            disabled={isCalculating}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors disabled:opacity-50"
          >
            {isCalculating ? 'Calculating...' : 'Compare Scenarios'}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Comparison Results
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Scenario
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Taxable Income
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Federal Tax
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      State Tax
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Total Tax
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Effective Rate
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Take-Home
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      vs Baseline
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {results.map((result, index) => {
                    const savings = baselineResult
                      ? baselineResult.totalTax - result.totalTax
                      : 0;
                    return (
                      <tr
                        key={index}
                        className={
                          result.name === 'Baseline' ? 'bg-amber-50' : ''
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {result.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600 dark:text-slate-300">
                          {formatCurrency(result.taxableIncome)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600 dark:text-slate-300">
                          {formatCurrency(result.federalTax)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600 dark:text-slate-300">
                          {formatCurrency(result.stateTax)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(result.totalTax)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600 dark:text-slate-300">
                          {formatPercent(result.effectiveRate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-green-600">
                          {formatCurrency(result.takeHomePay)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {result.name === 'Baseline' ? (
                            <span className="text-gray-400 dark:text-slate-500">—</span>
                          ) : savings > 0 ? (
                            <span className="text-green-600 font-medium">
                              +{formatCurrency(savings)}
                            </span>
                          ) : savings < 0 ? (
                            <span className="text-red-600 font-medium">
                              {formatCurrency(savings)}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500">$0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>Disclaimer:</strong> These calculations are estimates for
            planning purposes only. Actual tax liability may vary based on your
            complete tax situation. Consult a qualified tax professional before
            making tax decisions.
          </p>
        </div>
      </main>
    </div>
  );
}
