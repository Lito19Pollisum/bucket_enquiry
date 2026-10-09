// Builds a formatted Pollisum enquiry workbook from the enquiry CSV text.
import ExcelJS from 'exceljs';
import { parseCsv } from './_sb.js';

const MAROON = 'FF7A0C1C', MIST = 'FFF3F3F3', LINE = 'FFE4E4E4', BLUSH = 'FFEDD4D4', INK = 'FF191D24';
const border = { top: { style: 'thin', color: { argb: LINE } }, bottom: { style: 'thin', color: { argb: LINE } }, left: { style: 'thin', color: { argb: LINE } }, right: { style: 'thin', color: { argb: LINE } } };
const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

export async function buildXlsx(csv) {
  const rows = parseCsv(csv);
  const meta = [];
  let i = 0;
  for (; i < rows.length && rows[i][0] !== 'Item'; i++) if (rows[i].length > 1) meta.push([rows[i][0], rows[i][1] || '']);
  const head = rows[i] || [];
  const items = rows.slice(i + 1).filter(r => r[0]);
  const ref = (meta.find(m => m[0] === 'Enquiry reference') || [])[1] || '';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Pollisum Fabrication';
  const ws = wb.addWorksheet('Enquiry', { views: [{ showGridLines: false }], pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: .4, right: .4, top: .5, bottom: .6, header: .3, footer: .3 } } });
  ws.columns = [7, 12, 15, 34, 12, 12, 46, 7, 36].map(width => ({ width }));
  const base = { font: { name: 'Arial', size: 10, color: { argb: INK } }, alignment: { vertical: 'middle', wrapText: true } };

  ws.mergeCells('A1:I1');
  Object.assign(ws.getCell('A1'), { value: 'REQUEST FOR QUOTATION', font: { name: 'Arial', size: 18, bold: true, color: { argb: 'FFFFFFFF' } }, fill: fill(MAROON), alignment: { vertical: 'middle', indent: 1 } });
  ws.getRow(1).height = 34;
  ws.mergeCells('A2:I2');
  Object.assign(ws.getCell('A2'), { value: `Pollisum Fabrication  ·  Enquiry reference ${ref}`, font: { name: 'Arial', size: 11, bold: true, color: { argb: MAROON } }, fill: fill(BLUSH), alignment: { vertical: 'middle', indent: 1 } });
  ws.getRow(2).height = 22;

  let r = 4;
  for (const [k, v] of meta) {
    if (k === 'Enquiry reference') continue;
    ws.mergeCells(r, 1, r, 2); ws.mergeCells(r, 3, r, 9);
    const a = ws.getCell(r, 1), b = ws.getCell(r, 3);
    Object.assign(a, { value: k, ...base, font: { ...base.font, bold: true }, fill: fill(MIST) });
    Object.assign(b, { value: v, ...base, alignment: { vertical: 'middle', horizontal: 'left', wrapText: true } });
    for (let c = 1; c <= 9; c++) ws.getCell(r, c).border = border;
    if (String(v).length > 110) ws.getRow(r).height = 15 * Math.ceil(String(v).length / 110);
    r++;
  }

  r++;
  const hr = r;
  head.forEach((h, c) => Object.assign(ws.getCell(r, c + 1), { value: h, font: { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }, fill: fill(MAROON), border, alignment: { vertical: 'middle', horizontal: c === 0 || c === 7 ? 'center' : 'left', wrapText: true } }));
  ws.getRow(r).height = 24;
  let total = 0;
  items.forEach((it, n) => {
    r++;
    const qty = parseInt(it[7], 10) || 0; total += qty;
    for (let c = 0; c < 9; c++) {
      const cell = ws.getCell(r, c + 1);
      cell.value = c === 7 ? qty : (it[c] || '');
      cell.font = { ...base.font, bold: c === 2 };
      cell.alignment = { vertical: 'top', horizontal: c === 0 || c === 7 ? 'center' : 'left', wrapText: true };
      cell.border = border;
      if (n % 2) cell.fill = fill(MIST);
    }
    const longest = Math.max(String(it[6] || '').length / 44, String(it[8] || '').length / 34, String(it[3] || '').length / 32, 1);
    ws.getRow(r).height = Math.max(18, 14 * Math.ceil(longest));
  });
  r++;
  ws.mergeCells(r, 1, r, 7);
  Object.assign(ws.getCell(r, 1), { value: 'Total quantity', font: { name: 'Arial', size: 10, bold: true }, alignment: { horizontal: 'right', vertical: 'middle' }, fill: fill(BLUSH), border });
  Object.assign(ws.getCell(r, 8), { value: total, font: { name: 'Arial', size: 10, bold: true }, alignment: { horizontal: 'center', vertical: 'middle' }, fill: fill(BLUSH), border });
  ws.getCell(r, 9).fill = fill(BLUSH); ws.getCell(r, 9).border = border;

  r += 2;
  ws.mergeCells(r, 1, r, 9);
  Object.assign(ws.getCell(r, 1), { value: 'POLLISUM FABRICATION  ·  TEL (65) 6755 7600  ·  POLLISUM.COM', font: { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } }, fill: fill('FF6A0303'), alignment: { vertical: 'middle', indent: 1 } });
  ws.getRow(r).height = 20;
  ws.pageSetup.printArea = `A1:I${r}`;
  ws.pageSetup.printTitlesRow = `${hr}:${hr}`;

  return Buffer.from(await wb.xlsx.writeBuffer());
}
