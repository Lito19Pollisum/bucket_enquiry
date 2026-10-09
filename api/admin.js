// Private enquiries dashboard API. Requires header x-admin-password matching ADMIN_PASSWORD (set in Vercel).
import { timingSafeEqual } from 'node:crypto';
import { sb, sbReady } from './_sb.js';

const PASS = process.env.ADMIN_PASSWORD || '';
const STATUSES = ['new', 'quoted', 'won', 'lost', 'closed'];

const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!PASS || !sbReady()) return res.status(503).json({ ok: false, error: 'not_configured' });
  if (!same(req.headers['x-admin-password'] || '', PASS)) return res.status(401).json({ ok: false, error: 'unauthorized' });

  try {
    if (req.method === 'GET') {
      const rows = await sb('enquiries?select=id,created_at,kind,ref,company,contact,email,phone,project,location,required_date,remarks,body,status,enquiry_items(id,item_no,type,model,product,capacity,swl,size_requirements,qty,notes)&order=created_at.desc&limit=300');
      return res.status(200).json({ ok: true, rows });
    }
    if (req.method === 'POST') {
      let b = req.body;
      if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
      const id = Number(b && b.id);
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
