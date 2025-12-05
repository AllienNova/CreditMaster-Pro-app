'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';

type UploadState = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';

interface AnalysisResult {
  bureau: string;
  score?: number;
  accounts: number;
  disputeableItems: number;
  recommendations: string[];
}

export default function CreditReportUploadPage() {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === 'application/pdf' || droppedFile.type.startsWith('image/'))) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please upload a PDF or image file');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const analyzeReport = async () => {
    if (!file) return;
    setUploadState('uploading');
    setProgress(0);

    // Simulate upload progress
    const uploadInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 50) { clearInterval(uploadInterval); return 50; }
        return prev + 10;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(uploadInterval);
      setUploadState('analyzing');
      setProgress(50);

      // Simulate analysis progress
      const analyzeInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) { clearInterval(analyzeInterval); return 100; }
          return prev + 10;
        });
      }, 300);

      setTimeout(() => {
        clearInterval(analyzeInterval);
        setProgress(100);
        setUploadState('complete');
        setResult({
          bureau: file.name.toLowerCase().includes('experian') ? 'Experian' :
                  file.name.toLowerCase().includes('equifax') ? 'Equifax' : 'TransUnion',
          score: 678,
          accounts: 12,
          disputeableItems: 3,
          recommendations: [
            'Dispute late payment from March 2023 on Capital One account',
            'Request validation on ABC Collections account',
            'Consider goodwill letter for Chase late payment',
          ],
        });
      }, 1500);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">← Back</Link>
              <h1 className="text-xl font-bold text-gray-900">Upload Credit Report</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {uploadState === 'idle' && (
          <div
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            className={`bg-white rounded-xl shadow-lg p-12 text-center border-2 border-dashed transition-all ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          >
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Credit Report</h2>
            <p className="text-gray-600 mb-6">Drag and drop your PDF credit report or click to browse</p>
            <input type="file" id="file-upload" className="hidden" accept=".pdf,image/*" onChange={handleFileSelect} />
            <label htmlFor="file-upload" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
              Select File
            </label>
            {file && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button onClick={analyzeReport} className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Analyze Report
                </button>
              </div>
            )}
            {error && <p className="mt-4 text-red-600">{error}</p>}
            <div className="mt-8 grid grid-cols-3 gap-4 text-sm text-gray-500">
              <div className="p-3 bg-gray-50 rounded-lg"><span className="text-blue-600 font-medium">Experian</span><br/>Supported</div>
              <div className="p-3 bg-gray-50 rounded-lg"><span className="text-red-600 font-medium">Equifax</span><br/>Supported</div>
              <div className="p-3 bg-gray-50 rounded-lg"><span className="text-green-600 font-medium">TransUnion</span><br/>Supported</div>
            </div>
          </div>
        )}

        {(uploadState === 'uploading' || uploadState === 'analyzing') && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4 animate-pulse">{uploadState === 'uploading' ? '⬆️' : '🔍'}</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{uploadState === 'uploading' ? 'Uploading...' : 'Analyzing Report...'}</h2>
            <div className="w-full max-w-md mx-auto mt-6">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">{progress}%</p>
            </div>
          </div>
        )}

        {uploadState === 'complete' && result && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Analysis Complete</h2>
                <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium">{result.bureau}</span>
              </div>
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-4xl font-bold text-blue-600">{result.score}</p>
                  <p className="text-gray-600">Credit Score</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-4xl font-bold text-purple-600">{result.accounts}</p>
                  <p className="text-gray-600">Accounts</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-4xl font-bold text-red-600">{result.disputeableItems}</p>
                  <p className="text-gray-600">Disputable Items</p>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-3">AI Recommendations</h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start p-3 bg-yellow-50 rounded-lg"><span className="mr-2">💡</span>{rec}</li>
                ))}
              </ul>
              <div className="flex gap-4 mt-8">
                <Link href="/credit-builder" className="flex-1 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700">Start Disputes</Link>
                <button onClick={() => { setUploadState('idle'); setFile(null); setResult(null); }} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">Upload Another</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

