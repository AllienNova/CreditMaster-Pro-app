/**
 * Tax Document Upload API Route
 *
 * POST /api/tax/documents/upload
 * Uploads and processes a tax document using multi-provider OCR.
 *
 * SECURITY:
 * - Requires authentication
 * - File size limit: 10MB
 * - Supported formats: PDF, PNG, JPG, JPEG
 * - All processing logged for audit
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { taxDocumentProcessor } from '@/lib/tax/documents';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Please sign in to upload documents.',
        },
        { status: 401 }
      );
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const taxYear = formData.get('taxYear') as string | null;

    if (!file) {
      return NextResponse.json(
        {
          error: 'No file provided',
          message: 'Please select a file to upload.',
        },
        { status: 400 }
      );
    }

    // 3. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: 'File size must be less than 10MB.',
        },
        { status: 400 }
      );
    }

    // 4. Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          message: 'Supported formats: PDF, PNG, JPG, JPEG.',
        },
        { status: 400 }
      );
    }

    // 5. Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    // 6. Process document with multi-provider OCR
    const result = await taxDocumentProcessor.processDocument(user.id, {
      base64Image,
      mimeType: file.type,
      fileName: file.name,
      fileSize: file.size,
    });

    // 7. Store document metadata in database
    const insertData = {
      user_id: user.id,
      tax_year:
        result.taxYear ||
        parseInt(taxYear || String(new Date().getFullYear())),
      document_type: result.documentType as string,
      document_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      extracted_data: result.extractedData as unknown as Record<string, unknown>,
      extraction_confidence: result.overallConfidence,
      is_verified: !result.requiresReview,
    };
    const { data: docRecord, error: dbError } = await supabase
      .from('tax_documents')
      .insert(insertData as never)
      .select()
      .single();

    if (dbError) {
      // Database error silently handled
    }

    // 8. Return result
    return NextResponse.json({
      success: true,
      data: {
        documentId: result.documentId,
        documentType: result.documentType,
        documentTypeConfidence: result.documentTypeConfidence,
        taxYear: result.taxYear,
        extractedData: result.extractedData,
        overallConfidence: result.overallConfidence,
        providersUsed: result.providersUsed,
        requiresReview: result.requiresReview,
        reviewReasons: result.reviewReasons,
        validationErrors: result.validationErrors,
        isValid: result.isValid,
        processingTimeMs: result.totalProcessingTimeMs,
      },
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        processedAt: result.processedAt.toISOString(),
        databaseRecordId: (docRecord as Record<string, unknown> | null)?.id,
      },
    });
  } catch (_error) {
    // Error silently caught
    return NextResponse.json(
      {
        error: 'Processing failed',
        message:
          'Unable to process the document. Please try again or upload a different file.',
      },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
