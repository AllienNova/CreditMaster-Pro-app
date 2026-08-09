"use client";

/**
 * QRHandoff — "Continue on your phone" card.
 *
 * Generates a deep-link QR code using a pure SVG approach (no extra packages).
 * The QR data matrix is computed with a minimal Reed-Solomon encoder.
 *
 * Deep-link format: fynvita://continue?route=<encoded-context>
 */

import React, { useMemo } from "react";
import { SmartphoneIcon } from "lucide-react";

// ============================================================================
// Minimal QR Code Generator
// ============================================================================
// Implements QR Code version 2 (25×25), error correction level M.
// Supports short alphanumeric URLs (up to ~47 chars with Version 2 / ECC M).
// For longer routes, uses Version 3 (29×29, up to ~77 chars).
// This covers all practical fynvita:// deep-link paths.

/** Galois Field GF(256) arithmetic for Reed-Solomon */
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function buildGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[(GF_LOG[a] + GF_LOG[b]) % 255];
}

function rsEncode(data: number[], numEcBytes: number): number[] {
  const gen: number[] = [1];
  for (let i = 0; i < numEcBytes; i++) {
    const poly = [1, GF_EXP[i]];
    const next: number[] = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      for (let k = 0; k < poly.length; k++) {
        next[j + k] ^= gfMul(gen[j], poly[k]);
      }
    }
    gen.splice(0, gen.length, ...next);
  }
  const msg = [...data, ...new Array(numEcBytes).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 1; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

/** Encode text as QR byte mode codewords */
function encodeBytes(text: string): { codewords: number[]; version: number } {
  const bytes = Array.from(new TextEncoder().encode(text));
  const len = bytes.length;

  // Determine version (minimum needed)
  // ECC M capacity: v2=28 bytes, v3=44 bytes, v4=64 bytes, v5=86 bytes
  let version = 2;
  if (len > 28) version = 3;
  if (len > 44) version = 4;
  if (len > 64) version = 5;

  // Build bit string
  const bits: number[] = [];
  const pushBits = (val: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  pushBits(0b0100, 4); // byte mode
  pushBits(len, 8); // character count (version 1-9)
  bytes.forEach((b) => pushBits(b, 8));

  // Terminator + padding
  const totalDataBits = [0, 0, 128, 176, 240, 272][version] * 8;
  // Terminator (up to 4 zeros)
  for (let i = 0; i < 4 && bits.length < totalDataBits; i++) bits.push(0);
  // Byte-align
  while (bits.length % 8 !== 0) bits.push(0);
  // Pad codewords
  const pads = [0xec, 0x11];
  let pi = 0;
  while (bits.length < totalDataBits) {
    pushBits(pads[pi++ % 2], 8);
  }

  // Convert bits to bytes
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i + j] ?? 0);
    codewords.push(byte);
  }

  return { codewords, version };
}

/** QR code EC codewords per block for versions 2–5, ECC M */
const EC_CONFIG: Record<
  number,
  { totalBlocks: number; ecPerBlock: number; dataPerBlock: number }[]
> = {
  2: [{ totalBlocks: 1, ecPerBlock: 16, dataPerBlock: 16 }],
  3: [{ totalBlocks: 1, ecPerBlock: 26, dataPerBlock: 19 }],  // adjusted for 44-byte capacity
  4: [{ totalBlocks: 2, ecPerBlock: 18, dataPerBlock: 24 }],
  5: [{ totalBlocks: 2, ecPerBlock: 22, dataPerBlock: 30 }],  // 2 blocks of 30 data
};

