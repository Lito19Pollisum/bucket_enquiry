// Builds a Pollisum quotation PDF (standard catalogue items only) from the enquiry CSV.
// Layout follows the sample quotation workbooks. Prices come from _prices.js; unknown prices show "TBC".
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { DATA } from '../src/data.js';
import { parseCsv } from './_sb.js';
import { IMGS } from './_assets.js';
import { PRICES } from './_prices.js';

export const FAM_IMG = { spb: 'superbucket', rcb: 'recumbent', cdcb: 'cdcb', sdcb: 'sdcb', sdb: 'selfdump', sb: 'sand', hop: 'hopper', cr: 'cylrack', lcr: 'liftcyl', mc: 'mancage', rmc: 'rescue' };
const money = n => n.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const clean = s => String(s ?? '').replace(/[^\x20-\x7E -ÿ]/g, c => ({ '³': '3', '²': '2', '×': 'x', '–': '-', '—': '-', 'Ø': 'Dia ' }[c] ?? '')).replace(/\s+/g, ' ').trim();

export function standardItems(csv) {
  const rows = parseCsv(csv);
  const hi = rows.findIndex(r => r[0] === 'Item');
  const meta = Object.fromEntries(rows.slice(0, hi < 0 ? 0 : hi).filter(r => r.length > 1).map(r => [r[0], r[1]]));
  const items = [];
  for (const r of rows.slice(hi + 1)) {
    if (r[1] !== 'Standard') continue;
    let model = null, fam = null;
    for (const f of DATA.fam) { const m = f.models.find(x => x.code === r[2]); if (m) { model = m; fam = f; break; } }
    items.push({ code: r[2], qty: Math.max(1, parseInt(r[7], 10) || 1), fam, model, famName: r[3], cap: r[4], swl: r[5], dims: r[6] });
  }
  return { meta, items };
}

