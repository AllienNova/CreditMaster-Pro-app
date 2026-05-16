/**
 * Tax Documents API Route
 *
 * GET /api/tax/documents - Fetch user's tax documents
 * DELETE /api/tax/documents/:id - Delete a tax document
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();

interface TaxDocumentRecord {
  id: string;
  user_id: string;
  document_type: string;
  document_name: string;
  tax_year: number;
  extraction_confidence: number;
  is_verified: boolean;
  status: string;
  requires_review: boolean;
  extracted_data: Record<string, unknown>;
  validation_errors: unknown[];
  storage_path?: string;
  created_at: string;
  updated_at: string;
}

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get("year");
    const documentType = searchParams.get("type");
    const status = searchParams.get("status");

    // Build query
    let query = supabase
      .from("tax_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Apply filters
    if (year) {
      query = query.eq("tax_year", parseInt(year));
    }

    if (documentType) {
      query = query.eq("document_type", documentType);
    }

    if (status === "verified") {
      query = query.eq("is_verified", true);
    } else if (status === "pending") {
      query = query.eq("is_verified", false);
    }

    const { data: documents, error: dbError } = await query;

    if (dbError) {
      // TaxDocumentsAPI error: Database error fetching documents
      return NextResponse.json(
        { error: "Database error", message: "Failed to fetch documents." },
        { status: 500 },
      );
    }

    // Transform to API response format
    const transformedDocs = (documents || []).map((doc) => ({
      id: doc.id,
      documentType: doc.document_type,
      documentName: doc.document_name,
      taxYear: doc.tax_year,
      extractionConfidence: doc.extraction_confidence,
      isVerified: doc.is_verified,
      status: doc.status,
      requiresReview: doc.requires_review,
      extractedData: doc.extracted_data,
      validationErrors: doc.validation_errors,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    }));

    return NextResponse.json({
      success: true,
      documents: transformedDocs,
      count: transformedDocs.length,
      filters: {
        year: year ? parseInt(year) : null,
        documentType,
        status,
      },
    });
  } catch (_error) {
    // TaxDocumentsAPI error: Documents fetch error
    void _error;
    return NextResponse.json(
      { error: "Server error", message: "Unable to fetch documents." },
      { status: 500 },
    );
  }
});

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {
    // Get document ID from query params
    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json(
        { error: "Bad request", message: "Document ID is required." },
        { status: 400 },
      );
    }

    // Verify document belongs to user and delete
    const { data: document, error: fetchError } = await supabase
      .from("tax_documents")
      .select("id, user_id, storage_path")
      .eq("id", documentId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: "Not found", message: "Document not found." },
        { status: 404 },
      );
    }

    if (document.user_id !== user.id) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You do not have permission to delete this document.",
        },
        { status: 403 },
      );
    }

    // Delete from storage if path exists
    if (document.storage_path) {
      await supabase.storage
        .from("tax-documents")
        .remove([document.storage_path]);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("tax_documents")
      .delete()
      .eq("id", documentId);

    if (deleteError) {
      // TaxDocumentsAPI error: Delete error
      return NextResponse.json(
        { error: "Database error", message: "Failed to delete document." },
        { status: 500 },
      );
    }

    // Log deletion
    await supabase.from("tax_audit_log").insert({
      user_id: user.id,
      action_type: "document_deleted",
      entity_type: "tax_document",
      entity_id: documentId,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully.",
    });
  } catch (_error) {
    // TaxDocumentsAPI error: Document delete error
    void _error;
    return NextResponse.json(
      { error: "Server error", message: "Unable to delete document." },
      { status: 500 },
    );
  }
},
);
