"use client";

import { Document, DocumentType } from "@/lib/documents/document-service";
import { useRouter } from "next/navigation";

interface DocumentCardProps {
  document: Document;
  viewMode: "grid" | "list";
  onDelete: (documentId: string) => void;
  onDownload: (document: Document) => void;
  onShare?: (document: Document) => void;
}

export default function DocumentCard({
  document,
  viewMode,
  onDelete,
  onDownload,
  onShare,
}: DocumentCardProps) {
  const router = useRouter();

  const getDocumentIcon = (type: DocumentType): string => {
    switch (type) {
      case "credit_report":
        return "";
      case "dispute_letter":
        return "";
      case "evidence":
        return "";
      case "identity_document":
        return "";
      case "proof_of_address":
        return "";
      case "income_verification":
        return "";
      case "other":
        return "";
      default:
        return "";
    }
  };

  const getDocumentColor = (type: DocumentType): string => {
    switch (type) {
      case "credit_report":
        return "bg-green-50 text-green-700 border-green-200";
      case "dispute_letter":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "evidence":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "identity_document":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "proof_of_address":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "income_verification":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "other":
        return "bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-700";
      default:
        return "bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-700";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getFileExtension = (fileName: string): string => {
    return fileName.split(".").pop()?.toUpperCase() || "FILE";
  };

  const formatTypeName = (type: DocumentType): string => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleView = () => {
    router.push(`/documents/${document.id}`);
  };

  if (viewMode === "list") {
    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {/* Icon */}
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${getDocumentColor(document.type)}`}
            >
              {getDocumentIcon(document.type)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/*
                The card had download, delete and share but no way to OPEN a
                document — /documents/[id] existed with nothing linking to it,
                so a user could see their W-2 listed and never read it. The
                title is the obvious affordance and `router` was already here,
                imported and unused for navigation.
              */}
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                <button
                  type="button"
                  onClick={() => router.push(`/documents/${document.id}`)}
                  className="text-left hover:text-emerald-700 hover:underline dark:hover:text-emerald-400"
                >
                  {document.originalName}
                </button>
              </h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 dark:text-slate-300">
                <span
                  className={`px-2 py-1 rounded-full border ${getDocumentColor(document.type)}`}
                >
                  {formatTypeName(document.type)}
                </span>
                <span>{formatFileSize(document.size)}</span>
                <span>{formatDate(document.uploadedAt)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onShare && (
              <button
                type="button"
                onClick={() => onShare(document)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 rounded-lg transition-colors"
                title="Share"
              >
                Share
              </button>
            )}
            <button
              type="button"
              onClick={handleView}
              className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View"
            >
              View
            </button>
            <button
              type="button"
              onClick={() => onDownload(document)}
              className="px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 rounded-lg transition-colors"
              title="Download"
            >
              Download
            </button>
            <button
              type="button"
              onClick={() => onDelete(document.id)}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Preview */}
      <div
        className={`h-32 flex items-center justify-center cursor-pointer ${getDocumentColor(document.type)}`}
        onClick={handleView}
      >
        <div className="text-center">
          <div className="text-5xl mb-2">{getDocumentIcon(document.type)}</div>
          <div className="text-xs font-semibold">
            {getFileExtension(document.originalName)}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3
          className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-2 cursor-pointer hover:text-blue-600"
          onClick={handleView}
          title={document.originalName}
        >
          {document.originalName}
        </h3>

        <div className="space-y-2 mb-4">
          <div
            className={`inline-block px-2 py-1 rounded-full text-xs border ${getDocumentColor(document.type)}`}
          >
            {formatTypeName(document.type)}
          </div>

          <div className="text-xs text-gray-600 dark:text-slate-300 space-y-1">
            <div className="flex items-center justify-between">
              <span>Size:</span>
              <span className="font-medium">
                {formatFileSize(document.size)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Uploaded:</span>
              <span className="font-medium">
                {formatDate(document.uploadedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {onShare && (
            <button
              type="button"
              onClick={() => onShare(document)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
            >
              Share
            </button>
          )}
          <button
            type="button"
            onClick={handleView}
            className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View
          </button>
          <button
            type="button"
            onClick={() => onDownload(document)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
            title="Download"
          >
            ⬇
          </button>
          <button
            type="button"
            onClick={() => onDelete(document.id)}
            className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            title="Delete"
          ></button>
        </div>
      </div>
    </div>
  );
}
