"use client";

/**
 * Tax Document Upload Component
 *
 * Drag-and-drop document upload with real-time OCR processing feedback.
 * Supports W-2, 1099s, 1098s, and other tax documents.
 */

import React, { useState, useCallback, useRef } from "react";

interface ExtractedData {
  type: string;
  fields: Record<string, unknown>;
}

interface UploadResult {
  documentId: string;
  documentType: string;
  documentTypeConfidence: number;
  taxYear: number;
  extractedData: ExtractedData;
  overallConfidence: number;
  providersUsed: string[];
  requiresReview: boolean;
  reviewReasons: string[];
  validationErrors: { field: string; error: string; severity: string }[];
  isValid: boolean;
  processingTimeMs: number;
}

interface TaxDocumentUploadProps {
  taxYear?: number;
  onUploadComplete?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  w2: "W-2 (Wage Statement)",
  "1099_div": "1099-DIV (Dividends)",
  "1099_int": "1099-INT (Interest)",
  "1099_b": "1099-B (Broker)",
  "1099_nec": "1099-NEC (Non-Employee)",
  "1099_misc": "1099-MISC (Miscellaneous)",
  "1099_r": "1099-R (Retirement)",
  "1098": "1098 (Mortgage Interest)",
  "1098_e": "1098-E (Student Loan)",
  charitable_receipt: "Charitable Donation Receipt",
  unknown: "Unknown Document",
};

export function TaxDocumentUpload({
  taxYear = new Date().getFullYear(),
  onUploadComplete,
  onError,
}: TaxDocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [],
  );

  const processFile = async (file: File) => {
    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];
    if (!allowedTypes.includes(file.type)) {
      const errorMsg =
        "Invalid file type. Please upload a PDF, PNG, or JPG file.";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      const errorMsg = "File too large. Maximum size is 10MB.";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("taxYear", String(taxYear));

      const response = await fetch("/api/tax/documents/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const data = await response.json();
      setResult(data.data);
      onUploadComplete?.(data.data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Upload failed";
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="w-full">
      {/* Upload Area */}
      {!result && !isUploading && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-200
            ${
              isDragging
                ? "border-amber-500 bg-amber-50"
                : "border-gray-300 dark:border-slate-600 hover:border-amber-400 hover:bg-amber-50/50"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload tax document"
            title="Upload tax document (PDF, PNG, JPG)"
          />

          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
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
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                Drop your tax document here
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                or click to browse
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mt-2">
              <span className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded text-xs text-gray-600 dark:text-slate-300">
                W-2
              </span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded text-xs text-gray-600 dark:text-slate-300">
                1099
              </span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded text-xs text-gray-600 dark:text-slate-300">
                1098
              </span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded text-xs text-gray-600 dark:text-slate-300">
                Receipts
              </span>
            </div>

            <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
              PDF, PNG, JPG up to 10MB
            </p>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 relative">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-slate-700" />
              <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
            </div>

            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                Processing document...
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                Extracting information with AI
              </p>
            </div>

            <div className="w-full max-w-xs">
              <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 text-center mt-2">
                {uploadProgress < 30 && "Uploading..."}
                {uploadProgress >= 30 &&
                  uploadProgress < 60 &&
                  "Analyzing document..."}
                {uploadProgress >= 60 &&
                  uploadProgress < 90 &&
                  "Extracting fields..."}
                {uploadProgress >= 90 && "Finalizing..."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isUploading && (
        <div className="border border-red-200 bg-red-50 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-red-800">Upload Failed</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button
                onClick={handleReset}
                className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Result */}
      {result && !isUploading && (
        <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          {/* Header */}
          <div
            className={`px-6 py-4 ${result.requiresReview ? "bg-amber-50" : "bg-green-50"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    result.requiresReview ? "bg-amber-100" : "bg-green-100"
                  }`}
                >
                  {result.requiresReview ? (
                    <svg
                      className="w-5 h-5 text-amber-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {DOCUMENT_TYPE_LABELS[result.documentType] ||
                      result.documentType}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    Tax Year {result.taxYear} •{" "}
                    {(result.overallConfidence * 100).toFixed(0)}% confidence
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200"
              >
                Upload Another
              </button>
            </div>

            {result.requiresReview && (
              <div className="mt-3 text-sm text-amber-700">
                <strong>Review needed:</strong>{" "}
                {result.reviewReasons.join(", ")}
              </div>
            )}
          </div>

          {/* Extracted Fields */}
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Extracted Information
            </h4>

            <div className="grid grid-cols-2 gap-4">
              {Object.entries(result.extractedData.fields).map(
                ([key, value]) => {
                  if (value === null || value === undefined) return null;

                  const label = key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase());
                  let displayValue: string;

                  if (typeof value === "number") {
                    displayValue =
                      key.toLowerCase().includes("rate") ||
                      key.toLowerCase().includes("percent")
                        ? `${(value * 100).toFixed(1)}%`
                        : formatCurrency(value);
                  } else if (typeof value === "boolean") {
                    displayValue = value ? "Yes" : "No";
                  } else if (Array.isArray(value)) {
                    displayValue =
                      value.length > 0 ? `${value.length} items` : "None";
                  } else {
                    displayValue = String(value);
                  }

                  return (
                    <div
                      key={key}
                      className="border-b border-gray-100 dark:border-slate-700 pb-2"
                    >
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {label}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {displayValue}
                      </p>
                    </div>
                  );
                },
              )}
            </div>

            {/* Validation Errors */}
            {result.validationErrors.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Validation Notes
                </h4>
                <div className="space-y-2">
                  {result.validationErrors.map((error, idx) => (
                    <div
                      key={idx}
                      className={`text-sm p-2 rounded ${
                        error.severity === "error"
                          ? "bg-red-50 text-red-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      <strong>{error.field}:</strong> {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Processing Info */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
              <span>Processed by: {result.providersUsed.join(", ")}</span>
              <span>{result.processingTimeMs}ms</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaxDocumentUpload;
