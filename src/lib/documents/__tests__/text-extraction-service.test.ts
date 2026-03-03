/**
 * @jest-environment node
 */

import {
  textExtractionService,
  detectFormat,
} from "../text-extraction-service";
import type {
  ExtractionResult,
  OcrProvider,
  ExtractableFormat,
} from "../text-extraction-service";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Create a minimal PDF buffer with embedded text. */
function makePdfWithText(text: string): Buffer {
  // Build a minimal PDF structure with a text stream
  const pdfContent = [
    "%PDF-1.4",
    "1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj",
    "2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj",
    "3 0 obj <</Type /Page /Parent 2 0 R /Contents 4 0 R>> endobj",
    "4 0 obj",
    "<</Length 50>>",
    "stream",
    `BT (${text}) Tj ET`,
    "endstream",
    "endobj",
    "%%EOF",
  ].join("\n");

  return Buffer.from(pdfContent, "latin1");
}

/** Create a minimal PDF buffer without text layer (scanned). */
function makeScannedPdf(): Buffer {
  const pdfContent = [
    "%PDF-1.4",
    "1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj",
    "2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj",
    "3 0 obj <</Type /Page /Parent 2 0 R /Contents 4 0 R>> endobj",
    "4 0 obj",
    "<</Length 20>>",
    "stream",
    "q 0.5 0 0 0.5 0 0 cm",
    "endstream",
    "endobj",
    "%%EOF",
  ].join("\n");

  return Buffer.from(pdfContent, "latin1");
}

/** Create a multi-page PDF buffer. */
function makeMultiPagePdf(pages: string[]): Buffer {
  const objects: string[] = ["%PDF-1.4"];
  const kidRefs = pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
  objects.push(`1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj`);
  objects.push(
    `2 0 obj <</Type /Pages /Kids [${kidRefs}] /Count ${pages.length}>> endobj`,
  );

  for (let i = 0; i < pages.length; i++) {
    const pageObjNum = 3 + i * 2;
    const contentObjNum = pageObjNum + 1;
    objects.push(
      `${pageObjNum} 0 obj <</Type /Page /Parent 2 0 R /Contents ${contentObjNum} 0 R>> endobj`,
    );
    const stream = `BT (${pages[i]}) Tj ET`;
    objects.push(
      `${contentObjNum} 0 obj <</Length ${stream.length}>>\nstream\n${stream}\nendstream\nendobj`,
    );
  }

  objects.push("%%EOF");
  return Buffer.from(objects.join("\n"), "latin1");
}

/** Create a PDF buffer with a creation date in metadata. */
function makePdfWithDate(dateStr: string): Buffer {
  const pdfContent = [
    "%PDF-1.4",
    `1 0 obj <</Type /Catalog /Pages 2 0 R /Info 5 0 R>> endobj`,
    "2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj",
    "3 0 obj <</Type /Page /Parent 2 0 R /Contents 4 0 R>> endobj",
    "4 0 obj <</Length 20>>\nstream\nBT (test) Tj ET\nendstream\nendobj",
    `5 0 obj <</CreationDate (D:${dateStr})>> endobj`,
    "%%EOF",
  ].join("\n");

  return Buffer.from(pdfContent, "latin1");
}

/** PNG magic bytes + minimal data. */
function makePngBuffer(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
}

/** JPEG magic bytes + minimal data. */
function makeJpegBuffer(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
}

/** Create a mock OCR provider. */
function createMockOcrProvider(
  result: ExtractionResult,
  available = true,
): OcrProvider {
  return {
    extractFromImage: jest.fn().mockResolvedValue(result),
    isAvailable: jest.fn().mockReturnValue(available),
  };
}

// ── Reset ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Clear any registered OCR provider
  textExtractionService.setOcrProvider(null as unknown as OcrProvider);
});

// ═══════════════════════════════════════════════════════════════════════════════
// detectFormat (exported helper)
// ═══════════════════════════════════════════════════════════════════════════════

