import mammoth from "mammoth";
import type { ParsedDocument } from "./types";

export async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value, tables: [] };
}
