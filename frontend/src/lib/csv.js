// Minimal RFC4180-style CSV parser: handles quoted fields, escaped quotes ("")
// and commas / newlines inside quotes — robust for spreadsheet exports.
export const parseCsv = (text) => {
  const src = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully-empty rows (e.g. trailing newline).
  return rows.filter((cols) => cols.some((cell) => cell.trim() !== ''));
};

// Parse CSV text into an array of objects keyed by the header row.
export const csvToObjects = (text) => {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((cols) => {
    const obj = {};
    headers.forEach((header, index) => {
      if (header) obj[header] = (cols[index] ?? '').trim();
    });
    return obj;
  });
};
