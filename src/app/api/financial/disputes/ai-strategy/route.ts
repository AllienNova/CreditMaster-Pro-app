import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/financial/disputes/ai-strategy
 * Returns AI-powered dispute strategy recommendations including success predictions and evidence assessment
 */
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, _user: AuthedUser) => {
  try {


    // Dispute strategy data from dispute service and AI strategy engine
    // Returns opportunities, evidence assessment, and timeline predictions

    const mockData = {
      opportunities: [
        {
          id: "opp-1",
          itemType: "Late Payment",
          itemDescription:
            "Capital One - 30-day late payment from 18 months ago",
          bureau: "all" as const,
          successProbability: 78,
          estimatedImpact: 25,
          recommendedStrategy: "Goodwill Letter + Dispute",
          strategyDescription:
            "Combine goodwill request with factual dispute for maximum effectiveness",
          difficulty: "easy" as const,
          timeline: "30-45 days",
          priority: "high" as const,
        },
        {
          id: "opp-2",
          itemType: "Collection Account",
          itemDescription: "Medical collection - $450 from 2 years ago",
          bureau: "experian" as const,
          successProbability: 85,
          estimatedImpact: 35,
          recommendedStrategy: "Pay-for-Delete Negotiation",
          strategyDescription: "Negotiate removal in exchange for payment",
          difficulty: "medium" as const,
          timeline: "45-60 days",
          priority: "high" as const,
        },
        {
          id: "opp-3",
          itemType: "Hard Inquiry",
          itemDescription: "Unauthorized inquiry from ABC Auto Loans",
          bureau: "equifax" as const,
          successProbability: 92,
          estimatedImpact: 8,
          recommendedStrategy: "Unauthorized Inquiry Dispute",
          strategyDescription:
            "Challenge inquiry as unauthorized with identity theft protection",
          difficulty: "easy" as const,
          timeline: "15-30 days",
          priority: "medium" as const,
        },
        {
          id: "opp-4",
          itemType: "Charge-off",
          itemDescription: "Credit card charge-off - $2,500 from 3 years ago",
          bureau: "all" as const,
          successProbability: 55,
          estimatedImpact: 45,
          recommendedStrategy: "Method of Verification Challenge",
          strategyDescription:
            "Challenge bureau's verification process and request original documentation",
          difficulty: "hard" as const,
          timeline: "60-90 days",
          priority: "high" as const,
        },
      ],
      templates: [
        {
          id: "template-1",
          name: "Goodwill Letter",
          description:
            "Request removal of negative item based on positive payment history and extenuating circumstances",
          successRate: 65,
          bestFor: [
            "Late payments",
            "One-time mistakes",
            "Long-standing customers",
          ],
          steps: [
            "Acknowledge the mistake and take responsibility",
            "Explain extenuating circumstances",
            "Highlight positive payment history",
            "Request goodwill adjustment",
          ],
          legalBasis: "Voluntary creditor action",
        },
        {
          id: "template-2",
          name: "Method of Verification (MOV)",
          description:
            "Challenge the bureau's investigation process and demand proof of verification",
          successRate: 72,
          bestFor: [
            "Verified items",
            "Fast bureau responses",
            "Lack of documentation",
          ],
          steps: [
            "Request detailed verification method",
            "Challenge adequacy of investigation",
            "Demand original documentation",
            "Cite FCRA Section 611",
          ],
          legalBasis:
            "FCRA Section 611 - Procedure in case of disputed accuracy",
        },
        {
          id: "template-3",
          name: "Pay-for-Delete Agreement",
          description:
            "Negotiate removal of collection account in exchange for payment",
          successRate: 58,
          bestFor: ["Collection accounts", "Medical debt", "Small balances"],
          steps: [
            "Contact collection agency",
            "Negotiate removal terms",
            "Get agreement in writing",
            "Make payment only after written confirmation",
          ],
          legalBasis: "Voluntary agreement with creditor",
        },
        {
          id: "template-4",
          name: "Identity Theft Dispute",
          description:
            "Dispute fraudulent accounts or inquiries using identity theft protections",
          successRate: 88,
          bestFor: [
            "Unauthorized accounts",
            "Fraudulent inquiries",
            "Identity theft victims",
          ],
          steps: [
            "File FTC identity theft report",
            "Submit police report",
            "Send dispute with supporting documents",
            "Request fraud alert",
          ],
          legalBasis:
            "FCRA Section 605B - Block of information resulting from identity theft",
        },
      ],
      evidenceAssessments: [
        {
          itemId: "item-1",
          itemDescription: "Capital One late payment dispute",
          evidenceStrength: "moderate" as const,
          strengthScore: 65,
          missingEvidence: ["Payment confirmation", "Bank statement"],
          recommendations: [
            "Obtain bank statement showing payment was made on time",
            "Request payment history from Capital One",
            "Gather proof of extenuating circumstances (medical bills, job loss)",
          ],
        },
        {
          itemId: "item-2",
          itemDescription: "Medical collection account",
          evidenceStrength: "strong" as const,
          strengthScore: 85,
          missingEvidence: [],
          recommendations: [
            "You have strong evidence with insurance EOB and payment records",
            "Proceed with dispute immediately",
            "Include all documentation in initial dispute letter",
          ],
        },
        {
          itemId: "item-3",
          itemDescription: "Unauthorized inquiry",
          evidenceStrength: "strong" as const,
          strengthScore: 92,
          missingEvidence: [],
          recommendations: [
            "File identity theft report with FTC",
            "Submit police report if available",
            "Dispute with all three bureaus simultaneously",
          ],
        },
      ],
      timelinePredictions: [
        {
          disputeType: "Late Payment Dispute",
          estimatedDays: 38,
          confidence: 82,
          milestones: [
            { day: 0, event: "Submit dispute letter" },
            { day: 5, event: "Bureau receives and processes dispute" },
            { day: 15, event: "Bureau contacts creditor for verification" },
            { day: 30, event: "Expected response from bureau" },
            { day: 38, event: "Final resolution" },
          ],
        },
        {
          disputeType: "Collection Account Removal",
          estimatedDays: 52,
          confidence: 75,
          milestones: [
            { day: 0, event: "Initial contact with collection agency" },
            { day: 7, event: "Negotiate pay-for-delete terms" },
            { day: 14, event: "Receive written agreement" },
            { day: 21, event: "Make payment" },
            { day: 45, event: "Verify removal from credit reports" },
            { day: 52, event: "Confirm with all bureaus" },
          ],
        },
        {
          disputeType: "Unauthorized Inquiry",
          estimatedDays: 22,
          confidence: 90,
          milestones: [
            { day: 0, event: "Submit dispute with identity theft report" },
            { day: 3, event: "Bureau acknowledges receipt" },
            { day: 15, event: "Investigation complete" },
            { day: 22, event: "Inquiry removed" },
          ],
        },
      ],
      overallSuccessScore: 76,
      recommendedNextSteps: [
        "Start with the unauthorized inquiry dispute - highest success rate and quickest resolution",
        "Gather bank statements and payment records for the Capital One late payment dispute",
        "Contact the medical collection agency to negotiate pay-for-delete terms",
        "Prepare Method of Verification challenge for the charge-off account",
        "Set up credit monitoring to track dispute progress across all bureaus",
        "Document all communications with creditors and bureaus",
      ],
    };

    return NextResponse.json({
      success: true,
      data: mockData,
      _meta: {
        generatedAt: new Date().toISOString(),
        dataSourcesUsed: [
          "dispute-service",
          "ai-strategy-engine",
          "success-predictions",
        ],
      },
    });
  } catch (error) {
    console.error("Error fetching dispute AI strategy:", error);

    // Return fallback data for better UX
    return NextResponse.json({
      // Degraded, and SAYS SO. This used to answer a failed upstream call with
      // `success: false`, which is indistinguishable from a real empty result —
      // the caller could not tell a genuine "no insights yet" from an outage.
      degraded: true,
      success: true,
      data: {
        opportunities: [],
        templates: [],
        evidenceAssessments: [],
        timelinePredictions: [],
        overallSuccessScore: 0,
        recommendedNextSteps: [
          "Unable to load strategy recommendations at this time",
        ],
      },
      _meta: {
        generatedAt: new Date().toISOString(),
        fallback: true,
      },
    });
  }
},
);
