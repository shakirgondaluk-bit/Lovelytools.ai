'use client';

// lovelytools.ai — transcript document exports (client-side, like everything).
//
// TXT and DOCX are Unicode-native and easy. PDF is the interesting one: pdf-lib's
// standard fonts only encode WinAnsi (Latin-1-ish), and there is no Unicode font
// to embed offline — so a transcript in Urdu, Arabic, Chinese or Hindi cannot be
// written as selectable PDF text without shipping fonts for every script. The
// browser, however, already renders every script. So:
//   · Latin transcripts  → real text PDF (selectable, small)
//   · everything else    → each page rendered to a canvas and embedded as an
//                          image (correct glyphs and bidi for any language; the
//                          cost is unselectable text, and the file says so)
// Both libraries load dynamically — no page pays for them until an export.
import type { TranscriptSegment } from '@lovelytools/engine-speech';

/** m:ss (or h:mm:ss past an hour) — the inline marker style, like "(0:04)". */
export const shortTimestamp = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

/** One line per segment, optionally led by its timestamp. */
export const transcriptLines = (segments: TranscriptSegment[], timestamps: boolean): string[] =>
  segments
    .map((seg) => {
      const text = seg.text.trim();
      if (!text) return '';
      return timestamps ? `[${shortTimestamp(seg.start)}] ${text}` : text;
    })
    .filter(Boolean);

export const transcriptText = (segments: TranscriptSegment[], timestamps: boolean): string =>
  transcriptLines(segments, timestamps).join('\n');

const RTL_SCRIPT = /[֐-׿؀-ۿ܀-ݏݐ-ݿࢠ-ࣿיִ-﷿ﹰ-﻿]/;

// ── DOCX ──────────────────────────────────────────────────────────────────────

export async function transcriptToDocx(
  segments: TranscriptSegment[],
  options: { title: string; timestamps: boolean },
): Promise<Blob> {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx');
  const lines = transcriptLines(segments, options.timestamps);

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: options.title, heading: HeadingLevel.HEADING_1 }),
          ...lines.map(
            (line) =>
              new Paragraph({
                children: [new TextRun(line)],
                bidirectional: RTL_SCRIPT.test(line),
                spacing: { after: 120 },
              }),
          ),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

// ── PDF ───────────────────────────────────────────────────────────────────────

const PAGE_W = 595; // A4 in points
const PAGE_H = 842;
const MARGIN = 56;

export async function transcriptToPdf(
  segments: TranscriptSegment[],
  options: { title: string; timestamps: boolean },
): Promise<Blob> {
  const lines = transcriptLines(segments, options.timestamps);
  const pdfLib = await import('pdf-lib');

  try {
    return await textPdf(pdfLib, options.title, lines);
  } catch {
    // A character outside WinAnsi (any non-Latin script) lands here.
    return rasterPdf(pdfLib, options.title, lines);
  }
}

type PdfLib = typeof import('pdf-lib');

/** Selectable-text PDF. Throws on any glyph the standard fonts can't encode. */
async function textPdf(pdfLib: PdfLib, title: string, lines: string[]): Promise<Blob> {
  const { PDFDocument, StandardFonts } = pdfLib;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const size = 11;
  const leading = 16;
  const maxWidth = PAGE_W - MARGIN * 2;

  // Wrap up front — encoding errors throw here, before any page exists.
  const wrapped: Array<{ text: string; bold: boolean }> = [{ text: title, bold: true }, { text: '', bold: false }];
  for (const line of lines) {
    let current = '';
    for (const word of line.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        if (current) wrapped.push({ text: current, bold: false });
        current = word;
      }
    }
    wrapped.push({ text: current, bold: false });
  }

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  for (const { text, bold: isBold } of wrapped) {
    if (y < MARGIN + leading) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    if (text) {
      page.drawText(text, { x: MARGIN, y: y - size, size, font: isBold ? bold : font });
    }
    y -= leading;
  }

  return new Blob([(await doc.save()) as BlobPart], { type: 'application/pdf' });
}

/**
 * Raster PDF: the browser draws each page (any script, correct bidi), and each
 * canvas becomes a full-page image. 2× scale keeps text crisp in print.
 */
async function rasterPdf(pdfLib: PdfLib, title: string, lines: string[]): Promise<Blob> {
  const { PDFDocument } = pdfLib;
  const scale = 2;
  const w = PAGE_W * scale;
  const h = PAGE_H * scale;
  const margin = MARGIN * scale;
  const size = 12 * scale;
  const leading = 19 * scale;
  const maxWidth = w - margin * 2;

  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) throw new Error('canvas unavailable');
  measure.font = `${size}px system-ui, sans-serif`;

  // Wrap by measured width; a single "word" wider than the page (CJK has no
  // spaces) is split by characters.
  const wrapped: string[] = [];
  for (const line of lines) {
    let current = '';
    const words = line.split(/\s+/).flatMap((word) => {
      if (measure.measureText(word).width <= maxWidth) return [word];
      const parts: string[] = [];
      let chunk = '';
      for (const ch of word) {
        if (measure.measureText(chunk + ch).width > maxWidth && chunk) {
          parts.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      if (chunk) parts.push(chunk);
      return parts;
    });
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measure.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        if (current) wrapped.push(current);
        current = word;
      }
    }
    wrapped.push(current);
  }

  const linesPerPage = Math.floor((h - margin * 2 - leading * 2) / leading);
  const doc = await PDFDocument.create();

  for (let start = 0; start < wrapped.length; start += linesPerPage) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#111111';
    ctx.textBaseline = 'alphabetic';

    let y = margin + size;
    if (start === 0) {
      ctx.font = `bold ${size * 1.2}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(title, margin, y);
      y += leading * 2;
    }

    ctx.font = `${size}px system-ui, sans-serif`;
    for (const line of wrapped.slice(start, start + linesPerPage)) {
      const rtl = RTL_SCRIPT.test(line);
      ctx.direction = rtl ? 'rtl' : 'ltr';
      ctx.textAlign = rtl ? 'right' : 'left';
      ctx.fillText(line, rtl ? w - margin : margin, y);
      y += leading;
    }

    const png = await doc.embedPng(canvas.toDataURL('image/png'));
    const page = doc.addPage([PAGE_W, PAGE_H]);
    page.drawImage(png, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
  }

  return new Blob([(await doc.save()) as BlobPart], { type: 'application/pdf' });
}
