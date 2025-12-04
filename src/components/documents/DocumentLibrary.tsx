'use client';

import { useState, useEffect, useCallback } from 'react';
import { Document, DocumentType } from '@/lib/documents/document-service';
import DocumentCard from './DocumentCard';
import DocumentUpload from './DocumentUpload';
import DocumentShareModal from './DocumentShareModal';
import { useAuth } from '@/hooks/useAuth';

type ViewMode = 'grid' | 'list';
type SortBy = 'date' | 'name' | 'size';

export default function DocumentLibrary() {
  const { user, loading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and view
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [shareDocument, setShareDocument] = useState<Document | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const filterAndSortDocuments = useCallback(() => {
    let filtered = [...documents];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.type === typeFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.uploadedAt.getTime() - a.uploadedAt.getTime();
        case 'name':
          return a.originalName.localeCompare(b.originalName);
        case 'size':
          return b.size - a.size;
        default:
          return 0;
      }
    });
    
    setFilteredDocuments(filtered);
  }, [documents, searchTerm, typeFilter, sortBy]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchDocuments();
    }
  }, [authLoading, user, fetchDocuments]);

  useEffect(() => {
    filterAndSortDocuments();
  }, [filterAndSortDocuments]);

  const handleUploadSuccess = (document: Document) => {
    setDocuments(prev => [document, ...prev]);
    setShowUploadModal(false);
  };

  const handleDelete = async (documentId: string) => {
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
      
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      // Open the presigned URL in a new tab
      window.open(document.url, '_blank');
    } catch (err) {
      console.error('Failed to download document', err);
      alert('Failed to download document');
    }
  };

  const documentTypes: { value: DocumentType | 'all'; label: string }[] = [
    { value: 'all', label: 'All Documents' },
    { value: 'credit_report', label: 'Credit Reports' },
    { value: 'dispute_letter', label: 'Dispute Letters' },
    { value: 'evidence', label: 'Evidence' },
    { value: 'identity_document', label: 'ID Documents' },
    { value: 'proof_of_address', label: 'Proof of Address' },
    { value: 'income_verification', label: 'Income Verification' },
    { value: 'other', label: 'Other' },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-10 bg-gray-200 rounded mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Documents</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDocuments}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        {/* Toolbar */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Filters and Actions */}
            <div className="flex items-center gap-3">
              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as DocumentType | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {documentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="size">Sort by Size</option>
              </select>
              
              {/* View Mode Toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Grid View"
                >
                  ⊞
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title="List View"
                >
                  ☰
                </button>
              </div>
              
              {/* Upload Button */}
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                + Upload
              </button>
            </div>
          </div>
        </div>
        
        {/* Documents */}
        <div className="p-6">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📄</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || typeFilter !== 'all' ? 'No documents found' : 'No documents yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Upload your first document to get started'}
              </p>
              {!searchTerm && typeFilter === 'all' && (
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload Document
                </button>
              )}
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
              }
            >
              {filteredDocuments.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  viewMode={viewMode}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                  onShare={setShareDocument}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Upload Modal */}
      {showUploadModal && (
        <DocumentUpload
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {shareDocument && (
        <DocumentShareModal
          document={shareDocument}
          onClose={() => setShareDocument(null)}
        />
      )}
    </>
  );
}