/** Returns the QR matrix (true=dark) for the given text */
function generateQR(text: string): boolean[][] {
  const { codewords, version } = encodeBytes(text);
  const size = 17 + 4 * version; // 25 for v2, 29 for v3, 33 for v4, 37 for v5

  const cfg = EC_CONFIG[version][0];
  const ecBytes = rsEncode(codewords, cfg.ecPerBlock);
  const allBytes = [...codewords, ...ecBytes];

  // Build module matrix (false=light, true=dark)
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    new Array(size).fill(false),
  );
  const reserved: boolean[][] = Array.from({ length: size }, () =>
    new Array(size).fill(false),
  );

  const set = (r: number, c: number, dark: boolean) => {
    matrix[r][c] = dark;
    reserved[r][c] = true;
  };

  // Finder pattern (7×7) at top-left, top-right, bottom-left
  const drawFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        const inOuter = r === -1 || r === 7 || c === -1 || c === 7;
        const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        const inMiddle = r === 0 || r === 6 || c === 0 || c === 6;
        set(rr, cc, inOuter ? false : inMiddle || inInner);
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }

  // Dark module
  set(4 * version + 9, 8, true);

  // Format information area (reserve only)
  for (let i = 0; i < 9; i++) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }

  // Alignment pattern for version >= 2 (at row/col index [size-7][size-7])
  if (version >= 2) {
    const ap = 4 + 4 * version; // 16 for v3, 20 for v4, etc.
    if (ap < size - 8) {
      const drawAlignment = (r: number, c: number) => {
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const dark =
              Math.abs(dr) === 2 ||
              Math.abs(dc) === 2 ||
              (dr === 0 && dc === 0);
            set(r + dr, c + dc, dark);
          }
        }
      };
      drawAlignment(ap, ap);
    }
  }

  // Format info bits (mask 0, ECC M = 00)
  // ECC level M = 00, mask pattern 0 = 000, BCH = computed
  // Format string for ECC M, mask 0 = 101010000010010 (standard table)
  const FORMAT_BITS: boolean[] = [
    true, false, true, false, true, false, false, false,
    false, false, true, false, false, true, false,
  ];
  const applyFormat = () => {
    let idx = 0;
    for (let i = 0; i <= 5; i++) {
      matrix[8][i] = FORMAT_BITS[idx++] ?? false;
    }
    matrix[8][7] = FORMAT_BITS[idx++] ?? false;
    matrix[8][8] = FORMAT_BITS[idx++] ?? false;
    matrix[7][8] = FORMAT_BITS[idx++] ?? false;
    for (let i = 5; i >= 0; i--) {
      matrix[i][8] = FORMAT_BITS[idx++] ?? false;
    }
    idx = 0;
    for (let i = size - 1; i >= size - 8; i--) {
      matrix[8][i] = FORMAT_BITS[idx++] ?? false;
    }
    for (let i = size - 7; i < size; i++) {
      matrix[i][8] = FORMAT_BITS[idx++] ?? false;
    }
  };
  applyFormat();

  // Place data bits (right-to-left in zigzag columns, skip timing col 6)
  let bitIdx = 0;
  let upward = true;
  let col = size - 1;

  while (col > 0) {
    if (col === 6) col--;
    const cols = [col, col - 1];
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of cols) {
        if (!reserved[r][c]) {
          const byteIdx = Math.floor(bitIdx / 8);
          const bitPos = 7 - (bitIdx % 8);
          const bit =
            byteIdx < allBytes.length
              ? (allBytes[byteIdx] >> bitPos) & 1
              : 0;
          // Apply mask 0: (row + col) % 2 === 0
          matrix[r][c] = Boolean(bit ^ ((r + c) % 2 === 0 ? 1 : 0));
          bitIdx++;
        }
      }
    }

    upward = !upward;
    col -= 2;
  }

  return matrix;
}

// ============================================================================
// QR SVG Renderer
// ============================================================================

function QRCodeSVG({
  data,
  size = 160,
}: {
  data: string;
  size?: number;
}) {
  const matrix = useMemo(() => {
    try {
      return generateQR(data);
    } catch {
      return null;
    }
  }, [data]);

  if (!matrix) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center bg-gray-100 dark:bg-slate-800 rounded text-xs text-gray-400"
      >
        QR unavailable
      </div>
    );
  }

  const qrSize = matrix.length;
  const cellSize = size / (qrSize + 4); // 2-module quiet zone each side
  const offset = cellSize * 2;

  const paths: string[] = [];
  for (let r = 0; r < qrSize; r++) {
    for (let c = 0; c < qrSize; c++) {
      if (matrix[r][c]) {
        const x = offset + c * cellSize;
        const y = offset + r * cellSize;
        paths.push(`M${x},${y}h${cellSize}v${cellSize}h-${cellSize}Z`);
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`QR code for ${data}`}
      role="img"
    >
      <rect width={size} height={size} fill="white" />
      <path d={paths.join(" ")} fill="black" />
    </svg>
  );
}

// ============================================================================
// QRHandoff Component
// ============================================================================

export interface QRHandoffProps {
  /** Route to open in the mobile app, e.g. "/settings/transaction-rules" */
  context: string;
  title?: string;
  description?: string;
  className?: string;
}

export function QRHandoff({
  context,
  title = "Continue on your phone",
  description = "Scan with your camera app to open in Fynvita",
  className = "",
}: QRHandoffProps) {
  const deepLink = useMemo(
    () => `fynvita://continue?route=${encodeURIComponent(context)}`,
    [context],
  );

  return (
    <div
      className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center gap-4 max-w-xs ${className}`}
    >
      <div className="flex items-center gap-2 text-gray-900 dark:text-white">
        <SmartphoneIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        <h3 className="font-semibold text-base">{title}</h3>
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-slate-600 p-2 bg-white">
        <QRCodeSVG data={deepLink} size={160} />
      </div>

      <p className="text-sm text-gray-500 dark:text-slate-400 text-center leading-snug">
        {description}
      </p>

      <p className="text-xs font-mono text-gray-400 dark:text-slate-500 break-all text-center select-all">
        {deepLink}
      </p>
    </div>
  );
}

export default QRHandoff;
