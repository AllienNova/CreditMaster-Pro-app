"use client";

import { useState, useRef } from "react";
import type { Bureau } from "@/types/credit-bureau";

interface CreditReportImportProps {
  onImportComplete?: (reportId: string) => void;
  onError?: (error: string) => void;
}

export default function CreditReportImport({
  onImportComplete,
  onError,
}: CreditReportImportProps) {
  const [selectedBureau, setSelectedBureau] = useState<Bureau | null>(null);
  const [importMethod, setImportMethod] = useState<"file" | "api" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bureaus: { id: Bureau; name: string; color: string; logo: string }[] = [
    { id: "experian", name: "Experian", color: "blue", logo: "" },
    { id: "equifax", name: "Equifax", color: "red", logo: "" },
    { id: "transunion", name: "TransUnion", color: "purple", logo: "" },
  ];

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedBureau) return;

    // Validate file type
    const validTypes = ["application/pdf", "text/plain", "text/html"];
    if (!validTypes.includes(file.type)) {
      setErrorMessage(
        "Invalid file type. Please upload a PDF, TXT, or HTML file.",
      );
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File size exceeds 10MB limit.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Create form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bureau", selectedBureau);

      // Upload file
      const response = await fetch("/api/credit-bureau/import", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await response.json();

      setSuccessMessage(
        `Credit report imported successfully! Found ${result.accountsCount} accounts.`,
      );

      if (onImportComplete) {
        onImportComplete(result.reportId);
      }

      // Reset after 3 seconds
      setTimeout(() => {
        setSelectedBureau(null);
        setImportMethod(null);
        setProgress(0);
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Upload failed";
      setErrorMessage(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleApiImport = async () => {
    if (!selectedBureau) return;

    setUploading(true);
    setProgress(0);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Call API to import from bureau
      const response = await fetch("/api/credit-bureau/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bureau: selectedBureau }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Import failed");
      }

      const result = await response.json();

      setSuccessMessage(
        `Credit report imported successfully! Found ${result.accountsCount} accounts.`,
      );

      if (onImportComplete) {
        onImportComplete(result.reportId);
      }

      // Reset after 3 seconds
      setTimeout(() => {
        setSelectedBureau(null);
        setImportMethod(null);
        setProgress(0);
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Import failed";
      setErrorMessage(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-700">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Import Credit Report
      </h2>

      {/* Step 1: Select Bureau */}
      {!selectedBureau && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Step 1: Select Credit Bureau
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bureaus.map((bureau) => (
              <button
                key={bureau.id}
                onClick={() => setSelectedBureau(bureau.id)}
                className={`p-6 border-2 rounded-lg hover:shadow-md transition-all ${
                  selectedBureau === bureau.id
                    ? `border-${bureau.color}-500 bg-${bureau.color}-50`
                    : "border-gray-200 hover:border-gray-300 dark:border-slate-600"
                }`}
              >
                <div className="text-4xl mb-2">{bureau.logo}</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {bureau.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Select Import Method */}
      {selectedBureau && !importMethod && !uploading && !successMessage && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Step 2: Choose Import Method for{" "}
              {bureaus.find((b) => b.id === selectedBureau)?.name}
            </h3>
            <button
              onClick={() => setSelectedBureau(null)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200"
            >
              ← Change Bureau
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Upload */}
            <button
              onClick={() => {
                setImportMethod("file");
                fileInputRef.current?.click();
              }}
              className="p-6 border-2 border-gray-200 dark:border-slate-700 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600"
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
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Upload File
                  </div>
                  <div className="text-sm text-gray-500 dark:text-slate-400">
                    PDF, TXT, or HTML
                  </div>
                </div>
              </div>
            </button>

            {/* API Import */}
            <button
              onClick={() => {
                setImportMethod("api");
                handleApiImport();
              }}
              className="p-6 border-2 border-gray-200 dark:border-slate-700 rounded-lg hover:border-green-500 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Direct Import
                  </div>
                  <div className="text-sm text-gray-500 dark:text-slate-400">
                    Connect via API
                  </div>
                </div>
              </div>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.html"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Progress */}
      {uploading && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Importing Credit Report...
          </h3>
          <div className="space-y-4">
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-center text-sm text-gray-600 dark:text-slate-300">
              {progress}% complete
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <svg
              className="w-6 h-6 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-green-800 font-medium">{successMessage}</div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <svg
              className="w-6 h-6 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-red-800 font-medium">{errorMessage}</div>
          </div>
          <button
            onClick={() => {
              setErrorMessage(null);
              setImportMethod(null);
            }}
            className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
