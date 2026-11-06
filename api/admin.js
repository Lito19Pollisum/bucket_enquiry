// Private enquiries dashboard API. Requires header x-admin-password matching ADMIN_PASSWORD (set in Vercel).
import { timingSafeEqual } from 'node:crypto';
import { sb, sbReady, clientIp, hits, addHit } from './_sb.js';
import { buildXlsx } from './_xlsx.js';

const SALES = process.env.SALES_EMAIL || 'DnF_Admin3@pollisum.com';
const CC = process.env.CC_EMAIL === undefined ? 'fabrication@pollisum.com' : process.env.CC_EMAIL.trim();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));


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
      const rows = await sb('enquiries?select=id,created_at,kind,ref,company,contact,email,phone,project,location,required_date,remarks,body,status,enquiry_items(id,item_no,type,model,product,capacity,swl,size_requirements,qty,notes)&order=created_at.desc&limit=300');
      return res.status(200).json({ ok: true, rows });
    }
    if (req.method === 'POST') {
      let b = req.body;
      if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
      const id = Number(b && b.id);
      if (b && b.resend && Number.isInteger(id)) {
        const KEY = process.env.RESEND_API_KEY || '', FROM = process.env.RESEND_FROM || '';
        if (!KEY || !FROM) return res.status(503).json({ ok: false, error: 'email_not_configured' });
        const [r] = await sb(`enquiries?id=eq.${id}&select=ref,kind,company,contact,email,body,csv`);
        if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
        const tag = r.ref ? `[${r.ref}] ` : '';
        const payload = { from: FROM, to: [SALES], ...(CC && CC.toLowerCase() !== SALES.toLowerCase() ? { cc: [CC] } : {}),
          ...(r.email ? { reply_to: r.email } : {}),
          subject: `${tag}${r.kind === 'followup' ? 'Follow-up' : 'Enquiry'}${r.company || r.contact ? ' | ' + (r.company || r.contact) : ''} (re-sent)`,
          text: r.body, html: `<pre style="font:14px/1.5 Consolas,Menlo,monospace;white-space:pre-wrap">${esc(r.body)}</pre>` };
        if (r.kind === 'enquiry' && r.csv) {
          payload.attachments = [{ filename: `${r.ref}.csv`, content: Buffer.from(r.csv, 'utf8').toString('base64') }];
          try { payload.attachments.unshift({ filename: `${r.ref}.xlsx`, content: (await buildXlsx(r.csv)).toString('base64') }); } catch (e) { console.error('xlsx attach failed', e.message); }
        }
        const m = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!m.ok) { console.error('resend failed', m.status, (await m.text()).slice(0, 300)); return res.status(502).json({ ok: false, error: 'send_failed' }); }
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
