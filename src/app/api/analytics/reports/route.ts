import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import {
  AnalyticsEngine,
  ReportGenerator,
  type ReportFormat,
} from "@/lib/analytics";

interface ReportSummary {
  id: string;
  name: string;
  description: string;
  format: ReportFormat;
  generated_at: string;
}

/**
 * POST /api/analytics/reports
 * Generate analytics report
 */
export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = validation.user.id;
    const body = await request.json();

    const {
      report_type = "user",
      format = "json",
      start_date,
      end_date,
      include_charts = false,
      include_raw_data = true,
    } = body;

    // Check permissions for system reports
    if (
      report_type === "system" &&
      !rbac.hasPermission(validation.user, "admin:analytics")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate analytics report
    const analyticsReport = await AnalyticsEngine.generateReport(
      report_type,
      report_type === "user" ? userId : undefined,
      start_date,
      end_date,
    );

    // Generate formatted report
    const generatedReport = await ReportGenerator.generateReport(
      analyticsReport,
      {
        format: format as ReportFormat,
        includeCharts: include_charts,
        includeRawData: include_raw_data,
      },
    );

    // ReportsRoute: Generated report for user

    // Return report based on format
    if (format === "json") {
      return NextResponse.json({
        report: generatedReport,
        analytics: analyticsReport,
      });
    } else {
      // For other formats, return as downloadable file
      const content =
        typeof generatedReport.content === "string"
          ? generatedReport.content
          : Buffer.from(generatedReport.content).toString();

      return new NextResponse(content, {
        headers: {
          "Content-Type": getContentType(format),
          "Content-Disposition": `attachment; filename="${generatedReport.filename}"`,
          "Content-Length": generatedReport.size_bytes.toString(),
        },
      });
    }
  } catch (_error) {
    // ReportsRoute error: Failed to generate report
    void _error;
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/analytics/reports
 * List available reports (future: fetch from database)
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // In production, fetch from database
    const reports: ReportSummary[] = [];

    return NextResponse.json({ reports });
  } catch (_error) {
    // ReportsRoute error: Failed to fetch reports
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 },
    );
  }
}

/**
 * Get content type for format
 */
function getContentType(format: string): string {
  switch (format) {
    case "pdf":
      return "application/pdf";
    case "csv":
      return "text/csv";
    case "html":
      return "text/html";
    case "json":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}
