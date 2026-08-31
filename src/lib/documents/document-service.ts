/**
 * Document Management Service
 * 
 * Handles document storage and management:
 * - File uploads (S3)
 * - Document metadata
 * - Access control
 * - Document categorization
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'creditmaster-pro-documents';

export type DocumentType = 
  | 'credit_report'
  | 'dispute_letter'
  | 'evidence'
  | 'identity_document'
  | 'proof_of_address'
  | 'income_verification'
  | 'other';

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
  expiresAt?: Date;
  metadata?: DocumentMetadata;
  tags?: string[];
}

type DocumentMetadata = Record<string, string>;

/**
 * Document Service Class
 */
export interface DocumentShareLink {
  id: string;
  documentId: string;
  sharedBy: string;
  recipients: string[];
  permissions: 'view' | 'download';
  expiresAt: Date;
  createdAt: Date;
  url: string;
}

class DocumentService {
  private documents: Map<string, Document> = new Map();
  private shareLinks: Map<string, DocumentShareLink> = new Map();
  
  /**
   * Upload document to S3
   */
  async uploadDocument(
    userId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
    documentType: DocumentType,
    metadata?: DocumentMetadata
  ): Promise<Document> {
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileExtension = fileName.split('.').pop();
    const s3Key = `users/${userId}/${documentType}/${documentId}.${fileExtension}`;
    
    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: file,
      ContentType: mimeType,
      Metadata: {
        userId,
        documentId,
        documentType,
        originalName: fileName,
        ...metadata,
      },
    });
    
    await s3Client.send(command);
    
    // Generate presigned URL (valid for 7 days)
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });
    
    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 }); // 7 days
    
    // Create document record
    const document: Document = {
      id: documentId,
      userId,
      type: documentType,
      name: `${documentType}_${documentId}`,
      originalName: fileName,
      size: file.length,
      mimeType,
      url,
      s3Key,
      uploadedAt: new Date(),
      metadata,
    };
    
    this.documents.set(documentId, document);
    return document;
  }
  
  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<Document | undefined> {
    const document = this.documents.get(documentId);
    
    if (document) {
      // Refresh URL if needed
      const now = new Date();
      const uploadedTime = document.uploadedAt.getTime();
      const daysSinceUpload = (now.getTime() - uploadedTime) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpload > 6) {
        // Regenerate presigned URL
        const getCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: document.s3Key,
        });
        
        document.url = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 });
      }
    }
    
    return document;
  }

  /**
   * Create share link
   */
  createShareLink(
    documentId: string,
    sharedBy: string,
    recipients: string[],
    permissions: 'view' | 'download' = 'view',
    expiresInHours = 24
  ): DocumentShareLink {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    if (document.userId !== sharedBy) {
      throw new Error('You do not have permission to share this document');
    }

    const shareId = `share_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.creditmaster.pro'}/documents/${documentId}?share=${shareId}`;

    const shareLink: DocumentShareLink = {
      id: shareId,
      documentId,
      sharedBy,
      recipients,
      permissions,
      expiresAt,
      createdAt: new Date(),
      url,
    };

    this.shareLinks.set(shareId, shareLink);
    return shareLink;
  }

  listShareLinks(documentId: string, userId: string): DocumentShareLink[] {
    const document = this.documents.get(documentId);
    if (!document || document.userId !== userId) {
      return [];
    }

    return Array.from(this.shareLinks.values()).filter(
      (link) => link.documentId === documentId && link.sharedBy === userId
    );
  }

  revokeShareLink(shareId: string, userId: string): boolean {
    const link = this.shareLinks.get(shareId);
    if (!link || link.sharedBy !== userId) {
      return false;
    }

    this.shareLinks.delete(shareId);
    return true;
  }

  /**
   * Get user documents
   */
  getUserDocuments(userId: string, type?: DocumentType): Document[] {
    const userDocuments = Array.from(this.documents.values())
      .filter(d => d.userId === userId);
    
    if (type) {
      return userDocuments.filter(d => d.type === type);
    }
    
    return userDocuments.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }
  
  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    const document = this.documents.get(documentId);
    if (!document) return false;
    
    // Delete from S3
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: document.s3Key,
    });
    
    try {
      await s3Client.send(command);
      this.documents.delete(documentId);
      return true;
    } catch (error) {
      console.error('Failed to delete document from S3:', error);
      return false;
    }
  }
  
  /**
   * Update document metadata
   */
  updateDocumentMetadata(
    documentId: string,
    metadata: DocumentMetadata
  ): Document | null {
    const document = this.documents.get(documentId);
    if (!document) return null;
    
    document.metadata = {
      ...document.metadata,
      ...metadata,
    };
    
    return document;
  }
  
  /**
   * Add tags to document
   */
  addTags(documentId: string, tags: string[]): Document | null {
    const document = this.documents.get(documentId);
    if (!document) return null;
    
    if (!document.tags) {
      document.tags = [];
    }
    
    document.tags.push(...tags);
    document.tags = Array.from(new Set(document.tags)); // Remove duplicates
    
    return document;
  }
  
  /**
   * Search documents by tags
   */
  searchByTags(userId: string, tags: string[]): Document[] {
    return this.getUserDocuments(userId).filter(doc => {
      if (!doc.tags) return false;
      return tags.some(tag => doc.tags!.includes(tag));
    });
  }
  
  /**
   * Get document statistics
   */
  getDocumentStats(userId: string): {
    total: number;
    byType: Record<DocumentType, number>;
    totalSize: number;
  } {
    const userDocuments = this.getUserDocuments(userId);
    const byType: Record<string, number> = {};
    let totalSize = 0;
    
    userDocuments.forEach(doc => {
      byType[doc.type] = (byType[doc.type] || 0) + 1;
      totalSize += doc.size;
    });
    
    return {
      total: userDocuments.length,
      byType: byType as Record<DocumentType, number>,
      totalSize,
    };
  }
  
  /**
   * Generate presigned upload URL
   */
  async generateUploadUrl(
    userId: string,
    fileName: string,
    mimeType: string,
    documentType: DocumentType
  ): Promise<{ uploadUrl: string; documentId: string; s3Key: string }> {
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileExtension = fileName.split('.').pop();
    const s3Key = `users/${userId}/${documentType}/${documentId}.${fileExtension}`;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: mimeType,
    });
    
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
    
    return {
      uploadUrl,
      documentId,
      s3Key,
    };
  }
  
  /**
   * Confirm upload and create document record
   */
  confirmUpload(
    documentId: string,
    userId: string,
    s3Key: string,
    fileName: string,
    size: number,
    mimeType: string,
    documentType: DocumentType,
    metadata?: DocumentMetadata
  ): Document {
    const document: Document = {
      id: documentId,
      userId,
      type: documentType,
      name: `${documentType}_${documentId}`,
      originalName: fileName,
      size,
      mimeType,
      url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`,
      s3Key,
      uploadedAt: new Date(),
      metadata,
    };
    
    this.documents.set(documentId, document);
    return document;
  }
  
  /**
   * Get documents by date range
   */
  getDocumentsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Document[] {
    return this.getUserDocuments(userId).filter(doc => {
      const uploadTime = doc.uploadedAt.getTime();
      return uploadTime >= startDate.getTime() && uploadTime <= endDate.getTime();
    });
  }
  
  /**
   * Validate file type
   */
  validateFileType(mimeType: string, documentType: DocumentType): boolean {
    const allowedTypes: Record<DocumentType, string[]> = {
      credit_report: ['application/pdf', 'image/png', 'image/jpeg'],
      dispute_letter: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      evidence: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'],
      identity_document: ['application/pdf', 'image/png', 'image/jpeg'],
      proof_of_address: ['application/pdf', 'image/png', 'image/jpeg'],
      income_verification: ['application/pdf', 'image/png', 'image/jpeg'],
      other: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
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
}

// Export singleton instance
export const documentService = new DocumentService();
export default documentService;

