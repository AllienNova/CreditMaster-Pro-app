/**
 * Credit Report Analysis Tool
 *
 * AI-powered credit report parsing with file upload, analysis results,
 * disputable item identification, and action plan generation.
 */

"use client";

import { useState } from "react";

interface AnalysisResult {
  category: string;
  items: {
    description: string;
    severity: "low" | "medium" | "high";
    disputable: boolean;
    recommendation: string;
  }[];
}

/*
 * `mockResults` lived here: an invented credit report naming real creditors
 * — "Late payment on Chase card (30 days) - Jan 2023", "Collection account -
 * Medical debt $450", "High utilization on Discover (78%)" — presented as the
 * analysis of whatever file the user had just "uploaded". See handleUpload.
 */

function FileUpload({
  onUpload,
}: {
  onUpload: (file?: File) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 dark:border-slate-600"}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onUpload();
      }}
    >
      <div className="text-5xl mb-4"></div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Upload Your Credit Report
      </h3>
      <p className="text-gray-600 dark:text-slate-300 mb-4">
        Drag and drop your PDF or paste text from your credit report
      </p>
      <div className="flex gap-4 justify-center">
        <label className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
          Choose File
          <input
            type="file"
            accept=".pdf,.txt"
            className="hidden"
            onChange={(e) => onUpload(e.target.files?.[0])}
          />
        </label>
        {/*
          A "Paste Text" button sat here. There is no paste flow — it called
          the same handler with a click event where a File belonged, and
          POST /api/credit-report/analyze rejects a request with no file. A
          control that cannot do the thing is the defect, not a feature to
          preserve; it comes back when a paste path exists.
        */}
      </div>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-4">
        Supported: PDF, TXT • Your data is encrypted and never stored
      </p>
    </div>
  );
}

function AnalysisResults({ results }: { results: AnalysisResult[] }) {
  const severityColors = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
  };
  const totalDisputable = results
    .flatMap((r) => r.items)
    .filter((i) => i.disputable).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      {/* Two columns, not three: the third tile was the invented one. */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 text-center">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {results.flatMap((r) => r.items).length}
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Items Found
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 text-center">
          <p className="text-3xl font-bold text-green-600">{totalDisputable}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Disputable
          </p>
        </div>
        {/*
          A third tile read "+45 / Potential Points". It sat between two
          COMPUTED tiles — the one above renders {totalDisputable} — which is
          what made an invented number read as another measurement. The same
          shape as the retirement figures on /tax/optimizer, where a hardcoded
          breakdown sat under a real total.

          Removed rather than estimated. Turning "items you could dispute" into
          "points you would gain" needs a model of how a bureau will respond to
          each item, and no such model exists here; the nearest thing,
          /api/ml/predict-timeline, predicts dispute RESOLUTION TIME and its own
          comment records that it substitutes a different model because the one
          it names was never built.
        */}
      </div>

      {/* Results by Category */}
      {results.map((category) => (
        <div
          key={category.category}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700"
        >
          <div className="p-4 border-b border-gray-100 dark:border-slate-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {category.category}
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {category.items.map((item, idx) => (
              <div key={idx} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${severityColors[item.severity]}`}
                      >
                        {item.severity}
                      </span>
                      {item.disputable && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                          Disputable
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 dark:text-white">
                      {item.description}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                      {item.recommendation}
                    </p>
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
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Your Action Plan
        </h3>
        <ol className="space-y-3">
          <li className="flex gap-3">
            <span className="font-bold text-blue-600">1.</span> Dispute the
            unauthorized inquiry with TransUnion
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-blue-600">2.</span> Send debt
            validation letter for medical collection
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-blue-600">3.</span> Write goodwill
            letter to Chase for late payment removal
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-blue-600">4.</span> Pay down
            Discover card to below 30% utilization
          </li>
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

  const [notAvailable, setNotAvailable] = useState<string | null>(null);

  /*
   * WHAT THIS REPLACED. `handleUpload` set a two-second spinner and then
   * `setResults(mockResults)` — an invented credit report naming real
   * creditors ("Late payment on Chase card (30 days) - Jan 2023",
   * "Collection account - Medical debt $450") — while the file itself went
   * nowhere, under a caption promising it was encrypted.
   *
   * THE ROUTE WAS ALREADY HONEST AND THE PAGE IGNORED IT.
   * POST /api/credit-report/analyze is gated 501 with the message "Credit
   * report analysis is not available yet. Your file was not analyzed",
   * because no report parser exists in the codebase. Someone had already
   * refused to fabricate on the server; the screen fabricated anyway.
   *
   * The file is now actually sent, so the route's validation runs and the user
   * learns immediately if it is unacceptable — and its answer is shown as
   * given. When a parser lands, the 501 goes away and this page renders the
   * real analysis with no further change.
   */
  const handleUpload = async (file?: File) => {
    setUploaded(true);
    setAnalyzing(true);
    setNotAvailable(null);
    try {
      const body = new FormData();
      if (file) body.append("file", file);
      const res = await fetch("/api/credit-report/analyze", {
        method: "POST",
        body,
      });
      const json = await res.json().catch(() => null);
      if (res.ok && Array.isArray(json?.results)) setResults(json.results);
      else
        setNotAvailable(
          json?.message ??
            "We could not analyze that report. Nothing was stored.",
        );
    } catch {
      setNotAvailable("We could not reach the analysis service.");
    }
    setAnalyzing(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Credit Report Analysis
        </h1>
        <p className="text-gray-600 dark:text-slate-300">
          AI-powered analysis to identify disputable items
        </p>
      </div>

      {!uploaded && <FileUpload onUpload={handleUpload} />}

      {analyzing && (
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4"></div>
          <p className="text-gray-600 dark:text-slate-300">
            Analyzing your credit report...
          </p>
        </div>
      )}

      {notAvailable && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <p className="font-medium text-gray-900 dark:text-white mb-1">
            No analysis was produced
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {notAvailable}
          </p>
        </div>
      )}

      {results && <AnalysisResults results={results} />}
    </div>
  );
}
