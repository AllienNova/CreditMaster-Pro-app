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
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSupabase } from "../supabase/client";
import type { Database } from "../supabase/types";

// Type helpers for Supabase operations
type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];
type ShareLinkRow = Database["public"]["Tables"]["document_share_links"]["Row"];
type ShareLinkInsert = Database["public"]["Tables"]["document_share_links"]["Insert"];

// Helper to get typed table references
const documents = () => getSupabase().from("documents");
const shareLinks = () => getSupabase().from("document_share_links");

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "fynvita-documents";

export type DocumentType =
  | "credit_report"
  | "id"
  | "proof_of_address"
  | "supporting_doc";

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
  metadata?: Record<string, unknown> | null;
  tags?: string[] | null;
}

export interface ShareLink {
  id: string;
  documentId: string;
  userId: string;
  recipients: string[];
  permissions: "view" | "download";
  url: string;
  expiresAt: Date;
  createdAt: Date;
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
    documentType: DocumentType,
  ): Promise<Document> {
    // Generate unique S3 key
    const timestamp = Date.now();
    const fileExtension = fileName.split(".").pop();
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
   * Get document by ID with refreshed URL.
   * userId scoping prevents IDOR — returns null for wrong owner.
   */
  async getDocument(documentId: string, userId: string): Promise<Document | null> {
    const { data, error } = await documents()
      .select("*")
      .eq("id", documentId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
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
      await query.update(updateData).eq("id", documentId);

      docData.s3_url = url;
    }

    return this.mapToDocument(docData);
  }

  /**
   * Get user documents
   */
  async getUserDocuments(
    userId: string,
    type?: DocumentType,
  ): Promise<Document[]> {
    let query = documents()
      .select("*")
      .eq("user_id", userId)
      .order("uploaded_at", { ascending: false });

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;

    if (error) {
      // DocumentServiceDB error: Failed to fetch user documents
      throw new Error(`Failed to fetch user documents: ${error.message}`);
    }

    return (data || []).map(this.mapToDocument);
  }

  /**
   * Delete document from S3 and database.
   * userId scoping prevents IDOR — returns false for wrong owner.
   */
  async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    // Get document first, scoped to owner
    const { data: doc, error: fetchError } = await documents()
      .select("*")
      .eq("id", documentId)
      .eq("user_id", userId)
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

    // Delete from database (dual-eq guards against TOCTOU)
    const { error: dbError } = await documents()
      .delete()
      .eq("id", documentId)
      .eq("user_id", userId);

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
    documentType: DocumentType,
  ): Promise<{ uploadUrl: string; documentId: string; s3Key: string }> {
    const timestamp = Date.now();
    const fileExtension = fileName.split(".").pop();
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
  /**
   * Confirm a presigned upload and update document record.
   * userId scoping prevents IDOR — a caller cannot confirm another user's
   * pending upload (TASK-CRD-4 review fix).
   */
  async confirmUpload(
    documentId: string,
    userId: string,
    size: number,
  ): Promise<Document> {
    // Fetch scoped to owner — returns null for wrong user (IDOR defence).
    const { data: doc, error: fetchError } = await documents()
      .select("*")
      .eq("id", documentId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !doc) {
      throw new Error("Document not found");
    }

    const docData = doc as DocumentRow;

    // Generate presigned URL
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: docData.s3_key,
    });

    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 });

    // Update document with size and URL — dual-eq guards against TOCTOU.
    const updateData: DocumentUpdate = {
      size,
      s3_url: url,
    };

    const { data, error } = await documents()
      .update(updateData)
      .eq("id", documentId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to confirm upload: ${error.message}`);
    }

    return this.mapToDocument(data as DocumentRow);
  }

  /**
   * Validate file type
   */
  validateFileType(mimeType: string, documentType: DocumentType): boolean {
    const allowedTypes: Record<DocumentType, string[]> = {
      credit_report: ["application/pdf", "image/png", "image/jpeg"],
      id: ["application/pdf", "image/png", "image/jpeg"],
      proof_of_address: ["application/pdf", "image/png", "image/jpeg"],
      supporting_doc: [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
   * Update document metadata (TASK-CRD-4).
   * userId scoping prevents IDOR — returns null for wrong owner.
   */
  async updateMetadata(
    documentId: string,
    userId: string,
    metadata: Record<string, unknown>,
  ): Promise<Document | null> {
    // Verify ownership first so we can return null rather than a 403 leak.
    const existing = await this.getDocument(documentId, userId);
    if (!existing) return null;

    const merged = { ...(existing.metadata ?? {}), ...metadata };
    const updateData: DocumentUpdate = { metadata: merged as import("../supabase/types").Json };

    const { data, error } = await documents()
      .update(updateData)
      .eq("id", documentId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update metadata: ${error.message}`);
    }

    return this.mapToDocument(data as DocumentRow);
  }

  /**
   * Add tags to a document (TASK-CRD-4).
   * userId scoping prevents IDOR — returns null for wrong owner.
   */
  async addTags(
    documentId: string,
    userId: string,
    newTags: string[],
  ): Promise<Document | null> {
    const existing = await this.getDocument(documentId, userId);
    if (!existing) return null;

    const merged = Array.from(new Set([...(existing.tags ?? []), ...newTags]));
    const updateData: DocumentUpdate = { tags: merged };

    const { data, error } = await documents()
      .update(updateData)
      .eq("id", documentId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add tags: ${error.message}`);
    }

    return this.mapToDocument(data as DocumentRow);
  }

  /**
   * Create a share link for a document (TASK-CRD-4).
   * Verifies ownership before inserting so an adversary cannot create links
   * for documents they do not own.
   */
  async createShareLink(
    documentId: string,
    userId: string,
    recipients: string[],
    permissions: "view" | "download",
    expiresInHours: number = 24,
  ): Promise<ShareLink> {
    // Ownership check — throws if the document belongs to another user.
    const doc = await this.getDocument(documentId, userId);
    if (!doc) throw new Error("Document not found");

    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // We need a stable ID for the URL before insert; generate client-side uuid equivalent.
    const tempId = crypto.randomUUID();
    const shareUrl = `${appUrl}/shared/${tempId}`;

    const insertData: ShareLinkInsert = {
      id: tempId,
      document_id: documentId,
      user_id: userId,
      recipients,
      permissions,
      url: shareUrl,
      expires_at: expiresAt.toISOString(),
    };

    const { data, error } = await shareLinks()
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create share link: ${error.message}`);
    }

    return this.mapToShareLink(data as ShareLinkRow);
  }

  /**
   * List share links for a document (TASK-CRD-4).
   * User-scoped: only returns links owned by userId.
   */
  async listShareLinks(documentId: string, userId: string): Promise<ShareLink[]> {
    const { data, error } = await shareLinks()
      .select("*")
      .eq("document_id", documentId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list share links: ${error.message}`);
    }

    return (data ?? []).map((row) => this.mapToShareLink(row as ShareLinkRow));
  }

  /**
   * Revoke (delete) a share link (TASK-CRD-4).
   * userId scoping prevents IDOR — returns false for wrong owner.
   */
  async revokeShareLink(shareId: string, userId: string): Promise<boolean> {
    const { data, error } = await shareLinks()
      .delete()
      .eq("id", shareId)
      .eq("user_id", userId)
      .select("id");

    if (error) return false;
    return Array.isArray(data) && data.length > 0;
  }

  /**
   * Map database row to Document interface
   */
  private mapToDocument(
    row: Database["public"]["Tables"]["documents"]["Row"],
  ): Document {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      name: row.name,
      originalName: row.original_name,
      size: row.size,
      mimeType: row.mime_type,
      url: row.s3_url || "",
      s3Key: row.s3_key,
      uploadedAt: new Date(row.uploaded_at),
      metadata: row.metadata as Record<string, unknown> | null,
      tags: row.tags,
    };
  }

  /**
   * Map database row to ShareLink interface
   */
  private mapToShareLink(row: ShareLinkRow): ShareLink {
    return {
      id: row.id,
      documentId: row.document_id,
      userId: row.user_id,
      recipients: row.recipients,
      permissions: row.permissions,
      url: row.url,
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at),
    };
  }
}

// Export singleton instance
export const documentServiceDB = new DocumentServiceDB();
export default documentServiceDB;
