// Returns a formatted Excel workbook for an enquiry CSV (used by the "Download Excel" button).
import { buildXlsx } from './_xlsx.js';

const REF_RE = /ENQ-\d{8}-\d{3}/;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  const csv = String((b && b.csv) || '').slice(0, 60000);
  if (!csv.includes('Enquiry reference')) return res.status(400).json({ ok: false, error: 'bad_request' });
  try {
    const buf = await buildXlsx(csv);
    const ref = (csv.match(REF_RE) || ['enquiry'])[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${ref}.xlsx"`);
    return res.status(200).send(buf);
  } catch (e) {
    console.error('xlsx failed', e.message);
    return res.status(500).json({ ok: false, error: 'xlsx_failed' });
  }
}
