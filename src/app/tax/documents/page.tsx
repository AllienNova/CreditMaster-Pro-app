'use client';

/**
 * Tax Documents Management Page
 *
 * Upload, view, and manage tax documents.
 * Documents are processed using multi-provider OCR for accurate extraction.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TaxDocumentUpload } from '@/components/tax';

interface TaxDocument {
  id: string;
  documentType: string;
  documentName: string;
  taxYear: number;
  extractionConfidence: number;
  isVerified: boolean;
  createdAt: string;
}

const DOCUMENT_TYPE_ICONS: Record<string, string> = {
  w2: '',
  '1099_div': '',
  '1099_int': '',
  '1099_b': '',
  '1099_nec': '',
  '1099_misc': '',
  '1099_r': '',
  '1098': '',
  '1098_e': '',
  charitable_receipt: '',
  unknown: '',
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  w2: 'W-2',
  '1099_div': '1099-DIV',
  '1099_int': '1099-INT',
  '1099_b': '1099-B',
  '1099_nec': '1099-NEC',
  '1099_misc': '1099-MISC',
  '1099_r': '1099-R',
  '1098': '1098',
  '1098_e': '1098-E',
  charitable_receipt: 'Donation Receipt',
  unknown: 'Unknown',
};

export default function TaxDocumentsPage() {
  const [documents, setDocuments] = useState<TaxDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [selectedYear]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      // In production, this would call the API
      // For now, using mock data
      await new Promise((resolve) => setTimeout(resolve, 500));

      setDocuments([
        {
          id: '1',
          documentType: 'w2',
          documentName: 'W-2_Employer_2024.pdf',
          taxYear: 2024,
          extractionConfidence: 0.95,
          isVerified: true,
          createdAt: '2024-01-15T10:30:00Z',
        },
        {
          id: '2',
          documentType: '1099_div',
          documentName: 'Fidelity_1099-DIV_2024.pdf',
          taxYear: 2024,
          extractionConfidence: 0.92,
          isVerified: true,
          createdAt: '2024-02-01T14:20:00Z',
        },
        {
          id: '3',
          documentType: '1098',
          documentName: 'Mortgage_Interest_2024.pdf',
          taxYear: 2024,
          extractionConfidence: 0.88,
          isVerified: false,
          createdAt: '2024-02-10T09:15:00Z',
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
    fetchDocuments();
  };

  const years = [2024, 2023, 2022, 2021];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white backdrop-blur-xl border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/tax" className="flex items-center gap-2">
                <span className="text-gray-400">&larr;</span>
                <span className="text-gray-600">Back to Tax</span>
              </Link>
              <span className="text-gray-300">|</span>
              <h1 className="text-lg font-semibold text-amber-600">
                Tax Documents
              </h1>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-colors"
            >
              + Upload Document
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl max-w-xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Upload Tax Document
                </h2>
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close upload modal"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <TaxDocumentUpload
                  taxYear={selectedYear}
                  onUploadComplete={handleUploadComplete}
                />
              </div>
            </div>
          </div>
        )}

        {/* Year Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-slate-400">Tax Year:</span>
            <div className="flex gap-2">
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedYear === year
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 border border-gray-200 dark:border-slate-700'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Documents Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-12 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No documents yet
            </h3>
            <p className="text-gray-500 dark:text-slate-400 mb-6">
              Upload your tax documents to get started with AI-powered
              extraction.
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-colors"
            >
              Upload Your First Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-2xl">
                    {DOCUMENT_TYPE_ICONS[doc.documentType] || ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {DOCUMENT_TYPE_LABELS[doc.documentType] ||
                          doc.documentType}
                      </span>
                      {doc.isVerified ? (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          Verified
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                          Review
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 truncate mt-0.5">
                      {doc.documentName}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-slate-500">
                      <span>
                        {(doc.extractionConfidence * 100).toFixed(0)}%
                        confidence
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
                  <button className="flex-1 px-3 py-1.5 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 rounded-lg transition-colors">
                    View Details
                  </button>
                  <button className="flex-1 px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            ))}

            {/* Add Document Card */}
            <button
              onClick={() => setShowUpload(true)}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-dashed border-gray-200 dark:border-slate-700 p-4 hover:border-amber-400 hover:bg-amber-50/50 transition-colors flex items-center justify-center min-h-[160px]"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg
                    className="w-6 h-6 text-gray-400 dark:text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <span className="text-sm text-gray-500 dark:text-slate-400">Add Document</span>
              </div>
            </button>
          </div>
        )}

        {/* Summary Stats */}
        {documents.length > 0 && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-slate-400">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {documents.length}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-slate-400">Verified</p>
              <p className="text-2xl font-bold text-green-600">
                {documents.filter((d) => d.isVerified).length}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-slate-400">Needs Review</p>
              <p className="text-2xl font-bold text-amber-600">
                {documents.filter((d) => !d.isVerified).length}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-slate-400">Avg Confidence</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {documents.length > 0
                  ? `${((documents.reduce((sum, d) => sum + d.extractionConfidence, 0) / documents.length) * 100).toFixed(0)}%`
                  : '—'}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
