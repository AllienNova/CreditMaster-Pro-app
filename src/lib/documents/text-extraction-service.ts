/**
 * Text Extraction Service
 *
 * Handles text extraction from documents:
 * - PDF text extraction (server-side, no native OCR dependency)
 * - Image text extraction interface (delegates to external OCR)
 * - Metadata extraction (page count, file size, format detection)
 *
 * In a serverless environment (Vercel), heavy OCR binaries are not available.
 * This service provides a pluggable architecture:
 *   - PDF: parses embedded text layers (no OCR needed for digital PDFs)
 *   - Images: delegates to an OCR provider (configurable)
 */

// ── Types ────────────────────────────────────────────────────────────────────

/** Supported document formats for text extraction. */
export type ExtractableFormat = "pdf" | "png" | "jpeg" | "jpg" | "tiff" | "webp";

/** Result of a text extraction operation. */
export interface ExtractionResult {
  /** The extracted raw text content. */
  text: string;
  /** Number of pages (1 for images). */
  pageCount: number;
  /** Detected language code (ISO 639-1), or null if unknown. */
  language: string | null;
  /** Confidence score for the extraction (0-1). */
  confidence: number;
  /** Per-page text content, keyed by 1-based page number. */
  pages: Record<number, string>;
  /** Extraction method used. */
  method: "text-layer" | "ocr" | "heuristic";
  /** Duration of extraction in milliseconds. */
  durationMs: number;
}

/** Metadata extracted from a document file. */
export interface DocumentMetadata {
  /** Original file name. */
  fileName: string;
  /** MIME type of the file. */
  mimeType: string;
  /** File size in bytes. */
  fileSize: number;
  /** Detected format. */
  format: ExtractableFormat | "unknown";
  /** Number of pages (1 for images, estimated for PDFs). */
  pageCount: number;
  /** Whether the document likely contains text (vs scanned image). */
  hasTextLayer: boolean;
  /** Creation date if available from file metadata. */
  createdAt: Date | null;
  /** File hash (SHA-256) for deduplication. */
  hash: string;
}

/** Interface for pluggable OCR providers. */
export interface OcrProvider {
  /** Extract text from an image buffer. */
  extractFromImage(buffer: Buffer, mimeType: string): Promise<ExtractionResult>;
  /** Check if the provider is available/configured. */
  isAvailable(): boolean;
}

// ── Format Detection ─────────────────────────────────────────────────────────

/** Map of MIME types to extractable formats. */
const MIME_TO_FORMAT: Record<string, ExtractableFormat> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "image/tiff": "tiff",
  "image/webp": "webp",
};

/** Map of file extensions to extractable formats. */
const EXT_TO_FORMAT: Record<string, ExtractableFormat> = {
  pdf: "pdf",
  png: "png",
  jpeg: "jpeg",
  jpg: "jpg",
  tiff: "tiff",
  tif: "tiff",
  webp: "webp",
};

// ── Magic Bytes ──────────────────────────────────────────────────────────────

/** PDF files start with %PDF- */
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);

/** PNG files start with the 8-byte signature. */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** JPEG files start with FF D8 FF. */
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Detect the format of a file from its content (magic bytes) and/or MIME type.
 */
export function detectFormat(
  buffer: Buffer,
  mimeType?: string,
  fileName?: string,
): ExtractableFormat | "unknown" {
  // 1. Try magic bytes
  if (buffer.length >= 5 && buffer.subarray(0, 5).equals(PDF_MAGIC)) {
    return "pdf";
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_MAGIC)) {
    return "png";
  }
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(JPEG_MAGIC)) {
    return "jpeg";
  }

  // 2. Try MIME type
  if (mimeType && MIME_TO_FORMAT[mimeType]) {
    return MIME_TO_FORMAT[mimeType];
  }

  // 3. Try file extension
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext && EXT_TO_FORMAT[ext]) {
      return EXT_TO_FORMAT[ext];
    }
  }

  return "unknown";
}

/**
 * Compute a SHA-256 hash of a buffer using Node.js crypto.
 */
function computeHash(buffer: Buffer): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Estimate the number of pages in a PDF from its buffer.
 * Counts occurrences of "/Type /Page" (excluding "/Type /Pages").
 */
function estimatePdfPageCount(buffer: Buffer): number {
  const content = buffer.toString("latin1");
  // Match /Type /Page but not /Type /Pages
  const pagePattern = /\/Type\s*\/Page(?!\s*s)/g;
  const matches = content.match(pagePattern);
  return matches ? matches.length : 1;
}

/**
 * Check if a PDF has an embedded text layer.
 * Looks for text stream markers in the PDF content.
 */
