import { parse } from 'csv-parse/sync';

export function parseCsv(buffer) {
  // Remove BOM if present
  let text = buffer.toString('utf8');
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
  return records;
}
