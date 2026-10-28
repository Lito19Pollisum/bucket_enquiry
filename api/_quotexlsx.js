// Draft quotation workbook that follows Pollisum's sample quotation format (see the four "Sample - Quotation" files):
// logo, company/contact header, Description | Qty | Unit Price | Amount table with bucket photo,
// Total Amount (price exclusive of 9% GST), standard terms, signature block. Staff amend it per customer, then convert to PDF.
import ExcelJS from 'exceljs';
import { standardItems, FAM_IMG } from './_quote.js';
import { PRICES } from './_prices.js';
import { IMGS } from './_assets.js';
import { QIMGS } from './_qimgs.js';
import { QDRAW } from './_qdraw.js';
import { QPICS } from './_qpics.js';

// Pictures from the sample quotations (they carry the W/L/H markers); other families use their catalogue photo.
const SAMPLE_PHOTO = { spb: 'super', sb: 'sand', sdcb: 'side', rcb: 'recphoto', cdcb: 'cdcb', sdb: 'sdb', cr: 'cr', lcr: 'lcr', mc: 'mc', rmc: 'rmc' };
// Sand buckets: the sample quotation (AS-IS Builders, 10/4/2023) uses a different picture per size, and gives the wire sling per size.
const SAND_PHOTO = { 'SB-072': 'sand', 'SB-100': 'sand100', 'SB-120': 'sand100', 'SB-150': 'sand150', 'SB-200': 'sand150', 'SB-250': 'sand250', 'SB-300': 'sand250' };
// Wire sling per model, from the sample quotations (Sand, Center/Side Discharge Concrete Bucket, Super Center Discharge, Man Cage, Rescue Man Cage).
const SLINGS = {};
const sl4 = (size, swl) => ({ size: size + ' 4-legged', swl });
for (const [code, v] of Object.entries({ 'SB-072': ['14mm x 1.5m', '4T'], 'SB-100': ['14mm x 1.5m', '4T'], 'SB-150': ['16mm x 2m', '6T'], 'SB-200': ['16mm x 2m', '6T'], 'SB-250': ['18mm x 2m', '8T'], 'SB-300': ['18mm x 2m', '8T'],
  'MC-1500': ['16mm x 1.5m', '6T'], 'MC-2000': ['16mm x 2m', '6T'], 'MC-2500': ['16mm x 2.5m', '6T'], 'RMC-2500': ['16mm x 2.5m', '6T'], 'RMC-3000': ['16mm x 3m', '6T'] })) SLINGS[code] = sl4(v[0], v[1]);
for (const f of ['CDCB', 'SDCB', 'SPB']) {
  for (const n of ['050', '075', '100', '120']) SLINGS[`${f}-${n}`] = sl4('14mm x 1.5m', '4T');
  SLINGS[`${f}-150`] = sl4('16mm x 2m', '6T'); SLINGS[`${f}-200`] = sl4('18mm x 2m', '8T'); SLINGS[`${f}-250`] = sl4('18mm x 2m', '8T');
  SLINGS[`${f}-300`] = sl4(f === 'SPB' ? '20mm x 2m' : '20mm x 2.5m', '10T');
}
// Dimension drawing matched to the model's size (from the sample quotations); SB-072 uses the sand bucket sample drawing.
const drawingFor = code => (code === 'SB-072' ? QIMGS.sanddraw : QDRAW[code]) || null;

function imgSize(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }; // PNG
  return jpegSize(buf);
}
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
// "new 20mm x 2m x 4 legged (SWL 10T) wire sling" / "new 16mm x 2m 4-legged wire sling (SWL 6T)"
function sling(note) {
  if (!note) return null;
  const a = note.match(/new (.+?) wire sling \(SWL ([^)]+)\)/i) || note.match(/new (.+?)\s*\(SWL ([^)]+)\)\s*wire sling/i);
  return a ? { size: a[1], swl: a[2] } : null;
}

