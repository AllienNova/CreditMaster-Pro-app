/**
 * Inquiry Removal Tool Component
 * 
 * Remove unauthorized hard inquiries:
 * - 50% success rate
 * - 5-10 points per inquiry removed
 * - FCRA Section 604 compliance
 * - Simple dispute process
 */

'use client';

import { useState } from 'react';

interface Inquiry {
  id: string;
  creditorName: string;
  inquiryDate: string;
  authorized: boolean;
}

export default function InquiryRemovalTool() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [newInquiry, setNewInquiry] = useState({
    creditorName: '',
    inquiryDate: '',
    authorized: false,
  });
  const [generatedLetters, setGeneratedLetters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const addInquiry = () => {
    if (!newInquiry.creditorName || !newInquiry.inquiryDate) return;

    setInquiries([
      ...inquiries,
      {
        id: Date.now().toString(),
        ...newInquiry,
      },
    ]);

    setNewInquiry({
      creditorName: '',
      inquiryDate: '',
      authorized: false,
    });
  };

  const removeInquiry = (id: string) => {
    setInquiries(inquiries.filter(inq => inq.id !== id));
  };

  const generateLetter = async (inquiry: Inquiry) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const letter = `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

${inquiry.creditorName}
Attn: Credit Reporting Department
[Address]

Re: Unauthorized Hard Inquiry - Account #[Last 4 digits]

Dear Sir/Madam:

I am writing to dispute an unauthorized hard inquiry on my credit report dated ${new Date(inquiry.inquiryDate).toLocaleDateString()}.

According to the Fair Credit Reporting Act (FCRA) Section 604, creditors may only pull my credit report with my written permission. I did not authorize ${inquiry.creditorName} to access my credit report on this date.

I am requesting that this unauthorized inquiry be removed from my credit report immediately. Please provide written confirmation of the removal within 30 days.

If you cannot verify that I authorized this inquiry, you must remove it under FCRA Section 611.

Sincerely,
[Your Signature]
[Your Name]`;

      setGeneratedLetters({
        ...generatedLetters,
        [inquiry.id]: letter,
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadLetter = (inquiry: Inquiry) => {
    const letter = generatedLetters[inquiry.id];
    if (!letter) return;

    const blob = new Blob([letter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inquiry-removal-${inquiry.creditorName}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const unauthorizedCount = inquiries.filter(inq => !inq.authorized).length;
  const potentialImpact = unauthorizedCount * 7; // Average 7 points per inquiry

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-600 rounded-lg p-8 text-white mb-6">
        <h1 className="text-3xl font-bold mb-2">Inquiry Removal Tool</h1>
        <p className="text-blue-100">
          Remove unauthorized hard inquiries - 50% success rate, 5-10 points each
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 dark:text-slate-300">Total Inquiries</div>
          <div className="text-3xl font-bold text-gray-800 dark:text-slate-100">{inquiries.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 dark:text-slate-300">Unauthorized</div>
          <div className="text-3xl font-bold text-red-600">{unauthorizedCount}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 dark:text-slate-300">Potential Impact</div>
          <div className="text-3xl font-bold text-green-600">+{potentialImpact} pts</div>
        </div>
      </div>

      {/* Add Inquiry Form */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Add Hard Inquiry</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
              Creditor Name
            </label>
            <input
              type="text"
              value={newInquiry.creditorName}
              onChange={(e) => setNewInquiry({ ...newInquiry, creditorName: e.target.value })}
              placeholder="e.g., Capital One, Chase"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
              Inquiry Date
            </label>
            <input
              type="date"
              value={newInquiry.inquiryDate}
              onChange={(e) => setNewInquiry({ ...newInquiry, inquiryDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={addInquiry}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Inquiry
            </button>
          </div>
        </div>
        <div className="mt-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={newInquiry.authorized}
              onChange={(e) => setNewInquiry({ ...newInquiry, authorized: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-slate-200">I authorized this inquiry (for tracking only)</span>
          </label>
        </div>
      </div>

      {/* Inquiries List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Your Hard Inquiries</h2>
        
        {inquiries.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            No inquiries added yet. Add your hard inquiries above.
          </div>
        )}

        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <div key={inquiry.id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100">{inquiry.creditorName}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      inquiry.authorized 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {inquiry.authorized ? 'Authorized' : 'Unauthorized'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    Date: {new Date(inquiry.inquiryDate).toLocaleDateString()}
                  </p>
                  {!inquiry.authorized && (
                    <p className="text-sm text-green-600 mt-1">
                      Can be disputed - Estimated impact: +5-10 points
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeInquiry(inquiry.id)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>

              {!inquiry.authorized && (
                <div className="flex gap-3 mt-3">
                  {!generatedLetters[inquiry.id] ? (
                    <button
                      onClick={() => generateLetter(inquiry)}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      Generate Dispute Letter
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => downloadLetter(inquiry)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Download Letter
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(generatedLetters[inquiry.id])}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Copy Letter
                      </button>
                    </>
                  )}
                </div>
              )}

              {generatedLetters[inquiry.id] && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View Letter
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <pre className="whitespace-pre-wrap text-xs text-gray-800 dark:text-slate-100 font-mono">
                      {generatedLetters[inquiry.id]}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      {unauthorizedCount > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">Next Steps:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
            <li>Generate dispute letters for all unauthorized inquiries</li>
            <li>Send to each creditor via certified mail</li>
            <li>Send copies to all 3 credit bureaus</li>
            <li>Wait 30 days for response</li>
            <li>If no response, inquiry must be removed</li>
          </ol>
        </div>
      )}
    </div>
  );
}

