// Vercel serverless function: emails an enquiry (or follow-up) to sales only. Uses the Resend REST API.
//
// Environment variables (Vercel > Project Settings > Environment Variables):
//   RESEND_API_KEY  required  API key from resend.com
//   RESEND_FROM     required  e.g. Pollisum Enquiries <enquiries@pollisum.com> (domain verified in Resend)
//   SALES_EMAIL     optional  inbox that receives enquiries (default fabrication@pollisum.com)
//   SUPABASE_URL                optional  e.g. https://vzcxtymvoyjzzfdoyzds.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   optional  secret key; enquiries are saved to public.enquiries when both are set

import { sb, sbReady, splitEnquiryCsv } from './_sb.js';
import { buildXlsx } from './_xlsx.js';

const SALES = process.env.SALES_EMAIL || 'fabrication@pollisum.com';
const FROM = process.env.RESEND_FROM || '';
const KEY = process.env.RESEND_API_KEY || '';
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
  if (!sbReady()) return false;
  try {
    const { fields, items } = row.kind === 'enquiry' && row.csv ? splitEnquiryCsv(row.csv) : { fields: {}, items: [] };
    const [saved] = await sb('enquiries', { method: 'POST', prefer: 'return=representation', body: { ...row, ...fields } });
    if (items.length) {
      try {
        await sb('enquiry_items', { method: 'POST', prefer: 'return=minimal', body: items.map(x => ({ ...x, enquiry_id: saved.id })) });
      } catch (e) {
        console.error('supabase items save failed', e.message); // enquiry itself is stored with its CSV
      }
    }
    return true;
  } catch (e) {
    console.error('supabase save error', e.message);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });
  const emailReady = !!(KEY && FROM);
  if (!emailReady && !sbReady()) return res.status(503).json({ ok: false, error: 'not_configured' });

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
  const saved = await save({ kind, ref, company, contact, email, body: text, csv: kind === 'enquiry' ? csv : null });

  if (!emailReady) {
    // Email not configured: succeed only if the enquiry was stored.
    if (saved) return res.status(200).json({ ok: true, saved: true, emailed: false });
    return res.status(502).json({ ok: false, error: 'save_failed' });
  }

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
      try {
        toSales.attachments.unshift({ filename: `${ref}.xlsx`, content: (await buildXlsx(csv)).toString('base64') });
      } catch (e) {
        console.error('xlsx attach failed', e.message); // CSV is still attached
      }
    }
    await send(toSales);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('send failed', e.message);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
}