function pdfHasTextLayer(buffer: Buffer): boolean {
  const content = buffer.toString("latin1");
  // Look for text operators in content streams: BT (begin text) and ET (end text)
  return content.includes("BT") && content.includes("ET");
}

/**
 * Extract raw text from a PDF buffer by parsing text streams.
 * This is a lightweight extraction that works for digital (non-scanned) PDFs.
 * For scanned PDFs, OCR is needed.
 */
function extractPdfText(buffer: Buffer): { text: string; pages: Record<number, string> } {
  const content = buffer.toString("latin1");
  const pages: Record<number, string> = {};
  const textBlocks: string[] = [];

  // Find all text blocks between BT and ET markers
  const btEtPattern = /BT\s*([\s\S]*?)\s*ET/g;
  let match: RegExpExecArray | null;
  let pageNum = 1;

  // eslint-disable-next-line no-cond-assign
  while ((match = btEtPattern.exec(content)) !== null) {
    const block = match[1];

    // Extract text from Tj, TJ, and ' operators
    const textParts: string[] = [];

    // Tj operator: (text) Tj
    const tjPattern = /\(([^)]*)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((tjMatch = tjPattern.exec(block)) !== null) {
      textParts.push(tjMatch[1]);
    }

    // TJ operator: [(text) num (text) ...] TJ
    const tjArrayPattern = /\[([^\]]*)\]\s*TJ/g;
    let tjArrayMatch: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((tjArrayMatch = tjArrayPattern.exec(block)) !== null) {
      const arrayContent = tjArrayMatch[1];
      const innerTextPattern = /\(([^)]*)\)/g;
      let innerMatch: RegExpExecArray | null;
      // eslint-disable-next-line no-cond-assign
      while ((innerMatch = innerTextPattern.exec(arrayContent)) !== null) {
        textParts.push(innerMatch[1]);
      }
    }

    if (textParts.length > 0) {
      const blockText = textParts.join(" ");
      textBlocks.push(blockText);

      if (!pages[pageNum]) {
        pages[pageNum] = "";
      }
      pages[pageNum] += (pages[pageNum] ? " " : "") + blockText;
    }

    // Simple page boundary detection: look for page markers after this position
    const remaining = content.substring(match.index + match[0].length);
    if (remaining.match(/^[\s\S]{0,500}\/Type\s*\/Page(?!\s*s)/)) {
      pageNum++;
    }
  }

  return {
    text: textBlocks.join("\n"),
    pages,
  };
}

/**
 * Detect the likely language of text content.
 * Uses simple heuristics based on character frequency and common words.
 */
function detectLanguage(text: string): string | null {
  if (!text || text.trim().length < 10) {
    return null;
  }

  const lowerText = text.toLowerCase();

  // English common words
  const englishWords = ["the", "and", "is", "in", "to", "of", "a", "for", "that", "with"];
  const englishCount = englishWords.filter((w) =>
    new RegExp(`\\b${w}\\b`).test(lowerText),
  ).length;

  // Spanish common words
  const spanishWords = ["el", "la", "de", "en", "es", "un", "por", "con", "que", "los"];
  const spanishCount = spanishWords.filter((w) =>
    new RegExp(`\\b${w}\\b`).test(lowerText),
  ).length;

  // French common words
  const frenchWords = ["le", "la", "de", "et", "en", "un", "est", "les", "des", "une"];
  const frenchCount = frenchWords.filter((w) =>
    new RegExp(`\\b${w}\\b`).test(lowerText),
  ).length;

  const scores: Array<[string, number]> = [
    ["en", englishCount],
    ["es", spanishCount],
    ["fr", frenchCount],
  ];

  scores.sort((a, b) => b[1] - a[1]);

  // Need at least 2 common word matches to be confident
  if (scores[0][1] >= 2) {
    return scores[0][0];
  }

  return null;
}

// ── Service Class ────────────────────────────────────────────────────────────

/**
 * Text Extraction Service
 *
 * Provides text extraction from PDF and image documents.
 * PDF extraction uses built-in text layer parsing.
 * Image extraction delegates to a configurable OCR provider.
 */
class TextExtractionService {
  private ocrProvider: OcrProvider | null = null;

  /**
   * Register an OCR provider for image text extraction.
   */
  setOcrProvider(provider: OcrProvider): void {
    this.ocrProvider = provider;
  }

  /**
   * Get the current OCR provider, if any.
   */
  getOcrProvider(): OcrProvider | null {
    return this.ocrProvider;
  }

  /**
   * Check if OCR is available for image extraction.
   */
  isOcrAvailable(): boolean {
    return this.ocrProvider !== null && this.ocrProvider.isAvailable();
  }

