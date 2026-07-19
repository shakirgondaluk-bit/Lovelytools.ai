// lovelytools.ai — read / write / strip document metadata.
import {
  outName,
  PdfError,
  type OpContext,
  type PdfInput,
  type PdfMetadata,
  type PdfOpResult,
} from '../types';
import { openPdf } from './merge';

export async function readMetadata(input: PdfInput): Promise<PdfMetadata & { pageCount: number }> {
  const doc = await openPdf(input.buf, input.name);
  return {
    title: doc.getTitle() ?? undefined,
    author: doc.getAuthor() ?? undefined,
    subject: doc.getSubject() ?? undefined,
    keywords: doc.getKeywords()?.split(/[,;]\s*/).filter(Boolean),
    creator: doc.getCreator() ?? undefined,
    pageCount: doc.getPageCount(),
  };
}

export async function writeMetadata(input: PdfInput, meta: PdfMetadata, ctx: OpContext): Promise<PdfOpResult> {
  const doc = await openPdf(input.buf, input.name);
  ctx.progress(40, 'Updating metadata');
  if (meta.title !== undefined) doc.setTitle(meta.title);
  if (meta.author !== undefined) doc.setAuthor(meta.author);
  if (meta.subject !== undefined) doc.setSubject(meta.subject);
  if (meta.keywords !== undefined) doc.setKeywords(meta.keywords);
  if (meta.creator !== undefined) doc.setCreator(meta.creator);
  doc.setModificationDate(new Date());

  ctx.progress(85, 'Saving');
  const bytes = await doc.save({ useObjectStreams: true });
  const total = doc.getPageCount();
  return {
    files: [{ bytes, name: outName(input.name, '-metadata'), mime: 'application/pdf' }],
    fidelity: 'high',
    warnings: [],
    stats: { pagesIn: total, pagesOut: total, bytesIn: input.buf.byteLength, bytesOut: bytes.byteLength },
  };
}

/** "Remove metadata" privacy tool — blanks every Info field. */
export async function stripMetadata(input: PdfInput, ctx: OpContext): Promise<PdfOpResult> {
  const result = await writeMetadata(
    input,
    { title: '', author: '', subject: '', keywords: [], creator: '' },
    ctx,
  );
  // writeMetadata always returns exactly one file. Say so rather than assert it away:
  // if that ever stops being true, this should fail loudly here and not silently
  // hand back a document with the wrong name.
  const [file] = result.files;
  if (!file) throw new PdfError('internal', 'Stripping metadata produced no document.');
  file.name = outName(input.name, '-clean');
  return result;
}
