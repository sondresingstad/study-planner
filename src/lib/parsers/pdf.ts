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