export async function buildQuotePdf(csv) {
  const { meta, items } = standardItems(csv);
  if (!items.length) return null;
  const pdf = await PDFDocument.create();
  const F = await pdf.embedFont(StandardFonts.Helvetica), B = await pdf.embedFont(StandardFonts.HelveticaBold);
  const img = {}; const get = async k => (img[k] ||= await pdf.embedJpg(new Uint8Array(Buffer.from(IMGS[k], 'base64'))));
  const W = 595, H = 842, M = 40, INK = rgb(0.1, 0.11, 0.14), RED = rgb(0.6, 0, 0);
  let page, y;
  const text = (t, x, yy, o = {}) => page.drawText(clean(t), { x, y: yy, size: o.size || 9, font: o.bold ? B : F, color: o.color || INK });
  const wrap = (t, w, size = 9, font = F) => { const out = []; let line = ''; for (const wd of clean(t).split(' ')) { const tryL = line ? line + ' ' + wd : wd; if (font.widthOfTextAtSize(tryL, size) > w && line) { out.push(line); line = wd; } else line = tryL; } if (line) out.push(line); return out; };
  const hline = (yy, x1 = M, x2 = W - M, c = rgb(0.75, 0.75, 0.75)) => page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness: 0.6, color: c });
  const COL = { qty: 345, unit: 395, amt: 475 };
  const tableHead = () => { page.drawRectangle({ x: M, y: y - 16, width: W - 2 * M, height: 18, color: rgb(0.94, 0.94, 0.94) }); text('Description', M + 6, y - 11, { bold: true }); text('Qty', COL.qty + 6, y - 11, { bold: true }); text('Unit Price', COL.unit + 4, y - 11, { bold: true }); text('Amount', COL.amt + 8, y - 11, { bold: true }); y -= 20; };
  const newPage = async first => {
    page = pdf.addPage([W, H]); y = H - M;
    if (first) {
      const lg = await get('logo'); page.drawImage(lg, { x: M, y: y - 62, width: 70, height: 62 * 70 / 59.5 > 62 ? 62 : 62 }); y -= 78;
      const L = [['COMPANY NAME', meta.Company], ['ADDRESS', meta['Delivery location']], ['ATTN', meta['Contact person']]], R = [['DATE', new Date().toLocaleDateString('en-GB').replace(/\//g, '.')], ['TEL', meta.Phone], ['EMAIL', meta.Email]];
      L.forEach(([k, v], i) => { text(k, M, y - i * 15, { bold: true }); text(':', M + 86, y - i * 15); text(String(v || '').slice(0, 46), M + 94, y - i * 15); });
      R.forEach(([k, v], i) => { text(k, 340, y - i * 15, { bold: true }); text(':', 385, y - i * 15); text(String(v || '').slice(0, 34), 393, y - i * 15); });
      y -= 52;
      text('Quotation for Standard Buckets', M, y, { bold: true, size: 11 }); page.drawLine({ start: { x: M, y: y - 2 }, end: { x: M + 160, y: y - 2 }, thickness: 0.8, color: INK });
      text(`Enquiry ref: ${meta['Enquiry reference'] || ''}`, 340, y, { size: 9 }); y -= 14;
    }
    tableHead();
  };
  await newPage(true);

  let subtotal = 0, allPriced = true;
  for (const it of items) {
    const pr = PRICES[it.code]; const unit = pr ? pr.price : null; if (unit == null) allPriced = false; else subtotal += unit * it.qty;
    const lines = [];
    const m = it.model || {};
    lines.push([`${it.fam ? it.fam.name : it.famName} - ${it.code}`, true]);
    [['Capacity', m.cap || it.cap], ['Size', m.dims || it.dims], ['Empty Weight', m.self], ['SWL', m.swl || it.swl]].forEach(([k, v]) => v && lines.push([`${k}: ${v}`, false]));
    if (m.outlet) lines.push([`Outlet: ${m.outlet}`, false]);
    if (pr?.note) wrap(pr.note, 215, 8).forEach((t, i) => lines.push([(i ? '   ' : 'Includes: ') + t.replace(/^incl\.\s*/, ''), false, 8]));
    const rowH = Math.max(76, lines.length * 12 + 14);
    if (y - rowH < 200) { await newPage(false); }
    const top = y;
    const key = it.fam ? FAM_IMG[it.fam.id] : null;
    if (key) { const im = await get(key); const d = im.scaleToFit(70, 64); page.drawImage(im, { x: M + 6, y: top - 8 - d.height, width: d.width, height: d.height }); }
    lines.forEach(([t, b, s], i) => text(t, M + 86, top - 14 - i * 12, { bold: b, size: s || 9 }));
    text(String(it.qty), COL.qty + 10, top - 14);
    text(unit == null ? 'TBC' : money(unit), COL.unit + 4, top - 14, { bold: unit == null ? false : false, color: unit == null ? rgb(0.6, 0.6, 0.6) : INK });
    text(unit == null ? 'TBC' : money(unit * it.qty), COL.amt + 8, top - 14, { color: unit == null ? rgb(0.6, 0.6, 0.6) : INK });
    y -= rowH; hline(y);
  }
  // totals
  if (y < 230) await newPage(false);
  const gst = Math.round(subtotal * 9) / 100;
  const tot = (label, val, bold) => { text(label, COL.unit - 40, y - 14, { bold }); text(val, COL.amt + 8, y - 14, { bold }); y -= 16; };
  if (allPriced) { tot('SUBTOTAL', money(subtotal)); tot('GST 9%', money(gst)); tot('TOTAL (SGD)', money(subtotal + gst), true); }
  else tot('Total Amount', 'TBC', true);
  y -= 10;
  const dd = items.some(i => i.fam?.id === 'rcb') ? '10-14' : '7-10';
  text('Terms and Conditions', M, y, { bold: true }); y -= 14;
  [`Delivery of goods will be effected in ${dd} working days upon confirmation of our quotation.`, 'Delivery in Singapore (exclude Jurong Island) by lorry only.', 'Validity period: 3 days from date of our quotation.', 'Terms of Payment: COD and price exclusive of 9% GST', 'The above information is confidential and is given upon your request and solely for the intended purpose only. You should not copy, distribute or use to any other purpose or disclose its contents to another person.'].forEach((t, i) => {
    wrap(t, W - 2 * M - 22, 8.5).forEach((l, j) => { if (!j) text(`${i + 1}.`, M + 4, y, { size: 8.5 }); text(l, M + 22, y, { size: 8.5 }); y -= 11; });
  });
  y -= 6;
  wrap('Remarks: Full amount will be charged accordingly if any cancellation upon confirmation of order.', W - 2 * M, 8.5, B).forEach(l => { text(l, M, y, { bold: true, size: 8.5 }); y -= 11; });
  ['Please endorse your acceptance and return to us with your Purchase Order before commencement of work.', 'Should you have any queries, please do not hesitate to contact me.'].forEach(t => { text(t, M, y, { size: 8.5 }); y -= 11; });
  y -= 10;
  if (y < 130) await newPage(false);
  text('Yours faithfully,', M, y, { size: 9 }); text('Agreed and accepted the above,', 330, y, { size: 9 });
  const sg = await get('sign'); const d = sg.scaleToFit(95, 70); page.drawImage(sg, { x: M, y: y - 14 - d.height, width: d.width, height: d.height });
  text('POLLISUM FABRICATION PTE. LTD.', M, y - 14, { bold: true, size: 9 }); text(String(meta.Company || 'COMPANY NAME').slice(0, 40).toUpperCase(), 330, y - 14, { bold: true, size: 9 });
  text('Eileen Tey', M, y - 28 - d.height, { size: 9 }); text('Name:', 330, y - 28 - d.height, { size: 9 });
  const out = Buffer.from(await pdf.save());
  out.priced = allPriced; // true when every line has a unit price (safe to send to the customer)
  return out;
}
