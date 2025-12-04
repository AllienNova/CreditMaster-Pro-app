'use client';

import { useEffect, useState } from 'react';
import type { Document, DocumentShareLink } from '@/lib/documents/document-service';

interface DocumentShareModalProps {
  document: Document;
  onClose: () => void;
}

export default function DocumentShareModal({ document, onClose }: DocumentShareModalProps) {
  const [recipients, setRecipients] = useState<string>('');
  const [expiration, setExpiration] = useState(24);
  const [permission, setPermission] = useState<'view' | 'download'>('view');
  const [links, setLinks] = useState<DocumentShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadLinks = async () => {
      try {
        const response = await fetch(`/api/documents/share?documentId=${document.id}`);
        if (response.ok) {
          const data = await response.json();
          setLinks(data.links || []);
        }
      } catch (err) {
        console.error('Failed to load share links', err);
      }
    };

    void loadLinks();
  }, [document.id]);

  const handleCreateLink = async () => {
    const emails = recipients
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      setError('Please add at least one email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/documents/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          recipients: emails,
          permissions: permission,
          expiresInHours: expiration,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create share link');
      }

      const data = await response.json();
      setLinks((prev) => [data.link, ...prev]);
      setRecipients('');
      setSuccessMessage('Secure link created and copied to your clipboard.');
      await navigator.clipboard.writeText(data.link.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setSuccessMessage('Link copied to clipboard.');
  };

  const handleRevoke = async (shareId: string) => {
    const response = await fetch(`/api/documents/share?shareId=${shareId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setLinks((prev) => prev.filter((link) => link.id !== shareId));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Share document</p>
            <h3 className="text-xl font-semibold text-gray-900 truncate">{document.originalName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            aria-label="Close share modal"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-100">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-100">
              {successMessage}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Recipients</label>
            <textarea
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="Enter email addresses separated by commas"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permission</label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as 'view' | 'download')}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="view">View only</option>
                <option value="download">Allow downloads</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expires in</label>
              <select
                value={expiration}
                onChange={(e) => setExpiration(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                {[1, 6, 12, 24, 48, 72, 168].map((hours) => (
                  <option key={hours} value={hours}>
                    {hours < 24 ? `${hours} hour${hours === 1 ? '' : 's'}` : `${hours / 24} day(s)`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateLink}
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating secure link…' : 'Create secure link'}
          </button>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Active links</h4>
            {links.length === 0 && (
              <p className="text-sm text-gray-500">No active links yet. Create one above.</p>
            )}
            <div className="space-y-3">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {link.recipients.join(', ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {permissionLabel(link.permissions)} · Expires{' '}
                      {link.expiresAt.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                      onClick={() => handleCopy(link.url)}
                    >
                      Copy link
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                      onClick={() => handleRevoke(link.id)}
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const permissionLabel = (value: 'view' | 'download') =>
  value === 'download' ? 'Can view & download' : 'View only';

