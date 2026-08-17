import ExcelJS from "exceljs";
import type { ParsedDocument, ParsedTable } from "./types";

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
    if ("text" in value) return String(value.text);
    if ("result" in value) return cellToString(value.result as ExcelJS.CellValue);
    return "";
  }
  return String(value);
}

export async function parseXlsx(buffer: Buffer): Promise<ParsedDocument> {
  const workbook = new ExcelJS.Workbook();
  // exceljs pulls in fast-csv, which bundles its own older @types/node —
  // its ambient Buffer type doesn't structurally match ours even though
  // it's the same runtime object. `any` is the standard workaround for
  // this known duplicate-@types/node interop issue.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);

  const tables: ParsedTable[] = [];
  const textParts: string[] = [];

  workbook.eachSheet((worksheet) => {
    const rows: string[][] = [];
    worksheet.eachRow((row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        cells.push(cellToString(cell.value));
      });
      if (cells.some((c) => c.trim() !== "")) rows.push(cells);
    });
    if (rows.length === 0) return;
    tables.push({ sheetName: worksheet.name, rows });
    textParts.push(`# Sheet: ${worksheet.name}\n` + rows.map((r) => r.join(" | ")).join("\n"));
  });

  return { text: textParts.join("\n\n"), tables };
}
