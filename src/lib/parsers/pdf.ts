// Must be imported before PDFParse — without it, pdf-parse's underlying
// pdfjs-dist can't locate its worker module when bundled by Next.js
// server-side ("Setting up fake worker failed: Cannot find module
// pdf.worker.mjs"). See pdf-parse's Next.js troubleshooting guide.
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import type { ParsedDocument } from "./types";

export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return { text: result.text, tables: [] };
  } finally {
    await parser.destroy();
  }
}
