/**
 * RFC 4180-style CSV encoding with formula-injection protection: cells
 * starting with =, +, -, @ (or tab/CR) are prefixed with ' so exported files
 * are safe to open in spreadsheet apps.
 */
export function escapeCsvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) lines.push(row.map(escapeCsvCell).join(","));
  return lines.join("\r\n") + "\r\n";
}
