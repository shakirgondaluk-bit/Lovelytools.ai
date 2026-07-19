// lovelytools.ai — format registry: extensions, MIME types, families.
import type { FormatFamily, FormatId } from './types';

export interface FormatMeta {
  id: FormatId;
  label: string;
  family: FormatFamily;
  extensions: string[]; // first entry is canonical
  mimes: string[]; // first entry is canonical output MIME
  /** False for formats we read but never produce (legacy binaries). */
  producible: boolean;
}

export const FORMATS: Record<FormatId, FormatMeta> = {
  pdf: {
    id: 'pdf', label: 'PDF', family: 'document',
    extensions: ['pdf'], mimes: ['application/pdf'], producible: true,
  },
  doc: {
    id: 'doc', label: 'Word 97–2003', family: 'document',
    extensions: ['doc'], mimes: ['application/msword'], producible: false,
  },
  docx: {
    id: 'docx', label: 'Word', family: 'document',
    extensions: ['docx'],
    mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    producible: true,
  },
  xls: {
    id: 'xls', label: 'Excel 97–2003', family: 'spreadsheet',
    extensions: ['xls'], mimes: ['application/vnd.ms-excel'], producible: false,
  },
  xlsx: {
    id: 'xlsx', label: 'Excel', family: 'spreadsheet',
    extensions: ['xlsx'],
    mimes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    producible: true,
  },
  ppt: {
    id: 'ppt', label: 'PowerPoint 97–2003', family: 'presentation',
    extensions: ['ppt'], mimes: ['application/vnd.ms-powerpoint'], producible: false,
  },
  pptx: {
    id: 'pptx', label: 'PowerPoint', family: 'presentation',
    extensions: ['pptx'],
    mimes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    producible: true,
  },
  txt: {
    id: 'txt', label: 'Plain text', family: 'text',
    extensions: ['txt', 'text', 'log', 'md'], mimes: ['text/plain'], producible: true,
  },
  html: {
    id: 'html', label: 'HTML', family: 'document',
    extensions: ['html', 'htm'], mimes: ['text/html'], producible: true,
  },
  csv: {
    id: 'csv', label: 'CSV', family: 'data',
    extensions: ['csv', 'tsv'], mimes: ['text/csv'], producible: true,
  },
  xml: {
    id: 'xml', label: 'XML', family: 'data',
    extensions: ['xml'], mimes: ['application/xml', 'text/xml'], producible: true,
  },
  json: {
    id: 'json', label: 'JSON', family: 'data',
    extensions: ['json'], mimes: ['application/json'], producible: true,
  },
};

export const ALL_FORMATS = Object.values(FORMATS);

/** `accept` attribute value for <UploadZone> on the converter tool pages. */
export function acceptString(ids: FormatId[] = ALL_FORMATS.map((f) => f.id)): string {
  return ids
    .flatMap((id) => [...FORMATS[id].mimes, ...FORMATS[id].extensions.map((e) => `.${e}`)])
    .join(',');
}

/** Swap the extension on an output filename, preserving the base name. */
export function outputFilename(inputName: string, to: FormatId): string {
  const base = inputName.replace(/\.[^./\\]+$/, '');
  return `${base}.${FORMATS[to].extensions[0]}`;
}

export function formatByExtension(name: string): FormatId | null {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const hit = ALL_FORMATS.find((f) => f.extensions.includes(ext));
  return hit?.id ?? null;
}
