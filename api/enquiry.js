// Vercel serverless function: emails an enquiry (or follow-up) to sales only. Uses the Resend REST API.
//
// Environment variables (Vercel > Project Settings > Environment Variables):
//   RESEND_API_KEY  required  API key from resend.com
//   RESEND_FROM     required  e.g. Pollisum Enquiries <enquiries@pollisum.com> (domain verified in Resend)
//   SALES_EMAIL     optional  inbox that receives enquiries (default fabrication@pollisum.com)
//   SUPABASE_URL                optional  e.g. https://vzcxtymvoyjzzfdoyzds.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   optional  secret key; enquiries are saved to public.enquiries when both are set

const SALES = process.env.SALES_EMAIL || 'fabrication@pollisum.com';
const FROM = process.env.RESEND_FROM || '';
const KEY = process.env.RESEND_API_KEY || '';
const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // server-only secret, never expose to the browser
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const REF_RE = /^ENQ-\d{8}-\d{3}$/;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clip = (v, n) => String(v ?? '').slice(0, n);
const oneLine = (v, n) => clip(v, n).replace(/[\r\n]+/g, ' ').trim();

async function send(payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

async function save(row) {
  if (!SB_URL || !SB_KEY) return;
  try {
    const r = await fetch(`${SB_URL}/rest/v1/enquiries`, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    if (!r.ok) console.error('supabase save failed', r.status, (await r.text()).slice(0, 200));
  } catch (e) {
    console.error('supabase save error', e.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });
  if (!KEY || !FROM) return res.status(503).json({ ok: false, error: 'not_configured' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ ok: false, error: 'bad_request' });
  if (b.website) return res.status(200).json({ ok: true }); // honeypot: silently drop bots

  const kind = b.kind === 'followup' ? 'followup' : 'enquiry';
  const ref = oneLine(b.ref, 20);
  const company = oneLine(b.company, 120);
  const contact = oneLine(b.contact, 120);
  const email = oneLine(b.email, 200);
  const text = clip(b.text, 20000);
  const csv = clip(b.csv, 60000);

  if (!REF_RE.test(ref) && !(kind === 'followup' && ref === '')) return res.status(400).json({ ok: false, error: 'ref' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: 'email' });
  if (!text.trim()) return res.status(400).json({ ok: false, error: 'empty' });

  const tag = ref ? `[${ref}] ` : '';
  const subject = kind === 'followup'
    ? `${tag}Follow-up${company ? ' — ' + company : ''}`
    : `${tag}Enquiry — ${company || contact || email}`;

  // Save to Supabase first (best-effort: a database failure must never block the email).
  await save({ kind, ref, company, contact, email, body: text, csv: kind === 'enquiry' ? csv : null });

  try {
    const toSales = {
      from: FROM,
      to: [SALES],
      reply_to: email,
      subject,
      text,
      html: `<pre style="font:14px/1.5 Consolas,Menlo,monospace;white-space:pre-wrap">${esc(text)}</pre>`,
    };
    if (kind === 'enquiry' && csv) {
      toSales.attachments = [{ filename: `${ref}.csv`, content: Buffer.from(csv, 'utf8').toString('base64') }];
    }
    await send(toSales);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('send failed', e.message);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
}
