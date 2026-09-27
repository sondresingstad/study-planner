import mammoth from "mammoth";
import type { ParsedDocument } from "./types";

export async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  // Converted via HTML rather than mammoth.extractRawText: raw text puts every
  // table cell on its own line (separated by blank lines), which breaks the
  // row-based calendar scanner. Going through HTML lets each table row come
  // out as a single line, the same shape pdf-parse produces for PDFs.
  const result = await mammoth.convertToHtml({ buffer });
  return { text: docxHtmlToText(result.value), tables: [] };
}

/** Flattens mammoth's HTML to plain text: one line per paragraph, one line per table row. */
export function docxHtmlToText(html: string): string {
  const withRows = html.replace(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g, (_, row: string) => {
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) => collapse(stripTags(m[1])));
    return cells.filter(Boolean).join(" ") + "\n";
  });

  // Paragraphs are separated by a blank line, as in extractRawText's output;
  // table rows are not, matching how a PDF table reads.
  return decodeEntities(stripTags(withRows.replace(/<\/(p|h[1-6]|li)>/g, "\n\n").replace(/<br\s*\/?>/g, "\n")))
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}
