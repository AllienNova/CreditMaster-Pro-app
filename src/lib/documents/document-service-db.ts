/**
 * Document Management Service (Database Version)
 *
 * Handles document storage and management with Supabase:
 * - File uploads (S3)
 * - Document metadata (Supabase)
 * - Access control
 * - Document categorization
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSupabase } from '../supabase/client';
import type { Database } from '../supabase/types';

// Type helpers for Supabase operations
type DocumentRow = Database['public']['Tables']['documents']['Row'];
type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
type DocumentUpdate = Database['public']['Tables']['documents']['Update'];

// Helper to get typed table reference
const documents = () => getSupabase().from('documents');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'fynvita-documents';

export type DocumentType =
  | 'credit_report'
  | 'id'
  | 'proof_of_address'
  | 'supporting_doc';

export interface Document {
  id: string;
  userId: string;
  type: DocumentType;
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
  s3Key: string;
  uploadedAt: Date;
}

/**
 * Document Service Class with Supabase
 */
class DocumentServiceDB {
  /**
   * Upload document to S3 and save metadata to database
   */
  async uploadDocument(
    userId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
    documentType: DocumentType
  ): Promise<Document> {
    // Generate unique S3 key
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop();
    const s3Key = `users/${userId}/${documentType}/${timestamp}.${fileExtension}`;

    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: file,
      ContentType: mimeType,
      Metadata: {
        userId,
        documentType,
        originalName: fileName,
      },
    });

    await s3Client.send(putCommand);

    // Generate presigned URL (valid for 7 days)
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 });

    // Save metadata to database
    const insertData: DocumentInsert = {
      user_id: userId,
      type: documentType,
      name: `${documentType}_${timestamp}`,
      original_name: fileName,
      size: file.length,
      mime_type: mimeType,
      s3_key: s3Key,
      s3_url: url,
    };

    const { data, error } = await documents()
      .insert(insertData as any)
      .select()
      .single();

    if (error) {
      // DocumentServiceDB error: Failed to save document metadata
      throw new Error(`Failed to save document metadata: ${error.message}`);
    }

    return this.mapToDocument(data as DocumentRow);
  }

  /**
   * Get document by ID with refreshed URL
   */
  async getDocument(documentId: string): Promise<Document | null> {
    const { data, error } = await documents()
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      // DocumentServiceDB error: Failed to fetch document
      throw new Error(`Failed to fetch document: ${error.message}`);
    }

    const docData = data as DocumentRow;

    // Check if URL needs refresh (older than 6 days)
    const uploadedAt = new Date(docData.uploaded_at);
    const now = new Date();
    const daysSinceUpload =
      (now.getTime() - uploadedAt.getTime()) / (1000 * 60 * 60 * 24);

    let url = docData.s3_url;

    if (daysSinceUpload > 6 || !url) {
      // Regenerate presigned URL
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: docData.s3_key,
      });

      url = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 });

      // Update URL in database
      const updateData: DocumentUpdate = { s3_url: url };
      const query = documents();
      // @ts-expect-error - Supabase types issue with update operations
      await query.update(updateData).eq('id', documentId);

      docData.s3_url = url;
    }

    return this.mapToDocument(docData);
  }

  /**
   * Get user documents
   */
  async getUserDocuments(
    userId: string,
    type?: DocumentType
  ): Promise<Document[]> {
    let query = documents()
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      // DocumentServiceDB error: Failed to fetch user documents
      throw new Error(`Failed to fetch user documents: ${error.message}`);
    }

    return (data || []).map(this.mapToDocument);
  }

  /**
   * Delete document from S3 and database
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    // Get document first
    const { data: doc, error: fetchError } = await documents()
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !doc) {
      // DocumentServiceDB error: Document not found
      return false;
    }

    const docData = doc as DocumentRow;

    // Delete from S3
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: docData.s3_key,
    });

    try {
      await s3Client.send(deleteCommand);
    } catch (error) {
      // DocumentServiceDB error: Failed to delete from S3
      // Continue with database deletion even if S3 fails
    }

    // Delete from database
    const { error: dbError } = await documents().delete().eq('id', documentId);

    if (dbError) {
      // DocumentServiceDB error: Failed to delete document from database
      return false;
    }

    return true;
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(userId: string): Promise<{
    total: number;
    byType: Record<DocumentType, number>;
    totalSize: number;
  }> {
    const documents = await this.getUserDocuments(userId);

    const byType: Record<string, number> = {};
    let totalSize = 0;

    documents.forEach((doc) => {
      byType[doc.type] = (byType[doc.type] || 0) + 1;
      totalSize += doc.size;
    });

    return {
      total: documents.length,
      byType: byType as Record<DocumentType, number>,
      totalSize,
    };
  }

  /**
   * Generate presigned upload URL for client-side upload
   */
  async generateUploadUrl(
    userId: string,
    fileName: string,
    mimeType: string,
    documentType: DocumentType
  ): Promise<{ uploadUrl: string; documentId: string; s3Key: string }> {
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop();
    const s3Key = `users/${userId}/${documentType}/${timestamp}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    }); // 1 hour

    // Create pending document record
    const insertData: DocumentInsert = {
      user_id: userId,
      type: documentType,
      name: `${documentType}_${timestamp}`,
      original_name: fileName,
      size: 0, // Will be updated after upload
      mime_type: mimeType,
      s3_key: s3Key,
      s3_url: null,
    };

    const { data, error } = await documents()
      .insert(insertData as any)
      .select()
      .single();

    if (error) {
      // DocumentServiceDB error: Failed to create document record
      throw new Error(`Failed to create document record: ${error.message}`);
    }

    const docData = data as DocumentRow;

    return {
      uploadUrl,
      documentId: docData.id,
      s3Key,
    };
  }

  /**
   * Confirm upload and update document record
   */
  async confirmUpload(documentId: string, size: number): Promise<Document> {
    // Get document to get S3 key
    const { data: doc, error: fetchError } = await documents()
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !doc) {
      throw new Error('Document not found');
    }

    const docData = doc as DocumentRow;

    // Generate presigned URL
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: docData.s3_key,
    });

    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 });

    // Update document with size and URL
    const updateData: DocumentUpdate = {
      size,
      s3_url: url,
    };

    const query2 = documents();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateResult = await (query2 as any)
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single();
    const { data, error } = updateResult;

    if (error) {
      // DocumentServiceDB error: Failed to confirm upload
      throw new Error(`Failed to confirm upload: ${error.message}`);
    }

    return this.mapToDocument(data as DocumentRow);
  }

  /**
   * Validate file type
   */
  validateFileType(mimeType: string, documentType: DocumentType): boolean {
    const allowedTypes: Record<DocumentType, string[]> = {
      credit_report: ['application/pdf', 'image/png', 'image/jpeg'],
      id: ['application/pdf', 'image/png', 'image/jpeg'],
      proof_of_address: ['application/pdf', 'image/png', 'image/jpeg'],
      supporting_doc: [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    };

    return allowedTypes[documentType]?.includes(mimeType) || false;
  }

  /**
   * Validate file size (max 10MB)
   */
  validateFileSize(size: number): boolean {
    const maxSize = 10 * 1024 * 1024; // 10MB
    return size <= maxSize;
  }

  /**
   * Map database row to Document interface
   */
  private mapToDocument(
    row: Database['public']['Tables']['documents']['Row']
  ): Document {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      name: row.name,
      originalName: row.original_name,
      size: row.size,
      mimeType: row.mime_type,
      url: row.s3_url || '',
      s3Key: row.s3_key,
      uploadedAt: new Date(row.uploaded_at),
    };
  }
}

// Export singleton instance
export const documentServiceDB = new DocumentServiceDB();
export default documentServiceDB;
