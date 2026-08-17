import type { DocumentType } from "@prisma/client";
import type { ParsedDocument } from "./types";
import { parsePdf } from "./pdf";
import { parseDocx } from "./docx";
import { parseXlsx } from "./xlsx";
import { parseTxt } from "./txt";

export type { ParsedDocument, ParsedTable } from "./types";

export function detectDocumentType(filename: string, mimeType: string): DocumentType {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf" || mimeType === "application/pdf") return "PDF";
  if (ext === "xlsx" || ext === "xls" || mimeType.includes("spreadsheet")) return "XLSX";
  if (ext === "docx" || mimeType.includes("wordprocessingml")) return "DOCX";
  if (ext === "txt" || mimeType === "text/plain") return "TXT";
  return "UNKNOWN";
}

export async function parseDocument(type: DocumentType, buffer: Buffer): Promise<ParsedDocument> {
  switch (type) {
    case "PDF":
      return parsePdf(buffer);
    case "DOCX":
      return parseDocx(buffer);
    case "XLSX":
      return parseXlsx(buffer);
    case "TXT":
      return parseTxt(buffer);
    case "UNKNOWN":
    default:
      throw new Error("Unsupported file type");
  }
}
