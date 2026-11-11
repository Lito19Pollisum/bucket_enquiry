// Private enquiries dashboard API. Requires header x-admin-password matching ADMIN_PASSWORD (set in Vercel).
import { timingSafeEqual } from 'node:crypto';
import { sb, sbReady, clientIp, hits, addHit } from './_sb.js';

const URL_ = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const KEY_ = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const H = { apikey: KEY_, Authorization: `Bearer ${KEY_}`, 'Content-Type': 'application/json' };

// Customer attachments for one enquiry: [{name, url}] with 1-hour signed download links.
async function attachments(ref) {
  const l = await fetch(`${URL_}/storage/v1/object/list/quotations`, { method: 'POST', headers: H, body: JSON.stringify({ prefix: `${ref}/attachments`, limit: 100 }) });
  const objs = l.ok ? await l.json() : [];
  const out = [];
  for (const o of objs) {
    if (!o.name) continue;
    const path = `${ref}/attachments/${o.name}`;
    const r = await fetch(`${URL_}/storage/v1/object/sign/quotations/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', headers: H, body: JSON.stringify({ expiresIn: 3600 }) });
    const j = r.ok ? await r.json() : {};
    if (j.signedURL) out.push({ name: o.name.replace(/^[a-z0-9]+-/, ''), url: `${URL_}/storage/v1${j.signedURL}` });
  }
  return out;
}

const PASS = process.env.ADMIN_PASSWORD || '';
const STATUSES = ['new', 'quoted', 'won', 'lost', 'closed'];

const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!PASS || !sbReady()) return res.status(503).json({ ok: false, error: 'not_configured' });
  // Lockout: 5 wrong passwords from one address locks it out for 15 minutes.
  const failKey = `adminfail:${clientIp(req)}`;
  if (await hits(failKey, 900) >= 5) return res.status(429).json({ ok: false, error: 'locked' });
  if (!same(req.headers['x-admin-password'] || '', PASS)) { await addHit(failKey); return res.status(401).json({ ok: false, error: 'unauthorized' }); }

  try {
    if (req.method === 'GET') {
      const rows = await sb('enquiries?select=id,created_at,kind,ref,company,contact,email,phone,project,location,required_date,remarks,body,status,quoted_by,enquiry_items(id,item_no,type,model,product,capacity,swl,size_requirements,qty,notes)&order=created_at.desc&limit=300');
      return res.status(200).json({ ok: true, rows });
    }
    if (req.method === 'POST') {
      let b = req.body;
      if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
      if (b && typeof b.files === 'string' && /^ENQ-\d{8}-\d{3}$/.test(b.files)) return res.status(200).json({ ok: true, files: await attachments(b.files) });
      const id = Number(b && b.id);
      if (b && typeof b.quoted_by === 'string' && Number.isInteger(id)) {
        const who = b.quoted_by.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60);
        await sb(`enquiries?id=eq.${id}`, { method: 'PATCH', prefer: 'return=minimal', body: { quoted_by: who || null } });
        return res.status(200).json({ ok: true });
      }
      if (!Number.isInteger(id) || !STATUSES.includes(b.status)) return res.status(400).json({ ok: false, error: 'bad_request' });
      await sb(`enquiries?id=eq.${id}`, { method: 'PATCH', prefer: 'return=minimal', body: { status: b.status } });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ ok: false, error: 'method' });
  } catch (e) {
    console.error('admin error', e.message);
    return res.status(502).json({ ok: false, error: 'db_error' });
  }
}
