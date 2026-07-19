// lovelytools.ai — JWT decoder. Decodes; does NOT verify — and says so.
// Signature verification without the key is theater.
import { defineDevOp, DevError, type DevField, type DevOptions, type DevResult } from '../types';

function b64urlDecode(part: string): string {
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  try {
    const bin = atob(b64);
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    throw new DevError('parse-error', 'That segment isn\u2019t valid base64url.');
  }
}

const CLAIM_LABELS: Record<string, string> = {
  iss: 'Issuer', sub: 'Subject', aud: 'Audience', exp: 'Expires', nbf: 'Not before',
  iat: 'Issued at', jti: 'JWT ID', alg: 'Algorithm', typ: 'Type', kid: 'Key ID',
};

export const jwt = defineDevOp({
  slug: 'jwt-decoder',
  name: 'JWT Decoder',
  description: 'Decode header and payload locally, with expiry checks. Decoded — not verified.',
  options: [],
  run(input: string, _options: DevOptions): DevResult {
    const token = input.trim();
    if (token === '') return { output: '' };
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new DevError('parse-error', `A JWT has three dot-separated segments — this has ${parts.length}.`);
    }

    const [headerB64, payloadB64] = parts;
    let header: Record<string, unknown>;
    let payload: Record<string, unknown>;
    try {
      // An empty segment would fail JSON.parse below anyway; this guard just gets
      // there without asking the compiler to trust the length check above.
      if (headerB64 === undefined || payloadB64 === undefined) throw new SyntaxError('empty segment');
      header = JSON.parse(b64urlDecode(headerB64));
      payload = JSON.parse(b64urlDecode(payloadB64));
    } catch (e) {
      if (e instanceof DevError) throw e;
      throw new DevError('parse-error', 'Header or payload isn\u2019t valid JSON after decoding.');
    }

    const now = Math.floor(Date.now() / 1000);
    const fields: DevField[] = [];

    for (const [k, v] of Object.entries(header)) {
      fields.push({ label: `header.${CLAIM_LABELS[k] ?? k}`, value: String(v) });
    }
    for (const [k, v] of Object.entries(payload)) {
      const isTime = k === 'exp' || k === 'nbf' || k === 'iat';
      const rendered = isTime && typeof v === 'number' ? `${v} — ${new Date(v * 1000).toISOString()}` : JSON.stringify(v);
      let tone: DevField['tone'] = 'default';
      if (k === 'exp' && typeof v === 'number') tone = v < now ? 'negative' : 'positive';
      if (k === 'nbf' && typeof v === 'number' && v > now) tone = 'negative';
      fields.push({ label: CLAIM_LABELS[k] ?? k, value: rendered, tone });
    }

    const notes = ['Decoded locally — the signature was NOT verified (that requires the signing key).'];
    if (typeof payload.exp === 'number') {
      notes.push(
        payload.exp < now
          ? `Expired ${ago(now - payload.exp)} ago (by your device clock — allow for skew).`
          : `Expires in ${ago(payload.exp - now)} (by your device clock).`,
      );
    }
    if (header.alg === 'none') {
      notes.push('⚠ alg: "none" — this token is unsigned. Never accept these server-side.');
    }

    return {
      output: JSON.stringify({ header, payload }, null, 2),
      fields,
      notes,
    };
  },
  vectors: [
    {
      input: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      expect: JSON.stringify(
        { header: { alg: 'HS256', typ: 'JWT' }, payload: { sub: '1234567890', name: 'John Doe', iat: 1516239022 } },
        null,
        2,
      ),
    },
  ],
});

function ago(sec: number): string {
  if (sec < 90) return `${sec}s`;
  if (sec < 5400) return `${Math.round(sec / 60)}m`;
  if (sec < 129600) return `${Math.round(sec / 3600)}h`;
  return `${Math.round(sec / 86400)}d`;
}