  /**
   * Extract text from a document buffer.
   *
   * @param buffer - The file content as a Buffer
   * @param mimeType - The MIME type of the file
   * @param fileName - Optional file name for format detection fallback
   * @returns ExtractionResult with the extracted text and metadata
   */
  async extractText(
    buffer: Buffer,
    mimeType: string,
    fileName?: string,
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    const format = detectFormat(buffer, mimeType, fileName);

    if (format === "unknown") {
      return {
        text: "",
        pageCount: 0,
        language: null,
        confidence: 0,
        pages: {},
        method: "heuristic",
        durationMs: Date.now() - startTime,
      };
    }

    if (format === "pdf") {
      return this.extractFromPdf(buffer, startTime);
    }

    // Image formats
    return this.extractFromImage(buffer, mimeType, startTime);
  }

  /**
   * Extract text from a PDF buffer.
   */
  private extractFromPdf(buffer: Buffer, startTime: number): ExtractionResult {
    const hasText = pdfHasTextLayer(buffer);
    const pageCount = estimatePdfPageCount(buffer);

    if (!hasText) {
      // Scanned PDF without text layer - would need OCR
      return {
        text: "",
        pageCount,
        language: null,
        confidence: 0,
        pages: {},
        method: "text-layer",
        durationMs: Date.now() - startTime,
      };
    }

    const { text, pages } = extractPdfText(buffer);
    const language = detectLanguage(text);

    // Confidence based on text density
    const wordsPerPage = text.split(/\s+/).length / Math.max(pageCount, 1);
    let confidence = Math.min(wordsPerPage / 100, 1);
    confidence = Math.round(confidence * 100) / 100;

    return {
      text,
      pageCount,
      language,
      confidence,
      pages,
      method: "text-layer",
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Extract text from an image buffer using OCR provider.
   */
  private async extractFromImage(
    buffer: Buffer,
    mimeType: string,
    startTime: number,
  ): Promise<ExtractionResult> {
    if (!this.ocrProvider || !this.ocrProvider.isAvailable()) {
      return {
        text: "",
        pageCount: 1,
        language: null,
        confidence: 0,
        pages: {},
        method: "ocr",
        durationMs: Date.now() - startTime,
      };
    }

    const result = await this.ocrProvider.extractFromImage(buffer, mimeType);
    return {
      ...result,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Extract metadata from a document buffer.
   *
   * @param buffer - The file content
   * @param fileName - The original file name
   * @param mimeType - The MIME type
   * @returns DocumentMetadata with file information
   */
  extractMetadata(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
  ): DocumentMetadata {
    const format = detectFormat(buffer, mimeType, fileName);
    const hash = computeHash(buffer);

    let pageCount = 1;
    let hasTextLayer = false;

    if (format === "pdf") {
      pageCount = estimatePdfPageCount(buffer);
      hasTextLayer = pdfHasTextLayer(buffer);
    }

    // Try to extract creation date from PDF metadata
    let createdAt: Date | null = null;
    if (format === "pdf") {
      createdAt = this.extractPdfCreationDate(buffer);
    }

    return {
      fileName,
      mimeType,
      fileSize: buffer.length,
      format,
      pageCount,
      hasTextLayer,
      createdAt,
      hash,
    };
  }

  /**
   * Attempt to extract the creation date from PDF metadata.
   */
  private extractPdfCreationDate(buffer: Buffer): Date | null {
    try {
      const content = buffer.toString("latin1");
      // Look for /CreationDate in the PDF
      const datePattern = /\/CreationDate\s*\(D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?\)/;
      const match = content.match(datePattern);

      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // 0-indexed
        const day = parseInt(match[3], 10);
        const hour = match[4] ? parseInt(match[4], 10) : 0;
        const minute = match[5] ? parseInt(match[5], 10) : 0;
        const second = match[6] ? parseInt(match[6], 10) : 0;

        return new Date(year, month, day, hour, minute, second);
      }
    } catch {
      // Failed to parse PDF creation date - return null
    }

    return null;
  }

  /**
   * Check if a file format is supported for text extraction.
   */
  isFormatSupported(mimeType: string): boolean {
    return mimeType in MIME_TO_FORMAT;
  }

  /**
   * Get all supported MIME types for text extraction.
   */
  getSupportedFormats(): string[] {
    return Object.keys(MIME_TO_FORMAT);
  }

  /**
   * Detect the format of a file from its buffer and optional hints.
   * Exposed publicly for use by other services.
   */
  detectFormat(
    buffer: Buffer,
    mimeType?: string,
    fileName?: string,
  ): ExtractableFormat | "unknown" {
    return detectFormat(buffer, mimeType, fileName);
  }
}

// Export singleton instance
export const textExtractionService = new TextExtractionService();
export default textExtractionService;
