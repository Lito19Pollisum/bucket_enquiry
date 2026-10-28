// Editable Excel version of the draft quotation, with the logo and each bucket's photo, so staff can amend terms and convert to PDF.
import ExcelJS from 'exceljs';
import { standardItems, FAM_IMG } from './_quote.js';
import { PRICES } from './_prices.js';
import { IMGS } from './_assets.js';

// Reads width/height from a JPEG's SOF marker.
function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return { w: 4, h: 3 };
}

export async function buildQuoteXlsx(csv) {
  const { meta, items } = standardItems(csv);
  if (!items.length) return null;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Quotation', { pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.columns = [{ width: 24 }, { width: 50 }, { width: 8 }, { width: 15 }, { width: 16 }];
  const bold = r => { r.font = { bold: true }; };
  const addImg = (key, row0, col0, maxW, maxH) => {
    if (!IMGS[key]) return;
    const buf = Buffer.from(IMGS[key], 'base64'); const { w, h } = jpegSize(buf);
    const k = Math.min(maxW / w, maxH / h);
    const id = wb.addImage({ base64: IMGS[key], extension: 'jpeg' });
    ws.addImage(id, { tl: { col: col0 + 0.1, row: row0 + 0.1 }, ext: { width: Math.round(w * k), height: Math.round(h * k) } });
  };

  // Header: logo, company line, customer details
  ws.getRow(1).height = 62; ws.getRow(2).height = 4;
  addImg('logo', 0, 0, 70, 58);
  ws.getCell('B1').value = 'POLLISUM FABRICATION PTE. LTD.'; ws.getCell('B1').font = { bold: true, size: 14 }; ws.getCell('B1').alignment = { vertical: 'middle' };
  const date = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
  [['COMPANY NAME', meta.Company], ['ADDRESS', meta['Delivery location']], ['ATTN', meta['Contact person']], ['TEL', meta.Phone], ['EMAIL', meta.Email], ['DATE', date], ['ENQUIRY REF', meta['Enquiry reference']]]
    .forEach(([k, v]) => { const r = ws.addRow([k, v || '']); r.getCell(1).font = { bold: true }; });
  ws.addRow([]);
  ws.addRow(['Quotation for Standard Buckets']).font = { bold: true, size: 12 };
  const head = ws.addRow(['Photo', 'Description', 'Qty', 'Unit Price (S$)', 'Amount (S$)']); bold(head);
  head.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } }; c.border = { bottom: { style: 'thin' } }; });

  const first = ws.rowCount + 1;
  for (const it of items) {
    const m = it.model || {}, pr = PRICES[it.code];
    const d = [`${it.fam ? it.fam.name : it.famName} - ${it.code}`, `Capacity: ${m.cap || it.cap || ''}`, `Size: ${m.dims || it.dims || ''}`, m.self ? `Empty Weight: ${m.self}` : '', `SWL: ${m.swl || it.swl || ''}`, m.outlet ? `Outlet: ${m.outlet}` : '', pr?.note ? `Includes: ${pr.note.replace(/^incl\.\s*/, '')}` : ''].filter(Boolean).join('\n');
    const r = ws.addRow([null, d, it.qty, pr ? pr.price : 'TBC', null]);
    r.getCell(5).value = pr ? { formula: `C${r.number}*D${r.number}`, result: pr.price * it.qty } : 'TBC';
    r.height = Math.max(100, d.split('\n').length * 15 + 12);
    r.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    [3, 4, 5].forEach(n => { r.getCell(n).alignment = { vertical: 'top', horizontal: 'right' }; });
    [4, 5].forEach(n => { r.getCell(n).numFmt = '#,##0.00'; });
    r.eachCell({ includeEmpty: true }, c => { c.border = { bottom: { style: 'hair' } }; });
    const key = it.fam ? FAM_IMG[it.fam.id] : null;
    if (key) addImg(key, r.number - 1, 0, 150, 90);
  }
  const last = ws.rowCount;
  const priced = items.every(it => PRICES[it.code]);
  ws.addRow([]);
  if (priced) {
    const s = ws.addRow([null, 'Sub-total', null, null, { formula: `SUM(E${first}:E${last})` }]);
    const g = ws.addRow([null, 'GST 9%', null, null, { formula: `E${s.number}*0.09` }]);
    const t = ws.addRow([null, 'TOTAL AMOUNT (SGD)', null, null, { formula: `E${s.number}+E${g.number}` }]); bold(t);
    [s, g, t].forEach(r => { r.getCell(5).numFmt = '#,##0.00'; r.getCell(2).alignment = { horizontal: 'right' }; });
  } else bold(ws.addRow([null, 'TOTAL AMOUNT TBC']));
  ws.addRow([]);
  ws.addRow(['Draft generated automatically from the online enquiry. Add terms and conditions and check prices and delivery before sending.']).font = { italic: true, color: { argb: 'FF888888' } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
