/**
 * Credit Monitoring Hub
 * 
 * Real-time credit tracking across all 3 bureaus with score dashboard,
 * history chart, alerts, and service comparison.
 */

'use client';

import { useState } from 'react';

interface BureauScore {
  bureau: string;
  score: number;
  change: number;
  lastUpdated: string;
}

interface CreditAlert {
  id: string;
  type: 'inquiry' | 'account' | 'address' | 'public_record';
  title: string;
  description: string;
  date: string;
  severity: 'low' | 'medium' | 'high';
}

const mockScores: BureauScore[] = [
  { bureau: 'Experian', score: 720, change: 15, lastUpdated: '2024-01-15' },
  { bureau: 'Equifax', score: 715, change: 8, lastUpdated: '2024-01-14' },
  { bureau: 'TransUnion', score: 718, change: 12, lastUpdated: '2024-01-15' },
];

const mockAlerts: CreditAlert[] = [
  { id: '1', type: 'inquiry', title: 'New Hard Inquiry', description: 'Capital One Bank checked your credit', date: '2024-01-10', severity: 'medium' },
  { id: '2', type: 'account', title: 'New Account Opened', description: 'Chase credit card account opened', date: '2024-01-08', severity: 'low' },
  { id: '3', type: 'address', title: 'Address Change Detected', description: 'New address reported to Experian', date: '2024-01-05', severity: 'high' },
];

const monitoringServices = [
  { name: 'CreditMaster Pro', price: 29.99, bureaus: 3, alerts: true, identity: true, score: true },
  { name: 'Experian', price: 24.99, bureaus: 1, alerts: true, identity: true, score: true },
  { name: 'Credit Karma', price: 0, bureaus: 2, alerts: true, identity: false, score: true },
  { name: 'myFICO', price: 39.99, bureaus: 3, alerts: true, identity: false, score: true },
];

function ScoreGauge({ score, bureau, change }: { score: number; bureau: string; change: number }) {
  const percentage = ((score - 300) / 550) * 100;
  const color = score >= 740 ? 'text-green-500' : score >= 670 ? 'text-yellow-500' : 'text-red-500';
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-sm font-medium text-gray-500 mb-4">{bureau}</h3>
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
          <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none"
            className={color} strokeDasharray={`${percentage * 3.52} 352`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${color}`}>{score}</span>
          <span className={`text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {change >= 0 ? '+' : ''}{change}
          </span>
        </div>
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: CreditAlert }) {
  const severityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };
  const typeIcons = { inquiry: '🔍', account: '💳', address: '📍', public_record: '📋' };

  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200">
      <span className="text-2xl">{typeIcons[alert.type]}</span>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-gray-900">{alert.title}</h4>
          <span className={`px-2 py-0.5 text-xs rounded-full ${severityColors[alert.severity]}`}>
            {alert.severity}
          </span>
        </div>
        <p className="text-sm text-gray-600">{alert.description}</p>
        <p className="text-xs text-gray-400 mt-1">{alert.date}</p>
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  const [timeRange, setTimeRange] = useState<'6m' | '1y' | '2y'>('6m');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Credit Monitoring Hub</h1>
        <p className="text-gray-600">Real-time tracking across all 3 bureaus</p>
      </div>

      {/* Score Dashboard */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Credit Scores</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockScores.map((s) => (
            <ScoreGauge key={s.bureau} score={s.score} bureau={s.bureau} change={s.change} />
          ))}
        </div>
      </section>

      {/* Score History */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Score History</h2>
          <div className="flex gap-2">
            {(['6m', '1y', '2y'] as const).map((range) => (
              <button key={range} onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded-lg ${timeRange === range ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {range === '6m' ? '6 Months' : range === '1y' ? '1 Year' : '2 Years'}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">📈 Score history chart ({timeRange})</p>
        </div>
      </section>

      {/* Alerts */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h2>
        <div className="space-y-3">
          {mockAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
        </div>
      </section>

      {/* Service Comparison */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Monitoring Service Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">Service</th>
                <th className="text-center py-3 px-4">Price/mo</th>
                <th className="text-center py-3 px-4">Bureaus</th>
                <th className="text-center py-3 px-4">Alerts</th>
                <th className="text-center py-3 px-4">Identity</th>
              </tr>
            </thead>
            <tbody>
              {monitoringServices.map((service) => (
                <tr key={service.name} className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">{service.name}</td>
                  <td className="text-center py-3 px-4">{service.price === 0 ? 'Free' : `$${service.price}`}</td>
                  <td className="text-center py-3 px-4">{service.bureaus}</td>
                  <td className="text-center py-3 px-4">{service.alerts ? '✅' : '❌'}</td>
                  <td className="text-center py-3 px-4">{service.identity ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

