export type ParsedTable = {
  sheetName: string;
  rows: string[][];
};

export type ParsedDocument = {
  /** Normalized plain text, for AI extraction and simple heuristics. */
  text: string;
  /** Present for spreadsheet sources; empty array otherwise. */
  tables: ParsedTable[];
};
