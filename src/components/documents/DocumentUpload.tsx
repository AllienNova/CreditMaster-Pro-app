'use client';

import { useState, useRef, DragEvent } from 'react';
import type { Document, DocumentType } from '@/lib/documents/document-service';
import { useAuth } from '@/hooks/useAuth';

interface DocumentUploadProps {
  onClose: () => void;
  onSuccess: (document: Document) => void;
}

type WizardStep = 1 | 2 | 3;

const DOCUMENT_TYPES: { value: DocumentType; label: string; description: string }[] = [
  { value: 'credit_report', label: 'Credit Report', description: 'Experian/Equifax/TransUnion exports' },
  { value: 'dispute_letter', label: 'Dispute Letter', description: 'Letters or emails sent to bureaus' },
  { value: 'evidence', label: 'Evidence', description: 'Screenshots, statements, proof documents' },
  { value: 'identity_document', label: 'Identity Document', description: 'Driver license, passport, SSN' },
  { value: 'proof_of_address', label: 'Proof of Address', description: 'Utility bills, lease agreements' },
  { value: 'income_verification', label: 'Income Verification', description: 'W2, tax returns, pay stubs' },
  { value: 'other', label: 'Other', description: 'Anything else that supports your case' },
];

const STEPS: { id: WizardStep; label: string; description: string }[] = [
  { id: 1, label: 'Details', description: 'Categorize and describe the document' },
  { id: 2, label: 'Upload', description: 'Securely add the source file' },
  { id: 3, label: 'Review', description: 'Confirm details before submission' },
];

export default function DocumentUpload({ onClose, onSuccess }: DocumentUploadProps) {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<WizardStep>(1);
  const [documentType, setDocumentType] = useState<DocumentType>('credit_report');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const goToNextStep = () => {
    if (step === 1 && !documentType) {
      setError('Please select a document type.');
      return;
    }
    if (step === 2 && !selectedFile) {
      setError('Please select a file to upload.');
      return;
    }
    setError(null);
    if (step < 3) {
      setStep((step + 1) as WizardStep);
    }
  };

  const goToPreviousStep = () => {
    if (step > 1) {
      setStep((step - 1) as WizardStep);
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', documentType);
      formData.append('description', description);
      formData.append('tags', tags);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onSuccess(data.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upload Document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            {STEPS.map((s, index) => (
              <div key={s.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step >= s.id ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                }`}>
                  {s.id}
                </div>
                <div className="ml-2">
                  <p className={`text-sm font-medium ${step >= s.id ? 'text-blue-600' : 'text-gray-500 dark:text-slate-400'}`}>
                    {s.label}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${step > s.id ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Document Type */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Document Type</label>
                <div className="grid grid-cols-1 gap-2">
                  {DOCUMENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setDocumentType(type.value)}
                      className={`p-3 text-left border rounded-lg transition-colors ${ documentType === type.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 dark:border-slate-600' }`}
                    >
                      <p className="font-medium text-gray-900 dark:text-white">{type.label}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Add notes about this document..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Tags (optional)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., equifax, 2024, dispute"
                />
              </div>
            </div>
          )}

          {/* Step 2: File Upload */}
          {step === 2 && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 dark:border-slate-600'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileInputChange}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              />
              {selectedFile ? (
                <div>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="mt-2 text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-2 text-gray-600 dark:text-slate-300">Drag and drop your file here, or</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    browse to upload
                  </button>
                  <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">PDF, PNG, JPG, DOC up to 10MB</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Review Your Upload</h3>
              <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-300">Type:</span>
                  <span className="font-medium">{DOCUMENT_TYPES.find(t => t.value === documentType)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-300">File:</span>
                  <span className="font-medium">{selectedFile?.name}</span>
                </div>
                {description && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-300">Description:</span>
                    <span className="font-medium truncate max-w-xs">{description}</span>
                  </div>
                )}
                {tags && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-300">Tags:</span>
                    <span className="font-medium">{tags}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 dark:bg-slate-900">
          <button
            onClick={step === 1 ? onClose : goToPreviousStep}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={step === 3 ? handleSubmit : goToNextStep}
            disabled={uploading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : step === 3 ? 'Upload' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

