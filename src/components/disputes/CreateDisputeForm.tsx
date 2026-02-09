'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bureau } from '@/lib/disputes/dispute-service';
import { useAuth } from '@/hooks/useAuth';

interface FormData {
  bureau: Bureau | '';
  itemType: string;
  itemDescription: string;
  reason: string;
  letterContent: string;
  userInfo: {
    name: string;
    address: string;
  };
}

export default function CreateDisputeForm() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    bureau: '',
    itemType: '',
    itemDescription: '',
    reason: '',
    letterContent: '',
    userInfo: {
      name: '',
      address: '',
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 5;

  const updateFormData = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateUserInfo = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      userInfo: { ...prev.userInfo, [field]: value },
    }));
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
      setError(null);
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setError(null);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.bureau) {
          setError('Please select a bureau');
          return false;
        }
        return true;
      case 2:
        if (!formData.itemType.trim()) {
          setError('Please enter the item type');
          return false;
        }
        if (!formData.itemDescription.trim()) {
          setError('Please enter the item description');
          return false;
        }
        return true;
      case 3:
        if (!formData.reason.trim()) {
          setError('Please enter the dispute reason');
          return false;
        }
        return true;
      case 4:
        if (!formData.userInfo.name.trim()) {
          setError('Please enter your name');
          return false;
        }
        if (!formData.userInfo.address.trim()) {
          setError('Please enter your address');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const generateLetter = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/disputes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditReport: {
            accounts: [],
          },
          disputeReason: `${formData.itemType}: ${formData.itemDescription}. Reason: ${formData.reason}`,
          userInfo: formData.userInfo,
          reviewCompliance: true,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate letter');
      }

      updateFormData('letterContent', data.data.disputeLetter);
      nextStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate letter');
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!user) {
      setError('You must be logged in to save a draft');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bureau: formData.bureau,
          itemType: formData.itemType,
          itemDescription: formData.itemDescription,
          reason: formData.reason,
          letterContent: formData.letterContent || 'Draft - Letter not generated yet',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save draft');
      }

      const data = await response.json();
      router.push(`/disputes/${data.dispute.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const submitDispute = async () => {
    if (!user) {
      setError('You must be logged in to submit a dispute');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bureau: formData.bureau,
          itemType: formData.itemType,
          itemDescription: formData.itemDescription,
          reason: formData.reason,
          letterContent: formData.letterContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create dispute');
      }

      const data = await response.json();
      router.push(`/disputes/${data.dispute.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dispute');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
        Please log in to create a dispute.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
      {/* Progress Bar */}
      <div className="px-8 pt-8 pb-4">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                }`}
              >
                {step}
              </div>
              {step < 5 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-600 dark:text-slate-300 mt-2">
          <span>Bureau</span>
          <span>Item Info</span>
          <span>Reason</span>
          <span>Generate</span>
          <span>Review</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-8 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Form Steps */}
      <div className="px-8 pb-8">
        {currentStep === 1 && (
          <Step1Bureau
            bureau={formData.bureau}
            onChange={(value) => updateFormData('bureau', value)}
          />
        )}
        {currentStep === 2 && (
          <Step2ItemInfo
            itemType={formData.itemType}
            itemDescription={formData.itemDescription}
            onChangeType={(value) => updateFormData('itemType', value)}
            onChangeDescription={(value) => updateFormData('itemDescription', value)}
          />
        )}
        {currentStep === 3 && (
          <Step3Reason
            reason={formData.reason}
            onChange={(value) => updateFormData('reason', value)}
          />
        )}
        {currentStep === 4 && (
          <Step4UserInfo
            name={formData.userInfo.name}
            address={formData.userInfo.address}
            onChangeName={(value) => updateUserInfo('name', value)}
            onChangeAddress={(value) => updateUserInfo('address', value)}
            loading={loading}
            onGenerate={generateLetter}
          />
        )}
        {currentStep === 5 && (
          <Step5Review
            formData={formData}
            letterContent={formData.letterContent}
            onEdit={(value) => updateFormData('letterContent', value)}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="px-8 py-6 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex justify-between">
        <div>
          {currentStep > 1 && (
            <button
              onClick={prevStep}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Back
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {currentStep < 5 && currentStep > 1 && (
            <button
              onClick={saveDraft}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Save Draft
            </button>
          )}
          {currentStep < 4 && (
            <button
              onClick={nextStep}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Next
            </button>
          )}
          {currentStep === 5 && (
            <button
              onClick={submitDispute}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Dispute'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 1: Bureau Selection
function Step1Bureau({ bureau, onChange }: { bureau: Bureau | ''; onChange: (value: Bureau) => void }) {
  const bureaus: { value: Bureau; name: string; color: string; description: string }[] = [
    {
      value: 'experian',
      name: 'Experian',
      color: 'border-red-500 hover:bg-red-50',
      description: 'One of the three major credit bureaus',
    },
    {
      value: 'equifax',
      name: 'Equifax',
      color: 'border-blue-500 hover:bg-blue-50',
      description: 'One of the three major credit bureaus',
    },
    {
      value: 'transunion',
      name: 'TransUnion',
      color: 'border-green-500 hover:bg-green-50',
      description: 'One of the three major credit bureaus',
    },
  ];

  return (
    <div className="py-6">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Select Credit Bureau</h2>
      <p className="text-gray-600 dark:text-slate-300 mb-6">Choose which bureau you want to dispute with</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {bureaus.map((b) => (
          <button
            key={b.value}
            onClick={() => onChange(b.value)}
            className={`p-6 border-2 rounded-lg text-left transition-all ${
              bureau === b.value
                ? `${b.color} border-opacity-100 bg-opacity-10`
                : 'border-gray-200 hover:border-gray-300 dark:border-slate-600'
            }`}
          >
            <h3 className="text-xl font-semibold mb-2">{b.name}</h3>
            <p className="text-sm text-gray-600 dark:text-slate-300">{b.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// Step 2: Item Information
function Step2ItemInfo({
  itemType,
  itemDescription,
  onChangeType,
  onChangeDescription,
}: {
  itemType: string;
  itemDescription: string;
  onChangeType: (value: string) => void;
  onChangeDescription: (value: string) => void;
}) {
  const itemTypes = [
    'Credit Card',
    'Auto Loan',
    'Mortgage',
    'Student Loan',
    'Personal Loan',
    'Collection Account',
    'Hard Inquiry',
    'Public Record',
    'Personal Information',
    'Other',
  ];

  return (
    <div className="py-6">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Item Information</h2>
      <p className="text-gray-600 dark:text-slate-300 mb-6">Provide details about the item you're disputing</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
            Item Type
          </label>
          <select
            value={itemType}
            onChange={(e) => onChangeType(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select item type...</option>
            {itemTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
            Item Description
          </label>
          <textarea
            value={itemDescription}
            onChange={(e) => onChangeDescription(e.target.value)}
            rows={4}
            placeholder="Describe the item in detail (e.g., 'Chase Credit Card ending in 1234, opened 01/2020, current balance $5,000')"
            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}

// Step 3: Dispute Reason
function Step3Reason({ reason, onChange }: { reason: string; onChange: (value: string) => void }) {
  const commonReasons = [
    'Not my account',
    'Incorrect balance',
    'Incorrect payment history',
    'Account closed but showing as open',
    'Duplicate account',
    'Fraudulent account',
    'Paid in full but showing balance',
    'Identity theft',
    'Incorrect personal information',
    'Other',
  ];

  return (
    <div className="py-6">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Dispute Reason</h2>
      <p className="text-gray-600 dark:text-slate-300 mb-6">Explain why you're disputing this item</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
            Common Reasons (Optional)
          </label>
          <select
            onChange={(e) => {
              if (e.target.value) {
                onChange(e.target.value);
              }
            }}
            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a common reason...</option>
            {commonReasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
            Detailed Reason
          </label>
          <textarea
            value={reason}
            onChange={(e) => onChange(e.target.value)}
            rows={6}
            placeholder="Provide a detailed explanation of why this item is inaccurate or incomplete..."
            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            Be specific and factual. Include dates, amounts, and any relevant details.
          </p>
        </div>
      </div>
    </div>
  );
}

// Step 4: User Info & Generate
function Step4UserInfo({
  name,
  address,
  onChangeName,
  onChangeAddress,
  loading,
  onGenerate,
}: {
  name: string;
  address: string;
  onChangeName: (value: string) => void;
  onChangeAddress: (value: string) => void;
  loading: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="py-6">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Your Information</h2>
      <p className="text-gray-600 dark:text-slate-300 mb-6">Provide your information for the dispute letter</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="John Doe"
            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
            Address
          </label>
          <textarea
            value={address}
            onChange={(e) => onChangeAddress(e.target.value)}
            rows={3}
            placeholder="123 Main St&#10;Anytown, ST 12345"
            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="pt-4">
          <button
            onClick={onGenerate}
            disabled={loading || !name.trim() || !address.trim()}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Letter with AI...
              </span>
            ) : (
              'Generate Dispute Letter with AI'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 5: Review
function Step5Review({
  formData,
  letterContent,
  onEdit,
}: {
  formData: FormData;
  letterContent: string;
  onEdit: (value: string) => void;
}) {
  return (
    <div className="py-6">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Review & Submit</h2>
      <p className="text-gray-600 dark:text-slate-300 mb-6">Review your dispute letter before submitting</p>

      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Dispute Summary</h3>
          <dl className="space-y-2">
            <div className="flex">
              <dt className="font-medium text-gray-700 dark:text-slate-200 w-32">Bureau:</dt>
              <dd className="text-gray-900 dark:text-white capitalize">{formData.bureau}</dd>
            </div>
            <div className="flex">
              <dt className="font-medium text-gray-700 dark:text-slate-200 w-32">Item Type:</dt>
              <dd className="text-gray-900 dark:text-white">{formData.itemType}</dd>
            </div>
            <div className="flex">
              <dt className="font-medium text-gray-700 dark:text-slate-200 w-32">Description:</dt>
              <dd className="text-gray-900 dark:text-white">{formData.itemDescription}</dd>
            </div>
            <div className="flex">
              <dt className="font-medium text-gray-700 dark:text-slate-200 w-32">Reason:</dt>
              <dd className="text-gray-900 dark:text-white">{formData.reason}</dd>
            </div>
          </dl>
        </div>

        {/* Letter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
            Dispute Letter (Editable)
          </label>
          <textarea
            value={letterContent}
            onChange={(e) => onEdit(e.target.value)}
            rows={15}
            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            You can edit the letter before submitting. Make sure all information is accurate.
          </p>
        </div>
      </div>
    </div>
  );
}
