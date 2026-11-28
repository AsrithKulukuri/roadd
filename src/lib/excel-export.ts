/**
 * Zero-dependency `.xlsx` (OOXML) generator for browser and Node.js.
 *
 * Uses uncompressed ZIP (STORE, method 0) and explicit `inlineStr` cells for text
 * so Excel never converts 12-digit phone numbers into scientific notation (`9.19E+11`),
 * never displays `###` due to narrow default columns, and never requires `'` prefixes.
 */

export type ExcelCellValue = string | number | boolean | null | undefined;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnLetters(index: number): string {
  let n = index + 1;
  let result = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/*?:[\]]/g, " ").trim();
  return (cleaned || "Sheet1").slice(0, 31);
}

/**
 * Formats Indian phone numbers consistently for spreadsheet readability
 * while keeping non-matching values intact.
 */
export function formatPhoneForExcel(raw: unknown): string {
  if (raw === null || raw === undefined) return "-";
  const str = String(raw).trim();
  if (!str || str === "-") return "-";
  const digits = str.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2)}`;
  }
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91 ${digits}`;
  }
  return str;
}

interface ZipEntry {
  nameBytes: Uint8Array;
  data: Uint8Array;
  crc: number;
  offset: number;
}

function buildZipStore(files: Array<{ name: string; content: string }>): Uint8Array {
  const encoder = new TextEncoder();
  const entries: ZipEntry[] = [];
  let offset = 0;

  const localParts: Uint8Array[] = [];
  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);

    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true); // Version needed to extract (2.0)
    view.setUint16(6, 0x0800, true); // UTF-8 filename flag
    view.setUint16(8, 0, true); // Compression method: 0 (STORE)
    view.setUint16(10, 0, true); // Mod time
    view.setUint16(12, 0, true); // Mod date
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true); // Compressed size
    view.setUint32(22, data.length, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true); // Extra field length
    header.set(nameBytes, 30);

    entries.push({ nameBytes, data, crc, offset });
    localParts.push(header, data);
    offset += header.length + data.length;
  }

  const centralParts: Uint8Array[] = [];
  let centralSize = 0;
  for (const entry of entries) {
    const cd = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(cd.buffer);
    view.setUint32(0, 0x02014b50, true); // Central directory signature
    view.setUint16(4, 20, true); // Version made by
    view.setUint16(6, 20, true); // Version needed
    view.setUint16(8, 0x0800, true); // UTF-8 filename flag
    view.setUint16(10, 0, true); // STORE
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, entry.crc, true);
    view.setUint32(20, entry.data.length, true);
    view.setUint32(24, entry.data.length, true);
    view.setUint16(28, entry.nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, entry.offset, true);
    cd.set(entry.nameBytes, 46);

    centralParts.push(cd);
    centralSize += cd.length;
  }

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // End of central directory signature
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, offset, true);
  eocdView.setUint16(20, 0, true);

  const totalLength = offset + centralSize + eocd.length;
  const output = new Uint8Array(totalLength);
  let cursor = 0;
  for (const part of localParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  output.set(eocd, cursor);
  return output;
}

/**
 * Builds an `.xlsx` workbook with a single worksheet, bold header styling,
 * auto-sized columns, and explicit string cells so phone numbers stay visible.
 */
export function buildXlsxBytes(
  sheetName: string,
  rows: ExcelCellValue[][],
  options: { boldFirstRow?: boolean; boldRows?: number[] } = { boldFirstRow: true }
): Uint8Array {
  const safeSheetName = sanitizeSheetName(sheetName);
  const boldFirstRow = options.boldFirstRow !== false;
  const boldRowSet = new Set<number>(options.boldRows || []);
  if (boldFirstRow && rows.length > 0) boldRowSet.add(0);

  const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const colWidths = new Array<number>(maxCols).fill(12);

  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      const val = row[c];
      const len = val === null || val === undefined ? 0 : String(val).length;
      if (len + 5 > colWidths[c]) {
        colWidths[c] = Math.min(54, Math.max(12, len + 5));
      }
    }
  }

  const colsXml = colWidths
    .map(
      (width, idx) =>
        `<col min="${idx + 1}" max="${idx + 1}" width="${width}" customWidth="1"/>`
    )
    .join("");

  const rowsXml = rows
    .map((row, rIdx) => {
      const rowNum = rIdx + 1;
      const isHeader = boldRowSet.has(rIdx);
      const styleAttr = isHeader ? ` s="1"` : "";
      const cellsXml = row
        .map((cell, cIdx) => {
          const ref = `${columnLetters(cIdx)}${rowNum}`;
          if (cell === null || cell === undefined || cell === "") {
            return `<c r="${ref}"${styleAttr} t="inlineStr"><is><t></t></is></c>`;
          }
          if (typeof cell === "number" && Number.isFinite(cell)) {
            return `<c r="${ref}"${styleAttr} t="n"><v>${cell}</v></c>`;
          }
          const text = typeof cell === "boolean" ? (cell ? "Yes" : "No") : String(cell);
          return `<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowNum}">${cellsXml}</row>`;
    })
    .join("");

  const contentTypesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`;

  const rootRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const workbookRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="${escapeXml(safeSheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
    `</workbook>`;

  const stylesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<fonts count="2">` +
    `<font><sz val="11"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="11"/><name val="Calibri"/></font>` +
    `</fonts>` +
    `<fills count="3">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>` +
    `</fills>` +
    `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="2">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>` +
    `</cellXfs>` +
    `</styleSheet>`;

  const sheetXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    (colsXml ? `<cols>${colsXml}</cols>` : "") +
    `<sheetData>${rowsXml}</sheetData>` +
    `</worksheet>`;

  return buildZipStore([
    { name: "[Content_Types].xml", content: contentTypesXml },
    { name: "_rels/.rels", content: rootRelsXml },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRelsXml },
    { name: "xl/workbook.xml", content: workbookXml },
    { name: "xl/styles.xml", content: stylesXml },
    { name: "xl/worksheets/sheet1.xml", content: sheetXml },
  ]);
}
