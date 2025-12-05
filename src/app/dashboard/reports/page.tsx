'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface Report {
  id: string;
  name: string;
  type: string;
  generatedAt: string;
  size: string;
}

export default function ReportsPage() {
  const [reports] = useState<Report[]>([
    { id: '1', name: 'Credit Analysis Report - December 2024', type: 'analysis', generatedAt: '2024-12-01', size: '2.4 MB' },
    { id: '2', name: 'Dispute Progress Summary - November 2024', type: 'disputes', generatedAt: '2024-11-30', size: '1.8 MB' },
    { id: '3', name: 'Monthly Credit Score Report - November 2024', type: 'score', generatedAt: '2024-11-15', size: '1.2 MB' },
    { id: '4', name: 'Credit Improvement Plan', type: 'plan', generatedAt: '2024-10-20', size: '3.1 MB' },
  ]);
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = (type: string) => {
    setGenerating(type);
    setTimeout(() => setGenerating(null), 2000);
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      analysis: '📊',
      disputes: '📝',
      score: '📈',
      plan: '🎯',
    };
    return icons[type] || '📄';
  };

  const reportTypes = [
    { type: 'analysis', name: 'Credit Analysis', desc: 'Comprehensive analysis of your credit report' },
    { type: 'disputes', name: 'Dispute Summary', desc: 'Summary of all your disputes and outcomes' },
    { type: 'score', name: 'Score Report', desc: 'Detailed credit score breakdown by bureau' },
    { type: 'plan', name: 'Improvement Plan', desc: 'AI-generated credit improvement roadmap' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">← Back</Link>
              <h1 className="text-xl font-bold text-gray-900">📑 Reports</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Generate New Report */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Generate New Report</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {reportTypes.map((rt) => (
              <button
                key={rt.type}
                onClick={() => handleGenerate(rt.type)}
                disabled={generating === rt.type}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left disabled:opacity-50"
              >
                <span className="text-2xl">{getTypeIcon(rt.type)}</span>
                <p className="font-medium text-gray-900 mt-2">{rt.name}</p>
                <p className="text-sm text-gray-500">{rt.desc}</p>
                {generating === rt.type && (
                  <p className="text-sm text-blue-600 mt-2">Generating...</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Previous Reports */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Previous Reports</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {reports.map((report) => (
              <div key={report.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">{getTypeIcon(report.type)}</span>
                  <div>
                    <p className="font-medium text-gray-900">{report.name}</p>
                    <p className="text-sm text-gray-500">
                      Generated {new Date(report.generatedAt).toLocaleDateString()} • {report.size}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800">View</button>
                  <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Download</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

