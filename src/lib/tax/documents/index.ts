/**
 * Tax Documents Module
 *
 * Multi-provider OCR system for tax document processing.
 * Supports OpenAI Vision, Google Vision, and LandingAI with
 * intelligent fallback and consensus-based field resolution.
 */

export * from "./types";
export * from "./providers";
export {
  TaxDocumentProcessor,
  taxDocumentProcessor,
} from "./TaxDocumentProcessor";