export async function buildQuoteXlsx(csv) {
  const { meta, items } = standardItems(csv);
  if (!items.length) return null;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Quotation', {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
  });
  ws.columns = [{ width: 2.7 }, { width: 12 }, { width: 20 }, { width: 12.4 }, { width: 2.8 }, { width: 12.8 }, { width: 22 }, { width: 6.5 }, { width: 12.5 }, { width: 13 }, { width: 2.7 }]; // A and K equal so the page margins are even
  // Pollisum Style Guide: Roboto, ink body text, Pollisum Red titles, Mist/Blush panels, E4E4E4 lines, maroon rule at the end.
  const INK = 'FF191D24', RED = 'FF990000', MAROON = 'FF6A0303', MIST = 'FFF3F3F3', LINE = 'FFE4E4E4', BLUSH = 'FFEDD4D4', GREY = 'FF6B7280';
  const FONT = { name: 'Roboto', size: 10, color: { argb: INK } };
  const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
  const cell = (a, v, o = {}) => { const c = ws.getCell(a); c.value = v; c.font = { ...FONT, ...(o.font || {}) }; if (o.al) c.alignment = o.al; if (o.numFmt) c.numFmt = o.numFmt; return c; };
  const thin = { style: 'thin', color: { argb: 'FF595959' } };
  const rule = { style: 'thin', color: { argb: 'FF595959' } };
  const addImg = (key, col0, row0, maxW, maxH) => {
    const src = key.startsWith('data:') ? key.slice(5) : (QIMGS[key] || IMGS[key]);
    if (!src) return;
    const buf = Buffer.from(src, 'base64'); const { w, h } = imgSize(buf);
    const k = Math.min(maxW / w, maxH / h);
    ws.addImage(wb.addImage({ base64: src, extension: buf[0] === 0x89 ? 'png' : 'jpeg' }), { tl: { col: col0, row: row0 }, ext: { width: Math.round(w * k), height: Math.round(h * k) } });
  };

  // Page frame: title top left, logo mark top right
  addImg('hdr', 0.1, 1.1, 64, 64); // header logo from the Word quotation
  [2, 3, 4, 5].forEach(r => { ws.getRow(r).height = 16; });
  ws.mergeCells('C2:J2'); cell('C2', 'POLLISUM FABRICATION PTE. LTD.', { font: { bold: true, size: 9, color: { argb: GREY } }, al: { vertical: 'middle' } });
  ws.mergeCells('C3:J4'); cell('C3', 'QUOTATION', { font: { bold: true, size: 26, color: { argb: RED } }, al: { vertical: 'middle' } });

  // Header block
  const date = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
  ws.mergeCells('B6:F6'); ws.mergeCells('B7:F8'); ws.mergeCells('C9:E9');
  cell('B6', meta.Company || 'COMPANY NAME', { font: { bold: true, size: 11 }, al: { vertical: 'middle', horizontal: 'left' } });
  cell('B7', (meta['Delivery location'] || 'ADDRESS').toString(), { font: { bold: true }, al: { vertical: 'top', horizontal: 'left', wrapText: true } });
  cell('B9', 'ATTN', { font: { bold: true } }); cell('C9', meta['Contact person'] || '', { font: { bold: true } });
  [['G6', 'DATE', 'I6', date], ['G7', 'TEL', 'I7', meta.Phone || ''], ['G8', 'HP', 'I8', ''], ['G9', 'EMAIL', 'I9', meta.Email || '']].forEach(([lk, l, vk, v]) => {
    const r = +lk.slice(1); ws.mergeCells(`I${r}:J${r}`);
    cell(lk, l, { font: { bold: true } }); cell(`H${r}`, ':', { font: { bold: true }, al: { horizontal: 'center' } }); cell(vk, v);
  });
  ws.getRow(6).height = 17.5; ws.getRow(7).height = 15.5; ws.getRow(8).height = 15.5;

  // Title
  const fams = [...new Set(items.map(i => (i.fam ? i.fam.name : i.famName)))];
  const title = fams.length === 1 ? `Quotation for ${fams[0]}` : 'Quotation for Standard Buckets';
  ws.mergeCells('B11:J11');
  cell('B11', title.toUpperCase(), { font: { bold: true, size: 12, color: { argb: RED } }, al: { horizontal: 'left', vertical: 'middle' } });
  ws.getRow(11).height = 22;
  cell('B10', `Enquiry ref: ${meta['Enquiry reference'] || ''}`, { font: { size: 8, color: { argb: GREY } } });

  // Table header
  ws.mergeCells('B12:G12');
  [['B12', 'DESCRIPTION'], ['H12', 'QTY'], ['I12', 'UNIT PRICE'], ['J12', 'AMOUNT']].forEach(([a, v]) => {
    cell(a, v, { font: { bold: true, size: 9 }, al: { horizontal: 'center', vertical: 'middle' } });
  });
  ws.getRow(12).height = 20;
  for (const col of 'BCDEFGHIJ') { const c = ws.getCell(`${col}12`); c.fill = fill(MIST); c.border = { top: rule, bottom: rule, left: col === 'B' ? rule : undefined, right: ['G', 'H', 'I', 'J'].includes(col) ? thin : undefined }; }

  // Items: one block of 11 rows each (photo left, text, qty / unit price / amount right)
  let r0 = 13; const amtCells = []; let pageUsed = 240, hasPic = false, pageStart = 1;
  for (const it of items) {
    const m = it.model || {}, pr = PRICES[it.code], sl = sling(pr?.note) || SLINGS[it.code] || null;
    const pic = QPICS[it.code] || null; // exact crop of this model's picture from the Word reference quotation
    const photo = pic ? null : (SAND_PHOTO[it.code] || (it.fam && (SAMPLE_PHOTO[it.fam.id] || FAM_IMG[it.fam.id])));
    const drw = pic ? null : drawingFor(it.code);
    const PIC_W = 420; let picH = 0, below = false; // wide drawings go below the details, others sit beside them
    if (pic) { const { w, h } = imgSize(Buffer.from(pic, 'base64')); below = w / h >= 2.2 || /^(SDB|MC|RMC)-/.test(it.code); picH = Math.round(h * Math.min(PIC_W / w, 170 / h, 1)); }
    const BLOCK = pic ? (below ? 14 + Math.ceil(picH / 18) : 11) : (drw ? 22 : 11); // with a drawing: photo + details on top, drawing below across the left of the table
    if (pic) { // keep a block (details + picture) whole on a printed page
      if (pageUsed + BLOCK * 15 > 770 && pageUsed > 0) { ws.getRow(r0 - 1).addPageBreak(); pageUsed = 0; pageStart = r0; }
      pageUsed += BLOCK * 15; hasPic = true;
    } else pageUsed += BLOCK * 15;
    for (let r = r0; r < r0 + BLOCK; r++) {
      ws.getRow(r).height = 15;
      for (const col of 'BCDEFGHIJ') { const b = {}; if (col === 'B') b.left = thin; if (['G', 'H', 'I', 'J'].includes(col)) b.right = thin; ws.getCell(`${col}${r}`).border = b; }
    }
    const L = below ? 'B' : 'D'; // with a picture below, details start at the left edge
    { // description line, highlighted yellow, as in the Word quotations
      const capTxt = String(m.cap || it.cap || '').replace(/\s*m³/, 'm³').trim();
      const nm = it.fam && it.fam.id === 'sb' ? 'Sand & Mud Bucket' : (it.fam ? it.fam.name : it.famName);
      const text = capTxt ? `Supply ${capTxt} ${nm} with Tested Wire Sling and Load Test Certificate` : `Supply ${nm} (${it.code}) with Tested Wire Sling and Load Test Certificate`;
      ws.mergeCells(`B${r0}:G${r0}`); ws.getRow(r0).height = 20;
      cell(`B${r0}`, text, { font: { size: 9.5, bold: true }, al: { vertical: 'middle', horizontal: 'left', shrinkToFit: true } });
    }
    const T = { font: { size: 9 }, al: { vertical: 'top' } };
    cell(`${L}${r0 + 1}`, `${it.fam ? it.fam.name : it.famName} - ${it.code}`, { font: { size: 10, bold: true, color: { argb: RED } }, al: { vertical: 'top' } });
    [['Size', m.dims || it.dims], ['Empty Weight', m.self], ['SWL', m.swl || it.swl]].forEach(([k, v], i) => {
      cell(`${L}${r0 + 2 + i}`, k, T); cell(`E${r0 + 2 + i}`, ':', { font: { size: 9 }, al: { horizontal: 'center', vertical: 'top' } });
      ws.mergeCells(`F${r0 + 2 + i}:G${r0 + 2 + i}`); cell(`F${r0 + 2 + i}`, v || '', T);
    });
    cell(`${L}${r0 + 6}`, 'Wire Sling', { font: { size: 10, bold: true, color: { argb: RED } }, al: { vertical: 'top' } });
    [['Size', sl?.size], ['SWL', sl?.swl]].forEach(([k, v], i) => {
      cell(`${L}${r0 + 7 + i}`, k, T); cell(`E${r0 + 7 + i}`, ':', { font: { size: 9 }, al: { horizontal: 'center', vertical: 'top' } });
      ws.mergeCells(`F${r0 + 7 + i}:G${r0 + 7 + i}`); cell(`F${r0 + 7 + i}`, v || '', T);
    });
    if (pr?.note) { if (!below) ws.mergeCells(`${L}${r0 + 9}:G${r0 + 10}`); cell(`${L}${r0 + 9}`, 'Incl. ' + pr.note.replace(/^incl\.\s*/i, '').replace(/,\s*new .*? wire sling/i, ''), { font: { size: 8, italic: true, color: { argb: GREY } }, al: { vertical: 'top', wrapText: !below } }); }
    if (photo) addImg(photo, 1.05, r0 + 1.2, 165, 105);
    if (drw) addImg('data:' + drw, 1.05, r0 + 11.4, 385, 205);
    if (pic && below) addImg('data:' + pic, 1.4, r0 + 11.2, PIC_W, 170);
    if (pic && !below) addImg('data:' + pic, 1.3, r0 + 1.7, 185, 130);
    const q = cell(`H${r0 + 1}`, it.qty, { al: { horizontal: 'center', vertical: 'top' } });
    const u = cell(`I${r0 + 1}`, pr ? pr.price : null, { al: { horizontal: 'center', vertical: 'top' }, numFmt: '"$"#,##0.00' });
    const a = cell(`J${r0 + 1}`, { formula: `IF(I${r0 + 1}="","",H${r0 + 1}*I${r0 + 1})`, result: pr ? pr.price * it.qty : '' }, { font: { bold: true }, al: { horizontal: 'center', vertical: 'top' }, numFmt: '"$"#,##0.00' });
    amtCells.push(`J${r0 + 1}`);
    r0 += BLOCK;
  }

  // Re-apply the table's vertical rules after merging (merged cells otherwise lose the right edge)
  for (let rr = 13; rr < r0; rr++) for (const col of 'BCDEFGHIJ') {
    const c = ws.getCell(`${col}${rr}`);
    c.border = { ...(col === 'B' ? { left: thin } : {}), ...(['G', 'H', 'I', 'J'].includes(col) ? { right: thin } : {}) };
  }

  // Left edge of the table also drawn as the right edge of column A, so it never breaks where text overflows or a picture sits
  for (let rr = 12; rr <= r0; rr++) ws.getCell(`A${rr}`).border = { right: rr === 12 || rr === r0 ? rule : thin };

  // Total
  ws.mergeCells(`B${r0}:G${r0}`); ws.mergeCells(`H${r0}:J${r0}`);
  cell(`B${r0}`, 'Total Amount', { font: { bold: true }, al: { horizontal: 'right', vertical: 'top' } });
  cell(`H${r0}`, { formula: `SUM(${amtCells.join(',')})`, result: items.reduce((s, it) => s + (PRICES[it.code]?.price || 0) * it.qty, 0) }, { font: { bold: true }, al: { horizontal: 'right', vertical: 'top' }, numFmt: '"$"#,##0.00_);[Red]\\("$"#,##0.00\\)' });
  ws.getRow(r0).height = 22;
  for (const col of 'BCDEFGHIJ') { const c = ws.getCell(`${col}${r0}`); c.fill = fill(BLUSH); c.border = { top: rule, bottom: rule, left: col === 'B' ? rule : undefined, right: ['G', 'H', 'I', 'J'].includes(col) ? rule : undefined }; }
  ws.getCell(`B${r0}`).alignment = { horizontal: 'right', vertical: 'middle' }; ws.getCell(`H${r0}`).alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getCell(`B${r0}`).font = { ...FONT, bold: true, size: 11 }; ws.getCell(`H${r0}`).font = { ...FONT, bold: true, size: 12 };
  cell(`B${r0 + 1}`, 'All prices are in SGD and exclusive of 9% GST.', { font: { size: 8, color: { argb: GREY } } });

  // Terms and conditions
  let r = r0 + 3;
  const recumbent = items.some(it => it.fam && it.fam.id === 'rcb');
  ws.mergeCells(`B${r}:J${r}`); cell(`B${r}`, 'TERMS AND CONDITIONS', { font: { bold: true, size: 10, color: { argb: RED } } }); r++;
  const TERMS = [
    `Delivery of goods will be effected in ${recumbent ? '10-14' : '7-10'} working days upon confirmation of our quotation.`,
    'Delivery in Singapore (exclude Jurong Island) by lorry only.',
    'Validity period: 3 days from date of our quotation.',
    'Terms of Payment: COD and price exclusive of 9% GST',
    'The above information is confidential and is given upon your request and solely for the intended purpose only. You should not copy distribute or use to for any propose nor disclose its contents to another person.',
  ];
  TERMS.forEach((t, i) => {
    cell(`B${r}`, `${i + 1}.`, { al: { horizontal: 'center', vertical: 'top' } });
    ws.mergeCells(`C${r}:J${r}`); cell(`C${r}`, t, { al: { wrapText: true, vertical: 'top', horizontal: 'left' } });
    if (t.length > 95) ws.getRow(r).height = 28;
    r++;
  });
  r++;
  ws.mergeCells(`B${r}:J${r}`); cell(`B${r}`, 'Remarks: Full amount will be charged accordingly if any cancellation upon confirmation of order.', { font: { bold: true } }); r++;
  ws.mergeCells(`B${r}:J${r}`); cell(`B${r}`, 'Please endorse your acceptance and return to us with your Purchase Order before commencement of work.'); r++;
  ws.mergeCells(`B${r}:J${r}`); cell(`B${r}`, 'Should you have any queries, please do not hesitate to contact me.'); r += 3;

  { // keep signature + footer strip together: start a new page when they would not fit under the terms
    let used = 0; for (let k = pageStart; k < r; k++) used += ws.getRow(k).height || 15;
    if (used + 270 > 760 && used > 0) ws.getRow(r - 1).addPageBreak();
  }
  // Signature block
  ws.mergeCells(`B${r}:D${r}`); cell(`B${r}`, 'Yours faithfully,');
  ws.mergeCells(`G${r}:J${r}`); cell(`G${r}`, 'Agreed and accepted the above,');
  r++;
  ws.mergeCells(`B${r}:D${r}`); cell(`B${r}`, 'POLLISUM FABRICATION PTE. LTD.', { font: { bold: true } });
  ws.mergeCells(`G${r}:J${r}`); cell(`G${r}`, meta.Company || 'COMPANY NAME', { font: { bold: true } });
  addImg('sign', 1.1, r + 0.2, 130, 112);
  r += 7;
  cell(`B${r}`, 'Eileen Tey'); cell(`G${r}`, 'Name:');
  r += 2;
  ws.getRow(r).height = 3; ws.mergeCells(`B${r}:J${r}`); ws.getCell(`B${r}`).fill = fill(MAROON); // thin maroon rule
  // Footer strip from the Word quotation: company name, address, contact and registration numbers
  addImg('foot', 1.0, r + 0.4, 843, 100);
  for (let k = 1; k <= 6; k++) ws.getRow(r + k).height = 17;
  if (items.length === 1 || (items.length <= 2 && !hasPic)) ws.pageSetup.fitToHeight = 1; // short quotes stay on one page
  ws.pageSetup.horizontalCentered = true; // even left/right margins whatever scale Excel/PDF applies
  ws.pageSetup.printArea = `A1:K${r + 6}`;
  ws.headerFooter.oddFooter = '&C&"Roboto,Regular"&8Page &P of &N';
  return Buffer.from(await wb.xlsx.writeBuffer());
}
