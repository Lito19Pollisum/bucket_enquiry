// Private quotation file API for the dashboard (same x-admin-password as /api/admin).
//   GET /api/quotes            -> { files: ["ENQ-.../ENQ-...-Quotation.pdf", ...] } (newest 100 enquiries)
//   GET /api/quotes?file=<path> -> the file itself
import { timingSafeEqual } from 'node:crypto';
import { sbReady } from './_sb.js';

const PASS = process.env.ADMIN_PASSWORD || '';
const URL_ = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const KEY_ = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const H = { apikey: KEY_, Authorization: `Bearer ${KEY_}` };
const list = async prefix => {
  const r = await fetch(`${URL_}/storage/v1/object/list/quotations`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix, limit: 100, sortBy: { column: 'created_at', order: 'desc' } }) });
  if (!r.ok) throw new Error(`storage list ${r.status}`);
  return r.json();
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!PASS || !sbReady()) return res.status(503).json({ ok: false, error: 'not_configured' });
  if (!same(req.headers['x-admin-password'] || '', PASS)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  try {
    const file = req.query && req.query.file;
    if (file) {
      if (!/^ENQ-\d{8}-\d{3}\/ENQ-\d{8}-\d{3}-Quotation\.(pdf|xlsx)$/.test(file)) return res.status(400).json({ ok: false, error: 'bad_request' });
      const r = await fetch(`${URL_}/storage/v1/object/authenticated/quotations/${file}`, { headers: H });
      if (!r.ok) return res.status(404).json({ ok: false, error: 'not_found' });
      res.setHeader('Content-Type', r.headers.get('content-type') || 'application/octet-stream');
      return res.status(200).send(Buffer.from(await r.arrayBuffer()));
    }
    const folders = (await list('')).filter(o => o.id === null).map(o => o.name);
    const files = [];
    for (const f of folders) for (const o of await list(f)) if (o.id) files.push(`${f}/${o.name}`);
    return res.status(200).json({ ok: true, files });
  } catch (e) {
    console.error('quotes error', e.message);
    return res.status(502).json({ ok: false, error: 'storage_error' });
  }
}
