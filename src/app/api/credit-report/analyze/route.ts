import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

interface DisputeableItem {
  id: string;
  type: string;
  description: string;
  bureau: string;
  severity: "high" | "medium" | "low";
  estimatedImpact: number;
  recommendation: string;
}

interface AnalysisResult {
  reportId: string;
  bureau: string;
  reportDate: string;
  creditScore?: number;
  summary: {
    totalAccounts: number;
    openAccounts: number;
    closedAccounts: number;
    negativeItems: number;
    inquiries: number;
    collections: number;
  };
  disputeableItems: DisputeableItem[];
  recommendations: string[];
  overallHealth: "excellent" | "good" | "fair" | "poor";
}

export const POST = withAuth(
  async (request: NextRequest, _user: AuthedUser) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bureau = (formData.get("bureau") as string) || "unknown";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "text/plain",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload PDF, JPG, PNG, or TXT" },
        { status: 400 },
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 },
      );
    }

    // In production, this would:
    // 1. Upload to secure storage
    // 2. OCR if image/PDF
    // 3. Parse with AI/ML models
    // 4. Store results in database

    // Determine bureau name
    const bureauName = bureau.toLowerCase().includes("experian")
      ? "Experian"
      : bureau.toLowerCase().includes("equifax")
        ? "Equifax"
        : bureau.toLowerCase().includes("transunion")
          ? "TransUnion"
          : "Unknown";

    // GATED 501 — this route used to FABRICATE the analysis it returned.
    //
    // It generated `creditScore: Math.floor(Math.random() * 150) + 600` plus
    // hardcoded account counts and an invented list of "disputeable items",
    // and presented all of it as an analysis of the file the user had just
    // uploaded. A credit-repair product telling someone their score and which
    // tradelines to dispute — from random numbers — is the most damaging shape
    // of the fabrication class this wave exists to close (FND-049..053).
    //
    // There is no report parser in the codebase: nothing implements
    // analyzeReport/parseCreditReport. So the honest answer is that the feature
    // is not built. This follows the precedent set for
    // POST /api/gamification/achievements (commit 6e049cf), which was gated 501
    // rather than left minting fake achievements.
    //
    // The upload is still validated above, so the client learns immediately if
    // the file itself is unacceptable. Implement a real parser, then remove.
    return NextResponse.json(
      {
        error: "Not implemented",
        message:
          "Credit report analysis is not available yet. Your file was not analyzed.",
      },
      { status: 501 },
    );
  } catch (_error) {
    // Error silently caught
    return NextResponse.json(
      { error: "Failed to analyze credit report" },
      { status: 500 },
    );
  }
});

export const GET = withAuth(
  async (_request: NextRequest, _user: AuthedUser) => {
    return NextResponse.json({
      message: "Credit Report Analysis API",
      endpoints: {
        "POST /api/credit-report/analyze": "Upload and analyze a credit report",
      },
      supportedFormats: ["PDF", "JPG", "PNG", "TXT"],
      maxFileSize: "10MB",
    });
  },
);
