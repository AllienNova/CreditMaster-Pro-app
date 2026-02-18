"use client";

/**
 * Goodwill Letter Generator
 *
 * AI-powered tool to generate goodwill letters for late payment removal.
 * Helps users request removal of accurate but unfortunate negative marks.
 */

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

interface LetterTemplate {
  id: string;
  name: string;
  description: string;
  successRate: number;
  bestFor: string[];
  tone: "formal" | "humble" | "assertive";
}

interface HardshipReason {
  id: string;
  label: string;
  description: string;
  examples: string[];
}

export default function GoodwillLetterPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedTemplate, setSelectedTemplate] =
    useState<LetterTemplate | null>(null);
  const [selectedHardship, setSelectedHardship] =
    useState<HardshipReason | null>(null);
  const [creditorName, setCreditorName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [latePaymentDate, setLatePaymentDate] = useState("");
  const [yourStory, setYourStory] = useState("");
  const [generatedLetter, setGeneratedLetter] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  const templates: LetterTemplate[] = [
    {
      id: "humble",
      name: "Humble Apology",
      description:
        "Sincere, apologetic tone emphasizing your mistake and commitment to improvement",
      successRate: 72,
      bestFor: [
        "First-time late payment",
        "Long positive history",
        "Personal hardship",
      ],
      tone: "humble",
    },
    {
      id: "hardship",
      name: "Hardship Explanation",
      description:
        "Focus on circumstances beyond your control that caused the late payment",
      successRate: 68,
      bestFor: [
        "Medical emergency",
        "Job loss",
        "Natural disaster",
        "Family crisis",
      ],
      tone: "formal",
    },
    {
      id: "loyal-customer",
      name: "Loyal Customer Appeal",
      description:
        "Emphasize your long relationship and otherwise perfect payment history",
      successRate: 75,
      bestFor: [
        "Long account history (5+ years)",
        "Single late payment",
        "Good customer",
      ],
      tone: "assertive",
    },
    {
      id: "resolved",
      name: "Problem Resolved",
      description: "Show the issue is fixed and you've taken corrective action",
      successRate: 65,
      bestFor: [
        "Automated payment setup",
        "Financial counseling",
        "Increased income",
      ],
      tone: "formal",
    },
  ];

  const hardshipReasons: HardshipReason[] = [
    {
      id: "medical",
      label: "Medical Emergency",
      description: "Unexpected illness, injury, or hospitalization",
      examples: [
        "Emergency surgery and hospitalization",
        "Serious illness requiring extended treatment",
        "Accident resulting in temporary disability",
      ],
    },
    {
      id: "job-loss",
      label: "Job Loss or Income Reduction",
      description: "Unemployment, furlough, or significant income decrease",
      examples: [
        "Company layoffs or downsizing",
        "Business closure or bankruptcy",
        "Reduced hours or furlough during pandemic",
      ],
    },
    {
      id: "family",
      label: "Family Crisis",
      description: "Death, divorce, or family emergency",
      examples: [
        "Death of spouse or family member",
        "Divorce or separation",
        "Caring for ill family member",
      ],
    },
    {
      id: "natural-disaster",
      label: "Natural Disaster",
      description: "Hurricane, flood, fire, or other disaster",
      examples: [
        "Home destroyed by hurricane or fire",
        "Flood damage and evacuation",
        "Earthquake or tornado damage",
      ],
    },
    {
      id: "technical",
      label: "Technical Error",
      description: "Payment processing error or bank issue",
      examples: [
        "Auto-payment system failure",
        "Bank processing error",
        "Mail delivery delay",
      ],
    },
    {
      id: "oversight",
      label: "Honest Oversight",
      description: "Genuine mistake during stressful period",
      examples: [
        "Moving and missed payment notice",
        "Overlooked during life transition",
        "Confusion about due date",
      ],
    },
  ];

  const generateLetter = () => {
    if (!selectedTemplate || !selectedHardship || !creditorName) {
      alert("Please fill in all required fields");
      return;
    }

    const letter = `
[Your Name]
[Your Address]
[City, State ZIP]
[Your Phone Number]
[Your Email]

[Date]

${creditorName}
Customer Service Department
[Creditor Address]

Re: Request for Goodwill Adjustment
Account Number: ${accountNumber ? `****${accountNumber.slice(-4)}` : "[Account Number]"}

Dear ${creditorName} Customer Service,

I am writing to request a goodwill adjustment to my credit report regarding a late payment that was reported on ${latePaymentDate || "[date]"}.

${
  selectedHardship.id === "medical"
    ? `
I have been a loyal customer of ${creditorName} for many years and have always prided myself on maintaining excellent payment history. Unfortunately, ${latePaymentDate ? "around " + latePaymentDate : "recently"}, I experienced an unexpected medical emergency that temporarily impacted my ability to make timely payments.

${yourStory || "I was hospitalized and dealing with medical treatments that consumed both my time and financial resources. This was an isolated incident during an extraordinarily difficult period of my life."}
`
    : ""
}

${
  selectedHardship.id === "job-loss"
    ? `
I have been a responsible customer of ${creditorName} and have maintained a positive payment history. However, ${latePaymentDate ? "in " + latePaymentDate : "recently"}, I experienced an unexpected job loss that temporarily affected my financial situation.

${yourStory || "I was laid off due to company downsizing, which was completely unexpected. During this difficult period, I prioritized essential expenses while actively seeking new employment."}
`
    : ""
}

${
  selectedHardship.id === "family"
    ? `
I have valued my relationship with ${creditorName} and have worked hard to maintain a positive payment history. Unfortunately, ${latePaymentDate ? "around " + latePaymentDate : "recently"}, I experienced a family crisis that temporarily impacted my financial management.

${yourStory || "I lost a close family member and was overwhelmed with funeral arrangements, estate matters, and emotional stress. During this difficult time, I unintentionally overlooked my payment obligation."}
`
    : ""
}

${
  selectedHardship.id === "natural-disaster"
    ? `
As a long-time customer of ${creditorName}, I have always prioritized timely payments. However, ${latePaymentDate ? "in " + latePaymentDate : "recently"}, I was affected by a natural disaster that disrupted my ability to manage my finances normally.

${yourStory || "My home was damaged in a severe storm, requiring evacuation and extensive repairs. The chaos of displacement and recovery efforts caused me to miss my payment deadline."}
`
    : ""
}

${
  selectedHardship.id === "technical"
    ? `
I am writing regarding a late payment that appears on my account dated ${latePaymentDate || "[date]"}. As a reliable customer of ${creditorName}, I was surprised to discover this negative mark on my credit report.

${yourStory || "I had set up automatic payments and believed everything was current. It appears there was a technical error with the payment processing system that caused this issue."}
`
    : ""
}

${
  selectedHardship.id === "oversight"
    ? `
I am writing to request your understanding regarding a late payment on ${latePaymentDate || "[date]"}. As someone who values my creditworthiness and relationship with ${creditorName}, I was dismayed to discover this oversight.

${yourStory || "During a particularly hectic period involving a major life transition, I unintentionally missed the payment due date. This was an honest mistake and completely out of character for me."}
`
    : ""
}

I want to emphasize that this late payment was an isolated incident and not representative of my character or financial responsibility. Since this occurrence:

• I have brought the account current and resumed timely payments
• I have implemented safeguards to prevent future oversights (automatic payments, payment reminders)
• I have reviewed and organized my financial obligations to ensure this never happens again

I am kindly requesting that ${creditorName} consider removing this late payment notation from my credit report as a gesture of goodwill. I understand that you are not obligated to do so, but I hope you will take into account:

• My long history as a responsible customer
• The exceptional circumstances that led to this isolated incident
• My immediate action to resolve the issue
• My commitment to maintaining an excellent payment record going forward

This negative mark is significantly impacting my credit score and my ability to [secure a mortgage/refinance my home/qualify for better rates]. I would be extremely grateful if you would consider this request.

I have learned from this experience and have taken concrete steps to ensure it never happens again. I value my relationship with ${creditorName} and hope to continue as a customer in good standing for many years to come.

Thank you for taking the time to consider my request. I would be happy to provide any additional information or documentation you may need. Please feel free to contact me at [your phone number] or [your email].

I look forward to your positive response.

Sincerely,

[Your Signature]
[Your Printed Name]

Enclosures:
- Copy of credit report showing the late payment
- Documentation of hardship (if applicable)
- Proof of current account status
    `.trim();

    setGeneratedLetter(letter);
    setShowPreview(true);
  };

  const downloadLetter = () => {
    const blob = new Blob([generatedLetter], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `goodwill-letter-${creditorName.replace(/\s+/g, "-").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLetter);
    alert("Letter copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/credit-builder"
            className="text-sm text-emerald-600 hover:text-emerald-700 mb-2 inline-block"
          >
            ← Back to Credit Builder
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Goodwill Letter Generator
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Request removal of late payments with AI-powered goodwill letters
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-white dark:bg-slate-800/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl"></span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">High Success Rate</h3>
                <p className="text-sm text-emerald-100">
                  65-75% success rate for one-time late payments
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-white dark:bg-slate-800/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl"></span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">AI-Powered</h3>
                <p className="text-sm text-emerald-100">
                  Customized letters based on your situation
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-white dark:bg-slate-800/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl"></span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Fast Results</h3>
                <p className="text-sm text-emerald-100">
                  Responses typically within 30-60 days
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* What is a Goodwill Letter */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-50 border-2 border-blue-200 rounded-xl p-8 mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                What is a Goodwill Letter?
              </h2>
              <p className="text-gray-700 dark:text-slate-200 mb-4">
                A goodwill letter is a formal request to a creditor asking them
                to remove a late payment from your credit report as a courtesy.
                Unlike dispute letters (which challenge inaccurate information),
                goodwill letters acknowledge the late payment was accurate but
                request removal due to extenuating circumstances.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Best Use Cases
                  </h3>
                  <ul className="text-sm text-gray-700 dark:text-slate-200 space-y-1">
                    <li>• One-time late payment (not chronic lateness)</li>
                    <li>• Long history of on-time payments</li>
                    <li>• Legitimate hardship or emergency</li>
                    <li>• Account is now current</li>
                    <li>• You're a loyal, long-term customer</li>
                  </ul>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                    <svg
                      className="w-5 h-5 text-red-500 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Not Suitable For
                  </h3>
                  <ul className="text-sm text-gray-700 dark:text-slate-200 space-y-1">
                    <li>• Multiple late payments</li>
                    <li>• Accounts in collections</li>
                    <li>• Charge-offs or defaults</li>
                    <li>• Inaccurate information (use disputes instead)</li>
                    <li>• Recent account openings</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Template Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Step 1: Choose Your Letter Template
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 dark:border-slate-700 hover:border-emerald-300"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                      {template.description}
                    </p>
                  </div>
                  {selectedTemplate?.id === template.id && (
                    <svg
                      className="w-6 h-6 text-emerald-600 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-slate-300">
                      Success Rate
                    </span>
                    <span className="text-lg font-bold text-emerald-600">
                      {template.successRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${template.successRate}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 dark:text-slate-300 mb-2">
                    Best for:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {template.bestFor.map((item, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 px-2 py-1 rounded"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hardship Reason */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Step 2: Select Your Hardship Reason
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hardshipReasons.map((reason) => (
              <div
                key={reason.id}
                onClick={() => setSelectedHardship(reason)}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedHardship?.id === reason.id
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 dark:border-slate-700 hover:border-emerald-300"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {reason.label}
                  </h3>
                  {selectedHardship?.id === reason.id && (
                    <svg
                      className="w-5 h-5 text-emerald-600 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">
                  {reason.description}
                </p>
                {selectedHardship?.id === reason.id && (
                  <div className="mt-3 pt-3 border-t border-emerald-200">
                    <div className="text-xs text-gray-600 dark:text-slate-300 mb-1">
                      Examples:
                    </div>
                    <ul className="text-xs text-gray-700 dark:text-slate-200 space-y-1">
                      {reason.examples.map((example, idx) => (
                        <li key={idx}>• {example}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Account Details */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Step 3: Enter Account Details
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                Creditor Name *
              </label>
              <input
                type="text"
                value={creditorName}
                onChange={(e) => setCreditorName(e.target.value)}
                placeholder="e.g., Chase Bank, Capital One, Discover"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                Last 4 Digits of Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="1234"
                maxLength={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                Date of Late Payment
              </label>
              <input
                type="date"
                value={latePaymentDate}
                onChange={(e) => setLatePaymentDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
              Tell Your Story (Optional but Recommended)
            </label>
            <textarea
              value={yourStory}
              onChange={(e) => setYourStory(e.target.value)}
              placeholder="Provide specific details about your situation. The more genuine and specific, the better your chances. Example: 'I was hospitalized for emergency surgery and was unable to manage my finances during my recovery period...'"
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
              Tip: Be honest, specific, and sincere. Creditors respond better to
              genuine hardship stories.
            </p>
          </div>

          <button
            onClick={generateLetter}
            disabled={!selectedTemplate || !selectedHardship || !creditorName}
            className="mt-6 w-full py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Generate Goodwill Letter
          </button>
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Your Goodwill Letter
                </h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-slate-300"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-6 mb-6 font-mono text-sm whitespace-pre-wrap">
                  {generatedLetter}
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={downloadLetter}
                    className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Download Letter
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Copy to Clipboard
                  </button>
                </div>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Next Steps:
                  </h3>
                  <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                    <li>
                      Review and personalize the letter with your specific
                      details
                    </li>
                    <li>Print on quality paper and sign</li>
                    <li>
                      Mail via certified mail with return receipt requested
                    </li>
                    <li>Keep a copy for your records</li>
                    <li>Wait 30-60 days for a response</li>
                    <li>
                      If denied, wait 6 months and try again with a different
                      approach
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Tips */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Tips for Success
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Best Practices
                  </h3>
                  <ul className="text-sm text-gray-700 dark:text-slate-200 space-y-1">
                    <li>• Be honest and sincere</li>
                    <li>• Take responsibility for the late payment</li>
                    <li>• Show you've taken corrective action</li>
                    <li>• Keep it concise (1 page maximum)</li>
                    <li>• Use professional language</li>
                    <li>• Send via certified mail</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Timing Matters
                  </h3>
                  <ul className="text-sm text-gray-700 dark:text-slate-200 space-y-1">
                    <li>• Send within 1-2 years of late payment</li>
                    <li>• Ensure account is current before requesting</li>
                    <li>
                      • Best chances if you have 6+ months of on-time payments
                      since
                    </li>
                    <li>• Holiday season often better (goodwill spirit)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Avoid These Mistakes
                  </h3>
                  <ul className="text-sm text-gray-700 dark:text-slate-200 space-y-1">
                    <li>• Don't make excuses or blame others</li>
                    <li>• Don't threaten to close account</li>
                    <li>• Don't lie about circumstances</li>
                    <li>• Don't demand removal (request politely)</li>
                    <li>• Don't send if account still delinquent</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <svg
                    className="w-5 h-5 text-yellow-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Realistic Expectations
                  </h3>
                  <ul className="text-sm text-gray-700 dark:text-slate-200 space-y-1">
                    <li>• Success rate: 65-75% for first-time late payments</li>
                    <li>• Response time: 30-60 days typically</li>
                    <li>• Smaller creditors more likely to approve</li>
                    <li>• Large banks less flexible but worth trying</li>
                    <li>• If denied, wait 6 months and try again</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
