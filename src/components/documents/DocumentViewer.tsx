'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Document, DocumentType } from '@/lib/documents/document-service';
import { useAuth } from '@/hooks/useAuth';
import DocumentShareModal from './DocumentShareModal';

interface DocumentViewerProps {
  documentId: string;
}

export default function DocumentViewer({ documentId }: DocumentViewerProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [newTags, setNewTags] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const fetchDocument = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents?documentId=${documentId}`);
      
      if (!response.ok) {
        throw new Error('Document not found');
      }
      
      const data = await response.json();
      setDocument(data.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [user, documentId]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchDocument();
    }
  }, [documentId, authLoading, user, fetchDocument]);

  const handleDownload = () => {
    if (document) {
      window.open(document.url, '_blank');
    }
  };

  const handlePrint = () => {
    if (document) {
      const printWindow = window.open(document.url, '_blank');
      printWindow?.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const handleShare = () => {
    if (document) {
      setShareModalOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/documents?documentId=${documentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      router.push('/documents');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const handleAddTags = async () => {
    if (!newTags.trim() || !document) return;
    
    try {
      const tags = newTags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const response = await fetch('/api/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          action: 'add_tags',
          tags,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add tags');
      }
      
      const data = await response.json();
      setDocument(data.document);
      setNewTags('');
      setShowMetadataModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add tags');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTypeName = (type: DocumentType): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getDocumentIcon = (type: DocumentType): string => {
    switch (type) {
      case 'credit_report':
        return '📊';
      case 'dispute_letter':
        return '✉️';
      case 'evidence':
        return '📎';
      case 'identity_document':
        return '🪪';
      case 'proof_of_address':
        return '🏠';
      case 'income_verification':
        return '💰';
      case 'other':
        return '📄';
      default:
        return '📄';
    }
  };

  const isPDF = (mimeType: string): boolean => {
    return mimeType === 'application/pdf';
  };

  const isImage = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Document</h3>
          <p className="text-gray-600 mb-4">{error || 'Document not found'}</p>
          <button
            type="button"
            onClick={() => router.push('/documents')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/documents')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to documents
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{document.originalName}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {formatTypeName(document.type)} · {formatFileSize(document.size)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Download
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Print
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Share
          </button>
          <button
            type="button"
            onClick={() => setShowMetadataModal(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Metadata
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
            </div>
            <div className="p-6">
              {isPDF(document.mimeType) ? (
                <iframe
                  src={document.url}
                  className="w-full h-[600px] border border-gray-300 rounded"
                  title={document.originalName}
                />
              ) : isImage(document.mimeType) ? (
                <img
                  src={document.url}
                  alt={document.originalName}
                  className="w-full h-auto rounded border border-gray-300"
                />
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">{getDocumentIcon(document.type)}</div>
                  <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download to View
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Metadata */}
        <div className="space-y-6">
          {/* Document Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-600">Type</dt>
                <dd className="text-sm text-gray-900 mt-1">{formatTypeName(document.type)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">File Name</dt>
                <dd className="text-sm text-gray-900 mt-1 break-all">{document.originalName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Size</dt>
                <dd className="text-sm text-gray-900 mt-1">{formatFileSize(document.size)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Format</dt>
                <dd className="text-sm text-gray-900 mt-1">{document.mimeType}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Uploaded</dt>
                <dd className="text-sm text-gray-900 mt-1">{formatDate(document.uploadedAt)}</dd>
              </div>
            </dl>
          </div>
          
          {/* Tags */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
            {document.tags && document.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {document.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No tags yet</p>
            )}
          </div>
        </div>
      </div>
      {shareModalOpen && document && (
        <DocumentShareModal
          document={document}
          onClose={() => setShareModalOpen(false)}
        />
      )}

      {/* Metadata Modal */}
      {showMetadataModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Add Tags</h2>
              <button
                type="button"
                onClick={() => setShowMetadataModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="e.g., important, 2024, experian"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowMetadataModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddTags}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Tags
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
