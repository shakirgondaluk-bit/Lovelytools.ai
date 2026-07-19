// lovelytools.ai — converter dispatch: (format, IR) → producer / consumer fns.
// Called from the worker; every path lazy-loads only its own family's libs.
import type { IR, IRKind } from '../ir';
import { tableToDoc } from '../ir';
import { EngineError, type FormatId } from '../types';
import * as doc from './document';
import * as table from './table';
import * as data from './data';

type Progress = (pct: number, stage: string) => void;

export async function produce(
  ir: IRKind,
  from: FormatId,
  buf: ArrayBuffer,
  name: string,
  p: Progress,
): Promise<IR> {
  if (ir === 'doc') {
    switch (from) {
      case 'docx': return doc.docxToDoc(buf, name, p);
      case 'pdf': return doc.pdfToDoc(buf, name, p);
      case 'html': return doc.htmlToDoc(buf, name, p);
      case 'txt': return doc.txtToDoc(buf, name);
      case 'doc': return doc.legacyDocToDoc(buf, name, p);
      case 'pptx': return doc.pptxToDoc(buf, name, p);
      case 'ppt': return doc.legacyPptToDoc(buf, name, p);
    }
  }
  if (ir === 'table') {
    switch (from) {
      case 'xlsx':
      case 'xls':
      case 'html': return table.workbookToTable(buf, p);
      case 'csv':
      case 'txt': return table.csvToTable(buf, p);
      case 'json': return table.jsonToTable(buf, p);
      case 'xml': return table.xmlToTable(buf, p);
    }
  }
  if (ir === 'data') {
    switch (from) {
      case 'json': return data.jsonToData(buf);
      case 'xml': return data.xmlToData(buf);
      case 'csv': return data.csvToData(buf);
    }
  }
  throw new EngineError('unsupported-route', `Cannot read ${from} into ${ir} IR.`);
}

export async function consume(irValue: IR, to: FormatId, p: Progress): Promise<Uint8Array> {
  if (irValue.kind === 'doc') {
    switch (to) {
      case 'html': return doc.docToHtml(irValue);
      case 'txt': return doc.docToTxt(irValue);
      case 'docx': return doc.docToDocx(irValue, p);
      case 'pdf': return doc.docToPdf(irValue, p);
      case 'pptx': return doc.docToPptx(irValue, p);
    }
  }
  if (irValue.kind === 'table') {
    switch (to) {
      case 'xlsx': return table.tableToXlsx(irValue, p);
      case 'csv': return table.tableToCsv(irValue, p);
      case 'json': return table.tableToJson(irValue, p);
      case 'xml': return table.tableToXml(irValue, p);
      case 'html': return table.tableToHtml(irValue, p);
      case 'txt': return table.tableToTxt(irValue);
      // Tables render to PDF/DOCX through the DocIR bridge:
      case 'pdf': return doc.docToPdf(tableToDoc(irValue, 'Workbook'), p);
      case 'docx': return doc.docToDocx(tableToDoc(irValue, 'Workbook'), p);
    }
  }
  if (irValue.kind === 'data') {
    switch (to) {
      case 'json': return data.dataToJson(irValue);
      case 'xml': return data.dataToXml(irValue);
      case 'csv': return data.dataToCsv(irValue);
    }
  }
  throw new EngineError('unsupported-route', `Cannot write ${irValue.kind} IR to ${to}.`);
}
