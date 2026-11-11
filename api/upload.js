// Issues a one-time signed upload URL so customers can attach drawings/photos to an enquiry already saved.
// Files go straight from the browser to the private "quotations" bucket under <ref>/attachments/ (not through this function).
import { sb, sbReady, allow } from './_sb.js';

const URL_ = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const KEY_ = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REF_RE = /^ENQ-\d{8}-\d{3}$/;
const EXT_RE = /\.(jpe?g|png|gif|webp|heic|pdf|dwg|dxf|doc|docx|xls|xlsx)$/i;
const MAX = 15 * 1024 * 1024;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });
  if (!sbReady()) return res.status(503).json({ ok: false, error: 'not_configured' });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  const ref = String((b && b.ref) || '');
  const name = String((b && b.name) || '');
  const size = Number(b && b.size);
  if (!REF_RE.test(ref) || !EXT_RE.test(name) || !(size > 0 && size <= MAX)) return res.status(400).json({ ok: false, error: 'bad_request' });
  if (!(await allow(req, 'upload', 40, 3600))) return res.status(429).json({ ok: false, error: 'rate_limited' });
  try {
    const found = await sb(`enquiries?ref=eq.${ref}&kind=eq.enquiry&select=id&limit=1`); // only for enquiries that exist
    if (!found || !found.length) return res.status(404).json({ ok: false, error: 'no_enquiry' });
    const safe = name.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, ' ').slice(-90);
    const path = `${ref}/attachments/${Date.now().toString(36)}-${safe}`;
    const r = await fetch(`${URL_}/storage/v1/object/upload/sign/quotations/${path.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'POST',
      headers: { apikey: KEY_, Authorization: `Bearer ${KEY_}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) throw new Error(`storage ${r.status}`);
    return res.status(200).json({ ok: true, url: `${URL_}/storage/v1${j.url}` });
  } catch (e) {
    console.error('upload sign error', e.message);
    return res.status(502).json({ ok: false, error: 'upload_failed' });
  }
}
