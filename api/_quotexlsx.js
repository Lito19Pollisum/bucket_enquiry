// Editable Excel version of the draft quotation (same content as the PDF) so it can be amended later.
import ExcelJS from 'exceljs';
import { standardItems } from './_quote.js';
import { PRICES } from './_prices.js';

export async function buildQuoteXlsx(csv) {
  const { meta, items } = standardItems(csv);
  if (!items.length) return null;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Quotation');
  ws.columns = [{ width: 54 }, { width: 8 }, { width: 14 }, { width: 16 }];
  const bold = r => { r.font = { bold: true }; };
  ws.addRow(['POLLISUM FABRICATION PTE. LTD.']).font = { bold: true, size: 14 };
  ws.addRow([]);
  [['COMPANY NAME', meta.Company], ['ADDRESS', meta['Delivery location']], ['ATTN', meta['Contact person']], ['TEL', meta.Phone], ['EMAIL', meta.Email],
   ['DATE', new Date().toLocaleDateString('en-GB').replace(/\//g, '.')], ['ENQUIRY REF', meta['Enquiry reference']]].forEach(([k, v]) => { const r = ws.addRow([k, v || '']); r.getCell(1).font = { bold: true }; });
  ws.addRow([]);
  ws.addRow(['Quotation for Standard Buckets']).font = { bold: true, size: 12 };
  const head = ws.addRow(['Description', 'Qty', 'Unit Price (S$)', 'Amount (S$)']); bold(head);
  head.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } }; });
  const first = ws.rowCount + 1;
  for (const it of items) {
    const m = it.model || {}, pr = PRICES[it.code];
    const d = [`${it.fam ? it.fam.name : it.famName} - ${it.code}`, `Capacity: ${m.cap || it.cap || ''}`, `Size: ${m.dims || it.dims || ''}`, m.self ? `Empty Weight: ${m.self}` : '', `SWL: ${m.swl || it.swl || ''}`, m.outlet ? `Outlet: ${m.outlet}` : '', pr?.note ? `Includes: ${pr.note.replace(/^incl\.\s*/, '')}` : ''].filter(Boolean).join('\n');
    const r = ws.addRow([d, it.qty, pr ? pr.price : 'TBC', null]);
    r.getCell(4).value = pr ? { formula: `B${r.number}*C${r.number}`, result: pr.price * it.qty } : 'TBC';
    r.getCell(1).alignment = { wrapText: true, vertical: 'top' };
    r.eachCell(c => { if (c.col > 1) c.alignment = { vertical: 'top', horizontal: 'right' }; });
    [3, 4].forEach(n => { r.getCell(n).numFmt = '#,##0.00'; });
  }
  const last = ws.rowCount;
  const priced = items.every(it => PRICES[it.code]);
  ws.addRow([]);
  if (priced) {
    const s = ws.addRow(['Sub-total', null, null, { formula: `SUM(D${first}:D${last})` }]);
    const g = ws.addRow(['GST 9%', null, null, { formula: `D${s.number}*0.09` }]);
    const t = ws.addRow(['TOTAL AMOUNT', null, null, { formula: `D${s.number}+D${g.number}` }]); bold(t);
    [s, g, t].forEach(r => { r.getCell(4).numFmt = '#,##0.00'; });
  } else bold(ws.addRow(['TOTAL AMOUNT TBC']));
  ws.addRow([]);
  ws.addRow(['Draft generated automatically from the online enquiry. Check prices, delivery and terms before sending.']).font = { italic: true, color: { argb: 'FF888888' } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
