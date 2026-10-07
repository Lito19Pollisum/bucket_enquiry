// Vercel serverless function: emails an enquiry (or follow-up) to sales and,
// for new enquiries, a confirmation copy to the customer. Uses the Resend REST API.
//
// Environment variables (Vercel > Project Settings > Environment Variables):
//   RESEND_API_KEY  required  API key from resend.com
//   RESEND_FROM     required  e.g. Pollisum Enquiries <enquiries@pollisum.com> (domain verified in Resend)
//   SALES_EMAIL     optional  inbox that receives enquiries (default fabrication@pollisum.com)

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

    if (kind === 'enquiry') {
      // Customer confirmation is best-effort: do not fail the enquiry if it bounces.
      try {
        await send({
          from: FROM,
          to: [email],
          reply_to: SALES,
          subject: `${tag}We have received your enquiry — Pollisum Fabrication`,
          text:
`Dear ${contact || 'Customer'},

Thank you for your enquiry. Our sales team has received it and will reply with a quotation.

Your reference: ${ref}
Please quote this reference in any follow-up. If you have drawings or photos to send, reply to this email and attach them.

Pollisum Fabrication Pte Ltd
Tel (65) 6755 7600

----- Your enquiry -----
${text}`,
        });
      } catch (e) { console.error('confirmation failed', e.message); }
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('send failed', e.message);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
}