describe("detectFormat", () => {
  it("detects PDF from magic bytes", () => {
    const buffer = makePdfWithText("hello");
    expect(detectFormat(buffer)).toBe("pdf");
  });

  it("detects PNG from magic bytes", () => {
    const buffer = makePngBuffer();
    expect(detectFormat(buffer)).toBe("png");
  });

  it("detects JPEG from magic bytes", () => {
    const buffer = makeJpegBuffer();
    expect(detectFormat(buffer)).toBe("jpeg");
  });

  it("falls back to MIME type when magic bytes do not match", () => {
    const buffer = Buffer.from("not a real file");
    expect(detectFormat(buffer, "application/pdf")).toBe("pdf");
    expect(detectFormat(buffer, "image/png")).toBe("png");
    expect(detectFormat(buffer, "image/jpeg")).toBe("jpeg");
    expect(detectFormat(buffer, "image/tiff")).toBe("tiff");
    expect(detectFormat(buffer, "image/webp")).toBe("webp");
  });

  it("falls back to file extension when MIME type is unknown", () => {
    const buffer = Buffer.from("data");
    expect(detectFormat(buffer, undefined, "report.pdf")).toBe("pdf");
    expect(detectFormat(buffer, undefined, "photo.jpg")).toBe("jpg");
    expect(detectFormat(buffer, undefined, "scan.tiff")).toBe("tiff");
    expect(detectFormat(buffer, undefined, "scan.tif")).toBe("tiff");
  });

  it("returns unknown for unrecognized formats", () => {
    const buffer = Buffer.from("random data");
    expect(detectFormat(buffer)).toBe("unknown");
    expect(detectFormat(buffer, "application/zip")).toBe("unknown");
    expect(detectFormat(buffer, undefined, "file.xyz")).toBe("unknown");
  });

  it("handles empty buffer", () => {
    const buffer = Buffer.alloc(0);
    expect(detectFormat(buffer)).toBe("unknown");
  });

  it("handles very short buffer that cannot match any magic bytes", () => {
    const buffer = Buffer.from([0x89, 0x50]); // partial PNG
    expect(detectFormat(buffer)).toBe("unknown");
  });

  it("prefers magic bytes over MIME type", () => {
    // PDF content with PNG MIME type
    const buffer = makePdfWithText("test");
    expect(detectFormat(buffer, "image/png")).toBe("pdf");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// extractText
// ═══════════════════════════════════════════════════════════════════════════════

describe("TextExtractionService.extractText", () => {
  it("extracts text from a PDF with embedded text layer", async () => {
    const buffer = makePdfWithText("Hello World");
    const result = await textExtractionService.extractText(
      buffer,
      "application/pdf",
    );

    expect(result.text).toContain("Hello World");
    expect(result.method).toBe("text-layer");
    expect(result.pageCount).toBeGreaterThanOrEqual(1);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns empty text for scanned PDFs without text layer", async () => {
    const buffer = makeScannedPdf();
    const result = await textExtractionService.extractText(
      buffer,
      "application/pdf",
    );

    expect(result.text).toBe("");
    expect(result.confidence).toBe(0);
    expect(result.method).toBe("text-layer");
  });

  it("handles multi-page PDFs", async () => {
    const buffer = makeMultiPagePdf(["Page one content", "Page two content"]);
    const result = await textExtractionService.extractText(
      buffer,
      "application/pdf",
    );

    expect(result.text).toContain("Page one content");
    expect(result.pageCount).toBeGreaterThanOrEqual(2);
  });

  it("returns unknown format result for unsupported types", async () => {
    const buffer = Buffer.from("not a document");
    const result = await textExtractionService.extractText(
      buffer,
      "application/zip",
    );

    expect(result.text).toBe("");
    expect(result.pageCount).toBe(0);
    expect(result.confidence).toBe(0);
    expect(result.method).toBe("heuristic");
  });

  it("uses file name fallback for format detection", async () => {
    // Generic buffer but with a PDF MIME type provided via filename
    const buffer = makePdfWithText("from filename");
    const result = await textExtractionService.extractText(
      buffer,
      "application/pdf",
      "document.pdf",
    );

    expect(result.text).toContain("from filename");
  });

  it("returns empty text for images without OCR provider", async () => {
    const buffer = makePngBuffer();
    const result = await textExtractionService.extractText(buffer, "image/png");

    expect(result.text).toBe("");
    expect(result.pageCount).toBe(1);
    expect(result.method).toBe("ocr");
    expect(result.confidence).toBe(0);
  });

  it("delegates to OCR provider for images when available", async () => {
    const ocrResult: ExtractionResult = {
      text: "OCR extracted text",
      pageCount: 1,
      language: "en",
      confidence: 0.85,
      pages: { 1: "OCR extracted text" },
      method: "ocr",
      durationMs: 100,
    };

    const mockProvider = createMockOcrProvider(ocrResult);
    textExtractionService.setOcrProvider(mockProvider);

    const buffer = makePngBuffer();
    const result = await textExtractionService.extractText(buffer, "image/png");

    expect(result.text).toBe("OCR extracted text");
    expect(result.confidence).toBe(0.85);
    expect(mockProvider.extractFromImage).toHaveBeenCalledWith(
      buffer,
      "image/png",
    );
  });

  it("returns empty text for images when OCR provider is not available", async () => {
    const unavailableProvider = createMockOcrProvider(
      {} as ExtractionResult,
      false,
    );
    textExtractionService.setOcrProvider(unavailableProvider);

    const buffer = makeJpegBuffer();
    const result = await textExtractionService.extractText(
      buffer,
      "image/jpeg",
    );

    expect(result.text).toBe("");
    expect(result.confidence).toBe(0);
    expect(unavailableProvider.extractFromImage).not.toHaveBeenCalled();
  });

  it("detects English language in extracted text", async () => {
    const buffer = makePdfWithText(
      "The quick brown fox jumps over the lazy dog and is in the park for a walk with the children",
    );
    const result = await textExtractionService.extractText(
      buffer,
      "application/pdf",
    );

    expect(result.language).toBe("en");
  });

  it("returns null language for short text", async () => {
    const buffer = makePdfWithText("Hi");
    const result = await textExtractionService.extractText(
      buffer,
      "application/pdf",
    );

    expect(result.language).toBeNull();
  });

  it("calculates confidence based on text density", async () => {
    // A PDF with substantial text should have non-zero confidence
    const words = Array(50).fill("word").join(" ");
    const buffer = makePdfWithText(words);
    const result = await textExtractionService.extractText(
      buffer,
      "application/pdf",
    );

    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// extractMetadata
// ═══════════════════════════════════════════════════════════════════════════════

describe("TextExtractionService.extractMetadata", () => {
  it("extracts metadata from a PDF", () => {
    const buffer = makePdfWithText("test content");
    const metadata = textExtractionService.extractMetadata(
      buffer,
      "report.pdf",
      "application/pdf",
    );

    expect(metadata.fileName).toBe("report.pdf");
    expect(metadata.mimeType).toBe("application/pdf");
    expect(metadata.fileSize).toBe(buffer.length);
    expect(metadata.format).toBe("pdf");
    expect(metadata.pageCount).toBeGreaterThanOrEqual(1);
    expect(metadata.hasTextLayer).toBe(true);
    expect(metadata.hash).toHaveLength(64); // SHA-256 hex
  });

  it("detects scanned PDF (no text layer)", () => {
    const buffer = makeScannedPdf();
    const metadata = textExtractionService.extractMetadata(
      buffer,
      "scan.pdf",
      "application/pdf",
    );

    expect(metadata.hasTextLayer).toBe(false);
    expect(metadata.format).toBe("pdf");
  });

  it("extracts metadata from a PNG image", () => {
    const buffer = makePngBuffer();
    const metadata = textExtractionService.extractMetadata(
      buffer,
      "photo.png",
      "image/png",
    );

    expect(metadata.format).toBe("png");
    expect(metadata.pageCount).toBe(1);
    expect(metadata.hasTextLayer).toBe(false);
    expect(metadata.createdAt).toBeNull();
  });

  it("extracts metadata from a JPEG image", () => {
    const buffer = makeJpegBuffer();
    const metadata = textExtractionService.extractMetadata(
      buffer,
      "photo.jpg",
      "image/jpeg",
    );

    expect(metadata.format).toBe("jpeg");
    expect(metadata.pageCount).toBe(1);
  });

  it("returns unknown format for unrecognized files", () => {
    const buffer = Buffer.from("random content");
    const metadata = textExtractionService.extractMetadata(
      buffer,
      "file.xyz",
      "application/octet-stream",
    );

    expect(metadata.format).toBe("unknown");
  });

  it("generates consistent hash for the same content", () => {
    const buffer = Buffer.from("identical content");
    const meta1 = textExtractionService.extractMetadata(
      buffer,
      "file1.txt",
      "text/plain",
    );
    const meta2 = textExtractionService.extractMetadata(
      buffer,
      "file2.txt",
      "text/plain",
    );

    expect(meta1.hash).toBe(meta2.hash);
  });

  it("generates different hash for different content", () => {
    const buffer1 = Buffer.from("content A");
    const buffer2 = Buffer.from("content B");
    const meta1 = textExtractionService.extractMetadata(
      buffer1,
      "a.txt",
      "text/plain",
    );
    const meta2 = textExtractionService.extractMetadata(
      buffer2,
      "b.txt",
      "text/plain",
    );

    expect(meta1.hash).not.toBe(meta2.hash);
  });

  it("extracts creation date from PDF metadata", () => {
    const buffer = makePdfWithDate("20250115120000");
    const metadata = textExtractionService.extractMetadata(
      buffer,
      "dated.pdf",
      "application/pdf",
    );

    expect(metadata.createdAt).toBeInstanceOf(Date);
    expect(metadata.createdAt!.getFullYear()).toBe(2025);
    expect(metadata.createdAt!.getMonth()).toBe(0); // January (0-indexed)
    expect(metadata.createdAt!.getDate()).toBe(15);
  });

  it("returns null creation date when PDF has no date metadata", () => {
    const buffer = makePdfWithText("no date here");
    const metadata = textExtractionService.extractMetadata(
      buffer,
      "nodate.pdf",
      "application/pdf",
    );

    expect(metadata.createdAt).toBeNull();
  });

  it("counts pages in multi-page PDFs", () => {
    const buffer = makeMultiPagePdf(["p1", "p2", "p3"]);
    const metadata = textExtractionService.extractMetadata(
      buffer,
      "multi.pdf",
      "application/pdf",
    );

    expect(metadata.pageCount).toBeGreaterThanOrEqual(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OCR Provider Management
// ═══════════════════════════════════════════════════════════════════════════════

describe("TextExtractionService OCR provider", () => {
  it("reports OCR unavailable when no provider is set", () => {
    expect(textExtractionService.isOcrAvailable()).toBe(false);
    expect(textExtractionService.getOcrProvider()).toBeNull();
  });

  it("registers and retrieves an OCR provider", () => {
    const provider = createMockOcrProvider({} as ExtractionResult);
    textExtractionService.setOcrProvider(provider);

    expect(textExtractionService.getOcrProvider()).toBe(provider);
    expect(textExtractionService.isOcrAvailable()).toBe(true);
  });

  it("reports OCR unavailable when provider is not available", () => {
    const provider = createMockOcrProvider({} as ExtractionResult, false);
    textExtractionService.setOcrProvider(provider);

    expect(textExtractionService.isOcrAvailable()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Format Support
// ═══════════════════════════════════════════════════════════════════════════════

describe("TextExtractionService format support", () => {
  it("reports PDF as supported", () => {
    expect(textExtractionService.isFormatSupported("application/pdf")).toBe(
      true,
    );
  });

  it("reports PNG as supported", () => {
    expect(textExtractionService.isFormatSupported("image/png")).toBe(true);
  });

  it("reports JPEG as supported", () => {
    expect(textExtractionService.isFormatSupported("image/jpeg")).toBe(true);
  });

  it("reports TIFF as supported", () => {
    expect(textExtractionService.isFormatSupported("image/tiff")).toBe(true);
  });

  it("reports WebP as supported", () => {
    expect(textExtractionService.isFormatSupported("image/webp")).toBe(true);
  });

  it("reports ZIP as not supported", () => {
    expect(textExtractionService.isFormatSupported("application/zip")).toBe(
      false,
    );
  });

  it("reports text/plain as not supported", () => {
    expect(textExtractionService.isFormatSupported("text/plain")).toBe(false);
  });

  it("returns all supported formats", () => {
    const formats = textExtractionService.getSupportedFormats();
    expect(formats).toContain("application/pdf");
    expect(formats).toContain("image/png");
    expect(formats).toContain("image/jpeg");
    expect(formats).toContain("image/tiff");
    expect(formats).toContain("image/webp");
    expect(formats.length).toBeGreaterThanOrEqual(6);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Public detectFormat method
// ═══════════════════════════════════════════════════════════════════════════════

describe("TextExtractionService.detectFormat (public method)", () => {
  it("delegates to the detectFormat helper", () => {
    const pdfBuffer = makePdfWithText("test");
    expect(textExtractionService.detectFormat(pdfBuffer)).toBe("pdf");

    const pngBuffer = makePngBuffer();
    expect(textExtractionService.detectFormat(pngBuffer)).toBe("png");
  });

  it("accepts MIME type and fileName arguments", () => {
    const buffer = Buffer.from("data");
    expect(
      textExtractionService.detectFormat(buffer, "image/tiff"),
    ).toBe("tiff");
    expect(
      textExtractionService.detectFormat(buffer, undefined, "file.webp"),
    ).toBe("webp");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PDF with TJ array operator
// ═══════════════════════════════════════════════════════════════════════════════

describe("PDF text extraction with TJ arrays", () => {
  it("extracts text from TJ array operators", async () => {
    const pdfContent = [
      "%PDF-1.4",
      "1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj",
      "2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj",
      "3 0 obj <</Type /Page /Parent 2 0 R /Contents 4 0 R>> endobj",
      "4 0 obj <</Length 80>>",
      "stream",
      "BT [(Hello) -10 (World)] TJ ET",
      "endstream",
      "endobj",
      "%%EOF",
    ].join("\n");

    const buffer = Buffer.from(pdfContent, "latin1");
    const result = await textExtractionService.extractText(
      buffer,
      "application/pdf",
    );

    expect(result.text).toContain("Hello");
    expect(result.text).toContain("World");
  });
});
