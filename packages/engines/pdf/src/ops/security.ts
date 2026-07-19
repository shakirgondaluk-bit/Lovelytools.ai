// lovelytools.ai — password protection and removal.
//
// This is the one place the engine reaches past pdf-lib. Stock pdf-lib can READ an
// encrypted document (`ignoreEncryption`) but has no way to WRITE one — there is no
// userPassword option on save, so protect-pdf genuinely needed a new capability.
// @cantoo/pdf-lib is a maintained fork of the same codebase that adds
// `doc.encrypt({ userPassword, ownerPassword, permissions })`.
//
// The fork is imported ONLY here, and nothing is shared across the boundary: each op
// loads bytes and returns bytes, so a @cantoo PDFDocument never meets a pdf-lib one.
// Mixing the two class identities in a single document would be a real bug; passing
// Uint8Arrays between them is not.
//
// Everything still happens on the device. A password manager would be a place to send
// your document; this is a function that runs in your tab.
import { PDFDocument as CantooDocument } from '@cantoo/pdf-lib';
import { outName, PdfError, type OpContext, type PdfInput, type PdfOpResult } from '../types';

export interface ProtectOptions {
  /** Required to open the document. */
  userPassword: string;
  /**
   * Grants full rights. Defaults to the user password when omitted — without one,
   * anybody who can open the file can also strip its permissions.
   */
  ownerPassword?: string;
}

export async function protect(
  input: PdfInput,
  opts: ProtectOptions,
  ctx: OpContext,
): Promise<PdfOpResult> {
  const bytesIn = input.buf.byteLength;
  const password = opts.userPassword?.trim();

  if (!password) {
    throw new PdfError('internal', 'Enter a password to lock the document with.');
  }
  if (password.length < 4) {
    throw new PdfError('internal', 'Use at least 4 characters — shorter is not worth the trouble.');
  }

  ctx.progress(10, 'Reading the document');
  let doc: CantooDocument;
  try {
    doc = await CantooDocument.load(input.buf, { ignoreEncryption: true });
  } catch {
    throw new PdfError('corrupt-file', "That file couldn't be read as a PDF.");
  }

  const pages = doc.getPageCount();
  ctx.progress(50, 'Encrypting');

  doc.encrypt({
    userPassword: password,
    // Without an owner password the PDF's permission bits are advisory at best —
    // any reader can ignore them. Defaulting it to the user password means the file
    // is at least no weaker than the password the user chose.
    ownerPassword: opts.ownerPassword?.trim() || password,
  });

  ctx.progress(85, 'Saving');
  const bytes = await doc.save({ useObjectStreams: false });

  return {
    files: [{ bytes, name: outName(input.name, '-protected'), mime: 'application/pdf' }],
    fidelity: 'high',
    warnings: [
      'The password is not stored anywhere and cannot be recovered — it was never sent to us. Lose it and the document is gone.',
      'PDF encryption keeps honest readers out. It is not a substitute for not sharing the file.',
    ],
    stats: { pagesIn: pages, pagesOut: pages, bytesIn, bytesOut: bytes.byteLength },
  };
}

export interface UnlockOptions {
  /** The password the document opens with. Omit for permission-only locks. */
  password?: string;
}

/**
 * Removes the password from a PDF you can already open.
 *
 * This is not a cracker. It needs the password (or the document to be locked only
 * against editing, which is a lock most readers ignore anyway) and simply re-saves
 * without encryption.
 */
export async function unlock(
  input: PdfInput,
  opts: UnlockOptions,
  ctx: OpContext,
): Promise<PdfOpResult> {
  const bytesIn = input.buf.byteLength;

  ctx.progress(15, 'Opening the document');
  let doc: CantooDocument;
  try {
    doc = await CantooDocument.load(input.buf, {
      password: opts.password?.trim() || undefined,
      ignoreEncryption: true,
    });
  } catch (cause) {
    const message = String((cause as Error)?.message ?? '').toLowerCase();
    if (message.includes('password') || message.includes('encrypt')) {
      throw new PdfError(
        'password-protected',
        opts.password
          ? "That password didn't open the document."
          : 'This PDF needs a password to open. Enter it above.',
      );
    }
    throw new PdfError('corrupt-file', "That file couldn't be read as a PDF.");
  }

  const pages = doc.getPageCount();
  ctx.progress(70, 'Removing protection');

  // Loading, then saving without calling encrypt(), is what drops the encryption
  // dictionary — the document is rebuilt from its decrypted objects.
  ctx.progress(88, 'Saving');
  const bytes = await doc.save({ useObjectStreams: true });

  return {
    files: [{ bytes, name: outName(input.name, '-unlocked'), mime: 'application/pdf' }],
    fidelity: 'high',
    warnings: ['The password is gone — anyone with this file can open it. Keep the original if that matters.'],
    stats: { pagesIn: pages, pagesOut: pages, bytesIn, bytesOut: bytes.byteLength },
  };
}
