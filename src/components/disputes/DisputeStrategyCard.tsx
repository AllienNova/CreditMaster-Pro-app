'use client';

interface DisputeStrategy {
  dispute_id: string;
  loan_id: string;
  error_type: string;
  dispute_strategy: string;
  letter_content: string;
  success_probability: number;
  estimated_timeline: number;
  required_documentation: string[];
  legal_precedents: string[];
  created_at: Date;
}

interface DisputeStrategyCardProps {
  strategy: DisputeStrategy;
  rank: number;
  isSelected: boolean;
  onSelect: () => void;
  onGenerateLetter: () => void;
  generating: boolean;
}

export default function DisputeStrategyCard({
  strategy,
  rank,
  isSelected,
  onSelect,
  onGenerateLetter,
  generating,
}: DisputeStrategyCardProps) {
  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 2:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 3:
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getSuccessProbabilityColor = (probability: number) => {
    if (probability >= 0.8) return 'text-green-600';
    if (probability >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getErrorTypeLabel = (errorType: string) => {
    const labels: Record<string, string> = {
      payment_misapplication: 'Payment Misapplication',
      interest_calculation: 'Interest Calculation Error',
      forbearance_error: 'Forbearance/Deferment Error',
      pslf_count_error: 'PSLF Payment Count Error',
      servicer_transfer: 'Servicer Transfer Issue',
      incorrect_balance: 'Incorrect Balance',
      unauthorized_fees: 'Unauthorized Fees',
      credit_reporting: 'Credit Reporting Error',
    };
    return labels[errorType] || errorType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div
      className={`border-2 rounded-lg transition-all cursor-pointer ${
        isSelected
          ? 'border-blue-600 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-bold border-2 ${getRankBadgeColor(rank)}`}>
              #{rank}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {getErrorTypeLabel(strategy.error_type)}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {strategy.dispute_strategy}
              </p>
            </div>
          </div>
        </div>

        {/* Success Probability */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Success Probability</span>
            <span className={`text-2xl font-bold ${getSuccessProbabilityColor(strategy.success_probability)}`}>
              {Math.round(strategy.success_probability * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                strategy.success_probability >= 0.8
                  ? 'bg-green-600'
                  : strategy.success_probability >= 0.6
                  ? 'bg-yellow-600'
                  : 'bg-red-600'
              }`}
              style={{ width: `${strategy.success_probability * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Estimated Timeline</span>
          </div>
          <p className="text-lg font-bold text-gray-900 ml-7">
            {strategy.estimated_timeline} days
          </p>
        </div>

        {/* Required Documentation */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Required Documentation</h4>
          <div className="space-y-2">
            {strategy.required_documentation.slice(0, 3).map((doc, index) => (
              <div key={index} className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-gray-700">{doc}</span>
              </div>
            ))}
            {strategy.required_documentation.length > 3 && (
              <p className="text-xs text-gray-500 ml-7">
                +{strategy.required_documentation.length - 3} more documents
              </p>
            )}
          </div>
        </div>

        {/* Legal Precedents */}
        {strategy.legal_precedents && strategy.legal_precedents.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Legal Precedents</h4>
            <div className="space-y-2">
              {strategy.legal_precedents.slice(0, 2).map((precedent, index) => (
                <div key={index} className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                  <span className="text-sm text-gray-700">{precedent}</span>
                </div>
              ))}
              {strategy.legal_precedents.length > 2 && (
                <p className="text-xs text-gray-500 ml-7">
                  +{strategy.legal_precedents.length - 2} more precedents
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerateLetter();
            }}
            disabled={generating}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating...' : 'Generate Letter'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Handle view details
            }}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Details
          </button>
        </div>

        {/* Selected Indicator */}
        {isSelected && (
          <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-blue-900">Currently Selected</span>
            </div>
          </div>
        )}

        {/* Confidence Badge */}
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>AI-powered analysis based on {strategy.legal_precedents.length} legal precedents</span>
        </div>
      </div>
    </div>
  );
}

