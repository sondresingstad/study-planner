import type { ParsedDocument } from "./types";

export async function parseTxt(buffer: Buffer): Promise<ParsedDocument> {
  return { text: buffer.toString("utf-8"), tables: [] };
}
