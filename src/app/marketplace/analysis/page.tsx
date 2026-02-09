/**
 * Credit Report Analysis Tool
 * 
 * AI-powered credit report parsing with file upload, analysis results,
 * disputable item identification, and action plan generation.
 */

'use client';

import { useState } from 'react';

interface AnalysisResult {
  category: string;
  items: { description: string; severity: 'low' | 'medium' | 'high'; disputable: boolean; recommendation: string }[];
}

const mockResults: AnalysisResult[] = [
  {
    category: 'Negative Items',
    items: [
      { description: 'Late payment on Chase card (30 days) - Jan 2023', severity: 'medium', disputable: true, recommendation: 'Send goodwill letter requesting removal' },
      { description: 'Collection account - Medical debt $450', severity: 'high', disputable: true, recommendation: 'Request debt validation, may be eligible for pay-for-delete' },
    ],
  },
  {
    category: 'Hard Inquiries',
    items: [
      { description: 'Capital One - Dec 2023', severity: 'low', disputable: false, recommendation: 'Will fall off in 2 years' },
      { description: 'Unknown inquiry - Nov 2023', severity: 'medium', disputable: true, recommendation: 'Dispute as unauthorized inquiry' },
    ],
  },
  {
    category: 'Account Issues',
    items: [
      { description: 'High utilization on Discover (78%)', severity: 'high', disputable: false, recommendation: 'Pay down to below 30% for score improvement' },
    ],
  },
];

function FileUpload({ onUpload }: { onUpload: () => void }) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 dark:border-slate-600'}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); onUpload(); }}
    >
      <div className="text-5xl mb-4"></div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Upload Your Credit Report</h3>
      <p className="text-gray-600 dark:text-slate-300 mb-4">Drag and drop your PDF or paste text from your credit report</p>
      <div className="flex gap-4 justify-center">
        <button onClick={onUpload} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Choose File
        </button>
        <button onClick={onUpload} className="px-6 py-2 bg-gray-100 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-200 dark:bg-slate-700">
          Paste Text
        </button>
      </div>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-4">Supported: PDF, TXT • Your data is encrypted and never stored</p>
    </div>
  );
}

function AnalysisResults({ results }: { results: AnalysisResult[] }) {
  const severityColors = { low: 'bg-blue-100 text-blue-800', medium: 'bg-yellow-100 text-yellow-800', high: 'bg-red-100 text-red-800' };
  const totalDisputable = results.flatMap(r => r.items).filter(i => i.disputable).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 text-center">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{results.flatMap(r => r.items).length}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400">Items Found</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 text-center">
          <p className="text-3xl font-bold text-green-600">{totalDisputable}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400">Disputable</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 text-center">
          <p className="text-3xl font-bold text-blue-600">+45</p>
          <p className="text-sm text-gray-500 dark:text-slate-400">Potential Points</p>
        </div>
      </div>

      {/* Results by Category */}
      {results.map((category) => (
        <div key={category.category} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">{category.category}</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {category.items.map((item, idx) => (
              <div key={idx} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${severityColors[item.severity]}`}>
                        {item.severity}
                      </span>
                      {item.disputable && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                          Disputable
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 dark:text-white">{item.description}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{item.recommendation}</p>
                  </div>
                  {item.disputable && (
                    <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Dispute
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Action Plan */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-xl p-6 border border-blue-100">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Your Action Plan</h3>
        <ol className="space-y-3">
          <li className="flex gap-3"><span className="font-bold text-blue-600">1.</span> Dispute the unauthorized inquiry with TransUnion</li>
          <li className="flex gap-3"><span className="font-bold text-blue-600">2.</span> Send debt validation letter for medical collection</li>
          <li className="flex gap-3"><span className="font-bold text-blue-600">3.</span> Write goodwill letter to Chase for late payment removal</li>
          <li className="flex gap-3"><span className="font-bold text-blue-600">4.</span> Pay down Discover card to below 30% utilization</li>
        </ol>
        <button className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Generate Dispute Letters
        </button>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  const [uploaded, setUploaded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);

  const handleUpload = () => {
    setUploaded(true);
    setAnalyzing(true);
    setTimeout(() => { setAnalyzing(false); setResults(mockResults); }, 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credit Report Analysis</h1>
        <p className="text-gray-600 dark:text-slate-300">AI-powered analysis to identify disputable items</p>
      </div>

      {!uploaded && <FileUpload onUpload={handleUpload} />}

      {analyzing && (
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4"></div>
          <p className="text-gray-600 dark:text-slate-300">Analyzing your credit report...</p>
        </div>
      )}

      {results && <AnalysisResults results={results} />}
    </div>
  );
}

