"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

// Types
interface DebtAccount {
  id: string;
  creditor: string;
  originalCreditor?: string;
  type: "collection" | "charge_off" | "medical" | "credit_card" | "loan";
  originalBalance: number;
  currentBalance: number;
  dateOfFirstDelinquency: Date;
  status: "active" | "negotiating" | "settled" | "paid";
  priority: "high" | "medium" | "low";
  bureaus: ("experian" | "equifax" | "transunion")[];
  deletionRequested: boolean;
  deletionGranted: boolean;
  settlementOffer?: number;
  settlementAccepted?: boolean;
  notes: string;
}

interface LetterTemplate {
  id: string;
  name: string;
  description: string;
  successRate: number;
  tone: "formal" | "humble" | "assertive" | "legal";
  bestFor: string[];
  template: string;
}

interface NegotiationStrategy {
  id: string;
  name: string;
  description: string;
  steps: string[];
  successRate: number;
  difficulty: "easy" | "medium" | "hard";
}

export default function PayForDeleteNegotiator() {
  const { user, loading: authLoading } = useAuth();

  const [debts, setDebts] = useState<DebtAccount[]>([]);
  const [selectedDebt, setSelectedDebt] = useState<DebtAccount | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [generatedLetter, setGeneratedLetter] = useState("");
  const [showLetter, setShowLetter] = useState(false);
  const [settlementPercentage, setSettlementPercentage] = useState(30);
  const [loading, setLoading] = useState(false);
  const [showStrategyGuide, setShowStrategyGuide] = useState(false);

  // Letter templates
  const letterTemplates: LetterTemplate[] = [
    {
      id: "initial_pfd",
      name: "Initial Pay-for-Delete Request",
      description: "First contact requesting deletion in exchange for payment",
      successRate: 45,
      tone: "formal",
      bestFor: ["Collections under 2 years old", "First-time negotiation"],
      template: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Collection Agency Address]
[City, State ZIP]

Re: Account Number: [ACCOUNT_NUMBER]

Dear Sir or Madam:

I am writing regarding the above-referenced account that appears on my credit reports. I acknowledge this debt and am prepared to resolve it.

I would like to propose a settlement whereby I will pay [SETTLEMENT_AMOUNT] in full satisfaction of this debt, provided that you agree to request the deletion of all trade lines related to this account from Experian, Equifax, and TransUnion.

If you agree to these terms, please send me written confirmation that:

1. This settlement will satisfy the debt in full
2. You will request deletion of all references to this account from all three credit bureaus within 30 days of payment
3. You will provide written confirmation of deletion once completed

Upon receipt of this written agreement, I will submit payment via [METHOD] within 10 business days.

Please respond to this offer in writing within 15 days. If I do not hear from you, I will consider this offer withdrawn.

Thank you for your consideration.

Sincerely,
[Your Name]`,
    },
    {
      id: "hardship_pfd",
      name: "Hardship-Based Pay-for-Delete",
      description: "Emphasizes financial hardship while offering settlement",
      successRate: 52,
      tone: "humble",
      bestFor: ["Medical collections", "Recent hardship situations"],
      template: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Collection Agency Address]
[City, State ZIP]

Re: Account Number: [ACCOUNT_NUMBER]

Dear Collections Manager:

I am writing to address the outstanding balance on the above account. Due to [HARDSHIP_REASON], I fell behind on my financial obligations. However, I am now in a position to begin resolving my debts.

My credit report shows this account with a balance of [CURRENT_BALANCE]. While I acknowledge this debt, I am currently unable to pay the full amount due to my financial circumstances.

I would like to propose a settlement of [SETTLEMENT_AMOUNT] ([SETTLEMENT_PERCENTAGE]% of the balance) in full satisfaction of this debt. In exchange for this payment, I respectfully request that your agency:

1. Accept this amount as payment in full
2. Request deletion of all trade lines related to this account from all three major credit bureaus
3. Provide written confirmation of both the settlement and the deletion request

This settlement will allow me to resolve this matter while also helping me rebuild my credit and financial stability. I am prepared to make this payment immediately upon receiving written confirmation of these terms.

Please send your written acceptance to the address above or email to [YOUR_EMAIL].

I appreciate your understanding and look forward to resolving this matter.

Respectfully,
[Your Name]`,
    },
    {
      id: "percentage_pfd",
      name: "Percentage-Based Offer",
      description: "Straightforward percentage offer with deletion request",
      successRate: 48,
      tone: "formal",
      bestFor: ["Older debts", "Clear settlement goal"],
      template: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
Attn: Settlement Department
[Collection Agency Address]
[City, State ZIP]

Re: Settlement Offer - Account [ACCOUNT_NUMBER]

Dear Settlement Department:

This letter is a formal settlement offer for the account referenced above.

Account Details:
- Original Creditor: [ORIGINAL_CREDITOR]
- Current Balance: [CURRENT_BALANCE]
- Account Number: [ACCOUNT_NUMBER]

Settlement Offer:
I am prepared to pay [SETTLEMENT_AMOUNT] ([SETTLEMENT_PERCENTAGE]% of the current balance) as a lump sum payment in full satisfaction of this debt.

Terms Required:
1. Acceptance of the settlement amount as payment in full
2. Deletion of all references to this account from Experian, Equifax, and TransUnion
3. No future attempts to collect this debt
4. Written confirmation of the above terms

Payment Terms:
Upon receipt of written acceptance of these terms, payment will be made via [METHOD] within 5 business days.

This offer is valid for 30 days from the date of this letter. If you do not accept this offer within that timeframe, it will be considered withdrawn.

Please send your written response to the address above.

Sincerely,
[Your Name]
[Phone Number]
[Email Address]`,
    },
    {
      id: "legal_leverage",
      name: "Legal Leverage Letter",
      description: "Uses legal knowledge to strengthen negotiation position",
      successRate: 55,
      tone: "assertive",
      bestFor: ["Statute of limitations near", "Potential FDCPA violations"],
      template: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
Legal Department
[Collection Agency Address]
[City, State ZIP]

Re: Account [ACCOUNT_NUMBER] - Settlement Offer

Dear Legal Department:

I am writing regarding the account referenced above. Before proceeding, please be aware:

1. I am aware of my rights under the Fair Debt Collection Practices Act (FDCPA)
2. The statute of limitations for this debt expires on [SOL_DATE]
3. I have documented all communications regarding this account
4. I am prepared to dispute any continued reporting if settlement is not reached

Settlement Proposal:
Despite the above, I wish to resolve this matter amicably. I am offering [SETTLEMENT_AMOUNT] ([SETTLEMENT_PERCENTAGE]% of balance) as full settlement under the following conditions:

Required Terms:
1. This payment satisfies the debt completely
2. All trade lines related to this account are deleted from all credit bureaus
3. A legally binding settlement agreement is provided in writing BEFORE payment
4. Your agency agrees to cease all collection activities immediately
5. No future sale or transfer of this debt

Legal Assurances Needed:
Your written agreement must include:
- Confirmation this is a valid debt you have legal authority to collect
- Acknowledgment of the settlement terms
- Commitment to deletion within 30 days of payment
- Release of all claims related to this debt

Payment:
Upon receipt of a signed settlement agreement meeting the above terms, payment will be made within 7 business days.

This offer expires in 21 days. Failure to respond will be considered a rejection, and I will proceed with formal dispute processes.

Sincerely,
[Your Name]

CC: Consumer Financial Protection Bureau (for record)`,
    },
    {
      id: "final_offer",
      name: "Final Settlement Offer",
      description: "Last attempt before considering other options",
      successRate: 42,
      tone: "assertive",
      bestFor: ["After previous rejections", "Near statute expiration"],
      template: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
Settlement Department
[Collection Agency Address]
[City, State ZIP]

Re: FINAL SETTLEMENT OFFER - Account [ACCOUNT_NUMBER]

Dear Settlement Department:

This letter constitutes my final offer to settle the above-referenced account.

Previous Attempts:
I have previously attempted to resolve this matter on [PREVIOUS_DATE(S)]. To date, we have not reached a mutually agreeable settlement.

Final Offer:
I am making one final offer of [SETTLEMENT_AMOUNT] ([SETTLEMENT_PERCENTAGE]% of balance) in full satisfaction of this debt, contingent upon:

1. Written agreement accepting this amount as payment in full
2. Complete deletion of this account from all three credit bureaus
3. Cessation of all collection activities
4. Legal release from any future claims

Alternative Actions:
If this offer is not accepted within 15 days, I will pursue the following alternatives:

1. Formal validation of debt under FDCPA
2. Dispute with all three credit bureaus
3. Consultation with a consumer rights attorney
4. Filing complaints with CFPB and state attorney general
5. Allowing the statute of limitations to expire (expires [SOL_DATE])

Decision Required:
This is a genuine attempt to resolve this matter fairly. However, I must receive written acceptance within 15 days, or I will consider the matter closed and pursue other options.

Please respond immediately if you wish to accept this settlement.

Sincerely,
[Your Name]
[Date]`,
    },
  ];

  // Negotiation strategies
  const strategies: NegotiationStrategy[] = [
    {
      id: "graduated_offer",
      name: "Graduated Offer Strategy",
      description: "Start low and gradually increase offer",
      steps: [
        "First offer: 20-25% of balance",
        "Wait 2-3 weeks for response",
        "Second offer: 30-35% if rejected",
        'Third offer: 40-50% as "final offer"',
        "Maximum: Never exceed 60% of balance",
      ],
      successRate: 68,
      difficulty: "medium",
    },
    {
      id: "lump_sum_leverage",
      name: "Lump Sum Leverage",
      description: "Use ability to pay immediately as leverage",
      steps: [
        "Emphasize you have cash ready NOW",
        "Offer 30-40% for immediate settlement",
        "Set short deadline (5-10 days)",
        "Make it clear this is one-time offer",
        "Stress urgency of getting paid now vs. waiting",
      ],
      successRate: 62,
      difficulty: "easy",
    },
    {
      id: "statute_of_limitations",
      name: "Statute of Limitations Play",
      description: "Leverage approaching SOL expiration",
      steps: [
        "Calculate SOL expiration date for your state",
        "If within 6 months of expiration, mention it",
        'Offer 10-25% as "goodwill settlement"',
        "Emphasize this is last chance to collect anything",
        "Wait for them to realize time is running out",
      ],
      successRate: 71,
      difficulty: "hard",
    },
    {
      id: "multiple_debt_package",
      name: "Multiple Debt Package Deal",
      description: "Negotiate several debts together for better terms",
      steps: [
        "Identify all debts with same agency",
        "Calculate total owed across all accounts",
        "Offer 25-35% of TOTAL for all debts",
        "Request deletion on all accounts",
        "Present as package - all or nothing",
      ],
      successRate: 65,
      difficulty: "medium",
    },
    {
      id: "hardship_sympathy",
      name: "Hardship & Sympathy Approach",
      description: "Use genuine hardship to negotiate better terms",
      steps: [
        "Document your hardship (medical, job loss, etc.)",
        "Write emotional but professional letter",
        "Offer whatever you can afford (even if low)",
        'Request deletion as "fresh start" measure',
        "Appeal to their humanity and company policy",
      ],
      successRate: 58,
      difficulty: "easy",
    },
  ];

  useEffect(() => {
    fetchDebts();
  }, []);

  const fetchDebts = async () => {
    try {
      const response = await fetch("/api/credit-builder/debts");
      if (response.ok) {
        const data = await response.json();
        setDebts(data.debts || []);
      }
    } catch (err) {
      console.error("Failed to fetch debts:", err);
    }
  };

  const generateLetter = () => {
    if (!selectedDebt || !selectedTemplate) return;

    const template = letterTemplates.find((t) => t.id === selectedTemplate);
    if (!template) return;

    const settlementAmount = Math.round(
      (selectedDebt.currentBalance * settlementPercentage) / 100,
    );

    let letter = template.template;
    letter = letter.replace(
      /\[ACCOUNT_NUMBER\]/g,
      "XXXXXX" + Math.random().toString(36).substring(7),
    );
    letter = letter.replace(
      /\[CURRENT_BALANCE\]/g,
      `$${selectedDebt.currentBalance.toLocaleString()}`,
    );
    letter = letter.replace(
      /\[SETTLEMENT_AMOUNT\]/g,
      `$${settlementAmount.toLocaleString()}`,
    );
    letter = letter.replace(
      /\[SETTLEMENT_PERCENTAGE\]/g,
      `${settlementPercentage}`,
    );
    letter = letter.replace(
      /\[ORIGINAL_CREDITOR\]/g,
      selectedDebt.originalCreditor || selectedDebt.creditor,
    );
    letter = letter.replace(/\[CREDITOR\]/g, selectedDebt.creditor);

    setGeneratedLetter(letter);
    setShowLetter(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLetter);
  };

  const downloadLetter = () => {
    const blob = new Blob([generatedLetter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pay-for-delete-letter-${Date.now()}.txt`;
    a.click();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-lg text-gray-700 dark:text-slate-200 font-medium">
            Loading Pay-for-Delete Negotiator...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-red-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/credit-builder"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Back to Credit Builder
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Pay-for-Delete Negotiator
          </h1>
          <p className="text-lg text-gray-600 dark:text-slate-300 max-w-3xl mx-auto">
            Negotiate debt settlements with credit report deletion. Professional
            templates and proven strategies to maximize your success rate.
          </p>
        </div>

        {/* Success Rate Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-emerald-600 rounded-xl p-6 mb-8 text-white shadow-xl">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold mb-1">45-71%</p>
              <p className="text-sm opacity-90">Average Success Rate</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold mb-1">30-50%</p>
              <p className="text-sm opacity-90">Typical Settlement Range</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold mb-1">60-120 pts</p>
              <p className="text-sm opacity-90">Average Score Increase</p>
            </div>
          </div>
        </div>

        {/* Strategy Guide Toggle */}
        <div className="text-center mb-8">
          <button
            onClick={() => setShowStrategyGuide(!showStrategyGuide)}
            className="px-6 py-3 bg-white dark:bg-slate-800 text-blue-600 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors"
          >
            {showStrategyGuide ? "Hide" : "Show"} Negotiation Strategies
          </button>
        </div>

        {/* Strategies */}
        {showStrategyGuide && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Proven Negotiation Strategies
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {strategies.map((strategy) => (
                <div
                  key={strategy.id}
                  className="p-6 bg-gradient-to-br from-blue-50 to-emerald-50 rounded-xl border-2 border-blue-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                      {strategy.name}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        strategy.difficulty === "easy"
                          ? "bg-green-100 text-green-800"
                          : strategy.difficulty === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {strategy.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-slate-200 mb-4">
                    {strategy.description}
                  </p>
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-blue-600 mb-2">
                      Success Rate: {strategy.successRate}%
                    </p>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${strategy.successRate}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Steps:
                    </p>
                    <ol className="space-y-1">
                      {strategy.steps.map((step, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-gray-700 dark:text-slate-200 flex gap-2"
                        >
                          <span className="font-semibold">{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column: Debt Selection & Letter Generation */}
          <div className="space-y-6">
            {/* Debt Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Select Debt to Negotiate
              </h2>

              {debts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-slate-400 mb-4">
                    No debts on file
                  </p>
                  <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
                    Add Debt
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {debts.map((debt) => (
                    <button
                      key={debt.id}
                      onClick={() => setSelectedDebt(debt)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedDebt?.id === debt.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 dark:border-slate-700 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {debt.creditor}
                        </p>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            debt.priority === "high"
                              ? "bg-red-100 text-red-800"
                              : debt.priority === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {debt.priority} priority
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">
                        Balance: ${debt.currentBalance.toLocaleString()} •{" "}
                        {debt.type.replace("_", " ")}
                      </p>
                      <div className="flex gap-2">
                        {debt.bureaus.map((bureau) => (
                          <span
                            key={bureau}
                            className="px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded text-xs"
                          >
                            {bureau}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settlement Calculator */}
            {selectedDebt && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Settlement Calculator
                </h3>

                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-slate-300">
                      Current Balance
                    </span>
                    <span className="font-semibold">
                      ${selectedDebt.currentBalance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between mb-4">
                    <span className="text-sm text-gray-600 dark:text-slate-300">
                      Settlement Percentage
                    </span>
                    <span className="font-semibold">
                      {settlementPercentage}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={settlementPercentage}
                    onChange={(e) =>
                      setSettlementPercentage(parseInt(e.target.value))
                    }
                    className="w-full"
                  />

                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {[20, 30, 40, 50, 75].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setSettlementPercentage(pct)}
                        className="px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 text-xs rounded hover:bg-blue-100"
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-slate-300 mb-1">
                    Settlement Offer Amount
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    $
                    {Math.round(
                      (selectedDebt.currentBalance * settlementPercentage) /
                        100,
                    ).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-300 mt-2">
                    You save: $
                    {(
                      selectedDebt.currentBalance -
                      Math.round(
                        (selectedDebt.currentBalance * settlementPercentage) /
                          100,
                      )
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Template Selection */}
            {selectedDebt && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Choose Letter Template
                </h3>

                <div className="space-y-3">
                  {letterTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedTemplate === template.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 dark:border-slate-700 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {template.name}
                        </p>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                          {template.successRate}% success
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {template.bestFor.map((use, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded text-xs"
                          >
                            {use}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={generateLetter}
                  disabled={!selectedTemplate}
                  className="w-full mt-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  Generate Letter
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Generated Letter */}
          <div className="space-y-6">
            {showLetter && generatedLetter ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Generated Pay-for-Delete Letter
                </h3>

                <div className="mb-6 p-6 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg font-mono text-sm whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                  {generatedLetter}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={copyToClipboard}
                    className="py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Copy Letter
                  </button>
                  <button
                    onClick={downloadLetter}
                    className="py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Download
                  </button>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-2">
                    Important Reminders
                  </h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>
                      • Fill in all [BRACKETED] placeholders with your
                      information
                    </li>
                    <li>
                      • Send via certified mail with return receipt requested
                    </li>
                    <li>• Keep copies of all correspondence</li>
                    <li>• Get written agreement BEFORE making any payment</li>
                    <li>• Never give direct access to your bank account</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                <div className="text-center py-12">
                  <span className="text-6xl mb-4 block"></span>
                  <p className="text-gray-500 dark:text-slate-400">
                    Select a debt and template to generate your letter
                  </p>
                </div>
              </div>
            )}

            {/* Tips & Best Practices */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Negotiation Tips
              </h3>
              <div className="space-y-3 text-sm text-gray-700 dark:text-slate-200">
                <div className="flex gap-3">
                  <span className="text-green-500 mt-1"></span>
                  <p>
                    <strong>Always get it in writing:</strong> Never make
                    payment until you have written confirmation of deletion
                    agreement.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-500 mt-1"></span>
                  <p>
                    <strong>Start low:</strong> Initial offer should be 20-30%
                    of balance. You can always go higher.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-500 mt-1"></span>
                  <p>
                    <strong>Be patient:</strong> Collections agencies often wait
                    to see if you'll increase your offer.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-500 mt-1"></span>
                  <p>
                    <strong>Get names:</strong> Document who you speak with,
                    when, and what was discussed.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-red-500 mt-1"></span>
                  <p>
                    <strong>Don't admit to owing:</strong> Say "alleged debt"
                    until you've validated it's yours.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-red-500 mt-1"></span>
                  <p>
                    <strong>Don't restart SOL:</strong> Making payment can
                    restart statute of limitations.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-red-500 mt-1"></span>
                  <p>
                    <strong>Don't use debit card:</strong> Use money order or
                    cashier's check for final payment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Educational Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-3">
            Understanding Pay-for-Delete
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-semibold mb-1">What It Is</p>
              <p>
                A negotiated agreement where you pay a debt (often for less than
                owed) in exchange for the creditor deleting all references from
                your credit reports.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">Why It Works</p>
              <p>
                Collections agencies buy debts for pennies on the dollar.
                Getting 30-50% in cash NOW is often better than hoping to
                collect 100% later.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">Legal Status</p>
              <p>
                While not illegal, some creditors refuse pay-for-delete as
                policy. It's worth trying - worst case is they say no and you
                negotiate a standard settlement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
