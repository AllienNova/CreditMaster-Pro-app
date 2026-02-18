"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploaded_at: string;
  status: string;
}

export default function UserDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch("/api/documents");
        if (response.ok) {
          const data = await response.json();
          setDocuments(data.documents || []);
        } else {
          // Mock data
          setDocuments([
            {
              id: "1",
              name: "Experian_Credit_Report_Nov2024.pdf",
              type: "credit_report",
              size: 2456789,
              uploaded_at: "2024-11-15T10:00:00Z",
              status: "analyzed",
            },
            {
              id: "2",
              name: "Equifax_Report_Oct2024.pdf",
              type: "credit_report",
              size: 1987654,
              uploaded_at: "2024-10-20T14:30:00Z",
              status: "analyzed",
            },
            {
              id: "3",
              name: "Dispute_Response_Experian.pdf",
              type: "dispute_response",
              size: 456789,
              uploaded_at: "2024-11-01T09:15:00Z",
              status: "processed",
            },
            {
              id: "4",
              name: "Identity_Verification.jpg",
              type: "identity",
              size: 234567,
              uploaded_at: "2024-09-10T16:45:00Z",
              status: "verified",
            },
          ]);
        }
      } catch {
        setDocuments([
          {
            id: "1",
            name: "Experian_Credit_Report_Nov2024.pdf",
            type: "credit_report",
            size: 2456789,
            uploaded_at: "2024-11-15T10:00:00Z",
            status: "analyzed",
          },
          {
            id: "2",
            name: "Equifax_Report_Oct2024.pdf",
            type: "credit_report",
            size: 1987654,
            uploaded_at: "2024-10-20T14:30:00Z",
            status: "analyzed",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    // Simulate upload
    setTimeout(() => {
      setDocuments((prev) => [
        {
          id: Date.now().toString(),
          name: file.name,
          type: "credit_report",
          size: file.size,
          uploaded_at: new Date().toISOString(),
          status: "processing",
        },
        ...prev,
      ]);
      setUploading(false);
    }, 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      credit_report: "",
      dispute_response: "",
      identity: "",
      other: "",
    };
    return icons[type] || icons.other;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      processing: "bg-yellow-100 text-yellow-800",
      analyzed: "bg-green-100 text-green-800",
      processed: "bg-blue-100 text-blue-800",
      verified: "bg-blue-100 text-blue-800",
      error: "bg-red-100 text-red-800",
    };
    return (
      colors[status] ||
      "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100"
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 p-8">
        <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50">
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
              >
                ← Back
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                My Documents
              </h1>
            </div>
            <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
              {uploading ? "Uploading..." : "+ Upload Document"}
              <input
                type="file"
                className="hidden"
                onChange={handleUpload}
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={uploading}
              />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Area */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-dashed border-gray-300 dark:border-slate-600 p-8 mb-6 text-center">
          <div className="text-4xl mb-2"></div>
          <p className="text-gray-600 dark:text-slate-300 mb-2">
            Drag and drop your credit reports here
          </p>
          <p className="text-sm text-gray-400 dark:text-slate-500">
            Supports PDF, JPG, PNG (max 10MB)
          </p>
        </div>

        {/* Documents List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Uploaded Documents ({documents.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">{getTypeIcon(doc.type)}</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {doc.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {formatSize(doc.size)} •{" "}
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(doc.status)}`}
                  >
                    {doc.status}
                  </span>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    View
                  </button>
                  <button className="text-red-600 hover:text-red-800 text-sm">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          {documents.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
              No documents uploaded yet
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
