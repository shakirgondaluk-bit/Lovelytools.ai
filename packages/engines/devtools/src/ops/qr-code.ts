// lovelytools.ai — QR code generator via the `qrcode` package (the encoding
// matrix + error-correction math is standardized and not worth
// reimplementing). Renders SVG, embedded as a data URI so the UI can just
// <img src={result.output}>.
import QRCode from 'qrcode';
import { defineDevOp, DevError, type DevOptions, type DevResult } from '../types';

function toDataUri(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:image/svg+xml;base64,${btoa(bin)}`;
}

export const qrCodeGenerator = defineDevOp({
  slug: 'qr-code-generator',
  name: 'QR Code Generator',
  description: 'Generate a QR code for a URL, text, or Wi-Fi credentials.',
  async: true,
  preview: 'qrcode',
  options: [
    { id: 'errorCorrection', label: 'Error correction', kind: 'select', default: 'M', options: [
      { value: 'L', label: 'Low (7%)' }, { value: 'M', label: 'Medium (15%)' },
      { value: 'Q', label: 'Quartile (25%)' }, { value: 'H', label: 'High (30%)' },
    ] },
    { id: 'margin', label: 'Quiet-zone margin', kind: 'number', default: 4, min: 0, max: 20 },
  ],
  async run(input: string, options: DevOptions): Promise<DevResult> {
    if (input.trim() === '') return { output: '' };
    try {
      const svg = await QRCode.toString(input, {
        type: 'svg',
        errorCorrectionLevel: String(options.errorCorrection) as 'L' | 'M' | 'Q' | 'H',
        margin: Number(options.margin) || 0,
      });
      return { output: toDataUri(svg), notes: [`${input.length} character(s) encoded, on-device.`] };
    } catch (e) {
      throw new DevError('invalid-input', `Couldn't encode that: ${(e as Error).message}`);
    }
  },
  vectors: [
    { input: 'hello', options: { errorCorrection: 'M', margin: 4 }, expect: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyOSAyOSIgc2hhcGUtcmVuZGVyaW5nPSJjcmlzcEVkZ2VzIj48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMCAwaDI5djI5SDB6Ii8+PHBhdGggc3Ryb2tlPSIjMDAwMDAwIiBkPSJNNCA0LjVoN20yIDBoMm0zIDBoN000IDUuNWgxbTUgMGgxbTEgMGgybTQgMGgxbTUgMGgxTTQgNi41aDFtMSAwaDNtMSAwaDFtMiAwaDFtMSAwaDJtMSAwaDFtMSAwaDNtMSAwaDFNNCA3LjVoMW0xIDBoM20xIDBoMW0zIDBoMm0yIDBoMW0xIDBoM20xIDBoMU00IDguNWgxbTEgMGgzbTEgMGgxbTEgMGgybTIgMGgxbTEgMGgxbTEgMGgzbTEgMGgxTTQgOS41aDFtNSAwaDFtNSAwaDFtMSAwaDFtNSAwaDFNNCAxMC41aDdtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDdNMTQgMTEuNWgzTTQgMTIuNWgxbTEgMGgxbTEgMGgxbTEgMGgxbTIgMGgxbTEgMGgxbTQgMGgxbTIgMGgxTTYgMTMuNWgxbTEgMGgybTQgMGgxbTMgMGgxbTQgMGgyTTUgMTQuNWgxbTEgMGgxbTIgMGgxbTEgMGgzbTEgMGgxbTMgMGg1TTQgMTUuNWgybTIgMGgxbTkgMGgxbTQgMGgxTTUgMTYuNWgybTEgMGgxbTEgMGgybTIgMGgxbTEgMGgxbTEgMGgxbTEgMGgxTTEyIDE3LjVoNG0xIDBoMW0xIDBoMW0yIDBoM000IDE4LjVoN20zIDBoMm0xIDBoM20yIDBoM000IDE5LjVoMW01IDBoMW0zIDBoNG0xIDBoMk00IDIwLjVoMW0xIDBoM20xIDBoMW0xIDBoMW0xIDBoMm0xIDBoM20zIDBoMk00IDIxLjVoMW0xIDBoM20xIDBoMW0yIDBoMW00IDBoMm0yIDBoMk00IDIyLjVoMW0xIDBoM20xIDBoMW0xIDBoM20xIDBoMW0zIDBoMW0xIDBoMW0xIDBoMU00IDIzLjVoMW01IDBoMW0yIDBoMW00IDBoMW0xIDBoMW0yIDBoMU00IDI0LjVoN20xIDBoM20xIDBoMW0xIDBoMm0zIDBoMiIvPjwvc3ZnPgo=' },
  ],
});
